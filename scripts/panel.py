"""panel_gaps.json and panel_candidates.json for the city panel (source spec 7.2).

Gaps: the 20 sunniest named street segments at 14:00 (at least 80 m, one per street).
Candidates: public buildings that are not cool places yet, scored by sun around them,
distance to the nearest cool place and known opening hours. Needs cache/walk.graphml from shade.py.
"""
import numpy as np
import pandas as pd
import shapely

from common import CACHE, ox, write
from places import public_buildings

CRS = 2180
WEIGHTS = {"no_shade_200m": 0.5, "dist_to_cool_m": 0.35, "summer_hours": 0.15}
FAR = 800  # m; at this distance or more from a cool place the distance criterion is maxed out


def street_name(n) -> str | None:
    if isinstance(n, list):
        return n[0]
    return n if isinstance(n, str) else None


def main():
    G = ox.load_graphml(CACHE / "walk.graphml", edge_dtypes={"s14": float})
    e = ox.convert.graph_to_gdfs(G, nodes=False).to_crs(CRS).reset_index()
    e = e[e["u"] < e["v"]].copy()  # one of each two-way twin is enough here
    e["name"] = e["name"].map(street_name) if "name" in e else None
    e["len"] = e.geometry.length

    # Only named segments: unnamed ones are sidewalks or park paths, which OSM doesn't tell apart here
    gaps = e[(e["len"] >= 80) & e["name"].notna()].sort_values(["s14", "len"], ascending=False).drop_duplicates("name").head(20)
    geo = gaps.geometry.to_crs(4326)
    items = [
        {"id": i + 1, "name": row["name"], "length_m": round(row["len"]), "s14": round(float(row["s14"]), 2),
         "geometry": {"type": "LineString", "coordinates": np.round(shapely.get_coordinates(g), 6).tolist()}}
        for i, ((_, row), g) in enumerate(zip(gaps.iterrows(), geo))
    ]
    write("panel_gaps.json", {"items": items})

    cool, candidates = public_buildings()
    cool = cool.to_crs(CRS)
    c = pd.concat(candidates).to_crs(CRS).drop_duplicates("name")
    dist = c.geometry.apply(lambda p: cool.distance(p).min())
    c = c[dist > 50].copy()  # same building as an existing cool place
    c["dist"] = dist[dist > 50]

    lines, lengths, sun = e.geometry.to_numpy(), e["len"].to_numpy(), e["s14"].to_numpy()
    tree = shapely.STRtree(lines)

    def sun_around(p) -> float:
        """Length-weighted sun share at 14:00 of segments within 200 m."""
        idx = tree.query(p.buffer(200), predicate="intersects")
        return float((sun[idx] * lengths[idx]).sum() / lengths[idx].sum()) if len(idx) else 0.0

    c["no_shade"] = c.geometry.apply(sun_around)
    c["score"] = 100 * (WEIGHTS["no_shade_200m"] * c["no_shade"]
                        + WEIGHTS["dist_to_cool_m"] * np.minimum(c["dist"] / FAR, 1)
                        + WEIGHTS["summer_hours"] * c["hours"].notna())
    c = c.sort_values("score", ascending=False)
    text = lambda v: v if isinstance(v, str) else None
    items = [
        {"name": row["name"], "address": text(row["address"]), "score": round(row["score"]),
         "no_shade_200m": round(row["no_shade"], 2), "dist_to_cool_m": round(row["dist"]), "summer_hours": text(row["hours"])}
        for _, row in c.iterrows()
    ]
    write("panel_candidates.json", {"weights": WEIGHTS, "far_m": FAR, "items": items})


if __name__ == "__main__":
    main()
