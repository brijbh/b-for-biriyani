# B for Biriyani

`B for Biriyani` is a lightweight static web app for finding nearby biriyani spots from the browser. It is designed to run on GitHub Pages with no backend and no build step.

## What The App Does

- Requests browser geolocation and centers the map near the user.
- Uses OpenStreetMap tiles for the map and Nominatim search for nearby biriyani-related results.
- Shows nearby results sorted by distance.
- Opens directions in OpenStreetMap.
- Loads fun biriyani facts and recipe snippets from local JSON files.

## What The App Does Not Do

- It does not currently use Google Places in the live build.
- It does not have a backend, secret storage, or server-side proxy.
- It does not reliably provide hours or ratings because the current public map search source does not expose that data in a stable way for this app.

## Why This Architecture

The project stays fully static so it is cheap to host and easy to deploy on GitHub Pages. That keeps the repo simple, but it also means third-party API usage needs to be conservative. For now, the app favors a zero-backend OpenStreetMap-based flow over paid or quota-sensitive APIs.

## Repo Notes

- `index.html`, `styles.css`, `script.js`, `location.js`, and `footerscript.js` are the live app.
- `biryaniRecipes.json` and `didYouKnow.json` are local content files.
- `working-folders/` contains old experiments and should not be treated as production code.

## Practical Next Steps

- Curate a small local JSON dataset of verified biriyani restaurants for the cities you care about most, then merge it with live search results.
- If you want ratings and opening hours, add a backend or serverless proxy before using commercial Places APIs in production.
- Add screenshots and GitHub Pages URL once deployment is finalized.
