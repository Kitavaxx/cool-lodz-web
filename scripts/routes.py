"""routes.geojson: 4 ready routes × 5 hours × 3 variants (SPEC 5.3), and tours.json: tourist routes.

Edge cost = length × (1 + λ × s): shortest λ=0, compromise λ=0.3, shaded λ=3.
Needs cache/walk.graphml from shade.py.
"""
import numpy as np
import shapely
from shapely.geometry import LineString

from common import CACHE, ox, write

HOURS = [10, 12, 14, 16, 18]
VARIANTS = {"shortest": 0, "compromise": 0.3, "shaded": 3}  # λ calibrated: with λ=1 compromise often equalled shaded
WALK = 75  # m/min = 4.5 km/h

# (lat, lon) geocoded with OSMnx; start and end points from the source spec, 5.3
ROUTES = [
    ("Manufaktura → OFF Piotrkowska", (51.77946, 19.44446), (51.76111, 19.45979)),
    ("Plac Wolności → Pasaż Rubinsteina", (51.77678, 19.45470), (51.76751, 19.45535)),
    ("Manufaktura → Plac Wolności", (51.77946, 19.44446), (51.77678, 19.45470)),
    ("Łódź Fabryczna → Piotrkowska", (51.76955, 19.46961), (51.76464, 19.45770)),
]

# Places on the tours, (lat, lon) geocoded with OSMnx
MANUFAKTURA, PLAC_WOLNOSCI, RUBINSTEIN = (51.77946, 19.44446), (51.77678, 19.45470), (51.76751, 19.45535)
OFF, FABRYCZNA, EC1, KSIEZY_MLYN = (51.76111, 19.45979), (51.76955, 19.46961), (51.76748, 19.46860), (51.75520, 19.47889)
TOUR_HOUR = 14
TOURS = [
    ("Od Manufaktury do OFF Piotrkowskiej",
     "Z dawnej fabryki Izraela Poznańskiego przez ośmioboczny Plac Wolności i całą reprezentacyjną Piotrkowską do OFF Piotrkowskiej, kreatywnego kwartału w dawnej fabryce Franciszka Ramischa.",
     [("Manufaktura", MANUFAKTURA), ("Plac Wolności", PLAC_WOLNOSCI), ("Piotrkowska, Pasaż Rubinsteina", RUBINSTEIN), ("OFF Piotrkowska", OFF)]),
    ("Nowe Centrum Łodzi",
     "Od podziemnego dworca Łódź Fabryczna do EC1, dawnej elektrowni zamienionej w centrum nauki, kultury i planetarium, a potem w cieniu kamienic do Piotrkowskiej.",
     [("Łódź Fabryczna", FABRYCZNA), ("EC1", EC1), ("Piotrkowska, Pasaż Rubinsteina", RUBINSTEIN)]),
    ("Piotrkowska i Księży Młyn",
     "Południowa część Piotrkowskiej i OFF Piotrkowska, a dalej Księży Młyn: XIX-wieczne osiedle fabryczne Karola Scheiblera z domami robotników z czerwonej cegły.",
     [("Piotrkowska, Pasaż Rubinsteina", RUBINSTEIN), ("OFF Piotrkowska", OFF), ("Księży Młyn", KSIEZY_MLYN)]),
]


def nearest(G, lat: float, lon: float):
    """Closest graph node (equirectangular distance is fine at this scale)."""
    nodes = list(G.nodes)
    xy = np.array([(G.nodes[n]["x"], G.nodes[n]["y"]) for n in nodes])
    return nodes[int(np.argmin(((xy[:, 0] - lon) * np.cos(np.radians(lat))) ** 2 + (xy[:, 1] - lat) ** 2))]


def path_line(G, path, weight: str) -> LineString:
    """Route geometry from the cheapest parallel edge between each pair of nodes, oriented along the walk."""
    coords = []
    for u, v in zip(path, path[1:]):
        d = min(G[u][v].values(), key=lambda e: e[weight])
        pts = list(d["geometry"].coords) if "geometry" in d else [(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])]
        if shapely.Point(pts[0]).distance(shapely.Point(G.nodes[u]["x"], G.nodes[u]["y"])) > shapely.Point(pts[-1]).distance(shapely.Point(G.nodes[u]["x"], G.nodes[u]["y"])):
            pts.reverse()
        coords += pts if not coords else pts[1:]
    return LineString(coords)


def walk(G, stops: list, hour: int, lam: float):
    """Cheapest walk through the stops in order: (distance m, sun share, LineString)."""
    for _, _, d in G.edges(data=True):
        d["w"] = d["length"] * (1 + lam * d[f"s{hour}"])
    path = [stops[0]]
    for a, b in zip(stops, stops[1:]):
        path += ox.routing.shortest_path(G, a, b, weight="w")[1:]
    legs = [min(G[u][v].values(), key=lambda e: e["w"]) for u, v in zip(path, path[1:])]
    dist = sum(e["length"] for e in legs)
    sun = sum(e["length"] * e[f"s{hour}"] for e in legs) / dist
    return dist, sun, path_line(G, path, "w")


def coords(line: LineString) -> list:
    return [[round(x, 6), round(y, 6)] for x, y in line.coords]


def main():
    G = ox.load_graphml(CACHE / "walk.graphml", edge_dtypes={f"s{h}": float for h in HOURS})
    features = []
    for rid, (name, start, end) in enumerate(ROUTES, 1):
        stops = [nearest(G, *start), nearest(G, *end)]
        for hour in HOURS:
            shortest_min = None
            for variant, lam in VARIANTS.items():
                dist, sun, line = walk(G, stops, hour, lam)
                minutes = dist / WALK
                shortest_min = shortest_min if shortest_min is not None else minutes
                features.append({
                    "type": "Feature",
                    "properties": {
                        "route_id": rid, "route_name": name, "hour": hour, "variant": variant,
                        "distance_m": round(dist), "time_min": round(minutes, 1), "sun_share": round(sun, 2),
                        "extra_min": round(minutes - shortest_min, 1),
                    },
                    "geometry": {"type": "LineString", "coordinates": coords(line)},
                })
                print(f"{name:36s} {hour}:00 {variant:10s} {dist:5.0f} m {minutes:5.1f} min sun {sun:.2f}")
    write("routes.geojson", {"type": "FeatureCollection", "features": features}, accuracy="szacunek")

    # Tourist routes (source spec 6.2): shaded variant at the hottest hour, compared with the shortest
    items = []
    for i, (name, description, stops) in enumerate(TOURS, 1):
        nodes = [nearest(G, *at) for _, at in stops]
        dist, sun, line = walk(G, nodes, TOUR_HOUR, VARIANTS["shaded"])
        _, sun_shortest, _ = walk(G, nodes, TOUR_HOUR, 0)
        items.append({
            "id": i, "name": name, "description": description, "hour": TOUR_HOUR,
            "stops": [{"name": n, "coordinates": [at[1], at[0]]} for n, at in stops],
            "distance_m": round(dist), "time_min": round(dist / WALK, 1),
            "sun_share": round(sun, 2), "sun_share_shortest": round(sun_shortest, 2),
            "geometry": {"type": "LineString", "coordinates": coords(line)},
        })
        print(f"{name}: {dist:.0f} m, sun {sun:.2f} (shortest {sun_shortest:.2f})")
    write("tours.json", {"items": items}, accuracy="szacunek")


if __name__ == "__main__":
    main()
