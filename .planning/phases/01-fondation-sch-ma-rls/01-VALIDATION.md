---
phase: 1
slug: fondation-sch-ma-rls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP via `supabase test db` |
| **Config file** | `supabase/tests/` directory |
| **Quick run command** | `supabase test db` |
| **Full suite command** | `supabase test db` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `supabase test db`
- **After every plan wave:** Run `supabase test db`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUND-01 | pgTAP | `supabase test db` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-02 | pgTAP | `supabase test db` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-03 | pgTAP | `supabase test db` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | FOUND-04 | pgTAP | `supabase test db` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | FOUND-05 | pgTAP | `supabase test db` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/01_rls_isolation.sql` — stubs for FOUND-01, FOUND-02
- [ ] `supabase/tests/02_schema_types.sql` — stubs for FOUND-03
- [ ] `supabase/tests/03_statuses.sql` — stubs for FOUND-04, FOUND-05

*Wave 0 installs pgTAP extension if not already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Seeding des 13 statuts à la création d'une org | FOUND-04 | Trigger vérifié manuellement à l'insertion | `INSERT INTO organizations(...)` puis `SELECT count(*) FROM org_statuses WHERE org_id = <new_id>` — doit retourner 13 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
