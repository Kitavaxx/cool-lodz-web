# Grill session: Cool Łódź web (spec 0.3)

Stress test of `specyfikacja_strona_webowa` v0.3 (18.10.2026). Self-answered on 19.10.2026: every question has the recommended answer, which is treated as the decision. Change a decision here first, then update `docs/SPEC.md`.

## Round 1: foundations

**Q1. Login only, or login plus registration?**
Spec 7.1 says one moderator account is created by hand.
➡️ **Login only, as a demonstration of the access flow.** Regular users never sign in: every public page works without an account. The demo account is created by hand in the Firebase console. The website has no registration screen. The Firebase project is shared with the mobile app, so sign-up is not disabled in the console (that would block the app) and the user pool is shared. Every signed-in account sees the panel. This is a hackathon demo: the real version protects panel data with database rules and a moderator role. The panel is in the menu as "Dla miasta" under "Więcej" and linked from the home page. *(Revised 20.10.2026: the 19.10 answer disabled sign-up in the console, which does not work with a project shared with the mobile app.)*

**Q2. Where does auth state live?**
Options: a React context for the whole app, or a listener only in the panel.
➡️ **A listener only in the panel.** No other page needs the user. Add a context when a second page needs it.

**Q3. E-mail verification, password reset, social login?**
➡️ **None in the demo.** They go to "next steps". The demo needs a working login on stage.

**Q4. Map tiles?**
➡️ **OpenFreeMap** (`https://tiles.openfreemap.org/styles/positron`). No key and no account, OSM attribution included. MapTiler with a domain-bound key is the fallback if OpenFreeMap is down during the demo.

**Q5. How do we represent the hour?**
➡️ **Fixed list `[10, 12, 14, 16, 18]`, date 15.07.2026, Europe/Warsaw time.** Properties are keyed by hour, for example `s14` for sun share at 14:00.

**Q6. Area bounds?**
➡️ **bbox `[19.43, 51.74, 19.48, 51.78]`** (W, S, E, N). Python and the map read the same values. Tourist routes may extend the bbox later. *(Revised 23.10.2026: this stays the area of routes and the panel. Shade and places now cover the whole city, see Q20.)*

**Q7. Timezone for "open now"?**
➡️ **Always Europe/Warsaw** through `Intl.DateTimeFormat`, regardless of the viewer's timezone.

## Round 2: depends on round 1

**Q8. Login UI (from Q1)?**
➡️ **One card with e-mail, password, a "Wersja demonstracyjna" label, a short offer for the city and the demo account shown under the form (Q11).** No registration and no "forgot password": the team resets the demo password in the console. No autofill button, since the site must also work on phones.

**Q9. Error messages (from Q1, Q3)?**
➡️ **Map the few Firebase error codes we expect to Polish:** wrong credentials, invalid e-mail, too many attempts. Anything else shows a general message. We never show raw Firebase errors.

**Q10. Authorized domains (from Q1)?**
➡️ `localhost`, `coollodz.web.app`, `coollodz.firebaseapp.com`. PR preview channels (`coollodz--pr-*.web.app`) must be added by hand if we test login on a preview.

**Q11. Demo credentials (from Q1)?**
➡️ **Shown on the login card of `/panel`** so judges can try the panel without asking for access. The login is a demo of the access flow and the panel files are public anyway (SPEC 7). The password is a throwaway one, because the Firebase project is shared with the mobile app. *(Revised 20.10.2026: the first answer kept credentials out of the repository.)*

**Q12. Data file contract (from Q5, Q6)?**
➡️ Fixed in `docs/SPEC.md`, section 5. Python writes these files and the website only reads them, so the property names are the only interface between the two.

**Q13. Accuracy label (from Q5)?**
➡️ Every data file has a top-level `accuracy` field: `"szacunek"` or `"model"`. The UI shows it next to every shade value.

## Round 3: depends on round 2

**Q14. What happens if a data file is missing or broken?**
➡️ The page shows "Brak danych" in place of the layer or list and does not crash. No retry logic.

**Q15. Palette (spec A7)?**
➡️ The MUI theme in `src/main.tsx`, with colours taken from the mobile app (primary teal `#0e5f74`, cool-place blue `#4fb3e8`). Sun share colour scale: three steps (0–33 %, 34–66 %, 67–100 %), always shown with a percentage label.

**Q16. Route start and end points?**
➡️ Still open (spec 5.3 marks them for confirmation). Python owns them. The website reads names from `routes.geojson`.

**Q17. Design library?**
➡️ **MUI (Material UI)** with Material icons. The mobile app uses Material 3 (chips, pill navigation indicator, Material icons), so MUI gives the closest match with the least custom CSS. Navigation copies the app: a bottom bar with a pill around the active icon on phones, and pills in the top bar on desktop. Font: Roboto, as in the app. *(Revised 23.10.2026: Manrope, for a livelier look. It has the Polish letters and clear numerals, which the site shows everywhere (75 %, 14:00, 38 min). The mobile app keeps Roboto.)*

**Q18. Photos on the site?** *(added 20.10.2026)*
➡️ **Home page only.** Hero: a park photo (Park Źródliska, CC0) under a teal wash. Behind the page: a blurred photo of Piotrkowska with a slow parallax. Other pages stay plain, because the photo behind plain text looked heavy and hurt readability. The blur is baked into the file (no CSS filter, so scrolling stays cheap) and parallax is off with reduced motion. Both photos are credited under "Źródła" on `/o-projekcie` (hero: Rakoon, CC0; background: lodz.pl).

**Q19. Missing addresses of cool places?** *(added 20.10.2026)*
➡️ **Filled by hand** in `ADDRESS_FIXES` in `scripts/places.py`, in OSM's "Street 12" style. `source` stays `OpenStreetMap`. Unverified status stays too.

**Q20. Shade and places for the whole city?** *(added 23.10.2026)*
➡️ **Yes, for the map; routes and the panel stay in Śródmieście.** The goal is a demo that looks like a whole-city product. Measured on 12 cores: 190 thousand street segments and 158 thousand buildings, about 18 minutes for 5 hours, and a 39 MB GeoJSON. A browser should not load that, so `/mapa` reads vector tiles (812 tiles, 12.6 MB, `scripts/tiles.py`) instead. The panel stays on the Śródmieście `edges.geojson`: "sunniest streets" for the whole city would point at roads outside the built-up area. The map says the shade is less accurate outside the centre (no trees, guessed heights).

**Q22. Why do streets show the shade of their sidewalks? Why is the panel reach view citywide?** *(added 23.10.2026)*
➡️ A street's centre line is almost never in a building's shadow (98.6 % sun at 14:00), so at city zoom, where only streets are drawn (sidewalks are 90 % of all segments and come from zoom 14), the "Cień" button showed next to nothing. In `scripts/tiles.py` each street takes the length-weighted average of the sidewalks and paths within 25 m, and the lines are thicker at low zoom. The panel's reach view is now citywide: the tiles carry each segment's distance `d` to the nearest cool place, the share (about 75 % of street length farther than 400 m) is in `reach.json`. Shade gaps and candidates stay in Śródmieście.

**Q21. Other dates than 15 July?** *(added 23.10.2026)*
➡️ **Not in the demo.** The design is worked out: geometry once plus one small shade file per date (about 400 KB), colours read from it with a map expression. It needs a nightly run of `shade.py` (an estimated 3–6 hours for the whole summer) and is listed under next steps.

Frontier empty. Q16 is an open data task, not a website decision.
