# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- Added `saf hooks` management commands (`install`, `uninstall`, `status`) to manage lifecycle hooks in `.claude/settings.json`, and Node-based cross-platform lifecycle hook scripts (`saf-session-start.cjs`, `saf-pre-write.cjs`, `saf-stop.cjs`).
- Added read-only `saf lease --check` flag to inspect if a file is leased without mutating state, returning exit code 3 if leased by another active owner.
- Added git-based `saf snapshot` and `saf restore` checkpoints for Stage A (Act) non-destructive stashes and hard rollbacks.
- Added `saf profile -- <cmd...>` execution profiler measuring time, stdout/stderr byte size, and exit code.
- Added `saf budget --profile` flag to display execution performance statistics (p50/p95 latency and output size) from `profile.jsonl`.
- Added `saf bypass` command to temporarily bypass secondary gates (diff-hygiene, budget limits, lease checks) with TTL and audit logging.
- Added feature-scoped context budgeting (`022`): `estimateBudget` and `saf compact-memory` can scope `.ai/sessions/` and `.ai/context-packs/` to the active feature (via the `**Feature:**` marker that `new-session` writes, and `compact-<slug>.json` pack names) instead of summing every historical feature. Controlled by new optional `budget_inputs.session_scope` / `budget_inputs.context_pack_scope` keys (`"all"` | `"active_feature"`); fresh `saf init` opts new projects into `"active_feature"`, existing policy files keep `"all"` until set.
- Added handoff integrity verification (`022`): `saf handoff` now rejects an unedited compaction scaffold (the seed marker means it was never authored — always on), and a new opt-in `--strict` mode (or `handoff.strict` policy key) additionally requires authored section bodies and a cross-reference to a real, non-empty `.ai/memory/*` file. Checks remain deterministic and offline.
- Added typed memory files (`022`): `saf init` now seeds `.ai/memory/patterns.md` and `.ai/memory/gotchas.md` (non-overwriting) alongside the existing five files, which keep their format.
- Added opt-in session-log archival (`022`): `saf compact-memory --archive` (or `memory.archive_on_compact`) moves the active feature's compacted logs into `.ai/sessions/archive/<slug>/` (moved, never deleted) so the active scan surface stays bounded.
- Added two non-blocking doctor advisories (`022`): `memory.budgetScope.recommended` (policy lacks feature-scoping) and `memory.sessions.archivable` (logs of already-compacted features linger in `.ai/sessions/`).
- Added the packaged `saf-upgrade` skill: a thin, version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts; all mechanics run through the idempotent CLI). Copied into `.claude/skills/` and `.agents/skills/` by `saf init` like the ATLAS skills.
- Added a localized-skills version stamp (`.ai/state/skills-version.json`), written by `saf init` only after a full fresh skill localization, and a new non-blocking `skills.version.current` doctor check that warns when the installed package version differs from the version that localized the on-disk skills (init is no-overwrite, so skills never refresh silently).
- Added `saf budget`: on-demand context byte-pressure report with `--stage`, `--json`, and opt-in `--enforce` gating (feature `020-budget-pack-cli-commands`).
- Added `saf pack`: fail-closed context-pack manifest generator writing schema-valid packs to `.ai/context-packs/` (`lib/context-pack-generator.js`).
- Added `docs/compatibility-policy.md` (binding backward-compatibility contract with a per-improvement matrix) and `docs/migration.md` (upgrade guide for target projects on older SAF versions).
- Added the packaged `atlas-auto-loop` skill as the entry point for autonomous ATLAS Loop guidance.
- Added a package inventory regression test (`validators/scripts/test-package-inventory.js`) to assert required ATLAS assets are correctly packed and that forbidden workspace directories (like `.planning/`, `.ai/state/`, and `.git/`) are excluded.
- Added a target project bootstrap smoke test (`validators/scripts/test-target-project-bootstrap.js`) to verify that the packaged tarball successfully initializes a fresh target project (scaffolds directories, creates config/flow files, copies ATLAS skills/contracts, and successfully passes `doctor` checks).
- Documented the packaged ATLAS bootstrap path and added a release verification checklist to `docs/installation.md`.

### Upgrade notes
- Hooks are strictly opt-in and are installed only by running `saf hooks install --apply`.
- Checkpoint snapshot and restore are git-stash-based and do not affect the working tree unless `--hard` and `--yes` are specified.
- The `bypass` command is opt-in and secondary gates (like `diff-hygiene`, `budget --enforce`, and `lease --check`) only honor active bypass entries during their TTL.
- Feature-scoped budgeting (`022`) is opt-in for existing projects: policy files without `budget_inputs.session_scope` keep today's `"all"` behavior byte-for-byte. A non-blocking `memory.budgetScope.recommended` doctor warning suggests the switch; the estimate only ever shrinks, so no gate tightens. Fresh `saf init` writes `"active_feature"` for new projects.
- `saf handoff` now rejects an unedited compaction scaffold (the seed marker indicates it was never authored). This is a bugfix to a false-positive — author `.ai/state/handoff.md` (fill the three sections, remove the seed comment) before the gate passes. The stricter section/cross-reference checks remain opt-in behind `--strict` / `handoff.strict`. Exit codes are unchanged (`0` pass, `1` fail).
- Typed memory files (`patterns.md`, `gotchas.md`) appear on the next `saf init`; the existing five memory files are untouched. Session-log archival is opt-in (`--archive` / `memory.archive_on_compact`) and only moves logs, never deletes them.
- No action required for existing target projects. `budget` and `pack` are new, report-only commands; nothing changes until you call them, and `--enforce` is strictly opt-in. Existing commands, exit codes, schemas, and artifact paths are unchanged.
- Existing target projects will see a new non-blocking `skills.version.current` doctor warning until they refresh their localized skills (remove the SAF-owned skill folders and re-run `saf init`); the warning text contains the exact steps. Doctor exit codes are unchanged.
- `saf doctor` and `saf init` now print non-blocking warnings even when all required checks pass (previously warnings were hidden on success). The leading `Static sanity checks PASSED.` line is unchanged, so existing log parsers keep working.

### Changed
- Changed generated agent docs to use one `atlas-auto-loop` pointer section and deduplicate old ATLAS Loop sections during `saf init`.
- Changed `formatTerminal` to list warnings after a passing report instead of suppressing them, aligning doctor output with the migration guide's promise that warnings list every pending migration.

## [0.4.0.0] - 2026-05-26

### Added
- Added dynamic GSD skill localization during `adp init` that copies global skill configurations, workflows, and templates into the workspace to support sandboxed AI agent execution.
- Added path rewriting logic to convert global paths in localized skill markdown files into workspace-relative paths.
- Added strict sanity checks to `adp init` and `adp doctor` that detect missing required directories, invalid flow definitions, corrupted JSON ledgers, missing prerequisites, or global path leaks.
- Added automatic repair guide generation (`.ai/state/repair-guide.md`) when initialization or doctor checks fail, providing clear, copy-pasteable instructions to resolve issues.
- Added parallel execution and subagent guidelines to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` to instruct agents on splitting checklists into concurrent subagent tasks.
- Added 20 unit tests for `init-checks` and expanded CLI integration tests to verify skill localization, path rewriting, guideline appending, and brownfield preservation.

### Changed
- Advanced project state, roadmap, and active feature pointers to mark Phase 15 complete.
- Extended the prerequisite tool database with detailed installation commands, detection hints, and purposes for `gsd`, `superpowers`, `spec-kit`, and `gstack`.

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
