# Implementation Plan: ATLAS Loop Refactor

## Proposed Changes

### Core Engine

#### [MODIFY] [flow-engine.js](file:///Volumes/D/snail-agent-flow/lib/flow-engine.js)
Update flow engine to support v2.0 flow state, ATLAS stages, and custom routing/skills.

#### [MODIFY] [init-checks.js](file:///Volumes/D/snail-agent-flow/lib/init-checks.js)
Integrate validate-drift check into strict validation gate.

#### [NEW] [validate-drift.js](file:///Volumes/D/snail-agent-flow/lib/validate-drift.js)
Enforce workspace boundaries and detect path drift.

### CLI

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
Support flow-state.json v2.0 and update doctor/status commands.

### Skills

#### [NEW] [atlas-routing](file:///Volumes/D/snail-agent-flow/.claude/skills/atlas-routing/SKILL.md)
#### [NEW] [atlas-gates](file:///Volumes/D/snail-agent-flow/.claude/skills/atlas-gates/SKILL.md)
#### [NEW] [atlas-settle](file:///Volumes/D/snail-agent-flow/.claude/skills/atlas-settle/SKILL.md)
#### [NEW] [atlas-review](file:///Volumes/D/snail-agent-flow/.claude/skills/atlas-review/SKILL.md)

### Tests

#### [NEW] [test-atlas-e2e.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-atlas-e2e.js)
E2E integration test suite simulating full A->T->L->A->S pipeline loop.

## Verification Plan

### Automated Tests
- Run `node validators/scripts/test-atlas-e2e.js`
- Run full validation suite: `npm test`
