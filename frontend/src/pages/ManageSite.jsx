import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Code2,
  Settings2,
  RefreshCw,
  Copy,
  Check,
  Save,
  MessageSquare,
  Globe,
  ExternalLink
} from 'lucide-react'
import { SCRAPER_API, RENDER_API, getChatbotConfig, saveChatbotConfig, addScrapedSite } from '../config'
import './ManageSite.css'

export default function ManageSite() {
  const { websiteId } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('embed')
  const [copied, setCopied] = useState(false)
  const [backendOk, setBackendOk] = useState(null)

  // Chatbot Branding State
  const [botConfig, setBotConfig] = useState(() => getChatbotConfig(websiteId))
  const [title, setTitle] = useState(botConfig.title || `${websiteId} Assistant`)
  const [welcomeMsg, setWelcomeMsg] = useState(botConfig.welcomeMessage || `Hello. How can I assist you with ${websiteId}?`)
  const [primaryColor, setPrimaryColor] = useState(botConfig.primaryColor || '#0f172a')
  const [logoUrl, setLogoUrl] = useState(botConfig.logoUrl || '')
  const [brandSaved, setBrandSaved] = useState(false)

  // Re-scrape State
  const [newUrl, setNewUrl] = useState('')
  const [mongoUri, setMongoUri] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [scrapeError, setScrapeError] = useState('')

  useEffect(() => {
    checkBackend()
  }, [])

  async function checkBackend() {
    try {
      await axios.get(`${RENDER_API}/api/health`, { timeout: 5000 })
      setBackendOk(true)
    } catch {
      setBackendOk(false)
    }
  }

  function handleSaveBrand() {
    const updated = {
      title: title.trim() || `${websiteId} Assistant`,
      welcomeMessage: welcomeMsg.trim() || `Hello. How can I assist you with ${websiteId}?`,
      primaryColor: primaryColor || '#0f172a',
      logoUrl: logoUrl.trim()
    }
    setBotConfig(updated)
    saveChatbotConfig(websiteId, updated)
    addScrapedSite({
      websiteId,
      name: updated.title
    })
    setBrandSaved(true)
    setTimeout(() => setBrandSaved(false), 2000)
  }

  async function handleRescrape() {
    if (!newUrl.trim()) { setScrapeError('Please enter a target URL.'); return }
    setScraping(true)
    setScrapeResult(null)
    setScrapeError('')
    try {
      const res = await axios.post(`${SCRAPER_API}/api/scrape`, {
        url: newUrl,
        websiteId,
        ...(mongoUri.trim() ? { mongoUri: mongoUri.trim() } : {}),
      })
      setScrapeResult(res.data)
      addScrapedSite({
        websiteId,
        name: title.trim() || websiteId,
        url: newUrl,
        chunks: res.data.chunksStored || 0,
        pages: res.data.pagesScraped || 0,
        lastSync: new Date().toISOString()
      })
    } catch (e) {
      let msg = e.response?.data?.error || e.message
      if (msg.includes('Network Error')) {
        msg = 'Crawler worker not detected on http://127.0.0.1:5000. Run "cd backend/local-scraper && npm run dev" first.'
      }
      setScrapeError(msg)
    } finally {
      setScraping(false)
    }
  }

  const embedSnippet = `<!-- CogniSite Chatbot Widget -->
<script src="${RENDER_API}/widget/chat-widget.js" defer></script>
<script defer>
  document.addEventListener("DOMContentLoaded", function() {
    ChatWidget.init({
      websiteId: "${websiteId}",
      apiUrl: "${RENDER_API}",
      title: "${title || `${websiteId} Assistant`}",
      welcomeMessage: "${welcomeMsg}",
      primaryColor: "${primaryColor}"${logoUrl.trim() ? `,\n      logoUrl: "${logoUrl.trim()}"` : ''}
    });
  });
</script>`

  function copySnippet() {
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="manage-page fade-in">
      <div className="manage-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 className="manage-title">Website: <span className="mono">{websiteId}</span></h2>
          {backendOk !== null && (
            <span className={`status-badge ${backendOk ? 'status-ready' : 'status-pending'}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
              {backendOk ? 'API Live' : 'API Connecting...'}
            </span>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${tab === 'embed' ? 'active' : ''}`}
          onClick={() => setTab('embed')}
        >
          <Code2 size={13} /> Embed Code
        </button>
        <button
          className={`tab-btn ${tab === 'branding' ? 'active' : ''}`}
          onClick={() => setTab('branding')}
        >
          <Settings2 size={13} /> Chatbot Appearance
        </button>
        <button
          className={`tab-btn ${tab === 'rescrape' ? 'active' : ''}`}
          onClick={() => setTab('rescrape')}
        >
          <RefreshCw size={13} /> Re-Crawl
        </button>
      </div>

      <div className="tab-content">
        {/* Tab 1: Embed Code */}
        {tab === 'embed' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Embed Widget Code</h3>
                <p>Paste this code snippet before the closing <code>&lt;/body&gt;</code> tag of your website.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={copySnippet}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Code</>}
              </button>
            </div>
            <pre className="code-block">{embedSnippet}</pre>

            <div className="divider" />
            <div className="quick-test-action">
              <span>Want to test this chatbot before publishing?</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(`/test?site=${websiteId}`)}
              >
                <MessageSquare size={13} /> Test in Preview
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Chatbot Appearance */}
        {tab === 'branding' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Chatbot Appearance & Customization</h3>
                <p>Set the brand color, title, and logo used by this website's chatbot widget.</p>
              </div>
            </div>

            <div className="branding-form-grid">
              <div className="field">
                <label>Chatbot Title</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Website Assistant"
                />
              </div>

              <div className="field">
                <label>Primary Brand Color</label>
                <div className="color-row">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    className="input mono"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="field">
                <label>Logo URL (Optional)</label>
                <input
                  type="url"
                  className="input"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <span className="field-hint">A direct link to an image file. Leave empty to use the standard icon.</span>
              </div>

              <div className="field full-width">
                <label>Welcome Message</label>
                <input
                  type="text"
                  className="input"
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  placeholder="Greeting displayed when a visitor opens the widget"
                />
              </div>
            </div>

            <div className="branding-actions">
              <button className="btn btn-primary btn-sm" onClick={handleSaveBrand}>
                <Save size={13} /> {brandSaved ? 'Saved' : 'Save Appearance'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(`/test?site=${websiteId}`)}
              >
                <MessageSquare size={13} /> Preview Live Chatbot
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Re-scrape */}
        {tab === 'rescrape' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Re-crawl Website</h3>
                <p>Run a fresh crawl to update the indexed content. Existing chunks will be updated.</p>
              </div>
            </div>

            <div className="crawler-notice">
              <strong>Crawler Worker Instructions:</strong>
              <p>Dynamic page extraction is handled by your background worker (Playwright). Ensure the local crawler is running:</p>
              <code>cd backend/local-scraper && npm run dev</code>
            </div>

            <div className="field" style={{ maxWidth: 440, marginTop: 14 }}>
              <label>Website URL</label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                disabled={scraping}
              />
            </div>

            <div className="field" style={{ maxWidth: 440 }}>
              <label>Lead Storage Database URI (Optional)</label>
              <input
                className="input mono"
                type="password"
                placeholder="Leave blank to keep existing database"
                value={mongoUri}
                onChange={e => setMongoUri(e.target.value)}
                disabled={scraping}
              />
            </div>

            {scrapeError && (
              <div className="error-box" style={{ maxWidth: 440, marginBottom: 10 }}>
                {scrapeError}
              </div>
            )}

            {scrapeResult && (
              <div className="success-box" style={{ maxWidth: 440, marginBottom: 10 }}>
                Indexed {scrapeResult.pagesScraped} pages, {scrapeResult.chunksStored} content chunks.
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleRescrape}
              disabled={scraping}
              style={{ marginTop: 6 }}
            >
              {scraping ? <><span className="spinner" /> Crawling...</> : 'Start Crawl'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}