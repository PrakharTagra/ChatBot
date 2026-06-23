import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './RegisterSite.css'
import { SCRAPER_API, RENDER_API } from '../config'

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
  const [welcomeMsg, setWelcomeMsg] = useState('Hi! I can answer questions about this website. What would you like to know?')
  const [primaryColor, setPrimaryColor] = useState('#6c63ff')
  const [logoUrl, setLogoUrl] = useState('')
  const [mongoUri, setMongoUri] = useState('')
  const [idTouched, setIdTouched] = useState(false)

  const [step, setStep] = useState('form') // form | scraping | done
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
    if (!/^[a-z0-9-]+$/.test(websiteId)) { setError('Website ID can only contain lowercase letters, numbers, and hyphens.'); return }

    setError('')
    setStep('scraping')
    setLogs([])
    addLog(`Starting scrape for ${url}…`)

    try {
      addLog('Sending request to backend…')
      const res = await axios.post(`${SCRAPER_API}/api/scrape`, { url, websiteId, mongoUri: mongoUri.trim() || undefined })
      addLog(`✅ Scraped ${res.data.pagesScraped} pages`)
      addLog(`✅ Stored ${res.data.chunksStored} content chunks`)
      addLog('Done! Your widget is ready.')
      setResult(res.data)
      setStep('done')
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      setError(`Scrape failed: ${msg}`)
      addLog(`❌ Error: ${msg}`)
      setStep('form')
    }
  }

  const embedSnippet = `<!-- ChatAgent Widget -->
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
          {/* Left: Form */}
          <div className="register-form-col">
            <div className="card">
              <h2 className="form-section-title">Website Details</h2>
              <p className="form-section-desc">Enter the website URL to scrape and index its content.</p>
              <div className="divider" />

              <div className="field">
                <label>Website URL *</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  disabled={step === 'scraping'}
                />
              </div>

              <div className="field">
                <label>Website ID *</label>
                <input
                  className="input mono"
                  type="text"
                  placeholder="my-website"
                  value={websiteId}
                  onChange={e => { setIdTouched(true); setWebsiteId(e.target.value) }}
                  disabled={step === 'scraping'}
                />
                <p className="field-hint">Unique identifier. Auto-generated from URL. Only a-z, 0-9, hyphens.</p>
              </div>

              <div className="divider" />
              <h2 className="form-section-title">Widget Customization</h2>
              <p className="form-section-desc">These settings appear in the embed snippet.</p>
              <div className="divider" />

              <div className="field">
                <label>Chat Title</label>
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
                <label>Logo URL <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(optional)</span></label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://yourwebsite.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  disabled={step === 'scraping'}
                />
                <p className="field-hint">A publicly accessible image URL. Shown as a circular avatar in the chat header. Leave blank to show only the title.</p>
              </div>

              <div className="field">
                <label>Welcome Message</label>
                <textarea
                  className="input"
                  rows={2}
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  disabled={step === 'scraping'}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="field">
                <label>Primary Color</label>
                <div className="color-row">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="color-picker" />
                  <input className="input mono" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>

              <div className="divider" />
              <h2 className="form-section-title">Lead Capture (Optional)</h2>
              <p className="form-section-desc">When the chatbot can't answer, it will ask the visitor for their name, email, and mobile — and save them to your MongoDB.</p>
              <div className="divider" />

              <div className="field">
                <label>MongoDB Connection URI</label>
                <input
                  className="input mono"
                  type="password"
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                  value={mongoUri}
                  onChange={e => setMongoUri(e.target.value)}
                  disabled={step === 'scraping'}
                />
                <p className="field-hint">Your URI is never stored on our servers — it's held in memory only for the duration of the session. Leave blank to disable lead capture.</p>
              </div>

              {error && <div className="error-box">⚠️ {error}</div>}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
                onClick={handleSubmit}
                disabled={step === 'scraping'}
              >
                {step === 'scraping' ? <><span className="spinner" /> Scraping…</> : '🚀 Scrape & Index Website'}
              </button>
            </div>
          </div>

          {/* Right: Logs + Preview */}
          <div className="register-side-col">
            {logs.length > 0 && (
              <div className="card log-card">
                <h3 className="log-title">Scrape Log</h3>
                <div className="log-body">
                  {logs.map((l, i) => (
                    <div key={i} className="log-line">
                      <span className="log-time">{l.time}</span>
                      <span>{l.msg}</span>
                    </div>
                  ))}
                  {step === 'scraping' && <div className="log-line"><span className="spinner" style={{ width: 12, height: 12 }} /></div>}
                </div>
              </div>
            )}

            <div className="card preview-card">
              <h3 className="log-title">Embed Snippet Preview</h3>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>This snippet will go on your client's website.</p>
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
          onAddAnother={() => { setStep('form'); setUrl(''); setWebsiteId(''); setIdTouched(false); setLogs([]); setResult(null) }}
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
    <div className="done-screen fade-in">
      <div className="done-hero">
        <div className="done-check">✅</div>
        <h2>Website Indexed Successfully!</h2>
        <p>{result.pagesScraped} pages scraped · {result.chunksStored} chunks stored</p>
        <div className="badge badge-purple mono" style={{ marginTop: 8 }}>ID: {websiteId}</div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Your Embed Snippet</h3>
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre className="code-block">{embedSnippet}</pre>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10 }}>
          Paste this just before the <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>&lt;/body&gt;</code> tag on your client's website.
        </p>
      </div>

      <div className="done-actions">
        <button className="btn btn-primary btn-lg" onClick={onManage}>Manage This Site →</button>
        <button className="btn btn-ghost" onClick={onAddAnother}>+ Add Another Website</button>
      </div>
    </div>
  )
}