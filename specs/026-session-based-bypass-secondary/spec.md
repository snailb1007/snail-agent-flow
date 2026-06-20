# Session Based Bypass Secondary

## Goal

Add a session-scoped bypass substrate for non-critical secondary gates. The bypass must be temporary, bounded by TTL, visible in command output, and audited to disk so maintainers can unblock local work without weakening primary validation or security gates.

## Non-Goals

- Bypass `validate-spec`, security, or other primary/critical gates.
- Create persistent repository configuration for bypasses.
- Automatically mutate project ledger or claim state when a bypass is used.
- Add network calls or external approval services.

## Acceptance Criteria

1. `adp bypass <gate-id> --ttl <seconds> --reason <text>` creates an active bypass only for supported secondary gates: `budget`, `lease`, and `diff-hygiene`.
2. Critical gates such as `validate-spec` and `security` fail closed and cannot be bypassed.
3. TTL is required to be a positive integer when supplied, defaults to one hour, and is capped at 24 hours.
4. Active bypass state is stored in `.ai/state/session-bypass.json`, and the state file is added to `.gitignore` when possible.
5. Bypass create and clear actions append audit records to `.ai/signals/bypass.jsonl`.
6. Existing secondary gate checks for budget enforcement, lease check, and diff hygiene honor active bypasses and emit warnings.

## Test Strategy

- Validate the feature packet with `node validators/scripts/validate-spec.js`.
- Run focused substrate tests with `node validators/scripts/test-session-bypass.js`.
- Run integration coverage with `node validators/scripts/test-cli.js` and `node validators/scripts/test-diff-hygiene.js`.
- Run relevant lint/test commands before handoff.

## Behavior-Preservation Rules

- Preserve default behavior when no bypass is active.
- Keep bypass handling opt-in and command-scoped.
- Fail closed for unsupported or critical gates.
- Preserve existing secondary gate warning patterns when bypasses are honored.

## User Scenarios

### Primary Scenario

A maintainer needs to temporarily skip a secondary local gate during a time-boxed maintenance workflow. They create a bypass with an explicit reason and TTL, run the blocked command, and later clear bypasses. The action remains visible in `.ai/signals/bypass.jsonl`.

## Functional Requirements

- FR-001: The CLI must support creating, listing, and clearing session bypasses.
- FR-002: The bypass library must normalize gate ids case-insensitively.
- FR-003: The bypass library must reject critical gates and unsupported gate ids.
- FR-004: The bypass library must validate TTL as a positive bounded integer number of seconds.
- FR-005: Active bypasses must expire automatically based on `expires_at`.
- FR-006: Bypass create and clear operations must append JSONL audit records.
- FR-007: Integrated secondary gates must treat active bypasses as successful with an explicit warning.

## Assumptions

- Secondary gates are local developer-safety checks, not release/security controls.
- The first supported gate allowlist is `budget`, `lease`, and `diff-hygiene` because those are the currently integrated bypass call sites.
