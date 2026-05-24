# Changelog

All notable changes to this project are documented here.

## [0.3.0.0] - 2026-05-24

### Added
- Added greenfield and brownfield fixture projects so users can verify protocol setup on fresh repositories and safe adoption in existing repositories.
- Added CLI integration coverage for fixture initialization, brownfield preservation, post-adoption doctor checks, evaluation rubric validation, and CI workflow matrix structure.
- Added a GitHub Actions CI matrix that runs spec validation, validator tests, pipeline simulation, CLI integration tests, and the full verification suite on pushes and pull requests.
- Added an optional qualitative evaluation rubric template for teams that want structured LLM-as-judge review criteria without adding runtime dependencies.
- Added Phase 6 specification, planning, discussion, UAT, verification, review, and ship decision artifacts for expanded examples, CI, and optional evaluation.

### Changed
- Advanced project state and active feature pointers to mark Phase 6 complete and ready to ship.
- Updated verification memory to record the expanded 12-check CLI suite and CI matrix coverage.

## [0.2.0.0] - 2026-05-24

### Added
- Added the `adp` and `saf` command line tools so users can initialize protocol folders, create session logs, inspect active feature status, run doctor checks, validate specs, and verify memory handoff readiness from one local CLI.
- Added CLI integration tests to `npm test` so validator, pipeline, and command behavior are checked together before release.
- Added a GitHub release workflow that verifies the CLI package, creates an npm tarball, uploads it as a workflow artifact, and attaches it to tagged releases.
- Added Phase 5 specification, planning, discussion, and ship decision artifacts for CLI packaging.

### Changed
- Advanced project state and planning context to Phase 5 CLI packaging.
- Updated the Phase 2 pipeline simulation so it runs through the packaged validator command path.

### Fixed
- Blocked unsafe session names from writing outside `.ai/sessions` when creating new CLI session logs.

## [0.1.0.0] - 2026-05-24

### Added
- Added a deterministic Spec-Kit validator agents can run before implementation to verify active feature pointers, required spec files, required headings, placeholder-free content, and path drift.
- Added validation state tracking so repeated failures update `.ai/state/run-state.json`, halt after three consecutive failures, and generate `.ai/reviews/<feature-slug>/human-review.md` with resume instructions.
- Added `npm run validate`, `npm run test:validator`, `npm run test:pipeline`, and `npm test` so contributors can verify spec validation, retry handling, human review packet generation, and the Phase 2 pipeline simulation locally.
- Added Phase 3 specification, plan, task, UAT, and verification artifacts for deterministic validator drift checks and human review packet behavior.
- Added durable project memory and documentation updates covering active feature state, tool routing, artifact ownership, and memory/session boundaries.

### Changed
- Advanced project state and planning context from Phase 2 routing gates into Phase 3 deterministic validation.
- Aligned PRD, context, and feature pointers with the Phase 2 specification and validation workflow.
- Updated Phase 2 UAT and verification records to capture the pipeline simulation and validation outcomes.

### Fixed
- Added a clear usage error for the pipeline state validator when it is run without a subcommand.
