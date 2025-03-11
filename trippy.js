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
    map = L.map("map").setView([0, 0], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    userMarker = L.marker([0, 0]).addTo(map);

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });

        lstLat = position.coords.latitude;
        lstLon = position.coords.longitude;
        userMarker.setLatLng([lstLat, lstLon]);
        map.setView([lstLat, lstLon], 15);
    } catch (error) {
        alert("Unable to retrieve location. Please enable GPS.");
        console.error("Geolocation Error:", error.message);
    }
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

    // Allow new trip
    document.getElementById("tripName").value = "";
    document.getElementById("tripName").disabled = false;
    document.getElementById("midpointButton").disabled = false;
    tripName = "";
    clearInterval(locationUpdateInterval);
}

// Function to get real-time location updates with accuracy check
function whereAmI() {
    if (navigator.geolocation) {
        locationUpdateInterval = setInterval(async () => {
            navigator.geolocation.getCurrentPosition(
                async function (position) {
                    let lat = position.coords.latitude;
                    let lon = position.coords.longitude;
                    let accuracy = position.coords.accuracy;

                    if (!tracking) return;

                    if (accuracy > 10) {
                        document.getElementById("statusText").textContent = "Poor accuracy. Retrying...";
                        return;
                    }

                    let locationName = await getLocationName(lat, lon);

                    if (lstLat !== null && lstLon !== null) {
                        let newDistance = distCovered(lstLat, lstLon, lat, lon);
                        if (newDistance > 0.5) {
                            distance += newDistance;
                            let locationData = { lat, lon, accuracy, name: locationName };
                            tripData.push(locationData);
                            console.log("New location mapped:", locationData);
                            document.getElementById("statusText").textContent = "New location mapped!";
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
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }, 10000);
    } else {
        alert("Your browser does not support location tracking!");
    }
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

// Function to generate trip data
function generateTripData() {
    let tripDetails = {
        name: tripName,
        totalDistance: (distance / 1000).toFixed(2) + " km",
        midpoint: midpoint,
        locations: tripData
    };
    console.log("Trip Data:", tripDetails);
}

// Initialize map when the page loads
window.onload = initMap;

// Button event listeners
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("stopButton").addEventListener("click", stop);
