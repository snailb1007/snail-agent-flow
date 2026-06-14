# Implementation Plan: Runtime-Aware Subagent Guidelines

## Compatibility Constraints (from docs/compatibility-policy.md)

- **Risk: Medium.** Re-running `init` now rewrites SAF-owned guideline sections inside existing instruction files. Strategy: upsert is scoped to the exact SAF heading range (heading to next `##` heading), the brownfield `skipExisting` contract is unchanged, writers no-op when content is already current, and the doctor check ships as a non-blocking warning (same disposition as `skills.version.current`).
- No new artifacts, no schema changes, no command-signature changes.

## Architecture

All guideline content lives in `bin/adp.js` next to the existing writers. A canonical body builder produces the capability-detection block; a per-file runtime-note map specializes it for `CLAUDE.md` (Claude Code `Agent`/Task tool), `AGENTS.md` (sequential fallback), `GEMINI.md` (Antigravity/Gemini), and a neutral variant for `.ai/instructions/ATLAS.md`. A generalized `removeSectionsByHeading(content, headingRe)` helper powers all upserts; `removeAtlasGuidelineSections` becomes a wrapper over it.

## Proposed Changes

1. `bin/adp.js`: add `removeSectionsByHeading(content, headingRe)`; reimplement `removeAtlasGuidelineSections` as a wrapper (export unchanged).
2. `bin/adp.js`: add `buildSubagentGuidelinesBody(runtimeNote)` and the runtime-note map; the body instructs capability detection first, wave-based task grouping, parallel spawn only on capable runtimes, context limits, coordination, and shared-state protection.
3. `bin/adp.js`: convert `appendSubagentGuidelines`, `appendContextPolicyGuidelines`, and `appendBehavioralCoreGuidelines` to heading-scoped upsert with a no-op fast path when the file already contains the canonical section.
4. `bin/adp.js`: `writeSeparateAtlasInstructions` — on update, remove SAF-owned sections by heading, re-append canonical bodies (subagent body uses the runtime-neutral note), preserve foreign sections, skip the write when nothing changes.
5. `lib/init-checks.js`: add check `instructions.subagentGuidelines.current` (`required: false`) that scans `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and `.ai/instructions/ATLAS.md` for `define_subagent` / `invoke_subagent` and warns with refresh guidance.
6. `validators/scripts/test-cli.js`: update existing guideline assertions and add the upsert, idempotency, ATLAS.md-refresh, and doctor-warning tests from the spec's Test Strategy.
7. `docs/migration.md`: add an upgrade note describing the guideline refresh and the doctor warning.
8. Dogfooding: refresh this repository's own `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `.ai/instructions/ATLAS.md` using the new writers.

## Impacted Files

- `bin/adp.js` (writers, builder, helper)
- `lib/init-checks.js` (doctor check)
- `validators/scripts/test-cli.js` (tests)
- `docs/migration.md` (upgrade note)
- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.ai/instructions/ATLAS.md` (regenerated content in this repo)

## Risks

- Heading-scoped removal replaces any team edits made inside the SAF-owned section. Accepted: identical to the existing `upsertAtlasGuidelines` contract; called out in `docs/migration.md`.
- A regex over file content (doctor check) could false-positive on intentional mentions of the legacy names; scoped to instruction files only and non-blocking, so the cost of a false positive is one advisory line.

## Verification Plan

- `node validators/scripts/validate-spec.js` passes for this feature.
- `npm run test:cli` covers the new and updated assertions.
- `npm test` (full suite) passes.
- Manual: run the writers against a fixture seeded with the legacy block and inspect the diff.

## Artifact Layout

- `specs/021-runtime-aware-subagent-guidelines/spec.md` — requirements (this feature)
- `specs/021-runtime-aware-subagent-guidelines/plan.md` — this plan
- `specs/021-runtime-aware-subagent-guidelines/tasks.md` — checklist
