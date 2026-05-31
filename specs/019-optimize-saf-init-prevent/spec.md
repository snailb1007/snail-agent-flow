# Spec: Optimize saf init to prevent repository conflicts

## Goal

Optimize the Snail Agent Flow initialization command (`saf init` / `adp init`) to prevent git merge conflicts and instruction file clutter in multi-developer legacy projects. 

This is achieved by:
1. Automatically creating or updating `.gitignore` in the target project to exclude transient local AI files (sessions, state, claims, locks, context packs, and signals).
2. Ensuring that guidelines added to developer instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) are idempotent and do not duplicate sections if they already exist.

## Non-Goals

- Provide a decentralized or server-based claims/locking system.
- Manage git commits or branches automatically during `saf init`.
- Restructure or remove developer-authored content in target projects.

## Acceptance Criteria

1. **Automatic `.gitignore` Configuration**:
   - Running `saf init` must check for the existence of `.gitignore` in the target project root (`PROJECT_ROOT` / `REPO_ROOT`).
   - If `.gitignore` does not exist, create it containing standard Snail Agent Flow ignore patterns.
   - If `.gitignore` exists, append the Snail Agent Flow ignore patterns to it, prefixed with a clear `# Snail Agent Flow / ATLAS Loop` heading block.
   - The appending logic must be idempotent: if the `# Snail Agent Flow / ATLAS Loop` block is already present in `.gitignore`, do not append or duplicate it.

2. **Idempotent Developer Guidelines**:
   - Initializing `saf init` must not append duplicate sections/headings like `## Autonomous ATLAS Loop`, `## Subagent & Parallel Execution Guidelines`, or `## Context Budget and Subagent Orchestration Policy` to `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md` if those headings already exist.

3. **Validation & Test Coverage**:
   - The target project bootstrap smoke test (`validators/scripts/test-target-project-bootstrap.js`) must verify that `.gitignore` is created and contains the expected transient directories.
   - The test must verify that running `saf init` twice does not duplicate ignore rules or guidelines.
   - The package validation suite (`npm test`) must pass successfully.

## Test Strategy

- Run the automated project bootstrap test (`node validators/scripts/test-target-project-bootstrap.js`).
- Verify via the full test suite (`npm test`).

## Behavior-Preservation Rules

- Preserve all existing, user-defined rules in `.gitignore`.
- Preserve existing developer instructions in `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.

## Functional Requirements

- FR-001: Automatic `.gitignore` detection, creation, and appending.
- FR-002: Idempotent rule and block addition to `.gitignore`.
- FR-003: Graceful checks on guide files to prevent duplicate headings.
