import React, { useState } from 'react'
import { Zap, X, Send } from 'lucide-react'
// open and onClose are controlled by App via the Header CTA
import { apiFetch } from '../api/client.js'

const INITIAL_FORM = {
  apiKey: '',
  modelId: '',
  inputTokens: '',
  idempotencyKey: '',
  prompt: '',
}

function StatusBadge({ status }) {
  const colors = { success: '#4CAF82', failed: '#F5A623', denied: '#E84545' }
  return (
    <span style={{
      background: colors[status] || '#9B9B9B',
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

export default function GatewayTester({ open, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await apiFetch('/api/gateway/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': form.apiKey,
        },
        body: JSON.stringify({
          modelId: Number(form.modelId),
          inputTokens: Number(form.inputTokens),
          idempotencyKey: form.idempotencyKey || undefined,
          prompt: form.prompt,
        }),
      })
      setResult(res)
    } catch (err) {
      console.warn('Gateway submit failed:', err)
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const INPUT_STYLE = {
    border: '1px solid #F0F0EE',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.8rem',
    outline: 'none',
    background: 'white',
  }

  return (
    <>
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 340,
          background: 'white',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
          zIndex: 999,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #F0F0EE',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#FF6B6B" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Gateway Tester</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.72rem', color: '#9B9B9B', textTransform: 'uppercase', fontWeight: 600 }}>X-API-Key *</label>
                <input
                  type="text"
                  required
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={e => setField('apiKey', e.target.value)}
                  style={{ ...INPUT_STYLE, width: 160 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.72rem', color: '#9B9B9B', textTransform: 'uppercase', fontWeight: 600 }}>Model ID *</label>
                <input
                  type="number"
                  required
                  placeholder="1"
                  value={form.modelId}
                  onChange={e => setField('modelId', e.target.value)}
                  style={{ ...INPUT_STYLE, width: 90 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.72rem', color: '#9B9B9B', textTransform: 'uppercase', fontWeight: 600 }}>Input Tokens *</label>
                <input
                  type="number"
                  required
                  placeholder="100"
                  value={form.inputTokens}
                  onChange={e => setField('inputTokens', e.target.value)}
                  style={{ ...INPUT_STYLE, width: 110 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.72rem', color: '#9B9B9B', textTransform: 'uppercase', fontWeight: 600 }}>Idempotency Key</label>
                <input
                  type="text"
                  placeholder="optional"
                  value={form.idempotencyKey}
                  onChange={e => setField('idempotencyKey', e.target.value)}
                  style={{ ...INPUT_STYLE, width: 140 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.72rem', color: '#9B9B9B', textTransform: 'uppercase', fontWeight: 600 }}>Prompt *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your prompt..."
                  value={form.prompt}
                  onChange={e => setField('prompt', e.target.value)}
                  style={{ ...INPUT_STYLE, width: '100%' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  background: loading ? '#9B9B9B' : '#1A1A2E',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  height: 36,
                  alignSelf: 'flex-end',
                }}
              >
                <Send size={14} />
                {loading ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>

          {/* Result */}
          {result && (
            <div style={{
              marginTop: 8,
              padding: '12px 16px',
              background: '#F4F4F0',
              borderRadius: 12,
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              fontSize: '0.8rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#9B9B9B' }}>Status:</span>
                <StatusBadge status={result.status || 'success'} />
              </div>
              {result.computedCost != null && (
                <div>
                  <span style={{ color: '#9B9B9B' }}>Cost: </span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>${(result.computedCost).toFixed(4)}</span>
                </div>
              )}
              {result.outputTokens != null && (
                <div>
                  <span style={{ color: '#9B9B9B' }}>Output Tokens: </span>
                  <span style={{ fontWeight: 600 }}>{result.outputTokens}</span>
                </div>
              )}
              {result.latencyMs != null && (
                <div>
                  <span style={{ color: '#9B9B9B' }}>Latency: </span>
                  <span style={{ fontWeight: 600 }}>{result.latencyMs}ms</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 8,
              padding: '10px 16px',
              background: 'rgba(232,69,69,0.08)',
              borderRadius: 10,
              color: '#E84545',
              fontSize: '0.8rem',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
