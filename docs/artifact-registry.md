# Artifact Registry & Path Ownership

This document defines the canonical artifact contract, path ownership model, and implementation status for all directories and key files in the Snail Agent Flow protocol.

## Multi-Category Path Matrix

| Path | Owner Tool / Role | Category | Status | Description |
|---|---|---|---|---|
| `.specify/` | Spec-Kit | Authoritative | `implemented` | Spec-Kit root containing presets, templates, and scripts. |
| `.specify/feature.json` | Spec-Kit | Authoritative | `implemented` | Pinned Spec-Kit feature directory state pointer. |
| `.specify/scripts/bash/validate-pipeline-state.sh` | Spec-Kit / Protocol | Authoritative | `implemented` | Shell validator for pipeline state, gate reports, path drift, handoff reports, and verified artifact registration. |
| `.specify/scripts/bash/simulate-phase2-pipeline.sh` | Spec-Kit / Protocol | Authoritative | `implemented` | End-to-end Phase 2 simulation covering gate validation, retry halt behavior, resume, artifact verification, and memory handoff checks. |
| `.specify/templates/human-review-packet-template.md` | Spec-Kit / Protocol | Authoritative | `implemented` | Template used when repeated validation failures require a human review packet. |
| `specs/<feature-slug>/` | Spec-Kit / User | Authoritative | `specified` | Canonical feature source of truth containing spec.md, plan.md, and tasks.md, owned by Spec-Kit and consumed by GSD. |
| `validators/scripts/validate-spec.js` | Protocol / Validator | Authoritative | `implemented` | Deterministic Node.js validator for active feature pointers, Spec-Kit file structure, required headings, path drift, placeholders, retry state, and human review packet generation. |
| `validators/scripts/test-validator.js` | Protocol / Validator | Authoritative | `implemented` | Local validator test suite covering pass, failure, retry, resume, and generated review packet behavior. |
| `validators/scripts/test-cli.js` | Protocol / Validator | Authoritative | `implemented` | CLI integration test suite covering command routing, initialization, session creation, status, doctor, validate-spec, and handoff behavior. |
| `bin/adp.js` | Node.js Tooling | Authoritative | `implemented` | Zero-dependency CLI registered as `adp` and `saf` for protocol initialization, status, validation, session logging, doctor checks, and memory handoff validation. |
| `package.json` | Node.js Tooling | Authoritative | `implemented` | Defines package metadata, the `adp`/`saf` binary mappings, `npm run validate`, `npm run test:validator`, `npm run test:pipeline`, `npm run test:cli`, and `npm test`. |
| `.github/workflows/release.yml` | GitHub Actions | Authoritative | `implemented` | Release workflow that runs the full validation suite, packs the CLI tarball, uploads the artifact, and attaches it to tagged releases. |
| `docs/` | Protocol / Human | Authoritative | `implemented` | Project documentation and artifact registries. |
| `docs/artifact-registry.md` | Protocol / Human | Authoritative | `implemented` | Registry of paths, owners, and statuses. |
| `docs/superpowers/specs/` | Superpowers / Human | Authoritative | `implemented` | Legacy/existing project specification documents. |
| `docs/superpowers/plans/` | Superpowers / Human | Authoritative | `implemented` | Legacy/existing project implementation plans. |
| `.gemini/` | Gemini CLI | Runtime-Specific | `implemented` | Runtime adapter command configuration. |
| `.gemini/commands/` | Gemini CLI / Adapter | Runtime-Specific | `implemented` | Gemini-specific tool wrapper commands. |
| `.claude/` | Claude CLI | Runtime-Specific | `implemented` | Runtime settings and git hooks specific to Claude. |
| `.claude/settings.json` | Claude CLI | Runtime-Specific | `implemented` | Settings for the Claude CLI agent. |
| `.claude/hooks/` | Claude CLI Hooks | Runtime-Specific | `implemented` | Git/session hooks executed by Claude. |
| `.gsd/` | GSD Planner | Runtime-Specific | `implemented` | GSD local database, preferences, and milestones state. |
| `.serena/` | Serena MCP | Runtime-Specific | `implemented` | Local cache, memories, and configurations for Serena. |
| `.ai/constitution.md` | Protocol / Human | Authoritative | `implemented` | Repository operating rules and failure-mode policies. |
| `.ai/memory/` | Protocol / Human | Authoritative | `placeholder` | Durable project memory including architecture, decisions, and risks. |
| `.ai/pipeline.md` | Protocol / Human | Authoritative | `placeholder` | Local pipeline notes and configuration overrides. |
| `.planning/PROJECT.md` | GSD Planner / Human | Authoritative | `implemented` | Active project state, guidelines, and context definition. |
| `.planning/ROADMAP.md` | GSD Planner | Authoritative | `implemented` | Project milestones, feature phases, and development sequencing. |
| `.ai/sessions/` | Coding Agents | Local-Only | `implemented` | Temporary execution notes and scratchpads. |
| `.ai/reviews/<feature-slug>/` | Critique Agents | Local-Only | `implemented` | Reviews, validation reports, and decisions. |
| `.ai/state/` | Orchestrator | Local-Only | `implemented` | Directory storing current execution state. |
| `.agents/` | Agent Skills | Authoritative | `implemented` | Houses agent capabilities and superpower skills. |
| `.bg-shell/` | Shell Runtime | Local-Only | `implemented` | Background command shell logs and process manifests. |
| `README.md` | Protocol / Human | Authoritative | `implemented` | Entry-point documentation for CLI usage, verification commands, project structure, and documentation links. |
| `CLAUDE.md` | Claude CLI | Authoritative | `implemented` | Developer guide, build/test commands, local CLI commands, and CLI constraints. |
| `GEMINI.md` | Gemini CLI | Authoritative | `implemented` | Gemini-specific adapter command details and guidelines. |
| `AGENTS.md` | Protocol / Human | Authoritative | `generated-scaffold` | High-level agent team documentation and directives. |
| `CONTEXT.md` | Protocol / Human | Authoritative | `implemented` | Defines feature spec source of truth and state pointers. |
| `.gitignore` | Git | Authoritative | `implemented` | Workspace path exclusion settings. |

## Implementation Status Taxonomy

- **implemented**: Fully active and verified in the repository.
- **specified**: Structure defined, templates ready, but active instances depend on feature work.
- **placeholder**: Exists as an empty file or dummy context to reserve the path.
- **generated-scaffold**: Scaffolding created by tools/CLIs, not yet customized or validated.
- **deferred**: Documented in the roadmap but not yet created in the workspace.

## Directory Layout Status Table

| Directory | Primary Owner | Status | Notes |
|---|---|---|---|
| `.specify/` | Spec-Kit | `implemented` | Unified root for all Spec-Kit templates, presets, and scripts. |
| `specs/` | Spec-Kit | `implemented` | Directory containing active feature requirements, plans, and tasks. |
| `validators/` | Protocol / Validator | `implemented` | Node.js deterministic validator and local validator test suite. |
| `bin/` | Node.js Tooling | `implemented` | Local CLI entry points for protocol operations. |
| `.ai/` | Orchestration | `implemented` | Contains constitution, memory, reviews, sessions, and state. |
| `.ai/memory/` | Protocol / Human | `placeholder` | Durable project memory including architecture, decisions, and risks. |
| `.ai/state/` | Orchestrator | `implemented` | Directory storing current orchestration state (run-state.json). |
| `.planning/` | GSD Planner | `implemented` | Roadmaps, project state, phase manifests, and codebase maps. |
| `.agents/` | Agent Skills | `implemented` | Houses agent capabilities and superpower skills. |
| `.bg-shell/` | Shell Runtime | `implemented` | Background command shell logs and process manifests. |
| `.claude/` | Claude CLI | `implemented` | Runtime settings and git hooks specific to Claude. |
| `.gemini/` | Gemini CLI | `implemented` | Runtime adapter command configuration. |
| `.gsd/` | GSD Planner | `implemented` | GSD local database, preferences, and milestones state. |
| `.serena/` | Serena MCP | `implemented` | Local cache, memories, and configurations for Serena. |
| `docs/` | Protocol / Human | `implemented` | Project documentation and artifact registries. |

## Path & Tool Ownership Invariants

- **Spec-Kit Stack Ownership**: Spec-Kit owns `specs/<feature-slug>/` containing `spec.md`, `plan.md`, and `tasks.md`. It acts as the canonical feature specification and task source of truth.
- **GSD Execution Layer**: GSD reads and consumes the canonical `specs/<feature-slug>/tasks.md` and other Spec-Kit files for code execution. It must not generate or maintain parallel specs or plans in this pipeline.
- **Deterministic Validation Gate**: `validators/scripts/validate-spec.js` is the pre-implementation gate for active feature pointer validity, required Spec-Kit files, heading structure, path drift, placeholders, retry state, and human review packet generation.
- **GStack / Matt Critique Gates**: All critique gates are owned by GStack review tools (e.g., product, architecture, QA, release readiness).
- **GitHub Issues**: GitHub issues are strict projections of tasks in `tasks.md` (e.g., using `speckit-taskstoissues`) and must not act as a separate/divergent source of truth.
