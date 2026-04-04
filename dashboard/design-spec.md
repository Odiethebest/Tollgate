# Tollgate Audit Dashboard — Design Specification

## Visual Language

The aesthetic is light, data-forward, and minimal: an off-white canvas, white cards with soft shadows, one bold hero gradient, and color used only for status signals.

### Color Palette

| Role | Value | Usage |
|---|---|---|
| Background | `#F4F4F0` | Page canvas |
| Card | `#FFFFFF` | All content cards |
| Hero gradient | `#FF6B6B → #FF8E53` | Primary stat card |
| Sidebar | `#1A1A2E` | Left navigation |
| Text primary | `#1A1A2E` | Headings, key numbers |
| Text secondary | `#9B9B9B` | Labels, subtitles |
| Success | `#4CAF82` | Success rate, zero-alert state |
| Warning | `#F5A623` | Quota above 80% |
| Danger | `#E84545` | Quota exceeded, compliance violations |
| Border | `#F0F0EE` | Card dividers, table rows |

### Typography

- **Hero numbers**: 600 weight, 2.5–3.5rem, white on gradient or `#1A1A2E` on white
- **Card titles**: 500 weight, 0.8rem, `#9B9B9B`, uppercase with letter-spacing
- **Body and tables**: 400 weight, 0.875rem, `#1A1A2E`
- **Badges and labels**: 500 weight, 0.75rem

### Elevation and Shape

- Cards: `border-radius: 20px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.06)`
- Sidebar: full-height, `width: 72px`, icon-only, active state with teal dot indicator
- Stat pills: `border-radius: 16px`, icon on colored square background

---

## Layout

Three-column grid:

```
┌──────┬──────────────────────────────┬────────────────┐
│      │  Hero Card (gradient)        │  Donut Card    │  Pill  │
│ Side │──────────────────────────────│────────────────│
│ bar  │  Tab Table                   │  Bar Chart     │
│      │                              │                │
│      │                              │  Pill          │
│      │                              │  Pill          │
└──────┴──────────────────────────────┴────────────────┘
```

- Sidebar: `72px` fixed
- Left column: ~55% of remaining width
- Right column: ~40% of remaining width
- Column gap: `24px`
- Card padding: `24px`

---

## Components

### 1. Sidebar

Dark navy, icon-only navigation with five sections:

| Icon | Section | Content |
|---|---|---|
| Overview | Hero card and stat pills | |
| Reports | Model Performance bar chart | |
| Quota | Quota Health donut | |
| Audit | Audit Flags table | |
| Gateway | Gateway Tester drawer | |

Active icon is white with a small teal dot indicator to the right. User avatar placeholder at the bottom.

Note: Tenants, Keys, and Models are not represented because the backend Admin API exposes only write operations. There are no GET list endpoints for those resources.

---

### 2. Hero Card

Full coral-to-orange gradient. Displays the total request count derived by summing `totalRequests` across all models from `GET /api/reports/models/stats`.

A sparkline sits below the number. Because the backend has no time-series endpoint, the sparkline uses static mock data to suggest trend shape.

Three sub-stats appear at the bottom, matching the three-column layout of the reference design:

**Success Rate** — weighted average of each model's `successRate` field, weighted by `totalRequests`.

**Non-success Rate** — `1 - weightedSuccessRate`, derived from the same model stats response. This covers all failed and denied requests as a single figure. Labeling it "Non-success" is intentional: the backend does not break the remainder into failed versus denied individually, so a more specific label would misrepresent the data.

**Audit Flags** — sum of the response list lengths from `GET /api/audit/revoked-usage` and `GET /api/audit/missing-responses`.

---

### 3. Quota Health Donut

White card titled "Quota Health". Data comes from `GET /api/reports/quota-alerts`, which returns only projects whose `usagePct` exceeds 80%.

The donut has two segments:

- **Warning** — projects where `usagePct` is between 80 and 100, shown in amber
- **Critical** — projects where `usagePct` exceeds 100, shown in red

An "Under quota" segment is not shown. The endpoint filters at the SQL level to rows above the threshold, so healthy projects are not included in the response.

**Empty state:** when the API returns an empty array, the component renders a single full-circle in Success green with the label "All Clear" at the center. This prevents a blank chart when all projects are healthy, which is the normal operating state.

The center of the donut displays the total number of projects in alert state. The legend shows each segment's project count and average `usagePct`. Hovering a segment shows a tooltip with the project name and exact percentage.

---

### 4. Model Performance Bar Chart

White card titled "Model Performance". Data comes from `GET /api/reports/models/stats`, which returns one row per model with all-time aggregate figures.

The X axis has one group per model, labeled as `provider/modelName` from the response fields. A time-based axis is not available because this endpoint returns global aggregates with no time dimension.

Each group contains two bars sharing a single left axis:

- **Success Rate** — `successRate` as a percentage, 0–100%
- **Total Requests** — `totalRequests` as a count, scaled independently on the right axis

Latency is not plotted as a third axis. Three simultaneous axes on a narrow card produce an unreadable chart. Instead, each model group has a small latency annotation below its bars — a muted text label showing `avgLatencyMs` in milliseconds. This keeps the metric visible without adding axis complexity.

Hovering a bar shows a tooltip with the exact value.

---

### 5. Request Feed

Two-tab table.

#### Key Requests Tab

Fetches `GET /api/audit/keys/{keyId}/requests` with optional `from` and `to` query parameters in ISO 8601 format.

The endpoint requires a `keyId` path parameter. There is no backend endpoint that returns requests across all keys. The tab therefore shows a Key ID input and an optional date range picker above the table.

The Key ID input defaults to `1`, which corresponds to a key with request history in the seed dataset. This ensures the table has visible data on first load rather than showing an empty state that could be mistaken for an error. The user can clear or change the value at any time.

Columns map directly to the `KeyRequestProjection` fields returned by the endpoint:

| Column | Field |
|---|---|
| Request ID | `requestId` |
| Requested At | `requestedAt` |
| Status | `status` |
| Model ID | `modelId` |
| Project ID | `projectId` |
| Input Tokens | `inputTokens` |
| Cost | `computedCost` |

Model and project names are not shown. The projection returns only numeric IDs, and resolving names would require additional requests. Output tokens are also not included; the projection does not contain that field.

Status badges: green for `success`, amber for `failed`, red for `denied`.

#### Audit Flags Tab

Combines results from two endpoints into a single table with a Type column to distinguish them.

`GET /api/audit/revoked-usage` rows are labeled **Revoked Key** and show: Request ID, Key ID, Requested At, Revoked At, Project ID.

`GET /api/audit/missing-responses` rows are labeled **Missing Response** and show: Request ID, Key ID, Model ID, Project ID, Requested At, Status.

---

### 6. Stat Pills

Three cards stacked in the right column.

**Compliance Issues**
Count of items returned by `GET /api/audit/revoked-usage`. Represents requests submitted using a key after that key was revoked. Shown in Danger red when above zero, Success green when zero.

**Missing Responses**
Count of items returned by `GET /api/audit/missing-responses`. Represents requests that completed without a corresponding response record. Shown in Warning amber when above zero.

**Quota Alerts**
Count of items returned by `GET /api/reports/quota-alerts`. Represents projects whose current-month token usage exceeds 80% of their limit. Shown in Warning amber when above zero.

Note: "Invoices Generated" and "Active API Keys" were removed from the original concept. The backend has no GET endpoint for invoices and no GET endpoint that lists or counts API keys.

Each pill: icon on a colored square with 16px border-radius, large number, label below, and a progress bar or trend indicator.

---

## Data Sources

| Component | Endpoint | Notes |
|---|---|---|
| Hero total requests | `GET /api/reports/models/stats` | Sum of `totalRequests` across all models |
| Hero success rate | `GET /api/reports/models/stats` | Weighted average of `successRate` by `totalRequests` |
| Hero audit flags | `GET /api/audit/revoked-usage` + `GET /api/audit/missing-responses` | Sum of both list lengths |
| Quota donut | `GET /api/reports/quota-alerts` | Only projects above 80%; split into Warning and Critical by `usagePct` |
| Model bar chart | `GET /api/reports/models/stats` | All-time aggregate per model; latency shown as inline annotation, not a third axis |
| Key Requests tab | `GET /api/audit/keys/{keyId}/requests?from=&to=` | Requires user-supplied Key ID |
| Audit Flags tab | `GET /api/audit/revoked-usage` + `GET /api/audit/missing-responses` | Merged with a Type column |
| Compliance Issues pill | `GET /api/audit/revoked-usage` | List length |
| Missing Responses pill | `GET /api/audit/missing-responses` | List length |
| Quota Alerts pill | `GET /api/reports/quota-alerts` | List length |

When the backend is unreachable, all components fall back to static mock data so the dashboard renders correctly as a portfolio demo.

---

## Interactions

- **Sidebar**: clicking an icon scrolls to or highlights the corresponding section; active state updates immediately
- **Hero card**: auto-refreshes every 30 seconds with a fade transition on the number
- **Tab table**: tab switch uses a 200ms slide animation
- **Quota donut**: hover shows a tooltip with the project name and exact usage percentage
- **Model bar chart**: hover highlights the bar and shows the exact value in a tooltip

**Gateway Tester** is an optional feature: a drawer triggered by a "Try It" button that sends a live `POST /api/gateway/submit` and appends the result to the Key Requests table.

The drawer contains the following fields:

| Field | Type | Required |
|---|---|---|
| X-API-Key | text | Yes — sent as a request header; the backend returns 401 without it |
| Model ID | number | Yes |
| Input Tokens | number | Yes |
| Prompt | text | Yes |
| Idempotency Key | text | No |

---

## File Structure

```
dashboard/
  index.html
  src/
    main.jsx
    App.jsx
    components/
      Sidebar.jsx
      HeroCard.jsx
      QuotaDonut.jsx
      ModelBarChart.jsx
      RequestTable.jsx
      StatPill.jsx
      GatewayTester.jsx
    api/
      client.js
    styles/
      globals.css
    data/
      mock.js
```

Built with Vite and React. Can be deployed to Cloudflare Pages from the `dashboard/` subdirectory or served as static files from Spring Boot's `resources/static/`.
