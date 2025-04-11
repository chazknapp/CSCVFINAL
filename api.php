<?php
// This header tells the browser that the response coming from this PHP script
// is in JSON format. That way, the browser (and your JavaScript code) will interpret
// the response as a JavaScript object or array rather than plain text.
header('Content-Type: application/json');


// Begin a try block so we can catch any connection errors.
// We're using PHP's PDO (PHP Data Objects) to connect to the MySQL database.
// Here, we are connecting to a MySQL database named "test" on the localhost,
// using the default MAMP credentials — username "root" and password "root".
try {
    $pdo = new PDO("mysql:host=localhost;dbname=test", "root", "root");

    // This line ensures that if any SQL error occurs (like bad syntax or missing fields),
    // PHP will throw an exception instead of failing silently.
    // This is critical for debugging and safe error handling.
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} 
// If the connection fails, we "catch" the PDOException and return a JSON error message.
// This prevents the page from crashing and instead gives your frontend useful info.
// The `exit` call ensures that no further code is executed after the failure.
catch (PDOException $e) {
    echo json_encode([
        "error" => "DB connection failed", // Friendly message to show in frontend
        "message" => $e->getMessage()      // Actual error details (useful for debugging)
    ]);
    exit;
}


// If the `$input` variable is empty or null, that means no valid JSON was received.
// This check helps prevent errors when trying to use undefined input values later.
// If this happens, we return an error as JSON and stop the script with `exit`.
if (!$input) {
    echo json_encode(["error" => "No valid input received."]);
    exit;
}


// Next, we extract the expected search parameters from the `$input` array.
// These parameters were originally entered by the user on the frontend.
// We use the null coalescing operator (`??`) to provide default values if the fields are missing.

// These four values define the rectangular geographic area we’re searching within.
$minLat     = $input['minLat'] ?? null;
$maxLat     = $input['maxLat'] ?? null;
$minLng     = $input['minLng'] ?? null;
$maxLng     = $input['maxLng'] ?? null;

// This is the type of geocache (e.g., Traditional, Puzzle, Multi), if the user selected one.
$cacheType  = $input['type'] ?? "";

// This is the difficulty rating (e.g., 1, 2, 3) chosen by the user, if any.
$difficulty = $input['difficulty'] ?? "";


// We begin by writing the SQL query as a string.
// This query retrieves all columns from the `test_data` table and joins it with the `cache_types` table.
// We're using an alias (`td` for test_data and `ct` for cache_types) to simplify the syntax.
// We also rename `ct.cache_type` to `cache_type` so the frontend can easily use this field.
$query = "SELECT td.*, ct.cache_type AS cache_type
          FROM test_data td
          JOIN cache_types ct ON td.cache_type_id = ct.type_id
          WHERE td.latitude BETWEEN :minLat AND :maxLat
            AND td.longitude BETWEEN :minLng AND :maxLng";


// If the user specified a particular cache type (i.e., the dropdown was not left blank),
// then we add another filter to the query to only include that cache type.
// The placeholder `:cacheType` will be filled in securely later.
if ($cacheType !== "") {
    $query .= " AND td.cache_type_id = :cacheType";
}

// Similarly, if the user selected a difficulty rating,
// we add a filter to only return geocaches with that rating.
// Again, `:difficulty` will be safely inserted using PDO binding.
if ($difficulty !== "") {
    $query .= " AND td.difficulty_rating = :difficulty";
}


// We now prepare the query and safely bind values to prevent SQL injection.
try {
    // Prepare the SQL statement so it can be executed.
    // This step also protects against SQL injection attacks by separating data from SQL code.
    $stmt = $pdo->prepare($query);

    // Bind the latitude and longitude boundaries from the user's search to their corresponding placeholders.
    $stmt->bindValue(':minLat', $minLat);
    $stmt->bindValue(':maxLat', $maxLat);
    $stmt->bindValue(':minLng', $minLng);
    $stmt->bindValue(':maxLng', $maxLng);

    // If the cache type was set, bind that value as well.
    if ($cacheType !== "") $stmt->bindValue(':cacheType', $cacheType);

    // If the difficulty value was provided, bind it to the query.
    if ($difficulty !== "") $stmt->bindValue(':difficulty', $difficulty);

    // Now we execute the final, bound query.
    // This sends the SQL command to the MySQL database and waits for a response.
    $stmt->execute();

    // Fetch all the resulting rows as an associative array.
    // Each row represents a geocache that matched the user’s filters.
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert the PHP array into a JSON string and send it back to the frontend.
    // The frontend JavaScript will use this data to display markers and table rows.
    echo json_encode($results);
}

?>
