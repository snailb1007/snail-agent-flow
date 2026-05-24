# 0002. Deterministic Spec Validator

## Status

Accepted

## Context

We need to enforce structural validation rules, verify heading completeness, check path and file existence, scan for placeholders, and manage retry/block states during feature specification validation.

Using LLM-as-judge or heavy runtime frameworks for checking simple structural rules is slow, expensive, and introduces non-deterministic validation outcomes.

## Decision

Implement a Node.js-based deterministic validator at `validators/scripts/validate-spec.js` that checks spec folders using regular expressions, string search, and directory scans.

The script will fail validation and update the unified `.ai/state/run-state.json` file on:
1. Missing files (`spec.md`, `plan.md`, `tasks.md`).
2. Missing headings or incorrect checklists.
3. Legacy/shadow spec paths (path drift).
4. Case-insensitive placeholder strings (e.g. `TODO`, `TBD`, `FIXME`).

If validation fails consecutively three times, the validator generates a markdown human review packet at `.ai/reviews/<feature-slug>/human-review.md` and halts with exit code 10.

## Consequences

- Faster, cheaper, and 100% reproducible validation.
- Easy integration into local git hooks or developer scripts.
- No reliance on external LLM APIs for verifying structural specs requirements.
- Standardized, machine-parseable error logging in `run-state.json`.
