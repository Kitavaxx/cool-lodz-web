# Grill session: Cool Łódź web (spec 0.3)

Stress test of `specyfikacja_strona_webowa` v0.3 (18.10.2026). Self-answered on 19.10.2026: every question has the recommended answer, which is treated as the decision. Change a decision here first, then update `docs/SPEC.md`.

## Round 1: foundations

**Q1. Login only, or login plus registration?**
Spec 7.1 says one moderator account is created by hand. The team now also wants self-registration.
➡️ **Login and registration with e-mail and password.** Panel data in the demo is static and has no personal data (spec 7.1), so any signed-in user may see the panel. We record this in the limitations list. In the target version, registration creates an account with no role and a moderator grants access.

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
➡️ **bbox `[19.43, 51.74, 19.48, 51.78]`** (W, S, E, N). Python and the map read the same values. Tourist routes may extend the bbox later.

**Q7. Timezone for "open now"?**
➡️ **Always Europe/Warsaw** through `Intl.DateTimeFormat`, regardless of the viewer's timezone.

## Round 2: depends on round 1

**Q8. Registration UI (from Q1)?**
➡️ **One form with a "Log in / Create account" switch.** Password `minLength=6` (Firebase minimum) checked by the browser. No password confirmation field: the user can reset the account by hand in the demo.

**Q9. Error messages (from Q1, Q3)?**
➡️ **Map the few Firebase error codes we expect to Polish:** wrong credentials, e-mail already in use, weak password, too many attempts. Anything else shows a general message. We never show raw Firebase errors.

**Q10. Authorized domains (from Q1)?**
➡️ `localhost`, `coollodz.web.app`, `coollodz.firebaseapp.com`. PR preview channels (`coollodz--pr-*.web.app`) must be added by hand if we test login on a preview.

**Q11. Demo credentials (from Q1)?**
➡️ Only in the documentation and the hackathon submission, never in the repository. `.env.local` stays ignored by git.

**Q12. Data file contract (from Q5, Q6)?**
➡️ Fixed in `docs/SPEC.md`, section 5. Python writes these files and the website only reads them, so the property names are the only interface between the two.

**Q13. Accuracy label (from Q5)?**
➡️ Every data file has a top-level `accuracy` field: `"szacunek"` or `"model"`. The UI shows it next to every shade value.

## Round 3: depends on round 2

**Q14. What happens if a data file is missing or broken?**
➡️ The page shows "Brak danych" in place of the layer or list and does not crash. No retry logic.

**Q15. Palette (spec A7)?**
➡️ CSS custom properties in `src/index.css`. Placeholder values until the logo palette arrives. Sun share colour scale: three steps (0–33 %, 34–66 %, 67–100 %), always shown with a percentage label.

**Q16. Route start and end points?**
➡️ Still open (spec 5.3 marks them for confirmation). Python owns them. The website reads names from `routes.geojson`.

Frontier empty. Q16 is an open data task, not a website decision.
