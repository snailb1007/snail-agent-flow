# Implementation Plan: Feature-Scoped Memory Budgeting and Handoff Integrity

## Compatibility Constraints (from docs/compatibility-policy.md)

Two matrix rows govern this feature and are copied here per the policy's
spec-authoring rule:

- **P1: `saf budget` + `saf pack` (017) — Risk: Medium.** "New commands = safe.
  Budget enforcement at stage gates ships opt-in (`context-policy.json: enforce: false`
  default). Flip default in a later minor with doctor notice. Old context-policy
  files (no `enforce` key) behave exactly as today." → Applied to scoping: the new
  `session_scope` / `context_pack_scope` keys default to today's `"all"` behavior
  when absent; fresh `init` opts new projects into `"active_feature"`; doctor
  advises existing projects. The estimate only ever shrinks, never tightens a gate.
- **P1: typed memory + `saf learn` — Risk: Medium.** "New memory types live in new
  files (`.ai/memory/gotchas.md`, `patterns.md`); the existing 5 memory files keep
  format. `onboard-memory` and `handoff` accept both old (untyped) and new layouts."
  → Applied verbatim: `patterns.md` + `gotchas.md` are new files; `decisions.md`
  already exists; the five existing files are untouched.

Additional constraints honored: stable artifact paths (§1.1), additive-only
schema with read-old/write-new (§1.2, §3), non-intrusive idempotent `init` (§1.3),
opt-in-first for new enforcement (§1.4), CLI/exit-code stability (§1.5), and
offline LLM-free validation (§1.6). No artifact is repurposed; archival moves to a
backup-style subdirectory and never deletes (§2).

## Architecture

A single deterministic predicate decides whether a session log belongs to the
active feature, by reading only the log header for the `**Feature:** <slug>` line
that `handleNewSession` already writes (`bin/adp.js:741`). Both the budget walk
(`lib/context-budget.js`) and the compaction-input collector (`bin/adp.js`
`handleCompactMemory`) call this predicate, so scoping logic lives in one place.

Policy gains optional keys under the existing `budget_inputs` object plus two new
optional objects (`handoff`, `memory`). `loadPolicyConfig` already deep-merges over
`DEFAULT_POLICY`; the defaults preserve current behavior, so a policy file lacking
the keys is byte-for-byte unchanged in outcome.

Handoff verification splits into an always-on bugfix (reject the unedited seed
scaffold) and an opt-in strict tier (non-placeholder section bodies + a structural
cross-reference into `.ai/memory/*`). Both tiers are pure string/file-stat checks —
no network, no LLM.

Archival is an opt-in post-step of `compact-memory` that relocates the active
feature's scoped logs into `.ai/sessions/archive/<slug>/`, which the budget walk
skips. This bounds the active scan surface permanently and is the root-cause fix
for the O(N) defect.

## Proposed Changes

1. `lib/context-budget.js`: extend `DEFAULT_POLICY.budget_inputs` with
   `session_scope: "all"` and `context_pack_scope: "all"`; add `handoff: { strict: false }`
   and `memory: { archive_on_compact: false }` defaults; widen `loadPolicyConfig`
   to merge them while keeping current fallbacks.
2. `lib/context-budget.js`: add `readSessionFeature(absPath)` (header-only read)
   and `sessionMatchesFeature(absPath, slug)`; teach the `addFilesFromDir` callers
   for `.ai/sessions` and `.ai/context-packs` to filter by the active slug when the
   corresponding scope is `"active_feature"`, and to skip any `archive/` entry.
3. `lib/context-budget.js`: resolve the active slug inside `estimateBudget` from
   `variables.feature_slug` or `.specify/feature.json`, mirroring existing resolvers.
4. `bin/adp.js` `handleCompactMemory`: replace the unconditional
   `listFilesShallow('.ai/sessions')` with a scoped collector using the shared
   predicate; add `--archive` handling and `memory.archive_on_compact` that moves
   scoped logs into `.ai/sessions/archive/<slug>/` after the pack is written.
5. `bin/adp.js` `handleHandoff`: add the always-on seed-marker rejection (MH-04);
   add `--strict` parsing and `handoff.strict` policy read; implement the
   non-placeholder-section and memory cross-reference checks (MH-05). Exit codes
   unchanged.
6. `bin/adp.js` `init` memory-file list: append `patterns.md` and `gotchas.md`
   with new templates, non-overwriting.
7. `.specify/templates/`: add `memory-patterns-template.md` and
   `memory-gotchas-template.md`.
8. `bin/adp.js` (or the policy writer used by `init`): write
   `session_scope: "active_feature"` and `context_pack_scope: "active_feature"`
   into the policy file that fresh `init` creates; never edit an existing one.
9. `lib/init-checks.js`: add non-blocking checks
   `memory.budgetScope.recommended` and `memory.sessions.archivable`
   (`required: false`).
10. `validators/scripts/test-budget.js`, `test-cli.js`, `test-init-checks.js`:
    add the scoping, handoff-integrity, typed-file, archival, and doctor-advisory
    assertions from the spec's Test Strategy.
11. `docs/migration.md` + `CHANGELOG.md`: add the upgrade note and
    `### Upgrade notes` section.

## Impacted Files

- `lib/context-budget.js` (scoping predicate, policy defaults)
- `bin/adp.js` (`handleCompactMemory`, `handleHandoff`, `init` memory list, policy write)
- `lib/init-checks.js` (two advisories)
- `.specify/templates/memory-patterns-template.md`, `memory-gotchas-template.md` (new)
- `validators/scripts/test-budget.js`, `test-cli.js`, `test-init-checks.js` (tests)
- `docs/migration.md`, `CHANGELOG.md` (upgrade notes)

## Risks

- **Header-marker scoping misses legacy logs without the marker.** Mitigation:
  under `active_feature` scope such logs are excluded by design (they are exactly
  the unattributable history the fix targets); `"all"` and absent-key behavior is
  unchanged, and doctor surfaces archivable logs.
- **Strict cross-reference is structural, not semantic-by-LLM**, so it cannot
  detect a factually wrong promotion — only a missing one. Accepted: policy §1.6
  forbids LLM/network in the gate; deeper judgment stays with the review skills.
- **Default flip for fresh init changes new projects' estimates** vs. an existing
  project. Accepted and documented; the estimate only relaxes and enforcement is
  itself opt-in, so no gate tightens.

## Verification Plan

- `node validators/scripts/validate-spec.js` passes for this feature.
- `npm run test:cli` covers handoff integrity, typed-file seeding, and archival.
- The budget unit test covers scoped vs. `"all"` estimates and archive skipping.
- `npm test` (full suite) passes on Node 20 and 22.
- Manual: build a fixture with mixed-feature logs, run `saf budget` with each scope
  value, and diff the `inputs` list; run `saf handoff` against an unedited scaffold
  and an authored one.
- Compatibility: run the previous-version bootstrap fixture and confirm identical
  budget numbers, a passing `handoff`, and warnings-not-errors from `doctor`.

## Artifact Layout

- `specs/022-feature-scoped-memory-and-handoff-integrity/spec.md` — requirements
- `specs/022-feature-scoped-memory-and-handoff-integrity/plan.md` — this plan
- `specs/022-feature-scoped-memory-and-handoff-integrity/tasks.md` — checklist
