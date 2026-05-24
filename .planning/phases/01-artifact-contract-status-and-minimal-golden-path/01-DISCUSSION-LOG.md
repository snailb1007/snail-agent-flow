# Phase 1: artifact-contract-status-and-minimal-golden-path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 1-artifact-contract-status-and-minimal-golden-path
**Areas discussed:** Path Reconciliation, Artifact Status & Registry Format, Current-Spec Convention, Minimal Golden Path Example

---

## Path Reconciliation

### Question 1: Spec-Kit root directory location
| Option | Description | Selected |
|--------|-------------|----------|
| Unified under `.specify/` | Move config, templates, and scripts to `.specify/` so all Spec-Kit configurations and feature specs share a single root. | ✓ |
| Separated | Keep `.specify/` for Gemini-specific workflows/templates and only use `.specify/` for feature specs. | |

**User's choice:** Unified under `.specify/`
**Notes:** Move `.specify/*` to `.specify/*` (except provider-specific commands in `.gemini/commands`), so there is a single spec directory.

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
| Deprecate and remove | Completely enforce `specs/<feature-slug>/` as the only specs directory, removing any legacy `.ai/specs/current` path. | ✓ |
| Symlink compatibility | Maintain `.ai/specs/current` as a symbolic link pointing to the active feature directory under `specs/`. | |

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

## Artifact Status & Registry Format

### Question 1: Registry Location
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated registry file | Create a dedicated `docs/artifact-registry.md` at the root mapping paths, ownership, and statuses. | ✓ |
| Inside `PROJECT.md` | Add a `## Artifact Registry` section directly in `.planning/PROJECT.md`. | |

**User's choice:** Dedicated registry file
**Notes:** Keeps registry concerns isolated and clean.

### Question 2: Implementation status labels
| Option | Description | Selected |
|--------|-------------|----------|
| Full taxonomy | Use 'implemented', 'specified', 'placeholder', 'generated-scaffold', or 'deferred'. | ✓ |
| Minimal labels | Use simplified labels like 'active', 'stable', or 'legacy'. | |

**User's choice:** Full taxonomy
**Notes:** Matches requirements/roadmap terminology precisely.

### Question 3: Registry structure
| Option | Description | Selected |
|--------|-------------|----------|
| Multi-category matrix | Classify paths into 'Authoritative', 'Generated', 'Runtime-Specific', and 'Local-Only'. | ✓ |
| Simple table | Just list each path and its owner tool/role without category groupings. | |

**User's choice:** Multi-category matrix
**Notes:** Makes path ownership types explicit.

### Question 4: Directories status documenting
| Option | Description | Selected |
|--------|-------------|----------|
| Status Table in `docs/artifact-registry.md` | List directories (`.ai/`, `.specify/`, etc.) in a Markdown table with status, ownership, and description. | ✓ |
| Individual status badges | Place status/ownership markers inside each directory's main files instead of a centralized table. | |

**User's choice:** Status Table in `docs/artifact-registry.md`
**Notes:** Provides a quick-reference table for the entire repository setup.

---

## Current-Spec Convention

### Question 1: Active feature spec directory pointer mechanism
| Option | Description | Selected |
|--------|-------------|----------|
| Active feature state file | Store the path/slug of the active feature in a JSON/Markdown file (`.specify/active-feature.json` or similar) that tools read. | ✓ |
| Symbolic link | Create a symbolic link at `specs/current` pointing to the active feature directory. | |

**User's choice:** Active feature state file
**Notes:** More portable and less platform-dependent than symlinks.

### Question 2: Location of active feature state file
| Option | Description | Selected |
|--------|-------------|----------|
| Under `.ai/state/` | Store it at `.ai/state/active-feature.json` because active-feature state is an orchestration state concern. | ✓ |
| Under `.specify/` | Store it at `.specify/active-feature.json` to keep it with the spec folders. | |

**User's choice:** Under `.ai/state/`
**Notes:** Follows CONTEXT.md orchestration/specs separation of concerns.

### Question 3: Active feature state file format
| Option | Description | Selected |
|--------|-------------|----------|
| Simple JSON object | A JSON object containing keys like `feature_slug` and `spec_path`. | ✓ |
| Plain-text | Just a single text line containing the active feature slug. | |

**User's choice:** Simple JSON object
**Notes:** Provides structured fields for easy parsing.

### Question 4: Override configuration priority
| Option | Description | Selected |
|--------|-------------|----------|
| Overlay priority | Default to reading `active-feature.json`, but allow overriding via env variables or CLI options. | ✓ |
| Strict file-only | Force all tools to read exclusively from `active-feature.json` to prevent environment drift. | |

**User's choice:** Overlay priority
**Notes:** Provides flexibility for manual development cycles.

---

## Minimal Golden Path Example

### Question 1: Implementation and execution format
| Option | Description | Selected |
|--------|-------------|----------|
| Executable Bash script | A shell script (e.g. `.specify/scripts/bash/smoke-test.sh`) that sets up mock files and runs tests. | ✓ |
| Documentation-only dry-run | Provide dummy fixture files and a detailed Markdown walkthrough instead of an executable script. | |

**User's choice:** Executable Bash script
**Notes:** Provides checkable programmatic assertions.

### Question 2: Location of test fixtures
| Option | Description | Selected |
|--------|-------------|----------|
| Under `.specify/fixtures/` | Place mock specs and states in `.specify/fixtures/minimal-golden-path/` to keep them with the spec configurations. | ✓ |
| Under a root `tests/fixtures/` directory | Create a root-level `tests/fixtures/` folder to separate test data from the main directories. | |

**User's choice:** Under `.specify/fixtures/`
**Notes:** Keeps fixtures isolated near the workflows that execute them.

### Question 3: Validation checks for blocking ship
| Option | Description | Selected |
|--------|-------------|----------|
| Script assertion | The smoke test executes a helper script and asserts that it exits with code 1 (failure) when gates are incomplete. | ✓ |
| Visual print check | The smoke test prints a status matrix of all gates, leaving verification to a manual visual check of the output. | |

**User's choice:** Script assertion
**Notes:** Allows deterministic exit-code based verification.

### Question 4: Smoke test output format
| Option | Description | Selected |
|--------|-------------|----------|
| Structured execution logs | Print step-by-step progress to the terminal and save a log summary to a session log file. | ✓ |
| Minimal TAP format | Output standard Test Anything Protocol (TAP) strings for eventual integration with CI systems. | |

**User's choice:** Structured execution logs
**Notes:** Easy for human developers to follow during execution.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
