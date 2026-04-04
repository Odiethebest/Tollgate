import React, { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HeroCard from './components/HeroCard.jsx'
import QuotaDonut from './components/QuotaDonut.jsx'
import ModelBarChart from './components/ModelBarChart.jsx'
import RequestTable from './components/RequestTable.jsx'
import StatPill from './components/StatPill.jsx'
import GatewayTester from './components/GatewayTester.jsx'
import { apiFetch } from './api/client.js'
import { MOCK } from './data/mock.js'
import { Shield, AlertTriangle, Activity } from 'lucide-react'

const SECTION_STYLE = { scrollMarginTop: 80 }

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F0', display: 'flex', flexDirection: 'column' }}>
      <Header onTryIt={() => setDrawerOpen(true)} />

      <main style={{
        flex: 1,
        padding: 32,
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* Left column — 55% */}
          <div style={{ width: 'calc(55% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section id="overview" style={SECTION_STYLE}>
              <HeroCard
                modelsStats={modelsStats}
                revokedUsage={revokedUsage}
                missingResponses={missingResponses}
                loading={loading}
              />
            </section>
            <section id="audit" style={SECTION_STYLE}>
              <RequestTable />
            </section>
          </div>

          {/* Right column — 45% */}
          <div style={{ width: 'calc(45% - 12px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section id="quota" style={SECTION_STYLE}>
              <QuotaDonut data={quotaAlerts} loading={loading} />
            </section>
            <section id="models" style={SECTION_STYLE}>
              <ModelBarChart data={modelsStats} loading={loading} />
            </section>
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

        <section id="gateway" style={SECTION_STYLE} />
      </main>

      <Footer />

      <GatewayTester open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
