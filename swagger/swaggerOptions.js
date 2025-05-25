const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Travelo API',
      version: '1.0.0',
      description: 'API documentation for Travelo',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: process.env.BASEURL || 'http://ec2-54-215-125-69.us-west-1.compute.amazonaws.com',
        description: 'Production server',
      },

      {
        url: process.env.LOCALURL||'http://localhost:3000',
        description: 'Local server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = swaggerDocs;
