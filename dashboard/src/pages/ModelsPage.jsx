import React from 'react'
import { motion } from 'framer-motion'
import ModelBarChart from '../components/ModelBarChart.jsx'

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

function SuccessBar({ pct }) {
  return (
    <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#F0F0EE', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 2, background: '#4CAF82', width: `${pct}%` }} />
    </div>
  )
}

function getChip(model, models) {
  const rates = models.map(m => m.successRate)
  const latencies = models.map(m => m.avgLatencyMs)
  if (model.successRate === Math.max(...rates))
    return { text: 'Highest reliability', color: '#4CAF82', bg: '#F0FAF5' }
  if (model.avgLatencyMs === Math.min(...latencies))
    return { text: 'Fastest response', color: '#4CAF82', bg: '#F0FAF5' }
  if (model.avgLatencyMs === Math.max(...latencies))
    return { text: 'Highest latency', color: '#F5A623', bg: '#FFF8EE' }
  return { text: 'Balanced performance', color: '#9B9B9B', bg: '#F4F4F0' }
}

export default function ModelsPage({ data, setActivePage }) {
  const models = data || []
  const totalRequests = models.reduce((s, m) => s + m.totalRequests, 0)

  const best = models.length > 0 ? models.reduce((a, b) => a.successRate > b.successRate ? a : b) : null
  const fastest = models.length > 0 ? models.reduce((a, b) => a.avgLatencyMs < b.avgLatencyMs ? a : b) : null

  const insight = best && fastest
    ? `${best.provider}/${best.modelName} leads in reliability at ${best.successRate}% success rate. ${fastest.provider}/${fastest.modelName} offers the lowest latency at ${fastest.avgLatencyMs}ms.`
    : 'No model data available.'

  return (
    <div>
      <BackButton onClick={() => setActivePage('overview')} />

      <motion.div layoutId="models-card" style={{ borderRadius: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 32 }}>
          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em' }}>
              MODEL PERFORMANCE
            </span>
            <span style={{ fontSize: '0.8rem', color: '#9B9B9B' }}>
              All-time aggregates · {totalRequests.toLocaleString()} total requests
            </span>
          </div>

          {/* Expanded chart */}
          <ModelBarChart data={models} loading={false} chartHeight={280} />

          {/* Model cards */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
            {models.map(model => {
              const chip = getChip(model, models)
              return (
                <div key={model.modelId} style={{
                  flex: 1,
                  background: '#F9F9F7',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF82', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {model.provider}/{model.modelName}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: '#9B9B9B' }}>Success Rate</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4CAF82' }}>{model.successRate}%</span>
                      </div>
                      <SuccessBar pct={model.successRate} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9B9B9B' }}>Avg Latency</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{model.avgLatencyMs}<span style={{ fontWeight: 400, color: '#9B9B9B' }}> ms</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9B9B9B' }}>Total Requests</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{model.totalRequests.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Chip */}
                  <span style={{
                    alignSelf: 'flex-start',
                    background: chip.bg,
                    color: chip.color,
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                  }}>
                    {chip.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Insight box */}
      <div style={{
        marginTop: 16,
        padding: '16px 20px',
        background: '#F0FAF5',
        borderLeft: '3px solid #4CAF82',
        borderRadius: '0 12px 12px 0',
        fontSize: '0.875rem',
        color: '#1A1A2E',
        lineHeight: 1.6,
      }}>
        {insight}
      </div>
    </div>
  )
}
