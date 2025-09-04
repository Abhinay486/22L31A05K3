// Frontend Logging Middleware
const LOGGING_CONFIG = {
  apiUrl: 'http://20.244.56.144/evaluation-service/logs',
  authUrl: 'http://20.244.56.144/evaluation-service/auth',
  credentials: {
    username: import.meta.env.VITE_USERNAME || 'your-email@domain.com',
    password: import.meta.env.VITE_PASSWORD || 'your-password',
    accessCode: import.meta.env.VITE_ACCESS_CODE || 'your-access-code',
    clientId: import.meta.env.VITE_CLIENT_ID || 'your-client-id'
  }
};

let authToken = null;
let tokenExpiry = null;

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
      console.log('Frontend: Authentication token obtained successfully');
      return authToken;
    } else {
      console.error('Frontend: Failed to get auth token:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Frontend: Error getting auth token:', error.message);
    return null;
  }
}

export async function Log(stack, level, packageName, message) {
  try {
    const validStacks = ['backend', 'frontend'];
    const validLevels = ['info', 'error', 'fatal'];
    const validFrontendPackages = ['api'];

    if (!validStacks.includes(stack)) {
      console.error('Invalid stack. Must be "backend" or "frontend"');
      return;
    }

    if (!validLevels.includes(level)) {
      console.error('Invalid level. Must be "info", "error", or "fatal"');
      return;
    }

    if (stack === 'frontend' && !validFrontendPackages.includes(packageName)) {
      console.error(`Invalid package "${packageName}" for frontend stack`);
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      console.error('Unable to authenticate with logging service');
      return;
    }

    const logData = {
      stack: stack,
      level: level,
      package: packageName,
      message: message
    };

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
      console.log('Frontend: Log sent successfully:', result.logId);
    } else {
      console.error('Frontend: Failed to send log:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('Frontend: Error in Log function:', error.message);
  }
}
