# Known Risks

- **Path Drift**: Specs written to legacy locations (e.g. `.ai/specs/current/` or `.specify/specs/`) diverge from the canonical `specs/` location. Prevented by automated path verification.
- **Infinite Self-Repair Loops**: Code writing agents attempting to fix validation issues repeatedly without bound. Prevented by validation retry limits (max 3 retries).
- **Context Fragmentation**: Loss of project decisions across sessions. Prevented by requiring memory handoff on change.
