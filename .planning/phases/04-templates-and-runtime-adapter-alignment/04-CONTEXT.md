---
phase: "04"
name: "templates-and-runtime-adapter-alignment"
created: 2026-05-24
---

# Phase 4: templates-and-runtime-adapter-alignment — Context

## Goal
Align runtime-specific instructions, scripts, and templates to the shared protocol contract, ensuring that `.specify/` owns templates/scripts/pointer, `specs/<feature-slug>/` owns the canonical spec files, and `.ai/` owns the orchestration state, memory, reviews, and sessions.

## Decisions

### 1. Authoritative Feature Pointer
- **D-29:** **Authoritative Feature Pointer Location**: `.specify/feature.json` is the sole authoritative active feature pointer.
- **D-30:** **Deprecated Redundant state**: `.ai/state/active-feature.json` is deprecated and deleted. If present, the validator will flag it as a `Path Drift` violation.
- **D-31:** **Script Adaptation**: `.specify/scripts/bash/validate-pipeline-state.sh`, `.specify/scripts/bash/validate-gates-and-memory.sh`, and `.specify/scripts/bash/smoke-test.sh` must parse `feature_directory` from `.specify/feature.json` and derive `feature_slug` as the basename.

### 2. Runtime Instructions Alignment
- **D-32:** **Boundary Alignment**: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and `.ai/constitution.md` must be aligned to the path ownership model.
- **D-33:** **State vs Specs separation**: Runtime adapters must read specs exclusively from `specs/<feature-slug>/` and output run state, review logs, and memory exclusively under `.ai/`.

## Discretion Areas
- None. All adapters must conform to the directory boundaries.

## Deferred Ideas
- None.
