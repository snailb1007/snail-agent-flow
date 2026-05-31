---
name: atlas-auto-loop
description: Use when asked to run or continue the autonomous ATLAS Loop from the current flow state.
---

# ATLAS Auto Loop Skill

Use this skill as the entry point for autonomous ATLAS Loop operation. It coordinates the existing ATLAS control skills rather than redefining their stage logic.

## Source of Truth

Read the controller contract before acting:

`../atlas-routing/reference/controller-contract.md`

That contract documents the stage action, gate, post-gate, HIL stops, and verify-command resolution. If this skill and the contract differ, follow the contract.

## Guardrails

- Load `.ai/state/flow-state.json` to determine the current stage and status.
- Resolve stage metadata from `.ai/flows/atlas-flow.yaml`.
- Follow the current stage's `agent_action`, then run its `gate`, then run `post_gate` only after a passing gate.
- Re-read flow state after every transition and continue until `stage = settle` and `status = done`.
- Pause for human input on the HIL stops documented in the controller contract.
- Use `.claude/skills/contracts` for artifact contract resolution.
- Do not read or create `.ai/state/flow-ledger.json`.
