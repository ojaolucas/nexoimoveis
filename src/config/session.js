const session = require('express-session');
require('dotenv').config();

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'nexomoveis_default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
});

module.exports = sessionMiddleware;
