import React, { useState } from 'react'
import {
  Video,
  Play,
  Clock,
  CheckCircle,
  ExternalLink,
  Edit3,
  Save,
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  Database
} from 'lucide-react'
import { PRODUCT_TOUR_CONFIG, APP_NAME } from '../config'
import './VideoTutorial.css'

export default function VideoTutorial({ onOpenArchitecture }) {
  const [videoUrl, setVideoUrl] = useState(() => {
    return localStorage.getItem('cognisite_tour_url') || ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [inputUrl, setInputUrl] = useState(videoUrl)
  const [activeChapter, setActiveChapter] = useState(0)

  function saveUrl() {
    const trimmed = inputUrl.trim()
    setVideoUrl(trimmed)
    localStorage.setItem('cognisite_tour_url', trimmed)
    setIsEditing(false)
  }

  function getEmbedUrl(rawUrl) {
    if (!rawUrl) return null

    try {
      if (rawUrl.includes('youtube.com/watch?v=')) {
        const videoId = new URL(rawUrl).searchParams.get('v')
        return `https://www.youtube.com/embed/${videoId}?autoplay=0`
      }
      if (rawUrl.includes('youtu.be/')) {
        const videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0]
        return `https://www.youtube.com/embed/${videoId}?autoplay=0`
      }
      if (rawUrl.includes('loom.com/share/')) {
        const videoId = rawUrl.split('loom.com/share/')[1]?.split('?')[0]
        return `https://www.loom.com/embed/${videoId}`
      }
      return rawUrl
    } catch {
      return rawUrl
    }
  }

  const embedSrc = getEmbedUrl(videoUrl)

  return (
    <div className="tutorial-page fade-in">
      {/* Product Hero Header */}
      <div className="tutorial-hero card">
        <div className="hero-text-wrap">
          <span className="badge badge-purple">
            <Video size={13} /> Official Platform Tour
          </span>
          <h2 className="hero-title">{APP_NAME} Enterprise Architecture Walkthrough</h2>
          <p className="hero-desc">
            A deep-dive video walkthrough explaining how {APP_NAME}'s decoupled ingestion engine crawls websites, embeds semantic chunks into <strong>ChromaDB Cloud</strong>, and delivers sub-300ms grounded answers using <strong>Groq LPU Llama 3.1</strong>.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setInputUrl(videoUrl)
              setIsEditing(!isEditing)
            }}
          >
            <Edit3 size={14} /> {videoUrl ? 'Configure Tour Feed' : 'Set Tour Video'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenArchitecture}>
            <Layers size={14} /> Architecture Diagram
          </button>
        </div>
      </div>

      {/* Video Source Configuration Drawer */}
      {isEditing && (
        <div className="url-edit-bar card fade-in">
          <div className="url-edit-header">
            <strong>Configure Product Walkthrough Video Feed</strong>
            <small>Provide a public Loom video or YouTube embed URL</small>
          </div>
          <div className="url-input-group">
            <input
              type="url"
              className="input"
              placeholder="e.g. https://www.loom.com/share/... or https://youtu.be/..."
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
            />
            <button className="btn btn-primary" onClick={saveUrl}>
              <Save size={14} /> Save Video Source
            </button>
            <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Video Player + Chapter Specs */}
      <div className="tutorial-grid">
        {/* Left: Video Player Card */}
        <div className="video-player-card card">
          {embedSrc ? (
            <div className="video-aspect-frame">
              <iframe
                src={embedSrc}
                title="CogniSite Architecture Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="video-iframe"
              />
            </div>
          ) : (
            <div className="video-placeholder-frame">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <Play size={32} />
                </div>
                <h3>Product Tour Video Feed</h3>
                <p>
                  Embed a 3-minute video walkthrough of your live platform. Click <strong>"Set Tour Video"</strong> above to link your Loom or YouTube recording.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsEditing(true)}
                  style={{ marginTop: 14 }}
                >
                  <Edit3 size={14} /> Link Screen Recording URL
                </button>
              </div>
            </div>
          )}

          <div className="video-footer-meta">
            <div className="video-meta-left">
              <span className="badge badge-green">● High-Definition System Walkthrough</span>
              <span className="meta-length">Runtime: ~3-4 mins</span>
            </div>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="open-external-link"
              >
                Open Stream in New Window <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Right: Chapter Breakdown & Architecture Highlights */}
        <div className="chapters-sidebar card">
          <h3 className="sidebar-heading">
            <Clock size={16} className="text-teal" /> Tour Chapters
          </h3>
          <p className="sidebar-sub">
            Technical highlights and system milestones covered in this walkthrough:
          </p>

          <div className="chapters-list">
            {PRODUCT_TOUR_CONFIG.chapters.map((ch, idx) => (
              <div
                key={idx}
                className={`chapter-item ${activeChapter === idx ? 'active' : ''}`}
                onClick={() => setActiveChapter(idx)}
              >
                <div className="chapter-time">{ch.time}</div>
                <div className="chapter-details">
                  <div className="chapter-title">{ch.title}</div>
                </div>
                <CheckCircle size={14} className="chapter-check" />
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Core Technical Highlights */}
          <div className="talking-points-box">
            <div className="points-header">
              <ShieldCheck size={14} className="text-accent" />
              <strong>Core Engineering Principles Demonstrated:</strong>
            </div>
            <ul className="points-list">
              <li>
                <strong>Decoupled Ingestion:</strong> Isolates resource-heavy Playwright headless browser workloads from real-time API traffic.
              </li>
              <li>
                <strong>Deterministic Grounding:</strong> Groq Llama 3.1 utilizes strict negative constraints to eliminate AI hallucinations.
              </li>
              <li>
                <strong>Heading-Level Citations:</strong> Automates deep-linking directly to target HTML section anchors.
              </li>
              <li>
                <strong>Multi-Tenant Isolation:</strong> Dedicated Chroma Cloud collections and isolated customer MongoDB lead channels.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
