# Architecture

**Analysis Date:** 2026-06-20
**Status:** Refreshed for Phase 0 truth-and-safety updates; supersedes the stale 2026-05-24 map.

## Pattern Overview

Snail Agent Flow is now a zero-dependency Node.js CLI package plus Markdown-first agent orchestration protocol. It is not an application server or product UI.

**Implemented:**
- `bin/adp.js` exposes the `adp` and `saf` CLI aliases with 22 commands.
- `lib/` contains deterministic orchestration, flow-state, budget, pack, claim, lease, signal, hook, snapshot, and validator helpers.
- `validators/scripts/` contains the deterministic spec validator and broad local test suite.
- `.github/workflows/ci.yml` and `.github/workflows/release.yml` provide CI and release packaging.
- `.ai/`, `.specify/`, `specs/`, `.claude/skills/`, `.agents/skills/`, and templates hold protocol state, feature specs, and localized skills.

**Not implemented / deliberately deferred:**
- No packaged `lib/migrate-ledger.js` or CLI migrator exists yet; only skill helper scripts exist. Phase 3 of `docs/improvement-plan.md` owns packaging a real migrator.
- No deployed service, database, hosted API, or product UI exists.

## Layers

1. **Instruction Layer** — `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CONTEXT.md` define resident agent rules and glossary. Phase 0 fixes broken absolute Spec-Kit plan pointers to relative paths.
2. **CLI Layer** — `bin/adp.js` is the package entry point and command registry for both `adp` and `saf`.
3. **Runtime Library Layer** — `lib/` implements deterministic file/git-native helpers used by CLI commands and validators.
4. **Validation Layer** — `validators/scripts/` and `npm run validate` / `npm test` enforce spec, init, CLI, flow, budget, package, and ATLAS checks offline.
5. **Artifact Layer** — `.ai/`, `.specify/`, `specs/`, `.planning/`, and docs store state, canonical specs, generated maps, memory, and reviews.
6. **Release Layer** — `.github/workflows/release.yml` accepts semver `v*.*.*` plus legacy `v*.*.*.*` tags during the transition to `0.5.0`.

## State Model

Current active orchestration state is `.ai/state/flow-state.json`. Legacy `.ai/state/flow-ledger.json` may appear only in compatibility/migration contexts; runtime guidance says not to create it as active state.

## Corrected Facts Applied

- AGENTS.md adoption claims must be cited as time-bounded; do not repeat an uncited "30–40k repos" claim.
- Progressive disclosure should reference Skills metadata plus `SKILL.md` body size, not a blanket "L1 <=1024 chars" rule.
- Claude `@path` import behavior and any Codex document-size cap remain unverified until checked against current primary docs.

---

*Architecture analysis refreshed: 2026-06-20*
