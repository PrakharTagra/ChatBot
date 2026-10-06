import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  Database,
  MessageSquare,
  Plus,
  Shield,
  Menu,
  X
} from 'lucide-react'
import BrandLogo from './components/BrandLogo.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Playground from './pages/Playground.jsx'
import RegisterSite from './pages/RegisterSite.jsx'
import ManageSite from './pages/ManageSite.jsx'
import ArchitectureModal from './components/ArchitectureModal.jsx'
import { RENDER_API, APP_NAME } from './config'
import './App.css'

function Sidebar({ onOpenArchitecture, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-header">
          <BrandLogo size={28} />
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-selector">
          <div className="workspace-pill">
            <span className="ws-dot" />
            <span className="ws-name">Production Workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Navigation</div>

          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={onClose}>
            <Database size={15} />
            <span>Knowledge Bases</span>
          </NavLink>

          <NavLink to="/test" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={onClose}>
            <MessageSquare size={15} />
            <span>Chatbot Preview</span>
          </NavLink>

          <NavLink to="/register" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={onClose}>
            <Plus size={15} />
            <span>Connect Website</span>
          </NavLink>

          <div className="nav-group-label" style={{ marginTop: 14 }}>System</div>

          <button
            className="nav-item arch-nav-btn"
            onClick={() => {
              onClose()
              onOpenArchitecture()
            }}
          >
            <Shield size={15} />
            <span>Architecture</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-pill">
            <span>Verified Knowledge Search</span>
          </div>
          <div className="footer-meta">
            <span>{APP_NAME} Platform</span>
          </div>
        </div>
      </aside>
    </>
  )
}

function Layout() {
  const location = useLocation()
  const [isArchOpen, setIsArchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [apiOnline, setApiOnline] = useState(null)
  const [apiLatency, setApiLatency] = useState(null)

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

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
    '/': { title: 'Knowledge Bases', subtitle: 'Connected websites and indexed content collections' },
    '/test': { title: 'Chatbot Preview & Customizer', subtitle: 'Live conversation test and custom brand appearance' },
    '/register': { title: 'Connect Website', subtitle: 'Index a new domain and generate a custom support widget' }
  }

  const currentMeta = location.pathname.startsWith('/manage/')
    ? { title: 'Widget Configuration', subtitle: 'Embed code, customization, and content re-crawl' }
    : (titles[location.pathname] || { title: 'CogniSite', subtitle: 'Website Knowledge Platform' })

  return (
    <div className="app-layout">
      <Sidebar
        onOpenArchitecture={() => setIsArchOpen(true)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="page-title">{currentMeta.title}</h1>
              <p className="page-subtitle">{currentMeta.subtitle}</p>
            </div>
          </div>

          <div className="topbar-right">
            <button className="btn btn-ghost btn-sm header-sec-btn" onClick={() => setIsArchOpen(true)}>
              <Shield size={13} />
              <span className="btn-label-desktop">Architecture</span>
            </button>

            <div className="system-status-badge">
              <div className={`status-dot ${apiOnline === false ? 'down' : ''}`} />
              <span className="status-label">
                {apiOnline === null
                  ? 'Connecting...'
                  : apiOnline
                  ? `Connected (${apiLatency}ms)`
                  : 'Service Standby'}
              </span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard onOpenArchitecture={() => setIsArchOpen(true)} />} />
            <Route path="/test" element={<Playground />} />
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