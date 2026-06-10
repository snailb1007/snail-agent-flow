# Implementation Plan: Budget and Pack CLI Commands

**Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

## Compatibility Constraints (from docs/compatibility-policy.md, P1 matrix row)

> P1: `saf budget` + `saf pack` (017) — Risk: Medium. New commands = safe. Budget
> enforcement at stage gates ships opt-in (`--enforce` flag; never default).
> Old context-policy files (no new keys) behave exactly as today. No changes to
> existing command signatures, exit codes, or default outputs.

## Architecture

Both commands are thin CLI handlers over existing 017 modules — no new estimation
or validation logic.

- `lib/context-budget.js` (unchanged): `loadPolicyConfig`, `estimateBudget(flowStage, repoRoot, variables)`, `computeOutcome`.
- `lib/context-policy-validator.js` (unchanged): `validateContextPack(objectOrPath)` — accepts parsed objects, so the generator validates before writing.
- `lib/yaml-parser.js` (unchanged): parses `.ai/flows/atlas-flow.yaml` to find the stage's `required_artifacts` for accurate estimation.
- `lib/flow-state.js` (unchanged): `load(repoRoot)` resolves the current stage when `--stage` is absent.

## Proposed Changes

1. **New module `lib/context-pack-generator.js`**
   - `buildPackManifest(repoRoot, options)`: pure function returning a manifest object
     (schema_version `1.0.0`, created_at ISO timestamp, stage_id, objective,
     required_files seeded from active feature spec/plan/tasks plus flow files,
     omissions for session logs and unrelated specs, expected_outputs,
     validation_commands, stop_conditions). All paths workspace-relative with
     forward slashes.
   - `generatePack(repoRoot, options)`: builds, validates via `validateContextPack`,
     fails closed (returns errors, writes nothing) on invalid output, otherwise
     writes to `.ai/context-packs/<stage>-<timestamp>.json` (or `options.outPath`)
     and refuses to overwrite an existing file.
2. **`bin/adp.js`**
   - `handleBudget(args)`: stage resolution (`--stage` flag → flow-state → ad-hoc
     stub with empty required_artifacts), variables `{ feature_dir }` from
     `.specify/feature.json`, then `estimateBudget` + `computeOutcome`. Renders a
     human report (bytes, thresholds, top inputs, outcome, recommended action);
     `--json` for machine output; `--enforce` exits 1 when outcome is not inline.
   - `handlePack(args)`: parses `--objective`, `--stage`, `--out`; calls
     `generatePack`; prints the manifest path and a next-step hint.
   - Two new `case` entries and two USAGE lines. Nothing else in the file changes.
3. **Tests**
   - New `validators/scripts/test-context-pack-generator.js` (unit: manifest fields,
     relative paths, fail-closed behavior, overwrite refusal).
   - Extend `validators/scripts/test-cli.js`: budget report/json/enforce/ad-hoc cases,
     pack creation + schema validity cases.
   - Add the new test file to the `npm test` chain in `package.json` (additive).
4. **Docs**
   - README command table rows for `budget` and `pack`.
   - CHANGELOG entry with an Upgrade notes section (no action required; new
     commands are opt-in by nature).

## Impacted Files

- `bin/adp.js` (additive: two handlers, two cases, usage text)
- `lib/context-pack-generator.js` (new)
- `validators/scripts/test-context-pack-generator.js` (new)
- `validators/scripts/test-cli.js` (additive test cases)
- `package.json` (test chain entry)
- `README.md`, `CHANGELOG.md` (docs)

## Risks

- Stage estimation without a parsable flow YAML: mitigated by ad-hoc stub mode that
  still counts sessions/packs/handoff inputs and prints a notice.
- Windows path separators leaking into manifests: generator normalizes to forward
  slashes; unit test asserts no backslashes in any manifest path.
- `npm test` chain growth: one additional entry, consistent with existing pattern.

## Verification Plan

- `node validators/scripts/validate-spec.js` before implementation.
- `node validators/scripts/test-context-pack-generator.js` and `npm run test:cli` during implementation.
- Full `npm test` before handoff.
- `gitnexus_detect_changes` before committing (expected scope: bin/adp.js additive symbols, new lib module).

## Artifact Layout

- `specs/020-budget-pack-cli-commands/spec.md`
- `specs/020-budget-pack-cli-commands/plan.md`
- `specs/020-budget-pack-cli-commands/tasks.md`
- `specs/020-budget-pack-cli-commands/checklists/requirements.md`
