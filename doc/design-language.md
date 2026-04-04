# Design Language

---

## The Central Premise: Data as the Hero

Operational dashboards suffer from a common failure mode: they dress data up so aggressively that the data itself becomes hard to read. Heavy chrome, gradient on gradient, motion for its own sake. The viewer finishes looking and cannot tell you a single number they saw.

Tollgate is designed around the opposite principle. The interface is nearly invisible. The canvas is off-white, `#F4F4F0`, warm enough to feel considered, neutral enough to disappear. White cards float on it with the minimum shadow needed to create separation. Everything in the color palette exists to carry meaning, not decoration.

The one exception is the Hero card, a coral-to-orange gradient. That gradient is the only place color is used expressively rather than semantically. It marks the single number that matters most and does so with warmth rather than alarm. Everything else earns its color through function.

---

## Color as a Signal System

The palette is deliberately small.

| Color | Hex | Meaning |
|---|---|---|
| Coral to orange | `#FF6B6B` to `#FF8E53` | Primary emphasis; the Hero |
| Navy | `#1A1A2E` | Text, structure, weight |
| Mid-gray | `#9B9B9B` | Secondary labels, captions |
| Border | `#F0F0EE` | Separation without contrast |
| Green | `#4CAF82` | Things are fine |
| Amber | `#F5A623` | Worth watching |
| Red | `#E84545` | Act on this |

Green, amber, and red function as a traffic-light grammar. A StatPill showing zero compliance violations displays its number in green. The moment a violation appears, it flips to red with no other change. The color carries the urgency; the number confirms it. The viewer reads status before they read text.

This system breaks if colors appear decoratively, so they do not. The coral gradient is quarantined to the Hero card. Every other use of color in the interface, whether a badge, a dot, or a label, is a status signal.

---

## Typography: Hierarchy Through Weight and Scale

There are no custom fonts. The system font stack gives each platform its native reading experience and removes a network dependency that benefits no one.

The type scale is intentionally narrow. Hero numbers run at 3rem, weight 600, large enough to read across the room. Section labels sit at 0.75rem, weight 600, uppercased with a trace of letter-spacing. They are visually quiet but spatially distinct. Body text and table rows use 0.875rem at weight 400. Captions and secondary labels step down to 0.8rem in mid-gray.

The uppercase section labels — QUOTA HEALTH, MODEL PERFORMANCE, SESSION HISTORY — deserve a note. They are not loud. They are small and gray. But the capitalization creates a structural rhythm that orients the viewer at each card without a heavy heading hierarchy. It is the typographic equivalent of a floor plan's grid: invisible when it works.

---

## Cards: One Shape, Everywhere

Every content area is a white rectangle. Twenty-pixel radius, the same shadow, the same 24px padding. There is no nesting of cards within cards, no variation in corner radius by hierarchy level.

The consistency is intentional. Once the viewer learns the shape, they stop seeing it. The card becomes a transparent container and attention goes to what is inside.

The 20px radius is softer than the 8 to 12 pixels typical of SaaS dashboards. It reads as approachable rather than corporate. Combined with the off-white canvas and the restrained shadow, the overall effect is closer to a well-designed editorial layout than a dense analytics tool.

---

## The Overview Grid: Composition Over List

The Overview is not a list of widgets. It is a composition, two columns and three rows, designed so that each quadrant answers a different question.

```
+---------------------+------------------+
|  How much traffic?  |  How is quota?   |
|  Hero               |  Donut           |
+---------------------+------------------+
|  What happened?     |  How are models? |
|  Audit Table        |  Bar Chart       |
+---------------------+------------------+
|  What needs attention right now?       |
|  Stat Pills x3                         |
+----------------------------------------+
```

The bottom row is structurally different from the ones above. The three Stat Pills span the full width equally. They are the summary of the summary, the three numbers a responsible operator checks first when something pages them at 2am. They sit at the bottom not because they matter less but because they read best after context. The Hero and charts prime the viewer; the pills crystallize what to do.

---

## Motion: Meaning-First Animation

Every animation in the interface earns its presence by communicating something.

Page transitions use opacity and a subtle vertical offset on enter, reversed on exit, lasting 300ms eased out. This is barely perceptible. Its purpose is not to impress but to confirm that something changed. The viewer's eye catches the motion and registers "new page" without consciously processing it.

Card hover applies a `scale: 1.01` on Overview cards that link to a detail page. The scale is small enough that it does not shift layout. What it does is signal interactivity: this card is not just a display, it is a door. The "View Details" label that fades in on hover completes the affordance in text.

The `layoutId` continuity is the deeper animation. The audit table in Overview and the full AuditPage share a `layoutId`. When the viewer clicks through, Framer Motion interpolates the card from its grid position to full width. The detail page feels like the Overview card opening up rather than a separate screen loading. The spatial metaphor is maintained: you went deeper into something that was already there.

When a gateway response arrives, it fades in with a soft upward motion. The animation draws the eye from the submit button on the left to the response panel on the right without an explicit instruction to look there.

Skeleton rectangles fill the expected space of each loading component. They communicate not just "loading" but "something of this size is coming." The viewer's eye pre-fills the layout, so the arrival of real data feels like a reveal rather than a layout shift.

---

## The Hero Card: Controlled Warmth

The Hero card is the one place the design allows itself personality. The coral-orange gradient is warm, not clinical. The sparkline beneath the total-requests number sketches a trend shape without being precise about it. It implies activity, history, momentum.

Three sub-stats sit below a hairline rule at the bottom: Success Rate, Non-Success, Audit Flags. The white separators between them are lighter than a typical divider. They divide without cutting. The numbers are 1.1rem weight 600 in white. The labels are 0.72rem at 80% opacity. The hierarchy is entirely size and opacity, no color variation needed.

A context menu lives in the top-right corner. It offers two actions: Refresh and Copy Stats. The copy action writes a formatted text snapshot to the clipboard, a small considered utility for the person who needs to paste numbers into a Slack message or incident report. It acknowledges that dashboards are read by people who share what they see.

---

## The Audit Page: When Dark Means Serious

The AuditPage breaks the all-white card pattern with one deliberate exception. The summary banner uses a dark navy gradient. This is not decorative contrast. It signals a register shift: we have moved from monitoring to investigation.

The two-column timeline below separates Revoked Key Events from Missing Responses. Each column uses the same dot-and-line pattern but in different colors, red for compliance violations and amber for anomalies. The vertical line beneath each dot fades to invisible, suggesting sequence without imposing a rigid grid.

The insight box at the bottom, dark navy again, generates a plain-language sentence from the data: violation counts, days since the most recent event. It reads as a handoff. Here is what the data says. The next step is yours.

---

## The Gateway Page: Operational Clarity

The GatewayPage is not a marketing form. It is a technical tool for a technical user, someone who already knows what an API key and a model ID are. The design reflects this.

Fields are labeled in the same uppercase caption style as card headers. There is no explanatory copy below each label in the default state, only a short hint for the one field that needs it. The form assumes competence.

Validation messages appear only after the first submit attempt. An error state on a field the user has not touched yet is noise, not help.

The submit button spans full width and carries the coral gradient. When loading, the gradient is replaced by flat gray and the label becomes a spinner. The state change is immediate and unambiguous.

The response panel on the right uses a slightly off-white background rather than pure white, creating a visual distinction from the form without a border. When a response arrives, it fades in with a soft upward motion. The success state leads with a green HTTP status badge before the stats, because the first thing an operator wants to know is whether the call worked.

The session history table below the two panels is minimal. No borders on the table itself, only hairline row dividers. Cost values display in monospace to preserve column alignment across rows of varying decimal length.

---

## What This Design Is Not

It is not trying to feel like a consumer product. It is not trying to feel like enterprise software.

It is a tool built by someone who cares about the craft of presentation, where every placement is a considered decision rather than a framework default. The restraint is not minimalism for its own sake. It is the result of asking, at each decision point, whether something serves the data or serves the designer's ego.

The answer, consistently, is to serve the data.
