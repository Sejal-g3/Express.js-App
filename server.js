var express = require("express");
var morgan = require("morgan");
var path = require("path");
var fs = require("fs");

var app = express();

app.use(morgan("short"));

var staticPath = path.join(__dirname, "../Vue.js-App/images");
app.use(express.static(staticPath));

app.use(function(req, res) {
    res.status(404);
    res.send("File not found!");
});   

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});