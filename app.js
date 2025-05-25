const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger/swaggerOptions');
require('dotenv').config();
const cors = require('cors'); // Add this line

if (!process.env.SECRETKEY) {
  console.error('Error: SECRETKEY is not defined in the environment variables.');
  process.exit(1); // Exit the application if SECRETKEY is missing
}

const app = express();
const PORT = process.env.PORT || 3000;

const routes = require('./routes');

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Use routes
app.use( routes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to Travelo API');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
