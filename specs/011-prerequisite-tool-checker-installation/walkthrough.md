# Walkthrough: Prerequisite Tool Checker and Installation Guide

We have successfully completed all stages of the **rough-project-flow** workflow for **Phase 12: Prerequisite Tool Checker and Installation Guide**!

This feature ensures that developers have the necessary CLI tools and skills (GSD, Superpowers, Spec-Kit, GStack) installed before starting or executing any stage of their agent-assisted development pipelines.

---

## Technical Changes Implemented

### 1. Platform-Specific Setup Database & Helper (`lib/tool-validator.js`)
- Added `INSTRUCTIONS_DB` capturing user-friendly purposes and precise platform-specific (macOS and fallback) installation steps for core skills (`gsd-discuss-phase`, `using-superpowers`, `speckit-specify`, `plan-ceo-review`).
- Added and exported a substring-matching helper function `getToolInstructions(name)`.

### 2. Prerequisite Check & Warning Integration in CLI (`bin/adp.js`)
- Extended `adp doctor` to:
  - Load the active project flow definition (`rough-project-flow.yaml`).
  - Extract declared prerequisites and run checks via `lib/tool-validator.js`.
  - Print prominent check status messages (green checkmarks for available tools, red X marks for missing tools).
  - Print customized descriptions and platform setup instructions for any missing prerequisites.
  - Exit with status `1` if any prerequisite is missing.

### 3. Stage Prerequisite Matching in Flow Engine (`lib/flow-engine.js`)
- Implemented and exported the `checkStagePrerequisites(flowStage, prerequisites, repoRoot)` helper.
- Performs substring and case-insensitive matching to correctly map stage properties (`skill` or `command`) to defined prerequisite entries (e.g. stage skill `gsd-discuss-phase` maps to prerequisite `GSD`).
- Resolves check status and attaches platform instructions to unavailable prerequisites.

### 4. Halt and Warning Integration in Flow Engine Skill
- Updated `.agents/skills/project-flow/SKILL.md` and `.specify/templates/project-flow-skill-template.md` to:
  - Require prerequisite tool checks for the next stage during start and resume loops.
  - Direct the agent to print a `⚠️ PREREQUISITE WARNING` block showing the missing tool, purpose, and installation instructions.
  - Instruct the agent to mark the stage status as `"blocked"` in `.ai/state/flow-ledger.json` and halt execution.

---

## Verification Evidence

### Automated Unit and Integration Tests
We expanded coverage in both the CLI and flow engine test suites to deterministic levels:
1. **Unit Tests (`validators/scripts/test-flow-engine.js`)**:
   - Verified stage checks pass automatically when a stage has no prerequisites.
   - Verified substring and case-insensitive matching correctly matches `gsd-discuss-phase` to `GSD`.
   - Verified missing tools are flagged unavailable, attaching platform instructions.
   - All **89 flow engine tests** pass successfully!

2. **CLI Integration Tests (`validators/scripts/test-cli.js`)**:
   - Added `CLI Doctor Reports Missing Prerequisites and Exits 1` verifying output formatting and exit codes.
   - Decoupled Greenfield, Brownfield, and Doctor test fixtures from the host developer environment by mocking `.agents/skills` directories inside the sandbox.
   - All **20 CLI integration tests** pass successfully!

### Test Run Diagnostics
```bash
> snail-agent-flow@0.3.0.0 test
> npm run validate && npm run test:validator && npm run test:pipeline && npm run test:cli && node validators/scripts/test-flow-parser.js && node validators/scripts/test-flow-engine.js

[validator] Validation PASSED.
Running spec-validator tests...
Passed: 15/15
All tests passed successfully!

Running CLI tests...
✅ PASS: CLI Help Usage
...
✅ PASS: Greenfield Project Fixture Integration
✅ PASS: Brownfield Project Fixture Integration
✅ PASS: CLI Doctor Reports Missing Prerequisites and Exits 1
Passed: 20/20
All CLI tests passed successfully!

[test-flow-parser] Running Phase 8 Unit Tests...
[test-flow-parser] Tests complete: 7 passed, 0 failed.

--- validateLedger ---
--- resolveNextStage ---
...
--- checkStagePrerequisites ---
Flow engine tests: 89 passed, 0 failed
```

---

## State Updates
- Marked **Phase 9, 10, 11, and 12** as completed and verified in `.planning/REQUIREMENTS.md` (now 20 out of 24 v2 requirements are fully delivered).
- Updated `.planning/STATE.md` tracking progress at **83%** complete, moving our focus to Phase 13: Flow Validator and Tests.
- Verified all memory handoff protocol items pass successfully using `adp handoff`.
