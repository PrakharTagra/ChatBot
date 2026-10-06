import React from 'react'
import { X, Server, Database, Globe, ArrowRight, ShieldCheck } from 'lucide-react'
import { APP_NAME } from '../config'
import './ArchitectureModal.css'

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="badge badge-purple">System Architecture</span>
            <h2>{APP_NAME} Architecture & Data Flow</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="arch-notice">
            <ShieldCheck size={20} className="text-success" style={{ flexShrink: 0 }} />
            <div>
              <strong>Decoupled Ingestion & Serving Design</strong>
              <p>
                To maintain sub-300ms response times and prevent memory contention, {APP_NAME} isolates the background crawler worker from the live serving API. Vector documents are stored in dedicated collections in Chroma Cloud.
              </p>
            </div>
          </div>

          <div className="diagram-grid">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <Globe size={14} />
                <span>1. Crawler Ingestion</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">Customer Website</div>
                <div className="arrow-down">↓</div>
                <div className="node highlight">
                  <strong>Playwright Crawler</strong>
                  <small>Crawlee · Single Concurrency</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Content Extraction</strong>
                  <small>~150 words with 30-word overlap</small>
                </div>
              </div>
            </div>

            <div className="diagram-card">
              <div className="diagram-card-header">
                <Database size={14} />
                <span>2. Vector Database</span>
              </div>
              <div className="diagram-card-body">
                <div className="node highlight">
                  <strong>Embedding Model</strong>
                  <small>all-MiniLM-L6-v2 Vectors</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-chroma">
                  <strong>ChromaDB Cloud</strong>
                  <small>Cosine Similarity Search</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Collection Isolation</strong>
                  <small>Dedicated per-site namespace</small>
                </div>
              </div>
            </div>

            <div className="diagram-card">
              <div className="diagram-card-header">
                <Server size={14} />
                <span>3. Live Serving API</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">
                  <strong>Express Web Service</strong>
                  <small>Render Deployment (&lt;300ms)</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-service">
                  <strong>Context Matcher</strong>
                  <small>Strict Verified Context</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Customer Lead Storage</strong>
                  <small>Independent MongoDB Target</small>
                </div>
              </div>
            </div>
          </div>

          <div className="pipeline-highlights">
            <div className="highlight-item">
              <strong>Verified Content Matching:</strong> If search similarity falls below threshold, the service safely falls back and offers contact options rather than generating unverified claims.
            </div>
            <div className="highlight-item">
              <strong>Heading Deep-Links:</strong> Every response automatically includes direct links to relevant HTML section anchors on the original site.
            </div>
            <div className="highlight-item">
              <strong>Lightweight Widget:</strong> Embeds anywhere with a single script tag without heavy front-end framework dependencies.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
