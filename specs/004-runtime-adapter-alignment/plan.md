# Feature Plan: Templates and Runtime Adapter Alignment

## Proposed Changes

### 1. Feature Pointer Cleanup
- Delete `.ai/state/active-feature.json`.

### 2. JS Validator Update
- Modify `validators/scripts/validate-spec.js` to only read `.specify/feature.json`.
- Add active-feature.json check in the Path Drift validation section to block execution if the deprecated file is found.

### 3. Bash Script Updates
- Update `.specify/scripts/bash/validate-pipeline-state.sh` to read and parse `.specify/feature.json` instead of `.ai/state/active-feature.json`.
- Update `.specify/scripts/bash/validate-gates-and-memory.sh` to read and parse `.specify/feature.json`.
- Update `.specify/scripts/bash/smoke-test.sh` to mock `.specify/feature.json`.
- Move mock fixture state files in `.specify/fixtures/minimal-golden-path/`.

### 4. Runtime Instruction & Constitution Updates
- Align `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` and `.ai/constitution.md` to document the path ownership boundaries.

### 5. Documentation Updates
- Align `docs/artifact-registry.md`, `CONTEXT.md`, and planning files to match the new ownership model.

## Verification Plan

### Automated Verification
- Run `npm test` which executes `npm run validate && npm run test:validator && npm run test:pipeline`.
- Ensure all tests pass.
