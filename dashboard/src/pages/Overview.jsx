import React, { useState } from 'react'
import { motion } from 'framer-motion'
import HeroCard from '../components/HeroCard.jsx'
import QuotaDonut from '../components/QuotaDonut.jsx'
import ModelBarChart from '../components/ModelBarChart.jsx'
import RequestTable from '../components/RequestTable.jsx'
import StatPill from '../components/StatPill.jsx'
import { Shield, AlertTriangle, Activity } from 'lucide-react'

function ViewDetailsButton({ onClick, visible }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        fontSize: '0.75rem',
        color: hovered ? '#1A1A2E' : '#9B9B9B',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'color 0.15s, opacity 0.15s',
        zIndex: 10,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      View Details →
    </div>
  )
}

export default function Overview({
  modelsStats, revokedUsage, missingResponses, quotaAlerts, loading, setActivePage
}) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '55fr 45fr',
      gridTemplateAreas: `
        "hero  quota"
        "table models"
        "pills pills"
      `,
      gap: 24,
      alignItems: 'start',
    }}>

      <div style={{ gridArea: 'hero' }}>
        <motion.div layoutId="hero-card">
          <HeroCard
            modelsStats={modelsStats}
            revokedUsage={revokedUsage}
            missingResponses={missingResponses}
            loading={loading}
          />
        </motion.div>
      </div>

      <div style={{ gridArea: 'quota' }}>
        <motion.div
          layoutId="quota-card"
          style={{ position: 'relative' }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('quota')}
          onMouseLeave={() => setHovered(null)}
        >
          <QuotaDonut data={quotaAlerts} loading={loading} />
          <ViewDetailsButton onClick={() => setActivePage('quota')} visible={hovered === 'quota'} />
        </motion.div>
      </div>

      <div style={{ gridArea: 'table' }}>
        <motion.div
          layoutId="audit-card"
          style={{ position: 'relative' }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('audit')}
          onMouseLeave={() => setHovered(null)}
        >
          <RequestTable />
          <ViewDetailsButton onClick={() => setActivePage('audit')} visible={hovered === 'audit'} />
        </motion.div>
      </div>

      <div style={{ gridArea: 'models' }}>
        <motion.div
          layoutId="models-card"
          style={{ position: 'relative' }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('models')}
          onMouseLeave={() => setHovered(null)}
        >
          <ModelBarChart data={modelsStats} loading={loading} chartHeight={200} />
          <ViewDetailsButton onClick={() => setActivePage('models')} visible={hovered === 'models'} />
        </motion.div>
      </div>

      {/* Pills — full-width row, 3 equal columns */}
      <div style={{
        gridArea: 'pills',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 24,
      }}>
        <StatPill
          icon={Shield}
          iconBg="rgba(232,69,69,0.1)"
          iconColor="#E84545"
          value={loading ? '—' : revokedUsage.length}
          label="Compliance Issues"
          alertColor={revokedUsage.length > 0 ? '#E84545' : '#4CAF82'}
        />
        <StatPill
          icon={AlertTriangle}
          iconBg="rgba(245,166,35,0.1)"
          iconColor="#F5A623"
          value={loading ? '—' : missingResponses.length}
          label="Missing Responses"
          alertColor={missingResponses.length > 0 ? '#F5A623' : '#4CAF82'}
        />
        <StatPill
          icon={Activity}
          iconBg="rgba(76,175,130,0.1)"
          iconColor="#4CAF82"
          value={loading ? '—' : quotaAlerts.length}
          label="Quota Alerts"
          alertColor={quotaAlerts.length > 0 ? '#F5A623' : '#4CAF82'}
        />
      </div>
    </div>
  )
}
