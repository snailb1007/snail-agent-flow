# Feature Specification: Strict Initialization Checks and Detailed Installation Guides for Missing Tools

**Feature Branch**: `016-strict-initialization-checks-detailed`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Strict initialization checks and detailed installation guides for missing tools"

## Goal

Tighten initialization and onboarding checks so `adp init` and related startup paths detect incomplete setup early, explain exactly what is missing, and produce actionable installation or repair guidance. It builds on Phase 12 prerequisite checker and Phase 14 skill-localization work; it does not auto-install tools or add new flow execution automation.

## Non-Goals

- Automatically downloading or installing missing global tools or package managers.
- Bypassing sandbox security restrictions by executing arbitrary commands outside the workspace.
- Overwriting existing custom user configuration files if they are already present (violating brownfield preservation).

## Acceptance Criteria

1. **Gate Strictness**: `adp init` must execute a strict post-init gate and exit with a non-zero exit code if any required prerequisite is missing or if skill localization fails.
2. **Deterministic Offline Validation**: The gate must run locally and offline, checking YAML/JSON files, file existence, and local relative path formatting in localized skills. No LLM-as-judge checks or network lookups.
3. **Structured Terminal Output**: Provide clear console outputs to stderr detailing why check failed, including checked paths, missing tools, and relevant files.
4. **Actionable Repair Guide**: Write a detailed Markdown repair guide to `.ai/state/repair-guide.md` if initialization fails, containing purpose, failure reason, and exact verification commands.
5. **Unified Doctor Alignment**: `adp doctor` must run the exact same validation logic as the post-init gate to return identical diagnostics.
6. **Localized Skill Verification**: Validates that localized `SKILL.md` files contain only workspace-relative execution-context references, failing if global paths like `~` or `.gemini/antigravity` remain.

## Test Strategy

- **Unit/Integration Tests**:
  - Add test cases to the test suite (e.g. `validators/scripts/test-cli.js`) checking greenfield setup, missing prerequisite, and localization path failure states.
  - Verify that a failed gate returns exit code 1 and writes the correct `.ai/state/repair-guide.md` content.
  - Verify that a healthy setup returns exit code 0.
- **Unified Command Verification**:
  - Assert that `adp doctor` returns identical exit codes and outputs as the `adp init` check when run under identical directory states.
- Run the full project test suite using `npm test` or `npm run test:cli`.

## Behavior-Preservation Rules

- Existing behavior of `adp init` (creating directories, copying flow definitions and ledger stubs) must remain intact.
- Skip overwriting existing files to preserve custom modifications (brownfield safety), but report if a skipped file prevents a valid localized setup.
- Ensure all other Spec-Kit and Flow Engine gates function as expected.

## User Scenarios & Testing

### User Story 1 - Healthy Greenfield Initialization (Priority: P1)

A developer runs `adp init` in a fresh repository. The tool successfully sets up the required folders, copies the default flow, performs checks, validates prerequisite tools, and outputs a successful setup status.

**Why this priority**: This is the baseline golden path for a new user setting up their project.

**Independent Test**: Can be tested on a clean directory with all prerequisite tools installed.

**Acceptance Scenarios**:

1. **Given** a clean directory with all prerequisite tools installed, **When** the user runs `adp init`, **Then** the command initializes the repository, executes post-init gates, passes, and exits with code 0.

---

### User Story 2 - Broken Setup Post-Init Failure and Repair Guide (Priority: P1)

A developer runs `adp init` in an environment where some required prerequisite tools are missing or skill localization has failed (e.g. invalid flow YAML, unreadable skill files, or localization sandbox errors). The command outputs a clear error message, writes a detailed Markdown repair guide (`.ai/state/repair-guide.md`) containing setup instructions, and exits with a non-zero code.

**Why this priority**: This ensures that users do not proceed with a broken configuration, preventing subsequent sandbox/runtime crashes.

**Independent Test**: Can be tested by mocking missing prerequisites or corrupt files.

**Acceptance Scenarios**:

1. **Given** missing prerequisite tools, **When** the user runs `adp init`, **Then** it attempts the file creation but halts with a nonzero exit code, logs a concise error summary to stderr, and writes `.ai/state/repair-guide.md` with detailed instructions.
2. **Given** an invalid/malformed flow definition YAML, **When** the user runs `adp init`, **Then** it fails with a nonzero exit code and logs the parse error details.

---

### User Story 3 - Health Check via adp doctor (Priority: P2)

A user runs `adp doctor` to check the health of their project setup. It executes the exact same validation gates as the post-init checker, returning the same pass/fail diagnostic reasons.

**Why this priority**: Reusing validation logic avoids code drift and provides a consistent interface for diagnosing issues later in the project lifecycle.

**Independent Test**: Run `adp doctor` in a project with a healthy setup versus one with missing dependencies.

**Acceptance Scenarios**:

1. **Given** a project with a missing prerequisite tool, **When** the user runs `adp doctor`, **Then** the output shows the failed gate with identical error reasons as `adp init` and refers to the generated repair guide.

### Edge Cases

- **Brownfield Preservation Conflict**: If a file is blocked from writing due to brownfield preservation but its contents are stale or incorrect, the tool skips overwriting the file but reports a post-init check failure, providing instructions in the repair guide on how to manually resolve it.
- **Inaccessible Global Paths in Localized Skills**: If a localized `SKILL.md` file still references global paths like `~` or `.gemini/antigravity` in its execution-context, the post-init checker detects this as a failure and lists the file as invalid/unlocalized.
- **Missing Optional Tools**: If an optional tool is missing, the init command prints a warning but does not fail the execution.

## Requirements

### Functional Requirements

- **FR-15-01: Strict Post-Init Gate**: `adp init` must run a strict post-init gate after scaffolding files and localizing skills. Setup failures must make `adp init` exit with a non-zero exit code.
- **FR-15-02: Setup Failure Criteria**: Setup failures include: malformed flow YAML, invalid/missing ledger state, missing required flow prerequisites, unreadable required skill definitions, failed workflow/reference localization, or localized skill files pointing at inaccessible home/global paths.
- **FR-15-03: Brownfield Preservation Safety**: Existing custom files must not be overwritten. If a file blocks successful initialization, the command reports the exact file and manual action required, rather than replacing it.
- **FR-15-04: Offline Structured Guidance**: Per missing tool or skill, the checker must provide immediate terminal output and generate a detailed local Markdown repair guide at `.ai/state/repair-guide.md`. The guide must include: purpose, requirement reason, detected failure reason, checked paths/commands, installation/copy commands, fallbacks, and the verification command to rerun.
- **FR-15-05: Unified Doctor Check**: `adp doctor` must reuse the same validation layer to ensure consistent pass/fail behavior and diagnostics.
- **FR-15-06: Localized Skill Path Verification**: The validator verifies that localized `SKILL.md` files contain only workspace-relative paths in their execution-contexts (no global references like `~`, `.gemini/antigravity`, etc.).
- **FR-15-07: Error Evidence Reporting**: Reports must include concrete evidence such as checked paths, missing files, parse errors, and the specific stage that needs the missing tool.

### Key Entities

- **Repair Guide**: A Markdown file (`.ai/state/repair-guide.md`) containing platform-specific copy-paste commands, purpose, and verify instructions.
- **Ledger State**: The JSON file tracking the progress of stages (`.ai/state/flow-ledger.json`).
- **Flow Definition**: The YAML configuration defining the flow stages (`.ai/flows/rough-project-flow.yaml`).
- **Localized Skill**: A workspace-relative skill directory with `SKILL.md` under `.agents/skills/` and `.claude/skills/`.

## Success Criteria

### Measurable Outcomes

- **SC-15-01**: `adp init` exits with code 0 on a healthy setup with all required tools installed.
- **SC-15-02**: `adp init` exits with code 1 and writes `.ai/state/repair-guide.md` if any required tool or localization file is missing.
- **SC-15-03**: `adp doctor` reports identical errors/passes as `adp init` under the same directory state.
- **SC-15-04**: No live internet access or LLM-as-judge is used in the validation checks.

## Assumptions

- Prerequisite tools list can be retrieved from `lib/tool-validator.js`.
- The user has Node.js and npm installed (since they are running `adp`).
- Sandbox allows file reads/writes within the workspace directory.
- The default host environment running `adp init` has read access to the user's home directory config paths.
