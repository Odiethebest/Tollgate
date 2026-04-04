import React from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const CustomTick = ({ x, y, payload, data }) => {
  const model = data.find(d => d.label === payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#9B9B9B">
        {payload.value}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#9B9B9B">
        {model?.avgLatencyMs}ms
      </text>
    </g>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'white',
      border: '1px solid #F0F0EE',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{d?.label}</div>
      <div>Success Rate: <b>{d?.successRate}%</b></div>
      <div>Total Requests: <b>{d?.totalRequests}</b></div>
      <div>Avg Latency: <b>{d?.avgLatencyMs}ms</b></div>
    </div>
  )
}

export default function ModelBarChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
          MODEL PERFORMANCE
        </div>
        <div style={{ height: 220 }} className="skeleton" />
      </div>
    )
  }

  const chartData = (data || []).map(m => ({
    label: `${m.provider}/${m.modelName}`,
    successRate: m.successRate,
    totalRequests: m.totalRequests,
    avgLatencyMs: m.avgLatencyMs,
  }))

  return (
    <div id="reports" style={{ background: 'white', borderRadius: 20, padding: 24 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', marginBottom: 16 }}>
        MODEL PERFORMANCE
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 30 }}>
          <CartesianGrid stroke="#F0F0EE" vertical={false} />
          <XAxis
            dataKey="label"
            tick={<CustomTick data={chartData} />}
            height={50}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            yAxisId="left"
            dataKey="successRate"
            name="Success Rate"
            fill="#4CAF82"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            yAxisId="right"
            dataKey="totalRequests"
            name="Total Requests"
            fill="#FF6B6B"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
