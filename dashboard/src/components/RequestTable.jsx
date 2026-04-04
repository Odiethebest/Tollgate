import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/client.js'
import { MOCK } from '../data/mock.js'

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

const STATUS_COLORS = { success: '#4CAF82', failed: '#F5A623', denied: '#E84545' }

function StatusBadge({ status }) {
  return (
    <span style={{
      background: STATUS_COLORS[status] || '#9B9B9B',
      color: 'white',
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: '0.75rem',
      fontWeight: 500,
    }}>
      {status}
    </span>
  )
}

function GrayPill({ children }) {
  return (
    <span style={{
      background: '#F4F4F0',
      color: '#9B9B9B',
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: '0.75rem',
    }}>
      {children}
    </span>
  )
}

function TypeBadge({ type }) {
  const isRevoked = type === 'REVOKED_KEY'
  return (
    <span style={{
      background: isRevoked ? '#E84545' : '#F5A623',
      color: 'white',
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: '0.75rem',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  )
}

const TH_STYLE = {
  padding: '8px 8px',
  textAlign: 'left',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  color: '#9B9B9B',
  fontWeight: 600,
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const TD_STYLE = { padding: '10px 8px', verticalAlign: 'middle' }

function toIso(val) {
  if (!val) return val
  return val.length === 16 ? val + ':00' : val
}

function buildQuery(params) {
  const parts = []
  if (params.from) parts.push(`from=${encodeURIComponent(toIso(params.from))}`)
  if (params.to) parts.push(`to=${encodeURIComponent(toIso(params.to))}`)
  return parts.length ? '?' + parts.join('&') : ''
}

export default function RequestTable() {
  const [activeTab, setActiveTab] = useState('keyRequests')
  const [keyId, setKeyId] = useState('1')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [keyRequestsData, setKeyRequestsData] = useState([])
  const [auditFlagsData, setAuditFlagsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchKeyRequests = useCallback(async (id, from, to) => {
    try {
      const query = buildQuery({ from, to })
      const data = await apiFetch(`/api/audit/keys/${id}/requests${query}`)
      setKeyRequestsData(data)
    } catch (e) {
      console.warn('Key requests fetch failed, using mock:', e)
      setKeyRequestsData(MOCK.keyRequests)
    }
  }, [])

  const fetchAuditFlags = useCallback(async () => {
    try {
      const [revoked, missing] = await Promise.all([
        apiFetch('/api/audit/revoked-usage'),
        apiFetch('/api/audit/missing-responses'),
      ])
      const merged = [
        ...revoked.map(r => ({ ...r, type: 'REVOKED_KEY' })),
        ...missing.map(r => ({ ...r, type: 'MISSING_RESPONSE' })),
      ].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
      setAuditFlagsData(merged)
    } catch (e) {
      console.warn('Audit flags fetch failed, using mock:', e)
      const merged = [
        ...MOCK.revokedUsage.map(r => ({ ...r, type: 'REVOKED_KEY' })),
        ...MOCK.missingResponses.map(r => ({ ...r, type: 'MISSING_RESPONSE' })),
      ].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
      setAuditFlagsData(merged)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchKeyRequests('1', '', ''),
      fetchAuditFlags(),
    ]).finally(() => setLoading(false))
  }, [fetchKeyRequests, fetchAuditFlags])

  const handleSearch = () => {
    setLoading(true)
    fetchKeyRequests(keyId, fromDate, toDate).finally(() => setLoading(false))
  }

  return (
    <div id="audit" style={{ background: 'white', borderRadius: 20, padding: 24, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #F0F0EE', flexShrink: 0 }}>
        {[
          { key: 'keyRequests', label: 'Key Requests' },
          { key: 'auditFlags', label: 'Audit Flags' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 16px',
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

      {/* Controls — outside scroll area so they stay visible */}
      {activeTab === 'keyRequests' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          <input
            type="number"
            placeholder="Key ID"
            value={keyId}
            onChange={e => setKeyId(e.target.value)}
            style={{
              width: 80,
              padding: '6px 10px',
              border: '1px solid #F0F0EE',
              borderRadius: 8,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <input
            type="datetime-local"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #F0F0EE',
              borderRadius: 8,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <input
            type="datetime-local"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #F0F0EE',
              borderRadius: 8,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '6px 16px',
              background: '#1A1A2E',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Search
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'keyRequests' && (
          <>
            {loading ? (
              <div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
                      <th style={TH_STYLE}>Request ID</th>
                      <th style={TH_STYLE}>Requested At</th>
                      <th style={TH_STYLE}>Status</th>
                      <th style={TH_STYLE}>Model ID</th>
                      <th style={TH_STYLE}>Project ID</th>
                      <th style={{ ...TH_STYLE, textAlign: 'right' }}>Input Tokens</th>
                      <th style={{ ...TH_STYLE, textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyRequestsData.map(row => (
                      <tr key={row.requestId} style={{ borderBottom: '1px solid #F0F0EE' }}>
                        <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: '0.8rem' }}>#{row.requestId}</td>
                        <td style={TD_STYLE}>{fmtDate(row.requestedAt)}</td>
                        <td style={TD_STYLE}><StatusBadge status={row.status} /></td>
                        <td style={TD_STYLE}><GrayPill>Model {row.modelId}</GrayPill></td>
                        <td style={TD_STYLE}><GrayPill>Proj {row.projectId}</GrayPill></td>
                        <td style={{ ...TD_STYLE, textAlign: 'right' }}>{row.inputTokens?.toLocaleString() ?? '—'}</td>
                        <td style={{ ...TD_STYLE, textAlign: 'right', fontFamily: 'monospace' }}>
                          ${(row.computedCost ?? 0).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                    {keyRequestsData.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...TD_STYLE, textAlign: 'center', color: '#9B9B9B' }}>No records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'auditFlags' && (
          <>
            {loading ? (
              <div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
                      <th style={TH_STYLE}>Type</th>
                      <th style={TH_STYLE}>Request ID</th>
                      <th style={TH_STYLE}>Key ID</th>
                      <th style={TH_STYLE}>Project ID</th>
                      <th style={TH_STYLE}>Requested At</th>
                      <th style={TH_STYLE}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditFlagsData.map((row, idx) => (
                      <tr key={`${row.type}-${row.requestId}-${idx}`} style={{ borderBottom: '1px solid #F0F0EE' }}>
                        <td style={TD_STYLE}><TypeBadge type={row.type} /></td>
                        <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: '0.8rem' }}>#{row.requestId}</td>
                        <td style={TD_STYLE}><GrayPill>Key {row.keyId}</GrayPill></td>
                        <td style={TD_STYLE}><GrayPill>Proj {row.projectId}</GrayPill></td>
                        <td style={TD_STYLE}>{fmtDate(row.requestedAt)}</td>
                        <td style={TD_STYLE}>
                          {row.type === 'REVOKED_KEY'
                            ? <span style={{ color: '#9B9B9B', fontSize: '0.8rem' }}>Revoked: {fmtDate(row.revokedAt)}</span>
                            : <StatusBadge status={row.status} />
                          }
                        </td>
                      </tr>
                    ))}
                    {auditFlagsData.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...TD_STYLE, textAlign: 'center', color: '#9B9B9B' }}>No audit flags found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
