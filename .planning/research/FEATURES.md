# Feature Landscape

**Domain:** Legal mission tracking SaaS for French accounting firms (cabinet d'expertise comptable) — AGO obligations
**Researched:** 2026-03-15
**Confidence:** MEDIUM — External research tools unavailable; analysis drawn from validated PROJECT.md requirements (real first customer: Actuariel, 920 dossiers AGO), domain knowledge of French expert-comptable workflows, and professional services SaaS patterns (Karbon, Clio, Pennylane ecosystem, Airtable/N8N incumbent workflows being replaced).

---

## Table Stakes

Features users expect in any professional-services tracking tool. Missing = product feels unfinished or users do not migrate from their Airtable/N8N setup.

| Feature                                | Why Expected                                                                                                   | Complexity | Notes                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| Dossier list view with status column   | Core UX — users need to scan hundreds of files at a glance                                                     | Low        | TanStack Table; all AGO columns visible                      |
| Status change per dossier              | The entire workflow is about moving a dossier through stages                                                   | Low        | From side panel or inline; no page reload                    |
| Filterable / sortable table            | 920+ dossiers for one cabinet group — filtering is survival, not nice-to-have                                  | Low-Med    | Filter by cabinet, statut, date d'échéance minimum           |
| Deadline visibility                    | AGO has hard statutory deadlines (6 months post-clôture for SARL/SA/SAS) — missing them means client liability | Low        | Color-coded by urgency: overdue / <30j / ok                  |
| Activity log per dossier               | Accountants share files across collaborateurs — audit trail of who changed what                                | Med        | Chronological feed: status changes + manual comments         |
| Manual comment on a dossier            | Internal notes for collaborateurs ("client indisponible, rappel le 20/03")                                     | Low        | Author + timestamp; no threading needed v1                   |
| Multi-user access with role separation | Cabinet has experts-comptables + collaborateurs with different permissions                                     | Med        | Two roles minimum: admin and collaborateur                   |
| Scoped access per cabinet              | Collaborateurs only see their assigned cabinets; experts see all                                               | Med        | Supabase RLS; enforced server-side                           |
| Invitation flow                        | New team member onboarding — must work via email invite with role pre-assignment                               | Med        | Resend email, pending invite state                           |
| Pennylane data sync                    | Product exists to replace the N8N+Airtable Pennylane sync — this IS the product                                | High       | Redshift connection, upsert logic, never overwrites status   |
| Sync status feedback                   | Users need to know if the sync worked; latency from Redshift requires explicit progress states                 | Med        | Loading → success/error; last sync timestamp displayed       |
| Organization creation on first login   | SaaS onboarding must complete in one session or users abandon                                                  | Med        | Pennylane credentials + first sync in onboarding flow        |
| Customizable statuses                  | Every cabinet runs a slightly different internal process — fixed statuses cause rejection                      | Med        | Rename, reorder, add, delete; terminal statuses configurable |
| Default status pipeline pre-loaded     | Users should not start from a blank slate — cognitive friction kills onboarding                                | Low        | 7 default statuses as defined in PROJECT.md                  |
| Data isolation between organizations   | Multi-tenant SaaS — non-negotiable for legal/financial data                                                    | High       | Row-Level Security; must be verified at every query          |
| Subscription / billing management      | Self-serve SaaS model requires clear plan visibility and upgrade path                                          | Med        | Stripe integration; usage counter (dossiers actifs) visible  |

---

## Differentiators

Features that create competitive advantage over generic Airtable setups or horizontal project management tools. Not universally expected, but high value for this specific domain.

| Feature                                    | Value Proposition                                                                                             | Complexity | Notes                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Automatic weekly Pennylane sync (Pro+)     | Eliminates manual sync entirely; cabinet never has stale data                                                 | High       | pg_cron; plan-gated feature (not on Starter)                               |
| Smart deadline alerts                      | AGO deadlines are statutory — proactive alerting prevents liability (email or in-app notifications)           | Med        | Compute urgency from `date_echeance`; badge or email digest                |
| Configurable exclusion filters per org     | Different cabinets exclude different dossier types (LMNP, BNC, EI, etc.) — one-size rules break real data     | Med        | Org-level filter config: codes juridiques, régimes fiscaux, seuil exercice |
| Sync history / audit log (Cabinet+)        | Compliance-minded cabinets want proof of what synced when; also debugging tool                                | Med        | `sync_logs` table; visible in UI on Cabinet/Enterprise plans               |
| CSV export (Cabinet+)                      | Accountants always need to export to Excel for partners, clients, or backup                                   | Low        | Filtered or full export; plan-gated                                        |
| Extensible mission schema                  | AGO today, then creation de société, dissolution, etc. — schema designed for growth signals product longevity | High       | `dossiers.type` field; AGO-specific fields don't block other types         |
| Per-dossier side panel UX                  | Fast context without losing list position — superior to navigating to a full page and back                    | Med        | Slide-in panel with Framer Motion; keyboard-dismissable                    |
| Pricing per dossiers actifs (not per seat) | Cabinets have variable team sizes but predictable workload volume; seat-based pricing penalizes collaboration | Low        | Metering logic in Stripe; usage shown on billing page                      |
| Unlimited collaborateurs on all plans      | Removes friction for adding team members; differentiates from seat-based competitors                          | Low        | Business model decision already validated                                  |
| Dedicated onboarding for Enterprise        | Large cabinet groups (10+ cabinets) need hand-holding on Redshift setup                                       | Low-Med    | Manual process; SLA commitment                                             |

---

## Anti-Features

Features to deliberately NOT build for v1. Explicitly out of scope to protect focus and shipping velocity.

| Anti-Feature                                 | Why Avoid                                                                                                         | What to Do Instead                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Real-time chat / messaging                   | N+1 product to build and maintain; the activity log covers async coordination needs                               | Use activity log + comment thread per dossier                         |
| Mentions (@user) and reactions in comments   | Adds notification infrastructure; overkill for a two-role team tool in v1                                         | Simple author attribution on each comment suffices                    |
| File attachments to dossiers                 | Storage, virus scanning, access control complexity; not the core workflow                                         | Link to external documents in a comment field                         |
| Other mission types (création, dissolution…) | Schema is extensible, but building UI for them now dilutes AGO focus                                              | Mark `dossiers.type` as future; build AGO-complete first              |
| Mobile native app                            | Web-first; cabinets work on desktop in-office                                                                     | Responsive web covers occasional mobile access                        |
| i18n / multi-language                        | Market is exclusively French; translation adds maintenance overhead with zero near-term ROI                       | All UI, emails, errors in French only                                 |
| Integrations beyond Pennylane                | Building integrations with ACD, Silae, Coala, etc. requires new data models per source                            | Document integration interface; build v2 with validated demand        |
| Time tracking / billing hours                | Different product category; accountants use dedicated tools (Silae, etc.)                                         | Out of scope permanently unless strategic pivot                       |
| Client portal (client-facing access)         | Requires separate auth flows, access control logic, UX for non-accountant users                                   | Flag as potential v3; focus on internal cabinet tool first            |
| Kanban board view                            | List view + status column already provides the same information; kanban adds complexity without AGO-specific gain | The table with status filter is the kanban equivalent for this domain |
| Email integration (send emails from app)     | Different product; Resend is used for system emails only, not client communication                                | Out of scope; accountants use their email client                      |
| AI-generated PV drafts                       | Could be valuable but requires legal review; liability risk for v1                                                | Research as v2 differentiator once core workflow is proven            |

---

## Feature Dependencies

```
Pennylane Redshift Sync
  └── Organization creation (credentials stored on first login)
  └── Org-level filter configuration (exclusion rules)
  └── sync_logs (history requires sync to exist)
  └── Automatic weekly sync (requires manual sync to be validated first)

Dossier list view
  └── Pennylane sync (data must exist to display)
  └── Status system (customizable statuses must be initialized)
  └── RBAC / cabinet scoping (what you see depends on your role)

Side panel (per-dossier detail)
  └── Dossier list view (opened from table row click)
  └── Status change (primary action in panel)
  └── Activity log (rendered in panel)
  └── Manual comment (appended to activity log in panel)

Activity log
  └── Status change (auto-entries triggered by status mutations)
  └── Manual comment (user-authored entries)

Deadline alerting (differentiator)
  └── Dossier list view (must compute urgency from date_echeance)
  └── Email notifications would require Resend integration (already planned)

RBAC / Multi-tenant
  └── Organization creation (tenant boundary established at signup)
  └── Invitation flow (adds collaborateurs to org)
  └── Cabinet scoping (assigns collaborateurs to subsets of data)

Subscription / billing
  └── Organization creation (plan attached at org level)
  └── Dossier count metering (usage must be tracked for plan enforcement)
  └── Automatic sync (plan-gated — unlocked at Pro+)
  └── Sync history (plan-gated — unlocked at Cabinet+)
  └── CSV export (plan-gated — unlocked at Cabinet+)

CSV export
  └── Dossier list view (export reflects current filters)
  └── Subscription check (Cabinet+ only)
```

---

## MVP Recommendation

Prioritize (in dependency order):

1. **Organization creation + Pennylane sync** — This is the core value; without data, nothing else matters
2. **Dossier list with filtering + status column** — The primary daily-use surface
3. **Status customization** — Blocks cabinet adoption if missing; cabinets reject rigid workflows
4. **Side panel with activity log + comments** — Enables collaboration; distinguishes from raw Airtable
5. **RBAC + invitation flow** — Required for any multi-user cabinet use
6. **Subscription + billing** — Required to monetize and enforce plan limits
7. **Deadline visual urgency indicators** — Low implementation cost, high perceived value for compliance-aware users

Defer to v1.1+:

- Automatic weekly sync: Build after manual sync is stable and user-validated (pg_cron complexity not worth the risk at launch)
- Sync history UI: Backend table exists but UI can be a later addition
- CSV export: Useful but not a daily-use blocker; defer to Cabinet plan launch
- Deadline email notifications: In-app urgency indicators first; email digest adds Resend template complexity

---

## Competitive Context (LOW confidence — no live research performed)

Tools cabinets currently use for this workflow:

- **Airtable + N8N** (what CabinetPilot directly replaces) — manual, fragile, not purpose-built for French legal obligations
- **Coala** (Infodoc group) — full practice management; overkill and expensive for AGO tracking alone
- **ACD Groupe** — heavy ERP-style; not SaaS-native
- **Pennylane itself** — source of truth for dossiers but has no mission tracking layer

The gap CabinetPilot fills: a purpose-built, Pennylane-native, lightweight mission tracker that is not a full practice management suite. The competitive moat is tight integration + French market specificity + workflow that matches how cabinets actually run AGOs.

---

## Sources

- PROJECT.md (validated requirements from first customer Actuariel — 920 dossiers AGO, 3 cabinets) — HIGH confidence
- Domain knowledge: French Code de Commerce AGO deadlines (Art. L223-26 SARL, L225-100 SA) — HIGH confidence
- Professional services SaaS patterns (Karbon, Clio, practice management category) — MEDIUM confidence (training data, no live verification)
- French expert-comptable market tooling (Coala, ACD, Pennylane ecosystem) — MEDIUM confidence (training data)
- Note: WebSearch, WebFetch, and Bash tools were unavailable during this research session. All findings from PROJECT.md are HIGH confidence. Market/competitive claims are MEDIUM-LOW and should be validated before roadmap finalization.
