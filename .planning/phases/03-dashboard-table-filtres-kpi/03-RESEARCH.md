# Phase 3: Dashboard — Table, Filtres & KPI - Research

**Researched:** 2026-03-18
**Domain:** TanStack Table v8, Next.js App Router, shadcn/ui, Framer Motion, Tailwind v4 glassmorphism
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **CRITICAL RULE 1: Static-First** — NO Supabase connections in this phase. All data is hardcoded mock data in `.tsx` files. Components must be real React Server/Client components (`.tsx`), not sketches. The dashboard page at `src/app/dashboard/page.tsx` must be rebuilt completely.
- **CRITICAL RULE 2: Global Consistency** — Before styling anything, read `src/app/globals.css`, `src/lib/design-tokens.ts`, and all files in `src/components/ui/`. MUST reuse existing shadcn components. Install missing shadcn components via `bunx shadcn@latest add <component>`. Use semantic CSS variables only. Tailwind v4 in use (no `tailwind.config.ts` — config in `globals.css` via `@theme inline`). All colors use semantic tokens, never hardcoded hex.
- **Navigation:** Floating glassmorphism dock replaces traditional sidebar (DASH-07). Fixed top-center pill: `fixed top-6 left-1/2 -translate-x-1/2 z-50`, `bg-background/80 backdrop-blur-md border border-border shadow-sm rounded-full px-6 py-3`.
- **Background:** Mesh gradient — 2–3 absolutely-positioned decorative divs with `blur-[120px]`, pastel semantic colors (`bg-primary/5`, `bg-chart-1/10`, `bg-chart-2/8`), `pointer-events-none`, `aria-hidden`.
- **Toast:** Use `react-hot-toast` (NOT sonner). Install via `bun add react-hot-toast`. Add `<Toaster />` in `src/app/layout.tsx`.
- **Table:** TanStack Table (`bun add @tanstack/react-table`). No vertical borders. `divide-y divide-border`. Row padding `py-4 px-4`. 6 columns as specified.
- **Sheet:** shadcn Sheet (`bunx shadcn@latest add sheet`). `side="right"`. Triggered by row click.
- **Framer Motion:** Already installed (v12.37.0). Use `motion.div` with `initial={{ opacity: 0, y: -4 }}` / `animate={{ opacity: 1, y: 0 }}` on KPI cards and dock.
- **Product feel:** Linear + Vercel — friendly, collaborative, premium. Not dense data-grid.
- **Package manager:** `bun` / `bunx` — NEVER npm/npx.

### Claude's Discretion
- Number of mock data entries (minimum 8 recommended)
- Exact blob positions and colors for the mesh gradient
- Whether to use `app/dashboard/layout.tsx` (new) or embed background in `page.tsx`
- Table sorting implementation (can be simplified for mock data)
- Exact Framer Motion easing curves

### Deferred Ideas (OUT OF SCOPE)
- Real Supabase data fetching → Phase 4
- Server-side pagination → Phase 4
- Full side panel with status-change + activity log write → Phase 4 (DASH-05)
- CSV export (DASH-06) → stub with disabled state only in this phase
- Sync button (DASH-08) → stub with disabled/tooltip state only
- Group switcher in dock → stub as disabled dropdown
- Framer Motion collapsible sidebar (original DASH-07) → replaced by floating dock
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | TanStack Table with AGO columns: Dossier, Forme Juridique, Statut, Date Échéance, Intervenants, Actions — columns sortable | TanStack Table v8 column defs + `useReactTable` hook pattern |
| DASH-02 | URL-persistent filter bar: cabinet multi-select, statut filter, date range — survive page reload | nuqs or native Next.js searchParams — nuqs recommended |
| DASH-03 | KPI row above table: total, Non commencé, En cours, Terminés, En retard — reactive to active filters | Client-side derived state from filtered mock data array |
| DASH-04 | Échéance badge: red < 30d / past, orange 30–60d, muted > 60d. Subtle row highlight for critical | Date comparison util + Tailwind conditional classes |
| DASH-06 | CSV export button — stubbed disabled state with tooltip "Disponible à partir du plan Cabinet" | Button `disabled` + shadcn Tooltip |
| DASH-07 | Navigation — floating glassmorphism dock (replaces collapsible sidebar per product decision) | FloatingDock component pattern documented below |
| DASH-08 | Manual sync button — stubbed disabled state with tooltip "Disponible à partir du plan Pro" | Button `disabled` + shadcn Tooltip |
</phase_requirements>

---

## Summary

Phase 3 builds a premium, static-first dashboard shell. The primary technical challenge is integrating TanStack Table v8 with Next.js App Router's client component boundary — the table must be a `"use client"` component, while the page itself can remain a Server Component that passes mock data down as props. Framer Motion v12 is already installed; `@tanstack/react-table` and `react-hot-toast` are the only new packages needed. `nuqs` is the recommended library for URL-persistent filters.

The Avatar component discovery is critical: this project uses `@base-ui/react` for Avatar (not Radix UI's `@radix-ui/react-avatar`), and it already exports `AvatarGroup` and `AvatarGroupCount` — the overlapping team avatars in the Intervenants column are built-in and ready to use. The shadcn `sheet`, `card`, `badge`, `select`, `popover`, and `tooltip` components need to be added via `bunx shadcn@latest add`.

**Primary recommendation:** Build `DossiersTable.tsx` as a focused client component receiving `Dossier[]` as props. Keep `page.tsx` as a Server Component. Use `nuqs` for URL-persistent filters with a `Suspense` boundary around the table. Wire everything through `app/dashboard/layout.tsx` for the dock and gradient background.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21 | Headless table — sorting, filtering, column defs | De facto standard; Next.js App Router compatible; headless = full style control |
| framer-motion | 12.37.0 (ALREADY INSTALLED) | Mount animations on KPI cards and dock | Already in project; v12 API matches docs |
| react-hot-toast | ^2.5 | Toast notifications | Locked decision; simpler than sonner for this use case |
| nuqs | ^2.4 | URL-persistent filter state via Next.js searchParams | Type-safe; App Router native; handles Suspense boundary requirement |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577 (INSTALLED) | Icons for dock nav, actions, sync button | Already installed; use for all iconography |
| shadcn/ui components | via bunx | card, badge, sheet, select, tooltip | Install missing ones; reuse existing avatar/button |

### Already Installed — No Action Needed

| Package | Version | Notes |
|---------|---------|-------|
| framer-motion | 12.37.0 | Ready to import |
| motion | 12.37.0 | Alias — same package |
| lucide-react | 0.577.0 | All icons available |
| @base-ui/react | ^1.3.0 | Avatar, Button primitives |
| next-themes | ^0.4.6 | Dark mode available if needed |

### Must Install

```bash
bun add @tanstack/react-table react-hot-toast nuqs
bunx shadcn@latest add card badge sheet select tooltip popover
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs | Native Next.js searchParams | nuqs gives type safety and two-way sync; native requires manual URLSearchParams parsing |
| react-hot-toast | sonner (already installed) | Locked decision: react-hot-toast required. sonner.tsx exists in project but must NOT be used this phase |
| TanStack Table | shadcn/ui data-table (which wraps TanStack) | shadcn's data-table pattern IS TanStack Table — using it directly gives more control for custom columns |

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/dashboard/
  layout.tsx          ← NEW: mesh gradient + FloatingDock; wraps all dashboard routes
  page.tsx            ← REPLACE: hero + KPIs + table (Server Component)
  LogoutButton.tsx    ← EXISTS: keep for now (referenced in current page.tsx)

src/components/dashboard/
  FloatingDock.tsx    ← NEW: glassmorphism nav pill (Server Component, no state)
  KpiCards.tsx        ← NEW: 4 KPI cards (can be Server Component receiving counts)
  DossiersTable.tsx   ← NEW: "use client" — TanStack Table + Sheet + filters
  DossierSheet.tsx    ← NEW: "use client" — shadcn Sheet slide-over (can be co-located)

src/lib/
  mock-data.ts        ← NEW: Dossier[] array, 8+ entries
  date-utils.ts       ← NEW (optional): getUrgencyLevel(date) helper
```

### Pattern 1: Server/Client Component Split for Table

**What:** Keep `page.tsx` as a Server Component. Import mock data at module level. Pass `Dossier[]` to `DossiersTable` as props. TanStack Table lives inside the client component.

**When to use:** Always — this avoids unnecessary client bundle weight and keeps the page SSR-friendly.

```tsx
// src/app/dashboard/page.tsx (Server Component — no "use client")
import { mockDossiers } from '@/lib/mock-data'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { DossiersTable } from '@/components/dashboard/DossiersTable'

export default function DashboardPage() {
  return (
    <div className="pt-24 px-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Bonjour Sophie 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Vous avez 2 échéances critiques ce mois-ci.
          </p>
        </div>
        <Button>+ Nouveau Dossier</Button>
      </header>
      <KpiCards dossiers={mockDossiers} />
      <DossiersTable dossiers={mockDossiers} />
    </div>
  )
}
```

### Pattern 2: Dashboard Layout with Dock and Gradient

**What:** `app/dashboard/layout.tsx` wraps all dashboard routes. Renders FloatingDock and mesh gradient blobs. Children sit below the dock.

```tsx
// src/app/dashboard/layout.tsx (Server Component)
import { FloatingDock } from '@/components/dashboard/FloatingDock'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Mesh gradient blobs — decorative, no interaction */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-0 size-[500px] rounded-full bg-chart-1/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[400px] rounded-full bg-chart-2/8 blur-[120px]" />
      </div>

      <FloatingDock />
      <main className="relative z-10">{children}</main>
    </div>
  )
}
```

### Pattern 3: TanStack Table v8 in Next.js App Router

**What:** `DossiersTable.tsx` is a `"use client"` component. Uses `useReactTable` with `getCoreRowModel` and optionally `getSortedRowModel`. Renders HTML table using shadcn's table primitives or plain `<table>`.

**Key insight for App Router:** TanStack Table v8 is a React hook (`useReactTable`) — it requires `"use client"`. The column definitions and mock data can be imported at module level (no server-only code).

```tsx
// src/components/dashboard/DossiersTable.tsx
"use client"

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import type { Dossier } from '@/lib/mock-data'

export function DossiersTable({ dossiers }: { dossiers: Dossier[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null)

  const columns: ColumnDef<Dossier>[] = [
    // ... column definitions (see Code Examples section)
  ]

  const table = useReactTable({
    data: dossiers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="rounded-lg border border-border bg-background/60 backdrop-blur-sm">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedDossier(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DossierSheet dossier={selectedDossier} onClose={() => setSelectedDossier(null)} />
    </>
  )
}
```

### Pattern 4: AvatarGroup for Intervenants (Already Built-In)

**Critical discovery:** The existing `src/components/ui/avatar.tsx` already exports `AvatarGroup` and `AvatarGroupCount`. These are built with `@base-ui/react` and apply `-space-x-2` and `ring-2 ring-background` automatically via the `group/avatar-group` CSS selector pattern.

```tsx
// Intervenants column cell renderer
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'

function IntervenantsCell({ intervenants }: { intervenants: Intervenant[] }) {
  const visible = intervenants.slice(0, 3)
  const overflow = intervenants.length - visible.length
  return (
    <AvatarGroup>
      {visible.map(p => (
        <Avatar key={p.initials} size="sm">
          <AvatarFallback>{p.initials}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
    </AvatarGroup>
  )
}
```

### Pattern 5: Framer Motion Mount Animations (v12 API)

**What:** Framer Motion 12 (installed) uses the same `motion` API as v10/v11. Import from `framer-motion` directly.

```tsx
// KPI card mount animation
import { motion } from 'framer-motion'

function KpiCards({ dossiers }: { dossiers: Dossier[] }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card className="bg-background/60 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <p className="text-3xl font-semibold font-display" style={kpi.valueStyle}>
                {kpi.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
```

**Important:** `KpiCards` must be `"use client"` because `motion.div` requires the client. Alternatively, use the `motion` package (also installed as alias) which supports RSC — but `framer-motion` is the simpler path.

### Pattern 6: nuqs for URL-Persistent Filters

**What:** nuqs v2 provides type-safe URL state management for Next.js App Router. Requires a `NuqsAdapter` provider and a `Suspense` boundary wrapping the component that reads search params.

```tsx
// src/app/layout.tsx — add NuqsAdapter
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster /> {/* react-hot-toast */}
      </body>
    </html>
  )
}

// In DossiersTable.tsx
import { useQueryState, parseAsString, parseAsArrayOf } from 'nuqs'

const [statut, setStatut] = useQueryState('statut', parseAsString.withDefault(''))
const [cabinets, setCabinets] = useQueryState('cabinets', parseAsArrayOf(parseAsString).withDefault([]))
```

**Note:** nuqs requires `<Suspense>` around any component that uses `useQueryState`. Wrap `DossiersTable` in a Suspense boundary in `page.tsx`.

### Pattern 7: react-hot-toast in App Router

**What:** `react-hot-toast` exports `<Toaster />` (provider) and `toast` (imperative API). Provider goes in `src/app/layout.tsx`.

```tsx
// src/app/layout.tsx
import { Toaster } from 'react-hot-toast'

// Inside <body>:
<Toaster position="top-right" toastOptions={{ duration: 4000 }} />
```

```tsx
// Usage anywhere in client components:
import toast from 'react-hot-toast'
toast.success('Synchronisation réussie !')
toast.error('Erreur de connexion')
```

### Pattern 8: FloatingDock Component

```tsx
// src/components/dashboard/FloatingDock.tsx (Server Component)
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function FloatingDock() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-md border border-border shadow-sm rounded-full px-6 py-3">
      {/* Logo */}
      <span className="font-display font-semibold text-sm mr-4">CabinetPilot</span>

      {/* Active link */}
      <Link href="/dashboard" className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm font-medium">
        Dashboard
      </Link>

      <Link href="/missions" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1">
        Missions Annuelles
      </Link>

      {/* Disabled "soon" link */}
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground/50 px-3 py-1 cursor-not-allowed">
        Production Juridique
        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Bientôt</span>
      </span>

      {/* User avatar — far right */}
      <div className="ml-4">
        <Avatar size="sm">
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
      </div>
    </nav>
  )
}
```

### Pattern 9: Échéance Urgency Logic

```tsx
// src/lib/date-utils.ts
export type Urgency = 'overdue' | 'critical' | 'warning' | 'safe'

export function getUrgency(dateStr: string): Urgency {
  const today = new Date()
  const due = new Date(dateStr)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays < 30) return 'critical'
  if (diffDays <= 60) return 'warning'
  return 'safe'
}

export const urgencyClass: Record<Urgency, string> = {
  overdue:  'text-destructive font-medium',
  critical: 'text-destructive',
  warning:  'text-orange-500',
  safe:     'text-muted-foreground',
}
```

### Anti-Patterns to Avoid

- **Putting `useReactTable` in a Server Component:** TanStack Table is a React hook — it requires `"use client"`. Always mark `DossiersTable.tsx` as client.
- **Hardcoding hex colors in status badges:** Use Tailwind classes from the design system. The status badge colors (bg-slate-100, bg-blue-50, etc.) are standard Tailwind utility classes, not custom CSS variables — this is acceptable per the design spec.
- **Using `motion` package instead of `framer-motion` for client components:** Both are installed. `framer-motion` is the explicit dependency; use it for consistency.
- **Importing from `sonner`:** The `sonner.tsx` UI component exists but is explicitly excluded from this phase. Use `react-hot-toast` only.
- **Missing Suspense boundary for nuqs:** `useQueryState` reads from `searchParams` which is async in App Router. Without `<Suspense>`, the page will throw. Wrap the filter-using component.
- **Using `@radix-ui/react-avatar` primitives directly:** This project uses `@base-ui/react` for Avatar. Always import from `@/components/ui/avatar`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting + column logic | Custom sort functions + DOM table | `@tanstack/react-table` | Column sorting, cell rendering, and row model are complex; TanStack handles edge cases |
| URL state management | Manual `URLSearchParams` + `router.push` | `nuqs` | Two-way sync, type coercion, Suspense compatibility, and SSR handling are non-trivial |
| Overlapping avatar stack | Custom CSS with negative margins | `AvatarGroup` + `AvatarGroupCount` from `@/components/ui/avatar` | Already built in the project; handles ring, sizing, and overflow count |
| Slide-over panel animation | Custom `translate-x` CSS + state | `shadcn Sheet` | Built-in accessible animation, focus trap, keyboard dismiss |
| Toast notifications | Custom div + timeout | `react-hot-toast` | Edge cases: stacking, position, deduplication, accessibility |

**Key insight:** The Avatar component already ships `AvatarGroup` with `-space-x-2` and `ring-2 ring-background` — the Intervenants column needs zero custom CSS for the overlapping avatar effect.

---

## Common Pitfalls

### Pitfall 1: `"use client"` Boundary Propagation

**What goes wrong:** Marking `DossiersTable.tsx` as `"use client"` makes all its imports also client-side. If mock data is imported inside the client component, that's fine. But if you accidentally import server-only modules (e.g., `@/lib/supabase/server`), the build will fail.
**Why it happens:** App Router's client/server boundary is enforced at import time.
**How to avoid:** `mock-data.ts` must have no server-only imports. Keep it as a pure TypeScript module with data literals.
**Warning signs:** Build error mentioning "cannot import server-only module into client component."

### Pitfall 2: nuqs Without Suspense Boundary

**What goes wrong:** Using `useQueryState` from nuqs in a component that is not wrapped in `<Suspense>` causes Next.js to opt the entire page out of static rendering, and in some versions throws a runtime error.
**Why it happens:** `searchParams` is inherently dynamic in App Router.
**How to avoid:** In `page.tsx`, wrap `DossiersTable` with `<Suspense fallback={<TableSkeleton />}>`.
**Warning signs:** Next.js warning about `searchParams` at build time, or hydration mismatches.

### Pitfall 3: Tailwind v4 Opacity Modifier with CSS Variables

**What goes wrong:** In Tailwind v4, classes like `bg-background/80` work only if `--color-background` is mapped in `@theme inline` — which it IS in this project (`globals.css` maps all tokens). However, raw `--background` (without the `--color-` prefix) cannot be used with opacity modifiers.
**Why it happens:** Tailwind v4 opacity modifiers require the variable to be declared as a color in `@theme`.
**How to avoid:** Always use the `bg-background`, `text-foreground`, etc. utility classes (not arbitrary `bg-[var(--background)]`). The project's `@theme inline` block maps all tokens correctly.
**Warning signs:** Opacity modifier classes like `/80` having no effect.

### Pitfall 4: Framer Motion in Server Components

**What goes wrong:** Using `motion.div` from `framer-motion` in a Server Component causes a build error because `framer-motion` uses browser APIs.
**Why it happens:** Motion elements require client-side event listeners.
**How to avoid:** Any component using `motion.*` must be `"use client"`. Split `KpiCards.tsx` into a client component.
**Warning signs:** Build error: "You're importing a component that needs ... It only works in a Client Component."

### Pitfall 5: shadcn Component Installation Without Checking

**What goes wrong:** Running `bunx shadcn@latest add badge` when a `badge.tsx` already exists overwrites customizations.
**Why it happens:** shadcn CLI doesn't check for existence before overwriting by default.
**How to avoid:** `ls src/components/ui/` before each install. Current inventory: `avatar.tsx`, `button.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `sonner.tsx`. Missing: card, badge, sheet, select, tooltip, popover.
**Warning signs:** Custom component styles being reset after install.

### Pitfall 6: Missing Radix UI Peer Dependencies for New shadcn Components

**What goes wrong:** Installing `bunx shadcn@latest add sheet` requires `@radix-ui/react-dialog`. Installing `badge` or `card` typically only needs base Tailwind classes. Sheet and Tooltip will pull new Radix packages.
**Why it happens:** shadcn components are wrappers around Radix UI primitives.
**How to avoid:** Let `bunx shadcn@latest add` handle peer dependency installation automatically — it will run `bun add` for missing Radix packages.
**Warning signs:** Import errors on missing `@radix-ui/*` packages after shadcn install.

---

## Code Examples

### Mock Data Structure

```typescript
// src/lib/mock-data.ts
export interface Intervenant {
  initials: string
  name: string
}

export interface Dossier {
  id: string
  nom_societe: string
  cabinet: string
  forme_juridique: string
  siren: string
  date_cloture: string        // ISO date string "YYYY-MM-DD"
  date_echeance: string       // ISO date string "YYYY-MM-DD"
  statut: 'Non commencé' | 'En cours' | 'Terminé' | 'En retard'
  regime_fiscal: string
  statut_exercice_pl: string
  commentaires: string
  intervenants: Intervenant[]
}

export const mockDossiers: Dossier[] = [
  {
    id: '1',
    nom_societe: 'Laboratoires Dupont',
    cabinet: 'Cabinet Martin & Associés',
    forme_juridique: 'SAS',
    siren: '123 456 789',
    date_cloture: '2025-12-31',
    date_echeance: '2026-03-10', // past due → overdue
    statut: 'En retard',
    regime_fiscal: 'IS',
    statut_exercice_pl: 'Clôturé',
    commentaires: 'Urgence : dossier bloqué côté client.',
    intervenants: [{ initials: 'SM', name: 'Sophie M.' }, { initials: 'TL', name: 'Thomas L.' }],
  },
  // ... 7+ more entries covering all statuses and urgency levels
]
```

### Status Badge Renderer

```tsx
const STATUS_STYLES = {
  'Non commencé': 'bg-slate-100 text-slate-700',
  'En cours':     'bg-blue-50 text-blue-700',
  'Terminé':      'bg-green-50 text-green-700',
  'En retard':    'bg-red-50 text-red-600',
} as const

function StatusBadge({ statut }: { statut: Dossier['statut'] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[statut]}`}>
      {statut}
    </span>
  )
}
```

### KPI Derivation from Filtered Data

```tsx
// Computed inside DossiersTable or passed from page.tsx
function computeKpis(dossiers: Dossier[]) {
  return {
    total:         dossiers.length,
    nonCommence:   dossiers.filter(d => d.statut === 'Non commencé').length,
    enCours:       dossiers.filter(d => d.statut === 'En cours').length,
    termine:       dossiers.filter(d => d.statut === 'Terminé').length,
    enRetard:      dossiers.filter(d => d.statut === 'En retard').length,
  }
}
```

### TanStack Table Column Definitions (all 6 columns)

```tsx
const columns: ColumnDef<Dossier>[] = [
  {
    accessorKey: 'nom_societe',
    header: 'Dossier',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          <AvatarFallback>
            {row.original.nom_societe.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.original.nom_societe}</p>
          <p className="text-xs text-muted-foreground">{row.original.cabinet}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'forme_juridique',
    header: 'Forme Juridique',
    cell: ({ getValue }) => <span className="text-sm text-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ getValue }) => <StatusBadge statut={getValue<Dossier['statut']>()} />,
  },
  {
    accessorKey: 'date_echeance',
    header: 'Échéance',
    cell: ({ getValue }) => {
      const urgency = getUrgency(getValue<string>())
      return (
        <span className={urgencyClass[urgency]}>
          {new Date(getValue<string>()).toLocaleDateString('fr-FR')}
        </span>
      )
    },
  },
  {
    accessorKey: 'intervenants',
    header: 'Intervenants',
    cell: ({ getValue }) => <IntervenantsCell intervenants={getValue<Intervenant[]>()} />,
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <button className="text-muted-foreground hover:text-foreground p-1">
        <MoreHorizontal className="size-4" />
      </button>
    ),
    enableSorting: false,
  },
]
```

### Disabled Stub Buttons (DASH-06, DASH-08)

```tsx
// CSV Export stub (DASH-06)
<Button variant="outline" size="sm" disabled title="Disponible à partir du plan Cabinet">
  <Download className="size-4 mr-1" />
  Exporter CSV
</Button>

// Sync button stub (DASH-08)
<Button variant="outline" size="sm" disabled title="Disponible à partir du plan Pro">
  <RefreshCw className="size-4 mr-1" />
  Synchroniser
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sidebar navigation | Floating glassmorphism dock | Phase 3 product decision | DASH-07 fulfilled by dock; no Framer collapsible sidebar needed |
| `useState` for URL filters | `nuqs` URL state | nuqs v2 (2024) | Filters survive page reload, shareable URLs |
| Custom table implementations | TanStack Table v8 headless | 2023 (v8 stable) | Full control over rendering; no opinionated styles |
| `@radix-ui/react-avatar` | `@base-ui/react` Avatar | Phase 2 setup | This project uses Base UI — `AvatarGroup` already available |
| sonner for toasts | react-hot-toast | Phase 3 locked decision | Use `react-hot-toast`; ignore existing `sonner.tsx` |

**Deprecated/outdated in this project context:**
- `@radix-ui/react-avatar` is installed but shadowed by `@base-ui/react` Avatar in the component — do not use Radix Avatar directly.
- `sonner.tsx` component exists but is explicitly not used in Phase 3.
- `LogoutButton.tsx` in `src/app/dashboard/` — will be superseded by the dock's user avatar. Can be kept temporarily.

---

## Open Questions

1. **nuqs adapter placement**
   - What we know: nuqs v2 requires `NuqsAdapter` from `nuqs/adapters/next/app` in the root layout
   - What's unclear: Whether `NuqsAdapter` conflicts with existing `suppressHydrationWarning` on `<html>`
   - Recommendation: Place `NuqsAdapter` inside `<body>`, wrapping `{children}`. This is the documented pattern.

2. **`motion` vs `framer-motion` import**
   - What we know: Both `framer-motion` (12.37.0) and `motion` (12.37.0) are installed as separate entries in `package.json`
   - What's unclear: Whether `motion` package supports RSC (React Server Components) out of the box in v12
   - Recommendation: Use `framer-motion` imports in `"use client"` components. Avoid `motion` package unless RSC animation is needed (it's not in this phase).

3. **shadcn CLI version compatibility with Next.js 16**
   - What we know: The project uses Next.js 16.1.6 (ahead of stable at time of writing) and `shadcn@4.0.8`
   - What's unclear: Whether `bunx shadcn@latest add` components generate code compatible with React 19 + Next.js 16
   - Recommendation: Check generated component code after install; adjust if React 19 `"use client"` directive handling differs. The project already has working shadcn components so the CLI is likely compatible.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test runner installed |
| Config file | None — Wave 0 must install |
| Quick run command | N/A (Wave 0 gap) |
| Full suite command | N/A (Wave 0 gap) |

**Note:** This phase is UI/static-only. Automated testing for visual/interaction components requires a browser runner (Playwright or Vitest + jsdom). Given the static nature and absence of an existing test framework, manual visual verification is the practical gate. The planner should scope tests accordingly.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Table renders with 6 columns and mock data | visual/smoke | manual: `bun dev` + inspect | ❌ Wave 0 |
| DASH-02 | URL params update on filter change; survive reload | manual | Open in browser, change filter, reload, verify URL | ❌ Wave 0 |
| DASH-03 | KPI counts match mock data statuses | manual | Count rows in table, verify KPI numbers match | ❌ Wave 0 |
| DASH-04 | Échéance urgency colors correct per date | visual | manual: verify red/orange/muted coloring | ❌ Wave 0 |
| DASH-06 | CSV button is disabled with tooltip | visual | manual: hover button, confirm disabled state | ❌ Wave 0 |
| DASH-07 | Floating dock renders, links navigate correctly | manual | manual: click nav links, verify active state | ❌ Wave 0 |
| DASH-08 | Sync button is disabled with tooltip | visual | manual: hover button, confirm disabled state | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Visual review in browser (`bun dev`)
- **Per wave merge:** Full manual walkthrough: dock, KPIs, table sort, filter URL persistence, sheet open/close, disabled buttons
- **Phase gate:** All 7 requirement behaviors verified before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework installed — this phase uses manual browser verification only
- [ ] If future phases require automated UI tests: `bun add -d @playwright/test` + `bunx playwright install`

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection — `package.json`, `src/components/ui/avatar.tsx`, `src/app/globals.css`, `src/lib/design-tokens.ts` — confirms installed packages, component API, and CSS token names
- `src/app/dashboard/page.tsx` — confirms current stub structure to be replaced
- `src/app/layout.tsx` — confirms `<Toaster />` and `NuqsAdapter` insertion points
- `node_modules/framer-motion/package.json` — confirms version 12.37.0 installed
- `node_modules/@radix-ui/` directory listing — confirms which Radix primitives are available for shadcn installs

### Secondary (MEDIUM confidence)

- TanStack Table v8 App Router pattern — `useReactTable` as client hook is documented pattern; verified against project's React 19 compatibility
- nuqs v2 `NuqsAdapter` placement pattern — established pattern for Next.js App Router from nuqs documentation
- Framer Motion v12 `motion.div` API — v12 is a minor API-compatible upgrade from v11; import paths unchanged

### Tertiary (LOW confidence)

- shadcn CLI v4 + Next.js 16 compatibility — Next.js 16 is ahead of general release; assume compatible based on existing working components in project

---

## Metadata

**Confidence breakdown:**
- Standard stack (what to install): HIGH — confirmed via direct `package.json` and `node_modules` inspection
- Architecture (component split, file structure): HIGH — based on locked CONTEXT.md decisions + Next.js App Router patterns
- TanStack Table patterns: HIGH — well-documented v8 API, headless pattern is stable
- nuqs integration: MEDIUM — confirmed for App Router; exact Next.js 16 behavior untested
- Pitfalls: HIGH — derived from direct code inspection of existing project files

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable ecosystem; Framer Motion and TanStack Table are mature)
