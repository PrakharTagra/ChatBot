import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

const API = import.meta.env.VITE_API_URL || 'https://chatbot-gurp.onrender.com'

export default function Dashboard() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [stats, setStats] = useState({ totalSites: 0, totalChunks: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [sitesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/sites`),
        axios.get(`${API}/api/stats`)
      ])
      setSites(sitesRes.data.sites || [])
      setStats(statsRes.data || {})
    } catch (e) {
      // If backend doesn't have /api/sites yet, show empty state gracefully
      setError('')
      setSites([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteSite(websiteId) {
    if (!confirm(`Delete "${websiteId}" and all its data? This cannot be undone.`)) return
    try {
      await axios.delete(`${API}/api/sites/${websiteId}`)
      setSites(prev => prev.filter(s => s.websiteId !== websiteId))
    } catch (e) {
      alert('Failed to delete site.')
    }
  }

  if (loading) return (
    <div className="dash-loading">
      <div className="spinner" />
      <span>Loading dashboard...</span>
    </div>
  )

  return (
    <div className="dashboard fade-in">
      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard icon="🌐" label="Websites Indexed" value={stats.totalSites ?? sites.length} color="accent" />
        <StatCard icon="📄" label="Content Chunks" value={stats.totalChunks ?? '—'} color="teal" />
        <StatCard icon="⚡" label="AI Engine" value="Groq Llama" color="yellow" small />
      </div>

      {/* Sites Section */}
      <div className="section-header">
        <h2 className="section-title">Registered Websites</h2>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Website
        </button>
      </div>

      {sites.length === 0 ? (
        <EmptyState onAdd={() => navigate('/register')} />
      ) : (
        <div className="sites-grid">
          {sites.map(site => (
            <SiteCard
              key={site.websiteId}
              site={site}
              onManage={() => navigate(`/manage/${site.websiteId}`)}
              onDelete={() => deleteSite(site.websiteId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, small }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={small ? { fontSize: '20px' } : {}}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function SiteCard({ site, onManage, onDelete }) {
  const ago = site.lastScraped
    ? new Date(site.lastScraped).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never'

  return (
    <div className="site-card">
      <div className="site-card-top">
        <div className="site-favicon">
          <img
            src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=32`}
            onError={e => { e.target.style.display='none' }}
            alt=""
            width="20"
            height="20"
          />
        </div>
        <div className="site-info">
          <div className="site-id mono">{site.websiteId}</div>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="site-url">
            {site.url}
          </a>
        </div>
        <span className={`badge ${site.chunks > 0 ? 'badge-green' : 'badge-yellow'}`}>
          {site.chunks > 0 ? '● Live' : '○ Empty'}
        </span>
      </div>

      <div className="site-meta">
        <div className="meta-item">
          <span className="meta-label">Chunks</span>
          <span className="meta-val">{site.chunks ?? 0}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last scraped</span>
          <span className="meta-val">{ago}</span>
        </div>
      </div>

      <div className="site-actions">
        <button className="btn btn-primary btn-sm" onClick={onManage}>Manage →</button>
        <button className="btn btn-ghost btn-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-state card">
      <div className="empty-icon">🌐</div>
      <h3>No websites yet</h3>
      <p>Add your first website to start indexing its content and get an embeddable chat widget.</p>
      <button className="btn btn-primary" onClick={onAdd}>Add Your First Website</button>
    </div>
  )
}