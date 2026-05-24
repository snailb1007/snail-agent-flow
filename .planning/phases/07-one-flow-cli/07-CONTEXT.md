---
phase: "07"
name: "one-flow-cli"
created: 2026-05-25
---

# Phase 7: one-flow-cli — Context

## Decisions

- **D-07-01: Feature and Run Commands**: We will extend the CLI binary `bin/adp.js` to expose `feature <description>` and `run <description>`.
- **D-07-02: Feature Slug Generation**: The CLI will automatically derive the next three-digit numeric feature directory name prefix under `specs/`. It will filter out common stop words from the description to create a clean kebab-case name, falling back to `new-feature` if the resulting list is empty.
- **D-07-03: Text Sanitization**: The CLI will sanitize typical validator placeholder keywords (e.g. `TODO`, `TBD`, `FIXME`, `XXX`) from user feature descriptions before writing them to generated markdown templates to ensure files can pass the validator out of the box.
- **D-07-04: Zero-Configuration Validation**: The `run` command will perform `adp init`, scaffold the feature, and automatically run `validate-spec` to verify structural completeness. It will exit with a non-zero code if validation fails.
- **D-07-05: CWD Path Resolution**: All commands will resolve the target project directory using `process.cwd()` (overridden by `PROJECT_ROOT` and `REPO_ROOT` env variables) rather than the package root directory, enabling the CLI to run correctly on any target workspace.

## Discretion Areas

- The layout and default content of generated `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` templates are designed to pass our deterministic validators.
- The stop words list used during slug derivation can be expanded or updated in `bin/adp.js` without violating the spec.

## Deferred Ideas

- Interactive walkthrough of the newly created feature checklist (deferred to future tools or IDE-specific helper agents).
- Automatic git feature branch creation during `feature` or `run` (handled externally by existing Git command pipelines or `speckit-git-feature`).
