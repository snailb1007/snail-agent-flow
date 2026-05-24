# Implementation Plan: Phase 1: Artifact Contract, Status, and Minimal Golden Path

**Branch**: `001-artifact-contract-status` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-artifact-contract-status/spec.md`

## Summary

This plan outlines the design and implementation steps for Phase 1 of Snail Agent Flow. The focus is on establishing a unified Spec-Kit root `.specify/` from the legacy `.gemini/.specify/` layout, defining a clear artifact contract and path ownership registry, labeling repository artifacts by implementation status, and providing an end-to-end executable smoke test showing the minimal golden path.

## Technical Context

**Language/Version**: Bash 4.0+, Node.js v25.9.0
**Primary Dependencies**: None (native bash/Node.js)
**Storage**: Local files (JSON/Markdown)
**Testing**: Executable smoke-test shell script
**Target Platform**: macOS (local developer environment)
**Project Type**: Protocol and tooling infrastructure
**Performance Goals**: Smoke test executing in < 5 seconds
**Constraints**: Zero-dependency runner scripts, platform-agnostic file paths

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Authority Order: Handled correctly (Explicit user instructions override local files, which override defaults).
- Non-Negotiables: Understood (No blind rewrites, preserve existing behavior, test-backed implementation).
- Failure Rules: If the smoke test fails, it exits with non-zero exit codes.

## Project Structure

### Documentation & Specs
```text
specs/001-artifact-contract-status/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Task checklist (to-issues source)
```

### Protocol Layout Reconciled
```text
.specify/
├── memory/
│   └── constitution.md  # Unified constitution location
├── templates/           # Cleaned up Spec-Kit templates
│   ├── spec-template.md
│   ├── plan-template.md
│   └── tasks-template.md
├── scripts/
│   └── bash/            # Spec-Kit helper scripts
│       ├── common.sh
│       ├── check-prerequisites.sh
│       ├── setup-plan.sh
│       ├── setup-tasks.sh
│       └── create-new-feature.sh
└── fixtures/
    └── minimal-golden-path/  # Fixtures for the smoke test

.ai/
├── state/
│   └── active-feature.json   # Tracks the currently checked out spec
├── sessions/
│   └── .gitkeep
└── reviews/
    └── .gitkeep

docs/
└── artifact-registry.md      # Canonical registry of all file paths, owners, and statuses
```

## Complexity Tracking

No constitution violations detected.
