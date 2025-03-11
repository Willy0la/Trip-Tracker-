let tracking = false;
let distance = 0;
let lstLat = null;
let lstLon = null;
let tripName = "";
let midpoint = null;
let map;
let userMarker;
let tripData = [];
let locationUpdateInterval;

// Initialize the map
async function initMap() {
    if (map) {
        map.remove(); // Ensure any existing map instance is removed before reinitializing
    }
    map = L.map("map").setView([0, 0], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    userMarker = L.marker([0, 0]).addTo(map);

    try {
        const position = await getAccuratePosition(20); // Ensure accuracy before setting position
        lstLat = position.coords.latitude;
        lstLon = position.coords.longitude;
        userMarker.setLatLng([lstLat, lstLon]);
        map.setView([lstLat, lstLon], 15);
        document.getElementById("midpointButton").disabled = false; // Enable midpoint button
    } catch (error) {
        alert("Unable to retrieve accurate location. Please enable GPS.");
        console.error("Geolocation Error:", error.message);
    }
}

// Ensure map loads when the page loads
window.onload = initMap;

// Function to set midpoint (with accuracy check)
document.getElementById("midpointButton").addEventListener("click", async function () {
    document.getElementById("statusText").textContent = "Checking GPS accuracy...";
    try {
        const position = await getAccuratePosition(15); // Wait until accuracy is ≤ 15m
        lstLat = position.coords.latitude;
        lstLon = position.coords.longitude;

        midpoint = { lat: lstLat, lon: lstLon };
        L.marker([lstLat, lstLon], { title: "Midpoint" }).addTo(map)
            .bindPopup("Midpoint Here! ✅").openPopup();

        document.getElementById("midpointDisplay").textContent = `Midpoint: ${lstLat.toFixed(5)}, ${lstLon.toFixed(5)}`;
        document.getElementById("statusText").textContent = "Midpoint Mapped! ✅";

        document.getElementById("tripName").disabled = false;
        document.getElementById("tripForm").style.display = "block";
        document.getElementById("startButton").disabled = false;
        document.getElementById("midpointButton").disabled = true; // Disable after setting
    } catch (error) {
        alert("Failed to get an accurate midpoint. Try again.");
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
    clearInterval(locationUpdateInterval);
    document.getElementById("statusText").textContent = "Tracking Stopped.";
    document.getElementById("startButton").disabled = false;
    document.getElementById("stopButton").disabled = true;
    downloadTripData();
}

// Function to get real-time location updates with accuracy check
function whereAmI() {
    if (navigator.geolocation) {
        locationUpdateInterval = setInterval(async () => {
            try {
                const position = await getAccuratePosition(10); // Ensure accuracy ≤ 10m
                if (!tracking) return;

                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                let locationName = await getLocationName(lat, lon);

                if (lstLat !== null && lstLon !== null) {
                    let newDistance = distCovered(lstLat, lstLon, lat, lon);
                    if (newDistance > 0.5) {
                        distance += newDistance;
                        tripData.push({ lat, lon, accuracy: position.coords.accuracy, name: locationName });

                        document.getElementById("statusText").textContent = "New location mapped!";
                    }
                }

                lstLat = lat;
                lstLon = lon;
                userMarker.setLatLng([lat, lon]);
                map.setView([lat, lon], 15);
                document.getElementById("distanceCounter").textContent = (distance / 1000).toFixed(2) + " km";
            } catch (error) {
                console.error("Location update failed:", error);
            }
        }, 10000);
    } else {
        alert("Your browser does not support location tracking!");
    }
}

// Function to get accurate position
async function getAccuratePosition(maxAccuracy) {
    return new Promise((resolve, reject) => {
        function attemptPosition() {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (position.coords.accuracy <= maxAccuracy) {
                        resolve(position);
                    } else {
                        document.getElementById("statusText").textContent = `Waiting for better accuracy... (Current: ${Math.round(position.coords.accuracy)}m)`;
                        setTimeout(attemptPosition, 5000);
                    }
                },
                (error) => reject(error),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }
        attemptPosition();
    });
}

// Function to fetch location name from coordinates
async function getLocationName(lat, lon) {
    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        let data = await response.json();
        return data.display_name || "Unknown Location";
    } catch (error) {
        return "Unknown Location";
    }
}

// Function to download trip data as JSON
function downloadTripData() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        name: tripName,
        totalDistance: (distance / 1000).toFixed(2) + " km",
        midpoint,
        locations: tripData
    }, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${tripName}_trip_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// Button event listeners
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("stopButton").addEventListener("click", stop);
