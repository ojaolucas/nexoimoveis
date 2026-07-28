const app = require('./app');
const db = require('./src/config/database');
const cron = require('./src/config/cron');
const logger = require('./src/utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Start the server
async function startServer() {
  try {
    // 1. Test database connection resiliently
    logger.info('Testing database connection...');
    try {
      const dbTest = await db.query('SELECT NOW()');
      if (dbTest && dbTest.rows.length > 0) {
        logger.info('Database connection verified successfully.', { time: dbTest.rows[0].now });
      } else {
        logger.warn('Database connection test returned empty rows, but proceeding...');
      }
    } catch (dbErr) {
      logger.warn(`Database connection test failed: ${dbErr.message}. Server is starting but database queries may fail until network is stable.`);
    }

    // 2. Initialize scheduled cron jobs
    cron.initScheduler();

    // 3. Start listening on the port
    const server = app.listen(PORT, () => {
      logger.info(`Server is running and listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Clean shutdown handlers
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down server gracefully...`);
      
      // Force exit after 1 second if graceful shutdown hangs (common in dev watch mode)
      setTimeout(() => {
        logger.warn('Graceful shutdown timed out. Forcing process exit.');
        process.exit(0);
      }, 1000);

      server.close(() => {
        logger.info('HTTP server closed.');
        db.pool.end(() => {
          logger.info('Database pool connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server due to configuration or connection error:', error);
    process.exit(1);
  }
}

startServer();
