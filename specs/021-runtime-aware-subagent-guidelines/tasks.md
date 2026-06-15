# Tasks: Runtime-Aware Subagent Guidelines

**Prerequisites**: plan.md and spec.md

## Specification Review

- [x] T001 Review spec scope, acceptance criteria, and compatibility constraints against `docs/compatibility-policy.md`.

## Implementation

- [x] T002 Add `replaceOrAppendSection` + `isSectionBoundary` helpers in `bin/adp.js`; keep `removeSectionsByHeading`/`removeAtlasGuidelineSections` exported with the safer boundary.
- [x] T003 Add `buildSubagentGuidelinesBody` and the per-file runtime-note map (CLAUDE.md / AGENTS.md / GEMINI.md / neutral) in `bin/adp.js`.
- [x] T004 Convert `appendSubagentGuidelines` to heading-scoped upsert with no-op fast path and per-file runtime notes.
- [x] T005 Convert `appendContextPolicyGuidelines` and `appendBehavioralCoreGuidelines` to the same upsert semantics; reroute `upsertAtlasGuidelines` through the shared `upsertSectionInFiles`.
- [x] T006 Update `writeSeparateAtlasInstructions` to refresh stale SAF-owned sections in place while preserving foreign sections, with no-op fast path.
- [x] T007 Add doctor check `instructions.subagentGuidelines.current` (`required: false`) in `lib/init-checks.js`.

## Tests

- [x] T008 Update existing guideline assertions in `validators/scripts/test-cli.js` for the new content.
- [x] T009 Add tests: fresh-init per-file runtime notes; legacy-block upsert; idempotent no-op re-run; ATLAS.md section refresh with custom section preserved; doctor warning on stale content; foreign HTML-comment-fenced block preserved (regression).

## Documentation & Dogfooding

- [x] T010 Add the guideline-refresh upgrade note to `docs/migration.md`.
- [x] T011 Refresh this repository's own `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` with the new writers (idempotent; foreign snailb-skills block preserved).

## Verification

- [x] T012 `node validators/scripts/validate-spec.js` passes.
- [x] T013 `npm test` full suite passes.
