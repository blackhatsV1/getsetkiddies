document.addEventListener("DOMContentLoaded", () => {
    function formatFullDateTime(dateString) {
        const optionsDate = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        const optionsTime = { hour: "numeric", minute: "2-digit", hour12: true };
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString("en-US", optionsDate);
        const formattedTime = date.toLocaleTimeString("en-US", optionsTime);
        return `${formattedDate} – ${formattedTime}`;
    }
  const trackButtons = document.querySelectorAll(".trackBtn");
  const mapDiv = document.getElementById("map");
  const addressEl = document.getElementById("address");
  const coordsEl = document.getElementById("coords");
  const lastSeenEl = document.getElementById("lastSeen");
  const scanBtn = document.getElementById("scanBtn");
  const table = document.getElementById("childrenTable");

  let map = L.map(mapDiv).setView([0, 0], 2);
  let marker;
  let activeChildId = null;
  let activeChildName = "";

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  document.querySelectorAll("tr[data-child-id]").forEach(async (row) => {
    const childId = row.getAttribute("data-child-id");
    const locationCell = row.querySelector(".last-location");

    try {
      const res = await fetch(`/api/locations/${childId}`);
      const data = await res.json();
      if (data.message === "no records yet") {
        locationCell.textContent = "No records yet";
      } else {
        locationCell.textContent = data.readable_address || "Unknown";
      }
    } catch {
      locationCell.textContent = "Error loading";
    }
  });



trackButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    scanBtn.style.display = "none";
    activeChildId = btn.getAttribute("data-child-id");
    activeChildName = btn.getAttribute("data-child-name");

    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
    if (window.pathLine) {
      map.removeLayer(window.pathLine);
      window.pathLine = null;
    }
    if (window.historyMarkers) {
      window.historyMarkers.forEach(m => map.removeLayer(m));
    }
    window.historyMarkers = [];

    const historyRes = await fetch(`/api/locations/history/${activeChildId}`);
    const historyData = await historyRes.json();

    if (historyData.message === "no records yet") {
      map.setView([0, 0], 2);
      addressEl.innerHTML = `<b>No records yet for ${activeChildName}.</b>`;
      coordsEl.textContent = "";
      lastSeenEl.textContent = "";
      scanBtn.style.display = "inline-block";
      return;
    }

    const coordsArray = [];
    const totalPoints = historyData.length;

    historyData.forEach((loc, index) => {
      const { latitude, longitude, readable_address, date_time } = loc;
      coordsArray.push([latitude, longitude]);

      const formattedTime = date_time
        ? formatFullDateTime(date_time)
        : "Unknown time";

      const isLast = index === totalPoints - 1;
      const markerColor = isLast ? "red" : "gray";
      const markerRadius = isLast ? 10 : 5;

    const pastMarker = L.marker([latitude, longitude], {
    icon: L.icon({
        iconUrl: isLast
        ? "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png"  // last = red
        : "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png", // older = blue
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
    })
    }).addTo(map);


      pastMarker.bindPopup(`
        <b>${activeChildName}</b><br>
        ${readable_address}<br>
        ${formatFullDateTime(date_time)}
      `);

      window.historyMarkers.push(pastMarker);
    });

    window.pathLine = L.polyline(coordsArray, {
      color: "blue",
      weight: 3,
      opacity: 0.7
    }).addTo(map);

    map.fitBounds(window.pathLine.getBounds(), { padding: [30, 30] });

    const lastLocation = historyData[totalPoints - 1];
    const { latitude, longitude, readable_address, date_time } = lastLocation;

    addressEl.innerHTML = `<p>Last known location of <b>${activeChildName}</b> is at <b><i>${readable_address}.</i></b></p>`;
    coordsEl.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;
    lastSeenEl.innerHTML = `Last seen on <b>${formatFullDateTime(date_time)}</b>.<br><br>Please click the button for a recent update of the location.`;

    scanBtn.style.display = "inline-block";
  });
});


scanBtn.addEventListener("click", async () => {
  if (!activeChildId) return alert("Please select a child first.");
  if (!navigator.geolocation) return alert("Geolocation not supported.");

  const originalText = scanBtn.innerHTML;
  scanBtn.innerHTML = `<span class="loading-spinner"></span> Scanning location...`;
  scanBtn.disabled = true;

  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    let readable_address = "";
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      readable_address = data.display_name || "Unknown location";
    } catch {
      readable_address = "Address not found";
    }

    const now = new Date();
    const formattedNow = formatFullDateTime(now);

    marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
      }),
    })
      .addTo(map)
      .bindPopup(`
        Child Name: <b>${activeChildName}</b><br>
        ${readable_address}<br>
        <i>${formattedNow}</i>
      `)
      .openPopup();

    map.setView([lat, lng], 15);

    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: activeChildId,
          latitude: lat,
          longitude: lng,
          readable_address,
        }),
      });
      const result = await res.json();

      addressEl.innerHTML = `<b>Current location of ${activeChildName}:</b> ${readable_address}`;
      coordsEl.textContent = `Lat: ${lat}, Lng: ${lng}`;
      lastSeenEl.innerHTML = `Last updated on <b>${formattedNow}</b>.`;
      const row = table.querySelector(`tr[data-child-id="${activeChildId}"]`);
      if (row) row.querySelector(".last-location").textContent = readable_address;

      alert("Child's location acquired successfully.");
    } catch (err) {
      console.error(err);
      alert("Error saving location.");
    }

    scanBtn.innerHTML = originalText;
    scanBtn.disabled = false;
  });
});

});
