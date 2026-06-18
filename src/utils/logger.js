const path = require('path');
const fs = require('fs');

/**
 * Log levels
 */
const LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Log message formatting helper
 */
function logMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : '';
  const logStr = `[${timestamp}] [${level}] ${message}${metaString}`;

  // Print to console
  if (level === LEVELS.ERROR) {
    console.error(logStr);
  } else if (level === LEVELS.WARN) {
    console.warn(logStr);
  } else {
    console.log(logStr);
  }

  // Optional: write to a file in the workspace
  try {
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'app.log');
    fs.appendFileSync(logFile, logStr + '\n', 'utf8');
  } catch (err) {
    // Fail silently so it doesn't block execution
  }
}

module.exports = {
  info: (message, meta) => logMessage(LEVELS.INFO, message, meta),
  warn: (message, meta) => logMessage(LEVELS.WARN, message, meta),
  error: (message, errorObj, meta = {}) => {
    const errorDetails = {
      message: errorObj.message,
      stack: errorObj.stack,
      ...meta,
    };
    logMessage(LEVELS.ERROR, message, errorDetails);
  },
};
