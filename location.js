function getUserLocation(callback) {
    if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        callback(null, null, "Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        callback(latitude, longitude, null);
    }, error => {
        console.error("Error getting user location:", error);

        let message = "Unable to determine your location.";

        if (error.code === error.PERMISSION_DENIED) {
            message = "Location access was denied. Allow it to see nearby biriyani places.";
        } else if (error.code === error.TIMEOUT) {
            message = "Location request timed out. Try refreshing and allowing location access again.";
        }

        callback(null, null, message);
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
    });
}
