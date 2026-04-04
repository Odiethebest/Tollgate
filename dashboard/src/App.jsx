import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import HeroCard from './components/HeroCard.jsx'
import QuotaDonut from './components/QuotaDonut.jsx'
import ModelBarChart from './components/ModelBarChart.jsx'
import RequestTable from './components/RequestTable.jsx'
import StatPill from './components/StatPill.jsx'
import GatewayTester from './components/GatewayTester.jsx'
import { apiFetch } from './api/client.js'
import { MOCK } from './data/mock.js'
import { Shield, AlertTriangle, Activity } from 'lucide-react'

export default function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [modelsStats, setModelsStats] = useState([])
  const [revokedUsage, setRevokedUsage] = useState([])
  const [missingResponses, setMissingResponses] = useState([])
  const [quotaAlerts, setQuotaAlerts] = useState([])

  useEffect(() => {
    Promise.all([
      apiFetch('/api/reports/models/stats').catch(e => { console.warn('models/stats failed:', e); return MOCK.modelsStats }),
      apiFetch('/api/audit/revoked-usage').catch(e => { console.warn('revoked-usage failed:', e); return MOCK.revokedUsage }),
      apiFetch('/api/audit/missing-responses').catch(e => { console.warn('missing-responses failed:', e); return MOCK.missingResponses }),
      apiFetch('/api/reports/quota-alerts').catch(e => { console.warn('quota-alerts failed:', e); return MOCK.quotaAlerts }),
    ]).then(([ms, ru, mr, qa]) => {
      setModelsStats(ms)
      setRevokedUsage(ru)
      setMissingResponses(mr)
      setQuotaAlerts(qa)
    }).finally(() => setLoading(false))
  }, [])

  const handleNav = (id) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F4F0' }}>
      <Sidebar active={activeSection} onNav={handleNav} />

      {/* Main content — offset for fixed sidebar */}
      <main style={{
        flex: 1,
        marginLeft: 72,
        padding: 32,
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {/* Top row: left col + right col */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'flex-start' }}>
          {/* Left column — 55% */}
          <div style={{ width: 'calc(55% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <HeroCard
              modelsStats={modelsStats}
              revokedUsage={revokedUsage}
              missingResponses={missingResponses}
              loading={loading}
            />
            <RequestTable />
          </div>

          {/* Right column — 45% */}
          <div style={{ width: 'calc(45% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <QuotaDonut data={quotaAlerts} loading={loading} />
            <ModelBarChart data={modelsStats} loading={loading} />

            {/* Three stat pills */}
            <StatPill
              icon={Shield}
              iconBg="rgba(232,69,69,0.1)"
              iconColor="#E84545"
              value={loading ? '—' : revokedUsage.length}
              label="Revoked Key Requests"
              alertColor={revokedUsage.length > 0 ? '#E84545' : '#1A1A2E'}
            />
            <StatPill
              icon={AlertTriangle}
              iconBg="rgba(245,166,35,0.1)"
              iconColor="#F5A623"
              value={loading ? '—' : missingResponses.length}
              label="Missing Responses"
              alertColor={missingResponses.length > 0 ? '#F5A623' : '#1A1A2E'}
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
      </main>

      {/* Gateway Tester — always mounted */}
      <GatewayTester />
    </div>
  )
}
