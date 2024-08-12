let service;
let userLocation;

function initApp() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            const request = {
                location: userLocation,
                radius: '2000', // Increase the radius for more results
                type: ['restaurant'],
                keyword: 'biryani'
            };

            service = new google.maps.places.PlacesService(document.createElement('div'));
            service.nearbySearch(request, callback);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        const placesList = document.getElementById("places");
        placesList.innerHTML = '';
        results.forEach((place) => {
            const distance = calculateDistance(userLocation, place.geometry.location);
            const placeElement = document.createElement("div");
            placeElement.classList.add("card");

            const hours = place.opening_hours ? (place.opening_hours.isOpen() ? 'Open now' : 'Closed') : 'Hours not available';
            const reviews = place.rating ? `${place.rating} stars` : 'No reviews';

            placeElement.innerHTML = `
                <strong>${place.name}</strong> (${distance.toFixed(2)} km)<br>
                ${place.vicinity}<br>
                Hours: ${hours}<br>
                Reviews: ${reviews}<br>
                <div class="directions-button" onclick="showOnMap(${place.geometry.location.lat()}, ${place.geometry.location.lng()})">Directions</div>
            `;
            placesList.appendChild(placeElement);
        });
    }
}

function showOnMap(lat, lng) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}

function calculateDistance(loc1, loc2) {
    const radlat1 = Math.PI * loc1.lat / 180;
    const radlat2 = Math.PI * loc2.lat() / 180;
    const theta = loc1.lng - loc2.lng();
    const radtheta = Math.PI * theta / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    dist = dist * 1.609344; // Convert miles to km
    return dist;
}

window.onload = initApp;
