# Autonomous ATLAS Loop — Plan

## Proposed Changes

### Component 1: Machine-readable Contract (atlas-flow.yaml)

#### [MODIFY] `.specify/templates/atlas-flow.yaml`
Extend each stage with `agent_action`, `gate`, `post_gate` fields. Add `verify_command` to settle stage. This is the source of truth for the autonomous loop controller.

#### [NEW] `.claude/skills/atlas-routing/reference/controller-contract.md`
Human-readable companion documenting stage → action → gate → post_gate mapping from YAML.

---

### Component 2: Script Fixes

#### [MODIFY] `.claude/skills/atlas-routing/scripts/score-and-claim.js`
- Add `--auto --description "<text>" [--slug <slug>]` mode with default risk scores (all=1, STANDARD)
- Separate override profile (BUGFIX/PROTOTYPE) → `work_mode` vs risk-based → `risk_profile`
- Sync `.specify/feature.json` after writing flow-state

#### [MODIFY] `bin/adp.js` (`handleLease` function)
- Normalize file path to `path.resolve(repoRoot, file)` before LeaseManager
- After acquire/release: load flow-state → update `state.locks` with workspace-relative → save

#### [MODIFY] `.claude/skills/atlas-gates/scripts/lay-preflight.js`
- Fallback scan `.ai/locks/` when `state.locks` empty → sync discovered locks into state → save → then PASS

#### [NEW] `.claude/skills/atlas-settle/scripts/settle-full.js`
- Orchestrate: verify (configurable command) → signal-log → release-locks → mark done
- Verify command resolution: CLI arg → flow-state.verify_command → atlas-flow.yaml → npm test

---

### Component 3: Agent Instructions

#### [MODIFY] `bin/adp.js` (`appendAtlasGuidelines` → `upsertAtlasGuidelines`)
- Rename function, rewrite with regex replace for idempotent migration
- Update all call sites

#### [MODIFY] `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`
- Replace `## ATLAS Loop` with `## Autonomous ATLAS Loop`

---

## Verification Plan

### Automated Tests

22 deterministic rail tests under `tests/`:

```bash
npm test    # full suite including new tests
```

Tests cover: score-and-claim auto mode, pointer sync, override separation, transition, lease sync/path normalization, lay-preflight fallback, act-evaluator, settle-full command chain, upsert idempotency.

### Manual Verification

- Run `node bin/adp.js init` on a fresh repo and verify `## Autonomous ATLAS Loop` appears in generated instruction files
- Run full ATLAS loop manually on a test feature to verify end-to-end flow
