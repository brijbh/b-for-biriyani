---
app: b-for-biriyani
status: paused
updated: 2026-03-27
repo: https://github.com/brijbh/b-for-biriyani
deployed: https://brijbh.github.io/b-for-biriyani/
---

## Summary
B for Biriyani is a location-based web app that helps you find nearby restaurants serving biriyani, with a static frontend on GitHub Pages and a Cloudflare Worker backend that filters Google Places results down to biriyani-specific name matches.

## Recent progress
- Migrated discovery from OSM/Overpass to a Google Places Text Search backend (Cloudflare Worker at `backend/cloudflare-worker`) for stricter name-based biriyani matching
- Split the architecture into a static frontend (keeps API keys out of GitHub Pages) and a serverless backend with short-lived edge caching
- UI/logo polish and repo hygiene cleanup
- Frontend confirmed still live and serving on GitHub Pages

## Next up
- Optional place-details fetch for shortlisted results
- Pagination or "search this area" UX (current radius is a fixed 2 km)
- Lightweight backend query-volume counter before billing grows

## Blockers
No commits since March 2026. The Cloudflare Worker backend's actual deployment/secret configuration (`GOOGLE_PLACES_API_KEY`, `config.js` with browser keys) isn't verifiable from the repo — `config.js` is gitignored — so it's unclear whether search/map currently works end to end even though the frontend page itself loads.
