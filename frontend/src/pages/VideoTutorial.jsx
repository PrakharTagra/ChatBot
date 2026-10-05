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
  HelpCircle,
  Code
} from 'lucide-react'
import { TUTORIAL_CONFIG } from '../config'
import './VideoTutorial.css'

export default function VideoTutorial({ onOpenArchitecture }) {
  const [videoUrl, setVideoUrl] = useState(() => {
    return localStorage.getItem('chatagent_tutorial_url') || ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [inputUrl, setInputUrl] = useState(videoUrl)
  const [activeChapter, setActiveChapter] = useState(0)

  function saveUrl() {
    const trimmed = inputUrl.trim()
    setVideoUrl(trimmed)
    localStorage.setItem('chatagent_tutorial_url', trimmed)
    setIsEditing(false)
  }

  // Convert typical YouTube watch or Loom links into embeddable URLs
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
      {/* Top Banner */}
      <div className="tutorial-hero card">
        <div className="hero-text-wrap">
          <span className="badge badge-purple">
            <Video size={13} /> Video Showcase
          </span>
          <h2 className="hero-title">Live Tutorial & Technical Walkthrough</h2>
          <p className="hero-desc">
            A comprehensive video demonstration explaining how the decoupled crawler indexes web content, stores vector embeddings in ChromaDB Cloud, and serves grounded answers via Groq's Llama 3.1 8B engine.
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
            <Edit3 size={14} /> {videoUrl ? 'Update Video Link' : 'Set Video Link'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenArchitecture}>
            <Layers size={14} /> View Architecture
          </button>
        </div>
      </div>

      {/* URL Edit Form Drawer */}
      {isEditing && (
        <div className="url-edit-bar card fade-in">
          <div className="url-edit-header">
            <strong>Embed Your Screen Recording (Loom, YouTube, or MP4)</strong>
            <small>Paste any public Loom video link or YouTube video URL</small>
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
              <Save size={14} /> Save Video
            </button>
            <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Video Player + Timestamps/Chapters */}
      <div className="tutorial-grid">
        {/* Left: Video Player Area */}
        <div className="video-player-card card">
          {embedSrc ? (
            <div className="video-aspect-frame">
              <iframe
                src={embedSrc}
                title="System Walkthrough"
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
                <h3>Your Screen Recording Goes Here</h3>
                <p>
                  Record a 2-to-3 minute demo using Loom, OBS, or Chrome, then click <strong>"Set Video Link"</strong> above to embed it directly into your portfolio!
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsEditing(true)}
                  style={{ marginTop: 12 }}
                >
                  <Edit3 size={14} /> Paste Screen Recording URL
                </button>
              </div>
            </div>
          )}

          <div className="video-footer-meta">
            <div className="video-meta-left">
              <span className="badge badge-green">● Ready for Resume Showcase</span>
              <span className="meta-length">Duration: ~3-4 mins</span>
            </div>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="open-external-link"
              >
                Open in new tab <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Right: Video Chapters & Recording Script */}
        <div className="chapters-sidebar card">
          <h3 className="sidebar-heading">
            <Clock size={16} className="text-teal" /> Presentation Chapters
          </h3>
          <p className="sidebar-sub">
            Recommended breakdown for your video walkthrough:
          </p>

          <div className="chapters-list">
            {TUTORIAL_CONFIG.chapters.map((ch, idx) => (
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

          {/* Recruiter Talking Points */}
          <div className="talking-points-box">
            <div className="points-header">
              <Sparkles size={14} className="text-warn" />
              <strong>What to Emphasize in the Recording:</strong>
            </div>
            <ul className="points-list">
              <li>
                <strong>Architectural separation:</strong> Point out why the crawler is decoupled from the Render web API.
              </li>
              <li>
                <strong>Grounded RAG:</strong> Show that Groq Llama 3.1 refuses to hallucinate when asked about topics not on the site.
              </li>
              <li>
                <strong>Heading deep-links:</strong> Show that citations jump directly to the exact HTML section anchor.
              </li>
              <li>
                <strong>Tenant MongoDB:</strong> Explain that leads flow into each client's isolated database.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
