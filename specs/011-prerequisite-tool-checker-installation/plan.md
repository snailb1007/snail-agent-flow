# Implementation Plan: Prerequisite Tool Checker and Installation Guide

**Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

### Component 1: Platform-Specific Instructions & Mapping (`lib/tool-validator.js`)

#### [MODIFY] [tool-validator.js](file:///Volumes/D/snail-agent-flow/lib/tool-validator.js)

- Add a dictionary defining platform-specific installation instructions and descriptions for core tools (GSD, Superpowers, Spec-Kit, GStack).
- Implement and export `getToolInstructions(name)` returning `{ description, instructions }` for a given tool name.
- Expose the dictionary so `bin/adp.js` and `lib/flow-engine.js` can display instructions for missing tools.

---

### Component 2: CLI Prerequisite Warnings (`bin/adp.js`)

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)

- Extend `handleDoctor()`:
  - Check if the active flow definition exists (`.ai/flows/rough-project-flow.yaml`). If not found, skip tool checks (already flagged by static checks).
  - Parse the active flow definition using `yaml-parser.js` and extract the `prerequisites` list.
  - Call `validatePrerequisites(prerequisites, repoRoot)` from `lib/tool-validator.js`.
  - Print check results: green checkmark/pass for available tools, red X for missing tools.
  - If any tool is missing:
    - Print its description and custom macOS/npm installation instructions.
    - Exit the process with failure status code `1` at the end of `handleDoctor()`.

---

### Component 3: Flow Engine Skill Integration (`lib/flow-engine.js`)

#### [MODIFY] [flow-engine.js](file:///Volumes/D/snail-agent-flow/lib/flow-engine.js)

- Implement and export `checkStagePrerequisites(flowStage, prerequisites, repoRoot)`:
  - Find all prerequisites that match the stage's `skill` or `command` property (case-insensitively).
  - If a match is found, call `validatePrerequisites` to check its status.
  - Returns `{ passed: boolean, results: Array<{ name, available, reason, instructions }> }`.

---

### Component 4: Flow Engine Skill and Template Update

#### [MODIFY] [SKILL.md](file:///Volumes/D/snail-agent-flow/.agents/skills/project-flow/SKILL.md)
#### [MODIFY] [project-flow-skill-template.md](file:///Volumes/D/snail-agent-flow/.specify/templates/project-flow-skill-template.md)

- Update the "Quick Start" and "Stage Resolution Algorithm" sections:
  - Mandate checking prerequisites for the next stage before proposing/executing it.
  - If a prerequisite is missing:
    - Output the `⚠️ PREREQUISITE WARNING` block showing the missing tool, purpose, and installation instructions.
    - Update `.ai/state/flow-ledger.json` setting the stage status to `"blocked"`.
    - Do **not** advance the flow; halt execution until the tool is installed.

---

### Component 5: Test Suite Extensions

#### [MODIFY] [test-flow-engine.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-flow-engine.js)

- Add unit tests for `checkStagePrerequisites()`:
  - Happy path (matching tool available).
  - Missing tool detected and returns platform instructions.
  - Substring/case-insensitive matching (e.g. stage skill `gsd-discuss-phase` matches prerequisite `GSD`).
  - Stage with no prerequisites passes automatically.

#### [MODIFY] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)

- Add integration test for `adp doctor` with missing prerequisites:
  - Verify it prints the missing tool instructions.
  - Verify it returns exit code 1 when a tool is missing.

---

## Verification Plan

### Automated Tests

```bash
# Run spec validation first
node validators/scripts/validate-spec.js

# Run flow parser tests
node validators/scripts/test-flow-parser.js

# Run flow engine tests (including new stage prerequisite tests)
node validators/scripts/test-flow-engine.js

# Run CLI integration tests (including new doctor checks)
node validators/scripts/test-cli.js

# Run the complete test suite
npm test
```

### Manual Verification

1. Run `node bin/adp.js doctor` and ensure it runs successfully and shows all prerequisites (GSD, Superpowers, Spec-Kit, GStack) as available since they are in the active environment.
2. Temporarily rename or mock a skill directory (e.g. rename `.agents/skills/project-flow` or another folder) and run `node bin/adp.js doctor` to verify it reports the missing tool with instructions and exits with code 1.
3. Test a mocked flow engine run where a tool is missing and ensure it prints the warning block and halts.
