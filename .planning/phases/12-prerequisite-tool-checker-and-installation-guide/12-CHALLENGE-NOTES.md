# Phase 12: Prerequisite Tool Checker and Installation Guide — Challenge Notes

**Date:** 2026-05-25
**Phase:** 12-prerequisite-tool-checker-and-installation-guide

## Design Verification

### 1. `adp doctor` Integration Feasibility
- **Challenge:** Does extending `adp doctor` risk breaking static sanity checks if the flow definition is missing or malformed?
- **Analysis:** Yes. If `.ai/flows/rough-project-flow.yaml` is missing, `adp doctor` should report this as a static check failure before trying to read prerequisites. If the YAML is malformed, we must catch parser errors and print a clean diagnostic instead of letting the process crash with a stack trace.
- **Remediation:** Wrap flow definition loading and parsing in `try-catch` blocks within the `adp doctor` handler. If it fails, report it as a static check error and continue with remaining checks where possible, but exit with failure code.

### 2. Matching Stage Skills to Prerequisites
- **Challenge:** How does the flow engine skill know which prerequisite maps to the current stage's `skill` or `command`?
- **Analysis:** A stage declares a `skill` (e.g. `skill: gsd-discuss-phase`) and optionally a `command` (e.g. `node bin/adp.js new-session "discuss"`). A prerequisite has a `name` (e.g., `GSD`) and a `command` (e.g., `gsd-discuss-phase`). 
- **Remediation:** We will map the stage's `skill` or `command` to the corresponding prerequisite tool by checking if:
  1. The prerequisite name is a substring of the stage skill (e.g., prerequisite name `GSD` matches stage skill `gsd-discuss-phase`).
  2. The prerequisite command is a substring of the stage command or skill (e.g., prerequisite command `plan-ceo-review` matches stage skill `plan-ceo-review`).
  We will implement a clean, robust helper in `lib/tool-validator.js` or `lib/flow-engine.js` that does this mapping.

### 3. Flow Engine Halting Behavior
- **Challenge:** If a tool is missing, how does the flow engine halt?
- **Analysis:** In the flow engine skill instructions, the engine is instructed to:
  - Check the required prerequisites for the next stage.
  - If any are missing, output the prerequisite warning and stop (i.e. do *not* output the standard `═══ NEXT STAGE ═══` block, but instead output a `⚠️ PREREQUISITE WARNING` block).
  - The ledger stage status should be marked as `blocked` in `.ai/state/flow-ledger.json`.
- **Remediation:** Update `.agents/skills/project-flow/SKILL.md` (and its template) with explicit instructions on this warning and blocking protocol. We must also verify that our helper `lib/flow-engine.js` supports resolving `blocked` stages and reports them correctly.

### 4. Platform-Specific Instructions Portability
- **Challenge:** What if the user is not on macOS?
- **Analysis:** Our environment is Mac, so macOS instructions are highly relevant. However, for maximum portability, we will provide:
  - A primary macOS `brew` or direct skill copy instruction.
  - A general fallback (e.g., copying the skill folder into the home directory or workspace folder).
  This ensures that if the user is on a different OS (e.g. Linux), the fallback is still fully actionable.

## Risk Registry

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prerequisite check spawns shell commands which could hang or cause side effects | High | Keep check commands extremely lightweight (e.g., `command -v`). Use `spawnSync` with a short timeout (e.g. 1000ms) to prevent hang. |
| Inconsistent tool matching between stage skill and prerequisite name | Medium | Implement robust case-insensitive substring matching. Add dedicated tests for various name formats. |
| Malformed flow YAML crashes `adp doctor` | Medium | Defensively wrap all YAML parsing in `try/catch`. Treat parse failure as a specific health check error. |
