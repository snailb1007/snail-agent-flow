---
phase: 15-strict-initialization-checks-and-detailed-installation-guide
plan: 01
status: complete
completed: 2026-05-26
---

# Summary — Enrich INSTRUCTIONS_DB structured records

## Findings verified

- The original `INSTRUCTIONS_DB` in `lib/tool-validator.js` contained only two fields (`description` and `instructions`) per tool, which did not provide enough structured fields to generate the new layered terminal + Markdown repair guide outputs.
- Extended the records in `INSTRUCTIONS_DB` for the required tools (`gsd`, `superpowers`, `spec-kit`, and `gstack`) to include 8 new fields while preserving the existing fields to maintain backward compatibility.

## Changes

- **`lib/tool-validator.js`**
  - Added new fields (`purpose`, `whyRequired`, `detectionHint`, `checkedPaths`, `installCommands`, `workspaceFallback`, `homeFallback`, `verifyCommand`) to every record in `INSTRUCTIONS_DB`.
  - Preserved existing fields (`description`, `instructions`) intact so that existing callers function without modification.

## Verification

- Verified that all fields are present and correctly typed for each tool using inline Node verification:
  - Checked that `getToolInstructions` lookup operates seamlessly and fuzzy-matches tool names.
  - Asserted that no network-resolution keywords (e.g. `curl`, `wget`, `http`) exist in the `installCommands`.
  - Ran `npm test` successfully.
