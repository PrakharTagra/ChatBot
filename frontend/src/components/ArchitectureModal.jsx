import React from 'react'
import { X, Server, Database, Cpu, Globe, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import './ArchitectureModal.css'

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="badge badge-purple">System Architecture</span>
            <h2>Decoupled RAG Pipeline Design</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="arch-notice">
            <ShieldCheck size={20} className="text-success" />
            <div>
              <strong>Why Decoupled Ingestion? (Senior Engineering Choice)</strong>
              <p>
                Headless browser crawling (Playwright/Chromium) and vector embedding generation require significant RAM and compute.
                Decoupling the <strong>Ingestion Worker</strong> from the <strong>Real-Time Serving API (Render)</strong> ensures the chat API never crashes from out-of-memory errors and maintains sub-300ms response times.
              </p>
            </div>
          </div>

          <div className="diagram-grid">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <Globe size={18} className="text-accent" />
                <span>1. Ingestion Pipeline</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">Target Website URL</div>
                <div className="arrow-down">↓</div>
                <div className="node highlight">
                  <strong>Playwright Crawler</strong>
                  <small>Crawlee · Single concurrency</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Semantic Chunking</strong>
                  <small>~150 words + 30-word overlap</small>
                </div>
              </div>
            </div>

            <div className="diagram-card">
              <div className="diagram-card-header">
                <Database size={18} className="text-teal" />
                <span>2. Vector Database</span>
              </div>
              <div className="diagram-card-body">
                <div className="node highlight">
                  <strong>Transformers.js</strong>
                  <small>all-MiniLM-L6-v2 Embeddings</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-chroma">
                  <strong>ChromaDB Cloud</strong>
                  <small>Cosine Similarity · Top-6 Chunks</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Per-Site Tenant Isolation</strong>
                  <small>1 Collection per registered website</small>
                </div>
              </div>
            </div>

            <div className="diagram-card">
              <div className="diagram-card-header">
                <Zap size={18} className="text-yellow" />
                <span>3. Serving & RAG API</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">
                  <strong>Express API on Render</strong>
                  <small>Stateless · Sub-300ms latency</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-groq">
                  <strong>Groq (Llama 3.1 8B)</strong>
                  <small>Strict Grounding · Sentinel Check</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Confidence Gate & Leads</strong>
                  <small>MongoDB Per-Site Lead Capture</small>
                </div>
              </div>
            </div>
          </div>

          <div className="pipeline-highlights">
            <div className="highlight-item">
              <strong>🎯 Strict Anti-Hallucination:</strong> If retrieved chunk similarity falls below threshold, system bypasses LLM and triggers lead capture instead of guessing.
            </div>
            <div className="highlight-item">
              <strong>⚡ Instant Vector Queries:</strong> Query embeddings are computed instantly and matched against Chroma Cloud index in &lt;100ms.
            </div>
            <div className="highlight-item">
              <strong>📦 Zero-Dependency Widget:</strong> 1-line script tag embeddable anywhere without requiring React or complex build tools.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Got it, Back to Demo
          </button>
        </div>
      </div>
    </div>
  )
}
