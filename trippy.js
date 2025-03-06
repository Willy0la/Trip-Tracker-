"use strict"

let map, userMarker, midpointMarker, routeLine;
let tripStarted = false;
let tripName = '';
let currentLocation = { lat: 0, lon: 0 };
let midpoint = { lat: 0, lon: 0 };
let previousLocation = { lat: 0, lon: 0 };
let accuracyThreshold = 15; // accuracy in meters
let locations = [];
let trackingInterval;
let totalDistanceCovered = 0;

// Initialize map
function initMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    userMarker = L.marker([0, 0]).addTo(map);
    midpointMarker = L.marker([0, 0], { color: 'red' }).addTo(map);
    routeLine = L.polyline([], { color: 'blue' }).addTo(map);
}

// Ensure accurate location before prompting trip name
function getAccurateLocation() {
    navigator.geolocation.watchPosition(
        function (position) {
            if (position.coords.accuracy <= accuracyThreshold) {
                currentLocation.lat = position.coords.latitude;
                currentLocation.lon = position.coords.longitude;
                map.setView([currentLocation.lat, currentLocation.lon], 13);
                userMarker.setLatLng([currentLocation.lat, currentLocation.lon]);
                midpointMarker.setLatLng([currentLocation.lat, currentLocation.lon]);
                midpoint = currentLocation;
                notifyUser(`Midpoint mapped at Latitude: ${midpoint.lat}, Longitude: ${midpoint.lon}`);
                promptForTripName();
            }
        },
        function () {
            alert('Unable to retrieve location with required accuracy. Retrying...');
        },
        { enableHighAccuracy: true }
    );
}

// Notify user function
function notifyUser(message) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(message);
    } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    } else {
        alert(message);
    }
}

// Prompt user for trip name
function promptForTripName() {
    const tripNameInput = document.getElementById('tripName');
    const tripForm = document.getElementById('tripForm');
    tripForm.style.display = 'block';

    tripForm.addEventListener('submit', function (e) {
        e.preventDefault();
        tripName = tripNameInput.value;
        tripForm.style.display = 'none';
        document.getElementById('startButton').disabled = false;
    });
}

// Start tracking
function startTrip() {
    if (!tripStarted) {
        tripStarted = true;
        document.getElementById('statusText').textContent = 'Tracking...';
        document.getElementById('startButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        trackLocation();
    }
}

// Track location every 10 seconds
function trackLocation() {
    trackingInterval = setInterval(() => {
        if (tripStarted) {
            navigator.geolocation.getCurrentPosition(position => {
                if (position.coords.accuracy <= accuracyThreshold) {
                    let newLat = position.coords.latitude;
                    let newLon = position.coords.longitude;
                    
                    if (previousLocation.lat && previousLocation.lon) {
                        let distance = getDistanceInKm(previousLocation, { lat: newLat, lon: newLon });
                        totalDistanceCovered += distance;
                    }

                    userMarker.setLatLng([newLat, newLon]);
                    routeLine.addLatLng([newLat, newLon]);
                    locations.push({ lat: newLat, lon: newLon, time: new Date().toISOString() });
                    previousLocation = { lat: newLat, lon: newLon };
                }
            });
        }
    }, 10000);
}

// Stop tracking
function stopTrip() {
    if (tripStarted) {
        tripStarted = false;
        clearInterval(trackingInterval);
        document.getElementById('statusText').textContent = 'Trip Stopped';
        document.getElementById('startButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        downloadTripData();
    }
}

// Calculate distance using Haversine formula
function getDistanceInKm(loc1, loc2) {
    const R = 6371;
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLon = toRad(loc2.lon - loc1.lon);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// Download trip data
function downloadTripData() {
    let tripData = {
        name: tripName,
        totalDistanceCovered: totalDistanceCovered.toFixed(3),
        midpoint: midpoint,
        locations: locations
    };
    
    let json = JSON.stringify(tripData, null, 2);
    let blob = new Blob([json], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = tripName + '_log.json';
    a.click();
}

// Event listeners
document.getElementById('startButton').addEventListener('click', startTrip);
document.getElementById('stopButton').addEventListener('click', stopTrip);

// Initialize map and location tracking
initMap();
getAccurateLocation();
