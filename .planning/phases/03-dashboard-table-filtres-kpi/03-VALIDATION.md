---
phase: 3
slug: dashboard-table-filtres-kpi
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript type-check (tsc --noEmit) + manual browser verification |
| **Config file** | tsconfig.json |
| **Quick run command** | `bunx tsc --noEmit` |
| **Full suite command** | `bunx tsc --noEmit && bun run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bunx tsc --noEmit`
- **After every plan wave:** Run `bunx tsc --noEmit && bun run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | DASH-01,DASH-07 | type-check | `bunx tsc --noEmit` | ⬜ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | DASH-07 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-01-03 | 01 | 1 | DASH-01 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | DASH-01 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | DASH-03,DASH-04 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | DASH-02 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-02 | 03 | 3 | DASH-06,DASH-08 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 4 | DASH-01 | type-check + manual | `bunx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `bunx tsc --noEmit` passes on current codebase before any changes
- [ ] Confirm installed packages: `framer-motion` (already present), `@tanstack/react-table` (to install), `react-hot-toast` (to install), `nuqs` (to install)
- [ ] Confirm shadcn components to install: `card`, `badge`, `sheet`, `select`, `tooltip`, `popover`
- [ ] Baseline: `bun run build` passes before any Phase 3 changes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mesh gradient blobs visible in background | DASH-07 | Visual/aesthetic — no test can verify design feel | Open /dashboard, inspect background for 2-3 blurred colored blobs |
| Floating dock glassmorphism effect | DASH-07 | Visual — backdrop-blur rendering is browser-specific | Scroll dashboard, confirm dock stays fixed with blur effect |
| Avatar initials display correctly | DASH-01 | Visual — avatar fallback rendering | Check each table row has company initials in avatar |
| Overlapping team avatars render | DASH-01 | Visual — negative space-x stacking | Verify Intervenants column shows stacked avatars with ring |
| Sheet opens on row click | DASH-01 | User interaction flow | Click any table row, confirm Sheet slides in from right |
| react-hot-toast provider active | — | Runtime — requires browser render | Trigger any action that would fire toast, confirm it appears |
| Dark mode compatibility | All | Visual — requires toggling theme | Toggle to dark mode, verify no hardcoded colors break layout |
| URL filter persistence | DASH-02 | Browser behavior — must reload to verify | Apply filter, reload page, confirm filter state preserved |
| KPIs react to filter changes | DASH-03 | UI interaction | Apply cabinet filter, confirm KPI counts update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
