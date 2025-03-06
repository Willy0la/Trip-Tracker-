"use strict";

let map, userMarker, midpointMarker, routeLine;
let tripStarted = false;
let tripName = "";
let currentLocation = { lat: 0, lon: 0 };
let previousLocation = { lat: 0, lon: 0 };
let midpoint = { lat: 0, lon: 0 };
let accuracyThreshold = 15;
let locations = [];
let trackingInterval;
let totalDistanceCovered = 0;
let tripNameSet = false;
let locationAttempts = 0;
let maxLocationAttempts = 5;
let watchId;
let movementThreshold = 50;

// Initialize Map
function initMap() {
  map = L.map("map").setView([0, 0], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  userMarker = L.marker([0, 0]).addTo(map);
  midpointMarker = L.marker([0, 0], { color: "red" }).addTo(map);
  routeLine = L.polyline([], { color: "blue" }).addTo(map);
}

// Get Accurate Location Before Starting Trip
function getAccurateLocation() {
  locationAttempts = 0;
  watchId = navigator.geolocation.watchPosition(
    function (position) {
      if (position.coords.accuracy <= accuracyThreshold && !tripNameSet) {
        tripNameSet = true;
        currentLocation.lat = position.coords.latitude;
        currentLocation.lon = position.coords.longitude;
        map.setView([currentLocation.lat, currentLocation.lon], 13);
        userMarker.setLatLng([currentLocation.lat, currentLocation.lon]);
        midpointMarker.setLatLng([currentLocation.lat, currentLocation.lon]);
        midpoint = currentLocation;
        notifyUser(
          `Midpoint mapped at Latitude: ${midpoint.lat}, Longitude: ${midpoint.lon}`
        );
        promptForTripName();
      } else {
        locationAttempts++;
        if (locationAttempts >= maxLocationAttempts) {
          navigator.geolocation.clearWatch(watchId);
          let retry = confirm(
            "Unable to retrieve accurate location. Move to an open area and try again?"
          );
          if (retry) {
            getAccurateLocation();
          } else {
            alert("Please move to a better location and try again later.");
          }
        }
      }
    },
    function () {
      locationAttempts++;
      if (locationAttempts >= maxLocationAttempts) {
        navigator.geolocation.clearWatch(watchId);
        let retry = confirm(
          "Unable to retrieve location. Move to an open area and try again?"
        );
        if (retry) {
          getAccurateLocation();
        } else {
          alert("Please move to a better location and try again later.");
        }
      }
    },
    { enableHighAccuracy: true }
  );
}

// Notify User
function notifyUser(message) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(message);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(message);
        }
      });
    }
  }
  alert(message);
}

// Prompt for Trip Name
function promptForTripName() {
  document.getElementById("tripForm").style.display = "block";
  const tripNameInput = document.getElementById("tripName");
  document.getElementById("tripForm").addEventListener("submit", function (e) {
    e.preventDefault();
    tripName = tripNameInput.value.trim();
    if (tripName !== "") {
      document.getElementById("tripForm").style.display = "none";
      document.getElementById("startButton").disabled = false;
    }
  });
}

// Start Tracking Trip
function startTracking() {
  if (tripStarted) return;
  tripStarted = true;
  previousLocation = { ...currentLocation };
  trackingInterval = setInterval(updateLocation, 10000);
  document.getElementById("statusText").innerText = "Tracking...";
  document.getElementById("startButton").disabled = true;
  document.getElementById("stopButton").disabled = false;
}

// Stop Tracking Trip
function stopTracking() {
  tripStarted = false;
  clearInterval(trackingInterval);
  document.getElementById("statusText").innerText = "Trip Ended";
  document.getElementById("startButton").disabled = false;
  document.getElementById("stopButton").disabled = true;
  downloadTripData();
}

// Update User Location
function updateLocation() {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      let newLat = position.coords.latitude;
      let newLon = position.coords.longitude;
      let accuracy = position.coords.accuracy;

      if (accuracy > accuracyThreshold) {
        console.log("Low accuracy, skipping update...");
        return;
      }

      let distance = getDistance(previousLocation, { lat: newLat, lon: newLon });

      if (distance >= movementThreshold) {
        previousLocation = { lat: newLat, lon: newLon };
        totalDistanceCovered += distance;
        locations.push({ lat: newLat, lon: newLon });

        userMarker.setLatLng([newLat, newLon]);
        routeLine.addLatLng([newLat, newLon]);

        document.getElementById("distanceCounter").innerText =
          totalDistanceCovered.toFixed(2);
      }
    },
    function (error) {
      console.error("Error getting location:", error);
    },
    { enableHighAccuracy: true }
  );
}

// Calculate Distance Between Two Points
function getDistance(loc1, loc2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lon - loc1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert Degrees to Radians
function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Download Trip Data
function downloadTripData() {
  let tripData = {
    tripName: tripName,
    totalDistance: totalDistanceCovered.toFixed(2) + " km",
    midpoint: midpoint,
    locations: locations,
  };
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tripData));
  let downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", tripName + "_trip_data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

// Event Listeners
document.getElementById("startButton").addEventListener("click", startTracking);
document.getElementById("stopButton").addEventListener("click", stopTracking);

// Initialize the Map and Get User Location
initMap();
getAccurateLocation();
