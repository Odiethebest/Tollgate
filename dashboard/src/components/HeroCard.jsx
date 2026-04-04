import React, { useRef, useState, useEffect, useCallback } from 'react'
import { MoreHorizontal, RefreshCw, Copy } from 'lucide-react'

export default function HeroCard({ modelsStats, revokedUsage, missingResponses, loading, onRefresh }) {
  const totalRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Computed values
  const totalRequests = modelsStats.reduce((sum, m) => sum + m.totalRequests, 0)
  const weightedSuccessRate = modelsStats.length > 0
    ? (modelsStats.reduce((sum, m) => sum + m.successRate * m.totalRequests, 0) / totalRequests).toFixed(1)
    : '0.0'
  const nonSuccessRate = (100 - parseFloat(weightedSuccessRate)).toFixed(1)
  const auditFlags = revokedUsage.length + missingResponses.length

  const handleCopyStats = useCallback(() => {
    const text = `Total Requests: ${totalRequests.toLocaleString()}\nSuccess Rate: ${weightedSuccessRate}%\nNon-Success: ${nonSuccessRate}%\nAudit Flags: ${auditFlags}`
    navigator.clipboard.writeText(text).catch(() => {})
    setMenuOpen(false)
  }, [totalRequests, weightedSuccessRate, nonSuccessRate, auditFlags])

  if (loading) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', borderRadius: 20, padding: 24, height: '100%', boxSizing: 'border-box' }}>
        <div style={{ height: 48, marginBottom: 8 }} className="skeleton" />
        <div style={{ height: 16, width: '60%' }} className="skeleton" />
        <div style={{ height: 16, width: '40%', marginTop: 8 }} className="skeleton" />
      </div>
    )
  }

  return (
    <div
      id="overview"
      style={{
        background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
        borderRadius: 20,
        padding: 24,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <span style={{ color: 'white', fontSize: '0.85rem', opacity: 0.9 }}>Total Requests</span>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0.7 }}
          >
            <MoreHorizontal color="white" size={18} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'white',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
              minWidth: 150,
              zIndex: 50,
              overflow: 'hidden',
            }}>
              {[
                { icon: RefreshCw, label: 'Refresh', action: () => { onRefresh?.(); setMenuOpen(false) } },
                { icon: Copy, label: 'Copy Stats', action: handleCopyStats },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '10px 14px',
                    fontSize: '0.825rem', color: '#1A1A2E',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F4F4F0'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon size={14} color="#9B9B9B" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center section — grows to fill available space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Total number */}
        <div
          ref={totalRef}
          style={{ color: 'white', fontSize: '3rem', fontWeight: 600, transition: 'opacity 300ms', lineHeight: 1.1, marginBottom: 8 }}
        >
          {totalRequests.toLocaleString()}
        </div>

        {/* Sparkline SVG */}
        <svg width="100%" height="48" viewBox="0 0 300 48" style={{ display: 'block', marginBottom: 16 }}>
          <path
            d="M0,32 C40,28 60,20 90,22 C120,24 140,14 170,16 C200,18 220,30 250,26 C270,24 290,20 300,18"
            stroke="rgba(255,255,255,0.4)"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Bottom row: three stats */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 16, flexShrink: 0 }}>
        {[
          { label: 'Success Rate', value: `${weightedSuccessRate}%` },
          { label: 'Non-Success', value: `${nonSuccessRate}%` },
          { label: 'Audit Flags', value: String(auditFlags) },
        ].map((item, i) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              textAlign: 'center',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.3)' : 'none',
              paddingLeft: i > 0 ? 12 : 0,
            }}
          >
            <div style={{ color: 'white', fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
