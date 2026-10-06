import React from 'react'

export default function BrandLogo({ size = 32, showText = true, className = '' }) {
  return (
    <div className={`brand-logo-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="cogniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Tech Hexagon */}
        <rect width="36" height="36" rx="9" fill="#0f111a" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <path
          d="M18 7 L28 12.8 L28 23.2 L18 29 L8 23.2 L8 12.8 Z"
          fill="rgba(99, 102, 241, 0.08)"
          stroke="url(#cogniGrad)"
          strokeWidth="2"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* Neural Network Nodes */}
        <circle cx="18" cy="18" r="3.6" fill="url(#cogniGrad)" />
        <circle cx="18" cy="7" r="2" fill="#6366f1" />
        <circle cx="28" cy="12.8" r="2" fill="#06b6d4" />
        <circle cx="28" cy="23.2" r="2" fill="#10b981" />
        <circle cx="18" cy="29" r="2" fill="#10b981" />
        <circle cx="8" cy="23.2" r="2" fill="#06b6d4" />
        <circle cx="8" cy="12.8" r="2" fill="#6366f1" />

        {/* Radiating Synapse Connectors */}
        <path d="M18 7 L18 14.4" stroke="url(#cogniGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M28 23.2 L21.6 19.8" stroke="url(#cogniGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 23.2 L14.4 19.8" stroke="url(#cogniGrad)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: size * 0.52,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              lineHeight: 1
            }}>
              Cogni<span style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Site</span>
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '2px 5px',
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))',
              color: '#43e8d8',
              border: '1px solid rgba(6,182,212,0.35)',
              textTransform: 'uppercase'
            }}>
              PRO
            </span>
          </div>
          <span style={{
            fontSize: 10,
            color: '#8e92a8',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            letterSpacing: '0.02em',
            marginTop: 2
          }}>
            Autonomous Knowledge Agents
          </span>
        </div>
      )}
    </div>
  )
}
