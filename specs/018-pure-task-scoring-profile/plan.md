# Implementation Plan: Pure Task Scoring & Profile Selection

**Branch**: `gsd/phase-18-pure-task-scoring-profile` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

### Core Foundation

#### [NEW] [profile-scorer.js](file:///Volumes/D/snail-agent-flow/lib/profile-scorer.js)
- Implement `score(task)`:
  - Input: `task` object.
  - Dimension keys: `novelty`, `blast_radius`, `ambiguity`, `reversibility`, `user_biz_risk`.
  - Validate each key is present and is an integer in `[0, 1, 2]`. If invalid, throw `Error` containing the exact key name.
  - Compute `total = novelty + blast_radius + ambiguity + reversibility + user_biz_risk`.
  - Set `profile`:
    - If `total <= 2`: `FAST`
    - If `total <= 5`: `STANDARD`
    - Else: `FULL`
  - Override logic: if `task.override === "BUGFIX"` or `task.override === "PROTOTYPE"`, set `profile` to `task.override`. If any other override is provided, throw an error or reject it? Wait, let's look at the spec: "reject unknown profile names" / "overrides for BUGFIX and PROTOTYPE".
  - Return `{ total, profile, dimensions: { novelty, blast_radius, ambiguity, reversibility, user_biz_risk } }`.

### CLI Integration

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
- Add `score` subcommand:
  - Usage: `adp score <task.json>`
  - Read `<task.json>` file using `fs.readFileSync`.
  - Parse as JSON.
  - Call `score(task)`.
  - Format output as pretty JSON and print to `process.stdout`.

### Verification

#### [NEW] [test-profile-scorer.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-profile-scorer.js)
- Implement table-driven tests for all combinations of dimensions, overrides, boundaries, and errors.

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)
- Add `node validators/scripts/test-profile-scorer.js` to `npm test`.

## Verification Plan

### Automated Tests
- Run `node validators/scripts/test-profile-scorer.js` to verify scorer behavior.
- Run `npm test` to ensure all tests pass.

### Manual Verification
- Create a test JSON file (e.g. `scratch/test-task.json`) and run `node bin/adp.js score scratch/test-task.json`.
