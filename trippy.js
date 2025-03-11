let tracking = false;
let distance = 0;
let lstLat = null;
let lstLon = null;
let tripName = "";
let midpoint = null;
let map;
let userMarker;
let tripData = [];

// Initialize the map
function initMap() {
    map = L.map("map").setView([0, 0], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    userMarker = L.marker([0, 0]).addTo(map);

    navigator.geolocation.getCurrentPosition(
        (position) => {
            lstLat = position.coords.latitude;
            lstLon = position.coords.longitude;
            userMarker.setLatLng([lstLat, lstLon]);
            map.setView([lstLat, lstLon], 15);
        },
        () => alert("Unable to retrieve location. Please enable GPS."),
        { enableHighAccuracy: true }
    );
}

// Function to set midpoint
document.getElementById("midpointButton").addEventListener("click", function () {
    if (lstLat !== null && lstLon !== null) {
        midpoint = { lat: lstLat, lon: lstLon };
        L.marker([lstLat, lstLon], { title: "Midpoint" }).addTo(map)
            .bindPopup("Midpoint Here!").openPopup();

        document.getElementById("midpointDisplay").textContent = `Midpoint: ${lstLat.toFixed(5)}, ${lstLon.toFixed(5)}`;
        document.getElementById("statusText").textContent = "Midpoint Mapped! ✅";
        document.getElementById("tripName").disabled = false;
        document.getElementById("tripForm").style.display = "block";
        document.getElementById("startButton").disabled = false;
        document.getElementById("midpointButton").disabled = true;
    } else {
        alert("Waiting for location... Please try again.");
    }
});

// Handle trip name input
document.getElementById("tripName").addEventListener("input", function () {
    tripName = this.value.trim();
    document.getElementById("tripNameDisplay").textContent = tripName || "Not Set";
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
    tripData = [];
    document.getElementById("statusText").textContent = "Tracking in Progress...";
    document.getElementById("startButton").disabled = true;
    document.getElementById("stopButton").disabled = false;
    document.getElementById("midpointButton").disabled = true;
    whereAmI();
}

// Function to stop tracking
function stop() {
    tracking = false;
    document.getElementById("statusText").textContent = "Tracking Stopped.";
    document.getElementById("startButton").disabled = false;
    document.getElementById("stopButton").disabled = true;
    generateTripData();
}

// Function to get real-time location updates with accuracy check
function whereAmI() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (position) {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                let accuracy = position.coords.accuracy;

                if (!tracking) return;

                if (accuracy > 20) {  // Increased threshold from 10 to 20 meters
                    document.getElementById("statusText").textContent = "Poor accuracy. Retrying...";
                    return;
                }

                if (lstLat !== null && lstLon !== null) {
                    let newDistance = distCovered(lstLat, lstLon, lat, lon);
                    if (newDistance > 0.5) { // Ignore tiny movements
                        distance += newDistance;
                        tripData.push({ lat, lon, accuracy });
                    }
                }

                lstLat = lat;
                lstLon = lon;
                userMarker.setLatLng([lat, lon]);
                map.setView([lat, lon], 15);
                document.getElementById("distanceCounter").textContent = (distance / 1000).toFixed(2) + " km";
            },
            function () {
                alert("Location permission denied. Please enable it.");
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }  // Increased timeout
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

// Generate and download trip data
function generateTripData() {
    const tripSummary = {
        name: tripName,
        totalDistance: (distance / 1000).toFixed(2) + " km",
        midpoint,
        locations: tripData
    };
    console.log("Final Trip Data:", tripSummary);
    const blob = new Blob([JSON.stringify(tripSummary, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tripName.replace(/\s+/g, '_')}_trip_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize map when the page loads
window.onload = initMap;

// Button event listeners
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("stopButton").addEventListener("click", stop);
