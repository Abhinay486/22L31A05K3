import express from 'express';
import cors from 'cors';
import validator from 'validator';
import { nanoid } from 'nanoid';
import moment from 'moment-timezone';
import { Log, logger, httpLogger, requestLogger, errorLogger } from '../Logging Middleware/logger.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(httpLogger);
app.use(requestLogger);

// session memory
const urlDatabase = new Map();
const clickDatabase = new Map();

// short code
const generateShortCode = () => {
  let shortCode;
  do {
    shortCode = nanoid(6);
  } while (urlDatabase.has(shortCode));
  Log('backend', 'info', 'service', `Generated unique short code: ${shortCode}`);
  return shortCode;
};

// geo graph location
const getGeographicalLocation = (ip) => {
  
  const locations = ['New York, US', 'London, UK', 'Tokyo, JP', 'Mumbai, IN', 'Sydney, AU'];
  const location = locations[Math.floor(Math.random() * locations.length)];
  Log('backend', 'info', 'service', `Generated geographical location for IP ${ip}: ${location}`);
  return location;
};

//routes

// short URL
app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;
    
    await Log('backend', 'info', 'controller', `Received request to create short URL for: ${url}`);

    if (!url || !validator.isURL(url)) {
      await Log('backend', 'error', 'handler', `Invalid URL format provided: ${url}`);
      return res.status(400).json({
        error: 'Invalid URL format'
      });
    }

    if (validity && (!Number.isInteger(validity) || validity <= 0)) {
      await Log('backend', 'error', 'handler', `Invalid validity period provided: ${validity}`);
      return res.status(400).json({
        error: 'Validity must be a positive integer (minutes)'
      });
    }

    let finalShortCode = shortcode;

    if (shortcode) {
      if (urlDatabase.has(shortcode)) {
        await Log('backend', 'error', 'handler', `Shortcode already exists: ${shortcode}`);
        return res.status(400).json({
          error: 'Shortcode already exists. Please choose a different one.'
        });
      }
      
      if (!/^[a-zA-Z0-9]{3,10}$/.test(shortcode)) {
        await Log('backend', 'error', 'handler', `Invalid shortcode format: ${shortcode}`);
        finalShortCode = generateShortCode();
      } else {
        await Log('backend', 'info', 'handler', `Using custom shortcode: ${shortcode}`);
      }
    } else {
      finalShortCode = generateShortCode();
    }

    const createdAt = moment();
    const expiryTime = moment().add(validity, 'minutes');

    const urlData = {
      originalUrl: url,
      shortCode: finalShortCode,
      createdAt: createdAt.toISOString(),
      expiryTime: expiryTime.toISOString(),
      validity: validity,
      clickCount: 0
    };

    urlDatabase.set(finalShortCode, urlData);
    clickDatabase.set(finalShortCode, []);

    const shortLink = `http://localhost:${PORT}/${finalShortCode}`;

    await Log('backend', 'info', 'repository', `URL stored successfully with shortcode: ${finalShortCode}`);

    res.status(201).json({
      shortLink: shortLink,
      expiry: expiryTime.toISOString()
    });

  } catch (error) {
    await Log('backend', 'fatal', 'handler', `Critical error creating short URL: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

//urls
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await Log('backend', 'info', 'controller', `Retrieving statistics for shortcode: ${shortcode}`);

    if (!urlDatabase.has(shortcode)) {
      await Log('backend', 'error', 'handler', `Short URL not found: ${shortcode}`);
      return res.status(404).json({
        error: 'Short URL not found'
      });
    }

    const urlData = urlDatabase.get(shortcode);
    const clicks = clickDatabase.get(shortcode) || [];

    await Log('backend', 'info', 'service', `Retrieved statistics for ${shortcode}: ${clicks.length} clicks`);

    res.json({
      shortCode: shortcode,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt,
      expiryTime: urlData.expiryTime,
      totalClicks: clicks.length,
      clicks: clicks.map(click => ({
        timestamp: click.timestamp,
        referrer: click.referrer || 'Direct',
        location: click.location,
        userAgent: click.userAgent
      }))
    });

  } catch (error) {
    await Log('backend', 'fatal', 'handler', `Critical error retrieving URL statistics: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

//redirection
app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await Log('backend', 'info', 'controller', `Redirect request for shortcode: ${shortcode}`);

    if (!urlDatabase.has(shortcode)) {
      await Log('backend', 'error', 'handler', `Redirect failed - short URL not found: ${shortcode}`);
      return res.status(404).json({
        error: 'Short URL not found'
      });
    }

    const urlData = urlDatabase.get(shortcode);
    const now = moment();
    const expiry = moment(urlData.expiryTime);

    if (now.isAfter(expiry)) {
      await Log('backend', 'error', 'handler', `Redirect failed - URL expired: ${shortcode}`);
      return res.status(410).json({
        error: 'Short URL has expired'
      });
    }

    const clickData = {
      timestamp: now.toISOString(),
      referrer: req.get('Referrer') || req.get('Referer'),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      location: getGeographicalLocation(req.ip)
    };

    const clicks = clickDatabase.get(shortcode);
    clicks.push(clickData);
    clickDatabase.set(shortcode, clicks);

    urlData.clickCount = clicks.length;
    urlDatabase.set(shortcode, urlData);

    await Log('backend', 'info', 'service', `Successful redirect for ${shortcode} to ${urlData.originalUrl}`);

    res.redirect(urlData.originalUrl);

  } catch (error) {
    await Log('backend', 'fatal', 'handler', `Critical error during redirect: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

//statistics
app.get('/api/urls', async (req, res) => {
  try {
    await Log('backend', 'info', 'controller', 'Retrieving all URLs for frontend');
    
    const allUrls = Array.from(urlDatabase.entries()).map(([shortCode, data]) => ({
      shortCode,
      ...data,
      shortLink: `http://localhost:${PORT}/${shortCode}`,
      clickCount: (clickDatabase.get(shortCode) || []).length
    }));

    await Log('backend', 'info', 'service', `Retrieved ${allUrls.length} URLs for frontend`);
    res.json(allUrls);
  } catch (error) {
    await Log('backend', 'fatal', 'handler', `Critical error retrieving all URLs: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.use(errorLogger);

app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Something went wrong!'
  });
});

app.use((req, res) => {
  Log('backend', 'error', 'handler', `404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found'
  });
});

app.listen(PORT, async () => {
  await Log('backend', 'info', 'service', `URL Shortener service started on port ${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});