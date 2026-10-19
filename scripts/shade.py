"""edges.geojson: sun share of every walking segment at 10, 12, 14, 16 and 18 on 15.07.2026.

Shadow of a building = its footprint swept along the shadow vector (length height / tan(sun elevation),
pointing away from the sun). Sun share s = part of the segment's length outside every shadow (SPEC 5.2).
Also saves the walking graph with s{hour} on its edges to cache/walk.graphml for routes.py and panel.py.
"""
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import networkx as nx
import numpy as np
import pandas as pd
import shapely
from astral import Observer
from astral.sun import azimuth, elevation

from common import BBOX, CACHE, ox, write

HOURS = [10, 12, 14, 16, 18]
DAY = (2026, 7, 15)
LODZ = Observer(latitude=51.7592, longitude=19.4560)
CRS = 2180  # metres
W, S, E, N = BBOX
PAD = 0.003  # also fetch buildings just outside the bbox, their shadows fall inside


def sun(hour: int) -> tuple[float, float]:
    t = datetime(*DAY, hour, tzinfo=ZoneInfo("Europe/Warsaw"))
    return azimuth(LODZ, t), elevation(LODZ, t)


def heights(b) -> np.ndarray:
    """height tag, else building:levels × 3 m, else 12 m (4 storeys)."""
    num = lambda col: pd.to_numeric(b[col].astype(str).str.extract(r"([\d.]+)")[0], errors="coerce") if col in b else np.nan
    return num("height").fillna(num("building:levels") * 3).fillna(12).clip(3, 120).to_numpy()


def shadows(footprints: np.ndarray, h: np.ndarray, hour: int):
    """Union of building shadows for one hour, as separate polygons."""
    az, el = sun(hour)
    reach = h / np.tan(np.radians(el))
    dx, dy = -np.sin(np.radians(az)) * reach, -np.cos(np.radians(az)) * reach
    # Every wall (courtyard walls too) swept along its building's shadow vector gives a quadrilateral
    rings, owner = shapely.get_rings(footprints, return_index=True)
    coords, ring = shapely.get_coordinates(rings, return_index=True)
    same = ring[:-1] == ring[1:]
    a, b, i = coords[:-1][same], coords[1:][same], owner[ring[:-1][same]]
    shift = np.column_stack([dx[i], dy[i]])
    quads = shapely.polygons(np.stack([a, b, b + shift, a + shift, a], axis=1))
    quads = quads[shapely.is_valid(quads)]
    return shapely.get_parts(shapely.union_all(np.concatenate([footprints, quads]), grid_size=0.01))


def main():
    t0 = time.time()
    G = ox.graph_from_bbox(BBOX, network_type="walk")
    edges = ox.convert.graph_to_gdfs(G, nodes=False).to_crs(CRS)
    lines = edges.geometry.to_numpy()
    length = shapely.length(lines)
    print(f"{len(edges)} directed edges ({time.time() - t0:.0f} s)")

    b = ox.features_from_bbox((W - PAD, S - PAD, E + PAD, N + PAD), {"building": True})
    b = b[b.geom_type.isin(["Polygon", "MultiPolygon"])].to_crs(CRS)
    b = b.explode(index_parts=False)
    valid = shapely.make_valid(b.geometry.to_numpy())
    h = np.repeat(heights(b), shapely.get_num_geometries(valid))
    footprints = shapely.get_parts(valid)
    keep = shapely.get_type_id(footprints) == 3  # polygons only
    footprints, h = footprints[keep], h[keep]
    print(f"{len(footprints)} building polygons, median height {np.median(h):.0f} m ({time.time() - t0:.0f} s)")

    for hour in HOURS:
        parts = shadows(footprints, h, hour)
        ei, pi = shapely.STRtree(parts).query(lines, predicate="intersects")
        shaded = np.bincount(ei, weights=shapely.length(shapely.intersection(lines[ei], parts[pi])), minlength=len(lines))
        edges[f"s{hour}"] = np.clip(1 - shaded / np.maximum(length, 0.01), 0, 1).round(2)
        print(f"{hour}:00 sun az {sun(hour)[0]:.0f}° el {sun(hour)[1]:.0f}°, mean s {edges[f's{hour}'].mean():.2f} ({time.time() - t0:.0f} s)")

    cols = [f"s{h}" for h in HOURS]
    nx.set_edge_attributes(G, edges[cols].to_dict("index"))
    ox.save_graphml(G, CACHE / "walk.graphml")

    # One feature per street segment: drop the reverse twin of two-way edges
    pairs = set(edges.index)
    edges = edges[[u < v or (v, u, k) not in pairs for u, v, k in edges.index]]
    geo = shapely.simplify(edges.geometry.to_crs(4326).to_numpy(), 0.000005)
    features = [
        {
            "type": "Feature",
            "properties": {"id": i, **{c: float(row[c]) for c in cols}},
            "geometry": {"type": "LineString", "coordinates": np.round(shapely.get_coordinates(g), 5).tolist()},
        }
        for i, ((_, row), g) in enumerate(zip(edges.iterrows(), geo))
    ]
    write("edges.geojson", {"type": "FeatureCollection", "features": features}, accuracy="szacunek")
    print(f"done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
