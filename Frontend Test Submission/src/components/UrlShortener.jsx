import { useState } from 'react';
import { Log } from '../utils/logger.js';
import { urlService } from '../services/api.js';

const UrlShortener = ({ onUrlCreated }) => {
  const [urls, setUrls] = useState([
    { id: 1, url: '', validity: 30, shortcode: '', loading: false, result: null, error: null }
  ]);

  const addUrlRow = () => {
    if (urls.length < 5) {
      Log('frontend', 'info', 'api', `Adding URL row ${urls.length + 1}`);
      const newId = Math.max(...urls.map(u => u.id)) + 1;
      setUrls([...urls, { 
        id: newId, 
        url: '', 
        validity: 30, 
        shortcode: '', 
        loading: false, 
        result: null, 
        error: null 
      }]);
    }
  };

  const removeUrlRow = (id) => {
    if (urls.length > 1) {
      Log('frontend', 'info', 'api', `Removing URL row with id ${id}`);
      setUrls(urls.filter(url => url.id !== id));
    }
  };

  const updateUrl = (id, field, value) => {
    setUrls(urls.map(url => 
      url.id === id ? { ...url, [field]: value, error: null } : url
    ));
  };

  const validateUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const createShortUrl = async (urlData) => {
    if (!urlData.url) {
      Log('frontend', 'error', 'api', 'URL field is required');
      return { error: 'URL is required' };
    }

    if (!validateUrl(urlData.url)) {
      Log('frontend', 'error', 'api', `Invalid URL format: ${urlData.url}`);
      return { error: 'Please enter a valid URL' };
    }

    if (urlData.validity && (urlData.validity < 1 || urlData.validity > 10080)) {
      Log('frontend', 'error', 'api', `Invalid validity period: ${urlData.validity}`);
      return { error: 'Validity must be between 1 and 10080 minutes (1 week)' };
    }

    if (urlData.shortcode && !/^[a-zA-Z0-9]{3,10}$/.test(urlData.shortcode)) {
      Log('frontend', 'error', 'api', `Invalid shortcode format: ${urlData.shortcode}`);
      return { error: 'Shortcode must be 3-10 alphanumeric characters' };
    }

    try {
      Log('frontend', 'info', 'api', `Creating short URL for: ${urlData.url}`);
      const result = await urlService.createShortUrl(urlData);
      Log('frontend', 'info', 'api', `Successfully created short URL: ${result.shortLink}`);
      
      if (onUrlCreated) {
        onUrlCreated({
          ...result,
          originalUrl: urlData.url,
          shortCode: result.shortLink.split('/').pop(),
          createdAt: new Date().toISOString(),
          clickCount: 0
        });
      }
      
      return { result };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      Log('frontend', 'error', 'api', `Failed to create short URL: ${errorMessage}`);
      return { error: errorMessage };
    }
  };

  const handleSubmit = async (id) => {
    const urlData = urls.find(u => u.id === id);
    
    setUrls(urls.map(url => 
      url.id === id ? { ...url, loading: true, error: null, result: null } : url
    ));

    const response = await createShortUrl({
      url: urlData.url,
      validity: urlData.validity || 30,
      shortcode: urlData.shortcode || undefined
    });

    setUrls(urls.map(url => 
      url.id === id ? { 
        ...url, 
        loading: false, 
        result: response.result || null, 
        error: response.error || null 
      } : url
    ));
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

  return (
    <div className="card">
      <h2>Create Short URLs</h2>
      <p>Create up to 5 short URLs simultaneously with custom options.</p>

      {urls.map((urlData, index) => (
        <div key={urlData.id} className="url-form">
          <div className="form-header">
            <h3>URL #{index + 1}</h3>
            {urls.length > 1 && (
              <button 
                className="btn btn-danger btn-small"
                onClick={() => removeUrlRow(urlData.id)}
                type="button"
              >
                Remove
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor={`url-${urlData.id}`}>Original URL *</label>
            <input
              id={`url-${urlData.id}`}
              type="url"
              placeholder="https://example.com/very-long-url"
              value={urlData.url}
              onChange={(e) => updateUrl(urlData.id, 'url', e.target.value)}
              className={urlData.error && urlData.error.includes('URL') ? 'error' : ''}
            />
          </div>

          <div className="form-row">
            <div className="form-column">
              <label htmlFor={`validity-${urlData.id}`}>Validity (minutes)</label>
              <input
                id={`validity-${urlData.id}`}
                type="number"
                min="1"
                max="10080"
                placeholder="30"
                value={urlData.validity}
                onChange={(e) => updateUrl(urlData.id, 'validity', parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="form-column">
              <label htmlFor={`shortcode-${urlData.id}`}>Custom Shortcode (optional)</label>
              <input
                id={`shortcode-${urlData.id}`}
                type="text"
                placeholder="my-link"
                value={urlData.shortcode}
                onChange={(e) => updateUrl(urlData.id, 'shortcode', e.target.value)}
                className={urlData.error && urlData.error.includes('Shortcode') ? 'error' : ''}
              />
            </div>
            <div className="form-column">
              <button
                className="btn"
                onClick={() => handleSubmit(urlData.id)}
                disabled={urlData.loading || !urlData.url}
                style={{ marginTop: '1.5rem' }}
              >
                {urlData.loading ? 'Creating...' : 'Create Short URL'}
              </button>
            </div>
          </div>

          {urlData.error && (
            <div className="message error">
              {urlData.error}
            </div>
          )}

          {urlData.result && (
            <div className="message success">
              <div className="result-content">
                <div className="result-header">
                  <strong>Short URL Created Successfully!</strong>
                </div>
                <div className="result-details">
                  <div className="result-item">
                    <span className="result-label">Short Link:</span>
                    <div className="result-value">
                      <a 
                        href={urlData.result.shortLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="short-link"
                      >
                        {urlData.result.shortLink}
                      </a>
                      <button 
                        className="btn btn-small btn-secondary"
                        onClick={() => copyToClipboard(urlData.result.shortLink)}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Expires:</span>
                    <span className="result-value">
                      {new Date(urlData.result.expiry).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {urls.length < 5 && (
        <button 
          className="btn btn-secondary"
          onClick={addUrlRow}
          type="button"
        >
          Add Another URL ({urls.length}/5)
        </button>
      )}
    </div>
  );
};

export default UrlShortener;
