# Failure Recovery Policy

This document outlines the direct transitions and recovery requirements for stuck pipelines in the AI delivery workflow.

## 1. Recovery Transitions

| Failure Mode | Direct Transition | Recovery Requirement |
|---|---|---|
| **Gate / Validator Blocked** | `NEEDS_HUMAN_REVIEW` | Generate Human Review Packet after 3 consecutive failures. Reset using `adp validate-spec resume`. |
| **Spec Drift** | Return to Spec Stage | Halt implementation, reset downstream stages to `needs_revision` using `handleSpecDrift`, update spec/plan, and re-validate before resuming. |
| **Context Fragmentation** | Trigger Handoff | Save state to `.ai/state/context-handoff.json` using `triggerContextHandoff`, stop session, and restart with a clean session resuming from the handoff file. |
| **Lease Collision** | Back-off / Wait | Exponential back-off using `handleLeaseCollision` (max 3 retries), then notify the operator if locks remain unavailable. |

## 2. Implementation details

- **Spec Drift**: The `handleSpecDrift` engine function rolls back all downstream stages to the specification stage (e.g. `canonical_spec`) and increments the revision counts.
- **Context Handoff**: The handoff artifact `.ai/state/context-handoff.json` captures `resume_stage`, `next_skill`, `context_pack_path`, and `verification_commands` to restore state cleanly in a fresh session.
- **Back-off Calculations**: The exponential delay is computed as $2^{\text{retryCount}} \times 1000$ milliseconds, raising an error after 3 failed attempts.
