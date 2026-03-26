# B for Biriyani

`B for Biriyani` now has a split architecture:

- a static frontend that can still be hosted on GitHub Pages
- a small serverless backend that queries Google Places Text Search for `biryani` and `biriyani`

This is the practical way to get biriyani-specific results without relying on weak OSM menu inference, while still keeping the user-facing site lightweight.

## Architecture

### Frontend

- Lives in the repo root
- Requests browser geolocation
- Calls a backend `/api/search` endpoint with lat/lng/radius
- Renders the results list
- Uses the Google Maps JavaScript API for the map when a browser-restricted key is configured

### Backend

- Lives in [backend/cloudflare-worker/src/index.js](/abs/path/C:/dev/b-for-biriyani/backend/cloudflare-worker/src/index.js)
- Accepts `GET /api/search?lat=...&lng=...&radius=...&limit=...`
- Calls Google Places Text Search twice:
  - `biryani`
  - `biriyani`
- Keeps only places whose names explicitly match biriyani
- Deduplicates by Google place ID
- Returns a small normalized JSON payload
- Uses short-lived edge cache entries for repeated nearby lookups

## Why This Shape

The frontend alone cannot safely call Google Places:

- server keys must not be exposed in GitHub Pages
- Google Places data is a bad fit for long-lived static caching
- a backend lets you keep the query strict and cache only for short-term performance

## Files

### Frontend

- [index.html](/abs/path/C:/dev/b-for-biriyani/index.html)
- [styles.css](/abs/path/C:/dev/b-for-biriyani/styles.css)
- [script.js](/abs/path/C:/dev/b-for-biriyani/script.js)
- [location.js](/abs/path/C:/dev/b-for-biriyani/location.js)
- [footerscript.js](/abs/path/C:/dev/b-for-biriyani/footerscript.js)
- [config.example.js](/abs/path/C:/dev/b-for-biriyani/config.example.js)

### Backend

- [backend/cloudflare-worker/src/index.js](/abs/path/C:/dev/b-for-biriyani/backend/cloudflare-worker/src/index.js)
- [backend/cloudflare-worker/wrangler.toml](/abs/path/C:/dev/b-for-biriyani/backend/cloudflare-worker/wrangler.toml)

## Setup

### 1. Create a browser config file

Copy [config.example.js](/abs/path/C:/dev/b-for-biriyani/config.example.js) to `config.js` and fill in:

- `apiBaseUrl`
  - your deployed worker URL, for example `https://b-for-biriyani-search.your-subdomain.workers.dev`
- `googleMapsBrowserKey`
  - a browser-restricted Google Maps JavaScript API key
- `googleMapsMapId`
  - optional

`config.js` is ignored by git via [.gitignore](/abs/path/C:/dev/b-for-biriyani/.gitignore).

### 2. Create Google Cloud keys

You need two keys:

- Browser key
  - for Maps JavaScript API
  - restrict by HTTP referrer to your GitHub Pages domain
- Server key
  - for Places API
  - store only in the worker secret store

Enable at least:

- Maps JavaScript API
- Places API

### 3. Configure the Cloudflare Worker

From [backend/cloudflare-worker](/abs/path/C:/dev/b-for-biriyani/backend/cloudflare-worker):

```bash
wrangler secret put GOOGLE_PLACES_API_KEY
```

Update [backend/cloudflare-worker/wrangler.toml](/abs/path/C:/dev/b-for-biriyani/backend/cloudflare-worker/wrangler.toml) so `ALLOWED_ORIGIN` matches your frontend origin.

Then deploy:

```bash
wrangler deploy
```

### 4. Point the frontend at the backend

Set `apiBaseUrl` in `config.js` to the deployed worker URL.

## Search Behavior

The backend is intentionally strict:

- it queries Google Places Text Search with `biryani` and `biriyani`
- it only keeps results whose names explicitly match biriyani
- it does not broaden to generic Indian or South Asian restaurants

This means the app will be more precise, but it may miss legitimate restaurants that serve biriyani without mentioning it in the place name.

## Caching

The worker caches normalized search responses for a short period using Cloudflare edge cache. That helps repeated local searches without turning Google Places responses into a long-lived static dataset.

The cache key is based on rounded location plus radius and limit.

## Local Development

Frontend:

```bash
npx serve .
```

Backend:

```bash
cd backend/cloudflare-worker
wrangler dev
```

Then set `apiBaseUrl` in `config.js` to `http://localhost:8787`.

## Caveats

- This repo no longer treats OSM as the primary discovery source.
- The map will not render until a valid browser key is configured.
- Search quality now depends on Google Places naming quality.
- The current backend filter is name-based on purpose to keep the promise strict: biriyani places only.

## Next Improvements

- Add optional place details fetch for shortlisted results only if you want richer metadata.
- Add pagination or “search this area” UX if the initial 2 km radius is too small.
- Add a lightweight backend analytics counter to watch query volume before billing grows.
