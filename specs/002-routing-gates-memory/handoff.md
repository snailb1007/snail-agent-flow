# Memory Handoff Report

- **Feature:** 002-routing-gates-memory
- **Date:** 2026-05-24

## Promoted to project memory
- **Canonical Feature Spec Path**: Enforcement of all feature specs, plans, and checklists residing under `specs/<feature-slug>/` rather than legacy paths.
- **State Separation Protocol**: Separation of active feature identity (`.specify/feature.json`) and mutable run state (`.ai/state/run-state.json`).
- **Gate Status Vocabulary**: Formalized status vocabulary headers (`Status: PASS`, `Status: BLOCKED`, `Status: NEEDS_HUMAN_REVIEW`, and judgment-only `Status: WARN`) with `Blocking Issues` key.
- **Validation Loop Circuit Breaker**: Exiting with a `NEEDS_HUMAN_REVIEW` status and writing a structured human review packet at `.ai/reviews/<feature-slug>/human-review.md` on 3 consecutive validation failures.
- **Memory vs Sessions Separation**: Clear separation between temporary session logs (under `.ai/sessions/`) and long-lived project memory (under `.ai/memory/`).
- **Tool Routing Matrix**: An invariant table mapping phase, task type, tools, inputs, outputs, validators, and exit conditions.

## Architecture updated
- **Active Feature Identification**: Feature directory configured in `.specify/feature.json`.
- **Run State Tracking**: `.ai/state/run-state.json` tracks `feature_slug`, `spec_path`, `current_phase`, `last_gate`, `last_gate_status`, `blocked_reason`, `retry_count`, `retry_scope`, and `verified_artifacts`.
- **Pipeline Validators & Gate Evaluation**:
  - `validators/scripts/validate-spec.js`: Validates presence of Spec-Kit files, checks headers in `spec.md` (`## Goal`/H1, `## Non-Goals`, `## Acceptance Criteria`, `## Test Strategy`, `## Behavior-Preservation Rules`) and `plan.md` (`## Proposed Changes`, `## Verification Plan`), performs placeholder scans, and handles validation loop retries.
  - `.specify/scripts/bash/validate-pipeline-state.sh`: Validates path drift, manages phase state updates, checks gate outputs against vocabulary, runs handoff verification, and registers verified artifacts.
- **Human Review System**:
  - `.specify/templates/human-review-packet-template.md`: Template for generating human review packets under `.ai/reviews/<feature-slug>/human-review.md`.
- **Project Memory Seeding**: Seeded files under `.ai/memory/` with actual Snail Agent Flow protocol facts (`project-summary.md`, `decisions.md`, `current-architecture.md`, `known-risks.md`, and `verification-history.md`).
- **Orchestration Boundaries and Documentation**:
  - `docs/memory-versus-sessions.md`: Documents the memory-sessions boundary.
  - `docs/tool-routing.md`: Documents the tool routing matrix and routing invariants.

## Verification promoted
- **Unit & Integration Test Suite**:
  - `validators/scripts/test-validator.js`: Unit tests for spec validator behavior (happy path, missing files, missing headers, placeholder scans, path drift, retry circuit breaker, resume flag, malformed state JSON).
- **End-to-End Simulation**:
  - `.specify/scripts/bash/simulate-phase2-pipeline.sh`: Fully automates a mock pipeline run through Recon, Critique, Spec, Spec-Validation (failure/circuit-breaker/packet generation/resume/override), and Memory (verify-handoff checks).
- **Deterministic Validation Scripts**:
  - `.specify/scripts/bash/validate-gates-and-memory.sh`: Validates status of both active gate reviews and memory handoffs.
- **Verification Commands**:
  - `npm run validate` executes the spec validator.
  - `npm run test:validator` executes the unit tests for the validator.
  - `npm run test:pipeline` executes the pipeline end-to-end simulation.
