import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts'

const WARNING_COLOR = '#F5A623'
const CRITICAL_COLOR = '#E84545'
const OK_COLOR = '#4CAF82'

function CustomTooltip({ active, payload, allData }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const projects = allData.filter(d => {
    if (entry.name === 'Warning') return d.usagePct >= 80 && d.usagePct <= 100
    if (entry.name === 'Critical') return d.usagePct > 100
    return false
  })
  return (
    <div style={{
      background: 'white',
      border: '1px solid #F0F0EE',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{entry.name}: {entry.value}</div>
      {projects.map(p => (
        <div key={p.projectId} style={{ color: '#9B9B9B' }}>{p.projectName} ({p.usagePct.toFixed(1)}%)</div>
      ))}
    </div>
  )
}

export default function QuotaDonut({ data, loading }) {
  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
          QUOTA HEALTH
        </div>
        <div style={{ height: 200 }} className="skeleton" />
      </div>
    )
  }

  const isAllClear = !data || data.length === 0

  if (isAllClear) {
    return (
      <div id="quota" style={{ background: 'white', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
          QUOTA HEALTH
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[{ name: 'All Clear', value: 1 }]}
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={OK_COLOR} />
              <Label
                value="All Clear"
                position="center"
                style={{ fontSize: '1.1rem', fontWeight: 500, fill: OK_COLOR }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const warningItems = data.filter(d => d.usagePct >= 80 && d.usagePct <= 100)
  const criticalItems = data.filter(d => d.usagePct > 100)

  const chartData = []
  if (warningItems.length > 0) chartData.push({ name: 'Warning', value: warningItems.length, color: WARNING_COLOR })
  if (criticalItems.length > 0) chartData.push({ name: 'Critical', value: criticalItems.length, color: CRITICAL_COLOR })

  const totalAlerts = data.length

  return (
    <div id="quota" style={{ background: 'white', borderRadius: 20, padding: 24 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 8 }}>
        QUOTA HEALTH
      </div>

      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip allData={data} />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — absolutely positioned */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#1A1A2E', lineHeight: 1 }}>{totalAlerts}</div>
          <div style={{ fontSize: '0.72rem', color: '#9B9B9B', marginTop: 2 }}>projects in alert</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        {chartData.map(entry => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
            <span>{entry.name}</span>
            <span style={{ color: '#9B9B9B' }}>({entry.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
