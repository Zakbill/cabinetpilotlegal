# Phase 3: Dashboard — Table, Filtres & KPI - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning
**Source:** User design vision (product + UI/UX specification)

<domain>
## Phase Boundary

Phase 3 delivers the main dashboard experience: a premium, collaborative UI shell built **static-first** (mock data only, no Supabase connections yet). The shell includes a floating glassmorphism navigation dock, mesh gradient background, KPI cards, a TanStack Table with avatar-enhanced columns, URL-persistent filters, and a Sheet-based slide-over detail panel. Real data will be wired in Phase 4.

Note: The roadmap lists sidebar (DASH-07) as collapsible Framer Motion sidebar — but the **user's product vision explicitly replaces the heavy left sidebar with a floating top dock** (glassmorphism pill). The sidebar requirement will be satisfied by the floating topbar pattern instead. This is a locked product decision.

</domain>

<decisions>
## Implementation Decisions

### CRITICAL RULE 1: Static-First
- **NO Supabase connections in this phase.** All data is hardcoded mock data in `.tsx` files.
- Components must be real React Server/Client components (`.tsx`), not sketches.
- The dashboard page is already at `src/app/dashboard/page.tsx` — it must be rebuilt completely.

### CRITICAL RULE 2: Global Consistency
- Before styling anything, read: `src/app/globals.css`, `src/lib/design-tokens.ts`, and all files in `src/components/ui/`.
- **MUST reuse existing shadcn components** (Avatar, Card, Badge, Button, Sheet, etc.). Install missing shadcn components via `bunx shadcn@latest add <component>`.
- Use semantic CSS variables: `bg-background`, `text-muted-foreground`, `border-border`, `text-foreground`, etc.
- Tailwind v4 is in use (no `tailwind.config.ts` — config is in `globals.css` via `@theme inline`).
- All colors must use semantic tokens, never hardcoded hex values in components.

### Product Positioning
- This is an **AI Agent SaaS**, not an Excel/Airtable clone.
- Interface must feel friendly, collaborative, and premium — inspired by **Linear** and **Vercel**.
- Do NOT build a dense, aggressive data grid.

### Background: Mesh Gradient
- Apply to the dashboard layout wrapper (or `app/dashboard/layout.tsx` if created).
- Use 2–3 absolutely-positioned decorative divs with `blur-[120px]` and pastel semantic colors (e.g., `bg-primary/5`, `bg-chart-1/10`, `bg-chart-2/8`).
- These blobs are purely decorative, `pointer-events-none`, `aria-hidden`.

### Navigation: Floating Glassmorphism Dock (replaces traditional sidebar)
- `fixed top-6 left-1/2 -translate-x-1/2 z-50`
- Styling: `bg-background/80 backdrop-blur-md border border-border shadow-sm rounded-full px-6 py-3`
- Content (left to right):
  - Logo / brand mark (small)
  - "Dashboard" link — **active state** (filled pill indicator)
  - "Missions Annuelles" link
  - "Production Juridique" link with a subtle "Bientôt" badge (muted, small)
  - User Profile Avatar on the far right
- This satisfies DASH-07's navigation requirement.

### Dashboard Header & KPIs
- Hero greeting: "Bonjour [Name] 👋" (use mock name "Sophie") with dynamic subtitle "Vous avez 2 échéances critiques ce mois-ci."
- CTA "+ Nouveau Dossier" button aligned to the right.
- 4 KPI cards using `<Card>` with `bg-background/60 backdrop-blur-sm border-border`:
  - Total dossiers (e.g., 42)
  - Non commencé (e.g., 12)
  - En cours (e.g., 18)
  - En retard (e.g., 3, shown in destructive text color)
- Big number typography, muted label text below.

### Notifications
- Install `react-hot-toast` via `bun add react-hot-toast`.
- Add `<Toaster />` provider in `src/app/layout.tsx` (root layout).
- Use `react-hot-toast` for all toast feedback (NOT sonner). The existing `sonner.tsx` component is NOT used for this phase.

### The Collaborative Data Table (TanStack Table)
- Install: `bun add @tanstack/react-table`
- **NO vertical borders.** Use `divide-y divide-border` for horizontal row separators only.
- Generous row padding: `py-4 px-4`.
- Columns:
  1. **Dossier**: shadcn `<Avatar>` with company initials (AvatarFallback) + bold company name + small muted cabinet name below.
  2. **Forme Juridique**: plain text (e.g., "SAS", "SARL")
  3. **Statut**: soft badge (light pastel background, dark text). Colors per status:
     - "Non commencé" → `bg-slate-100 text-slate-700`
     - "En cours" → `bg-blue-50 text-blue-700`
     - "Terminé" → `bg-green-50 text-green-700`
     - "En retard" → `bg-red-50 text-red-600`
  4. **Échéance**: Smart text — red `text-destructive` if urgent (< 30 days), orange `text-orange-500` if 30–60 days, muted if > 60 days.
  5. **Intervenants**: Stacked overlapping shadcn `<Avatar>` components:
     - `flex -space-x-2` wrapper
     - Each avatar: `ring-2 ring-background w-7 h-7`
     - Show 1–3 mock team member avatars with initials
  6. **Actions**: ellipsis menu or row-click trigger for Sheet
- Table header: light muted text, no background fill on header row.
- Clicking any row opens the Sheet detail panel.
- No server-side pagination in Phase 3 (static mock data) — that comes with real data wiring.

### Slide-over Detail: shadcn Sheet
- Install if not present: `bunx shadcn@latest add sheet`
- Triggered by clicking a table row.
- Opens from the RIGHT side (`side="right"`).
- Content (mock):
  - Company name + status badge as header
  - Full dossier details (SIREN, forme juridique, date clôture, échéance, régime fiscal, statut exercice PL)
  - Mock "Fil d'activité" (activity log) with 3–4 timestamped entries (e.g., "Statut changé de Non commencé → En cours par Sophie M. — 14 mars 2026")

### Mock Data Structure
Mock dossiers array (minimum 8 entries) covering:
- Mix of all statuses
- Mix of urgency levels (past due, <30d, 30–60d, >60d)
- 1–3 intervenants per row
- Diverse company names (French accounting client names)
- Include columns: id, nom_societe, cabinet, forme_juridique, siren, date_cloture, date_echeance, statut, regime_fiscal, statut_exercice_pl, commentaires, intervenants[]

### File Structure to Create
```
src/app/dashboard/
  layout.tsx          (mesh gradient background, Dock nav)
  page.tsx            (hero + KPIs + table + sheet)
src/components/dashboard/
  FloatingDock.tsx    (glassmorphism nav pill)
  KpiCards.tsx        (4 KPI cards)
  DossiersTable.tsx   (TanStack table, client component)
  DossierSheet.tsx    (Sheet slide-over, client component)
src/lib/mock-data.ts  (hardcoded mock dossiers)
```

### Framer Motion
- Install: `bun add framer-motion`
- Use subtle `motion.div` with `initial={{ opacity: 0, y: -4 }}` / `animate={{ opacity: 1, y: 0 }}` on the KPI cards and dock for a gentle mount animation.
- The Sheet slide-over uses shadcn Sheet's built-in animation (no extra Framer needed).

### Claude's Discretion
- Number of mock data entries (minimum 8 recommended)
- Exact blob positions and colors for the mesh gradient
- Whether to use `app/dashboard/layout.tsx` (new) or embed background in `page.tsx`
- Table sorting implementation (can be simplified for mock data)
- Exact Framer Motion easing curves

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `src/app/globals.css` — Tailwind v4 @theme config, all CSS custom properties, dark mode tokens
- `src/lib/design-tokens.ts` — Authoritative color/typography/spacing constants
- `src/components/ui/avatar.tsx` — Existing Avatar component (MUST use this, not re-implement)
- `src/components/ui/button.tsx` — Existing Button component
- `src/components/ui/separator.tsx` — Existing Separator component

### Auth & Routing
- `src/app/dashboard/page.tsx` — Current stub dashboard (will be replaced)
- `src/middleware.ts` — Auth middleware (do not modify, understand how it gates /dashboard)

### Planning Context
- `.planning/REQUIREMENTS.md` — Full DASH-01 through DASH-08 requirements
- `.planning/ROADMAP.md` — Phase 3 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

- Mock company names: "Laboratoires Dupont SAS", "Cabinet Martin & Associés", "Fromagerie Dubois SARL", "Tech Solutions EURL", "Agence Créative SARL", "BTP Constructions SA", "Consulting RH SAS", "Pharmacie Centrale SELARL"
- Mock intervenants: Sophie M. (initials: SM), Thomas L. (TL), Julie K. (JK), Marc B. (MB)
- The "Bientôt" badge on "Production Juridique" should be: `text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full`
- Active dock link indicator: `bg-primary text-primary-foreground rounded-full px-3 py-1`
- KPI card "En retard" number should use `text-destructive` for visual urgency

</specifics>

<deferred>
## Deferred Ideas

- Real Supabase data fetching → Phase 4 / data wiring phase
- URL-persistent filters (DASH-02) → implement in this phase with mock data (nuqs or searchParams)
- Server-side pagination → Phase 4
- CSV export (DASH-06) → can be stubbed with disabled state in this phase
- Sync button (DASH-08) → stub with disabled/tooltip state
- Group switcher in dock → stub as disabled dropdown
- Full side panel with status-change + activity log write → Phase 4 (DASH-05)
- Framer Motion sidebar (original DASH-07) → replaced by floating dock per product decision

</deferred>

---

*Phase: 03-dashboard-table-filtres-kpi*
*Context gathered: 2026-03-18 via user design vision*
