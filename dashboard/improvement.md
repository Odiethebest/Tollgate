# Tollgate Dashboard — Improvement Plan

## What Is Changing

The dashboard currently renders as a single scrollable page. All five nav items (Overview, Quota, Models, Audit, Gateway) scroll to anchors on the same screen. This works but undersells the depth of the data — every section is visible at once, competing for attention, and there is no way to focus on one area without visual noise from the others.

This improvement replaces the scroll-anchor model with a **state-driven multi-view layout**. The nav now switches between distinct views. Each sub-page feels like the corresponding Overview card expanding to fill the screen, achieved with shared-element transitions.

---

## Interaction Model

**Overview** remains the entry point — a full-grid snapshot of all data. Every card is clickable. Hovering a card reveals a subtle "↗ View Details" label.

**Clicking a card (or nav item) triggers a drill-down:**
- The clicked card animates from its grid position to fill the main content area
- The other cards fade out simultaneously
- The expanded view renders additional detail that would not fit in the Overview grid

**Navigating back** (via the nav or a ← Overview button) reverses the animation.

---

## Technology Decision: Framer Motion `layoutId`

Framer Motion's `layoutId` prop links two elements across different render states. When the component tree changes — here, switching from Overview to a sub-page — Framer automatically interpolates the position, size, and border-radius between the two elements. No manual coordinate calculation is needed.

Each Overview card gets a `layoutId`. The corresponding sub-page wrapper uses the same `layoutId`. Framer handles the rest.

**Why not React Router:** The app is deployed to Cloudflare Pages as a static site. Client-side routing requires a `_redirects` rule to be in place. Using React state instead eliminates the dependency and keeps the navigation self-contained.

**Why not CSS transitions alone:** CSS cannot animate between two elements at different DOM positions. `layoutId` is the correct primitive for this interaction pattern.

---

## Data Strategy

Sub-pages do not fetch new data. All five views draw from the same three API responses already loaded by Overview:

| Data | Endpoint | Used by |
|---|---|---|
| Model stats | `GET /api/reports/models/stats` | Overview hero, Models page |
| Quota alerts | `GET /api/reports/quota-alerts` | Overview donut, Quota page |
| Audit flags | `GET /api/audit/revoked-usage` + `GET /api/audit/missing-responses` | Overview pills, Audit page |

Data is fetched once and stored in `App.jsx` state, then passed as props. This eliminates loading flicker when entering a sub-page and avoids redundant network calls.

---

## Sub-page Content Design

### Quota Page
The Overview donut shows only a count summary. The Quota page adds a full project table with inline progress bars, so the user can see exactly which projects are at risk and by how much. An auto-generated insight line summarizes the severity.

### Models Page
The Overview bar chart shows aggregate numbers. The Models page breaks these out into one card per model with individual stats, and adds a comparative insight identifying the highest-reliability and lowest-latency model. The insight text is generated entirely from the API response — no additional endpoint required.

### Audit Page
The Overview table merges two event types into one list. The Audit page separates them into two parallel timelines (Revoked Key Events / Missing Responses) with a dark summary banner at the top showing total flag counts. A generated insight reports how many violations exist and when the most recent one occurred.

### Gateway Page
The Overview has no corresponding Gateway card. The Gateway page is a full-screen version of the existing GatewayTester drawer — left column for the request form, right column for the live response display, with an in-session request history table below. The drawer is retired; this page replaces it entirely.

---

## Auto-generated Insight Boxes

Each sub-page includes a full-width insight box with generated text derived from the API data. This is implemented as pure frontend logic (if/else on response values) and requires no additional backend endpoint or AI integration. The effect reads as analytical commentary, which strengthens the demo's credibility as a real operational tool.

---

## What Is Not Changing

- Color palette, typography, card styles — unchanged
- Header and Footer — unchanged
- All existing components (`QuotaDonut`, `ModelBarChart`, `RequestTable`, `StatPill`) — reused with minor prop adjustments, not rewritten
- Mock fallback data — remains active on all components
- API endpoints — no new endpoints are added