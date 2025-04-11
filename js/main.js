// Declare a variable named `map` that will hold the Google Map object.
// This object is created and initialized inside the `initMap()` function.
let map;

// Create an empty array named `markers` to store all the marker objects that are placed on the map.
// When new search results are shown, this array will be used to remove the previous markers.
let markers = [];

// Declare a variable called `infoWindow` that will store a reusable popup window.
// This window is used to display information when a user clicks on a marker on the map.
let infoWindow;


// Define a function named `initMap`. This is the function that sets up and displays the Google Map
// when the webpage first loads. It also connects the "Search" button to the function that performs filtering.
function initMap() {
  // Create a constant named `defaultCenter` that stores the initial location where the map should be centered.
  // This location is represented by latitude and longitude coordinates. In this case, it's Tucson, AZ.
  const defaultCenter = { lat: 32.253, lng: -110.912 };

  // Create a new Google Map object using the `google.maps.Map()` constructor.
  // The map will be displayed inside the HTML element with the ID `map`.
  // The map will be centered at the `defaultCenter` and initially zoomed out to level 8.
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter, // Set the center of the map to the default coordinates.
    zoom: 8                // Set the zoom level to 8, which shows a regional view.
  });

  // Initialize the `infoWindow` variable by creating a new InfoWindow object.
  // This InfoWindow is used to show details like cache type, difficulty, and photos when a marker is clicked.
  infoWindow = new google.maps.InfoWindow();

  // Add an event listener to the "Search" button on the page.
  // When the user clicks this button, it will call the `filterGeocaches()` function.
  // This allows the user to search for geocaches based on their input.
  document.getElementById("searchBtn").addEventListener("click", filterGeocaches);
}


function filterGeocaches() {
  // First, get the latitude that the user entered in the input box with the ID "lat".
  // If the user leaves the input empty or types something invalid, default to 32.253 (Tucson, AZ).
  const lat = parseFloat(document.getElementById("lat").value) || 32.253;

  // Next, get the longitude value from the input box with the ID "lng".
  // Again, if no valid number is entered, we default to -110.912.
  const lng = parseFloat(document.getElementById("lng").value) || -110.912;

  // Get the distance from the input labeled "distance". This is in miles.
  // If the user does not provide a distance, default to 10 miles.
  const distanceMiles = parseFloat(document.getElementById("distance").value) || 10;

  // Read the selected cache type from the dropdown menu.
  // This value corresponds to a number (e.g., 1 = Traditional).
  const cacheType = document.getElementById("cacheType").value;

  // Read the selected difficulty value from the dropdown menu.
  // This is typically 1, 2, or 3 depending on user preference.
  const difficulty = document.getElementById("difficulty").value;

  // Convert the distance from miles to meters because Google Maps expects meters for radius-based calculations.
  const radius = distanceMiles * 1609;

  // Create a position object using the latitude and longitude values.
  // This represents the central point from which the search area will be defined.
  const position = { lat: lat, lng: lng };

  // Recenter the map view so that it zooms in on the user-specified location.
  // This helps the user visually confirm that the search is happening in the right area.
  map.panTo(new google.maps.LatLng(lat, lng));

  // Set the zoom level on the map to 7 to give a more detailed regional view.
  // This value can be adjusted depending on how zoomed in you want to be by default.
  map.setZoom(7);

  // Create an invisible circle using the center and radius.
  // We use this object not to draw a circle on the map, but to compute the bounding box of the area.
  const circle = new google.maps.Circle({ center: position, radius: radius });

  // Get the geographical bounds of the circle.
  // These bounds help define the northern, southern, eastern, and western edges of the search area.
  const bounds = circle.getBounds();

  // Extract the minimum latitude from the southwest corner of the bounding box.
  const minLat = bounds.getSouthWest().lat();

  // Extract the maximum latitude from the northeast corner of the bounding box.
  const maxLat = bounds.getNorthEast().lat();

  // Similarly, get the minimum and maximum longitude values from the bounds.
  const minLng = bounds.getSouthWest().lng();
  const maxLng = bounds.getNorthEast().lng();

  // Bundle all of the gathered parameters into a single object called `params`.
  // This object will be sent to the backend to query the database for geocaches that match the criteria.
  const params = {
    minLat, maxLat, minLng, maxLng,
    type: cacheType,
    difficulty: difficulty
  };

  // Print the parameters to the browser's console for debugging purposes.
  // This is useful for checking what values are being sent to the backend.
  console.log("Sending params to API:", params);



  // Send a POST request to the backend file named api.php.
// This is where we send our user's input (like location, cache type, and difficulty)
// so the PHP script can query the MySQL database and return the matching geocache results.
fetch("api.php", {
  method: "POST", // We are using the POST method to send data in the request body.

  // Specify that we're sending JSON data so the server knows how to parse it.
  headers: { "Content-Type": "application/json" },

  // Convert the `params` object into a JSON string before sending it to the server.
  // This is necessary because the body of a fetch request must be a string, not a raw object.
  body: JSON.stringify(params)
})
// Once the server responds, we wait for the response to be converted into JSON format.
// This means we’re interpreting the response text as a JavaScript object or array.
.then(res => res.json())

// After the data is successfully received and converted to JSON,
// we pass that data into the `displayGeocaches` function.
// This function will then take care of displaying the geocaches on the map and in the table.
.then(data => {
  console.log("Response from API:", data); // Log the data to the console to verify it looks correct.
  displayGeocaches(data); // Use the data to display markers and table rows.
})

// If anything goes wrong during the fetch (like the server is unreachable or returns bad data),
// this `catch` block will handle the error.
// It prints an error message in the console to help you debug what went wrong.
.catch(err => console.error("Error fetching geocache data:", err));
}

function displayGeocaches(geocaches) {
  // First, check if the response from the backend is actually an array.
  // If it is not an array, something likely went wrong with the server or the response format,
  // so we log the incorrect result and show an alert to notify the user.
  if (!Array.isArray(geocaches)) {
    console.error("Expected array, but got:", geocaches);
    alert("Something went wrong. Please check the server response.");
    return; // Exit the function early so no further code runs on invalid data.
  }

  // Remove any existing markers currently displayed on the map.
  // We loop through the markers array and use `setMap(null)` to remove each one from the map.
  markers.forEach(marker => marker.setMap(null));

  // Reset the markers array so it is empty and ready to store new markers from the latest search.
  markers = [];

  // Find the `<tbody>` inside the results table where we will insert new rows.
  const tableBody = document.querySelector("#results-table tbody");

  // Clear any previous content from the table body so we can populate it with fresh search results.
  tableBody.innerHTML = "";

  // Loop through each geocache object returned from the backend.
  geocaches.forEach(cache => {
    // Convert the latitude and longitude values from strings to numbers
    // and use them to create a position object for placing a marker on the map.
    const position = {
      lat: parseFloat(cache.latitude),
      lng: parseFloat(cache.longitude)
    };

    // Create a new marker on the Google Map at the position of the current geocache.
    // The marker's title includes the cache type and its difficulty rating.
    const marker = new google.maps.Marker({
      map: map,
      position: position,
      title: `${cache.cache_type}, Difficulty: ${cache.difficulty_rating}`
    });

    // When the marker is clicked, open an InfoWindow showing the geocache details and Flickr photos.
    marker.addListener("click", () => openInfoWindow(marker, cache));

    // Add this new marker to the global `markers` array so we can clear it later if needed.
    markers.push(marker);

    // Create a new row for the results table using the HTML <tr> element.
    const row = document.createElement("tr");

    // Insert the cache's type, difficulty rating, and coordinates into the row using template literals.
    row.innerHTML = `
      <td>${cache.cache_type}</td>
      <td>${cache.difficulty_rating}</td>
      <td>${cache.latitude}, ${cache.longitude}</td>
    `;

    // Add a click event to this table row so that when the user clicks it,
    // the map pans (moves) to the geocache's location and the InfoWindow opens.
    row.addEventListener("click", () => {
      map.panTo(position);
      openInfoWindow(marker, cache);
    });

    // Append this completed row to the table body so it appears in the visible list.
    tableBody.appendChild(row);
  });
}



function displayGeocaches(geocaches) {
  // First, we remove any markers that are currently on the map.
  // We loop through the existing markers array and use `setMap(null)` to remove each marker from the map view.
  markers.forEach(marker => marker.setMap(null));

  // After clearing them from the map, we reset the `markers` array so it’s empty and ready to store new markers.
  markers = [];

  // Next, we clear out any existing geocache rows in the results table.
  // We select the <tbody> section of the table and set its innerHTML to an empty string to wipe old data.
  const tableBody = document.querySelector("#results-table tbody");
  tableBody.innerHTML = "";

  // Now we loop through each geocache object in the array returned from the server.
  geocaches.forEach(cache => {
    // For each geocache, we create a `position` object using its latitude and longitude.
    // We use `parseFloat()` to ensure the values are in numeric format.
    const position = { lat: parseFloat(cache.latitude), lng: parseFloat(cache.longitude) };

    // Using the `position`, we create a new marker on the Google Map.
    // We also set the `title` property so that users can see a tooltip when they hover over the marker.
    const marker = new google.maps.Marker({
      map: map,
      position: position,
      title: `${cache.cache_type}, Difficulty: ${cache.difficulty_rating}`
    });

    // We attach a `click` event listener to the marker so that when it's clicked,
    // a function called `openInfoWindow` is triggered to show details about that geocache.
    marker.addListener("click", () => {
      openInfoWindow(marker, cache);
    });

    // After creating the marker, we add it to our global `markers` array.
    // This lets us manage all the markers (e.g., clearing them on the next search).
    markers.push(marker);

    // We also build a new table row (`<tr>`) to represent this geocache in the results list.
    const row = document.createElement("tr");

    // We populate the row with HTML that displays the geocache type, difficulty rating, and coordinates.
    row.innerHTML = `
      <td>${cache.cache_type}</td>
      <td>${cache.difficulty_rating}</td>
      <td>${cache.latitude}, ${cache.longitude}</td>
    `;

    // We add a `click` event to this row so that when it’s clicked,
    // the map will pan to the geocache’s location and open the InfoWindow, just like clicking the marker.
    row.addEventListener("click", () => {
      map.panTo(position);
      openInfoWindow(marker, cache);
    });

    // Finally, we add the completed row to the results table on the page.
    tableBody.appendChild(row);
  });
}


function openInfoWindow(marker, cache) {
  // First, we define the content that will appear inside the Google Maps InfoWindow popup.
  // This content includes the geocache type in bold, the difficulty rating,
  // the exact latitude and longitude, and a placeholder <div> where Flickr photos will be loaded.
  // We use template literals (the backticks and ${}) to dynamically insert data from the `cache` object.
  const content = `
    <div>
      <strong>${cache.cache_type}</strong><br>
      Difficulty: ${cache.difficulty_rating}<br>
      Location: ${cache.latitude}, ${cache.longitude}
      <div id="infoPhotos" style="margin-top:10px;"></div>
    </div>
  `;

  // We set the content of the global `infoWindow` object to the HTML block we just created.
  // This replaces any previous content that was shown in the popup.
  infoWindow.setContent(content);

  // Next, we open the `infoWindow` and attach it to the current marker.
  // This displays the content as a popup directly on the map at the marker’s location.
  infoWindow.open(map, marker);

  // Finally, we call the `loadFlickrPhotos()` function to fetch and display images from Flickr.
  // We pass in the latitude and longitude of the geocache, and the ID of the <div> where the images should be placed.
  // The Flickr photos will be loaded asynchronously and inserted once they are available.
  loadFlickrPhotos(cache.latitude, cache.longitude, "infoPhotos");
}


function loadFlickrPhotos(lat, lng, containerId) {
  // Store your personal Flickr API key in a variable called `flickrKey`.
  // This key is required to authenticate requests to Flickr’s API and must be kept private.
  const flickrKey = "3cc36b75775608e19b32c07a2d74fdb9"; // <-- Replace with your key!

  // Build the URL that will be used to request nearby photos from Flickr’s photo search API.
  // The API takes in the latitude and longitude to look for photos around a specific location.
  // The URL also includes parameters to:
  // - specify the number of results (`per_page=12`)
  // - return data in JSON format (`format=json`)
  // - and turn off the JSONP callback (`nojsoncallback=1`)
  const flickrURL = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${flickrKey}&lat=${lat}&lon=${lng}&format=json&nojsoncallback=1&per_page=12`;

  // Send a GET request to the Flickr API using the `fetch` function.
  // This will retrieve a list of public photos taken near the provided coordinates.
  fetch(flickrURL)
    .then(res => res.json()) // Convert the response into a usable JavaScript object.

    .then(data => {
      // Extract the array of photo objects from the response.
      // Each object contains metadata about one photo (like its ID, server, and secret).
      const photos = data.photos.photo;

      // Initialize a string to store the HTML for all photo thumbnails.
      let output = "";

      // Loop through each photo object in the array.
      photos.forEach(photo => {
        // Construct the image URL using Flickr’s naming rules:
        // `farm-id`, `server-id`, `photo-id`, and `secret` must all be used to access the thumbnail.
        // The `_t.jpg` extension at the end tells Flickr we want the small thumbnail version.
        const url = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`;

        // Add this image to the `output` string, wrapped in an <img> tag.
        // A little inline CSS is used to space the images out visually.
        output += `<img src="${url}" alt="Flickr photo" style="margin:2px;">`;
      });

      // After all the image tags are created, insert the result into the correct container on the page.
      // This container will be either inside the InfoWindow popup or another designated gallery area.
      document.getElementById(containerId).innerHTML = output;
    })

    // If anything goes wrong (like a network error or the API fails), catch the error here.
    // Log the error to the console and insert a fallback message in the gallery container.
    .catch(err => {
      console.error("Flickr error:", err);
      document.getElementById(containerId).innerHTML = "<p>Error loading photos.</p>";
    });
}


// This line waits for the full page content (DOM) to load before running the `initMap()` function.
// Without this, the script might try to access DOM elements (like #map) before they’re actually available.
document.addEventListener("DOMContentLoaded", initMap);
