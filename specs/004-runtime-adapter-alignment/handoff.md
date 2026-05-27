# Memory Handoff Report

- **Feature:** 004-runtime-adapter-alignment
- **Date:** 2026-05-24

## Promoted to project memory
- **Unified Feature Pointer**: Defined `.specify/feature.json` as the single source of truth for the active feature, specifying it via the `"feature_directory"` key.
- **Path Ownership & Folder Boundaries**:
  - `.specify/` owns presets, templates, validation scripts, and the active feature pointer.
  - `specs/<feature-slug>/` owns canonical Spec-Kit files (`spec.md`, `plan.md`, `tasks.md`).
  - `.ai/` owns mutable orchestration state (`run-state.json`), review logs, QA results, sessions, and durable project memory.
- **Drift Prevention Protocol**: Mandated that the validator checks for the existence of legacy files (like the deprecated `.ai/state/active-feature.json`) to catch path drift early and block validation.

## Architecture updated
- **Feature Pointer Cleanup**: Removed the deprecated active feature pointer `.ai/state/active-feature.json`.
- **Validation Engine (`validators/scripts/validate-spec.js`)**: Updated to only read active feature information from `.specify/feature.json`. Added logic to detect the existence of `.ai/state/active-feature.json` and flag it as a `Path Drift` violation.
- **Bash Validation Scripts**:
  - `.specify/scripts/bash/validate-pipeline-state.sh`: Updated to parse `.specify/feature.json` instead of `.ai/state/active-feature.json` and check for path drift.
  - `.specify/scripts/bash/validate-gates-and-memory.sh`: Updated to parse `.specify/feature.json` for validation.
  - `.specify/scripts/bash/smoke-test.sh`: Updated to point mock config to the new `.specify/fixtures/minimal-golden-path/feature.json`.
- **Instructional Manuals**:
  - Added "Path Ownership & Folder Boundaries" sections in `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.
  - Updated `.ai/constitution.md` to reflect the new feature pointer file location.
- **Documentation**:
  - Updated `docs/artifact-registry.md` to deprecate `.ai/state/active-feature.json` and specify that `.ai/state/` stores `run-state.json`.

## Verification promoted
- **Spec-Kit Validator Tests (`validators/scripts/test-validator.js`)**: Replaced the legacy active feature fallback tests with "Active Feature Stale Pointer Drift" tests to ensure path drift is successfully flagged when legacy files exist.
- **Verification Commands**: Run `npm test` to verify unit and pipeline simulation coverage (validates JS spec validator suite and bash state validator scripts).
