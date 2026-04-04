import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send } from 'lucide-react'
import { apiFetch } from '../api/client.js'

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

const INPUT_STYLE = {
  width: '100%',
  border: '1px solid #F0F0EE',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#FAFAFA',
  color: '#1A1A2E',
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

function StatChip({ label, value }) {
  return (
    <div style={{
      background: '#F9F9F7', borderRadius: 10, padding: '12px 16px',
    }}>
      <div style={{ fontSize: '0.72rem', color: '#9B9B9B', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</div>
    </div>
  )
}

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const INITIAL_FORM = { apiKey: '', modelId: '', inputTokens: '300', idempotencyKey: '', prompt: '' }

export default function GatewayPage({ setActivePage }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!form.apiKey || !form.modelId || !form.inputTokens || !form.prompt) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await apiFetch('/api/gateway/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': form.apiKey },
        body: JSON.stringify({
          modelId: Number(form.modelId),
          inputTokens: Number(form.inputTokens),
          idempotencyKey: form.idempotencyKey || undefined,
          prompt: form.prompt,
        }),
      })
      setResult(res)
      setHistory(prev => [{
        ts: new Date().toISOString(),
        modelId: form.modelId,
        inputTokens: form.inputTokens,
        cost: res.computedCost,
        status: res.status || 'success',
      }, ...prev].slice(0, 10))
    } catch (err) {
      setError(err.message || 'Request failed')
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
              <div>
                <label style={LABEL_STYLE}>X-API-Key *</label>
                <input
                  type="text"
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={e => setField('apiKey', e.target.value)}
                  style={INPUT_STYLE}
                />
                <div style={{ fontSize: '0.72rem', color: '#9B9B9B', marginTop: 3 }}>
                  Sent as X-API-Key header
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Model ID *</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={form.modelId}
                    onChange={e => setField('modelId', e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Input Tokens *</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={form.inputTokens}
                    onChange={e => setField('inputTokens', e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Prompt *</label>
                <textarea
                  rows={3}
                  placeholder="Enter your prompt..."
                  value={form.prompt}
                  onChange={e => setField('prompt', e.target.value)}
                  style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Idempotency Key</label>
                <input
                  type="text"
                  placeholder="optional"
                  value={form.idempotencyKey}
                  onChange={e => setField('idempotencyKey', e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? '#9B9B9B' : 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 150ms',
                }}
              >
                {loading
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Sending...</>
                  : <><Send size={14} /> Submit Request →</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Right — Response */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 28,
            minHeight: 280, display: 'flex', flexDirection: 'column',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 20, display: 'block' }}>
              RESPONSE
            </span>

            {!result && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Zap size={36} color="#F0F0EE" />
                <div style={{ fontSize: '0.875rem', color: '#9B9B9B', textAlign: 'center' }}>
                  Submit a request to see the live response
                </div>
              </div>
            )}

            {result && (
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
                    200 OK
                  </span>
                  <StatusBadge status={result.status || 'success'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <StatChip label="Cost" value={result.computedCost != null ? `$${result.computedCost.toFixed(4)}` : '—'} />
                  <StatChip label="Output Tokens" value={result.outputTokens ?? '—'} />
                  <StatChip label="Latency" value={result.latencyMs != null ? `${result.latencyMs}ms` : '—'} />
                  <StatChip label="Status" value={result.status || '—'} />
                </div>
              </motion.div>
            )}

            {error && (
              <div style={{
                border: '1px solid #E84545', borderRadius: 12, padding: '14px 16px',
                color: '#E84545', fontSize: '0.875rem', lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request History */}
      {history.length > 0 && (
        <div style={{ marginTop: 24, background: 'white', borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
            SESSION HISTORY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
                {['Time', 'Model ID', 'Input Tokens', 'Cost', 'Status'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: '#9B9B9B', fontWeight: 600, textAlign: 'left', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0EE' }}>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem', color: '#9B9B9B' }}>{fmtDate(row.ts)}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>{row.modelId}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>{Number(row.inputTokens).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {row.cost != null ? `$${row.cost.toFixed(4)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
