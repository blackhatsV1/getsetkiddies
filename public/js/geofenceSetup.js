document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([0, 0], 2);
  let circle, marker;
  let activeChildId = null;
  let activeChildName = "";

  //Tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  const geoNameInput = document.getElementById("geoName");
  const radiusInput = document.getElementById("radius");
  const saveBtn = document.getElementById("saveGeofence");
  const infoEl = document.getElementById("geoInfo");

  /* ------------------------------------
     Convert coordinates to address
  ------------------------------------ */
  async function getReadableAddress(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || "Address not found";
    } catch (err) {
      console.error("Error fetching address:", err);
      return "Unknown location";
    }
  }

  /* ------------------------------------
     Load readable addresses
  ------------------------------------ */
  async function loadAddresses() {
    const rows = document.querySelectorAll("#childrenTable tr[data-child-id]");
    for (const row of rows) {
      const lat = parseFloat(row.dataset.lat);
      const lng = parseFloat(row.dataset.lng);
      const cell = row.querySelector(".location-cell");

      if (!isNaN(lat) && !isNaN(lng)) {
        const address = await getReadableAddress(lat, lng);
        cell.textContent = address;
      }
    }
  }
  loadAddresses();

  /* ------------------------------------
     Set Geofence Button Logic
  ------------------------------------ */
  document.querySelectorAll(".setGeoBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeChildId = btn.dataset.childId;
      activeChildName = btn.dataset.childName;

      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);

      // Clear old markers
      if (marker) map.removeLayer(marker);
      if (circle) map.removeLayer(circle);

      // Center the map to last known location if available
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
        marker = L.marker([lat, lng]).addTo(map);
        infoEl.innerHTML = `
          <b>Setting geofence for ${activeChildName}</b><br>
          Last known location: ${lat.toFixed(5)}, ${lng.toFixed(5)}.
          <br><h2>Click the map to adjust center.</h2>
        `;
      } else {
        map.setView([10.3157, 123.8854], 13);
        infoEl.innerHTML = `<b>Setting geofence for ${activeChildName}</b><br><h3>No last known location — click on the map to choose center.</h3>`;
      }

      saveBtn.disabled = true;
    });
  });

  /* ------------------------------------
     Map click handler
  ------------------------------------ */
  map.on("click", (e) => {
    if (!activeChildId) {
      alert("Please select a child first.");
      return;
    }

    const { lat, lng } = e.latlng;
    const radius = parseInt(radiusInput.value) || 100;

    if (marker) map.removeLayer(marker);
    if (circle) map.removeLayer(circle);

    marker = L.marker([lat, lng]).addTo(map);
    circle = L.circle([lat, lng], {
      radius,
      color: "blue",
      fillColor: "#3f8efc",
      fillOpacity: 0.3,
    }).addTo(map);

    saveBtn.disabled = false;
    infoEl.innerHTML = `
      <b>Geofence Center:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
      <b>Radius:</b> ${radius} meters<br>
      <b>Child:</b> ${activeChildName}
    `;
  });

  /* ------------------------------------
     Save geofence
  ------------------------------------ */
  saveBtn.addEventListener("click", async () => {
    if (!activeChildId || !marker) {
      alert("Please set a geofence first.");
      return;
    }

    const name = geoNameInput.value.trim() || "Unnamed Zone";
    const radius = parseInt(radiusInput.value) || 100;
    const { lat, lng } = marker.getLatLng();

    try {
      const res = await fetch("/api/geofence/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: activeChildId,
          name,
          latitude: lat,
          longitude: lng,
          radius,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Geofence '${name}' saved for ${activeChildName}`);
      } else {
        alert(result.error || "Failed to save geofence");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving geofence");
    }
  });
});
