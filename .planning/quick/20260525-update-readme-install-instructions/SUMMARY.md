---
slug: update-readme-install-instructions
status: complete
completed: 2026-05-25
---

# Summary — Add Installation Instructions to README

## Findings verified

- The `README.md` was indeed missing any installation or local setup details, specifically instructions on cloning the repository, installing package dependencies, and registering the global `adp` and `saf` CLI commands.

## Changes

- [README.md](file:///c:/Users/ADMIN/source/repos/snail-agent-flow/README.md)
  - Created a new `## Installation` section directly after the introduction.
  - Documented steps for cloning the repository, running `npm install`, linking CLI binaries globally using `npm link` (or `npm install -g .`), and running `saf doctor` to verify setup.

## Verification

- Spec validation gate (`node validators/scripts/validate-spec.js`) runs and passes successfully.
- Manual verification of the modified `README.md` file structure and formatting.
