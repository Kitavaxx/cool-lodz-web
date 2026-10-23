"""tiles/ and shares.json: the walking network with its sun share as vector tiles, for /mapa.

edges.geojson of the whole city is far too big for a browser, so /mapa reads tiles instead. Run shade.py first.
Reads <out>/edges.geojson and writes <out>/tiles/{z}/{x}/{y}.pbf (layer "edges", properties s10..s18 as whole percents)
and <out>/shares.json (share of street length in the three sun ranges, per hour, for the bar on /mapa).
Streets outside the Łódź boundary are dropped. The lower ranks from shade.py (footpaths, service roads) show only from
higher zooms, so a tile never holds more than a few thousand segments.
"""
import json
import shutil
import time
from collections import defaultdict
from pathlib import Path

import mapbox_vector_tile
import numpy as np
import shapely
from pyproj import Transformer

from common import OUT, write

HOURS = [10, 12, 14, 16, 18]
ZOOMS = range(9, 16)  # the map overzooms beyond 15
MIN_ZOOM = {0: 9, 1: 10, 2: 14}  # rank (shade.py) -> first zoom that shows it. Rank 2 (sidewalks, paths) is 90 % of all segments
CUTS = [0.335, 0.665]  # shade / half-shade / sun, same as src/Mapa.tsx
EXTENT = 4096
BUFFER = 64  # tile units drawn beyond the tile edge, so lines do not break at seams
WORLD = 20037508.342789244  # half the width of the web mercator world, in metres
CITY = Path(__file__).resolve().parent.parent / "public" / "data" / "lodz.geojson"


def main():
    t0 = time.time()
    data = json.loads((OUT / "edges.geojson").read_text(encoding="utf-8"))
    feats = data["features"]
    lines = np.array([shapely.LineString(f["geometry"]["coordinates"]) for f in feats], dtype=object)
    rank = np.array([f["properties"].get("r", 1) for f in feats])
    pct = np.array([[round(f["properties"][f"s{h}"] * 100) for h in HOURS] for f in feats], dtype=int)
    print(f"{len(feats)} segments read ({time.time() - t0:.0f} s)")

    # Keep what lies in the city: the segment's midpoint is inside the boundary
    city = shapely.union_all([shapely.from_geojson(json.dumps(f["geometry"])) for f in json.loads(CITY.read_text(encoding="utf-8"))["features"]])
    mid = shapely.line_interpolate_point(lines, 0.5, normalized=True)
    inside = shapely.contains_xy(city, shapely.get_x(mid), shapely.get_y(mid))
    lines, rank, pct = lines[inside], rank[inside], pct[inside]
    print(f"{len(lines)} segments inside Łódź ({time.time() - t0:.0f} s)")

    # Real length in metres: web mercator stretches lengths by 1 / cos(latitude)
    to_merc = Transformer.from_crs(4326, 3857, always_xy=True)
    metres = shapely.length(lines) * 111320 * np.cos(np.radians(shapely.get_y(shapely.line_interpolate_point(lines, 0.5, normalized=True))))
    shares = []
    for k, h in enumerate(HOURS):
        bins = np.digitize(pct[:, k] / 100, CUTS)  # 0 shade, 1 half-shade, 2 sun
        total = np.bincount(bins, weights=metres, minlength=3)
        shares.append({"hour": h, "shares": (total / total.sum()).round(4).tolist()})
    write("shares.json", {"items": shares})

    lines = shapely.transform(lines, lambda c: np.column_stack(to_merc.transform(c[:, 0], c[:, 1])))
    minx, miny, maxx, maxy = shapely.bounds(lines).T

    tiles_dir = OUT / "tiles"
    shutil.rmtree(tiles_dir, ignore_errors=True)
    tiles_dir.mkdir(parents=True)
    # An empty file is a valid empty tile. firebase.json serves it for every tile that does not exist (no streets there)
    (tiles_dir / "empty.pbf").write_bytes(b"")
    total_tiles = total_bytes = 0
    for z in ZOOMS:
        size = 2 * WORLD / 2**z
        pad = size * BUFFER / EXTENT
        use = np.flatnonzero(np.array([MIN_ZOOM[r] <= z for r in rank]))
        x0 = np.floor((minx[use] - pad + WORLD) / size).astype(int)
        x1 = np.floor((maxx[use] + pad + WORLD) / size).astype(int)
        y0 = np.floor((WORLD - maxy[use] - pad) / size).astype(int)
        y1 = np.floor((WORLD - miny[use] + pad) / size).astype(int)
        members = defaultdict(list)
        for i, a, b, c, d in zip(use, x0, x1, y0, y1):
            for x in range(a, b + 1):
                for y in range(c, d + 1):
                    members[(x, y)].append(i)
        for (x, y), idx in members.items():
            west, north = x * size - WORLD, WORLD - y * size
            bounds = (west, north - size, west + size, north)
            clipped = shapely.clip_by_rect(lines[idx], bounds[0] - pad, bounds[1] - pad, bounds[2] + pad, bounds[3] + pad)
            features = [
                {"geometry": g, "properties": {f"s{h}": int(p) for h, p in zip(HOURS, pct[i])}}
                for g, i in zip(clipped, idx) if not shapely.is_empty(g)
            ]
            if not features:
                continue
            tile = mapbox_vector_tile.encode([{"name": "edges", "features": features}], default_options={"quantize_bounds": bounds, "extents": EXTENT})
            path = tiles_dir / str(z) / str(x) / f"{y}.pbf"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(tile)
            total_tiles += 1
            total_bytes += len(tile)
        print(f"z{z}: {len(members)} tiles ({time.time() - t0:.0f} s)")
    print(f"{total_tiles} tiles, {total_bytes / 1e6:.1f} MB, done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
