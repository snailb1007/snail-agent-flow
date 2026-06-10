# Tasks: Budget and Pack CLI Commands

**Prerequisites**: plan.md and spec.md

## Specification Review

- [x] T001 Review generated spec for scope and acceptance criteria.
- [x] T002 Refine plan with impacted files, risks, and verification commands (compat matrix row copied into plan.md).

## Implementation

- [x] T003 Implement `lib/context-pack-generator.js` with `buildPackManifest` and fail-closed `generatePack`.
- [x] T004 [P] Implement unit tests in `validators/scripts/test-context-pack-generator.js`.
- [x] T005 Implement `handleBudget(args)` in `bin/adp.js` (report, `--stage`, `--json`, `--enforce`, ad-hoc fallback) and wire `budget` into the dispatcher and USAGE.
- [x] T006 Implement `handlePack(args)` in `bin/adp.js` (`--objective`, `--stage`, `--out`) and wire `pack` into the dispatcher and USAGE.
- [x] T007 Add CLI integration tests for `budget` and `pack` in `validators/scripts/test-cli.js`.
- [x] T008 Add `test-context-pack-generator.js` to the `npm test` chain in `package.json`.

## Verification And Handoff

- [x] T009 Run deterministic spec validation: `node validators/scripts/validate-spec.js`.
- [x] T010 Run `npm test` full suite.
- [x] T011 Update README.md command table and CHANGELOG.md with an Upgrade notes section.
- [x] T012 Run `gitnexus_detect_changes` review, then commit.
