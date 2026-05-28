# Feature Specification: ATLAS Loop Refactor (Phase 19)

## Goal

Consolidate the legacy 10-stage GSD flow into a risk-adaptive 5-stage ATLAS Loop (Align, Trace, Lay, Act, Settle) with 4 custom skills.

## Non-Goals

- Completely rewriting legacy skills (only wrapping/adapting them).
- Changing the existing `.planning/phases/` directory format.
- Migrate active GSD tasks (let them drain naturally).
- Building a complex observability bus in the initial slice.

## Acceptance Criteria

1. Flow engine supports the 5-stage ATLAS Loop:
   - **Align**: Resolve problem statement, anti-goals, test strategy, and DoR.
   - **Trace**: Identify affected code symbols, dependencies, and blast radius.
   - **Lay**: Generate plan, architecture, verification plan, and tasks.
   - **Act**: Execute implementation and run test suite.
   - **Settle**: Perform verification, PR creation, and release handoff.
2. Custom skills registered under `.claude/skills/`:
   - `atlas-routing`: Core routing rules between stages.
   - `atlas-gates`: Gate check enforcement (DoR/DoD).
   - `atlas-settle`: Handoff and close-out tasks.
   - `atlas-review`: Plan critique and code review.
3. Flow engine uses `flow-state.json` (schema v2.0) for state recording.
4. Workspace Drift Validator checks path ownership and boundaries.

## Test Strategy

- **Unit Tests**: Score functions, stage resolver, active features.
- **Integration Tests**: CLI engine support for flow state v2 and validators.
- **E2E Tests**: Simulating full loop A->T->L->A->S.

## Behavior-Preservation Rules

- Keep backward compatibility for CLI commands.
- Do not affect active/legacy flows if they are running.
