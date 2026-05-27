# Memory Handoff Report

- **Feature:** 007-one-flow-cli
- **Date:** May 25, 2026

## Promoted to project memory
- **One-Command Greenfield Entry Point (`adp run`):** A single CLI entry point that initializes the protocol directories, creates a feature scaffold, validates it, and prints next steps.
- **Spec-Kit Scaffolding (`adp feature`):** Automated generation of Spec-Kit files under `specs/` with sequential numeric prefixes containing `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` that automatically pass deterministic spec validation.
- **Short-Name and Feature Slug Derivation:** Parses feature descriptions to derive lowercase kebab-case short names, filters common stop words, and scans existing `specs/` directories to determine the next sequential numeric prefix.
- **Active Feature Pointer Update:** Automatically configures `.specify/feature.json` to point to the newly created feature directory.
- **Developer Keyword Sanitization:** Sanitizes developer keywords like `TODO`, `TBD`, `FIXME`, `XXX`, and `NEEDS CLARIFICATION` with safer, validator-friendly phrasing (e.g. "pending item", "to be decided", etc.).

## Architecture updated
- **`bin/adp.js`:**
  - Extended CLI router and help output with `feature <description>` and `run <description>` commands.
  - Implemented `createFeatureScaffold`, `createShortName`, `resolveNextFeatureDirectory`, and `sanitizeArtifactText` helper functions.
  - Implemented `renderSpec`, `renderPlan`, `renderTasks`, and `renderRequirementsChecklist` template rendering functions to build validator-compliant markdown scaffolds.
- **`README.md`:** Added CLI command documentation for the one-command start workflow (`adp run` and `adp feature`).
- **`.specify/feature.json`:** Configured to point to the active feature directory.

## Verification promoted
- **Integration Tests (`validators/scripts/test-cli.js`):**
  - Added CLI integration tests verifying `feature` creates valid Spec-Kit files.
  - Added CLI integration tests verifying `run` initializes, scaffolds, and validates a feature on an empty sandbox.
  - Added input validation tests verifying required arguments and path-traversal safeguards.
- **Validation Commands:**
  - Verified suite compliance by running `npm run validate` and `npm run test:cli`.
