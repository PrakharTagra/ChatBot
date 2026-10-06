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
  Sliders,
  Terminal,
  Zap,
  Activity
} from 'lucide-react'
import { RENDER_API, ENTERPRISE_KNOWLEDGE_BASES, APP_NAME } from '../config'
import './Playground.css'

export default function Playground() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site') || 'd2itechnology'

  const [availableSites, setAvailableSites] = useState(ENTERPRISE_KNOWLEDGE_BASES)
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId)
  const [selectedSite, setSelectedSite] = useState(
    ENTERPRISE_KNOWLEDGE_BASES.find(s => s.websiteId === initialSiteId) || ENTERPRISE_KNOWLEDGE_BASES[0]
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
        text: `👋 Greetings. I am the grounded autonomous assistant for **${site?.name || site?.websiteId}**. Every response is mathematically retrieved from your ChromaDB Cloud vector index and verified against zero-hallucination guardrails.`,
        confident: true,
        source: null,
        latency: null
      }
    ])
  }

  // Fetch available sites from API and merge with enterprise presets
  useEffect(() => {
    async function loadSites() {
      try {
        const res = await axios.get(`${RENDER_API}/api/sites`, { timeout: 6000 })
        if (res.data?.sites && res.data.sites.length > 0) {
          const apiSites = res.data.sites.map(s => {
            const match = ENTERPRISE_KNOWLEDGE_BASES.find(sc => sc.websiteId === s.websiteId)
            return {
              websiteId: s.websiteId,
              name: match?.name || s.websiteId,
              url: s.url || match?.url || `https://${s.websiteId}.com`,
              chunks: s.chunks ?? match?.chunks ?? 0,
              lastSync: s.lastScraped || match?.lastSync,
              description: match?.description || 'Connected domain indexed into ChromaDB Cloud.',
              sampleQuestions: match?.sampleQuestions || [
                'What core services or capabilities are offered?',
                'How do I schedule a technical call with your team?',
                'Where can I review pricing and enterprise SLAs?',
                'What compliance and security standards are supported?'
              ]
            }
          })

          const combined = [...apiSites]
          ENTERPRISE_KNOWLEDGE_BASES.forEach(sc => {
            if (!combined.some(c => c.websiteId === sc.websiteId)) {
              combined.push(sc)
            }
          })
          setAvailableSites(combined)
        }
      } catch {
        setAvailableSites(ENTERPRISE_KNOWLEDGE_BASES)
      }
    }
    loadSites()
  }, [])

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
        text: '❌ Inference pipeline error: ' + (err.response?.data?.error || err.message),
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
      {/* Studio Control Header */}
      <div className="playground-header-card card">
        <div className="site-select-group">
          <div className="site-select-label">
            <Database size={15} className="text-accent" />
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
          <span className="badge badge-teal mono">
            <Zap size={12} /> Groq LPU Engine
          </span>
          <a
            href={selectedSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="badge badge-ghost site-link-badge"
          >
            <Globe size={13} /> Domain <ExternalLink size={11} />
          </a>
          <button
            className="btn btn-ghost btn-sm reset-btn"
            onClick={() => resetConversation()}
            title="Reset conversation"
          >
            <RotateCcw size={13} /> Reset Session
          </button>
        </div>
      </div>

      {/* Main Studio Arena */}
      <div className="playground-main-grid">
        {/* Left: Chat Session Arena */}
        <div className="chat-arena card">
          <div className="arena-header">
            <div className="arena-status">
              <span className="live-dot" />
              <div>
                <strong>{selectedSite.name}</strong>
                <small>Model: Llama 3.1 8B Instant · Vector Space: Chroma Cloud</small>
              </div>
            </div>

            <div className="arena-controls">
              <button
                className={`mode-toggle-btn ${viewMode === 'studio' ? 'active' : ''}`}
                onClick={() => setViewMode('studio')}
              >
                Console View
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
              <Sparkles size={13} className="text-warn" /> Inquiries:
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

          {/* Messages Area */}
          <div className={`playground-messages ${viewMode === 'widget' ? 'widget-style' : ''}`}>
            {messages.map(m => (
              <div key={m.id} className={`p-msg p-msg--${m.role}`}>
                <div className="msg-avatar">
                  {m.role === 'bot' ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div className="msg-bubble-wrap">
                  <div className="msg-bubble">
                    <p className="msg-text">{m.text}</p>

                    {/* Source Citation Anchor Link */}
                    {m.source && (
                      <div className="source-citation">
                        <span className="citation-title">Grounded Citation:</span>
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

                    {/* Low Confidence Trigger / Sentinel */}
                    {m.confident === false && (
                      <div className="low-confidence-notice">
                        <AlertTriangle size={14} />
                        <span>Confidence below threshold — Lead capture sentinel triggered</span>
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
                            <AlertTriangle size={11} /> Fallback
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
                      <Clock size={11} /> Computing vector similarity + Groq inference...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="playground-input-row">
            <input
              type="text"
              className="playground-input"
              placeholder={`Send inquiry to ${selectedSite.name}... (e.g., pricing, technical capabilities)`}
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
              <span>Query Agent</span>
            </button>
          </div>
        </div>

        {/* Right: RAG Telemetry & Model Specs */}
        <div className="telemetry-sidebar card">
          <h3 className="telemetry-title">
            <Activity size={16} className="text-teal" /> Real-Time Telemetry
          </h3>

          <div className="telemetry-metric-group">
            <div className="telemetry-box">
              <span className="tel-label">Roundtrip Latency</span>
              <span className="tel-val highlight-val">
                {lastLatency !== null ? `${lastLatency} ms` : 'Standby'}
              </span>
              <small className="tel-sub">Groq LPU Hardware Acceleration</small>
            </div>

            <div className="telemetry-box">
              <span className="tel-label">Vector Space</span>
              <span className="tel-val">Cosine Distance</span>
              <small className="tel-sub">Top 6 Chunks · Inclusion ≥ 0.35</small>
            </div>
          </div>

          <div className="divider" />

          <h4 className="inspector-heading">Active Guardrails</h4>
          <ul className="spec-list">
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Zero-Shot Grounding:</strong> Model answers strictly using retrieved chunks.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Anti-Hallucination Sentinel:</strong> NOT_IN_CONTEXT parsed server-side.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Heading Anchors:</strong> Automated deep-linking to exact source sections.</span>
            </li>
            <li>
              <CheckCircle2 size={13} className="text-success" />
              <span><strong>Multi-Tenant Isolation:</strong> Dedicated Chroma Cloud collection.</span>
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
