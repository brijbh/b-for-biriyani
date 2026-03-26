const cardColors = ["#784e5c", "#43a17f", "#bd69ff", "#fa639a", "#3fb1e5", "#a18dc2"];
const DEFAULT_LOCATION = { lat: 20.5937, lon: 78.9629, zoom: 5 };
const SEARCH_RADIUS_KM = 2;
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;
const RESTAURANT_LIMIT = 10;
const BIRYANI_KEYWORDS = [
    "biryani",
    "biriyani",
    "biryani house",
    "biryani point",
    "biryani center",
    "biryani centre"
];
const BIRYANI_CUISINES = [
    "indian",
    "pakistani",
    "bangladeshi",
    "hyderabadi",
    "mughlai"
];
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter"
];

let currentUserLocation = null;
let userMarker = null;
const restaurantMarkers = [];

const map = L.map("map").setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon], DEFAULT_LOCATION.zoom);
const restaurantList = document.getElementById("restaurant-list");
const statusMessage = document.getElementById("status-message");

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);
}

function clearRestaurants() {
    restaurantList.innerHTML = "";
    restaurantMarkers.forEach(marker => map.removeLayer(marker));
    restaurantMarkers.length = 0;
}

function updateMapWithLocation(latitude, longitude, errorMessage) {
    clearRestaurants();

    if (typeof latitude === "number" && typeof longitude === "number") {
        currentUserLocation = { lat: latitude, lon: longitude };
        map.setView([latitude, longitude], 14);

        if (userMarker) {
            userMarker.setLatLng([latitude, longitude]);
        } else {
            userMarker = L.marker([latitude, longitude]).addTo(map);
        }

        userMarker.bindPopup("You are here!").openPopup();
        setStatus("Searching nearby biriyani places...");
        fetchNearbyRestaurants(latitude, longitude);
        return;
    }

    currentUserLocation = null;

    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }

    map.setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon], DEFAULT_LOCATION.zoom);
    setStatus(errorMessage || "Location is unavailable. Allow location access to see nearby biriyani places.", true);
}

async function fetchNearbyRestaurants(latitude, longitude) {
    const overpassQuery = buildOverpassQuery(latitude, longitude, SEARCH_RADIUS_METERS);

    try {
        const elements = await fetchOverpassElements(overpassQuery);
        const restaurantResults = buildRestaurantList(elements, latitude, longitude);
        const biryaniResults = restaurantResults.filter(restaurant => restaurant.isBiryaniMatch);
        const cuisineFallbackResults = restaurantResults.filter(restaurant => restaurant.isLikelyBiryaniPlace);
        const finalResults = (biryaniResults.length > 0 ? biryaniResults : cuisineFallbackResults).slice(0, RESTAURANT_LIMIT);

        if (finalResults.length === 0) {
            setStatus("No clearly relevant biriyani places were found in nearby OpenStreetMap data.", true);
            return;
        }

        finalResults.forEach(createRestaurantCard);

        if (biryaniResults.length > 0) {
            setStatus(`Found ${finalResults.length} biriyani place${finalResults.length === 1 ? "" : "s"} nearby.`);
        } else {
            setStatus("No explicit biriyani tags were found nearby, so showing likely Indian or South Asian places instead.", false);
        }
    } catch (error) {
        console.error("Error fetching Overpass data:", error);
        setStatus("Unable to load nearby places right now. Please try again in a moment.", true);
    }
}

function buildOverpassQuery(latitude, longitude, radiusMeters) {
    return `
[out:json][timeout:25];
(
  node["amenity"~"^(restaurant|fast_food)$"](around:${radiusMeters},${latitude},${longitude});
  way["amenity"~"^(restaurant|fast_food)$"](around:${radiusMeters},${latitude},${longitude});
  relation["amenity"~"^(restaurant|fast_food)$"](around:${radiusMeters},${latitude},${longitude});
);
out center tags;
`;
}

async function fetchOverpassElements(query) {
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=UTF-8",
                    Accept: "application/json"
                },
                body: query
            });

            if (!response.ok) {
                throw new Error(`Overpass request failed (${response.status}) from ${endpoint}.`);
            }

            const data = await response.json();
            return Array.isArray(data.elements) ? data.elements : [];
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("All Overpass endpoints failed.");
}

function buildRestaurantList(elements, userLat, userLon) {
    const seen = new Set();

    return elements
        .map(element => normalizeRestaurant(element, userLat, userLon))
        .filter(Boolean)
        .filter(restaurant => {
            const dedupeKey = `${restaurant.name.toLowerCase()}|${restaurant.location.lat.toFixed(4)}|${restaurant.location.lon.toFixed(4)}`;

            if (seen.has(dedupeKey)) {
                return false;
            }

            seen.add(dedupeKey);
            return true;
        })
        .sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }

            if (b.cuisineScore !== a.cuisineScore) {
                return b.cuisineScore - a.cuisineScore;
            }

            return a.distance - b.distance;
        });
}

function normalizeRestaurant(element, userLat, userLon) {
    const tags = element.tags || {};
    const coordinates = getElementCoordinates(element);

    if (!coordinates) {
        return null;
    }

    const name = getRestaurantName(tags);
    const address = formatAddress(tags, coordinates);
    const cuisine = tags.cuisine ? formatCuisine(tags.cuisine) : null;
    const details = [];

    if (cuisine) {
        details.push(`Cuisine: ${cuisine}`);
    }

    if (tags["opening_hours"]) {
        details.push(`Hours: ${tags["opening_hours"]}`);
    }

    const searchBlob = [
        name,
        tags.cuisine,
        tags.description,
        tags["addr:street"],
        tags.brand,
        tags.branch
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const matchScore = scoreBiryaniMatch(searchBlob);
    const cuisineScore = scoreCuisineMatch(tags.cuisine || "");

    return {
        name,
        distance: calculateDistance(userLat, userLon, coordinates.lat, coordinates.lon),
        address,
        details,
        source: "OpenStreetMap nearby places",
        isBiryaniMatch: matchScore > 0,
        isLikelyBiryaniPlace: matchScore > 0 || cuisineScore > 0,
        matchScore,
        cuisineScore,
        location: coordinates
    };
}

function getElementCoordinates(element) {
    if (typeof element.lat === "number" && typeof element.lon === "number") {
        return { lat: element.lat, lon: element.lon };
    }

    if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
        return { lat: element.center.lat, lon: element.center.lon };
    }

    return null;
}

function getRestaurantName(tags) {
    return tags.name || tags.brand || tags.branch || "Unnamed restaurant";
}

function formatCuisine(cuisineValue) {
    return cuisineValue
        .split(";")
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => item.charAt(0).toUpperCase() + item.slice(1))
        .join(", ");
}

function formatAddress(tags, coordinates) {
    const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:suburb"],
        tags["addr:city"]
    ].filter(Boolean);

    if (addressParts.length > 0) {
        return addressParts.join(", ");
    }

    if (tags["addr:full"]) {
        return tags["addr:full"];
    }

    return `Map location near ${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`;
}

function scoreBiryaniMatch(searchBlob) {
    let score = 0;

    for (const keyword of BIRYANI_KEYWORDS) {
        if (searchBlob.includes(keyword)) {
            score += keyword === "biryani" || keyword === "biriyani" ? 3 : 2;
        }
    }

    return score;
}

function scoreCuisineMatch(cuisineValue) {
    const normalizedCuisine = cuisineValue.toLowerCase();
    let score = 0;

    for (const cuisine of BIRYANI_CUISINES) {
        if (normalizedCuisine.includes(cuisine)) {
            score += 2;
        }
    }

    return score;
}

function createRestaurantCard(restaurant) {
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];
    const card = document.createElement("article");
    const header = document.createElement("div");
    const name = document.createElement("span");
    const distance = document.createElement("span");
    const address = document.createElement("div");
    const meta = document.createElement("div");
    const actions = document.createElement("div");
    const directionsButton = document.createElement("button");
    const source = document.createElement("div");
    const marker = L.marker([restaurant.location.lat, restaurant.location.lon]).addTo(map);

    restaurantMarkers.push(marker);
    marker.bindPopup(`<strong>${restaurant.name}</strong><br>${restaurant.distance.toFixed(2)} km away`);

    card.className = "card";
    card.style.backgroundColor = randomColor;

    header.className = "card-header";
    name.className = "restaurant-name";
    distance.className = "distance";
    address.className = "address";
    meta.className = "meta";
    actions.className = "card-actions";
    source.className = "source";
    directionsButton.className = "directions-btn";
    directionsButton.type = "button";

    name.textContent = restaurant.name;
    distance.textContent = `${restaurant.distance.toFixed(2)} km`;
    address.textContent = restaurant.address;
    meta.textContent = restaurant.details.length > 0 ? restaurant.details.join(" • ") : "Nearby map listing.";
    source.textContent = restaurant.source;
    directionsButton.textContent = "Directions";

    directionsButton.addEventListener("click", () => {
        getDirections(restaurant.location.lat, restaurant.location.lon);
    });

    header.append(name, distance);
    actions.appendChild(directionsButton);
    card.append(header, address, meta, source, actions);
    restaurantList.appendChild(card);
}

function getDirections(destinationLat, destinationLon) {
    const destination = `${destinationLat},${destinationLon}`;

    if (currentUserLocation) {
        const origin = `${currentUserLocation.lat},${currentUserLocation.lon}`;
        const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin};${destination}`;
        window.open(url, "_blank", "noopener");
        return;
    }

    const url = `https://www.openstreetmap.org/?mlat=${destinationLat}&mlon=${destinationLon}#map=16/${destinationLat}/${destinationLon}`;
    window.open(url, "_blank", "noopener");
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

window.addEventListener("load", () => {
    setStatus("Requesting your location to find nearby biriyani places...");
    getUserLocation(updateMapWithLocation);
});
