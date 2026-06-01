import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import RegisterSite from './pages/RegisterSite.jsx'
import ManageSite from './pages/ManageSite.jsx'
import './App.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor" opacity="0.3"/>
            <path d="M8 10.5C8 9.12 9.12 8 10.5 8h3C14.88 8 16 9.12 16 10.5v.5H8v-.5z" fill="currentColor"/>
            <rect x="7" y="12" width="10" height="6" rx="2" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <div className="logo-name">ChatAgent</div>
          <div className="logo-sub">Admin Panel</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-label">Navigation</div>
        <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/register" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Add Website
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">v1.0.0 · Built with Groq</div>
      </div>
    </aside>
  )
}

function Layout() {
  const location = useLocation()
  const titles = {
    '/': 'Dashboard',
    '/register': 'Add New Website',
  }
  const title = location.pathname.startsWith('/manage/') ? 'Manage Website' : (titles[location.pathname] || '')

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <header className="topbar">
          <h1 className="page-title">{title}</h1>
          <div className="topbar-right">
            <div className="status-dot" title="API Online" />
            <span className="status-label">API Online</span>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<RegisterSite />} />
            <Route path="/manage/:websiteId" element={<ManageSite />} />
          </Routes>
        </main>
      </div>
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