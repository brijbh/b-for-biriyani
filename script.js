const cardColors = ["#784e5c", "#43a17f", "#bd69ff", "#fa639a", "#3fb1e5", "#a18dc2"];
const DEFAULT_LOCATION = { lat: 20.5937, lon: 78.9629, zoom: 5, label: "India" };
const SEARCH_RADIUS_KM = 2;
const RESTAURANT_LIMIT = 10;

let currentUserLocation = null;
let userMarker = null;
const restaurantMarkers = [];

const map = L.map("map").setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon], DEFAULT_LOCATION.zoom);
const restaurantList = document.getElementById("restaurant-list");
const statusMessage = document.getElementById("status-message");

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function kmToDegrees(km) {
    const earthRadiusKm = 6371;
    return (km / earthRadiusKm) * (180 / Math.PI);
}

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
        setStatus("Showing biriyani spots within about 2 km of your location.");
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

function fetchNearbyRestaurants(latitude, longitude) {
    const deltaLat = kmToDegrees(SEARCH_RADIUS_KM);
    const longitudeDivisor = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
    const deltaLon = kmToDegrees(SEARCH_RADIUS_KM) / longitudeDivisor;
    const url = `https://nominatim.openstreetmap.org/search?q=biryani+restaurant&format=json&limit=${RESTAURANT_LIMIT}&bounded=1&viewbox=${longitude - deltaLon},${latitude - deltaLat},${longitude + deltaLon},${latitude + deltaLat}`;

    fetch(url, {
        headers: {
            Accept: "application/json"
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load nearby restaurants (${response.status}).`);
            }
            return response.json();
        })
        .then(results => {
            const uniqueRestaurants = buildRestaurantList(results, latitude, longitude);

            if (uniqueRestaurants.length === 0) {
                setStatus("No biriyani-specific results were found in this radius. Try again from a busier area.", true);
                return;
            }

            uniqueRestaurants.forEach(createRestaurantCard);
            setStatus(`Found ${uniqueRestaurants.length} biriyani place${uniqueRestaurants.length === 1 ? "" : "s"} nearby.`);
        })
        .catch(error => {
            console.error("Error fetching OSM data:", error);
            setStatus("Unable to load restaurant data right now. Please try again later.", true);
        });
}

function buildRestaurantList(results, userLat, userLon) {
    const seen = new Set();

    return results
        .filter(place => place.lat && place.lon && place.display_name)
        .map(place => {
            const lat = Number.parseFloat(place.lat);
            const lon = Number.parseFloat(place.lon);
            const address = place.display_name.trim();
            const name = address.split(",")[0].trim();
            const dedupeKey = `${name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;

            if (seen.has(dedupeKey)) {
                return null;
            }

            seen.add(dedupeKey);

            return {
                name,
                distance: calculateDistance(userLat, userLon, lat, lon),
                address,
                details: [],
                source: "Live OpenStreetMap search",
                location: { lat, lon }
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);
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
    meta.textContent = restaurant.details.length > 0 ? restaurant.details.join(" • ") : "Map result only. Hours and ratings are not available from this data source.";
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
