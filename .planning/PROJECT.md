# Snail Agent Flow

## What This Is

Snail Agent Flow is a lightweight operating protocol for AI coding agents. It coordinates Superpowers, GStack, GSD, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, and Playwright into a repeatable spec-to-ship workflow for new and existing projects.

Milestone v1.0 delivered the protocol foundation: artifact contract, routing/gates, deterministic validator, runtime adapters, CLI packaging, expanded examples/CI, and one-flow feature scaffolding.

Milestone v2.0 focuses on packaging the rough-project-flow ledger into a portable, init-able Gemini skill with declarative flow definitions and artifact gates. This enables any project to adopt the 10-stage sequential workflow (decision discovery → decision challenge → canonical spec → implementation plan → plan critique → revision loop → vertical slicing → execution → verification → release readiness) by installing the package and mentioning the flow skill in chat.

## Core Value

Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## Requirements

### Validated (v1.0)

- [x] Repository-level agent instructions exist for Claude and Gemini through `CLAUDE.md` and `GEMINI.md`.
- [x] The core pipeline is documented in `docs/prd.md`, including recon, planning critique, spec generation, validation, execution, QA, memory handoff, and ship gates.
- [x] Durable AI state folders exist under `.ai/` for constitution, recon, specs, sessions, memory, and review artifacts.
- [x] Spec-Kit/Gemini command scaffolding exists under `.gemini/commands/` and `.specify/`.
- [x] Local agent skill scaffolding exists under `.agents/skills/`.
- [x] The current codebase map exists under `.planning/codebase/`.
- [x] Deterministic spec validator with path drift checks and human review circuit breaker.
- [x] CLI with `init`, `feature`, `run`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff` commands.
- [x] Greenfield and brownfield fixtures, CI verification matrix, and optional evaluation rubrics.

### Validated (v2.0)

- [x] Define a declarative flow definition format (YAML) that captures stage order, required skills, artifact gates, and revision routing.
- [x] Ship the built-in `rough-project-flow` as a data-driven flow definition encoding the 10-stage ledger.
- [x] Extend `adp init` to copy flow definitions into `.ai/flows/` and create the flow ledger state file.
- [x] Package the flow orchestrator as a Gemini skill that agents mention in chat to start, resume, or inspect the flow.
- [x] Implement deterministic artifact gate enforcement with circuit breaker behavior.
- [x] Add a flow validator for definition syntax, ledger consistency, and gate status.
- [x] Add tests covering flow lifecycle: normal completion, revision routing, gate blocking, brownfield merge.
- [x] Warn or guide installation of required tools to use skills if the user lacks them.
- [x] Add context budget gate and subagent orchestration policies (Phase 16).

### Out of Scope

- Replacing GSD, GStack, Superpowers, Spec-Kit, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright — this project orchestrates them rather than reimplementing them.
- Building a full IDE or hosted agent platform — the near-term value is a local protocol and artifact system.
- Adding an end-user authentication, database, billing, or deployment stack before a runtime product surface exists.
- Broad rewrites of generated Spec-Kit or local skill scaffolds without a narrow compatibility reason.
- Automatic tool installation — users must install prerequisites themselves.
- Flow step automation via subprocess — the flow skill instructs agents, it does not spawn child processes.

## Context

The motivating problem is tool-order confusion in modern AI coding workflows. The repo should help agents and users decide what happens first, which artifacts are source of truth, when specs are required, when codebase mapping is required, when self-repair must stop, and how project memory survives across sessions.

Milestone v2.0 extends this to **workflow portability**: the rough-project-flow ledger pattern proved valuable during v1.0 development. Packaging it as a declarative, init-able flow definition with artifact gates allows any project to adopt the same rigorous decision → spec → plan → critique → execute → verify → ship pipeline without manually remembering the stage order.

Current source material:

- `docs/prd.md` defines the product direction and recommended pipeline.
- `.ai/constitution.md` defines non-negotiable operating rules and failure boundaries.
- `.ai/recon.md`, `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, and `.ai/reviews/` define durable workflow memory locations.
- `.gemini/commands/` and `.specify/` contain the current Spec-Kit/Gemini integration scaffold.
- `.planning/codebase/` captures the current brownfield map produced during initialization.
- `bin/adp.js` implements the CLI with init, feature, run, validate, doctor, and handoff commands.
- `.agents/skills/` contains the Gemini skill scaffolding.

## Constraints

- **Documentation-first state**: Initial work must treat `docs/prd.md`, `.ai/constitution.md`, and `.planning/codebase/` as source context because no runtime implementation exists yet.
- **Runtime neutrality**: The protocol must support multiple agent runtimes rather than assuming Claude-only or Gemini-only behavior.
- **Path consistency**: `.ai/specs/`, `.specify/`, and future Spec-Kit feature paths must not drift into competing sources of truth.
- **Verification required**: Claims of completion need checkable artifacts, commands, or review logs.
- **No infinite self-repair**: Repeated validation failure must route to human review instead of agent debate.
- **Security baseline**: Generated docs and code must avoid leaking secrets and must keep destructive operations explicit.
- **Prerequisite tools**: GSD, Superpowers, Spec-Kit, and GStack must be installed by the user; the flow validates availability but does not install them.
- **Skill, not CLI**: The flow orchestrator is a Gemini skill mentioned in chat, not a CLI subprocess runner.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the project orchestration-focused | The PRD explicitly says the goal is a thin protocol, not a replacement for existing tools. | Accepted |
| Treat the current repository as brownfield documentation infrastructure | Existing files define behavior and constraints even though no app runtime exists. | Accepted |
| Use GSD recommended defaults for planning | Interactive selection is unavailable in this Codex mode, and recommended defaults keep initialization moving. | Accepted |
| Start with coarse phases | The project needs a few broad foundation phases before fine-grained implementation work makes sense. | Accepted |
| Commit planning docs | GSD config defaults to tracked planning docs and this repo is a protocol repository where planning artifacts are part of the product. | Accepted |
| Package flow as Gemini skill, not CLI command | Users interact with the flow via agent chat mention, not terminal commands. CLI handles init/validate only. | Accepted |
| Copy flow definition to `.ai/flows/` on init | Flow definitions live in the project, not referenced from a global package path. Allows per-project customization. | Accepted |
| Ledger state in JSON at `.ai/state/flow-ledger.json` | Machine-readable, deterministically validatable, versioned in git. | Accepted |
| Flow definitions are YAML data, not code | Stage order and artifact gates are declarative. Execution logic lives in the flow engine skill. | Accepted |

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
*Last updated: 2026-05-25 — v2.0 Flow Engine milestone started*
