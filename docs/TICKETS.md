# Tickets: `/mapa` (build order step 3)

From [SPEC.md](SPEC.md) section 6. One commit per ticket, in this order.

## MAP-1 Sample data ✅

Hand-made `public/data/edges.geojson` and `public/data/places.geojson` in Śródmieście, following the data contract (SPEC 5): top-level `accuracy` and `computed_at`, `s10`…`s18` on edges, `type`/`name`/`address`/`hours`/`source`/`verified` on places. Marked `source: "dane przykładowe"`. Replaced when Python delivers.

**Done when:** both files load as valid GeoJSON inside bbox `[19.43, 51.74, 19.48, 51.78]`.

## MAP-2 Full-screen map with sun-share segments

`src/Mapa.tsx` on `/mapa`. MapLibre with OpenFreeMap `positron`, fitted to the bbox, OSM attribution. Line layer from `edges.geojson` coloured in three steps (0–33 %, 34–66 %, 67–100 %). App shell fills the screen height so the map can too. A missing or broken file shows "Brak danych" and nothing crashes.

**Done when:** segments show on the map, a missing file shows "Brak danych".

## MAP-3 Hour switch and legend

Hour buttons 10–18 (default 14). Changing the hour recolours segments from `s{hour}`. Legend with the three steps as percentages and the `accuracy` label. Tapping a segment shows its sun share in % for the chosen hour (colour is never the only signal).

**Done when:** changing the hour recolours segments, the legend shows percentages and accuracy.

## MAP-4 Places layers with toggles

Point layers for `cool`, `water`, `bench` with filter chips to toggle each one. Tapping a point shows name, address, hours and a verified label. "Cisza" and "Powietrze" are disabled chips marked "w przygotowaniu".

**Done when:** each layer toggles without errors.

## MAP-5 `/mapa?place=<name>`

When the URL has `place`, the map flies to that place and opens its popup. Used by "Pokaż na mapie" on `/miejsca-chlodu`.

**Done when:** `/mapa?place=Łódzki Dom Kultury` centres on it with the popup open.
