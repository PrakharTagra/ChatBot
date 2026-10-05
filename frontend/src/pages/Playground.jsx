import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Copy,
  Layers,
  ChevronDown,
  Globe,
  Database,
  MessageSquare
} from 'lucide-react'
import { RENDER_API, SHOWCASE_SITES } from '../config'
import './Playground.css'

export default function Playground() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site') || 'd2itechnology'

  const [availableSites, setAvailableSites] = useState(SHOWCASE_SITES)
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId)
  const [selectedSite, setSelectedSite] = useState(
    SHOWCASE_SITES.find(s => s.websiteId === initialSiteId) || SHOWCASE_SITES[0]
  )

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastLatency, setLastLatency] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [viewMode, setViewMode] = useState('studio') // 'studio' | 'widget'

  const chatEndRef = useRef(null)
  const historyRef = useRef([])

  function resetConversation(site = selectedSite) {
    historyRef.current = []
    setLastLatency(null)
    setMessages([
      {
        id: 'init-msg',
        role: 'bot',
        text: `👋 Hello! I am the grounded AI Assistant for **${site?.name || site?.websiteId}**. I strictly answer questions using content indexed into ChromaDB Cloud. Ask me anything or click a sample question below!`,
        confident: true,
        source: null,
        latency: null
      }
    ])
  }

  // Fetch available sites from API and merge with showcase
  useEffect(() => {
    async function loadSites() {
      try {
        const res = await axios.get(`${RENDER_API}/api/sites`, { timeout: 6000 })
        if (res.data?.sites && res.data.sites.length > 0) {
          const apiSites = res.data.sites.map(s => {
            const showcaseMatch = SHOWCASE_SITES.find(sc => sc.websiteId === s.websiteId)
            return {
              websiteId: s.websiteId,
              name: showcaseMatch?.name || s.websiteId,
              url: s.url || showcaseMatch?.url || `https://${s.websiteId}.com`,
              chunks: s.chunks ?? showcaseMatch?.chunks ?? 0,
              lastScraped: s.lastScraped || showcaseMatch?.lastScraped,
              description: showcaseMatch?.description || 'Indexed website knowledge base',
              sampleQuestions: showcaseMatch?.sampleQuestions || [
                'What is this website about?',
                'What products or services are offered?',
                'How can I get in touch?',
                'Where are you located?'
              ]
            }
          })

          // Add any showcase sites not yet returned by API
          const combined = [...apiSites]
          SHOWCASE_SITES.forEach(sc => {
            if (!combined.some(c => c.websiteId === sc.websiteId)) {
              combined.push(sc)
            }
          })
          setAvailableSites(combined)
        }
      } catch {
        // Fallback gracefully to SHOWCASE_SITES
        setAvailableSites(SHOWCASE_SITES)
      }
    }
    loadSites()
  }, [])

  // Update selected site when dropdown or URL params change
  useEffect(() => {
    const site = availableSites.find(s => s.websiteId === selectedSiteId) || availableSites[0]
    setSelectedSite(site)
    resetConversation(site)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, availableSites])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(promptText = null) {
    const textToSend = typeof promptText === 'string' ? promptText : input.trim()
    if (!textToSend || loading) return

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
        text: '❌ Could not retrieve answer from Render API. ' + (err.response?.data?.error || err.message),
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

  return (
    <div className="playground-container fade-in">
      {/* Top Header / Site Switcher Bar */}
      <div className="playground-header-card card">
        <div className="site-select-group">
          <div className="site-select-label">
            <Database size={16} className="text-teal" />
            <span>Target Knowledge Base:</span>
          </div>
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
                  {s.name} ({s.websiteId}) — {s.chunks} chunks
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="site-meta-badges">
          <span className="badge badge-purple mono">
            <Layers size={13} /> {selectedSite.chunks} Vector Chunks
          </span>
          <a
            href={selectedSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="badge badge-ghost site-link-badge"
          >
            <Globe size={13} /> Visit Site <ExternalLink size={11} />
          </a>
          <button
            className="btn btn-ghost btn-sm reset-btn"
            onClick={() => resetConversation()}
            title="Reset conversation"
          >
            <RotateCcw size={14} /> Clear Chat
          </button>
        </div>
      </div>

      {/* Main Grid: Chat Arena + Telemetry Inspector */}
      <div className="playground-main-grid">
        {/* Left / Center: Interactive Chat Arena */}
        <div className="chat-arena card">
          <div className="arena-header">
            <div className="arena-status">
              <span className="live-dot" />
              <div>
                <strong>{selectedSite.name}</strong>
                <small>Groq Llama 3.1 8B Instant · ChromaDB Cloud</small>
              </div>
            </div>

            <div className="arena-controls">
              <button
                className={`mode-toggle-btn ${viewMode === 'studio' ? 'active' : ''}`}
                onClick={() => setViewMode('studio')}
              >
                Studio View
              </button>
              <button
                className={`mode-toggle-btn ${viewMode === 'widget' ? 'active' : ''}`}
                onClick={() => setViewMode('widget')}
              >
                Widget Simulation
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="quick-prompts-bar">
            <span className="prompts-label">
              <Sparkles size={13} className="text-warn" /> Quick Prompts:
            </span>
            <div className="prompts-scroll">
              {(selectedSite.sampleQuestions || []).map((q, idx) => (
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

          {/* Chat Messages Window */}
          <div className={`playground-messages ${viewMode === 'widget' ? 'widget-style' : ''}`}>
            {messages.map(m => (
              <div key={m.id} className={`p-msg p-msg--${m.role}`}>
                <div className="msg-avatar">
                  {m.role === 'bot' ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div className="msg-bubble-wrap">
                  <div className="msg-bubble">
                    <p className="msg-text">{m.text}</p>

                    {/* Source Attribution */}
                    {m.source && (
                      <div className="source-citation">
                        <span className="citation-title">Grounded Source:</span>
                        <a
                          href={m.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="citation-link"
                        >
                          <ExternalLink size={12} /> {m.sourceLabel || m.source}
                        </a>
                      </div>
                    )}

                    {/* Low Confidence Trigger / Fallback Warning */}
                    {m.confident === false && (
                      <div className="low-confidence-notice">
                        <AlertTriangle size={14} />
                        <span>Low retrieval confidence — Triggered lead capture sentinel</span>
                      </div>
                    )}
                  </div>

                  {/* Message Meta Info */}
                  <div className="msg-meta">
                    {m.latency && (
                      <span className="latency-tag">
                        <Clock size={11} /> {m.latency}ms
                      </span>
                    )}
                    {m.confident !== undefined && (
                      <span className={`confidence-tag ${m.confident ? 'high' : 'low'}`}>
                        {m.confident ? (
                          <>
                            <ShieldCheck size={11} /> Grounded
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={11} /> Unconfident
                          </>
                        )}
                      </span>
                    )}
                    <button
                      className="copy-msg-btn"
                      onClick={() => copyText(m.id, m.text)}
                      title="Copy response"
                    >
                      {copiedId === m.id ? <CheckCircle2 size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="p-msg p-msg--bot">
                <div className="msg-avatar">
                  <Bot size={16} />
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble typing-bubble">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <div className="msg-meta">
                    <span className="latency-tag">
                      <Clock size={11} /> Querying Chroma Cloud + Groq...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="playground-input-row">
            <input
              type="text"
              className="playground-input"
              placeholder={`Ask anything about ${selectedSite.name}... (e.g., services, contact, details)`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button
              className="btn btn-primary send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send size={15} />
              <span>Ask</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar: Real-time RAG Telemetry & System Specs */}
        <div className="telemetry-sidebar card">
          <h3 className="telemetry-title">
            <ShieldCheck size={16} className="text-teal" /> RAG Telemetry & Grounding
          </h3>

          <div className="telemetry-metric-group">
            <div className="telemetry-box">
              <span className="tel-label">Latest Latency</span>
              <span className="tel-val highlight-val">
                {lastLatency !== null ? `${lastLatency} ms` : 'Idle'}
              </span>
              <small className="tel-sub">Groq LPU Acceleration</small>
            </div>

            <div className="telemetry-box">
              <span className="tel-label">Vector Match</span>
              <span className="tel-val">Cosine Similarity</span>
              <small className="tel-sub">Top 6 Chunks Threshold: 0.35</small>
            </div>
          </div>

          <div className="divider" />

          <h4 className="inspector-heading">Grounding Rules Active</h4>
          <ul className="spec-list">
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Strict Zero-Shot:</strong> LLM cannot use outside training facts.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>NOT_IN_CONTEXT Sentinel:</strong> Verified server-side before delivery.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Heading Anchors:</strong> Deep links directly to section anchors.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Tenant Isolation:</strong> Dedicated Chroma Cloud collection.</span>
            </li>
          </ul>

          <div className="divider" />

          <div className="site-summary-box">
            <div className="summary-header">
              <Globe size={14} className="text-accent" />
              <strong>{selectedSite.name}</strong>
            </div>
            <p className="summary-desc">{selectedSite.description}</p>
            <div className="summary-chips">
              <span className="badge badge-purple">{selectedSite.websiteId}</span>
              <span className="badge badge-green">{selectedSite.chunks} chunks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
