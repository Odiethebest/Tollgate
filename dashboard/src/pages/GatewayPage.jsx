import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send } from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const STATUS_COLORS = { success: '#4CAF82', failed: '#F5A623', denied: '#E84545' }

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
  return (
    <span style={{
      background: STATUS_COLORS[status] || '#9B9B9B', color: 'white',
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

function pushHistoryEntry(setHistory, data, body) {
  setHistory(prev => [
    {
      ...data,
      modelId: body.modelId,
      inputTokens: body.inputTokens,
      submittedAt: new Date().toISOString(),
    },
    ...prev,
  ].slice(0, 10))
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

const ADMIN_INPUT = {
  padding: '8px 10px',
  border: '1px solid #F0F0EE',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#1A1A2E',
  background: '#FAFAFA',
  outline: 'none',
}

function adminBtnStyle(disabled) {
  return {
    padding: '8px 16px',
    background: disabled ? '#ccc' : '#1A1A2E',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }
}

export default function GatewayPage({
  setActivePage, onSubmitSuccess,
  apiKey, setApiKey,
  modelId, setModelId,
  inputTokens, setInputTokens,
  prompt, setPrompt,
  idempotencyKey, setIdempotencyKey,
  loading, setLoading,
  response, setResponse,
  error, setError,
  history, setHistory,
  submitted, setSubmitted,
}) {
  const isDisabled = loading || !apiKey || !modelId || !inputTokens || !prompt

  const [invoices, setInvoices] = useState([])
  const [invoiceMonth, setInvoiceMonth] = useState('2026-04')
  const [generating, setGenerating] = useState(false)

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${BASE}/api/invoices?billingMonth=${invoiceMonth}`)
      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : [])
    } catch (e) {
      setInvoices([])
    }
  }

  const generateInvoice = async () => {
    setGenerating(true)
    try {
      await fetch(`${BASE}/api/invoices/generate?billingMonth=${invoiceMonth}`, { method: 'POST' })
      await fetchInvoices()
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [])

  // Admin panel state
  const [adminOpen, setAdminOpen] = useState(false)
  const [tenantName, setTenantName] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [createdTenant, setCreatedTenant] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [projectEnv, setProjectEnv] = useState('dev')
  const [createdProject, setCreatedProject] = useState(null)
  const [keyLabel, setKeyLabel] = useState('demo-key')
  const [createdKey, setCreatedKey] = useState(null)
  const [revokedKey, setRevokedKey] = useState(false)
  const [quotaConfigured, setQuotaConfigured] = useState(false)
  const [pricingConfigured, setPricingConfigured] = useState(false)
  const [adminError, setAdminError] = useState(null)
  const [adminLoading, setAdminLoading] = useState(null)

  const createTenant = async () => {
    setAdminError(null)
    setAdminLoading('tenant')
    try {
      const res = await fetch(`${BASE}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenantName, contactEmail: tenantEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant')
      setCreatedTenant(data)
    } catch (e) {
      setAdminError(e.message)
    } finally {
      setAdminLoading(null)
    }
  }

  const createProject = async () => {
    setAdminError(null)
    setAdminLoading('project')
    try {
      const res = await fetch(`${BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: createdTenant.tenantId, name: projectName, environment: projectEnv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create project')
      setCreatedProject(data)
    } catch (e) {
      setAdminError(e.message)
    } finally {
      setAdminLoading(null)
    }
  }

  const revokeKey = async () => {
    setAdminError(null)
    setAdminLoading('revoke')
    try {
      const res = await fetch(`${BASE}/api/keys/${createdKey.keyId}/revoke`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to revoke key')
      setRevokedKey(true)
    } catch (e) {
      setAdminError(e.message)
    } finally {
      setAdminLoading(null)
    }
  }

  const issueKey = async () => {
    setAdminError(null)
    setAdminLoading('key')
    try {
      const res = await fetch(`${BASE}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: createdProject.projectId, label: keyLabel || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to issue key')
      setCreatedKey(data)

      const currentMonth = new Date().toISOString().slice(0, 7)

      try {
        await fetch(`${BASE}/api/pricing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: 1, billingMonth: currentMonth, inputRate: 0.005, outputRate: 0.015 }),
        })
        setPricingConfigured(true)
      } catch (e) {
        console.error('Pricing auto-config failed:', e)
      }

      try {
        await fetch(`${BASE}/api/quotas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: createdProject.projectId, billingMonth: currentMonth, tokenLimit: 10000, costLimit: 50 }),
        })
        setQuotaConfigured(true)
      } catch (e) {
        console.error('Quota auto-config failed:', e)
      }
    } catch (e) {
      setAdminError(e.message)
    } finally {
      setAdminLoading(null)
    }
  }

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

      if (res.ok || data?.status === 'failed') {
        setResponse(data)
        pushHistoryEntry(setHistory, data, body)
        onSubmitSuccess?.()
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

      <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>

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
                  onChange={e => setIdempotencyKey(e.target.value)}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            background: '#F9F9F7', borderRadius: 20, padding: 28,
            flex: 1, display: 'flex', flexDirection: 'column',
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
                    background: STATUS_COLORS[response.status] || '#4CAF82', color: 'white',
                    borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {response.httpStatus != null
                      ? `${response.httpStatus}${response.httpStatus < 400 ? ' OK' : ''}`
                      : '—'}
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
                  {response.message ? ` · ${response.message}` : ''}
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

      {/* Invoice Section */}
      <div style={{ background: '#fff', borderRadius: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '24px', marginTop: '24px' }}>

        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#9B9B9B',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
          INVOICES
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
          <input
            type="month"
            value={invoiceMonth}
            onChange={e => setInvoiceMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #F0F0EE',
                     fontSize: '0.875rem', color: '#1A1A2E' }}
          />
          <button
            onClick={generateInvoice}
            disabled={generating}
            style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                     color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600,
                     fontSize: '0.875rem', cursor: generating ? 'not-allowed' : 'pointer' }}
          >
            {generating ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
              {['Invoice ID', 'Project ID', 'Billing Month', 'Total Tokens', 'Total Cost', 'Paid'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px',
                                     fontSize: '0.75rem', color: '#9B9B9B',
                                     textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#9B9B9B' }}>
                  No invoices for this month
                </td>
              </tr>
            ) : invoices.map(inv => (
              <tr key={inv.invoiceId} style={{ borderBottom: '1px solid #F0F0EE' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>#{inv.invoiceId}</td>
                <td style={{ padding: '10px 12px' }}>Proj {inv.projectId}</td>
                <td style={{ padding: '10px 12px' }}>{inv.billingMonth}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {inv.totalTokens?.toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                  ${Number(inv.totalCost).toFixed(4)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem',
                                 fontWeight: 500,
                                 background: inv.paid ? '#E8F5E9' : '#FFF3E0',
                                 color: inv.paid ? '#4CAF82' : '#F5A623' }}>
                    {inv.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Panel */}
      <div style={{ background: '#fff', borderRadius: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '24px', marginTop: '24px' }}>

        <div
          onClick={() => setAdminOpen(o => !o)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                   cursor: 'pointer', userSelect: 'none' }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#9B9B9B',
                      textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            ADMIN — Initialize Tenant &amp; Credentials
          </p>
          <span style={{ color: '#9B9B9B', fontSize: '0.875rem' }}>{adminOpen ? '▲' : '▼'}</span>
        </div>

        {adminOpen && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {adminError && (
              <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #E84545',
                            borderRadius: '8px', fontSize: '0.8rem', color: '#E84545' }}>
                {adminError}
              </div>
            )}

            {/* Step 1 — Tenant */}
            <div style={{ border: '1px solid #F0F0EE', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9B9B9B',
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Step 1 · Create Tenant
              </div>
              {createdTenant ? (
                <div style={{ fontSize: '0.8rem', color: '#4CAF82', fontWeight: 500 }}>
                  ✓ Tenant created — ID {createdTenant.tenantId} · {createdTenant.name}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input placeholder="Tenant name" value={tenantName}
                    onChange={e => setTenantName(e.target.value)} style={ADMIN_INPUT} />
                  <input placeholder="Contact email" value={tenantEmail}
                    onChange={e => setTenantEmail(e.target.value)} style={ADMIN_INPUT} />
                  <button onClick={createTenant}
                    disabled={adminLoading === 'tenant' || !tenantName || !tenantEmail}
                    style={adminBtnStyle(adminLoading === 'tenant' || !tenantName || !tenantEmail)}>
                    {adminLoading === 'tenant' ? 'Creating...' : 'Create Tenant'}
                  </button>
                </div>
              )}
            </div>

            {/* Step 2 — Project */}
            <div style={{ border: '1px solid #F0F0EE', borderRadius: '12px', padding: '16px',
                          opacity: createdTenant ? 1 : 0.4 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9B9B9B',
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Step 2 · Create Project{createdTenant ? ` (Tenant #${createdTenant.tenantId})` : ''}
              </div>
              {createdProject ? (
                <div style={{ fontSize: '0.8rem', color: '#4CAF82', fontWeight: 500 }}>
                  ✓ Project created — ID {createdProject.projectId} · {createdProject.name} [{createdProject.environment}]
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input placeholder="Project name" value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    disabled={!createdTenant} style={ADMIN_INPUT} />
                  <select value={projectEnv} onChange={e => setProjectEnv(e.target.value)}
                    disabled={!createdTenant}
                    style={{ ...ADMIN_INPUT, width: 'auto' }}>
                    <option value="dev">dev</option>
                    <option value="staging">staging</option>
                    <option value="prod">prod</option>
                  </select>
                  <button onClick={createProject}
                    disabled={adminLoading === 'project' || !createdTenant || !projectName}
                    style={adminBtnStyle(adminLoading === 'project' || !createdTenant || !projectName)}>
                    {adminLoading === 'project' ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              )}
            </div>

            {/* Step 3 — API Key */}
            <div style={{ border: '1px solid #F0F0EE', borderRadius: '12px', padding: '16px',
                          opacity: createdProject ? 1 : 0.4 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9B9B9B',
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Step 3 · Issue API Key{createdProject ? ` (Project #${createdProject.projectId})` : ''}
              </div>
              {createdKey ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '0.8rem', color: revokedKey ? '#E84545' : '#4CAF82', fontWeight: 500 }}>
                        {revokedKey ? '✗ Key revoked — status = revoked (soft delete, audit trail preserved)' : `✓ API key issued — Key ID ${createdKey.keyId}`}
                      </div>
                      {quotaConfigured && (
                        <div style={{ fontSize: '0.8rem', color: '#4CAF82', fontWeight: 500 }}>
                          ✓ Quota configured — 10,000 tokens for {new Date().toISOString().slice(0, 7)}
                        </div>
                      )}
                      {pricingConfigured && (
                        <div style={{ fontSize: '0.8rem', color: '#4CAF82', fontWeight: 500 }}>
                          ✓ Pricing configured — Model 1 ready
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ background: '#F4F4F0', borderRadius: '6px', padding: '4px 10px',
                                   fontSize: '0.8rem', color: revokedKey ? '#E84545' : '#1A1A2E',
                                   flex: 1, wordBreak: 'break-all',
                                   textDecoration: revokedKey ? 'line-through' : 'none' }}>
                      {createdKey.rawKey}
                    </code>
                    <button onClick={() => setApiKey(createdKey.rawKey)}
                      style={{ padding: '4px 12px', background: '#1A1A2E', color: '#fff',
                               border: 'none', borderRadius: '6px', fontSize: '0.75rem',
                               fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Use this key ↑
                    </button>
                    {!revokedKey && (
                      <button onClick={revokeKey}
                        disabled={adminLoading === 'revoke'}
                        style={{ padding: '4px 12px', background: '#E84545', color: '#fff',
                                 border: 'none', borderRadius: '6px', fontSize: '0.75rem',
                                 fontWeight: 600, cursor: adminLoading === 'revoke' ? 'not-allowed' : 'pointer',
                                 whiteSpace: 'nowrap' }}>
                        {adminLoading === 'revoke' ? 'Revoking...' : 'Revoke Key'}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9B9B9B' }}>
                    {revokedKey
                      ? 'Now paste this key into the gateway form and submit — you will get a 403.'
                      : 'Shown once. Copy it now or click "Use this key" to auto-fill the form above.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input placeholder="Key label (optional)" value={keyLabel}
                    onChange={e => setKeyLabel(e.target.value)}
                    disabled={!createdProject} style={ADMIN_INPUT} />
                  <button onClick={issueKey}
                    disabled={adminLoading === 'key' || !createdProject}
                    style={adminBtnStyle(adminLoading === 'key' || !createdProject)}>
                    {adminLoading === 'key' ? 'Issuing...' : 'Issue API Key'}
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
