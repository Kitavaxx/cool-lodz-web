"""routes.geojson: 4 ready routes × 5 hours × 3 variants (SPEC 5.3).

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


def main():
    hours = {f"s{h}": float for h in HOURS}
    G = ox.load_graphml(CACHE / "walk.graphml", edge_dtypes=hours)
    features = []
    for rid, (name, start, end) in enumerate(ROUTES, 1):
        orig, dest = nearest(G, *start), nearest(G, *end)
        for hour in HOURS:
            shortest_min = None
            for variant, lam in VARIANTS.items():
                for _, _, d in G.edges(data=True):
                    d["w"] = d["length"] * (1 + lam * d[f"s{hour}"])
                path = ox.routing.shortest_path(G, orig, dest, weight="w")
                legs = [min(G[u][v].values(), key=lambda e: e["w"]) for u, v in zip(path, path[1:])]
                dist = sum(e["length"] for e in legs)
                sun = sum(e["length"] * e[f"s{hour}"] for e in legs) / dist
                minutes = dist / WALK
                shortest_min = shortest_min if shortest_min is not None else minutes
                line = path_line(G, path, "w")
                features.append({
                    "type": "Feature",
                    "properties": {
                        "route_id": rid, "route_name": name, "hour": hour, "variant": variant,
                        "distance_m": round(dist), "time_min": round(minutes, 1), "sun_share": round(sun, 2),
                        "extra_min": round(minutes - shortest_min, 1),
                    },
                    "geometry": {"type": "LineString", "coordinates": [[round(x, 6), round(y, 6)] for x, y in line.coords]},
                })
                print(f"{name:36s} {hour}:00 {variant:10s} {dist:5.0f} m {minutes:5.1f} min sun {sun:.2f}")
    write("routes.geojson", {"type": "FeatureCollection", "features": features}, accuracy="szacunek")


if __name__ == "__main__":
    main()
