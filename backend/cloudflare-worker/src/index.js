const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const DEFAULT_RADIUS_METERS = 2000;
const DEFAULT_LIMIT = 10;
const SEARCH_TERMS = ["biryani", "biriyani"];
const MAX_CACHE_AGE_SECONDS = 60 * 30;
const BIRYANI_NAME_PATTERN = /\bbir(?:y|i)ani\b/i;

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: buildCorsHeaders(env.ALLOWED_ORIGIN)
            });
        }

        const url = new URL(request.url);

        if (url.pathname !== "/api/search") {
            return json({ error: "Not found" }, 404, env.ALLOWED_ORIGIN);
        }

        if (request.method !== "GET") {
            return json({ error: "Method not allowed" }, 405, env.ALLOWED_ORIGIN);
        }

        if (!env.GOOGLE_PLACES_API_KEY) {
            return json({ error: "Missing GOOGLE_PLACES_API_KEY secret." }, 500, env.ALLOWED_ORIGIN);
        }

        const lat = Number.parseFloat(url.searchParams.get("lat"));
        const lng = Number.parseFloat(url.searchParams.get("lng"));
        const radius = clampInteger(url.searchParams.get("radius"), 500, 5000, DEFAULT_RADIUS_METERS);
        const limit = clampInteger(url.searchParams.get("limit"), 1, 20, DEFAULT_LIMIT);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return json({ error: "lat and lng are required query parameters." }, 400, env.ALLOWED_ORIGIN);
        }

        const cacheKey = createCacheKey(url.origin, lat, lng, radius, limit);
        const cache = caches.default;
        const cacheRequest = new Request(cacheKey, { method: "GET" });
        const cachedResponse = await cache.match(cacheRequest);

        if (cachedResponse) {
            return withCors(cachedResponse, env.ALLOWED_ORIGIN);
        }

        try {
            const searches = await Promise.all(
                SEARCH_TERMS.map(term => searchPlaces(term, lat, lng, radius, env.GOOGLE_PLACES_API_KEY))
            );
            const mergedPlaces = mergePlaces(searches.flat(), lat, lng).slice(0, limit);
            const response = json({
                places: mergedPlaces,
                meta: {
                    provider: "Google Places Text Search",
                    radiusMeters: radius,
                    cachedForSeconds: MAX_CACHE_AGE_SECONDS
                }
            }, 200, env.ALLOWED_ORIGIN, {
                "Cache-Control": `public, max-age=${MAX_CACHE_AGE_SECONDS}`
            });

            ctx.waitUntil(cache.put(cacheRequest, response.clone()));

            return response;
        } catch (error) {
            console.error("Google Places proxy error", error);
            return json({
                error: "Failed to fetch Google Places results.",
                details: error instanceof Error ? error.message : String(error)
            }, 502, env.ALLOWED_ORIGIN);
        }
    }
};

async function searchPlaces(term, lat, lng, radius, apiKey) {
    const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.location",
                "places.googleMapsUri",
                "places.primaryTypeDisplayName",
                "places.rating",
                "places.userRatingCount",
                "places.regularOpeningHours.openNow"
            ].join(",")
        },
        body: JSON.stringify({
            textQuery: term,
            rankPreference: "DISTANCE",
            pageSize: 10,
            locationBias: {
                circle: {
                    center: {
                        latitude: lat,
                        longitude: lng
                    },
                    radius
                }
            }
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google Places search failed (${response.status}): ${body}`);
    }

    const payload = await response.json();
    return Array.isArray(payload.places) ? payload.places : [];
}

function mergePlaces(places, userLat, userLng) {
    const seen = new Map();

    for (const place of places) {
        if (!isBiriyaniCandidate(place)) {
            continue;
        }

        const normalized = normalizePlace(place, userLat, userLng);

        if (!seen.has(normalized.id)) {
            seen.set(normalized.id, normalized);
        }
    }

    return Array.from(seen.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}

function isBiriyaniCandidate(place) {
    const name = place.displayName?.text || "";
    return BIRYANI_NAME_PATTERN.test(name);
}

function normalizePlace(place, userLat, userLng) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    const distanceKm = Number.isFinite(lat) && Number.isFinite(lng)
        ? calculateDistanceKm(userLat, userLng, lat, lng)
        : Number.POSITIVE_INFINITY;

    return {
        id: place.id,
        name: place.displayName?.text || "Unnamed biriyani place",
        address: place.formattedAddress || "Address unavailable",
        location: { lat, lng },
        distanceKm,
        googleMapsUri: place.googleMapsUri || "",
        primaryTypeDisplayName: place.primaryTypeDisplayName?.text || "",
        rating: typeof place.rating === "number" ? place.rating : null,
        userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
        openNow: typeof place.regularOpeningHours?.openNow === "boolean" ? place.regularOpeningHours.openNow : null
    };
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
}

function createCacheKey(origin, lat, lng, radius, limit) {
    const roundedLat = lat.toFixed(3);
    const roundedLng = lng.toFixed(3);
    return `${origin}/cache/search?lat=${roundedLat}&lng=${roundedLng}&radius=${radius}&limit=${limit}`;
}

function json(payload, status, allowedOrigin, extraHeaders = {}) {
    return new Response(JSON.stringify(payload, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...buildCorsHeaders(allowedOrigin),
            ...extraHeaders
        }
    });
}

function buildCorsHeaders(allowedOrigin) {
    return {
        "Access-Control-Allow-Origin": allowedOrigin || "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}

function withCors(response, allowedOrigin) {
    const headers = new Headers(response.headers);
    const corsHeaders = buildCorsHeaders(allowedOrigin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
