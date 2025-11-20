const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger/swaggerOptions');
require('dotenv').config();

// Validate required environment variables
if (!process.env.SECRETKEY) {
  console.error('❌ Error: SECRETKEY is not defined in environment variables.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const routes = require('./routes');

// ====================
// 🔧 Middleware Setup
// ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static pages
app.use(express.static('public'));

// About page route
app.get('/about-been-around', (req, res) => {
  res.sendFile(__dirname + '/public/about-been-around.html');
});

// ====================
// 📘 Swagger Docs
// ====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ====================
// 🛣️ Main API Routes
// ====================
app.use('/api', routes);

// ====================
// 🏥 Health Check
// ====================
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Been There Backend API is running successfully 🚀',
  });
});

// ====================
// 🚀 Start Server
// ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
});
