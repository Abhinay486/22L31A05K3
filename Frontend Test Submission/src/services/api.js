import axios from 'axios';
import { Log } from '../utils/logger.js';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    Log('frontend', 'info', 'api', `Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    Log('frontend', 'error', 'api', `Request error: ${error.message}`);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    Log('frontend', 'info', 'api', `Received ${response.status} response from ${response.config.url}`);
    return response;
  },
  (error) => {
    const errorMessage = error.response 
      ? `API error ${error.response.status}: ${error.response.data?.error || error.message}`
      : `Network error: ${error.message}`;
    Log('frontend', 'error', 'api', errorMessage);
    return Promise.reject(error);
  }
);

export const urlService = {

  createShortUrl: async (urlData) => {
    try {
      Log('frontend', 'info', 'api', `Creating short URL for: ${urlData.url}`);
      const response = await api.post('/shorturls', urlData);
      Log('frontend', 'info', 'api', `Short URL created successfully: ${response.data.shortLink}`);
      return response.data;
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to create short URL: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  },

  // statistics
  getUrlStats: async (shortcode) => {
    try {
      Log('frontend', 'info', 'api', `Fetching statistics for shortcode: ${shortcode}`);
      const response = await api.get(`/shorturls/${shortcode}`);
      Log('frontend', 'info', 'api', `Retrieved statistics for ${shortcode}: ${response.data.totalClicks} clicks`);
      return response.data;
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to get URL stats: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  },

  // URLs
  getAllUrls: async () => {
    try {
      Log('frontend', 'info', 'api', 'Fetching all URLs');
      const response = await api.get('/api/urls');
      Log('frontend', 'info', 'api', `Retrieved ${response.data.length} URLs`);
      return response.data;
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to get all URLs: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  }
};

export default api;
