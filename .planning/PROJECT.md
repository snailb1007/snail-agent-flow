# Snail Agent Flow

## What This Is

Snail Agent Flow is a lightweight operating protocol for AI coding agents. It coordinates Superpowers, GStack, GSD, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, and Playwright into a repeatable spec-to-ship workflow for new and existing projects.

The repository is currently documentation-first: it defines the protocol, durable artifact layout, agent instructions, and validation gates, but it does not yet contain an application runtime or CLI implementation.

## Core Value

Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## Requirements

### Validated

- [x] Repository-level agent instructions exist for Claude and Gemini through `CLAUDE.md` and `GEMINI.md`.
- [x] The core pipeline is documented in `docs/prd.md`, including recon, planning critique, spec generation, validation, execution, QA, memory handoff, and ship gates.
- [x] Durable AI state folders exist under `.ai/` for constitution, recon, specs, sessions, memory, and review artifacts.
- [x] Spec-Kit/Gemini command scaffolding exists under `.gemini/commands/` and `.gemini/.specify/`.
- [x] Local agent skill scaffolding exists under `.agents/skills/`.
- [x] The current codebase map exists under `.planning/codebase/`.

### Active

- [ ] Define the canonical artifact contract for `.ai/`, `.planning/`, Spec-Kit, GSD, and runtime-specific instruction files.
- [ ] Normalize routing rules so agents know when to use recon, critique, spec generation, codebase mapping, execution, verification, and memory handoff.
- [ ] Resolve path ownership between `.ai/specs/`, `.gemini/.specify/`, and any future root `.specify/` or CLI-managed feature directories.
- [ ] Add validation gates that can detect stale specs, broken artifact references, missing verification, and repeated self-repair loops.
- [ ] Turn the documented protocol into usable templates, scripts, or CLI entry points without replacing the underlying tools.
- [ ] Add a first automated verification layer for docs, scripts, artifact paths, and workflow invariants.

### Out of Scope

- Replacing GSD, GStack, Superpowers, Spec-Kit, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright - this project orchestrates them rather than reimplementing them.
- Building a full IDE or hosted agent platform - the near-term value is a local protocol and artifact system.
- Adding an end-user authentication, database, billing, or deployment stack before a runtime product surface exists.
- Broad rewrites of generated Spec-Kit or local skill scaffolds without a narrow compatibility reason.

## Context

The motivating problem is tool-order confusion in modern AI coding workflows. The repo should help agents and users decide what happens first, which artifacts are source of truth, when specs are required, when codebase mapping is required, when self-repair must stop, and how project memory survives across sessions.

Current source material:

- `docs/prd.md` defines the product direction and recommended pipeline.
- `.ai/constitution.md` defines non-negotiable operating rules and failure boundaries.
- `.ai/recon.md`, `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, and `.ai/reviews/` define durable workflow memory locations.
- `.gemini/commands/` and `.gemini/.specify/` contain the current Spec-Kit/Gemini integration scaffold.
- `.planning/codebase/` captures the current brownfield map produced during initialization.

The codebase map found no app source tree, package manifest, root runtime project file, test runner, CI workflow, API layer, database schema, or deployment config. Existing files are mostly protocol documents, generated command scaffolds, local skills, and placeholder state files.

## Constraints

- **Documentation-first state**: Initial work must treat `docs/prd.md`, `.ai/constitution.md`, and `.planning/codebase/` as source context because no runtime implementation exists yet.
- **Runtime neutrality**: The protocol must support multiple agent runtimes rather than assuming Claude-only or Gemini-only behavior.
- **Path consistency**: `.ai/specs/`, `.gemini/.specify/`, and future Spec-Kit feature paths must not drift into competing sources of truth.
- **Verification required**: Claims of completion need checkable artifacts, commands, or review logs.
- **No infinite self-repair**: Repeated validation failure must route to human review instead of agent debate.
- **Security baseline**: Generated docs and code must avoid leaking secrets and must keep destructive operations explicit.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the project orchestration-focused | The PRD explicitly says the goal is a thin protocol, not a replacement for existing tools. | Pending |
| Treat the current repository as brownfield documentation infrastructure | Existing files define behavior and constraints even though no app runtime exists. | Pending |
| Use GSD recommended defaults for planning | Interactive selection is unavailable in this Codex mode, and recommended defaults keep initialization moving. | Pending |
| Start with coarse phases | The project needs a few broad foundation phases before fine-grained implementation work makes sense. | Pending |
| Commit planning docs | GSD config defaults to tracked planning docs and this repo is a protocol repository where planning artifacts are part of the product. | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition:

1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. What This Is still accurate? Update if drifted.

After each milestone:

1. Full review of all sections.
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state, feedback, and verification results.

---
*Last updated: 2026-05-24 after initialization*
