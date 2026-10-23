# Cool Łódź – web

Hackathon demo website that shows shaded walking routes, cool places and shade gaps in Łódź city centre (Śródmieście).

There is no backend. Shade, routes and panel data are calculated beforehand in Python and saved as static GeoJSON/JSON files in `public/data`. The website only displays them.

## Stack

- React + Vite + TypeScript
- React Router
- MUI (Material UI), styled like the mobile app
- MapLibre GL JS (map)
- Firebase Auth (login for the city panel only)
- Firebase Hosting
- Python: OSMnx, Shapely, GeoPandas, astral (data calculations)

## Pages

| Path | Page |
| --- | --- |
| `/` | Start: short intro, live route preview, links to the pages, APK download |
| `/o-projekcie` | About: problem with sources, methodology, limitations, data sources |
| `/mapa` | Map with shade, cool places, water and benches, plus an hour switch |
| `/trasa` | 4 ready routes, each in 3 variants (shortest, compromise, shaded) |
| `/miejsca-chlodu` | List of cool places with an "open now" filter |
| `/trasy-turystyczne` | 3 tourist walks planned in the shade (optional, under "Więcej") |
| `/bezpieczenstwo` | Heat safety rules and official warning links (optional, under "Więcej") |
| `/ranking` | District ranking preview with simulated data (optional, under "Więcej") |
| `/panel` | City panel with a demo login (in the menu as "Dla miasta" under "Więcej", and linked from `/`) |

## Getting started

Requires Node.js 22+.

```sh
npm install
cp .env.example .env.local   # fill in the Firebase config
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |
| `npm run deploy` | Build and deploy to Firebase Hosting |

## Firebase setup (once)

1. Create a Firebase project (EU region) and enable Email/Password sign-in. Under Authentication → Settings → Authorized domains, make sure `localhost`, `coollodz.web.app` and `coollodz.firebaseapp.com` are listed. Leave sign-up on if the project is shared with the mobile app, turning it off would block the app. The demo account is added by hand in Authentication → Users.
2. Put the web app config into `.env.local`.
3. Link the project:

   ```sh
   npx firebase login
   npx firebase use --add
   ```

Never commit `.env.local`. The demo account is shown on the login card of `/panel` on purpose (`demo` in `src/Panel.tsx`), so give it a throwaway password and never reuse a real one.

## Data

Python scripts in `scripts/` download OpenStreetMap data and write the files in `public/data/`. Requires Python 3.12 (with [uv](https://docs.astral.sh/uv/): `uv venv --python 3.12 .venv`).

```sh
python -m venv .venv
.venv\Scripts\activate        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r scripts/requirements.txt
python scripts/places.py      # run from the repo root; OSM downloads are cached in cache/
python scripts/shade.py       # ~3–5 min for Śródmieście: buildings, sun position, sun share per segment
python scripts/routes.py      # needs shade.py first: 4 routes × 5 hours × 3 variants, and 3 tourist routes
python scripts/panel.py       # needs shade.py first: shade gaps and candidates
python scripts/boundary.py    # Łódź city boundary for the map mask
```

The default area is Śródmieście (routes). The map and the whole panel show the **whole city**, so shade tiles, places and the panel files are built for the city bbox. Two variables switch the area: `COOL_BBOX="W,S,E,N"` and `COOL_OUT=<folder>`. **Always set `COOL_OUT` for a city run**, or the 39 MB city `edges.geojson` replaces the Śródmieście one the panel reads.

```sh
CITY="19.321,51.686,19.64,51.86"
COOL_BBOX=$CITY COOL_OUT=tmp/city python scripts/shade.py   # ~18 min on 12 cores, writes tmp/city/edges.geojson (39 MB)
COOL_OUT=tmp/city python scripts/tiles.py                   # tmp/city/tiles/ and tmp/city/shares.json, ~15 s
COOL_BBOX=$CITY python scripts/places.py                    # places of the whole city into public/data
COOL_BBOX=$CITY python scripts/panel.py                     # panel gaps and candidates for the whole city (~2 min); needs cache/walk.graphml from the city shade.py run
# then copy tmp/city/tiles to public/data/tiles and tmp/city/shares.json to public/data/
```

The public Overpass server can answer "retry later" when two downloads run at once. Run `places.py` again after a minute: finished queries come from the cache.

| File | Contents | Script |
| --- | --- | --- |
| `edges.geojson` | Śródmieście walking network (sidewalks included) with sun share for 5 hours, from building shadows. The site no longer reads it (the tiles replaced it). Every `shade.py` run also writes `cache/walk.graphml` (the graph with the sun shares), and the last run wins: `routes.py` works from either a Śródmieście or a city graph, `panel.py` for the whole city needs the city one | `shade.py` |
| `tiles/{z}/{x}/{y}.pbf` | The same for the whole city as vector tiles (layer `edges`, `s10`…`s18` in whole percents), zoom 9–15. `tiles/empty.pbf` is the empty tile Firebase serves for missing ones | `tiles.py` |
| `shares.json` | Share of street length in shade, half-shade and sun per hour, for the bar on `/mapa` | `tiles.py` |
| `reach.json` | Share of street length in the whole city farther than 400 m from every cool place (the panel's reach view). Each tile segment also carries `d`, its distance to the nearest cool place | `tiles.py` |
| `routes.geojson` | 4 routes × 5 hours × 3 variants | `routes.py` |
| `places.geojson` | Cool places (OSM libraries, culture centres, museums, galleries with known opening hours, plus 10 simulated always-open ones), drinking water, benches, for the whole city | `places.py` |
| `lodz.geojson` | Łódź city boundary: maps stay inside it and dim the outside | `boundary.py` |
| `ranking.json` | Simulated district ranking, written by hand (no script) | |
| `tours.json` | 3 tourist routes through Manufaktura, Piotrkowska, EC1 and Księży Młyn (shaded variant at 14:00) | `routes.py` |
| `panel_gaps.json` | 20 sunniest named street segments at 14:00 in the whole city (at least 80 m, one per street, only where at least 6 km of walkway lies within 300 m, so not in fields) | `panel.py` |
| `panel_candidates.json` | Public buildings of the whole city (inside its boundary: museums, libraries, culture centres, city offices) that are not cool places yet, scored by sun within 200 m, distance to the nearest cool place and known hours | `panel.py` |

Design decisions: [docs/SPEC.md](docs/SPEC.md) and [docs/grill.md](docs/grill.md).

Map data © OpenStreetMap contributors.
