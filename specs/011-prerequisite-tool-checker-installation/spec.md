# Prerequisite Tool Checker and Installation Guide

## Goal

Provide a robust prerequisite tool checking and warning framework. It ensures users have the necessary CLI tools and skills (e.g., GSD, Superpowers, Spec-Kit, GStack) installed before executing stages in the project flow. This phase implements a standalone checker within the `adp doctor` CLI command, structures platform-specific (macOS brew/npm) setup instructions for missing tools, and integrates verification into the `project-flow` engine skill so it halts and warns when tools required for the next stage are missing.

## Non-Goals

- Automatically installing missing tools (auto-install is highly user-dependent and out of scope).
- Performing flow YAML schema syntax validation (that is Phase 13).
- Performing web requests or live API checks to fetch installation steps (must remain fully local/offline).

## Acceptance Criteria

1. **WARN-01**: Prerequisite tools are explicitly defined in the flow definition YAML file (`rough-project-flow.yaml`) under the top-level `prerequisites` list, declaring their name, command, and validation command/existence check.
2. **WARN-02**: The `adp doctor` CLI command is extended to load the active flow definition, run the prerequisite checks via `lib/tool-validator.js`, and output a structured list of available and missing tools.
3. **WARN-03**: If any prerequisite tools are missing, the output displays prominent warnings along with clear, platform-specific (macOS brew/npm/git) installation instructions mapping to each missing tool, and the command exits with failure status (1).
4. **WARN-04**: The `project-flow` engine skill (`.agents/skills/project-flow/SKILL.md`) is updated to integrate tool verification. When resolving the next stage, the engine checks if the tool associated with the stage's declared `skill` is available.
5. **Flow Engine Halt**: If the tool required for the next stage is missing, the engine outputs a prominent `⚠️ PREREQUISITE WARNING` block with installation instructions, marks the stage's status as `blocked` in `.ai/state/flow-ledger.json`, and halts advancement.
6. **Robust Tool Mapping**: Tool matching between a stage's `skill`/`command` and a prerequisite entry is case-insensitive and supports substring matching (e.g. stage skill `gsd-discuss-phase` maps to prerequisite `GSD`).
7. **Comprehensive Tests**: Add automated unit and CLI integration tests that verify prerequisite checks, missing tool formatting, `adp doctor` failures, and flow engine halting behaviors.

## Test Strategy

- **Unit Tests**:
  - Verify that the matching algorithm correctly maps a stage's skill/command to its declared prerequisite.
  - Verify that missing prerequisites return the correct platform-specific instructions.
- **CLI Integration Tests**:
  - Run `adp doctor` in a project with all prerequisites satisfied and ensure it passes.
  - Run `adp doctor` in a project with a missing prerequisite (mocked) and ensure it warns, prints instructions, and exits with code 1.
- **Flow Engine Integration Tests**:
  - Verify that `resolveNextStage()` or checking logic correctly flags a missing prerequisite for the next stage, halts advancement, and flags it as `blocked` in the ledger state.
- Ensure all existing tests run and pass via `npm test` and `node validators/scripts/validate-spec.js`.

## Behavior-Preservation Rules

- Preserve all existing static sanity checks in `adp doctor` (checking directory presence, `.ai/constitution.md`, CLAUDE.md, etc.).
- Maintain backwards compatibility for projects initialized using previous v2 CLI versions.
- Do not modify the existing `validatePrerequisites` helper signature in `lib/tool-validator.js`; instead, leverage and integrate it.

## User Scenarios

### Scenario 1: Running health checks with missing tools
A user runs `adp doctor` in their terminal. One of the required skills (`plan-ceo-review`) is missing from their home folder and PATH.
The CLI outputs:
```
[doctor] Running static sanity checks...
[doctor] Static sanity checks PASSED.
[doctor] Running flow prerequisite tool checks...
❌ GStack (plan-ceo-review) is MISSING.
   Purpose: Runs product (CEO) and engineering critiques on plans.
   Instructions: Copy plan-ceo-review skill to your home folder:
                 cp -r path/to/plan-ceo-review ~/.gemini/config/skills/plan-ceo-review
                 Or install it globally if available.

[doctor] Prerequisite checks FAILED. 1 tool(s) missing.
```
The command exits with status code 1.

### Scenario 2: Flow engine halting on missing tool
An agent resolves the next stage as `plan_critique` which requires the `plan-ceo-review` skill.
However, the user has not installed this skill.
The flow engine:
1. Detects that `plan-ceo-review` is missing.
2. Updates `.ai/state/flow-ledger.json` setting `plan_critique` status to `"blocked"`.
3. Outputs:
```
⚠️ PREREQUISITE WARNING
Stage "Plan critique" (plan_critique) requires missing tool: GStack (plan-ceo-review)
Please install the tool before proceeding.

Installation Instructions:
Copy plan-ceo-review skill to your home folder:
cp -r path/to/plan-ceo-review ~/.gemini/config/skills/plan-ceo-review

Flow execution is BLOCKED.
```

## Functional Requirements

- **FR-12-01**: Extend `adp doctor` to load `.ai/flows/rough-project-flow.yaml` and extract the `prerequisites` array.
- **FR-12-02**: Format a structured installation database/map matching prerequisite names/commands to detailed macOS and fallback instructions.
- **FR-12-03**: Expose `adp doctor` CLI warnings for missing tools, and exit with status 1 if any tool is missing.
- **FR-12-04**: Map stage skill/command to prerequisite list entries using case-insensitive substring matching.
- **FR-12-05**: Implement helper function in `lib/flow-engine.js` (or integrate into `checkArtifacts` / stage resolution) to verify stage prerequisites before execution.
- **FR-12-06**: Flow engine SKILL.md instructions must mandate checking prerequisites, outputting the warning block, updating ledger status to `blocked`, and halting when tools are missing.

## Assumptions

- Prerequisite tools are correctly defined in `.ai/flows/rough-project-flow.yaml`.
- The user is operating in a macOS environment.
- The user can run shell commands to verify global path command availability.
