import { useState, useEffect } from 'react';
import { Log } from '../utils/logger.js';
import { urlService } from '../services/api.js';

const UrlStatistics = ({ urls, onRefresh }) => {
  const [expandedUrls, setExpandedUrls] = useState(new Set());
  const [detailedStats, setDetailedStats] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Log('frontend', 'info', 'api', 'URL Statistics component initialized');
  }, []);

  const toggleExpanded = async (shortCode) => {
    const newExpanded = new Set(expandedUrls);
    
    if (newExpanded.has(shortCode)) {
      newExpanded.delete(shortCode);
      Log('frontend', 'info', 'api', `Collapsed details for ${shortCode}`);
    } else {
      newExpanded.add(shortCode);
      Log('frontend', 'info', 'api', `Expanding details for ${shortCode}`);
      
      
      if (!detailedStats[shortCode]) {
        await fetchDetailedStats(shortCode);
      }
    }
    
    setExpandedUrls(newExpanded);
  };

  const fetchDetailedStats = async (shortCode) => {
    try {
      setLoading(true);
      Log('frontend', 'info', 'api', `Fetching detailed statistics for ${shortCode}`);
      const stats = await urlService.getUrlStats(shortCode);
      setDetailedStats(prev => ({
        ...prev,
        [shortCode]: stats
      }));
      Log('frontend', 'info', 'api', `Retrieved detailed stats for ${shortCode}: ${stats.totalClicks} clicks`);
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to fetch detailed stats for ${shortCode}: ${error.message}`);
      console.error('Error fetching detailed stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      Log('frontend', 'info', 'api', `Copied to clipboard: ${text}`);
      alert('Copied to clipboard!');
    } catch (error) {
      Log('frontend', 'error', 'api', `Failed to copy to clipboard: ${error.message}`);
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const isExpired = (expiryTime) => {
    return new Date() > new Date(expiryTime);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const sortedUrls = [...urls].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>URL Statistics</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>
          Refresh Data
        </button>
      </div>
      
      {urls.length === 0 ? (
        <div className="message">
          <p>No URLs created yet. Go to the "Create Short URLs" tab to get started!</p>
        </div>
      ) : (
        <>
          <p>Total URLs: {urls.length} | Active: {urls.filter(url => !isExpired(url.expiryTime)).length} | Expired: {urls.filter(url => isExpired(url.expiryTime)).length}</p>
          
          <div className="url-list">
            {sortedUrls.map((url) => (
              <div key={url.shortCode} className="url-item">
                <div className="url-header">
                  <div className="url-info">
                    <a 
                      href={url.shortLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="short-link"
                    >
                      {url.shortLink}
                    </a>
                    <div className="original-url">
                      Original: {url.originalUrl}
                    </div>
                  </div>
                  <div className="url-actions">
                    <span className={`status ${isExpired(url.expiryTime) ? 'expired' : 'active'}`}>
                      {isExpired(url.expiryTime) ? 'Expired' : 'Active'}
                    </span>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => copyToClipboard(url.shortLink)}
                    >
                      Copy
                    </button>
                    <button 
                      className="btn btn-small"
                      onClick={() => toggleExpanded(url.shortCode)}
                      disabled={loading}
                    >
                      {expandedUrls.has(url.shortCode) ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                </div>

                <div className="url-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created</span>
                    <span className="meta-value">{formatDate(url.createdAt)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Expires</span>
                    <span className="meta-value">{formatDate(url.expiryTime)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Total Clicks</span>
                    <span className="meta-value">{url.clickCount || 0}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Validity</span>
                    <span className="meta-value">{url.validity} minutes</span>
                  </div>
                </div>

                {expandedUrls.has(url.shortCode) && (
                  <div className="click-details">
                    {loading ? (
                      <div className="loading">
                        <div className="spinner"></div>
                      </div>
                    ) : detailedStats[url.shortCode] ? (
                      <>
                        <h4>Click Details ({detailedStats[url.shortCode].totalClicks} total clicks)</h4>
                        {detailedStats[url.shortCode].clicks.length === 0 ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                            No clicks recorded yet
                          </div>
                        ) : (
                          <div className="click-list">
                            {detailedStats[url.shortCode].clicks.map((click, index) => (
                              <div key={index} className="click-item">
                                <div>
                                  <strong>Time:</strong>
                                  <div className="timestamp">{formatDate(click.timestamp)}</div>
                                </div>
                                <div>
                                  <strong>Source:</strong>
                                  <div className="referrer">{click.referrer}</div>
                                </div>
                                <div>
                                  <strong>Location:</strong>
                                  <div className="location">{click.location}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                        Failed to load detailed statistics
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UrlStatistics;
