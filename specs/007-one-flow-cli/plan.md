# Implementation Plan: One-Flow CLI

**Branch**: `007-one-flow-cli` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

- Extend `bin/adp.js` help and router with two commands:
  - `feature <description>` creates a complete Spec-Kit artifact scaffold.
  - `run <description>` initializes the protocol if needed, creates a feature scaffold, validates it, and prints next steps.
- Add internal helpers for feature description parsing, short-name generation, numeric prefix selection, artifact writing, active feature pointer updates, and safe duplicate checks.
- Generate conservative artifact content that satisfies the deterministic validator while clearly marking implementation tasks as pending.
- Update README CLI documentation to show the product-level flow for new and existing projects.
- Extend CLI integration coverage in `validators/scripts/test-cli.js`.

## Verification Plan

- Run `node validators/scripts/validate-spec.js` before implementation.
- Run `npm run validate` after updating the feature artifacts.
- Run `npm run test:cli` after CLI/test changes.
- Run `npm test` before completion.

## Implementation Notes

- Keep all logic zero-dependency to preserve the existing CLI packaging model.
- Do not modify validator semantics unless a generated artifact uncovers a real mismatch in the current contract.
- Generated artifacts should be deterministic enough for integration tests while still carrying the user's feature description.

## Files To Change

- `bin/adp.js`
- `validators/scripts/test-cli.js`
- `README.md`
- `specs/007-one-flow-cli/*`
- `.specify/feature.json`
