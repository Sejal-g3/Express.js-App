var express = require("express");
var morgan = require("morgan");
var path = require("path");
var fs = require("fs");

var app = express();

// Middleware 1: Log all incoming requests and their URLs
app.use(morgan("short"));;

// Middleware 2: Serve static files based on request URL
var staticPath = path.join(__dirname, "../Vue.js-App/images");
app.use(express.static(staticPath));

// Middleware 3: Handle 404 errors for unspecified files
app.use(function(req, res) {
    res.status(404);
    res.send("File not found!");
});  

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});