import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Overview from './pages/Overview.jsx'
import QuotaPage from './pages/QuotaPage.jsx'
import ModelsPage from './pages/ModelsPage.jsx'
import AuditPage from './pages/AuditPage.jsx'
import GatewayPage from './pages/GatewayPage.jsx'
import { apiFetch } from './api/client.js'
import { MOCK } from './data/mock.js'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
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
      <Header activePage={activePage} setActivePage={setActivePage} />

      <main style={{
        flex: 1,
        padding: 32,
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
      }}>
        <AnimatePresence mode="wait">
          <motion.div key={activePage} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            {activePage === 'overview' && (
              <Overview
                modelsStats={modelsStats}
                revokedUsage={revokedUsage}
                missingResponses={missingResponses}
                quotaAlerts={quotaAlerts}
                loading={loading}
                setActivePage={setActivePage}
              />
            )}
            {activePage === 'quota'  && <QuotaPage data={quotaAlerts} setActivePage={setActivePage} />}
            {activePage === 'models' && <ModelsPage data={modelsStats} setActivePage={setActivePage} />}
            {activePage === 'audit'  && <AuditPage revokedUsage={revokedUsage} missingResponses={missingResponses} setActivePage={setActivePage} />}
            {activePage === 'gateway' && <GatewayPage setActivePage={setActivePage} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
