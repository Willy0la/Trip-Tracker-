let tracking = false;
let distance = 0;
let lstLat = null;
let lstLon = null;
let tripName = "";
let midpoint = null;
let map;
let userMarker;
let retrying = false; // Flag to track retry state

// Initialize the map
function initMap() {
    map = L.map("map").setView([0, 0], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    userMarker = L.marker([0, 0]).addTo(map);
}

// Function to set midpoint
document.getElementById("midpointButton").addEventListener("click", function () {
    if (lstLat !== null && lstLon !== null) {
        midpoint = { lat: lstLat, lon: lstLon };
        L.marker([lstLat, lstLon], { title: "Midpoint" }).addTo(map)
            .bindPopup("Midpoint Here!").openPopup();

        document.getElementById("midpointDisplay").textContent = `Midpoint: ${lstLat.toFixed(5)}, ${lstLon.toFixed(5)}`;
        document.getElementById("statusText").textContent = "Midpoint Mapped! ✅";

        // Enable trip name input
        document.getElementById("tripName").disabled = false;
        document.getElementById("tripForm").style.display = "block"; // Show trip form
        alert("Midpoint mapped successfully!");
    } else {
        alert("Waiting for location... Please try again.");
        showRetryingMessage();
    }
});

// Function to display "Retrying..." notification without clearing trip name
function showRetryingMessage() {
    if (!retrying) {
        retrying = true;
        document.getElementById("statusText").textContent = "Retrying to fetch location...";
        setTimeout(() => {
            retrying = false;
            document.getElementById("statusText").textContent = midpoint
                ? "Midpoint Mapped! ✅"
                : "Midpoint not mapped.";
        }, 4000); // Show retrying message for 3 seconds
    }
}

// Handle trip name input (Only enabled after midpoint is mapped)
document.getElementById("tripName").addEventListener("input", function () {
    tripName = this.value.trim();
    document.getElementById("tripNameDisplay").textContent = tripName || "Not Set";

    // Enable the Start button only if a trip name is entered
    document.getElementById("startButton").disabled = tripName === "";
});

// Function to start tracking
function start() {
    if (!midpoint) {
        alert("Please map the midpoint first!");
        return;
    }

    if (!tripName) {
        alert("Please enter a trip name first!");
        return;
    }

    tracking = true;
    distance = 0;
    document.getElementById("statusText").textContent = "Tracking in Progress...";
    document.getElementById("startButton").disabled = true;
    document.getElementById("stopButton").disabled = false;

    whereAmI();
}

// Function to stop tracking
function stop() {
    if (tracking) {
        tracking = false;
        document.getElementById("statusText").textContent = "Tracking Stopped.";
        document.getElementById("startButton").disabled = false;
        document.getElementById("stopButton").disabled = true;
    }
}

// Function to get real-time location updates
function whereAmI() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (position) {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;

                if (lstLat !== null && lstLon !== null) {
                    distance += distCovered(lstLat, lstLon, lat, lon);
                }

                lstLat = lat;
                lstLon = lon;

                // Update the map position
                userMarker.setLatLng([lat, lon]);
                map.setView([lat, lon], 15);

                // Update distance display
                document.getElementById("distanceCounter").textContent = (distance / 1000).toFixed(2) + " km";
            },
            function () {
                alert("Location permission denied. Please enable it.");
                showRetryingMessage();
            }
        );
    } else {
        alert("Your browser does not support location tracking!");
    }
}

// Function to calculate distance using Haversine formula
function distCovered(lat1, lon1, lat2, lon2) {
    let earthRadius = 6371000;
    let toRad = Math.PI / 180;
    let dLat = (lat2 - lat1) * toRad;
    let dLon = (lon2 - lon1) * toRad;
    let a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

// Initialize map when the page loads
window.onload = initMap;

// Button event listeners
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("stopButton").addEventListener("click", stop);
