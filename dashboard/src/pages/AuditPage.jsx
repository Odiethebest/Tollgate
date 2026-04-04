import React from 'react'
import { motion } from 'framer-motion'

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.875rem', color: '#9B9B9B', padding: '0 0 20px 0',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#1A1A2E'}
      onMouseLeave={e => e.currentTarget.style.color = '#9B9B9B'}
    >
      ← Overview
    </button>
  )
}

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function StatusBadge({ status }) {
  const colors = { success: '#4CAF82', failed: '#F5A623', denied: '#E84545' }
  return (
    <span style={{
      background: colors[status] || '#9B9B9B', color: 'white',
      borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 500,
    }}>
      {status}
    </span>
  )
}

function TimelineEntry({ dotColor, borderColor, children }) {
  return (
    <div style={{ display: 'flex', gap: 14, paddingBottom: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 3 }} />
        <div style={{ flex: 1, width: 2, background: borderColor, opacity: 0.2, marginTop: 4 }} />
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / 86400000)

export default function AuditPage({ revokedUsage, missingResponses, setActivePage }) {
  const rv = revokedUsage || []
  const mr = missingResponses || []
  const totalFlags = rv.length + mr.length

  const latest = rv.length > 0
    ? [...rv].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))[0]
    : null

  const insight = `${rv.length} compliance violation${rv.length !== 1 ? 's' : ''} detected. Most recent: ${latest ? daysSince(latest.requestedAt) + ' days ago' : 'N/A'}. ${mr.length} request${mr.length !== 1 ? 's have' : ' has'} no corresponding response record.`

  return (
    <div>
      <BackButton onClick={() => setActivePage('overview')} />

      <motion.div layoutId="audit-card" style={{ borderRadius: 20 }}>
        <div style={{ borderRadius: 20, overflow: 'hidden' }}>

          {/* Summary banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1A1A2E, #2D2D4E)',
            padding: '28px 32px',
            display: 'flex',
            gap: 48,
          }}>
            {[
              { label: 'Total Audit Flags', value: totalFlags, color: 'white', large: true },
              { label: 'Revoked Key Events', value: rv.length, color: '#FF8080' },
              { label: 'Missing Responses', value: mr.length, color: '#FFD080' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{
                  color: s.color,
                  fontSize: s.large ? '2.5rem' : '1.8rem',
                  fontWeight: 600,
                  lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Two-column timelines */}
          <div style={{ display: 'flex', background: 'white' }}>

            {/* Left — Revoked Key Events */}
            <div style={{ flex: 1, padding: 28, borderRight: '1px solid #F0F0EE' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E84545', letterSpacing: '0.08em', marginBottom: 20 }}>
                REVOKED KEY EVENTS
              </div>
              {rv.length === 0 && (
                <div style={{ color: '#9B9B9B', fontSize: '0.875rem' }}>No violations found</div>
              )}
              {rv.map(item => (
                <TimelineEntry key={`rv-${item.requestId}`} dotColor="#E84545" borderColor="#E84545">
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>
                    Request #{item.requestId}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9B9B9B', marginBottom: 6 }}>
                    Key {item.keyId} · Project {item.projectId}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9B9B9B' }}>
                    Requested: {fmtDate(item.requestedAt)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9B9B9B', marginBottom: 8 }}>
                    Key revoked: {fmtDate(item.revokedAt)}
                  </div>
                  <span style={{
                    background: 'rgba(232,69,69,0.1)', color: '#E84545',
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    COMPLIANCE VIOLATION
                  </span>
                </TimelineEntry>
              ))}
            </div>

            {/* Right — Missing Responses */}
            <div style={{ flex: 1, padding: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F5A623', letterSpacing: '0.08em', marginBottom: 20 }}>
                MISSING RESPONSES
              </div>
              {mr.length === 0 && (
                <div style={{ color: '#9B9B9B', fontSize: '0.875rem' }}>No missing responses found</div>
              )}
              {mr.map(item => (
                <TimelineEntry key={`mr-${item.requestId}`} dotColor="#F5A623" borderColor="#F5A623">
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>
                    Request #{item.requestId}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9B9B9B', marginBottom: 6 }}>
                    Key {item.keyId} · Model {item.modelId} · Project {item.projectId}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9B9B9B', marginBottom: 8 }}>
                    {fmtDate(item.requestedAt)}
                  </div>
                  <StatusBadge status={item.status} />
                </TimelineEntry>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Insight box */}
      <div style={{
        marginTop: 16,
        padding: '16px 20px',
        background: '#1A1A2E',
        borderRadius: 12,
        fontSize: '0.875rem',
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.6,
      }}>
        {insight}
      </div>
    </div>
  )
}
