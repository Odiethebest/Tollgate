# Frontend Architecture & API Integration

This document covers the engineering decisions behind the Tollgate dashboard: component structure, state management, data flow, and the contract between the frontend and the Spring Boot backend.

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 | Concurrent mode, fine-grained rendering control |
| Build tool | Vite 5 | Sub-second HMR, ESM-native dev server |
| Animation | Framer Motion 12 | `layoutId`-based shared-element transitions; `AnimatePresence` for mount/unmount |
| Charts | Recharts 2 | Composable, React-native; exposes custom tick and tooltip renderers |
| Icons | Lucide React | Consistent 24px SVG set, tree-shakeable |
| Styling | Inline styles (no CSS framework) | Zero specificity conflicts; styles co-located with the component they affect |

---

## Application Architecture

### State Ownership

All shared state lives in `App.jsx`. The pattern is deliberate: every page is a pure consumer that receives data via props, never fetches independently.

```
App.jsx  (single source of truth)
├── activePage          — which view is rendered
├── modelsStats         — GET /api/reports/models/stats
├── revokedUsage        — GET /api/audit/revoked-usage
├── missingResponses    — GET /api/audit/missing-responses
├── quotaAlerts         — GET /api/reports/quota-alerts
└── gwApiKey, gwModelId, gwInputTokens, gwPrompt, …
    (GatewayPage form state — lifted to survive page switches)
```

The four read endpoints are fetched once in a single `Promise.all` inside a `useCallback`-wrapped `refreshDashboard`. The function is also passed down to `GatewayPage` as `onSubmitSuccess`, so a successful gateway submit triggers a background re-fetch of dashboard data without a full page reload.

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

Each `apiFetch` call catches individually, falling back to the corresponding mock array. This means partial backend availability degrades gracefully: if one endpoint is down, the other three still render live data.

### Page Routing

Navigation is state-driven, not URL-driven. `activePage` is a string enum: `'overview' | 'quota' | 'models' | 'audit' | 'gateway'`. The `AnimatePresence` + `motion.div` wrapper on `main` handles mount/unmount transitions between views:

```jsx
<AnimatePresence mode="wait">
  <motion.div key={activePage} variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {activePage === 'overview' && <Overview … />}
    {activePage === 'quota'    && <QuotaPage … />}
    …
  </motion.div>
</AnimatePresence>
```

`mode="wait"` ensures the exiting page fully unmounts before the entering page begins its animation, preventing layout collision.

The choice of state over React Router removes the dependency on a `_redirects` file for SPA deployments (Cloudflare Pages, Netlify) and keeps navigation entirely self-contained.

---

## Component Tree

```
App.jsx
├── Header.jsx              — sticky top nav, active tab underline, "Try It →" CTA
├── Overview.jsx            — 2-column CSS Grid (55fr / 45fr), 3 rows
│   ├── HeroCard.jsx        — gradient card; computed stats from props
│   ├── QuotaDonut.jsx      — Recharts PieChart; all-clear empty state
│   ├── RequestTable.jsx    — audit trail table; self-contained data fetch
│   ├── ModelBarChart.jsx   — Recharts ComposedChart; dual Y-axis
│   └── StatPill.jsx ×3    — icon + value + label; color-reactive to alert state
├── QuotaPage.jsx           — expanded quota view; inline progress bars
├── ModelsPage.jsx          — per-model detail cards; generated insight text
├── AuditPage.jsx           — dark banner + two-column timelines; insight box
├── GatewayPage.jsx         — form + live response panel + session history table
└── Footer.jsx
```

### `layoutId` and Shared-Element Transitions

Overview cards wrap their children in `<motion.div layoutId="…">`. The corresponding sub-pages use the same `layoutId` on their root element. Framer Motion interpolates position and size between the two DOM states when the page switches, producing a perceived "expand from card" effect without manual coordinate calculation.

| `layoutId` | Overview element | Sub-page |
|---|---|---|
| `"hero-card"` | HeroCard | — (no sub-page) |
| `"quota-card"` | QuotaDonut | QuotaPage root |
| `"audit-card"` | RequestTable | AuditPage root |
| `"models-card"` | ModelBarChart | ModelsPage root |

---

## API Contract

### Base URL

```js
// api/client.js
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
```

`VITE_API_BASE` is the only environment variable the frontend needs. Local dev defaults to `localhost:8080`; production sets it to the App Engine URL.

### Read Endpoints (called at mount and on `refreshDashboard`)

| Endpoint | Response shape | Consumer |
|---|---|---|
| `GET /api/reports/models/stats` | `[{ provider, modelName, totalRequests, successRate, avgLatencyMs }]` | HeroCard, ModelBarChart, ModelsPage |
| `GET /api/audit/revoked-usage` | `[{ requestId, keyId, projectId, requestedAt, revokedAt }]` | HeroCard (count), StatPill, AuditPage |
| `GET /api/audit/missing-responses` | `[{ requestId, keyId, modelId, projectId, requestedAt, status }]` | HeroCard (count), StatPill, AuditPage |
| `GET /api/reports/quota-alerts` | `[{ projectId, projectName, tokenLimit, tokensUsed, usagePct }]` | QuotaDonut, StatPill, QuotaPage |

### Write Endpoint (GatewayPage only)

`POST /api/gateway/submit` is called directly from `GatewayPage.handleSubmit`, not through the shared `apiFetch` wrapper, because it requires a custom `X-API-Key` header and non-2xx responses still return a JSON body that must be parsed:

```js
const res = await fetch(`${BASE}/api/gateway/submit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,           // raw key, sent as header per backend contract
  },
  body: JSON.stringify({ modelId, inputTokens, prompt, idempotencyKey? }),
})
const data = await res.json()      // parse regardless of status code
if (res.ok) { … } else { setError(data) }
```

**Response handling by HTTP status:**

| Status | Frontend behavior |
|---|---|
| `200 OK` | Render stat chips (cost, output tokens, latency, idempotent flag); append to session history; call `onSubmitSuccess()` |
| `401` | Set error state; display error panel with raw message |
| `403` | Same as 401 — key revoked |
| `429` | Same — quota exceeded |
| Network failure | Set `{ message: 'Network error — is the backend running?', status: 0 }` |

### Derived Metrics (frontend-computed, no backend endpoint)

The backend exposes only what it stores. Several dashboard figures are computed on the frontend from existing API responses:

| Metric | Computation |
|---|---|
| Total Requests (HeroCard) | `modelsStats.reduce((sum, m) => sum + m.totalRequests, 0)` |
| Weighted Success Rate | `Σ(successRate × totalRequests) / totalRequests` across all models |
| Non-Success Rate | `100 - weightedSuccessRate` |
| Audit Flags count | `revokedUsage.length + missingResponses.length` |
| Quota segment split | `usagePct` in `[80,100]` → Warning; `usagePct > 100` → Critical |

This avoids adding analytics endpoints to the backend for figures that are trivially derivable from data already in-flight.

---

## Loading and Error States

### Skeleton Loading

Components accept a `loading` boolean. While `true`, they render placeholder `<div className="skeleton" />` elements at the expected size of the real content. The skeleton style is defined in `globals.css` as a CSS animation, keeping component code free of animation logic.

### Mock Fallback

`data/mock.js` exports static arrays that mirror the shape of each API response. Every `apiFetch` call in `refreshDashboard` has a `.catch(() => MOCK.<key>)` fallback. The dashboard therefore renders a fully populated, visually complete state even when the backend is unreachable — important for portfolio demo contexts where the viewer may not have the backend running.

---

## GatewayPage: Form State Design

All nine pieces of Gateway form state (`gwApiKey`, `gwModelId`, `gwInputTokens`, `gwPrompt`, `gwIdem`, `gwLoading`, `gwResponse`, `gwError`, `gwHistory`, `gwSubmitted`) are owned by `App.jsx` and passed as prop pairs (`value` + `setter`) to `GatewayPage`.

This is intentional: if the user fills the form, navigates away to check the Overview, then returns to Gateway, the form is exactly as they left it. Client-side routing with a URL would accomplish the same, but state lifting is the simpler mechanism given the single-page architecture.

The `submitted` flag gates inline validation: error messages on empty required fields appear only after the first submit attempt, not while the user is still filling in the form.

---

## Build and Deployment

The dashboard is a Vite project inside the `dashboard/` subdirectory. It builds to `dashboard/dist/`.

```bash
cd dashboard
npm install
npm run dev      # dev server on :5173, proxies nothing — VITE_API_BASE handles routing
npm run build    # output to dist/
```

The production build is a static site deployable to any CDN. CORS is enabled on all `/api/*` routes in the Spring Boot backend (`CorsConfig.java`), so the frontend can be hosted independently from the backend with no additional configuration.
