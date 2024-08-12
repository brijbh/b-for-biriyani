// location.js

function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            console.log("User location:", latitude, longitude);
            callback(latitude, longitude);
        }, error => {
            console.error("Error getting user location:", error);
            callback(null, null); // Handle error case
        }, {
            enableHighAccuracy: true, // Request high accuracy
            timeout: 10000, // Timeout after 10 seconds
            maximumAge: 0 // Do not use cached location data
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        callback(null, null); // Handle unsupported case
    }
}
