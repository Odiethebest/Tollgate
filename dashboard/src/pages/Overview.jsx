import React, { useState } from 'react'
import { motion } from 'framer-motion'
import HeroCard from '../components/HeroCard.jsx'
import QuotaDonut from '../components/QuotaDonut.jsx'
import ModelBarChart from '../components/ModelBarChart.jsx'
import RequestTable from '../components/RequestTable.jsx'
import StatPill from '../components/StatPill.jsx'
import { Shield, AlertTriangle, Activity } from 'lucide-react'

function ViewDetailsLabel({ visible }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      right: 20,
      fontSize: '0.75rem',
      color: '#9B9B9B',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 150ms',
    }}>
      ↗ View Details
    </div>
  )
}

export default function Overview({
  modelsStats, revokedUsage, missingResponses, quotaAlerts, loading, setActivePage
}) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* Left column — 55% */}
      <div style={{ width: 'calc(55% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.div layoutId="hero-card">
          <HeroCard
            modelsStats={modelsStats}
            revokedUsage={revokedUsage}
            missingResponses={missingResponses}
            loading={loading}
          />
        </motion.div>

        <motion.div
          layoutId="audit-card"
          style={{ position: 'relative', borderRadius: 20, cursor: 'pointer' }}
          onClick={() => setActivePage('audit')}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('audit')}
          onMouseLeave={() => setHovered(null)}
        >
          <RequestTable />
          <ViewDetailsLabel visible={hovered === 'audit'} />
        </motion.div>
      </div>

      {/* Right column — 45% */}
      <div style={{ width: 'calc(45% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <motion.div
          layoutId="quota-card"
          style={{ position: 'relative', borderRadius: 20, cursor: 'pointer' }}
          onClick={() => setActivePage('quota')}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('quota')}
          onMouseLeave={() => setHovered(null)}
        >
          <QuotaDonut data={quotaAlerts} loading={loading} />
          <ViewDetailsLabel visible={hovered === 'quota'} />
        </motion.div>

        <motion.div
          layoutId="models-card"
          style={{ position: 'relative', borderRadius: 20, cursor: 'pointer' }}
          onClick={() => setActivePage('models')}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setHovered('models')}
          onMouseLeave={() => setHovered(null)}
        >
          <ModelBarChart data={modelsStats} loading={loading} />
          <ViewDetailsLabel visible={hovered === 'models'} />
        </motion.div>

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
