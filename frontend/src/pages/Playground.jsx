import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Send,
  User,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Copy,
  ChevronDown,
  Globe,
  Database,
  Sliders,
  Settings2,
  Save,
  MessageSquare
} from 'lucide-react'
import { RENDER_API, getChatbotConfig, saveChatbotConfig, getScrapedSites } from '../config'
import './Playground.css'

function formatDisplayName(raw) {
  if (!raw) return 'Assistant'
  let name = raw
    .replace(/\.(com|org|net|app|io|dev|in|co|tech)$/i, '')
    .replace(/[-_](com|org|net|app|io|dev|in|co|tech|vercel)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  name = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b([a-z])(\d+)([a-z]?)\b/gi, (m, p1, p2, p3) => p1.toUpperCase() + p2 + (p3 || '').toUpperCase())
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function renderFormattedMessage(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const content = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    const isBullet = line.trim().startsWith('•')

    return (
      <div key={idx} style={{ marginBottom: isBullet ? '6px' : (line.trim() === '' ? '8px' : '2px') }}>
        {content}
      </div>
    )
  })
}

export default function Playground() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site') || ''

  const [availableSites, setAvailableSites] = useState(() => getScrapedSites())
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId || '')
  const [loadingSites, setLoadingSites] = useState(true)

  // Derived selected site - always guaranteed synchronous with availableSites & selectedSiteId
  const selectedSite = availableSites.find(s => s.websiteId === selectedSiteId) || availableSites[0] || null

  // Chatbot configuration per website
  const [botConfig, setBotConfig] = useState(() => getChatbotConfig(selectedSite?.websiteId || ''))
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editWelcome, setEditWelcome] = useState('')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastLatency, setLastLatency] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const chatEndRef = useRef(null)
  const historyRef = useRef([])

  function resetConversation(site = selectedSite, config = botConfig) {
    historyRef.current = []
    setLastLatency(null)
    setMessages([
      {
        id: 'init-msg',
        role: 'bot',
        text: config?.welcomeMessage || `Hello. How can I help you with ${site?.name || site?.websiteId || 'this website'} today?`,
        confident: true,
        source: null,
        latency: null
      }
    ])
  }

  // Fetch available sites from API and merge with locally registered sites
  useEffect(() => {
    async function loadSites() {
      setLoadingSites(true)
      try {
        const res = await axios.get(`${RENDER_API}/api/sites`, { timeout: 6000 }).catch(() => ({ data: { sites: [] } }))
        const apiSites = (res.data?.sites || []).map(s => {
          const cfg = getChatbotConfig(s.websiteId)
          return {
            websiteId: s.websiteId,
            name: cfg.title || formatDisplayName(s.websiteId),
            url: s.url || `https://${s.websiteId}.com`,
            chunks: s.chunks ?? 0,
            lastSync: s.lastScraped || null,
            description: `Knowledge base for ${formatDisplayName(s.websiteId)}`,
            sampleQuestions: [
              'What core services or products are offered?',
              'How can I get in touch with your team?',
              'Where can I find pricing details?',
              'Where are you located?'
            ]
          }
        })

        const localSites = getScrapedSites().map(s => ({
          websiteId: s.websiteId,
          name: s.name || formatDisplayName(s.websiteId),
          url: s.url || `https://${s.websiteId}.com`,
          chunks: s.chunks ?? 0,
          lastSync: s.lastSync || null,
          description: s.description || `Knowledge base for ${formatDisplayName(s.websiteId)}`,
          sampleQuestions: [
            'What core services or products are offered?',
            'How can I get in touch with your team?',
            'Where can I find pricing details?',
            'Where are you located?'
          ]
        }))

        const map = new Map()
        apiSites.forEach(s => map.set(s.websiteId, s))
        localSites.forEach(s => {
          if (!map.has(s.websiteId)) map.set(s.websiteId, s)
        })

        const combined = Array.from(map.values())
        setAvailableSites(combined)

        if (combined.length > 0) {
          const target = initialSiteId && combined.some(s => s.websiteId === initialSiteId)
            ? initialSiteId
            : (selectedSiteId && combined.some(s => s.websiteId === selectedSiteId) ? selectedSiteId : combined[0].websiteId)
          setSelectedSiteId(target)
        }
      } catch {
        const localSites = getScrapedSites()
        setAvailableSites(localSites)
        if (localSites.length > 0) {
          const target = initialSiteId && localSites.some(s => s.websiteId === initialSiteId)
            ? initialSiteId
            : localSites[0].websiteId
          setSelectedSiteId(target)
        }
      } finally {
        setLoadingSites(false)
      }
    }
    loadSites()
  }, [initialSiteId])

  // Synchronize chatbot branding whenever selected site changes
  useEffect(() => {
    if (!selectedSite) return

    const cfg = getChatbotConfig(selectedSite.websiteId, selectedSite)
    setBotConfig(cfg)
    setEditTitle(cfg.title || `${selectedSite.name} Assistant`)
    setEditColor(cfg.primaryColor || '#0f172a')
    setEditLogo(cfg.logoUrl || '')
    setEditWelcome(cfg.welcomeMessage || `Hello. How can I assist you with ${selectedSite.name}?`)

    resetConversation(selectedSite, cfg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite?.websiteId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSaveCustomization() {
    if (!selectedSite) return
    const siteName = selectedSite.name || selectedSite.websiteId
    const updated = {
      title: editTitle.trim() || `${siteName} Assistant`,
      primaryColor: editColor || '#0f172a',
      logoUrl: editLogo.trim(),
      welcomeMessage: editWelcome.trim() || `Hello. How can I assist you with ${siteName}?`
    }
    setBotConfig(updated)
    saveChatbotConfig(selectedSite.websiteId, updated)
    setIsCustomizing(false)
    resetConversation(selectedSite, updated)
  }

  async function handleSend(promptText = null) {
    const textToSend = typeof promptText === 'string' ? promptText : input.trim()
    if (!textToSend || loading || !selectedSite) return

    setInput('')
    const userMsgId = 'u-' + Date.now()
    const userMsg = { id: userMsgId, role: 'user', text: textToSend }

    setMessages(prev => [...prev, userMsg])

    const formattedHistory = historyRef.current.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text
    }))
    historyRef.current = [...historyRef.current, userMsg]

    setLoading(true)
    const startTime = performance.now()

    try {
      const res = await axios.post(`${RENDER_API}/api/chat`, {
        message: textToSend,
        websiteId: selectedSite.websiteId,
        websiteName: selectedSite.name,
        history: formattedHistory.slice(-6)
      })

      const elapsed = Math.round(performance.now() - startTime)
      setLastLatency(elapsed)

      const { answer, source, confident, action } = res.data

      let sourceLabel = null
      if (source) {
        try {
          const u = new URL(source)
          sourceLabel = u.pathname + (u.hash || '')
        } catch {
          sourceLabel = source
        }
      }

      const botMsg = {
        id: 'b-' + Date.now(),
        role: 'bot',
        text: answer,
        source,
        sourceLabel,
        confident,
        action,
        latency: elapsed
      }

      setMessages(prev => [...prev, botMsg])
      historyRef.current = [...historyRef.current, { role: 'bot', text: answer }]
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime)
      const errorMsg = {
        id: 'err-' + Date.now(),
        role: 'bot',
        text: 'Error connecting to service. ' + (err.response?.data?.error || err.message),
        confident: false,
        latency: elapsed
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  function copyText(id, text) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loadingSites) {
    return (
      <div className="dash-loading" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <span>Loading knowledge bases...</span>
      </div>
    )
  }

  if (availableSites.length === 0 || !selectedSite) {
    return (
      <div className="playground-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: 460, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MessageSquare size={22} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            No Indexed Websites Found
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            To test a chatbot, first crawl and index a website using the local scraper. Once completed, your custom chatbot and live testing sandbox will appear here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>
            <Globe size={14} /> Index Your First Website
          </button>
        </div>
      </div>
    )
  }

  const primaryColor = botConfig.primaryColor || '#0f172a'
  const siteName = selectedSite?.name || selectedSite?.websiteId || 'Website'

  return (
    <div className="playground-container fade-in">
      {/* Target Selector & Settings Bar */}
      <div className="playground-header-card card">
        <div className="site-select-group">
          <label className="select-label">Selected Website</label>
          <div className="custom-select-wrapper">
            <select
              value={selectedSiteId}
              onChange={e => {
                setSelectedSiteId(e.target.value)
                setSearchParams({ site: e.target.value })
              }}
              className="site-select-input"
            >
              {availableSites.map(s => (
                <option key={s.websiteId} value={s.websiteId}>
                  {s.name} ({s.chunks} chunks)
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="site-meta-badges">
          <button
            className={`btn btn-sm ${isCustomizing ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Settings2 size={13} />
            <span>Customize Chatbot</span>
          </button>

          <a
            href={selectedSite?.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <Globe size={13} />
            <span className="btn-label-desktop">Visit Site</span>
            <ExternalLink size={10} />
          </a>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => resetConversation()}
            title="Reset conversation"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Chatbot Customizer Panel */}
      {isCustomizing && (
        <div className="bot-customizer-card card fade-in">
          <div className="customizer-header">
            <h4>Customize Chatbot for {siteName}</h4>
            <span className="customizer-sub">Changes apply immediately to this website's chatbot widget.</span>
          </div>

          <div className="customizer-grid">
            <div className="field">
              <label>Chatbot Title</label>
              <input
                type="text"
                className="input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="e.g. Acme Assistant"
              />
            </div>

            <div className="field">
              <label>Theme Color</label>
              <div className="color-input-wrap">
                <input
                  type="color"
                  className="color-picker-input"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                />
                <input
                  type="text"
                  className="input mono"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  placeholder="#0f172a"
                />
              </div>
            </div>

            <div className="field">
              <label>Logo URL (Optional)</label>
              <input
                type="url"
                className="input"
                value={editLogo}
                onChange={e => setEditLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="field full-width">
              <label>Welcome Message</label>
              <input
                type="text"
                className="input"
                value={editWelcome}
                onChange={e => setEditWelcome(e.target.value)}
                placeholder="Initial greeting shown to visitors"
              />
            </div>
          </div>

          <div className="customizer-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSaveCustomization}>
              <Save size={13} /> Save Chatbot Branding
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsCustomizing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Custom Chatbot Display + Telemetry */}
      <div className="playground-main-grid">
        {/* Customized Chatbot Container */}
        <div className="chat-arena card">
          {/* Branded Chatbot Header */}
          <div className="arena-header" style={{ borderTop: `3px solid ${primaryColor}` }}>
            <div className="arena-brand-info">
              {botConfig.logoUrl ? (
                <img
                  src={botConfig.logoUrl}
                  alt=""
                  className="bot-header-logo"
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="bot-header-avatar" style={{ backgroundColor: primaryColor }}>
                  <MessageSquare size={14} color="#ffffff" />
                </div>
              )}
              <div>
                <strong className="bot-header-title">{botConfig.title || siteName}</strong>
                <span className="bot-header-subtitle">{siteName} Support</span>
              </div>
            </div>

            <div className="header-status-pill">
              <span className="live-dot" />
              <span>Online</span>
            </div>
          </div>

          {/* Quick Questions Bar */}
          <div className="quick-prompts-bar">
            <span className="prompts-label">Questions:</span>
            <div className="prompts-scroll">
              {(selectedSite?.sampleQuestions || []).map((q, idx) => (
                <button
                  key={idx}
                  className="prompt-chip"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Message Stream */}
          <div className="playground-messages">
            {messages.map(m => (
              <div key={m.id} className={`p-msg p-msg--${m.role}`}>
                <div className="msg-avatar">
                  {m.role === 'bot' ? (
                    botConfig.logoUrl ? (
                      <img src={botConfig.logoUrl} alt="" className="msg-logo-img" onError={e => { e.target.style.display = 'none' }} />
                    ) : (
                      <div className="msg-bot-dot" style={{ backgroundColor: primaryColor }} />
                    )
                  ) : (
                    <User size={13} />
                  )}
                </div>

                <div className="msg-bubble-wrap">
                  <div
                    className="msg-bubble"
                    style={m.role === 'user' ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                  >
                    <div className="msg-text">{renderFormattedMessage(m.text)}</div>

                    {m.source && (
                      <div className="source-citation">
                        <span className="citation-title">Source:</span>
                        <a
                          href={m.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="citation-link"
                        >
                          <ExternalLink size={10} /> {m.sourceLabel || m.source}
                        </a>
                      </div>
                    )}

                    {m.confident === false && (
                      <div className="low-confidence-notice">
                        <AlertTriangle size={12} />
                        <span>Content not found in index. Support contact requested.</span>
                      </div>
                    )}
                  </div>

                  <div className="msg-meta">
                    {m.latency && (
                      <span className="latency-tag">
                        <Clock size={11} /> {m.latency}ms
                      </span>
                    )}
                    {m.confident !== undefined && (
                      <span className={`confidence-tag ${m.confident ? 'high' : 'low'}`}>
                        {m.confident ? 'Verified' : 'Fallback'}
                      </span>
                    )}
                    <button
                      className="copy-msg-btn"
                      onClick={() => copyText(m.id, m.text)}
                      title="Copy response"
                    >
                      {copiedId === m.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="p-msg p-msg--bot">
                <div className="msg-avatar">
                  <div className="msg-bot-dot" style={{ backgroundColor: primaryColor }} />
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble typing-bubble">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <div className="msg-meta">
                    <span className="latency-tag">Retrieving content...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="playground-input-row">
            <input
              type="text"
              className="playground-input"
              placeholder={`Ask ${botConfig.title || siteName}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button
              className="btn btn-primary send-btn"
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right: Technical Inspector */}
        <div className="telemetry-sidebar card">
          <h3 className="telemetry-title">System Status</h3>

          <div className="telemetry-metric-group">
            <div className="telemetry-box">
              <span className="tel-label">Latency</span>
              <span className="tel-val">
                {lastLatency !== null ? `${lastLatency} ms` : '—'}
              </span>
              <span className="tel-sub">Real-time search</span>
            </div>

            <div className="telemetry-box">
              <span className="tel-label">Vector Space</span>
              <span className="tel-val">Cosine Distance</span>
              <span className="tel-sub">Top 6 chunks retrieved</span>
            </div>
          </div>

          <div className="divider" />

          <h4 className="inspector-heading">Active Chatbot Theme</h4>
          <div className="theme-summary-box">
            <div className="theme-summary-row">
              <span className="ts-label">Brand Color:</span>
              <div className="ts-color-indicator">
                <span className="color-preview" style={{ backgroundColor: primaryColor }} />
                <span className="ts-val mono">{primaryColor}</span>
              </div>
            </div>
            <div className="theme-summary-row">
              <span className="ts-label">Title:</span>
              <span className="ts-val">{botConfig.title}</span>
            </div>
          </div>

          <div className="divider" />

          <div className="site-summary-box">
            <strong className="summary-name">{siteName}</strong>
            <p className="summary-desc">{selectedSite?.description || `Knowledge base for ${siteName}`}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
