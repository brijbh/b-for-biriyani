const cardColors = ['#784e5c', '#43a17f', '#bd69ff', '#fa639a', '#3fb1e5', '#a18dc2'];

function createRestaurantCard(restaurant) {
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];
    
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = randomColor;
    
    const lat = restaurant.location.lat();
    const lng = restaurant.location.lng();
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

function getDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    console.log(`Opening directions to ${lat}, ${lng}`);
    window.open(url, '_blank');
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log("User location:", latitude, longitude);
                alert(`User location: ${latitude}, ${longitude}`);
                fetchNearbyRestaurants(latitude, longitude);
            },
            error => {
                console.error("Error getting user location:", error);
                alert("Error getting user location: " + error.message);
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        alert("Geolocation is not supported by this browser.");
    }
}

function fetchNearbyRestaurants(latitude, longitude) {
    console.log("Fetching restaurants for coordinates:", latitude, longitude);
    alert(`Fetching restaurants for coordinates: ${latitude}, ${longitude}`);

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
            alert(`Places API results: ${results.length} places found.`);
            results.forEach(place => {
                const restaurant = {
                    name: place.name,
                    distance: calculateDistance(latitude, longitude, place.geometry.location.lat(), place.geometry.location.lng()),
                    address: place.vicinity,
                    hours: formatOpeningHours(place.opening_hours, place.utc_offset_minutes),
                    rating: place.rating || 'No reviews',
                    location: place.geometry.location
                };
                console.log("Creating card for restaurant:", restaurant); // Debugging
                createRestaurantCard(restaurant);
            });
        } else {
            console.error("Error fetching nearby restaurants:", status);
            alert("Error fetching nearby restaurants: " + status);
        }
    });
}

function formatOpeningHours(openingHours, utcOffsetMinutes) {
    if (!openingHours) {
        return 'Hours not available';
    }

    const openNow = openingHours.open_now ? 'Open' : 'Closed';
    let closingTime = '';

    if (openingHours.periods) {
        const today = new Date();
        const day = today.getDay();
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();

        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        const periodsToday = openingHours.periods.filter(period => {
            const openTimeInMinutes = period.open.hours * 60 + period.open.minutes;
            const closeTimeInMinutes = period.close.hours * 60 + period.close.minutes;

            return currentTimeInMinutes < closeTimeInMinutes;
        });

        if (periodsToday.length > 0) {
            const close = periodsToday[0].close;
            const closeHours = close.hours;
            const closeMinutes = close.minutes || '00';
            const ampm = closeHours >= 12 ? 'pm' : 'am';
            const formattedCloseHours = closeHours % 12 || 12; // Convert 24-hour time to 12-hour time
            closingTime = ` • Closes ${formattedCloseHours}:${closeMinutes}${ampm}`;
        }
    }

    return `${openNow}${closingTime}`;
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
