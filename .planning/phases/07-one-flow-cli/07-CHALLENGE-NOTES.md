# Phase 7: one-flow-cli — Challenge Notes

**Date:** 2026-05-25
**Phase:** 7-one-flow-cli

## 1. Terminology & Alignment Challenge

- **Glossary Check:** Ensure "One-Flow CLI" refers to the command-line interface extension implementing the zero-configuration feature scaffolding commands.
- **Parity Check:** We must verify that the generated markdown structures match our deterministic validators exactly. E.g. we must include specific headings (`## Goal`, `## Non-Goals`, `## Acceptance Criteria`, `## Test Strategy`, `## Behavior-Preservation Rules`, `## User Scenarios`, `## Functional Requirements`, `## Assumptions`) in the generated `spec.md`, and (`## Proposed Changes`, `## Verification Plan`, `## Artifact Layout` or `## Files To Change`) in `plan.md`.

## 2. Feasibility & Failure Modes

- **Prefix Scan Failure with Irregular Directory Names:**
  - *Risk:* If a user manually creates a folder like `specs/003` (without a trailing hyphen) or `specs/abc`, our numeric prefix extraction might fail or crash.
  - *Mitigation:* The prefix scanner uses `readdirSync({ withFileTypes: true })`, filters for directories only, applies regex `/^(\d{3})-/` to match strictly three-digit prefix followed by hyphen, and defaults to `0` if no matching folders are found.
- **Empty Short-Name from Stop Words:**
  - *Risk:* If the user runs `adp feature "a for the"`, all words are stop words. This would result in an empty directory name `specs/002-`.
  - *Mitigation:* Fall back to the default string `'new-feature'` if the derived short name array is empty.
- **CWD Resolution Drift:**
  - *Risk:* When the npm package is globally installed, `__dirname` resolves to the global `node_modules` directory, causing CLI commands to read/write templates and state in the global package location rather than the user's workspace.
  - *Mitigation:* Explicitly distinguish `repoRoot` (derived via `process.cwd()`, or `PROJECT_ROOT` / `REPO_ROOT` env overrides) from `packageRoot` (derived via `path.resolve(__dirname, '..')`).

## 3. Command Boundaries & Overlap

- **`adp run` vs `adp init` + `adp feature`:**
  - *Overlap:* Both initialize the environment and create features.
  - *Clarity:* `adp run` is the convenience wrapper for greenfield users. It runs `handleInit()` first and then `handleFeature()` with the `validate: true` option. This keeps CLI commands modular and reusable.

## Conclusion
The decisions captured in `07-CONTEXT.md` are robust and verified by CLI integration tests. We will proceed to Stage 3: Canonical Spec.
