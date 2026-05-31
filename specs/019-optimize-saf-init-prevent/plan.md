# Implementation Plan: Optimize Saf Init Prevent

**Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

## User Review Required

> [!NOTE]
> This change introduces automatic `.gitignore` updates when initializing `saf init` or `adp init`. This preserves any existing developer rules and only appends the required AI state patterns to avoid conflicts.

## Proposed Changes

### CLI Orchestrator

#### [MODIFY] [adp.js](file:///c:/Users/ADMIN/source/repos/snail-agent-flow/bin/adp.js)
- Modify `handleInit()` to call a new helper function `updateGitignore(repoRoot)`.
- Implement `updateGitignore(repoRoot)`:
  - Define ignore patterns block:
    ```gitignore
    # Snail Agent Flow / ATLAS Loop
    .ai/sessions/
    .ai/state/
    .ai/claims/
    .ai/locks/
    .ai/signals/
    .ai/context-packs/
    .ai/state/repair-guide.md
    .gsd/
    .gsd-id
    .mcp.json
    .bg-shell/
    .specify/**/*.local
    specs/**/*.local
    ```
  - Read `.gitignore` if it exists.
  - If `.gitignore` doesn't exist, create it with the ignore patterns block.
  - If `.gitignore` exists, check if `# Snail Agent Flow / ATLAS Loop` exists in it.
  - If it is not present, append the block (ensuring proper newlines).
- Refine guideline update functions (`upsertAtlasGuidelines`, `appendSubagentGuidelines`, `appendContextPolicyGuidelines`) to ensure they handle file reading/writing safely and do not duplicate.

---

### Verification and Test Suite

#### [MODIFY] [test-target-project-bootstrap.js](file:///c:/Users/ADMIN/source/repos/snail-agent-flow/validators/scripts/test-target-project-bootstrap.js)
- Add assertions checking that `.gitignore` exists after running `saf init`.
- Read `.gitignore` and assert it contains key ignore rules (e.g., `.ai/sessions/`, `.ai/locks/`).
- Run `saf init` a second time in the test.
- Assert that `.gitignore` content does not change (idempotency check).
- Assert that `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` do not grow or duplicate guideline headings.

## Verification Plan

### Automated Tests
- Run target project bootstrap smoke test:
  ```bash
  node validators/scripts/test-target-project-bootstrap.js
  ```
- Run the full project test suite:
  ```bash
  npm test
  ```
