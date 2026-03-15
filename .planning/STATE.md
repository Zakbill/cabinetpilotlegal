# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Un cabinet comptable ouvre CabinetPilot et sait instantanément, pour chacun de ses clients, où en est la mission juridique — qui la gère, quel est son statut, et si une deadline approche.
**Current focus:** Phase 1 — Fondation : Schéma & RLS

## Current Position

Phase: 1 of 9 (Fondation — Schéma & RLS)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-16 — Roadmap créé (9 phases, 49 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Magic link uniquement (pas de mot de passe ni OAuth) — décision produit v1 validée
- [Init]: Entité centrale `dossiers` avec champ `type` extensible — AGO en premier, autres types en v2
- [Init]: Supabase Vault pour les credentials Redshift — sécurité non-négociable
- [Init]: Statuts personnalisables par org — rigidité = rejet produit
- [Init]: Pricing par dossiers actifs (pas par siège)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 5 / Research flag]: `npm:pg` dans Deno pour Redshift TCP est MEDIUM confidence — vérifier timeout Edge Function avant implémentation. Recommande `/gsd:research-phase` avant Phase 5.
- [Phase 8 / Research flag]: `pg_net.http_post` exact signature est MEDIUM confidence — vérifier avant Phase 8. Recommande `/gsd:research-phase` avant Phase 8.

## Session Continuity

Last session: 2026-03-16
Stopped at: Roadmap initialisé — prêt à planifier Phase 1
Resume file: None
