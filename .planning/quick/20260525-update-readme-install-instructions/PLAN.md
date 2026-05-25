---
slug: update-readme-install-instructions
created: 2026-05-25
---

# Quick Task: Add Installation Instructions to README

Add an Installation section to the root `README.md` to describe how to clone, install dependencies, and set up the local CLI commands (`adp` and `saf`) globally.

## Proposed Changes

- Modify [README.md](file:///c:/Users/ADMIN/source/repos/snail-agent-flow/README.md) to add a new `## Installation` section right before `## CLI`.
  - The section will explain:
    1. Cloning the repository.
    2. Installing dependencies via `npm install`.
    3. Registering the CLI globally via `npm link` or `npm install -g .`.
    4. Verifying the installation using the `doctor` command.

## Verification

- Ensure `README.md` syntax is valid markdown.
- Run `npm test` (or the subset of tests we can run on Windows) to verify no regressions.
