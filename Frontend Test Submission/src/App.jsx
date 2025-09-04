import { useState, useEffect } from 'react';
import { Log } from './utils/logger.js';
import { urlService } from './services/api.js';
import UrlShortener from './components/UrlShortener.jsx';
import UrlStatistics from './components/UrlStatistics.jsx';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('shortener');
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Log('frontend', 'info', 'api', 'URL Shortener App initialized');
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      Log('frontend', 'info', 'api', 'Fetching all URLs from backend');
      const data = await urlService.getAllUrls();
      setUrls(data);
      Log('frontend', 'info', 'api', `Successfully loaded ${data.length} URLs`);
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to fetch URLs: ${error.message}`);
      console.error('Error fetching URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlCreated = (newUrl) => {
    Log('frontend', 'info', 'api', `New URL created: ${newUrl.shortLink}`);
    setUrls(prevUrls => [newUrl, ...prevUrls]);
  };

  const handleTabSwitch = (tab) => {
    Log('frontend', 'info', 'api', `Switching to ${tab} tab`);
    setActiveTab(tab);
    if (tab === 'statistics') {
      fetchUrls(); 
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>URL Shortener</h1>
        <p>Create short, memorable links with detailed analytics</p>
      </header>

      <nav className="nav">
        <button
          className={`nav-button ${activeTab === 'shortener' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('shortener')}
        >
          Create Short URLs
        </button>
        <button
          className={`nav-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('statistics')}
        >
          View Statistics
        </button>
      </nav>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}

      {activeTab === 'shortener' && (
        <UrlShortener onUrlCreated={handleUrlCreated} />
      )}

      {activeTab === 'statistics' && (
        <UrlStatistics urls={urls} onRefresh={fetchUrls} />
      )}
    </div>
  );
}

export default App;
