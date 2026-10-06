import React from 'react'

export default function BrandLogo({ size = 28, showText = true, className = '' }) {
  return (
    <div className={`brand-logo-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      {/* Minimalist architectural emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="7" fill="#0f172a" />
        <circle cx="16" cy="16" r="3" fill="#ffffff" />
        <circle cx="16" cy="9" r="1.75" fill="#94a3b8" />
        <circle cx="22" cy="19.5" r="1.75" fill="#94a3b8" />
        <circle cx="10" cy="19.5" r="1.75" fill="#94a3b8" />
        <path d="M16 13V10.75M17.5 17.5L20.5 18.7M14.5 17.5L11.5 18.7" stroke="#94a3b8" strokeWidth="1.25" strokeLinecap="round" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 700,
              fontSize: size * 0.54,
              letterSpacing: '-0.03em',
              color: '#0f172a',
              lineHeight: 1.1
            }}>
              CogniSite
            </span>
          </div>
          <span style={{
            fontSize: 10.5,
            color: '#64748b',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 500,
            letterSpacing: '-0.01em',
            marginTop: 1
          }}>
            Website Knowledge Platform
          </span>
        </div>
      )}
    </div>
  )
}
