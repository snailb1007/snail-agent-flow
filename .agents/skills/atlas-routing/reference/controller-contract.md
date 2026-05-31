# Autonomous ATLAS Loop — Controller Contract

> **Source of truth**: [atlas-flow.yaml](../../../../.specify/templates/atlas-flow.yaml)
> This document is human-readable documentation. If it drifts from the YAML, the YAML wins.

## Stage → Action → Gate → Post-Gate Mapping

| Stage | Agent Action | Gate Script | Post-Gate |
|-------|-------------|-------------|-----------|
| **align** | Assess feature/bug. Run `score-and-claim.js --auto --description "..."` or full JSON payload. | (inline in score-and-claim) | `transition.js` |
| **trace** | Create `specs/{slug}/spec.md`, `plan.md`, `tasks.md` via speckit skills. | `validate-spec.js` | `transition.js` |
| **lay** | Write failing tests. Acquire leases via `saf lease <file>`. | `lay-preflight.js` | `transition.js` |
| **act** | Implement per `tasks.md`. Run tests. Commit atomically. | `act-evaluator.js` | `transition.js` |
| **settle** | Review code. Update memory. | `settle-full.js` | (flow complete) |

## Autonomous Loop Algorithm

```
1. Load .ai/state/flow-state.json
2. Read current stage
3. Read atlas-flow.yaml for stage's agent_action
4. Execute the agent_action (skills, research, coding)
5. Run the stage's gate script
6. If gate FAIL → fix issues, retry from step 4
7. If gate PASS → run post_gate (transition.js)
8. Loop back to step 1
9. Stop when stage = settle AND status = done
```

## Human-in-the-Loop (HIL) Stops

The autonomous loop MUST pause and request human approval when:

1. **validate-spec.js fails 3 times** → generates human review packet at `.ai/reviews/{slug}/human-review.md`
2. **FULL risk profile at act stage** → requires human sign-off before implementation
3. **Unresolved ambiguity** → agent must not proceed with guesses on P1 decisions

## Verify Command Resolution (Settle Stage)

`settle-full.js` resolves the verify command in priority order:
1. CLI argument: `--cmd "npm run validate"`
2. `flow-state.json.verify_command`
3. `atlas-flow.yaml` settle stage `verify_command`
4. Default: `npm test`

## Key Contracts

- `score-and-claim.js` MUST sync `.specify/feature.json` after writing flow-state
- `handleLease` MUST sync locks into `flow-state.json.locks`
- BUGFIX/PROTOTYPE overrides go to `work_mode`, `risk_profile` stays in {FAST, STANDARD, FULL}
- After every gate PASS, agent MUST run `transition.js` before proceeding
- `lay-preflight.js` falls back to scanning `.ai/locks/` and syncs into state
