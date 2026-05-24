# Changelog

All notable changes to this project are documented here.

## [0.1.0.0] - 2026-05-24

### Added
- Added a deterministic Spec-Kit validator that agents can run before implementation to verify active feature pointers, required spec files, required headings, placeholder-free content, and path drift.
- Added validation state tracking so repeated failures update `.ai/state/run-state.json`, halt after three consecutive failures, and generate a human review packet with resume instructions.
- Added validator and pipeline test commands so contributors can verify spec validation, retry handling, human review packet generation, and the Phase 2 pipeline simulation locally.
- Added Phase 3 specification, plan, task, UAT, and verification artifacts for deterministic validator drift checks and human review packet behavior.
- Added durable project memory and documentation updates covering active feature state, tool routing, artifact ownership, and memory/session boundaries.

### Changed
- Advanced project state and planning context from Phase 2 routing gates into Phase 3 deterministic validation.
- Aligned PRD, context, and feature pointers with the Phase 2 specification and validation workflow.
- Updated Phase 2 UAT and verification records to capture the pipeline simulation and validation outcomes.

### Fixed
- Added a clear usage error for the pipeline state validator when it is run without a subcommand.
