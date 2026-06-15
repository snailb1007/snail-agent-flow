# Tasks: Feature-Scoped Memory Budgeting and Handoff Integrity

**Prerequisites**: plan.md and spec.md

## Specification Review

- [x] T001 Review spec scope, acceptance criteria (MH-01..MH-09), and the two
  copied compatibility-matrix rows against `docs/compatibility-policy.md`.

## Implementation — Defect 1 (scoped budgeting)

- [x] T002 In `lib/context-budget.js`, extend `DEFAULT_POLICY` with
  `budget_inputs.session_scope: "all"`, `budget_inputs.context_pack_scope: "all"`,
  `handoff: { strict: false }`, and `memory: { archive_on_compact: false }`; widen
  `loadPolicyConfig` to merge them with current fallbacks.
- [x] T003 Add `readSessionFeature(absPath)` (header-only) and
  `sessionMatchesFeature(absPath, slug)`; resolve the active slug in
  `estimateBudget` from `variables.feature_slug` or `.specify/feature.json`.
- [x] T004 Filter the `.ai/sessions` and `.ai/context-packs` walks by scope, skip
  the `archive/` subdirectory, and keep `"all"`/absent-key output byte-identical.

## Implementation — Defect 2 (handoff integrity)

- [x] T005 In `bin/adp.js` `handleHandoff`, add the always-on seed-marker
  rejection (MH-04) with a remediation message.
- [x] T006 Add `--strict` parsing plus `handoff.strict` policy read, and implement
  the non-placeholder-section and `.ai/memory/*` cross-reference checks (MH-05),
  keeping exit codes unchanged.

## Implementation — Defect 3 (typed memory + archival)

- [x] T007 Add `memory-patterns-template.md` and `memory-gotchas-template.md` under
  `.specify/templates/`; append `patterns.md` and `gotchas.md` to `init`'s
  memory-file list, non-overwriting.
- [x] T008 In `handleCompactMemory`, scope session inputs by the shared predicate
  and implement opt-in `--archive` / `memory.archive_on_compact` moving scoped logs
  to `.ai/sessions/archive/<slug>/` (move, never delete).
- [x] T009 Write `session_scope`/`context_pack_scope: "active_feature"` into the
  policy file fresh `init` creates; never edit an existing policy file.
- [x] T010 Add non-blocking doctor checks `memory.budgetScope.recommended` and
  `memory.sessions.archivable` (`required: false`) in `lib/init-checks.js`.

## Tests

- [x] T011 Budget unit tests: scoped vs. `"all"` totals, mixed-feature and
  unmarked logs, context-pack filename scoping, archive subdirectory skipped.
- [x] T012 CLI tests: `handoff` rejects unedited scaffold and passes an authored
  one; `handoff --strict` enforces section bodies and the memory cross-reference;
  `init` seeds the two typed files idempotently; `compact-memory --archive` moves
  only scoped logs; doctor advisories fire on stale and stay silent on fresh.
- [x] T013 Compatibility test: previous-version bootstrap fixture yields identical
  budget numbers, a passing `handoff`, and warnings-not-errors from `doctor`.

## Documentation

- [x] T014 Add the upgrade note (new keys, archival, strict handoff, typed files)
  to `docs/migration.md` and a `### Upgrade notes` section to `CHANGELOG.md`.

## Verification

- [x] T015 `node validators/scripts/validate-spec.js` passes.
- [x] T016 `npm test` full suite passes on Node 20 and 22.
