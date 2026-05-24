# Feature Specification: Templates and Runtime Adapter Alignment

**Feature Branch**: `004-runtime-adapter-alignment`

**Created**: 2026-05-24

**Status**: Draft

## Goal

To align runtime-specific instructions and templates to the shared protocol contract:
- `.specify/` owns templates/scripts/feature pointer (`.specify/feature.json`)
- `specs/<feature-slug>/` owns canonical `spec.md`/`plan.md`/`tasks.md`
- `.ai/` owns orchestration state, reviews, sessions, memory

This eliminates the redundant `.ai/state/active-feature.json` feature pointer and ensures all adapters (Claude, Gemini, Codex/GSD, etc.) read from the same source of truth.

## Non-Goals

- Implementing a full CLI or visual dashboard.
- Creating competing spec/plan authoring sources.
- Storing active feature pointer information in multiple files.

## Acceptance Criteria

- **AC-1**: Stale/redundant active feature pointer `.ai/state/active-feature.json` is deprecated and deleted.
- **AC-2**: The deterministic validator (`validators/scripts/validate-spec.js`) is updated to only read the active feature from `.specify/feature.json`.
- **AC-3**: The validator detects `.ai/state/active-feature.json` and flags it as a `Path Drift` violation.
- **AC-4**: Pipeline bash scripts (`validate-pipeline-state.sh`, `validate-gates-and-memory.sh`, `smoke-test.sh`) are updated to use `.specify/feature.json` instead of `.ai/state/active-feature.json`.
- **AC-5**: Runtime instruction documents (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) and the repository constitution (`.ai/constitution.md`) are updated to document the boundary rules clearly.

## Test Strategy

- **TS-1**: Run `npm run test:validator` to verify that the JS spec validator test suite passes successfully.
- **TS-2**: Run `npm run test:pipeline` to verify the pipeline simulation executes without errors.
- **TS-3**: Run the deterministic validator against the new `specs/004-runtime-adapter-alignment` directory to verify it passes.

## Behavior-Preservation Rules

- Keep all existing checklist, placeholder scan, and retry loop behavior in `validate-spec.js` intact.
- Maintain compatibility with the `validate-pipeline-state.sh` gate verification subcommands.
