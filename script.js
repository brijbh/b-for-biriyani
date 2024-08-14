// script.js

const cardColors = ['#784e5c', '#43a17f', '#bd69ff', '#fa639a', '#3fb1e5', '#a18dc2'];

// Function to convert kilometers to degrees
function kmToDegrees(km) {
    const earthRadiusKm = 6371;
    return km / earthRadiusKm * (180 / Math.PI);
}

// Initialize the map and set a default view
const map = L.map('map').setView([20.5937, 78.9629], 5); // Default view set to India

// Add OpenStreetMap tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function updateMapWithLocation(latitude, longitude) {
    if (latitude && longitude) {
        // Update the map view to the user's location
        map.setView([latitude, longitude], 13);

        // Add a marker to the user's location
        L.marker([latitude, longitude]).addTo(map)
            .bindPopup("You are here!")
            .openPopup();

        // Now, fetch and display restaurants near the user's location
        fetchNearbyRestaurants(latitude, longitude);
    } else {
        console.error("Failed to retrieve user location.");
    }
}

function fetchNearbyRestaurants(latitude, longitude) {
    const deltaLat = kmToDegrees(2); // Convert 2 km to degrees for latitude
    const deltaLon = kmToDegrees(2) / Math.cos(latitude * Math.PI / 180); // Adjust longitude delta based on latitude
    //const url = `https://nominatim.openstreetmap.org/search?q=biryani+restaurant&format=json&limit=10&bounded=1&viewbox=${longitude - deltaLon},${latitude - deltaLat},${longitude + deltaLon},${latitude + deltaLat}`;

    const url = `https://nominatim.openstreetmap.org/search?q=biriyani+restaurant&format=json&limit=10&bounded=1&viewbox=${longitude - deltaLon},${latitude - deltaLat},${longitude + deltaLon},${latitude + deltaLat}`;

    console.log("Fetching restaurants with URL:", url); // Log the API URL

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(results => {
            console.log("OSM results:", results); // Log the results from the API
            if (results.length === 0) {
                console.log("No restaurants found within the specified radius.");
            }
            results.forEach(place => {
                if (place.lat && place.lon) { // Ensure the place has latitude and longitude
                    const restaurant = {
                        name: place.display_name.split(",")[0],
                        distance: calculateDistance(latitude, longitude, parseFloat(place.lat), parseFloat(place.lon)),
                        address: place.display_name,
                        hours: 'Hours not available', // OSM Nominatim does not provide hours information
                        rating: 'Rating not available', // OSM Nominatim does not provide rating information
                        location: { lat: parseFloat(place.lat), lon: parseFloat(place.lon) }
                    };
                    console.log("Creating card for restaurant:", restaurant); // Log each restaurant
                    createRestaurantCard(restaurant);
                } else {
                    console.log("Place does not have valid coordinates:", place); // Log if the place lacks coordinates
                }
            });
        })
        .catch(error => {
            console.error("Error fetching OSM data:", error);
        });
}

function createRestaurantCard(restaurant) {
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];
    
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = randomColor;
    
    const lat = restaurant.location.lat;
    const lng = restaurant.location.lon;
    console.log(`Creating card for ${restaurant.name} with coordinates: ${lat}, ${lng}`);
    
    card.innerHTML = `
        <div class="card-header">
            <span class="restaurant-name">${restaurant.name}</span>
            <span class="distance">${restaurant.distance.toFixed(2)} km</span>
        </div>
        <div class="address">${restaurant.address}</div>
        <div class="hours"><b>Hours</b>: ${restaurant.hours}</div>
        <div class="review"><b>Google Review</b>: ${restaurant.rating}</div>
        <button class="directions-btn" onclick="getDirections(${lat}, ${lng})">Directions</button>
    `;
    
    document.getElementById('restaurant-list').appendChild(card);
}

function getDirections(lat, lon) {
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat},${lon};${lat},${lon}`;
    console.log(`Opening directions to ${lat}, ${lon}`);
    window.open(url, '_blank');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        0.5 - Math.cos(dLat) / 2 + 
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

// Initialize the app
window.onload = () => {
    getUserLocation(updateMapWithLocation);
};
