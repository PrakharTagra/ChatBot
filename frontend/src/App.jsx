import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  LayoutDashboard,
  Sparkles,
  Video,
  PlusCircle,
  Layers,
  Bot,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Playground from './pages/Playground.jsx'
import VideoTutorial from './pages/VideoTutorial.jsx'
import RegisterSite from './pages/RegisterSite.jsx'
import ManageSite from './pages/ManageSite.jsx'
import ArchitectureModal from './components/ArchitectureModal.jsx'
import { RENDER_API } from './config'
import './App.css'

function Sidebar({ onOpenArchitecture }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Bot size={22} />
        </div>
        <div>
          <div className="logo-name">ChatAgent Studio</div>
          <div className="logo-sub">Production RAG Engine</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-label">Showcase & Testing</div>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/test" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Sparkles size={17} className="text-warn" />
          <span>Live Playground</span>
        </NavLink>

        <NavLink to="/tutorial" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Video size={17} className="text-accent" />
          <span>Video Tutorial</span>
        </NavLink>

        <div className="nav-group-label" style={{ marginTop: 18 }}>Management</div>
        <NavLink to="/register" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <PlusCircle size={17} />
          <span>Add Website</span>
        </NavLink>

        <button className="nav-item arch-nav-btn" onClick={onOpenArchitecture}>
          <Layers size={17} className="text-teal" />
          <span>Architecture Deep Dive</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-tech-stack">
          <span className="tech-pill">Groq Llama 3.1</span>
          <span className="tech-pill">ChromaDB</span>
        </div>
        <div className="sidebar-footer-text">Decoupled RAG Pipeline v1.0</div>
      </div>
    </aside>
  )
}

function Layout() {
  const location = useLocation()
  const [isArchOpen, setIsArchOpen] = useState(false)
  const [apiOnline, setApiOnline] = useState(null)

  useEffect(() => {
    checkHealth()
    const timer = setInterval(checkHealth, 30000)
    return () => clearInterval(timer)
  }, [])

  async function checkHealth() {
    try {
      await axios.get(`${RENDER_API}/api/health`, { timeout: 5000 })
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    }
  }

  const titles = {
    '/': 'RAG System Dashboard',
    '/test': 'Interactive Testing Playground',
    '/tutorial': 'Video Walkthrough & Screen Recording',
    '/register': 'Ingest New Website'
  }
  const title = location.pathname.startsWith('/manage/')
    ? 'Manage & Embed Knowledge Base'
    : (titles[location.pathname] || 'ChatAgent')

  return (
    <div className="app-layout">
      <Sidebar onOpenArchitecture={() => setIsArchOpen(true)} />
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{title}</h1>
          </div>

          <div className="topbar-right">
            <button className="topbar-arch-btn" onClick={() => setIsArchOpen(true)}>
              <Layers size={14} /> Architecture
            </button>
            <div className="topbar-status">
              <div className={`status-dot ${apiOnline === false ? 'down' : ''}`} />
              <span className="status-label">
                {apiOnline === null ? 'Checking API...' : apiOnline ? 'Render API Online' : 'Cold Booting...'}
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