document.addEventListener('DOMContentLoaded', function() {
    let map;
    let userMarker;
    let radiusCircle;
    let radiusSize = 1000; // Default radius size in meters
    let editControl;

    // Function to initialize the map
    function initMap(lat, lng) {
        map = L.map('map').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Function to update user's location
    function updateUserLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                let lat = position.coords.latitude;
                let lng = position.coords.longitude;
                map.setView([lat, lng], 13);

                // Remove existing marker, circle, and edit control if they exist
                if (userMarker) map.removeLayer(userMarker);
                if (radiusCircle) map.removeLayer(radiusCircle);
                if (editControl) map.removeControl(editControl);

                // Add a red pin for user's location
                userMarker = L.marker([lat, lng], {icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })}).addTo(map);

                // Add a circle around the user's location
                radiusCircle = L.circle([lat, lng], {
                    color: 'pink',
                    fillColor: 'pink',
                    fillOpacity: 0.2,
                    radius: radiusSize
                }).addTo(map);

                // Make the circle editable
                makeCircleEditable(radiusCircle);

                // Add popup to marker with radius display
                updateMarkerPopup();
            }, function(error) {
                console.error("Error getting location:", error);
                alert("Couldn't get your location.");
            });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    }

    // Function to make circle editable
    function makeCircleEditable(circle) {
        let editableLayers = new L.FeatureGroup([circle]);
        map.addLayer(editableLayers);

        editControl = new L.Control.Draw({
            draw: false,
            edit: {
                featureGroup: editableLayers,
                remove: false
            }
        });
        map.addControl(editControl);

        map.on('draw:edited', function (e) {
            let layers = e.layers;
            layers.eachLayer(function (layer) {
                if (layer instanceof L.Circle) {
                    radiusSize = Math.round(layer.getRadius());
                    console.log("Size is " + radiusSize);
                    updateMarkerPopup();
                }
            });
        });
    }

    // Function to update marker popup
    function updateMarkerPopup() {
        if (userMarker) {
            userMarker.bindPopup(createPopupContent()).openPopup();
            if (userMarker.getPopup().isOpen()) {
                userMarker.getPopup().update();
            }
        }
    }

    // Function to create popup content
    function createPopupContent() {
        let container = L.DomUtil.create('div');
        container.innerHTML = `
            <p>Radius: <span id="radius-display">${radiusSize}</span> meters</p>
            <button id="send-to-llm">Send to LLM</button>
        `;

        L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);

        setTimeout(() => {
            document.getElementById('send-to-llm').addEventListener('click', sendToLLM);
        }, 0);

        return container;
    }

    // Function to send data to LLM
    function sendToLLM() {
        if (userMarker && radiusCircle) {
            let data = {
                lat: userMarker.getLatLng().lat,
                lng: userMarker.getLatLng().lng,
                radius: radiusSize
            };
            console.log("Sending to LLM:", data);
            // Here you would typically send this data to your backend
            // which would then forward it to the LLM
            fetch('/send-to-llm', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    console.log("LLM response:", result);
                    alert("Data sent to LLM successfully!");
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert("Failed to send data to LLM. Check console for details.");
                });
        } else {
            alert("Please set your location first.");
        }
    }

    // Function to add center button
    function addCenterButton() {
        let centerButton = L.control({position: 'topleft'});
        centerButton.onAdd = function(map) {
            let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = '📍';
            div.style.fontSize = '20px';
            div.style.width = '30px';
            div.style.height = '30px';
            div.style.lineHeight = '30px';
            div.style.textAlign = 'center';
            L.DomEvent.on(div, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                updateUserLocation();
            });
            return div;
        };
        centerButton.addTo(map);
    }

    // Initialize map with user's location
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let lat = position.coords.latitude;
            let lng = position.coords.longitude;
            initMap(lat, lng);
            addCenterButton();
            updateUserLocation();
            initializeMapFeatures();
        }, function(error) {
            console.error("Error getting location:", error);
            alert("Couldn't get your location. Using default location.");
            initMap(51.505, -0.09);  // Default to London if geolocation fails
            addCenterButton();
            initializeMapFeatures();
        });
    } else {
        alert("Geolocation is not supported by your browser. Using default location.");
        initMap(51.505, -0.09);  // Default to London if geolocation is not supported
        addCenterButton();
        initializeMapFeatures();
    }

   // Function to initialize other map features
    function initializeMapFeatures() {
        // Function to add a POI
        function addPOI(e) {
            let latlng = e.latlng;
            let description = prompt("Enter POI description:");
            if (description) {
                fetch('/add_poi', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({lat: latlng.lat, lng: latlng.lng, description: description})
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === "success") {
                            L.marker(latlng).addTo(map).bindPopup(description);
                            alert("POI added successfully!");
                        } else {
                            alert("Failed to add POI. Please try again.");
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert("An error occurred. Please try again.");
                    });
            }
        }

        // Add click event to map for adding POIs
        map.on('click', addPOI);

        // Function to perform search
        async function performSearch() {
            let lat = 0
            let lng = 0
            try {
                const position = await getCurrentPosition();
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log('Latitude:', latitude);
                console.log('Longitude:', longitude);
                // You can now use latitude and longitude in your code
                lat = latitude
                lng = longitude
            } catch (error) {
                console.error('Error:', error);
            }

            let query = document.getElementById('search-input').value;

            if (query) {
                fetch('/search', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({query: query, lat: lat, lng: lng, radius: radiusSize})
                })
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('results-container').innerHTML = data.result;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        document.getElementById('results-container').innerHTML = "An error occurred during search. Please try again.";
                    });
            } else {
                alert("Please enter a search query.");
            }
        }

        // Add click event to search button
        document.getElementById('search-button').addEventListener('click', performSearch);

        // Add enter key event to search input
        document.getElementById('search-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Function to load and display all POIs
        function loadPOIs() {
            fetch('/get_pois')
                .then(response => response.json())
                .then(pois => {
                    pois.forEach(poi => {
                        L.marker([poi.lat, poi.lng]).addTo(map)
                            .bindPopup(poi.description);
                    });
                })
                .catch(error => {
                    console.error('Error loading POIs:', error);
                });
        }

        // Load POIs when the page loads
        loadPOIs();

        console.log('Map initialized');
    }

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => resolve(position),
                    error => reject(error)
                );
            } else {
                reject(new Error("Geolocation is not supported by this browser."));
            }
        });
    }

});