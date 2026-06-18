const express = require('express');
const cors = require('cors');
const path = require('path');
const sessionMiddleware = require('./src/config/session');
const errorMiddleware = require('./src/middlewares/error.middleware');
const auditoriaMiddleware = require('./src/middlewares/auditoria.middleware');
const mainRouter = require('./src/routes');

const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Parsers for POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session Middleware
app.use(sessionMiddleware);

// Static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploads local folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View Engine routing (serving HTML views dynamically)
// We will route pages from the routes index.js file

// Middleware Global de Auditoria (intercepta todas as escritas de API)
app.use(auditoriaMiddleware);

// Register all routes
app.use(mainRouter);

// Global Error Handler Middleware
app.use(errorMiddleware);

module.exports = app;
