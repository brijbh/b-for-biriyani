const DEFAULT_LOCATION = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;
const SEARCH_RADIUS_METERS = 2000;
const RESULT_LIMIT = 10;
const DEFAULT_CONFIG = {
    apiBaseUrl: "http://localhost:8787",
    googleMapsBrowserKey: "",
    googleMapsMapId: "",
    searchRadiusMeters: SEARCH_RADIUS_METERS
};

let map;
let userMarker;
let infoWindow;
let currentUserLocation = null;
const placeMarkers = [];

const appConfig = Object.assign({}, DEFAULT_CONFIG, window.APP_CONFIG || {});
const restaurantList = document.getElementById("restaurant-list");
const statusMessage = document.getElementById("status-message");

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);
}

function clearRestaurantList() {
    restaurantList.innerHTML = "";
}

function clearPlaceMarkers() {
    placeMarkers.forEach(marker => marker.map = null);
    placeMarkers.length = 0;
}

function updateMapWithLocation(latitude, longitude, errorMessage) {
    clearRestaurantList();
    clearPlaceMarkers();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
        currentUserLocation = null;
        setStatus(errorMessage || "Location is unavailable. Allow location access to search nearby biriyani places.", true);
        return;
    }

    currentUserLocation = { lat: latitude, lng: longitude };
    centerMap(latitude, longitude, 14);
    updateUserMarker(latitude, longitude);
    setStatus("Searching Google Places for nearby biriyani restaurants...");
    fetchNearbyBiriyaniPlaces(latitude, longitude);
}

async function fetchNearbyBiriyaniPlaces(latitude, longitude) {
    const url = new URL("/api/search", appConfig.apiBaseUrl);

    url.searchParams.set("lat", latitude.toString());
    url.searchParams.set("lng", longitude.toString());
    url.searchParams.set("radius", String(appConfig.searchRadiusMeters || SEARCH_RADIUS_METERS));
    url.searchParams.set("limit", String(RESULT_LIMIT));

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Search API failed (${response.status}).`);
        }

        const payload = await response.json();
        const places = Array.isArray(payload.places) ? payload.places : [];

        if (places.length === 0) {
            setStatus("No biriyani-specific Google Places matches were found in this radius.", true);
            return;
        }

        renderPlaces(places);
        setStatus(`Found ${places.length} biriyani place${places.length === 1 ? "" : "s"} nearby.`);
    } catch (error) {
        console.error("Error fetching biriyani places:", error);
        setStatus("Unable to load Google Places results right now. Check the backend URL and API keys.", true);
    }
}

function renderPlaces(places) {
    clearRestaurantList();
    clearPlaceMarkers();

    places.forEach(place => {
        createRestaurantCard(place);
        addPlaceMarker(place);
    });
}

function createRestaurantCard(place) {
    const card = document.createElement("article");
    const header = document.createElement("div");
    const name = document.createElement("span");
    const distance = document.createElement("span");
    const address = document.createElement("div");
    const meta = document.createElement("div");
    const source = document.createElement("div");
    const actions = document.createElement("div");
    const directionsButton = document.createElement("button");

    card.className = "card";
    card.style.backgroundColor = getCardColor(place.name);

    header.className = "card-header";
    name.className = "restaurant-name";
    distance.className = "distance";
    address.className = "address";
    meta.className = "meta";
    source.className = "source";
    actions.className = "card-actions";
    directionsButton.className = "directions-btn";
    directionsButton.type = "button";

    name.textContent = place.name;
    distance.textContent = `${place.distanceKm.toFixed(2)} km`;
    address.textContent = place.address;

    const metaParts = [];
    if (place.primaryTypeDisplayName) {
        metaParts.push(place.primaryTypeDisplayName);
    }
    if (place.rating) {
        metaParts.push(`Rating ${place.rating.toFixed(1)}`);
    }
    if (place.userRatingCount) {
        metaParts.push(`${place.userRatingCount} reviews`);
    }
    if (place.openNow === true) {
        metaParts.push("Open now");
    } else if (place.openNow === false) {
        metaParts.push("Closed now");
    }
    meta.textContent = metaParts.length > 0 ? metaParts.join(" • ") : "Google Places result";

    source.textContent = "Google Places";
    directionsButton.textContent = "Directions";
    directionsButton.addEventListener("click", () => openDirections(place));

    header.append(name, distance);
    actions.appendChild(directionsButton);
    card.append(header, address, meta, source, actions);
    restaurantList.appendChild(card);
}

function openDirections(place) {
    if (place.googleMapsUri) {
        window.open(place.googleMapsUri, "_blank", "noopener");
        return;
    }

    const destination = `${place.location.lat},${place.location.lng}`;
    const origin = currentUserLocation ? `${currentUserLocation.lat},${currentUserLocation.lng}` : "";
    const url = new URL("https://www.google.com/maps/dir/");

    if (origin) {
        url.searchParams.set("api", "1");
        url.searchParams.set("origin", origin);
        url.searchParams.set("destination", destination);
    } else {
        url.searchParams.set("api", "1");
        url.searchParams.set("destination", destination);
    }

    window.open(url.toString(), "_blank", "noopener");
}

function getCardColor(seed) {
    const colors = ["#784e5c", "#43a17f", "#bd69ff", "#fa639a", "#3fb1e5", "#a18dc2"];
    const index = Math.abs(hashString(seed)) % colors.length;
    return colors[index];
}

function hashString(value) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }

    return hash;
}

async function initializeMaps() {
    if (!appConfig.googleMapsBrowserKey) {
        document.getElementById("map").classList.add("map-disabled");
        document.getElementById("map").textContent = "Add a browser-restricted Google Maps API key in config.js to enable the map.";
        setStatus("Map key missing. Search still works once the backend is configured.", true);
        return;
    }

    await loadGoogleMapsScript(appConfig.googleMapsBrowserKey);

    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    map = new Map(document.getElementById("map"), {
        center: DEFAULT_LOCATION,
        zoom: DEFAULT_ZOOM,
        mapId: appConfig.googleMapsMapId || undefined,
        streetViewControl: false,
        mapTypeControl: false
    });

    infoWindow = new InfoWindow();
    window.AdvancedMarkerElement = AdvancedMarkerElement;
}

function centerMap(lat, lng, zoom = 14) {
    if (!map) {
        return;
    }

    map.setCenter({ lat, lng });
    map.setZoom(zoom);
}

function updateUserMarker(lat, lng) {
    if (!map || !window.AdvancedMarkerElement) {
        return;
    }

    if (userMarker) {
        userMarker.position = { lat, lng };
        return;
    }

    userMarker = new window.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: "You are here"
    });
}

function addPlaceMarker(place) {
    if (!map || !window.AdvancedMarkerElement) {
        return;
    }

    const marker = new window.AdvancedMarkerElement({
        map,
        position: place.location,
        title: place.name
    });

    marker.addListener("click", () => {
        infoWindow.setContent(`<strong>${escapeHtml(place.name)}</strong><br>${escapeHtml(place.address)}`);
        infoWindow.open({ anchor: marker, map });
    });

    placeMarkers.push(marker);
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function loadGoogleMapsScript(apiKey) {
    if (window.google?.maps?.importLibrary) {
        return Promise.resolve();
    }

    if (window.__googleMapsPromise) {
        return window.__googleMapsPromise;
    }

    window.__googleMapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Google Maps JavaScript API failed to load."));

        document.head.appendChild(script);
    });

    return window.__googleMapsPromise;
}

window.addEventListener("load", async () => {
    try {
        await initializeMaps();
    } catch (error) {
        console.error("Map initialization failed:", error);
        setStatus("Google Maps failed to load. Check the browser key and referrer restrictions.", true);
    }

    setStatus("Requesting your location to find nearby biriyani places...");
    getUserLocation(updateMapWithLocation);
});
