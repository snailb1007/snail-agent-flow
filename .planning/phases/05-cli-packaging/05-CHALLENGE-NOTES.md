# Phase 5: cli-packaging — Challenge Notes

**Date:** 2026-05-24
**Phase:** 5-cli-packaging

## 1. Terminology & Alignment Challenge

- **Glossary Check:** The PRD proposes `adp` ("AI Delivery Pipeline") as the command line tool name, but the repository and project is named `snail-agent-flow`. 
- **Resolution:** We will register both `adp` and `saf` in `package.json` under `"bin"`. This satisfies the PRD nomenclature while acknowledging the project's identity.
- **State File Check:** ADR 0001 refers to `.ai/state/active-feature.json`, but Phase 4 alignment shifted the authoritative active feature identity pointer to `.specify/feature.json` and deprecated/deleted `.ai/state/active-feature.json`. The CLI must read identity ONLY from `.specify/feature.json`, ensuring zero regression.

## 2. Feasibility & Failure Modes

- **Dependency Bloat:** Using argument parsing libraries like `commander` or style libraries like `chalk` would require adding runtime dependencies to `package.json` and running `npm install` before the CLI can run.
  - *Risk:* In sandbox environments or offline mode, this could block CLI operations.
  - *Mitigation:* We will implement option parsing and terminal ANSI escape coloring using vanilla Node.js.
- **Overwriting User Rules:** An unconstrained `adp init` command might overwrite existing custom runtime instructions (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) or the repository constitution (`.ai/constitution.md`).
  - *Risk:* Loss of project-specific rules or custom setup.
  - *Mitigation:* `adp init` must use a safe creation policy: it only creates folders/files that are missing, logging warnings for existing ones. We can introduce a `--force` flag for explicit overwriting.

## 3. Command Boundaries & Overlap

- **`status` vs `doctor`:**
  - *Overlap:* Both commands inspect the environment.
  - *Clarity:* `status` is dynamic: it prints the active session progress, active phase, gate outcomes, and retry statuses from `run-state.json`. `doctor` is structural: it checks directory structure existence, config templates, path drift violations, and runs a diagnostic check of the validator.
- **`validate-spec`:**
  - *Strategy:* The CLI must spawn `node validators/scripts/validate-spec.js` as a child process rather than duplicating validation code. This ensures a single source of truth for specification validation.

## Conclusion
The decisions in `05-CONTEXT.md` are robust, align with PRD goals, avoid dependency bloat, protect user settings, and preserve single sources of truth. We are ready to proceed to Step 3: Canonical Spec.
