---
phase: "08"
name: "flow-definition-format-and-built-in-flow"
created: 2026-05-25
---

# Phase 8: Flow Definition Format and Built-in Flow — Context

## Decisions

- **D-08-01: YAML Format**: The declarative flow definition format will be YAML. This enables developers to easily read/write flows, include multi-line descriptions, and add comments.
- **D-08-02: Flow Schema Specification**: The schema will define:
  - `name`: Human-readable name of the flow.
  - `version`: Version string.
  - `description`: Multi-line explanation.
  - `prerequisites`: List of required tools/skills with validation instructions.
  - `stages`: List of sequential steps. Each stage contains:
    - `id`: kebab-case string.
    - `name`: string.
    - `description`: string.
    - `skill`: skill directory name or command to invoke (e.g. `gsd-discuss-phase`, `grill-with-docs`).
    - `command`: CLI command fallback if not running as a skill (e.g. `node bin/adp.js validate-spec`).
    - `required_artifacts`: List of files to verify after the stage, specifying `path` (using placeholders like `{feature_slug}`, `{phase_id}`), and optional `headings` checking.
    - `revision_routing`: Inline list of failure conditions (`on: gate_failed` or `on: qa_rejected`) and target stages to route back to (`to: decision_discovery`).
- **D-08-03: Built-in Flow YAML**: We will ship a default `rough-project-flow.yaml` containing the 10-stage ledger rules:
  1. `decision_discovery` -> `/gsd-discuss-phase`
  2. `decision_challenge` -> `/grill-with-docs`
  3. `canonical_spec` -> `/speckit.specify`
  4. `implementation_plan` -> `/gsd-plan-phase`
  5. `plan_critique` -> `GStack CEO & Eng Manager reviews`
  6. `revision_loop` -> check reviews and route back if blocked
  7. `vertical_slicing` -> `/to-issues` (or custom task lists)
  8. `execution` -> `/gsd-execute-phase`
  9. `verification` -> `/gsd-verify-work` & validators
  10. `release_readiness` -> GStack Ship/readiness review
- **D-08-04: Zero-Dependency Parser**: To parse YAML in our CLI without adding external npm dependencies, we will implement a lightweight, regex-based YAML parser inside our utilities (or reuse standard simple YAML regex/split parser).
- **D-08-05: Tool Validation Logic**: Prerequisite tools (GSD, Superpowers, Spec-Kit, GStack) are validated by checking:
  1. The existence of their skill files under `.agents/skills/`, `.claude/skills/`, or the user's config folder (e.g., `~/.gemini/config/skills/`).
  2. Alternatively, executing `command -v <command>` or executing check scripts if provided.

## Discretion Areas

- The YAML parser implementation detail: a simple parser that reads indented blocks, key-value pairs, and lists, sufficient to read the flow definition files.
- The exact wording of the documentation and custom flow examples.

## Deferred Ideas

- Full JSON Schema validation integration with IDE autocomplete (deferred to later phases).
- Dynamic installation of missing tools (PRD non-goal, out of scope).
