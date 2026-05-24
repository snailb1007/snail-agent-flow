# Implementation Plan: CLI Packaging

**Branch**: `005-cli-packaging` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

## Summary

This plan outlines the design and implementation of a zero-dependency local command-line interface (CLI) for Snail Agent Flow. The CLI is registered under the commands `adp` and `saf`. It exposes commands to initialize projects, manage sessions, visualize pipeline status, run sanity checks, trigger spec validation, and verify memory handoffs.

## Technical Context

- **Language/Version**: Node.js (ES6 / CommonJS)
- **Primary Dependencies**: None (Zero third-party runtime dependencies)
- **Storage**: JSON and Markdown files (`.specify/feature.json`, `.ai/state/run-state.json`, `.ai/state/handoff.md`)
- **Testing**: Vanilla Node.js assertion-based test runner (`validators/scripts/test-cli.js`)
- **Target Platform**: macOS/Linux/Windows (Node.js runtime environment)
- **Project Type**: Local Developer Command Line Tool

## Proposed Changes

### Build Tooling & Package Config

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)
- Register `adp` and `saf` under the `"bin"` configuration:
  ```json
  "bin": {
    "adp": "./bin/adp.js",
    "saf": "./bin/adp.js"
  }
  ```
- Add CLI test script to `"scripts"`:
  ```json
  "test:cli": "node validators/scripts/test-cli.js"
  ```
- Update `"test"` script to run `npm run test:cli` alongside existing test suites:
  ```json
  "test": "npm run validate && npm run test:validator && npm run test:pipeline && npm run test:cli"
  ```

### CLI Command Binary

#### [NEW] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
- Implement executable script starting with `#!/usr/bin/env node`.
- Implement argument parsing using native `process.argv` matching:
  - `init`: Safely initialize required folders (`.ai/sessions`, `.ai/memory`, `.ai/reviews`, `.ai/state`, `.specify/templates`, `specs`) and boilerplate templates (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.ai/constitution.md`) if missing.
  - `new-session <name>`: Create a new session file at `.ai/sessions/YYYY-MM-DD-<name>.md` and link active feature pointer.
  - `status`: Retrieve and print active feature info and run state.
  - `doctor`: Validate environment folders, file integrity, and run specs validator.
  - `validate-spec`: Spawn `node validators/scripts/validate-spec.js` as a subprocess.
  - `handoff`: Read and parse `.ai/state/handoff.md` to ensure required headings exist.

### CLI Test Suite

#### [NEW] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)
- Write CLI command tests in vanilla Node.js.
- Tests will cover:
  - CLI prints help usage guide on invalid args.
  - `init` creates correct folders/files in a temporary sandbox directory.
  - `new-session` correctly creates YYYY-MM-DD file.
  - `status` reads mock feature and runs without crash.
  - `doctor` reports missing folder errors.
  - `validate-spec` forwards validator outcome.
  - `handoff` detects correct/incorrect sections.

## Verification Plan

### Automated Tests

- Run CLI test suite:
  ```bash
  node validators/scripts/test-cli.js
  ```
- Run full repository checks:
  ```bash
  npm test
  ```

### Manual Verification

- Run `node bin/adp.js status` in the repository root to verify human-friendly run state report prints correctly.
- Run `node bin/adp.js doctor` to verify current workspace sanity checks pass.
