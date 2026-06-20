# Codebase Concerns

**Analysis Date:** 2026-06-20
**Status:** Refreshed for Phase 0; stale May-2026 "no CLI/no tests/no CI" concerns are retired.

## Current High-Value Concerns

### Instruction surface drift

- Files: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CONTEXT.md`, templates in `bin/adp.js`.
- Concern: resident instructions are large and partially duplicated across runtimes.
- Current Phase 0 action: fix broken absolute Spec-Kit plan pointers only. Broader consolidation belongs to Phase 2A in `docs/improvement-plan.md`.

### Version transition must stay coherent

- Files: `VERSION`, `package.json`, `package-lock.json`, `.github/workflows/release.yml`, `docs/compatibility-policy.md`.
- Concern: project policy freezes legacy `0.4.0.0` and moves the next release to semver `0.5.0`.
- Safe path: keep npm metadata semver-compatible and accept both `v*.*.*` and legacy `v*.*.*.*` tags during transition.

### Migrator is not packaged yet

- Files: `.claude/skills/atlas-routing/scripts/migrate-ledger.js`, `.agents/skills/.../migrate-ledger.js`, future `lib/migrate-ledger.js`.
- Concern: docs must not claim a packaged CLI/lib migrator exists. Current helper scripts are skill-local only.
- Owner: Phase 3 in `docs/improvement-plan.md`.

### Legacy state boundaries

- Files: `.ai/state/flow-state.json`, possible `.ai/state/flow-ledger.json`, `lib/flow-ledger.js`, `lib/validate-drift.js`.
- Concern: legacy ledger references are allowed in migration/compat docs, not as active runtime state.
- Safe path: keep `FlowLedger` compatibility this major; package a migrator before any state collapse.

### Fact hygiene for public claims

- Source: `docs/improvement-plan.md` section 2.
- Do not publish uncited AGENTS.md adoption counts such as "30-40k repos".
- Do not treat `1024` as a universal progressive-disclosure content cap; it applies to Skills `description` metadata.
- Treat Claude `@path` import behavior and Codex document-size caps as unverified until checked against current primary documentation.

## Retired Stale Concerns

The following May-2026 concerns are no longer true and should not be repeated:

- Previously reported missing package metadata is now present: `package.json` and `package-lock.json` exist.
- Previously reported missing executable CLI is now present: `bin/adp.js` exposes `adp` and `saf`.
- Previously reported missing test runner is now present: npm validation/test scripts exist.
- Previously reported missing CI is now present: `.github/workflows/ci.yml` and `release.yml` exist.
- "No health check command" — `doctor` exists.
- "No executable validator" — `validators/scripts/validate-spec.js` exists.

## Remaining Risks

- Broad edits to instruction files can change agent behavior; keep Phase 0 edits deterministic and minimal.
- Do not use `git add .`, cleanup, reset, or restore commands while unrelated user work may exist.
- Release/version docs can drift from package metadata if not verified together.

---

*Concerns audit refreshed: 2026-06-20*
