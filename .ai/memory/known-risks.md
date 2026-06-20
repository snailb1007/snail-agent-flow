# Known Risks

- **Path Drift**: Specs written to legacy locations (e.g. `.ai/specs/current/` or `.specify/specs/`) diverge from the canonical `specs/` location. Prevented by automated path verification.
- **Infinite Self-Repair Loops**: Code writing agents attempting to fix validation issues repeatedly without bound. Prevented by validation retry limits (max 3 retries).
- **Context Fragmentation**: Loss of project decisions across sessions. Prevented by requiring memory handoff on change.
- **Bypass Overuse or Abuse**: Risk of disabling local checks indefinitely or attempting to bypass critical verification. Mitigated by restricting bypasses to secondary gates (budget, lease, diff-hygiene), fail-closed logic for critical gates, requiring positive TTL (max 24h), and auditing all actions to `.ai/signals/bypass.jsonl`.

