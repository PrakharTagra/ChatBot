import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ManageSite.css'
import { SCRAPER_API, RENDER_API } from '../config'

export default function ManageSite() {
  const { websiteId } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('embed') 
  const [copied, setCopied] = useState(false)
  const [backendOk, setBackendOk] = useState(null) 

  const [newUrl, setNewUrl] = useState('')
  const [mongoUri, setMongoUri] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [scrapeError, setScrapeError] = useState('')

  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: `👋 Hi! Ask me anything — I'll search the indexed content for "${websiteId}".` }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const chatHistoryRef = useRef([])

  useEffect(() => {
    if (tab === 'test' && backendOk === null) checkBackend()
  }, [tab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function checkBackend() {
    try {
      await axios.get(`${RENDER_API}/api/health`, { timeout: 5000 })
      setBackendOk(true)
    } catch {
      setBackendOk(false)
    }
  }

  async function handleRescrape() {
    if (!newUrl.trim()) { setScrapeError('Enter the website URL to scrape.'); return }
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
    } catch (e) {
      setScrapeError(e.response?.data?.error || e.message)
    } finally {
      setScraping(false)
    }
  }

  async function sendChatMessage() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')

    const userMsg = { role: 'user', text: msg }
    setChatMessages(prev => [...prev, userMsg])

    const history = chatHistoryRef.current.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text
    }))
    chatHistoryRef.current = [...chatHistoryRef.current, userMsg]

    setChatLoading(true)
    try {
      const res = await axios.post(`${RENDER_API}/api/chat`, {
        message: msg,
        websiteId,
        history: history.slice(-6)
      })
      const { answer, source, confident, contactUrl } = res.data

      let sourceLabel = null
      if (source) {
        try { sourceLabel = new URL(source).pathname || source } catch { sourceLabel = source }
      }

      const botMsg = {
        role: 'bot',
        text: answer,
        source,
        sourceLabel,
        confident,
        contactUrl,
      }
      setChatMessages(prev => [...prev, botMsg])
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'bot', text: answer }]
    } catch (e) {
      const errMsg = { role: 'bot', text: '❌ Error: ' + (e.response?.data?.error || e.message) }
      setChatMessages(prev => [...prev, errMsg])
    } finally {
      setChatLoading(false)
    }
  }

  const embedSnippet = `<!-- CogniSite AI Autonomous Widget -->
<script src="${RENDER_API}/widget/chat-widget.js" defer></script>
<script defer>
  document.addEventListener("DOMContentLoaded", function() {
    ChatWidget.init({
      websiteId: "${websiteId}",
      apiUrl: "${RENDER_API}",
      title: "Knowledge Assistant",
      welcomeMessage: "👋 Welcome! How may I assist you with information regarding ${websiteId}?",
      primaryColor: "#6366f1"
    });
  });
</script>`

  function copy() {
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="manage-page fade-in">
      <div className="manage-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Fleet Overview</button>
        <div>
          <h2 className="manage-title">Knowledge Base: <span className="mono accent">{websiteId}</span></h2>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'embed', label: '📋 CDN Embed Code' },
          { id: 'test', label: '💬 Agent Studio' },
          { id: 'rescrape', label: '🔄 Ingestion Re-Sync' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">

        {}
        {tab === 'embed' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Embed on Any Website</h3>
                <p>Paste this snippet just before the <code>&lt;/body&gt;</code> tag on your client's website.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={copy}>
                {copied ? '✅ Copied!' : '📋 Copy Snippet'}
              </button>
            </div>
            <pre className="code-block">{embedSnippet}</pre>

            <div className="divider" />
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Advanced Options</h4>
            <pre className="code-block">{`<!-- ChatAgent Widget -->
<script src="${RENDER_API}/widget/chat-widget.js" defer></script>
<script defer>
  document.addEventListener("DOMContentLoaded", function() {
    ChatWidget.init({
      websiteId: "${websiteId}",
      apiUrl: "${RENDER_API}",
      title: "Website Assistant",
      welcomeMessage: "Hi! How can I help?",
      primaryColor: "#6c63ff",
      position: "bottom-right"
    });
  });
</script>`}</pre>
          </div>
        )}

        {}
        {/* Live Test Tab */}
        {tab === 'test' && (
          <div className="card fade-in chat-test-card">
            <div className="tab-header">
              <div>
                <h3>Live Chat Playground: {websiteId}</h3>
                <p>Test AI responses against the indexed content for <strong>{websiteId}</strong>.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/test?site=${websiteId}`)}
                  style={{ color: 'var(--accent3)' }}
                >
                  ⚡ Open Full Studio
                </button>
                {backendOk === null && <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>⏳ Checking…</span>}
                {backendOk === true && <span className="badge badge-green">● Connected</span>}
                {backendOk === false && <span className="badge" style={{ background: '#3d1a1a', color: '#f87171' }}>● Backend down</span>}
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, overflowX: 'auto', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', alignSelf: 'center', whiteSpace: 'nowrap' }}>✨ Quick Prompts:</span>
              {['What services do you provide?', 'How can I get in touch?', 'Where are you based?'].map((chip, idx) => (
                <button
                  key={idx}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '4px 10px', height: 'auto', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setChatInput(chip)
                    setTimeout(() => {
                      const inputElem = document.querySelector('.chat-input-row input')
                      if (inputElem) inputElem.focus()
                    }, 50)
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="chat-window">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-msg chat-msg--${m.role}`}>
                  <div className="chat-bubble">
                    {m.text}
                    {m.sourceLabel && (
                      <a href={m.source} target="_blank" rel="noopener noreferrer" className="chat-source">
                        🔗 {m.sourceLabel}
                      </a>
                    )}
                    {m.contactUrl && (
                      <div style={{ marginTop: 8 }}>
                        <a href={m.contactUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                            background: 'var(--accent)', color: '#fff', borderRadius: 20,
                            fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          ✉️ Contact Us
                        </a>
                      </div>
                    )}
                    {m.confident === false && (
                      <div className="chat-label">⚠️ Low confidence — contact page available</div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="chat-msg chat-msg--bot">
                  <div className="chat-bubble typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-row">
              <input
                className="input"
                placeholder="Ask something about this website…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                disabled={chatLoading}
              />
              <button className="btn btn-primary" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* Re-scrape Tab */}
        {tab === 'rescrape' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Re-scrape Website</h3>
                <p>Run a fresh crawl to update the indexed content. Old chunks will be replaced.</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: 8,
              padding: 14,
              fontSize: 13,
              marginBottom: 18,
              lineHeight: 1.5,
              maxWidth: 560
            }}>
              <strong style={{ color: 'var(--accent3)', display: 'block', marginBottom: 4 }}>
                🛡️ Enterprise Ingestion Agent Protocol:
              </strong>
              Dynamic crawling is managed by your decoupled worker agent (Playwright/Crawlee) to ensure firewalled JS rendering without overloading real-time chat APIs. Verify your ingestion worker is active:
              <pre style={{
                background: 'var(--bg)',
                padding: '8px 12px',
                borderRadius: 6,
                marginTop: 8,
                fontSize: 12,
                fontFamily: 'DM Mono, monospace',
                color: 'var(--text)'
              }}>cd backend/local-scraper && npm run dev</pre>
            </div>

            <div className="field" style={{ maxWidth: 480 }}>
              <label>Website URL</label>
              <input
                className="input"
                type="url"
                placeholder="https://yourwebsite.com"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                disabled={scraping}
              />
            </div>

            <div className="field" style={{ maxWidth: 480 }}>
              <label>MongoDB Connection URI <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(optional)</span></label>
              <input
                className="input mono"
                type="password"
                placeholder="Leave blank to keep the existing lead-capture URI"
                value={mongoUri}
                onChange={e => setMongoUri(e.target.value)}
                disabled={scraping}
              />
              <p className="field-hint">Re-scraping keeps whatever URI is already saved for this site. Only fill this in if you want to change it.</p>
            </div>

            {scrapeError && (
              <div className="error-box" style={{ maxWidth: 480, marginBottom: 12 }}>
                ⚠️ {scrapeError.includes('Network Error') ? 'Local scraper worker not detected on http://localhost:5000. Run the command above first.' : scrapeError}
              </div>
            )}

            {scrapeResult && (
              <div className="success-box" style={{ maxWidth: 480, marginBottom: 12 }}>
                ✅ Done — {scrapeResult.pagesScraped} pages, {scrapeResult.chunksStored} chunks stored.
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleRescrape}
              disabled={scraping}
            >
              {scraping ? <><span className="spinner" /> Scraping…</> : '🔄 Start Re-scrape'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}