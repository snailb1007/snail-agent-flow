---
phase: "05"
name: "cli-packaging"
created: 2026-05-24
---

# Phase 5: cli-packaging — Context

## Goal
Add minimal local CLI commands to manage the Snail Agent Flow protocol. The CLI automates manual script executions, status checks, sessions, and memory handoff validation.

## Decisions

### 1. Implementation & Runtime
- **D-34:** **Node.js Executable Script**: The CLI will be implemented as a native Node.js script with `#!/usr/bin/env node` header under `bin/adp.js`.
- **D-35:** **Zero Third-Party Dependencies**: Option parsing, terminal coloring, and command handlers will be written using vanilla Node.js APIs (`fs`, `path`, `child_process`) to avoid dependency bloat and guarantee instant execution.
- **D-36:** **Command Aliases**: The command will be registered as both `adp` and `saf` under the `bin` field in `package.json`.

### 2. Command Specifications
- **D-37:** **`init`**: Safe creation of missing directories (`.ai/sessions/`, `.ai/memory/`, `.ai/reviews/`, `.ai/state/`, `.specify/templates/`, `specs/`) and copies boilerplate files (like `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.ai/constitution.md`) if missing. Does not overwrite existing files.
- **D-38:** **`new-session <name>`**: Sets up a new session file under `.ai/sessions/` named `YYYY-MM-DD-<name>.md` and updates the active pointer `.specify/feature.json` with the current workspace feature.
- **D-39:** **`status`**: Displays active feature directory, current pipeline phase (Recon, Critique, Spec, Execution, QA, Memory, Ship), validation/retry count, and verified artifacts.
- **D-40:** **`doctor`**: Checks system health (existence of required directories, files, and parses configuration templates).
- **D-41:** **`validate-spec`**: Triggers the deterministic validator script (`validators/scripts/validate-spec.js`) and forwards outcomes.
- **D-42:** **`handoff`**: Validates memory handoff completeness by ensuring `.ai/state/handoff.md` exists and contains correct markdown sections.

### 3. Integration & Testing
- **D-43:** **Validator Subprocess**: The CLI triggers `validators/scripts/validate-spec.js` as a subprocess to keep runtime execution isolated and single-sourced.
- **D-44:** **Automated CLI Tests**: Tests will be added in `validators/scripts/test-cli.js` (or integrated into existing suites) to verify commands (`init`, `new-session`, `status`, etc.) run and exit with correct codes.

## Discretion Areas
- Terminal output coloring and formatting style.
- CLI argument parsing structure (simple positional arguments).

## Deferred Ideas
- Multi-user remote state syncing.
- Playwright/Browser GUI integration.
