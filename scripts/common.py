"""Shared settings and output helper for the data scripts. Run scripts from the repo root."""
import json
import os
import sys
from datetime import date
from pathlib import Path

import osmnx as ox

sys.stdout.reconfigure(encoding="utf-8")

# W, S, E, N: same bbox as src/shared.ts (grill Q6). COOL_BBOX="W,S,E,N" and COOL_OUT=<dir> override it, for trial runs
# on another area that must not touch public/data.
BBOX = tuple(float(v) for v in os.environ.get("COOL_BBOX", "19.43,51.74,19.48,51.78").split(","))
OUT = Path(os.environ["COOL_OUT"]) if "COOL_OUT" in os.environ else Path(__file__).resolve().parent.parent / "public" / "data"
CACHE = Path(__file__).resolve().parent.parent / "cache"

ox.settings.cache_folder = CACHE / "osm"
ox.settings.use_cache = True


def write(name: str, data: dict, accuracy: str = "szacunek") -> None:
    """Write a data file with the top-level accuracy and computed_at fields (SPEC 5)."""
    data = {"accuracy": accuracy, "computed_at": date.today().isoformat(), **data}
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(data.get('features', data.get('items', [])))} items")
