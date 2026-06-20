# Implementation Plan: Session Based Bypass Secondary

**Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

- Harden `lib/session-bypass.js` as the substrate for session-scoped secondary gate bypasses.
- Add an explicit bypass allowlist for currently integrated secondary gates: `budget`, `lease`, and `diff-hygiene`.
- Reject critical or unknown gates fail-closed.
- Validate TTL as a positive bounded integer, with a one-hour default and 24-hour cap.
- Write create and clear audit events to `.ai/signals/bypass.jsonl`.
- Keep existing integrations in `bin/adp.js` and `lib/diff-hygiene.js` honoring active bypasses through `checkBypass`.
- Extend focused and CLI tests for TTL, allowlist, and audit behavior.

## Impacted Files

- `lib/session-bypass.js`
- `bin/adp.js`
- `validators/scripts/test-session-bypass.js`
- `validators/scripts/test-cli.js`
- `specs/026-session-based-bypass-secondary/spec.md`
- `specs/026-session-based-bypass-secondary/plan.md`
- `specs/026-session-based-bypass-secondary/tasks.md`

## Risks

- Bypass semantics must stay limited to secondary gates; primary validation and security gates remain non-bypassable.
- TTL parsing must fail closed so invalid input cannot create an unbounded bypass.
- Audit writes must not block command cleanup if `.ai/signals` is temporarily unavailable.

## Verification Plan

- `node validators/scripts/validate-spec.js`
- `node validators/scripts/test-session-bypass.js`
- `node validators/scripts/test-diff-hygiene.js`
- `node validators/scripts/test-cli.js`
- `node bin/lint.mjs --root .`
- `npm test` when broader regression verification is required before handoff.

## Artifact Layout

- `specs/026-session-based-bypass-secondary/spec.md`
- `specs/026-session-based-bypass-secondary/plan.md`
- `specs/026-session-based-bypass-secondary/tasks.md`
- `specs/026-session-based-bypass-secondary/checklists/requirements.md`
