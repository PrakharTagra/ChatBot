import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ManageSite.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ManageSite() {
  const { websiteId } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('embed') // embed | test | leads | rescrape
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Re-scrape state
  const [newUrl, setNewUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [scrapeError, setScrapeError] = useState('')

  // Live test chat
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: `👋 Hi! Ask me anything and I'll search the content indexed for "${websiteId}".` }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (tab === 'leads') fetchLeads()
  }, [tab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function fetchLeads() {
    setLeadsLoading(true)
    try {
      const res = await axios.get(`${API}/api/leads/${websiteId}`)
      setLeads(res.data.leads || [])
    } catch { setLeads([]) }
    finally { setLeadsLoading(false) }
  }

  async function handleRescrape() {
    if (!newUrl.trim()) { setScrapeError('Enter the website URL to scrape.'); return }
    setScraping(true)
    setScrapeResult(null)
    setScrapeError('')
    try {
      const res = await axios.post(`${API}/api/scrape`, { url: newUrl, websiteId })
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
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await axios.post(`${API}/api/chat`, { message: msg, websiteId })
      const { answer, source, confident } = res.data
      setChatMessages(prev => [...prev, {
        role: 'bot',
        text: answer,
        source,
        confident,
        label: confident ? null : 'Low confidence — contact form would appear'
      }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: '❌ Error: ' + (e.response?.data?.error || e.message) }])
    } finally {
      setChatLoading(false)
    }
  }

  const embedSnippet = `<script src="${API}/widget/chat-widget.js"></script>
<script>
  ChatWidget.init({
    websiteId: "${websiteId}",
    apiUrl: "${API}"
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
          { id: 'leads', label: '📥 Leads' },
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
            <pre className="code-block">{`ChatWidget.init({
  websiteId: "${websiteId}",
  apiUrl: "${API}",
  title: "Website Assistant",          // Chat header title
  welcomeMessage: "Hi! How can I help?", // Opening message
  primaryColor: "#6c63ff",             // Widget accent color
  position: "bottom-right"             // or "bottom-left"
});`}</pre>
          </div>
        )}

        {/* ── Live Test Tab ── */}
        {tab === 'test' && (
          <div className="card fade-in chat-test-card">
            <div className="tab-header">
              <div>
                <h3>Live Chat Test</h3>
                <p>Test the AI responses directly here before embedding on a site.</p>
              </div>
              <span className="badge badge-green">● Connected</span>
            </div>

            <div className="chat-window">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-msg chat-msg--${m.role}`}>
                  <div className="chat-bubble">
                    {m.text}
                    {m.source && (
                      <a href={m.source} target="_blank" rel="noopener noreferrer" className="chat-source">
                        🔗 {m.source}
                      </a>
                    )}
                    {m.label && <div className="chat-label">{m.label}</div>}
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

        {/* ── Leads Tab ── */}
        {tab === 'leads' && (
          <div className="card fade-in">
            <div className="tab-header">
              <div>
                <h3>Captured Leads</h3>
                <p>Contact form submissions from users who couldn't find answers.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchLeads}>↻ Refresh</button>
            </div>

            {leadsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--text2)' }}>
                <div className="spinner" /> Loading leads…
              </div>
            ) : leads.length === 0 ? (
              <div className="empty-leads">
                <span style={{ fontSize: 32 }}>📭</span>
                <p>No leads yet. They'll appear here when users submit the contact form.</p>
              </div>
            ) : (
              <div className="leads-table-wrap">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => (
                      <tr key={i}>
                        <td>{lead.name}</td>
                        <td><a href={`mailto:${lead.email}`} className="lead-email">{lead.email}</a></td>
                        <td>{lead.phone || '—'}</td>
                        <td className="lead-msg" title={lead.message}>{lead.message}</td>
                        <td className="lead-date">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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