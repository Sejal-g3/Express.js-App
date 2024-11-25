var express = require("express");
let app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.set('json spaces', 3);

const path = require('path');

let PropertiesReader = require("properties-reader");

var morgan = require("morgan");

// Middleware 1: Log all incoming requests and their URLs
app.use(morgan("short"));;

// Middleware 2: Serve static files based on request URL
var staticPath = path.join(__dirname, "../Vue.js-App/images");
app.use(express.static(staticPath));

// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1;//declare variable

async function connectDB() {
    try {
        client.connect();
        console.log('Connected to MongoDB');
        db1 = client.db('AfterSchoolClasses');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

connectDB(); //call the connectDB function to connect to MongoDB database

app.param('collectionName', async function(req, res, next, collectionName) { 
    req.collection = db1.collection(collectionName);
    /*Check the collection name for debugging if error */
    console.log('Middleware set collection:', req.collection.collectionName);
    next();
});

// Get all data from our collection in Mongodb
app.get('/collections/:collectionName', async function(req, res, next) {
    try{
        const results = await req.collection.find({}).toArray();
        console.log('Retrieved data:', results);
        res.json(results);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// Get specific data
app.get('/collections1/:collectionName', async function(req, res, next) {
    try{
        const results = await req.collection.find({}, {limit:3, sort: {price:-1}}).toArray(); //find and option, 3 products and price is in descending order
        console.log('Retrieved data:', results);
        res.json(results);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// Get the sorted data
app.get('/collections/:collectionName/:max/:sortAspect/:sortAscDesc', async function(req, res, next){
    try{
        // Validate params
        var max = parseInt(req.params.max, 10); // base 10
        let sortDirection = 1;
        if (req.params.sortAscDesc === "desc") {
            sortDirection = -1;
        }

        const results = await req.collection.find({}, {limit:max, sort: {[req.params.sortAspect]: sortDirection}}).toArray();
        console.log('Retrieved data:', results);
        res.json(results);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// Get lesson by id
app.get('/collections/:collectionName/:id' , async function(req, res, next) {
    try{
        const results = await req.collection.findOne({_id:new ObjectId(req.params.id)});
        console.log('Retrieved data:', results);
        res.json(results);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// Add new lesson
app.post('/collections/:collectionName', async function(req, res, next) {
    try{
        console.log('Received Request: ', req.body);
        const results = await req.collection.insertOne(req.body);
        console.log('Inserted document:', results);
        res.json(results);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }  
});

// Delete a lesson
app.delete('/collections/:collectionName/:id', async function(req, res, next) {
    try{
        console.log('Received Request: ', req.params.id);
        const results = await req.collection.deleteOne({_id:new ObjectId(req.params.id)});
        console.log('Deleted data:', results);
        res.json((results.deletedCount === 1) ? {msg:"success"}:{msg:"error"});
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// Update a lesson
app.put('/collections/:collectionName/:id', async function(req, res, next) {
    try{
        console.log('Received Request: ', req.params.id);
        const results = await req.collection.updateOne({_id:new ObjectId(req.params.id)},
            {$set:req.body}
        );
        console.log('Updated data:', results);
        res.json((results.matchedCount === 1) ? {msg:"success"}:{msg:"error"});
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// To handle search
app.get('/search', async function(req, res, next) {
    try{
        const searchTerm = req.query.q?.toLowerCase() || '';

        const filteredLessons = await req.collection.find({
            // Case-insensitive search
            $or: [
                { subject: { $regex: searchTerm, $options: 'i' } },
                { location: { $regex: searchTerm, $options: 'i' } },
                { price: { $regex: searchTerm, $options: 'i' } },
                { availability: { $regex: searchTerm, $options: 'i' } },
            ]
        }).toArray;
        res.json(filteredLessons);
    }
    catch(err){
        console.error('Error fetching docs', err.message);
        next(err);
    }
});

// To handle the order creation
app.post('/orders', async function(req, res, next) {
    try {
        const orderDetails = req.body;  // Get the order data sent from the frontend

        // Insert the order data into MongoDB's 'orders' collection
        const result = await db1.collection('orders').insertOne(orderDetails);

        // Check if the insertion was successful
        if (result.acknowledged) {
            console.log('Order saved:', result.insertedId);
            res.status(201).json({ message: 'Order placed successfully!', orderId: result.insertedId });
        } else {
            throw new Error('Failed to save order');
        }
    } catch (err) {
        console.error('Error saving order:', err);
        res.status(500).json({ error: 'Unable to place the order. Please try again.' });
    }
});

// Update lesson spaces (availability)
app.put('/collections/lessons/:id', async function(req, res, next) {
    try {
        const lessonId = req.params.id;  // Get the lesson ID from the URL
        const updatedSpaces = req.body.spaces;  // Get the new spaces value from the request body

        // Ensure the spaces value is provided and is a number
        if (typeof updatedSpaces !== 'number') {
            return res.status(400).json({ error: 'Invalid spaces value. Must be a number.' });
        }

        // Find the lesson by its ID and update the spaces field
        const result = await req.collection.updateOne(
            { _id: new ObjectId(lessonId) }, // Find the lesson by ID
            { $set: { spaces: updatedSpaces } } // Update the spaces field
        );

        // Check if a document was updated
        if (result.matchedCount === 1) {
            console.log(`Lesson spaces updated for ID: ${lessonId}`);
            res.json({ message: 'Lesson spaces updated successfully!' });
        } else {
            res.status(404).json({ error: 'Lesson not found' });
        }
    } catch (err) {
        console.error('Error updating lesson spaces:', err);
        res.status(500).json({ error: 'Failed to update lesson spaces' });
    }
});

app.get("/", (req, res) => {
    res.send("Welcome to our homepage!");
});

// Middleware to display error if something went wrong
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/collections/lessons`);
});