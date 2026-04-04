import React, { useState, useEffect, useCallback } from 'react'
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

  // Gateway form state — lifted here so it survives page switches
  const [gwApiKey, setGwApiKey]           = useState('')
  const [gwModelId, setGwModelId]         = useState(1)
  const [gwInputTokens, setGwInputTokens] = useState(300)
  const [gwPrompt, setGwPrompt]           = useState('')
  const [gwIdem, setGwIdem]               = useState('')
  const [gwLoading, setGwLoading]         = useState(false)
  const [gwResponse, setGwResponse]       = useState(null)
  const [gwError, setGwError]             = useState(null)
  const [gwHistory, setGwHistory]         = useState([])
  const [gwSubmitted, setGwSubmitted]     = useState(false)

  const refreshDashboard = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiFetch('/api/reports/models/stats').catch(() => MOCK.modelsStats),
      apiFetch('/api/audit/revoked-usage').catch(() => MOCK.revokedUsage),
      apiFetch('/api/audit/missing-responses').catch(() => MOCK.missingResponses),
      apiFetch('/api/reports/quota-alerts').catch(() => MOCK.quotaAlerts),
    ]).then(([ms, ru, mr, qa]) => {
      setModelsStats(ms)
      setRevokedUsage(ru)
      setMissingResponses(mr)
      setQuotaAlerts(qa)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refreshDashboard() }, [refreshDashboard])

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
                onRefresh={refreshDashboard}
              />
            )}
            {activePage === 'quota'  && <QuotaPage data={quotaAlerts} setActivePage={setActivePage} />}
            {activePage === 'models' && <ModelsPage data={modelsStats} setActivePage={setActivePage} />}
            {activePage === 'audit'  && <AuditPage revokedUsage={revokedUsage} missingResponses={missingResponses} setActivePage={setActivePage} />}
            {activePage === 'gateway' && (
              <GatewayPage
                setActivePage={setActivePage}
                onSubmitSuccess={refreshDashboard}
                apiKey={gwApiKey}         setApiKey={setGwApiKey}
                modelId={gwModelId}       setModelId={setGwModelId}
                inputTokens={gwInputTokens} setInputTokens={setGwInputTokens}
                prompt={gwPrompt}         setPrompt={setGwPrompt}
                idempotencyKey={gwIdem}   setIdempotencyKey={setGwIdem}
                loading={gwLoading}       setLoading={setGwLoading}
                response={gwResponse}     setResponse={setGwResponse}
                error={gwError}           setError={setGwError}
                history={gwHistory}       setHistory={setGwHistory}
                submitted={gwSubmitted}   setSubmitted={setGwSubmitted}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
