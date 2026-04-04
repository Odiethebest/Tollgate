import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send } from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

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

function StatusBadge({ status }) {
  const colors = { success: '#4CAF82', failed: '#F5A623', denied: '#E84545' }
  return (
    <span style={{
      background: colors[status] || '#9B9B9B', color: 'white',
      borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 500,
    }}>
      {status}
    </span>
  )
}

function StatChip({ label, value }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '0.75rem', color: '#9B9B9B', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1A1A2E' }}>{value}</div>
    </div>
  )
}

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const INPUT_STYLE = {
  width: '100%',
  border: '1px solid #F0F0EE',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#FAFAFA',
  color: '#1A1A2E',
  boxSizing: 'border-box',
}

const LABEL_STYLE = {
  fontSize: '0.72rem',
  color: '#9B9B9B',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.05em',
  marginBottom: 4,
  display: 'block',
}

export default function GatewayPage({ setActivePage }) {
  const [apiKey, setApiKey]         = useState('')
  const [modelId, setModelId]       = useState(1)
  const [inputTokens, setInputTokens] = useState(300)
  const [prompt, setPrompt]         = useState('')
  const [idempotencyKey, setIdem]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [response, setResponse]     = useState(null)
  const [error, setError]           = useState(null)
  const [history, setHistory]       = useState([])
  const [submitted, setSubmitted]   = useState(false)

  const isDisabled = loading || !apiKey || !modelId || !inputTokens || !prompt

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!apiKey || !modelId || !inputTokens || !prompt) return

    setLoading(true)
    setResponse(null)
    setError(null)

    const body = {
      modelId: Number(modelId),
      inputTokens: Number(inputTokens),
      prompt,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }

    try {
      const res = await fetch(`${BASE}/api/gateway/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok) {
        setResponse(data)
        setHistory(prev => [
          { ...data, submittedAt: new Date().toISOString() },
          ...prev,
        ].slice(0, 10))
      } else {
        setError(data)
      }
    } catch (err) {
      setError({ message: 'Network error — is the backend running?', status: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={() => setActivePage('overview')} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Left — Form */}
        <div style={{ width: 'calc(45% - 12px)' }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <Zap size={16} color="#FF6B6B" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em' }}>
                SUBMIT REQUEST
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* X-API-Key */}
              <div>
                <label style={LABEL_STYLE}>X-API-Key *</label>
                <input
                  type="text"
                  placeholder="raw key value"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ ...INPUT_STYLE, borderColor: submitted && !apiKey ? '#E84545' : '#F0F0EE' }}
                />
                {submitted && !apiKey
                  ? <div style={{ fontSize: '0.72rem', color: '#E84545', marginTop: 3 }}>API key is required</div>
                  : <div style={{ fontSize: '0.72rem', color: '#9B9B9B', marginTop: 3 }}>Sent as X-API-Key header</div>
                }
              </div>

              {/* Model ID + Input Tokens */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Model ID *</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Input Tokens *</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={inputTokens}
                    onChange={e => setInputTokens(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label style={LABEL_STYLE}>Prompt *</label>
                <textarea
                  rows={3}
                  placeholder="Enter your prompt..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  style={{
                    ...INPUT_STYLE,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    borderColor: submitted && !prompt ? '#E84545' : '#F0F0EE',
                  }}
                />
                {submitted && !prompt && (
                  <div style={{ fontSize: '0.72rem', color: '#E84545', marginTop: 3 }}>Prompt is required</div>
                )}
              </div>

              {/* Idempotency Key */}
              <div>
                <label style={LABEL_STYLE}>Idempotency Key</label>
                <input
                  type="text"
                  placeholder="optional"
                  value={idempotencyKey}
                  onChange={e => setIdem(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isDisabled
                    ? '#ccc'
                    : 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 150ms',
                }}
              >
                {loading
                  ? <>
                      <span style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                        display: 'inline-block',
                        flexShrink: 0,
                      }} />
                      Submitting...
                    </>
                  : <><Send size={14} /> Submit Request →</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Right — Response */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: '#F9F9F7', borderRadius: 20, padding: 28,
            minHeight: 280, display: 'flex', flexDirection: 'column',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 20, display: 'block' }}>
              RESPONSE
            </span>

            {/* Empty state */}
            {!response && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Zap size={36} color="#E0E0E0" />
                <div style={{ fontSize: '0.875rem', color: '#9B9B9B', textAlign: 'center' }}>
                  Submit a request to see the live response
                </div>
              </div>
            )}

            {/* Success */}
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#4CAF82', color: 'white',
                    borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {response.httpStatus ?? 200} OK
                  </span>
                  <StatusBadge status={response.status || 'success'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <StatChip
                    label="Cost"
                    value={response.computedCost != null ? `$${response.computedCost.toFixed(4)}` : '—'}
                  />
                  <StatChip
                    label="Output Tokens"
                    value={response.outputTokens ?? '—'}
                  />
                  <StatChip
                    label="Latency"
                    value={response.latencyMs != null ? `${response.latencyMs}ms` : '—'}
                  />
                  <StatChip
                    label="Idempotent"
                    value={response.idempotent ? 'Yes' : 'No'}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: '#9B9B9B' }}>
                  Request #{response.requestId}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  border: '1px solid #E84545',
                  borderRadius: 12,
                  padding: '16px 18px',
                  background: '#FFF5F5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#E84545', color: 'white',
                    borderRadius: 6, padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {error.status || 'Error'}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1A1A2E', lineHeight: 1.5 }}>
                  {error.message || 'An unexpected error occurred.'}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Request History */}
      <div style={{ marginTop: 24, background: 'white', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
          SESSION HISTORY
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9B9B9B', fontSize: '0.875rem', padding: '24px 0' }}>
            No requests submitted yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
                {['#', 'Submitted At', 'Model ID', 'Input Tokens', 'Cost', 'Status'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: '#9B9B9B', fontWeight: 600, textAlign: 'left', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0EE' }}>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem', color: '#9B9B9B' }}>{history.length - i}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem', color: '#9B9B9B' }}>{fmtDate(row.submittedAt)}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>{row.modelId ?? '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>
                    {row.inputTokens != null ? Number(row.inputTokens).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {row.computedCost != null ? `$${row.computedCost.toFixed(4)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <StatusBadge status={row.status || 'success'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
