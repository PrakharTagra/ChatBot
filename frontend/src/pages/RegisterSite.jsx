import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Check, Copy, ArrowRight } from 'lucide-react'
import { SCRAPER_API, RENDER_API, saveChatbotConfig, addScrapedSite } from '../config'
import './RegisterSite.css'

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export default function RegisterSite() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [websiteId, setWebsiteId] = useState('')
  const [title, setTitle] = useState('')
  const [welcomeMsg, setWelcomeMsg] = useState('Hello. How can I assist you with this website?')
  const [primaryColor, setPrimaryColor] = useState('#0f172a')
  const [logoUrl, setLogoUrl] = useState('')
  const [mongoUri, setMongoUri] = useState('')
  const [idTouched, setIdTouched] = useState(false)

  const [step, setStep] = useState('form')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  function handleUrlChange(val) {
    setUrl(val)
    if (!idTouched) {
      setWebsiteId(slugify(val))
    }
  }

  function addLog(msg) {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])
  }

  async function handleSubmit() {
    if (!url.trim()) { setError('Website URL is required.'); return }
    if (!websiteId.trim()) { setError('Website ID is required.'); return }
    if (!/^[a-z0-9-]+$/.test(websiteId)) {
      setError('Website ID can only contain lowercase letters, numbers, and hyphens.')
      return
    }

    // Save the customized chatbot config immediately
    saveChatbotConfig(websiteId, {
      title: title.trim() || `${websiteId} Assistant`,
      welcomeMessage: welcomeMsg.trim() || `Hello. How can I assist you with ${websiteId}?`,
      primaryColor: primaryColor || '#0f172a',
      logoUrl: logoUrl.trim()
    })

    setError('')
    setStep('scraping')
    setLogs([])
    addLog(`Connecting to crawler worker for ${url}...`)

    try {
      addLog('Sending request to crawler...')
      const res = await axios.post(`${SCRAPER_API}/api/scrape`, {
        url,
        websiteId,
        mongoUri: mongoUri.trim() || undefined
      })
      addLog(`Crawled ${res.data.pagesScraped} pages`)
      addLog(`Indexed ${res.data.chunksStored} content chunks`)
      addLog('Crawl complete. Chatbot widget is ready.')
      setResult(res.data)

      addScrapedSite({
        websiteId,
        name: title.trim() || websiteId,
        url,
        chunks: res.data.chunksStored || 0,
        pages: res.data.pagesScraped || 0,
        lastSync: new Date().toISOString(),
        description: `Indexed knowledge base for ${url}`
      })

      saveChatbotConfig(websiteId, {
        title: title.trim() || `${websiteId} Assistant`,
        welcomeMessage: welcomeMsg.trim() || `Hello. How can I assist you with ${websiteId}?`,
        primaryColor: primaryColor || '#0f172a',
        logoUrl: logoUrl.trim()
      })

      setStep('done')
    } catch (e) {
      let msg = e.response?.data?.error || e.message
      if (msg.includes('Network Error')) {
        msg = 'Crawler worker not detected on http://127.0.0.1:5000. Run "cd backend/local-scraper && npm run dev" first.'
      }
      setError(`Crawl failed: ${msg}`)
      addLog(`Error: ${msg}`)
      setStep('form')
    }
  }

  const embedSnippet = `<!-- CogniSite Chatbot Widget -->
<script src="${RENDER_API}/widget/chat-widget.js" defer></script>
<script defer>
  document.addEventListener("DOMContentLoaded", function() {
    ChatWidget.init({
      websiteId: "${websiteId}",
      apiUrl: "${RENDER_API}",
      title: "${title || 'Website Assistant'}",
      welcomeMessage: "${welcomeMsg}",
      primaryColor: "${primaryColor}"${logoUrl.trim() ? `,\n      logoUrl: "${logoUrl.trim()}"` : ''}
    });
  });
</script>`

  return (
    <div className="register-page fade-in">
      {step !== 'done' && (
        <div className="register-grid">
          {/* Main Form */}
          <div className="register-form-col">
            <div className="card">
              <div className="worker-info-banner">
                <strong>Crawler Worker Setup:</strong>
                <p>Website indexing is processed by your local crawler agent (Playwright) feeding into the cloud database:</p>
                <code>cd backend/local-scraper && npm run dev</code>
              </div>

              <h2 className="form-section-title">Website Details</h2>
              <p className="form-section-desc">Enter the domain to crawl and create a searchable index.</p>
              <div className="divider" />

              <div className="field">
                <label>Website URL *</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  disabled={step === 'scraping'}
                />
              </div>

              <div className="field">
                <label>Website Identifier *</label>
                <input
                  className="input mono"
                  type="text"
                  placeholder="my-website"
                  value={websiteId}
                  onChange={e => { setIdTouched(true); setWebsiteId(e.target.value) }}
                  disabled={step === 'scraping'}
                />
                <span className="field-hint">Unique identifier used for your database and widget code.</span>
              </div>

              <div className="divider" />
              <h2 className="form-section-title">Chatbot Branding & Colors</h2>
              <p className="form-section-desc">Customize the appearance of the customer-facing chatbot.</p>
              <div className="divider" />

              <div className="field">
                <label>Chatbot Title</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Website Assistant"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={step === 'scraping'}
                />
              </div>

              <div className="field">
                <label>Theme Color</label>
                <div className="color-row">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="color-picker"
                  />
                  <input
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
                  className="input"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  disabled={step === 'scraping'}
                />
              </div>

              <div className="field">
                <label>Initial Welcome Message</label>
                <textarea
                  className="input"
                  rows={2}
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  disabled={step === 'scraping'}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="divider" />
              <h2 className="form-section-title">Lead Storage (Optional)</h2>
              <p className="form-section-desc">Customer contact requests will be stored in your database.</p>
              <div className="divider" />

              <div className="field">
                <label>Database Connection URI</label>
                <input
                  className="input mono"
                  type="password"
                  placeholder="mongodb+srv://..."
                  value={mongoUri}
                  onChange={e => setMongoUri(e.target.value)}
                  disabled={step === 'scraping'}
                />
                <span className="field-hint">Stored securely on the server. Leave blank to disable lead capture.</span>
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={handleSubmit}
                disabled={step === 'scraping'}
              >
                {step === 'scraping' ? <><span className="spinner" /> Crawling...</> : 'Crawl & Index Website'}
              </button>
            </div>
          </div>

          {/* Side Column: Preview & Terminal Logs */}
          <div className="register-side-col">
            {logs.length > 0 && (
              <div className="card log-card">
                <h3 className="log-title">Crawl Progress</h3>
                <div className="log-body">
                  {logs.map((l, i) => (
                    <div key={i} className="log-line">
                      <span className="log-time">{l.time}</span>
                      <span>{l.msg}</span>
                    </div>
                  ))}
                  {step === 'scraping' && (
                    <div className="log-line">
                      <span className="spinner" style={{ width: 12, height: 12 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card preview-card">
              <h3 className="log-title">Widget Embed Preview</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                This script snippet is ready for your site.
              </p>
              <pre className="code-block">{embedSnippet}</pre>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <DoneScreen
          websiteId={websiteId}
          result={result}
          embedSnippet={embedSnippet}
          onManage={() => navigate(`/manage/${websiteId}`)}
          onAddAnother={() => {
            setStep('form')
            setUrl('')
            setWebsiteId('')
            setIdTouched(false)
            setLogs([])
            setResult(null)
          }}
        />
      )}
    </div>
  )
}

function DoneScreen({ websiteId, result, embedSnippet, onManage, onAddAnother }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="done-screen fade-in card">
      <div className="done-hero">
        <h2>Website Indexed Successfully</h2>
        <p>{result.pagesScraped} pages crawled · {result.chunksStored} content chunks stored</p>
        <span className="badge badge-purple mono" style={{ marginTop: 8 }}>ID: {websiteId}</span>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600 }}>Your Embed Snippet</h3>
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        <pre className="code-block">{embedSnippet}</pre>
      </div>

      <div className="done-actions" style={{ marginTop: 18 }}>
        <button className="btn btn-primary" onClick={onManage}>
          Configure Chatbot
        </button>
        <button className="btn btn-ghost" onClick={onAddAnother}>
          Connect Another Website
        </button>
      </div>
    </div>
  )
}