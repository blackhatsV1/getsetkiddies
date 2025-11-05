document.addEventListener('DOMContentLoaded', function() {
  // Object to store tracking intervals for each child
  const trackingIntervals = {};

  // Handle tracking buttons
  document.querySelectorAll('.track-btn').forEach(button => {
    button.addEventListener('click', function() {
      const childId = this.getAttribute('data-id');
      const childName = this.getAttribute('data-name');

      if (trackingIntervals[childId]) {
        // Stop tracking
        clearInterval(trackingIntervals[childId]);
        delete trackingIntervals[childId];
        this.textContent = 'Start Tracking';
        console.log(`Stopped tracking for ${childName}`);
      } else {
        // Start tracking
        startTracking(childId, childName, this);
      }
    });
  });

  function startTracking(childId, childName, button) {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    // Request permission and start tracking
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Initial location update
        updateLocation(childId, position.coords.latitude, position.coords.longitude);

        // Set up periodic updates every 15 minutes (900,000 ms)
        trackingIntervals[childId] = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              updateLocation(childId, position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              console.error('Error getting location:', error);
              // Stop tracking on error
              clearInterval(trackingIntervals[childId]);
              delete trackingIntervals[childId];
              button.textContent = 'Start Tracking';
              alert(`Failed to get location for ${childName}. Tracking stopped.`);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }, 900000); // 15 minutes

        button.textContent = 'Stop Tracking';
        console.log(`Started tracking for ${childName}`);
      },
      (error) => {
        console.error('Error getting initial location:', error);
        alert(`Failed to get initial location for ${childName}. Please allow location access.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function updateLocation(childId, latitude, longitude) {
    // Use reverse geocoding to get readable address
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(response => response.json())
      .then(data => {
        const readableAddress = data.display_name || `Lat: ${latitude}, Lng: ${longitude}`;

        // Send location to server
        fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            child_id: childId,
            latitude: latitude,
            longitude: longitude,
            readable_address: readableAddress
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            console.log(`Location updated for child ${childId}: ${readableAddress}`);
          } else {
            console.error('Failed to update location:', data);
          }
        })
        .catch(error => {
          console.error('Error updating location:', error);
        });
      })
      .catch(error => {
        console.error('Error reverse geocoding:', error);
        // Fallback to coordinates only
        fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            child_id: childId,
            latitude: latitude,
            longitude: longitude,
            readable_address: `Lat: ${latitude}, Lng: ${longitude}`
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            console.log(`Location updated for child ${childId}: Lat: ${latitude}, Lng: ${longitude}`);
          } else {
            console.error('Failed to update location:', data);
          }
        })
        .catch(error => {
          console.error('Error updating location:', error);
        });
      });
  }
});
