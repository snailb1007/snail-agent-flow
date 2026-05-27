# Memory Handoff Report

- **Feature:** 003-deterministic-validator
- **Date:** 2026-05-24

## Promoted to project memory
- Introduced a deterministic spec validator that verifies file existence, headings completeness, and checklist layouts for spec files (`spec.md`, `plan.md`, `tasks.md`) without relying on LLM-as-judge evaluations.
- Implemented Path Drift prevention rules that scan recursively for markdown files in legacy folders (`.specify/specs/`, `specs/current/`, `.ai/specs/`) and block competing files in the root or `.specify/` directories.
- Decoupled active feature identity (stored in `.specify/feature.json`) from mutable pipeline execution state (stored in `.ai/state/run-state.json`).
- Added a Circuit Breaker retry loop that halts pipeline execution with exit code 10 and generates a structured Human Review Packet at `.ai/reviews/<feature-slug>/human-review.md` on the 3rd consecutive validation failure.
- Provided a `resume` CLI option to programmatically reset retry counters and failures to 0 and transition the run state status back to `RESUMED`.

## Architecture updated
- **Added core validator script**: `validators/scripts/validate-spec.js` to implement feature path resolution, path drift scanning, placeholder detection, headings checks, and run state/human review management.
- **Added template file**: `.specify/templates/human-review-packet-template.md` as the blueprint for human review packets.
- **Added state tracking script**: `.specify/scripts/bash/validate-pipeline-state.sh` to handle subcommands for state init, phase updates, gate checks, and verified artifact registration.
- **Documented Architecture Decisions**:
  - `docs/adr/0001-separate-active-feature-and-run-state.md`
  - `docs/adr/0002-deterministic-spec-validator.md`
- **Created Spec-Kit feature artifacts**:
  - `specs/003-deterministic-validator/spec.md`
  - `specs/003-deterministic-validator/plan.md`
  - `specs/003-deterministic-validator/tasks.md`

## Verification promoted
- **Added automated test runner**: `validators/scripts/test-validator.js` to mock sandboxed spec configurations (including missing headings, placeholders, path drift, malformed JSON, and retry exhaustion) and verify validator behaviors and exit codes.
- **Added pipeline simulation**: `.specify/scripts/bash/simulate-phase2-pipeline.sh` to simulate and verify phase transition gates, retry exhaustion, and handoff report validations in an isolated sandbox.
- **Promoted validation commands**:
  - Run validator on active feature spec: `node validators/scripts/validate-spec.js`
  - Run full validator test suite: `node validators/scripts/test-validator.js`
  - Run end-to-end pipeline simulation: `./.specify/scripts/bash/simulate-phase2-pipeline.sh`
