import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ManageSite.css'
import { SCRAPER_API, RENDER_API } from '../config'

export default function ManageSite() {
  const { websiteId } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('embed') // embed | test | rescrape
  const [copied, setCopied] = useState(false)
  const [backendOk, setBackendOk] = useState(null) // null=checking, true=ok, false=down

  // Re-scrape state
  const [newUrl, setNewUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [scrapeError, setScrapeError] = useState('')

  // Live test chat
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: `👋 Hi! Ask me anything — I'll search the indexed content for "${websiteId}".` }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  // Keep a ref of messages for history so sendChatMessage always has the latest
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
      const res = await axios.post(`${SCRAPER_API}/api/scrape`, { url: newUrl, websiteId })
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

    // Build history from ref (excludes the welcome message)
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

      // Show clean source path, not full URL
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

  const embedSnippet = `<!-- ChatAgent Widget -->
<script src="${RENDER_API}/widget/chat-widget.js" defer></script>
<script defer>
  document.addEventListener("DOMContentLoaded", function() {
    ChatWidget.init({
      websiteId: "${websiteId}",
      apiUrl: "${RENDER_API}",
      title: "Website Assistant",
      welcomeMessage: "👋 Hi! I can answer questions about this website. What would you like to know?",
      primaryColor: "#6c63ff"
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
        <div>
          <h2 className="manage-title">Managing: <span className="mono accent">{websiteId}</span></h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'embed', label: '📋 Embed Code' },
          { id: 'test', label: '💬 Live Test' },
          { id: 'rescrape', label: '🔄 Re-scrape' },
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

        {/* ── Embed Tab ── */}
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

        {/* ── Live Test Tab ── */}
        {tab === 'test' && (
          <div className="card fade-in chat-test-card">
            <div className="tab-header">
              <div>
                <h3>Live Chat Test</h3>
                <p>Test AI responses against the indexed content for <strong>{websiteId}</strong>.</p>
              </div>
              {backendOk === null && <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>⏳ Checking…</span>}
              {backendOk === true && <span className="badge badge-green">● Connected</span>}
              {backendOk === false && <span className="badge" style={{ background: '#3d1a1a', color: '#f87171' }}>● Backend down</span>}
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

        {/* ── Re-scrape Tab ── */}
        {tab === 'rescrape' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Re-scrape Website</h3>
                <p>Run a fresh crawl to update the indexed content. Old chunks will be replaced.</p>
              </div>
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

            {scrapeError && <div className="error-box" style={{ maxWidth: 480, marginBottom: 12 }}>⚠️ {scrapeError}</div>}

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