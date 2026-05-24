# Artifact Registry & Path Ownership

This document defines the canonical artifact contract, path ownership model, and implementation status for all directories and key files in the Snail Agent Flow protocol.

## Multi-Category Path Matrix

| Path | Owner Tool / Role | Category | Status | Description |
|---|---|---|---|---|
| `.specify/` | Spec-Kit / OpenSpec | Authoritative | `implemented` | Spec-Kit root containing presets, templates, and scripts. |
| `.specify/feature.json` | Spec-Kit | Authoritative | `implemented` | Pinned Spec-Kit feature directory state pointer. |
| `specs/<feature-slug>/` | Spec-Kit / User | Authoritative | `specified` | Active requirements, implementation plans, and tasks. |
| `docs/` | Protocol / Human | Authoritative | `implemented` | Project documentation and artifact registries. |
| `docs/artifact-registry.md` | Protocol / Human | Authoritative | `implemented` | Registry of paths, owners, and statuses. |
| `docs/superpowers/specs/` | Superpowers / Human | Authoritative | `implemented` | Legacy/existing project specification documents. |
| `docs/superpowers/plans/` | Superpowers / Human | Authoritative | `implemented` | Legacy/existing project implementation plans. |
| `.ai/state/active-feature.json` | Orchestrator | Generated | `deferred` | JSON state pointer identifying the active feature. |
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
| `.ai/state/` | Orchestrator | Local-Only | `deferred` | Directory storing current execution state. |
| `.agents/` | Agent Skills | Authoritative | `implemented` | Houses agent capabilities and superpower skills. |
| `.bg-shell/` | Shell Runtime | Local-Only | `implemented` | Background command shell logs and process manifests. |
| `CLAUDE.md` | Claude CLI | Authoritative | `implemented` | Developer guide, build/test commands, and CLI constraints. |
| `GEMINI.md` | Gemini CLI | Authoritative | `implemented` | Gemini-specific adapter command details and guidelines. |
| `AGENTS.md` | Protocol / Human | Authoritative | `implemented` | High-level agent team documentation and directives. |
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
| `.ai/` | Orchestration | `implemented` | Contains constitution, memory, reviews, sessions, and state. |
| `.ai/memory/` | Protocol / Human | `placeholder` | Durable project memory including architecture, decisions, and risks. |
| `.ai/state/` | Orchestrator | `deferred` | Directory storing current active-feature state. |
| `.planning/` | GSD Planner | `implemented` | Roadmaps, project state, phase manifests, and codebase maps. |
| `.agents/` | Agent Skills | `implemented` | Houses agent capabilities and superpower skills. |
| `.bg-shell/` | Shell Runtime | `implemented` | Background command shell logs and process manifests. |
| `.claude/` | Claude CLI | `implemented` | Runtime settings and git hooks specific to Claude. |
| `.gemini/` | Gemini CLI | `implemented` | Runtime adapter command configuration. |
| `.gsd/` | GSD Planner | `implemented` | GSD local database, preferences, and milestones state. |
| `.serena/` | Serena MCP | `implemented` | Local cache, memories, and configurations for Serena. |
| `docs/` | Protocol / Human | `implemented` | Project documentation and artifact registries. |

