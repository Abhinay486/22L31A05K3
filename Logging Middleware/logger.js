import https from 'https';
import winston from 'winston';
import morgan from 'morgan';

// Configuration for the external logging API
const LOGGING_CONFIG = {
  apiUrl: 'http://20.244.56.144/evaluation-service/logs',
  authUrl: 'http://20.244.56.144/evaluation-service/auth',
  credentials: {
    username: process.env.USERNAME || 'your-email@domain.com',
    password: process.env.PASSWORD || 'your-password',
    accessCode: process.env.ACCESS_CODE || 'your-access-code',
    clientId: process.env.CLIENT_ID || 'your-client-id'
  }
};

let authToken = null;
let tokenExpiry = null;

// Function to get authentication token
async function getAuthToken() {
  if (authToken && tokenExpiry && new Date() < tokenExpiry) {
    return authToken;
  }

  try {
    const response = await fetch(LOGGING_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(LOGGING_CONFIG.credentials)
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.access_token;
      tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      console.log('Authentication token obtained successfully');
      return authToken;
    } else {
      console.error('Failed to get auth token:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    return null;
  }
}

// Main Log function - reusable across the application
async function Log(stack, level, packageName, message) {
  try {
    // Validate inputs
    const validStacks = ['backend', 'frontend'];
    const validLevels = ['info', 'error', 'fatal'];
    const validBackendPackages = ['cache', 'controller', 'cron_job', 'domain', 'handler', 'repository', 'service'];
    const validFrontendPackages = ['api'];

    if (!validStacks.includes(stack)) {
      console.error('Invalid stack. Must be "backend" or "frontend"');
      return;
    }

    if (!validLevels.includes(level)) {
      console.error('Invalid level. Must be "info", "error", or "fatal"');
      return;
    }

    const validPackages = stack === 'backend' ? validBackendPackages : validFrontendPackages;
    if (!validPackages.includes(packageName)) {
      console.error(`Invalid package "${packageName}" for stack "${stack}"`);
      return;
    }

    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      console.error('Unable to authenticate with logging service');
      return;
    }

    // Prepare log data
    const logData = {
      stack: stack,
      level: level,
      package: packageName,
      message: message
    };

    // Send log to external API
    const response = await fetch(LOGGING_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(logData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Log sent successfully:', result.logId);
    } else {
      console.error('Failed to send log:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('Error in Log function:', error.message);
  }
}

// Create Winston logger instance for local logging as backup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'url-shortener' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Morgan middleware for HTTP request logging
const httpLogger = morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
      // Also send to external API
      Log('backend', 'info', 'handler', `HTTP Request: ${message.trim()}`);
    }
  }
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const logMessage = `${req.method} ${req.url} from ${req.ip}`;
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Send to external API
  Log('backend', 'info', 'handler', logMessage);
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorMessage = `Error in ${req.method} ${req.url}: ${err.message}`;
  logger.error({
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Send to external API
  Log('backend', 'error', 'handler', errorMessage);
  next(err);
};

export {
  Log,
  logger,
  httpLogger,
  requestLogger,
  errorLogger
};
