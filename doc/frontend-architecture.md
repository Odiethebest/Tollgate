# Frontend Architecture & API Integration

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 | Concurrent mode, fine-grained rendering control |
| Build tool | Vite 5 | Sub-second HMR, ESM-native dev server |
| Animation | Framer Motion 12 | `layoutId`-based shared-element transitions; `AnimatePresence` for mount/unmount |
| Charts | Recharts 2 | Composable, React-native; exposes custom tick and tooltip renderers |
| Icons | Lucide React | Consistent 24px SVG set, tree-shakeable |
| Styling | Inline styles | Zero specificity conflicts; styles co-located with the component they affect |

---

## Application Architecture

### State Ownership

All shared state lives in `App.jsx`. Every page is a pure consumer that receives data via props and never fetches independently.

```
App.jsx
├── activePage          — which view is rendered
├── modelsStats         — GET /api/reports/models/stats
├── revokedUsage        — GET /api/audit/revoked-usage
├── missingResponses    — GET /api/audit/missing-responses
├── quotaAlerts         — GET /api/reports/quota-alerts
└── gwApiKey, gwModelId, gwInputTokens, gwPrompt, ...
    GatewayPage form state, lifted to survive page switches
```

The four read endpoints are fetched once in a single `Promise.all` inside a `useCallback`-wrapped `refreshDashboard`. The same function is passed to `GatewayPage` as `onSubmitSuccess`, so a successful gateway submit triggers a background re-fetch of the dashboard data.

```js
const refreshDashboard = useCallback(() => {
  setLoading(true)
  Promise.all([
    apiFetch('/api/reports/models/stats').catch(() => MOCK.modelsStats),
    apiFetch('/api/audit/revoked-usage').catch(() => MOCK.revokedUsage),
    apiFetch('/api/audit/missing-responses').catch(() => MOCK.missingResponses),
    apiFetch('/api/reports/quota-alerts').catch(() => MOCK.quotaAlerts),
  ]).then(([ms, ru, mr, qa]) => { … })
    .finally(() => setLoading(false))
}, [])
```

Each `apiFetch` call catches individually and falls back to the corresponding mock array. If one endpoint is down, the other three still render live data.

### Page Routing

Navigation is state-driven, not URL-driven. `activePage` is a string: `'overview' | 'quota' | 'models' | 'audit' | 'gateway'`. The `AnimatePresence` wrapper on `main` handles mount/unmount transitions between views:

```jsx
<AnimatePresence mode="wait">
  <motion.div key={activePage} variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {activePage === 'overview' && <Overview … />}
    {activePage === 'quota'    && <QuotaPage … />}
    …
  </motion.div>
</AnimatePresence>
```

`mode="wait"` ensures the exiting page fully unmounts before the entering page animates in, preventing layout collision. Using React state instead of React Router removes the dependency on a `_redirects` rule for static deployments and keeps navigation entirely self-contained.

---

## Component Tree

```
App.jsx
├── Header.jsx              sticky top nav; active tab underline; "Try It" CTA
├── Overview.jsx            2-column CSS Grid (55fr / 45fr), 3 rows
│   ├── HeroCard.jsx        gradient card; stats computed from props
│   ├── QuotaDonut.jsx      Recharts PieChart; all-clear empty state
│   ├── RequestTable.jsx    audit trail table; self-contained data fetch
│   ├── ModelBarChart.jsx   Recharts ComposedChart; dual Y-axis
│   └── StatPill.jsx x3    icon + value + label; color reacts to alert state
├── QuotaPage.jsx           expanded quota view; inline progress bars
├── ModelsPage.jsx          per-model detail cards; generated insight text
├── AuditPage.jsx           dark banner + two-column timelines; insight box
├── GatewayPage.jsx         form + live response panel + session history table
└── Footer.jsx
```

### `layoutId` and Shared-Element Transitions

Overview cards wrap their content in `<motion.div layoutId="...">`. The corresponding sub-pages use the same `layoutId` on their root element. Framer Motion interpolates position and size between the two DOM states when the page switches, producing a perceived expand-from-card effect without manual coordinate tracking.

| `layoutId` | Overview element | Sub-page |
|---|---|---|
| `"hero-card"` | HeroCard | none |
| `"quota-card"` | QuotaDonut | QuotaPage |
| `"audit-card"` | RequestTable | AuditPage |
| `"models-card"` | ModelBarChart | ModelsPage |

---

## API Contract

### Base URL

```js
// api/client.js
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
```

`VITE_API_BASE` is the only environment variable the frontend needs. Local dev defaults to `localhost:8080`; production points to the App Engine URL.

### Read Endpoints

All four are called at mount and on every `refreshDashboard` invocation.

| Endpoint | Response shape | Consumers |
|---|---|---|
| `GET /api/reports/models/stats` | `[{ provider, modelName, totalRequests, successRate, avgLatencyMs }]` | HeroCard, ModelBarChart, ModelsPage |
| `GET /api/audit/revoked-usage` | `[{ requestId, keyId, projectId, requestedAt, revokedAt }]` | HeroCard, StatPill, AuditPage |
| `GET /api/audit/missing-responses` | `[{ requestId, keyId, modelId, projectId, requestedAt, status }]` | HeroCard, StatPill, AuditPage |
| `GET /api/reports/quota-alerts` | `[{ projectId, projectName, tokenLimit, tokensUsed, usagePct }]` | QuotaDonut, StatPill, QuotaPage |

### Write Endpoint

`POST /api/gateway/submit` is called directly from `GatewayPage.handleSubmit`, bypassing the shared `apiFetch` wrapper. Two reasons: it requires a custom `X-API-Key` header, and non-2xx responses still return a JSON body that must be parsed.

```js
const res = await fetch(`${BASE}/api/gateway/submit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  },
  body: JSON.stringify({ modelId, inputTokens, prompt, idempotencyKey }),
})
const data = await res.json()
if (res.ok) { … } else { setError(data) }
```

| Status | Frontend behavior |
|---|---|
| `200` | Render stat chips; append to session history; call `onSubmitSuccess()` |
| `401` | Display error panel with the response message |
| `403` | Display error panel; key has been revoked |
| `429` | Display error panel; monthly quota exceeded |
| Network failure | Display `'Network error — is the backend running?'` |

### Derived Metrics

The backend exposes only what it stores. Several dashboard figures are computed on the frontend from data already in-flight, which avoids adding endpoints for values that are trivially derivable.

| Metric | Computation |
|---|---|
| Total Requests | `modelsStats.reduce((sum, m) => sum + m.totalRequests, 0)` |
| Weighted Success Rate | `Σ(successRate × totalRequests) / totalRequests` across all models |
| Non-Success Rate | `100 - weightedSuccessRate` |
| Audit Flags | `revokedUsage.length + missingResponses.length` |
| Quota segment split | `usagePct` in 80–100 maps to Warning; above 100 maps to Critical |

---

## Loading and Error States

Components accept a `loading` boolean. While true, they render `<div className="skeleton" />` placeholders at the expected size of the real content. The skeleton animation is defined once in `globals.css`, keeping component code free of animation logic.

`data/mock.js` exports static arrays that mirror the shape of each API response. Every `apiFetch` call in `refreshDashboard` falls back to the corresponding mock on failure. The dashboard renders a fully populated state even when the backend is unreachable, which matters in portfolio demo contexts where the viewer may not have the backend running.

---

## GatewayPage Form State

All nine form state values (`gwApiKey`, `gwModelId`, `gwInputTokens`, `gwPrompt`, `gwIdem`, `gwLoading`, `gwResponse`, `gwError`, `gwHistory`, `gwSubmitted`) are owned by `App.jsx` and passed to `GatewayPage` as value/setter prop pairs.

The reason is persistence across navigation. If the user fills the form, switches to Overview, then returns, the form is exactly as they left it. The `submitted` flag gates inline validation so that error messages on empty fields appear only after the first submit attempt, not while the user is still filling in the form.

---

## Build and Deployment

```bash
cd dashboard
npm install
npm run dev      # dev server on :5173; VITE_API_BASE controls the backend target
npm run build    # output to dist/
```

The production build is a static site deployable to any CDN. CORS is enabled on all `/api/*` routes in `CorsConfig.java`, so the frontend can be hosted independently of the backend with no additional server configuration.
