# Phase 18: Pure Task Scoring & Profile Selection Module

## Goal

Implement the pure scoring logic that evaluates task risk based on five dimensions (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk) to output `FAST`, `STANDARD`, or `FULL` profile recommendations, with overrides for `BUGFIX` and `PROTOTYPE`.

## Non-Goals

- Implement filesystem persistence of task scores.
- Integrate scoring directly into the execution flow (this will be done in Phase 23).

## Acceptance Criteria

1. `lib/profile-scorer.js` exports a single pure function `score(task)`.
2. Validates inputs for the 5 risk dimensions: `novelty`, `blast_radius`, `ambiguity`, `reversibility`, and `user_biz_risk`.
   - Each must be an integer: `0`, `1`, or `2`.
   - Any invalid value (negative, > 2, non-integer, missing, or non-numeric) throws a clear error naming the offending dimension. No silent coercion.
3. Computes `total` as the sum of all 5 dimensions.
4. Determines profile based on `total`:
   - `0` to `2`: `FAST`
   - `3` to `5`: `STANDARD`
   - `6` or more: `FULL`
5. Supports `override: "BUGFIX" | "PROTOTYPE"`.
   - If set, the override profile takes precedence (e.g. returns `BUGFIX` or `PROTOTYPE` as the profile), while still reporting the computed `total` score.
6. The CLI `adp score <task.json>` loads a JSON file, evaluates the task via `score()`, and prints the JSON result to stdout.
7. Test coverage:
   - Table-driven unit tests covering totals `0`, `2`, `3`, `5`, `6`, `10`.
   - Boundary tests at transitions.
   - Override precedence.
   - Invalid input validation (throws on invalid inputs).

## Behavior-Preservation Rules

- Preserve existing behavior unless the feature request explicitly changes it.
- Keep changes scoped to the accepted feature packet.
- Run relevant verification before marking tasks complete.

## Test Strategy

- Dedicated unit tests in `validators/scripts/test-profile-scorer.js`.
- Integration check: test the `adp score` CLI subcommand.
- Ensure all tests pass under `npm test`.
