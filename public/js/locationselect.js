document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map
  const map = L.map('map').setView([0, 0], 2);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Function to save location to backend
  function saveLocationToDB(name, latitude, longitude) {
    fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, latitude, longitude })
    })
      .then(res => res.json())
      .then(data => console.log('✅ Saved to database:', data))
      .catch(err => console.error('❌ Error saving location:', err));
  }

  // Detect user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Center map
        map.setView([latitude, longitude], 15);

        // Add marker
        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup('📍 You are here').openPopup();

        console.log(`Current Location: ${latitude}, ${longitude}`);

        // Save to database (you can customize the name)
        saveLocationToDB('Current User', latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location.');
      }
    );
  } else {
    alert('Geolocation is not supported by this browser.');
  }
});
