import React, { useRef } from 'react'
import { MoreHorizontal } from 'lucide-react'

export default function HeroCard({ modelsStats, revokedUsage, missingResponses, loading }) {
  const totalRef = useRef(null)

  // Computed values
  const totalRequests = modelsStats.reduce((sum, m) => sum + m.totalRequests, 0)
  const weightedSuccessRate = modelsStats.length > 0
    ? (modelsStats.reduce((sum, m) => sum + m.successRate * m.totalRequests, 0) / totalRequests).toFixed(1)
    : '0.0'
  const nonSuccessRate = (100 - parseFloat(weightedSuccessRate)).toFixed(1)
  const auditFlags = revokedUsage.length + missingResponses.length

  if (loading) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', borderRadius: 20, padding: 24 }}>
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
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'white', fontSize: '0.85rem', opacity: 0.9 }}>Total Requests</span>
        <MoreHorizontal color="white" size={18} style={{ opacity: 0.7 }} />
      </div>

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

      {/* Bottom row: three stats */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 16 }}>
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
