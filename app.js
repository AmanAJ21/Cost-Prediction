const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for cross-origin requests
app.use(cors());

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection URI and database name from environment variables
const uri = process.env.MONGODB_URI; // MongoDB URI
const dbName = process.env.DB_NAME || 'bigdata'; // Database name

// Create a new MongoClient
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(dbName);
  } catch (err) {
    console.error('Could not connect to MongoDB', err);
    process.exit(1); // Exit the process if connection fails
  }
}

// Define routes
async function setupRoutes() {
  const database = await connectToDatabase();

  // Define collections
  const realDataCollection = database.collection('realdata');
  const testDataCollection = database.collection('testdata');

  // Route to get all real data
  app.get('/realdata', async (req, res) => {
    try {
      const data = await realDataCollection.find({}).toArray();
      res.json(data);
    } catch (err) {
      console.error('Error fetching real data:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  // Route to get all test data
  app.get('/testdata', async (req, res) => {
    try {
      const data = await testDataCollection.find({}).toArray();
      res.json(data);
    } catch (err) {
      console.error('Error fetching test data:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  app.post('/getDistance', async (req, res) => {
    const { origin, destination, mode } = req.body; // Get parameters from the request body

    // Check if all required parameters are provided
    if (!origin || !destination || !mode) {
      return res.status(400).json({ error: 'Please provide origin, destination, and mode.' });
    }

    const url = process.env.Distance; // Ensure this environment variable is set

    console.log(`Requesting distance from ${origin} to ${destination} with mode ${mode}`);

    try {
      const params = new URLSearchParams({
        origin: origin,
        destination: destination,
        mode: mode
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Assuming the API returns distance and duration in a specific format
      const jsonResponse = {
        origin: origin,
        destination: destination,
        mode: mode,
        distance: data.distance, // Adjust based on actual API response structure
        duration: data.duration, // Adjust based on actual API response structure
        status: "OK"
      };

      res.json(jsonResponse); // Send the structured JSON response back to the client
    } catch (error) {
      console.error('Error fetching distance:', error);
      res.status(500).json({ error: 'Failed to fetch distance' });
    }
  });

  // Serve the main HTML file
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Serve other HTML files
  app.get('/distance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'distance.html'));
  });

  app.get('/cost', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cost.html'));
  });

  app.get('/rcost', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rcost.html'));
  });

  // Centralized error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(500).send('Internal Server Error');
  });
}

// Start the server
setupRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error setting up routes:', err);
});
