import React, { useState } from 'react'
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

function GrayPill({ children, nowrap }) {
  return (
    <span style={{
      background: '#F4F4F0', color: '#9B9B9B',
      borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem',
      whiteSpace: nowrap ? 'nowrap' : undefined,
    }}>
      {children}
    </span>
  )
}

const TH_STYLE = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  color: '#9B9B9B',
  fontWeight: 600,
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #F0F0EE',
}

const TD_STYLE = { padding: '10px 10px', verticalAlign: 'middle', fontSize: '0.8rem' }

const PAGE_SIZE = 15

function Pagination({ page, totalPages, total, pageSize, setPage }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    if (page <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (page >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    }
    return pages
  }

  const btnBase = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem',
    minWidth: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page === 1}
          style={{ ...btnBase, color: page === 1 ? '#D0D0D0' : '#9B9B9B', cursor: page === 1 ? 'default' : 'pointer' }}
        >
          ←
        </button>

        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ color: '#9B9B9B', padding: '0 4px', fontSize: '0.8rem' }}>…</span>
            : <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  ...btnBase,
                  background: p === page ? '#1A1A2E' : 'none',
                  color: p === page ? 'white' : '#9B9B9B',
                  cursor: p === page ? 'default' : 'pointer',
                }}
              >
                {p}
              </button>
        )}

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page === totalPages}
          style={{ ...btnBase, color: page === totalPages ? '#D0D0D0' : '#9B9B9B', cursor: page === totalPages ? 'default' : 'pointer' }}
        >
          →
        </button>
      </div>

      <span style={{ fontSize: '0.75rem', color: '#9B9B9B' }}>
        Showing {start}–{end} of {total}
      </span>
    </div>
  )
}

export default function AuditPage({ revokedUsage, missingResponses, setActivePage }) {
  const rv = revokedUsage || []
  const mr = missingResponses || []
  const totalFlags = rv.length + mr.length

  const [activeTab, setActiveTab] = useState('revoked')
  const [page, setPage] = useState(1)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const data = activeTab === 'revoked' ? rv : mr
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const currentPageRows = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const latest = rv.length > 0
    ? [...rv].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))[0]
    : null

  const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / 86400000)

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
                <div style={{ color: s.color, fontSize: s.large ? '2.5rem' : '1.8rem', fontWeight: 600, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tab + Table */}
          <div style={{ background: 'white', padding: '0 24px 24px' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F0F0EE', marginBottom: 16 }}>
              {[
                { key: 'revoked', label: 'Revoked Key' },
                { key: 'missing', label: 'Missing Response' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '12px 16px',
                    fontSize: '0.875rem',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? '#1A1A2E' : '#9B9B9B',
                    borderBottom: `2px solid ${activeTab === tab.key ? '#1A1A2E' : 'transparent'}`,
                    marginBottom: -1,
                    transition: 'color 200ms',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>
                    {activeTab === 'revoked' ? (
                      <>
                        <th style={TH_STYLE}>Request ID</th>
                        <th style={TH_STYLE}>Key ID</th>
                        <th style={TH_STYLE}>Project ID</th>
                        <th style={TH_STYLE}>Requested At</th>
                        <th style={TH_STYLE}>Revoked At</th>
                      </>
                    ) : (
                      <>
                        <th style={TH_STYLE}>Request ID</th>
                        <th style={TH_STYLE}>Key ID</th>
                        <th style={TH_STYLE}>Model ID</th>
                        <th style={TH_STYLE}>Project ID</th>
                        <th style={TH_STYLE}>Requested At</th>
                        <th style={TH_STYLE}>Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'revoked' ? 5 : 6} style={{ ...TD_STYLE, textAlign: 'center', color: '#9B9B9B', padding: '24px' }}>
                        No records found
                      </td>
                    </tr>
                  ) : activeTab === 'revoked' ? (
                    currentPageRows.map(item => (
                      <tr key={item.requestId} style={{ borderBottom: '1px solid #F0F0EE' }}>
                        <td style={{ ...TD_STYLE, fontFamily: 'monospace' }}>#{item.requestId}</td>
                        <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}><GrayPill>Key {item.keyId}</GrayPill></td>
                        <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}><GrayPill>Proj {item.projectId}</GrayPill></td>
                        <td style={TD_STYLE}>{fmtDate(item.requestedAt)}</td>
                        <td style={{ ...TD_STYLE, color: '#E84545' }}>{fmtDate(item.revokedAt)}</td>
                      </tr>
                    ))
                  ) : (
                    currentPageRows.map(item => (
                      <tr key={item.requestId} style={{ borderBottom: '1px solid #F0F0EE' }}>
                        <td style={{ ...TD_STYLE, fontFamily: 'monospace' }}>#{item.requestId}</td>
                        <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}><GrayPill>Key {item.keyId}</GrayPill></td>
                        <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}><GrayPill>Model {item.modelId}</GrayPill></td>
                        <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}><GrayPill>Proj {item.projectId}</GrayPill></td>
                        <td style={TD_STYLE}>{fmtDate(item.requestedAt)}</td>
                        <td style={TD_STYLE}><StatusBadge status={item.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.length}
              pageSize={PAGE_SIZE}
              setPage={setPage}
            />
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
