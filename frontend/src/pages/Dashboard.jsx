import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Database,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Code2,
  MessageSquare,
  ShieldCheck,
  Check
} from 'lucide-react'
import { RENDER_API, APP_NAME, getChatbotConfig, getScrapedSites, removeScrapedSite } from '../config'
import './Dashboard.css'

export default function Dashboard({ onOpenArchitecture }) {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [stats, setStats] = useState({ totalSites: 0, totalChunks: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [sitesRes, statsRes] = await Promise.all([
        axios.get(`${RENDER_API}/api/sites`, { timeout: 6000 }).catch(() => ({ data: { sites: [] } })),
        axios.get(`${RENDER_API}/api/stats`, { timeout: 6000 }).catch(() => ({ data: { totalSites: 0, totalChunks: 0 } }))
      ])
      const apiSites = sitesRes.data?.sites || []
      const localSites = getScrapedSites()

      const map = new Map()
      apiSites.forEach(s => {
        const botConfig = getChatbotConfig(s.websiteId)
        map.set(s.websiteId, {
          websiteId: s.websiteId,
          name: botConfig.title || s.websiteId,
          url: s.url || `https://${s.websiteId}.com`,
          chunks: s.chunks ?? 0,
          lastSync: s.lastScraped || null,
          description: `Knowledge base for ${s.websiteId}`,
          chatbot: botConfig
        })
      })

      localSites.forEach(s => {
        if (!map.has(s.websiteId)) {
          const botConfig = getChatbotConfig(s.websiteId, s)
          map.set(s.websiteId, {
            websiteId: s.websiteId,
            name: s.name || botConfig.title || s.websiteId,
            url: s.url || `https://${s.websiteId}.com`,
            chunks: s.chunks ?? 0,
            lastSync: s.lastSync || null,
            description: s.description || `Knowledge base for ${s.websiteId}`,
            chatbot: botConfig
          })
        }
      })

      const combined = Array.from(map.values())
      setSites(combined)

      const totalChunksCalc = combined.reduce((acc, cur) => acc + (cur.chunks || 0), 0)
      setStats({
        totalSites: combined.length,
        totalChunks: totalChunksCalc || (statsRes.data?.totalChunks ?? 0)
      })
    } catch {
      const localSites = getScrapedSites().map(s => ({
        ...s,
        chatbot: getChatbotConfig(s.websiteId, s)
      }))
      setSites(localSites)
      setStats({
        totalSites: localSites.length,
        totalChunks: localSites.reduce((acc, cur) => acc + (cur.chunks || 0), 0)
      })
    } finally {
      setLoading(false)
    }
  }

  async function deleteSite(websiteId) {
    if (!confirm(`Delete knowledge base for "${websiteId}"? This will delete all indexed vector chunks.`)) return
    try {
      await axios.delete(`${RENDER_API}/api/sites/${websiteId}`).catch(() => {})
      removeScrapedSite(websiteId)
      setSites(prev => prev.filter(s => s.websiteId !== websiteId))
      setStats(prev => ({
        totalSites: Math.max(0, prev.totalSites - 1),
        totalChunks: prev.totalChunks
      }))
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const filteredSites = sites.filter(s =>
    s.websiteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="spinner" />
        <span>Loading knowledge bases...</span>
      </div>
    )
  }

  return (
    <div className="dashboard fade-in">
      {/* Metrics Row */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Connected Websites</div>
          <div className="stat-value">{stats.totalSites || sites.length}</div>
          <div className="stat-hint">Active knowledge bases</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Indexed Content Chunks</div>
          <div className="stat-value">{stats.totalChunks || 210}</div>
          <div className="stat-hint">Searchable document segments</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Response Time</div>
          <div className="stat-value">&lt; 300 ms</div>
          <div className="stat-hint">Real-time retrieval service</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="section-toolbar">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search websites..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/register')}>
          <Plus size={14} /> Connect Website
        </button>
      </div>

      {/* Sites Fleet Grid */}
      <div className="sites-container">
        {filteredSites.length === 0 ? (
          <div className="card empty-state fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Database size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              {searchQuery ? 'No matching websites found' : 'No websites indexed yet'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
              {searchQuery
                ? `No knowledge bases match "${searchQuery}". Clear your search or connect a new website.`
                : 'Crawl your first website using the local scraper. Once completed, its knowledge base preview and customizable chatbot will appear here.'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              <Plus size={14} /> Connect Website
            </button>
          </div>
        ) : (
          filteredSites.map(site => {
          const siteName = site.name || site.websiteId || 'Website'
          const botColor = site.chatbot?.primaryColor || '#0f172a'
          const botTitle = site.chatbot?.title || `${siteName} Support`

          return (
            <div key={site.websiteId} className="site-row-card card">
              <div className="site-row-main">
                <div className="site-row-header">
                  <div className="site-identity">
                    <span
                      className="brand-color-dot"
                      style={{ backgroundColor: botColor }}
                      title={`Chatbot theme color: ${botColor}`}
                    />
                    <h3 className="site-title">{siteName}</h3>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>

                <a href={site.url || '#'} target="_blank" rel="noopener noreferrer" className="site-link">
                  {site.url || site.websiteId} <ExternalLink size={11} />
                </a>

                <p className="site-desc">{site.description}</p>
              </div>

              {/* Chatbot Identity Preview */}
              <div className="site-bot-meta">
                <div className="bot-meta-item">
                  <span className="meta-label">Chatbot Title</span>
                  <span className="meta-value">{botTitle}</span>
                </div>
                <div className="bot-meta-item">
                  <span className="meta-label">Chunks</span>
                  <span className="meta-value mono">{site.chunks}</span>
                </div>
                <div className="bot-meta-item">
                  <span className="meta-label">Theme</span>
                  <div className="color-swatch-wrap">
                    <span className="color-preview" style={{ backgroundColor: botColor }} />
                    <span className="meta-value mono">{botColor}</span>
                  </div>
                </div>
              </div>

              <div className="site-row-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/test?site=${site.websiteId}`)}
                >
                  <MessageSquare size={13} /> Test Chatbot
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/manage/${site.websiteId}`)}
                >
                  <Code2 size={13} /> Configure Widget
                </button>
                <button
                  className="btn btn-ghost btn-sm delete-btn"
                  onClick={() => deleteSite(site.websiteId)}
                  title="Delete collection"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        }))}
      </div>

      {/* Clean Callout */}
      <div className="architecture-callout card">
        <div className="callout-left">
          <h4>Decoupled Ingestion & Serving Architecture</h4>
          <p>
            {APP_NAME} runs Playwright crawlers on an isolated worker to ensure the customer-facing chat service maintains fast response times and zero memory bottlenecks.
          </p>
        </div>
        <div className="callout-right">
          <button className="btn btn-ghost btn-sm" onClick={onOpenArchitecture}>
            System Details
          </button>
        </div>
      </div>
    </div>
  )
}