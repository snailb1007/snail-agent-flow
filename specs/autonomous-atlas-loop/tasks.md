# Autonomous ATLAS Loop — Tasks

## Component 1: Machine-readable Contract

- [x] 1.1 Extend `atlas-flow.yaml` with `agent_action`, `gate`, `post_gate`, `verify_command` per stage
- [x] 1.2 Create `controller-contract.md` human docs

## Component 2: Script Fixes

- [x] 2.1 `score-and-claim.js`: Add `--auto --description` mode (default all=1, STANDARD)
- [x] 2.2 `score-and-claim.js`: Separate BUGFIX/PROTOTYPE override → work_mode vs risk_profile
- [x] 2.3 `score-and-claim.js`: Sync `.specify/feature.json` after flow-state write
- [x] 2.4 `handleLease` in `adp.js`: Normalize file path to absolute via repoRoot
- [x] 2.5 `handleLease` in `adp.js`: Sync locks into `flow-state.json` on acquire/release
- [x] 2.6 `lay-preflight.js`: Add `.ai/locks/` fallback scan with state sync
- [x] 2.7 Create `settle-full.js` with configurable verify command resolution chain

## Component 3: Agent Instructions

- [x] 3.1 Rename `appendAtlasGuidelines` → `upsertAtlasGuidelines` with regex replace
- [x] 3.2 Update `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` with Autonomous ATLAS Loop section

## Component 4: Deterministic Rail Tests

- [x] 4.1 Tests 1-6: score-and-claim (auto, full JSON, pointer sync, mismatch, bugfix, prototype)
- [x] 4.2 Tests 7-8: transition (align→trace, skip-fast)
- [x] 4.3 Tests 9-12: handleLease (sync acquire, sync release, path norm, env root)
- [x] 4.4 Tests 13-15: lay-preflight (pass, fallback-sync, fail)
- [x] 4.5 Tests 16-17: act-evaluator (block, pass)
- [x] 4.6 Tests 18-19: settle-full (full sequence, command chain)
- [x] 4.7 Tests 20-22: upsert (migrate, idempotent, preserves)
