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
        const position = await getAccuratePosition(20);
        lstLat = position.coords.latitude;
        lstLon = position.coords.longitude;
        userMarker.setLatLng([lstLat, lstLon]);
        map.setView([lstLat, lstLon], 15);
        document.getElementById("midpointButton").disabled = false;
    } catch (error) {
        alert("Unable to retrieve accurate location. Please enable GPS.");
        console.error("Geolocation Error:", error.message);
    }
}

window.onload = initMap;

document.getElementById("midpointButton").addEventListener("click", async function () {
    document.getElementById("statusText").textContent = "Checking GPS accuracy...";
    try {
        const position = await getAccuratePosition(15);
        lstLat = position.coords.latitude;
        lstLon = position.coords.longitude;

        midpoint = { lat: lstLat, lon: lstLon };
        L.marker([lstLat, lstLon], { title: "Midpoint" }).addTo(map)
            .bindPopup("Midpoint Here! ✅").openPopup();

        document.getElementById("midpointDisplay").textContent = `Midpoint: ${lstLat.toFixed(5)}, ${lstLon.toFixed(5)}`;
        document.getElementById("statusText").textContent = "Midpoint Mapped! ✅";
        document.getElementById("startButton").disabled = false;
        document.getElementById("midpointButton").disabled = true;
    } catch (error) {
        alert("Failed to get an accurate midpoint. Try again.");
    }
});

document.getElementById("startButton").addEventListener("click", start);
document.getElementById("stopButton").addEventListener("click", stop);

document.getElementById("tripName").addEventListener("input", function () {
    tripName = this.value.trim();
    document.getElementById("tripNameDisplay").textContent = tripName || "Not Set";
});

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
    document.getElementById("startButton").disabled = true;
    document.getElementById("stopButton").disabled = false;
    document.getElementById("statusText").textContent = "Tracking in Progress...";
    whereAmI();
}

function stop() {
    tracking = false;
    clearInterval(locationUpdateInterval);
    document.getElementById("startButton").disabled = false;
    document.getElementById("stopButton").disabled = true;
    document.getElementById("statusText").textContent = "Tracking Stopped.";
    downloadTripData();
}

function whereAmI() {
    locationUpdateInterval = setInterval(async () => {
        try {
            const position = await getAccuratePosition(10);
            if (!tracking) return;

            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            let accuracy = position.coords.accuracy;
            let locationName = await getLocationName(lat, lon);

            if (lstLat !== null && lstLon !== null) {
                let newDistance = distCovered(lstLat, lstLon, lat, lon);
                distance += newDistance;
                tripData.push({ lat, lon, accuracy, name: locationName });
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
}

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

async function getLocationName(lat, lon) {
    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        let data = await response.json();
        return data.display_name || "Unknown Location";
    } catch (error) {
        return "Unknown Location";
    }
}

function distCovered(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
