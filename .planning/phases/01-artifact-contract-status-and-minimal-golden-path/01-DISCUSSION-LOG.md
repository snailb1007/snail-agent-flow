# Phase 1: artifact-contract-status-and-minimal-golden-path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 1-artifact-contract-status-and-minimal-golden-path
**Areas discussed:** Path Reconciliation

---

## Path Reconciliation

### Question 1: Spec-Kit root directory location
| Option | Description | Selected |
|--------|-------------|----------|
| Unified under `.specify/` | Move config, templates, and scripts to `.specify/` so all Spec-Kit configurations and feature specs share a single root. | ✓ |
| Separated | Keep `.gemini/.specify/` for Gemini-specific workflows/templates and only use `.specify/` for feature specs. | |

**User's choice:** Unified under `.specify/`
**Notes:** Move `.gemini/.specify/*` to `.specify/*` (except provider-specific commands in `.gemini/commands`), so there is a single spec directory.

### Question 2: Location of Gemini-specific command TOMLs
| Option | Description | Selected |
|--------|-------------|----------|
| Keep commands in `.gemini/commands/` | Keep Gemini-specific TOML commands in `.gemini/commands/` as tool-specific wrappers, keeping `.specify/` neutral. | ✓ |
| Move to `.specify/integrations/` | Move them to `.specify/integrations/gemini/commands/` to centralize all AI/spec configurations. | |

**User's choice:** Keep commands in `.gemini/commands/`
**Notes:** Helps keep the `.specify/` folder runtime-neutral and tool-neutral.

### Question 3: Legacy `.ai/specs/` path handling
| Option | Description | Selected |
|--------|-------------|----------|
| Deprecate and remove | Completely enforce `.specify/specs/<feature-slug>/` as the only specs directory, removing any legacy `.ai/specs/current` path. | ✓ |
| Symlink compatibility | Maintain `.ai/specs/current` as a symbolic link pointing to the active feature directory under `.specify/specs/`. | |

**User's choice:** Deprecate and remove
**Notes:** Removes path drift and competing sources of truth.

### Question 4: Script nesting conventions
| Option | Description | Selected |
|--------|-------------|----------|
| Nested in respective directories | Keep Spec-Kit scripts in `.specify/scripts/` and Claude hooks in `.claude/hooks/` to maintain context and isolation. | ✓ |
| Shared root folder | Centralize all helper, validation, and CLI scripts in a root `scripts/` directory. | |

**User's choice:** Nested in respective directories
**Notes:** Maintains context and tool-specific isolation.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
