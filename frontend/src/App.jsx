import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  Database,
  Cpu,
  Video,
  Plus,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Users,
  Code2,
  Activity
} from 'lucide-react'
import BrandLogo from './components/BrandLogo.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Playground from './pages/Playground.jsx'
import VideoTutorial from './pages/VideoTutorial.jsx'
import RegisterSite from './pages/RegisterSite.jsx'
import ManageSite from './pages/ManageSite.jsx'
import ArchitectureModal from './components/ArchitectureModal.jsx'
import { RENDER_API, APP_NAME } from './config'
import './App.css'

function Sidebar({ onOpenArchitecture }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <BrandLogo size={34} />
      </div>

      {/* Workspace Environment Indicator */}
      <div className="workspace-selector">
        <div className="workspace-pill">
          <span className="ws-dot" />
          <span className="ws-name">Production · us-east-1</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        <div className="nav-group-label">Intelligence Engine</div>

        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Database size={16} />
          <span>Knowledge Bases</span>
        </NavLink>

        <NavLink to="/test" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Sparkles size={16} className="text-warn" />
          <span>Agent Studio</span>
          <span className="nav-tag">Live</span>
        </NavLink>

        <NavLink to="/register" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Plus size={16} />
          <span>Connect Website</span>
        </NavLink>

        <div className="nav-group-label" style={{ marginTop: 22 }}>Platform & Tour</div>

        <NavLink to="/tutorial" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Video size={16} className="text-teal" />
          <span>Product Tour & Video</span>
        </NavLink>

        <button className="nav-item arch-nav-btn" onClick={onOpenArchitecture}>
          <Shield size={16} className="text-teal" />
          <span>Security & Guardrails</span>
        </button>
      </nav>

      {/* Footer Profile / Engine Specs */}
      <div className="sidebar-footer">
        <div className="system-pill">
          <Activity size={12} className="text-success" />
          <span>Groq LPU · Chroma Cloud</span>
        </div>
        <div className="footer-meta">
          <span>{APP_NAME} Enterprise v2.4</span>
        </div>
      </div>
    </aside>
  )
}

function Layout() {
  const location = useLocation()
  const [isArchOpen, setIsArchOpen] = useState(false)
  const [apiOnline, setApiOnline] = useState(null)
  const [apiLatency, setApiLatency] = useState(null)

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkHealth() {
    const start = performance.now()
    try {
      await axios.get(`${RENDER_API}/api/health`, { timeout: 5000 })
      setApiLatency(Math.round(performance.now() - start))
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    }
  }

  const titles = {
    '/': { title: 'Knowledge Bases', subtitle: 'Manage connected websites, vector collections, and sync health' },
    '/test': { title: 'Agent Studio & Telemetry', subtitle: 'Live conversation simulator, grounding checks, and response metrics' },
    '/tutorial': { title: 'Product Walkthrough', subtitle: 'Architecture video tour and multi-tenant pipeline overview' },
    '/register': { title: 'Connect Knowledge Base', subtitle: 'Index a new domain using cloud or high-security crawler agents' }
  }

  const currentMeta = location.pathname.startsWith('/manage/')
    ? { title: 'Knowledge Base Settings & Widget Embed', subtitle: 'CDN snippet, vector chunk inspection, and crawler re-sync' }
    : (titles[location.pathname] || { title: 'CogniSite AI Console', subtitle: 'Autonomous Website Knowledge Agents' })

  return (
    <div className="app-layout">
      <Sidebar onOpenArchitecture={() => setIsArchOpen(true)} />

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{currentMeta.title}</h1>
            <p className="page-subtitle">{currentMeta.subtitle}</p>
          </div>

          <div className="topbar-right">
            <button className="btn btn-ghost btn-sm header-sec-btn" onClick={() => setIsArchOpen(true)}>
              <Shield size={14} className="text-teal" />
              <span>Guardrail Specs</span>
            </button>

            <div className="system-status-badge">
              <div className={`status-dot ${apiOnline === false ? 'down' : ''}`} />
              <span className="status-label">
                {apiOnline === null
                  ? 'Verifying Cloud API...'
                  : apiOnline
                  ? `Cloud Connected (${apiLatency}ms)`
                  : 'Cloud Cold-Booting'}
              </span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard onOpenArchitecture={() => setIsArchOpen(true)} />} />
            <Route path="/test" element={<Playground />} />
            <Route path="/tutorial" element={<VideoTutorial onOpenArchitecture={() => setIsArchOpen(true)} />} />
            <Route path="/register" element={<RegisterSite />} />
            <Route path="/manage/:websiteId" element={<ManageSite />} />
          </Routes>
        </main>
      </div>

      <ArchitectureModal isOpen={isArchOpen} onClose={() => setIsArchOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}