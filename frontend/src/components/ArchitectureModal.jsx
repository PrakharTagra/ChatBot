import React from 'react'
import { X, Server, Database, Cpu, Globe, ArrowRight, ShieldCheck, Zap, Lock, Activity } from 'lucide-react'
import { APP_NAME } from '../config'
import './ArchitectureModal.css'

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="badge badge-teal">Architecture & Security Specification</span>
            <h2>{APP_NAME} Enterprise RAG System Architecture</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="arch-notice">
            <ShieldCheck size={22} className="text-success" style={{ flexShrink: 0 }} />
            <div>
              <strong>Decoupled Ingestion & Serving Isolation (Enterprise Standard)</strong>
              <p>
                To maintain sub-300ms SLA response times and eliminate out-of-memory bottlenecks, {APP_NAME} completely separates the <strong>Heavy Ingestion Worker (Playwright/Crawlee)</strong> from the <strong>Real-Time Serving API (Render + Groq)</strong>. Vector embeddings are stored in isolated per-tenant collections inside ChromaDB Cloud.
              </p>
            </div>
          </div>

          <div className="diagram-grid">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <Globe size={16} className="text-accent" />
                <span>1. Ingestion & Extraction</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">Target Customer Domain</div>
                <div className="arrow-down">↓</div>
                <div className="node highlight">
                  <strong>Playwright Crawler</strong>
                  <small>Crawlee Engine · Single Concurrency</small>
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
                <Database size={16} className="text-teal" />
                <span>2. High-Dimensional Vectors</span>
              </div>
              <div className="diagram-card-body">
                <div className="node highlight">
                  <strong>Transformers.js</strong>
                  <small>all-MiniLM-L6-v2 Local Embeddings</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-chroma">
                  <strong>ChromaDB Cloud</strong>
                  <small>Cosine Similarity · Top 6 Chunks</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Multi-Tenant Boundary</strong>
                  <small>Dedicated Isolated Collections</small>
                </div>
              </div>
            </div>

            <div className="diagram-card">
              <div className="diagram-card-header">
                <Zap size={16} className="text-yellow" />
                <span>3. Serving & Guardrails</span>
              </div>
              <div className="diagram-card-body">
                <div className="node">
                  <strong>Serving API (Render)</strong>
                  <small>Stateless Express · Sub-300ms SLA</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node highlight-groq">
                  <strong>Groq (Llama 3.1 8B)</strong>
                  <small>Strict Grounding · Sentinel Check</small>
                </div>
                <div className="arrow-down">↓</div>
                <div className="node">
                  <strong>Isolated Lead Routing</strong>
                  <small>Customer MongoDB Instance</small>
                </div>
              </div>
            </div>
          </div>

          <div className="pipeline-highlights">
            <div className="highlight-item">
              <strong>🔒 Zero-Hallucination Guardrail:</strong> If semantic chunk similarity falls below threshold, the inference engine returns an exact NOT_IN_CONTEXT sentinel parsed server-side, gracefully triggering lead capture rather than guessing.
            </div>
            <div className="highlight-item">
              <strong>⚡ Hardware-Accelerated Inference:</strong> Groq LPUs provide deterministic token generation speeds up to 10x faster than traditional GPU clusters.
            </div>
            <div className="highlight-item">
              <strong>📦 Universal Zero-Dependency Embed:</strong> The customer-facing chat widget bundles into a lightweight vanilla JS script, embeddable on any CMS, Shopify, Next.js, or plain HTML site in 1 line.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Architecture Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
