# Specification: Flow Definition Format and Built-in Flow

## Goal

Define a declarative flow definition format (YAML) and ship the built-in `rough-project-flow` as the first flow definition file.

This provides the foundational data structure for the portable workflow engine, enabling projects to adopt the 10-stage agent-development protocol.

## Non-Goals

- Automate subprocess execution or command running inside the flow engine skill (the engine instructs the agent; it does not invoke commands directly).
- Implement full parsing of all complex YAML features (e.g. anchors, aliases) — only simple indentation-based keys, values, and lists are required.
- Implement dynamic installation of missing tools (users must install prerequisites themselves).
- Implement the full flow engine state machine and execution logic (deferred to Phase 10).

## Acceptance Criteria

1. **Declarative Flow Schema**: Define and document a YAML-based schema for specifying:
   - Metadata: `name`, `version`, `description`.
   - `prerequisites`: List of required tools/skills with name, check type, and fallback commands.
   - `stages`: Ordered list of stages, each specifying `id`, `name`, `description`, `skill` or `command`, `required_artifacts`, and `revision_routing`.
2. **Built-in Flow Definition**: Create `.specify/templates/rough-project-flow.yaml` encoding the 10-stage ledger:
   1. `decision_discovery` -> `/gsd-discuss-phase`
   2. `decision_challenge` -> `/grill-with-docs`
   3. `canonical_spec` -> `/speckit.specify`
   4. `implementation_plan` -> `/gsd-plan-phase`
   5. `plan_critique` -> `plan-ceo-review` & `plan-eng-review`
   6. `revision_loop` -> revision check routing
   7. `vertical_slicing` -> `/to-issues`
   8. `execution` -> `/gsd-execute-phase`
   9. `verification` -> `/gsd-verify-work` & validators
   10. `release_readiness` -> ship/readiness review
3. **Prerequisite Tool Validation**: Implement validation logic that checks the presence of:
   - GSD
   - Superpowers
   - Spec-Kit
   - GStack
   by checking config/project directories (e.g. `.agents/skills/`, `~/.gemini/config/skills/`) and command presence (`PATH`).
4. **Documentation and Examples**: Provide documentation explaining the schema and a custom flow definition example `custom-flow-example.yaml`.

## Test Strategy

- **Unit Tests**:
  - Test parsing the built-in `rough-project-flow.yaml` to ensure it is read correctly.
  - Test custom/invalid YAML files to verify parsing and error handling.
  - Test the prerequisite tool validation utility under simulated conditions (available and missing skills/commands).
- **Parity & Validation**:
  - Run `adp validate-spec` to verify the spec directory structure.

## Behavior-Preservation Rules

- Keep all changes backwards-compatible.
- Do not affect existing CLI commands (`init`, `status`, `doctor`, `validate-spec`, `handoff`).
- The parser must run within sandboxed environments without requiring heavy third-party npm packages.

## User Scenarios

### Primary Scenario

A developer initializes a project using `adp init`. The tool copies the default `rough-project-flow.yaml` into `.ai/flows/`. When the agent is summoned in chat, it reads this definition to understand the stages, checks if required tools (GSD, Superpowers) are installed, and blocks execution if any prerequisite is missing.

## Functional Requirements

- **FR-08-01 (YAML format)**: Simple YAML schema for flow definitions.
- **FR-08-02 (Stage definition)**: Stages must include ID, name, skill/command, required artifacts (with placeholder support for `{feature_slug}`, `{feature_dir}`, and `{phase_id}` and optional heading checks), and revision routing.
- **FR-08-03 (Built-in Flow)**: Ship the default `rough-project-flow.yaml`.
- **FR-08-04 (Prerequisite Validation)**: Verification logic for GSD, Superpowers, Spec-Kit, and GStack availability.
- **FR-08-05 (Zero-Dependency parsing)**: A lightweight custom YAML parser in JavaScript to avoid external npm dependencies.

## Assumptions

- Flow definitions are stored as files in the project workspace (copied during initialization).
- The user is responsible for installing any prerequisite tools/skills.
