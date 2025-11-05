document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map
  const map = L.map('map').setView([0, 0], 2);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Check if child location data is available (passed from server)
  const childLocation = window.childLocation;
  const selectedChild = window.selectedChild;

  if (selectedChild && childLocation) {
    const { latitude, longitude, readable_address } = childLocation;

    // Center map on child's location
    map.setView([latitude, longitude], 15);

    // Add marker
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindPopup(`📍 ${selectedChild.firstname} ${selectedChild.lastname} is here`).openPopup();

    console.log(`Child Location: ${latitude}, ${longitude}`);
  } else {
    // Default view if no child selected or no location
    map.setView([0, 0], 2);
    console.log('No child selected or no location data available.');
  }
});
