import React from 'react'
import { motion } from 'framer-motion'
import QuotaDonut from '../components/QuotaDonut.jsx'

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

function ProgressBar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F0F0EE', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        borderRadius: 3,
        background: color,
        width: `${Math.min(pct, 100)}%`,
        transition: 'width 600ms ease',
      }} />
    </div>
  )
}

function StatusBadge({ usagePct }) {
  const isCritical = usagePct > 100
  return (
    <span style={{
      background: isCritical ? '#E84545' : '#F5A623',
      color: 'white', borderRadius: 6, padding: '2px 8px',
      fontSize: '0.75rem', fontWeight: 500,
    }}>
      {isCritical ? 'Critical' : 'Warning'}
    </span>
  )
}

const TH = { padding: '8px', fontSize: '0.75rem', textTransform: 'uppercase', color: '#9B9B9B', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'left' }
const TD = { padding: '12px 8px', verticalAlign: 'middle' }

export default function QuotaPage({ data, setActivePage }) {
  const safeData = data || []
  const warningCount = safeData.filter(d => d.usagePct >= 80 && d.usagePct <= 100).length
  const criticalCount = safeData.filter(d => d.usagePct > 100).length

  const insight = criticalCount > 0
    ? `${criticalCount} project${criticalCount > 1 ? 's have' : ' has'} exceeded its monthly token quota. Immediate review recommended to avoid service disruption.`
    : warningCount > 0
    ? `${warningCount} project${warningCount > 1 ? 's are' : ' is'} approaching the monthly quota limit. Monitor usage closely to avoid unexpected denials.`
    : 'All projects are within healthy quota limits.'

  return (
    <div>
      <BackButton onClick={() => setActivePage('overview')} />

      <motion.div layoutId="quota-card" style={{ borderRadius: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40fr 60fr',
            gap: 48,
            alignItems: 'center',
          }}>

            {/* Left — donut + summary line */}
            <div>
              <QuotaDonut
                data={safeData}
                loading={false}
                innerRadius={90}
                outerRadius={140}
                donutHeight={320}
              />
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.85rem', color: '#9B9B9B' }}>
                <span style={{ color: '#F5A623', fontWeight: 600 }}>{warningCount}</span>
                {' projects in warning · '}
                <span style={{ color: '#E84545', fontWeight: 600 }}>{criticalCount}</span>
                {' projects critical'}
              </div>
            </div>

            {/* Right — projects table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
                    <th style={TH}>Project</th>
                    <th style={TH}>Billing Month</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Tokens Used</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Token Limit</th>
                    <th style={{ ...TH, minWidth: 120 }}>Usage</th>
                    <th style={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeData.map(row => {
                    const color = row.usagePct > 100 ? '#E84545' : '#F5A623'
                    return (
                      <tr key={row.projectId} style={{ borderBottom: '1px solid #F0F0EE' }}>
                        <td style={{ ...TD, fontWeight: 500 }}>{row.projectName}</td>
                        <td style={TD}>{row.billingMonth}</td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.tokensUsed.toLocaleString()}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.tokenLimit.toLocaleString()}
                        </td>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar pct={row.usagePct} color={color} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>
                              {row.usagePct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={TD}><StatusBadge usagePct={row.usagePct} /></td>
                      </tr>
                    )
                  })}
                  {safeData.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#9B9B9B' }}>
                        No projects in alert
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Insight box */}
      <div style={{
        marginTop: 16,
        padding: '16px 20px',
        background: '#FFF8EE',
        borderLeft: '3px solid #F5A623',
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
