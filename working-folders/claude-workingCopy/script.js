const cardColors = ['#784e5c', '#43a17f', '#bd69ff', '#fa639a', '#3fb1e5', '#a18dc2'];

function createRestaurantCard(restaurant) {
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];
    
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = randomColor;
    
    card.innerHTML = `
        <div class="card-header">
            <span class="restaurant-name">${restaurant.name}</span>
            <span class="distance">${restaurant.distance.toFixed(2)} km</span>
        </div>
        <div class="address">${restaurant.address}</div>
        <div class="hours"><b>Hours</b>: ${restaurant.hours}</div>
        <div class="review"><b>Google Review</b>: ${restaurant.rating}</div>
        <button class="directions-btn" onclick="getDirections(${restaurant.location.lat()}, ${restaurant.location.lng()})">Directions</button>
    `;
    
    document.getElementById('restaurant-list').appendChild(card);
}

function getDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log("User location:", latitude, longitude);
                fetchNearbyRestaurants(latitude, longitude);
            },
            error => {
                console.error("Error getting user location:", error);
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}

function fetchNearbyRestaurants(latitude, longitude) {
    const request = {
        location: new google.maps.LatLng(latitude, longitude),
        radius: '2000',
        type: ['restaurant'],
        keyword: 'biryani'
    };

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log("Places API results:", results); // Debugging
            results.forEach(place => {
                const restaurant = {
                    name: place.name,
                    distance: calculateDistance(latitude, longitude, place.geometry.location.lat(), place.geometry.location.lng()),
                    address: place.vicinity,
                    hours: place.opening_hours ? (place.opening_hours.isOpen() ? 'Open now' : 'Closed') : 'Hours not available',
                    rating: place.rating || 'No reviews',
                    location: place.geometry.location
                };
                console.log("Creating card for restaurant:", restaurant); // Debugging
                createRestaurantCard(restaurant);
            });
        } else {
            console.error("Error fetching nearby restaurants:", status);
        }
    });
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
window.onload = getUserLocation;
