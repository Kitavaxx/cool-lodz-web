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
| `/` | Home: about the project, methodology, data sources, APK download |
| `/mapa` | Map with shade, cool places, water and benches, plus an hour switch |
| `/trasa` | 4 ready routes, each in 3 variants (shortest, compromise, shaded) |
| `/miejsca-chlodu` | List of cool places with an "open now" filter |
| `/panel` | City panel, moderator login only (linked from `/`, not in the menu) |

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

1. Create a Firebase project (EU region) and enable Email/Password sign-in. Under Authentication → Settings → Authorized domains, make sure `localhost`, `coollodz.web.app` and `coollodz.firebaseapp.com` are listed. Under User actions, turn off **Enable create (sign-up)**: moderator accounts are added by hand in Authentication → Users.
2. Put the web app config into `.env.local`.
3. Link the project:

   ```sh
   npx firebase login
   npx firebase use --add
   ```

Never commit `.env.local` or the demo login credentials.

## Data

Python scripts in `scripts/` download OpenStreetMap data and write the files in `public/data/`. Requires Python 3.12 (with [uv](https://docs.astral.sh/uv/): `uv venv --python 3.12 .venv`).

```sh
python -m venv .venv
.venv\Scripts\activate        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r scripts/requirements.txt
python scripts/places.py      # run from the repo root; OSM downloads are cached in cache/
```

| File | Contents | Script |
| --- | --- | --- |
| `edges.geojson` | Walking network segments with sun share for 5 hours | |
| `routes.geojson` | 4 routes × 5 hours × 3 variants | |
| `places.geojson` | Cool places (OSM libraries, culture centres, museums, galleries with known opening hours), drinking water, benches | `places.py` |
| `panel_gaps.json` | Segments with the most sun | |
| `panel_candidates.json` | Ranking of candidates for new cool places | |

Design decisions: [docs/SPEC.md](docs/SPEC.md) and [docs/grill.md](docs/grill.md).

Map data © OpenStreetMap contributors.
