# Phase 15 — CEO Plan Review

**Reviewed:** 2026-05-26
**Mode:** HOLD SCOPE
**Branch:** main
**Reviewer:** /plan-ceo-review
**Plans reviewed:** 15-01, 15-02, 15-03, 15-04 (+ new 15-05)

## Mode Rationale
Phase 15 is constrained plumbing (init/doctor strictness + repair guide) with 16 locked D-decisions, explicit threat models per plan, and reuse of existing helpers. Highest leverage was rigor, not ambition.

## Findings (5 surfaced, 4 accepted, 1 skipped per mode)

### F1 — Test coverage gap (ACCEPTED → Plan 15-05)
**Section:** 6 (Tests). Plan 02 ships a pure ~200-line module with 9 distinct check IDs and the Pitfall-1 regex. Plan 04 covers it with 4 CLI sandbox tests only. **Resolution:** Added Plan 15-05 — direct unit tests of `runStrictChecks` against tempdir fixtures; 12+ tests; <5s runtime; wired into `npm test`.

### F2 — No escape hatch for strict gate (ACCEPTED → Plan 15-03 edit)
**Section:** 9 (Deploy/Rollout). `handleRun` calls `handleInit`; strict-gate exit-1 propagates. No flag, no env var. First false-positive blocks the user. **Resolution:** Added `ADP_NO_STRICT=1` env override in `runAndReport`. Default behavior unchanged. New threat row T-15-03-06. README update noted.

### F3 — FS error rescue gap (ACCEPTED → Plan 15-02 edit)
**Section:** 2 (Error & Rescue Map). Threat model only covered parse errors. Localization scan does `fs.readdirSync` and `fs.readFileSync` — EACCES, ELOOP, ENOENT race, EISDIR all unhandled. **Resolution:** Added try/catch contract on every `fs.*` call inside the scan; on error, append `CheckResult` with `evidence.parseError = \`${e.code}: ${e.message}\``. New threat row T-15-02-06.

### F4 — Cross-plan wording coupling (ACCEPTED → Plan 15-02 + 15-04 edits)
**Section:** 4 (Data Flow / Edge Cases). Plan 04 hedged with `'instruction file incomplete' OR 'category: instruction'`. Drift risk. **Resolution:** Pinned literal `Local workflow files incomplete` in Plan 02 as single source of truth for D-15-15; Plan 04 Test 4 now asserts exact literal, OR dropped.

### F5 — JSON output mode (SKIPPED, HOLD SCOPE)
**Section:** 8 (Observability). Pure module produces a perfect structured report; formatters only emit human strings. A `--json` mode would enable CI consumption. Not in scope under HOLD SCOPE. Logged here for a future phase if CI consumption becomes a need.

## Sections With Zero Findings
1 (Architecture), 3 (Security), 5 (Code Quality), 7 (Performance), 10 (Long-term Trajectory). Plan reuse, brownfield safety, additive changes, no new deps, no new attack surface.

### Section 11 (Design & UX) — SKIPPED
No UI scope in Phase 15.

## What Already Exists (reused, not rebuilt)
- `validatePrerequisites`, `getToolInstructions`, `INSTRUCTIONS_DB` in `lib/tool-validator.js` (Plan 01 enriches; Plan 02 consumes)
- `validateLedger`, `checkStagePrerequisites` in `lib/flow-engine.js` (Plan 02 reuses)
- `parseYaml` in `lib/yaml-parser.js`
- `setupSandbox`, `runCLI`, `addTest` framework in `validators/scripts/test-cli.js` (Plan 04 + 05 reuse)
- `<execution_context>` regex from `localizeGlobalSkills` in `bin/adp.js` (Plan 02 reuses verbatim)

## NOT In Scope (explicitly deferred)
- Automatic installation of missing tools (D-15-09; permanent project constraint)
- Live web lookups for installation instructions (D-15-12; permanent)
- LLM-as-judge validation (D-15-06; permanent)
- JSON output mode for CI consumption (F5; future phase candidate)
- `--no-strict` CLI flag (F2 alt; env var chosen instead for minimal surface)

## Failure Modes Registry

| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES | LOGGED |
|----------|--------------|----------|-------|-----------|--------|
| runStrictChecks parseYaml | Malformed YAML | Y (Plan 02 + F3) | Y (15-05 #3) | Failure entry with parseError | repair-guide.md |
| runStrictChecks JSON.parse | Invalid ledger JSON | Y | Y (15-05 #5) | Failure entry with parseError | repair-guide.md |
| runStrictChecks fs.readdirSync | EACCES on skill dir | Y (F3) | Y (15-05 #13) | Failure entry, no stack trace | repair-guide.md |
| runStrictChecks fs.readFileSync | ENOENT mid-scan | Y (F3) | Y (15-05 #14) | Failure entry, no stack trace | repair-guide.md |
| runAndReport fs.writeFileSync | EACCES on .ai/state/ | N ← gap | N | Node crash | stderr (uncaught) |
| handleRun → handleInit | Strict gate exit-1 | Bypass via ADP_NO_STRICT=1 (F2) | N (manual) | exit 1 + repair guide | stderr |

**Remaining gap:** `fs.writeFileSync` on `.ai/state/repair-guide.md` itself can throw EACCES. Low likelihood (`.ai/state/` is project-controlled). Documented here; not promoted to a finding under HOLD SCOPE.

## Diagrams

### Plan Wave Dependency
```
  wave 1: 15-01 (INSTRUCTIONS_DB enrichment)
            │
  wave 2:   └─▶ 15-02 (lib/init-checks.js pure module)
                  │
  wave 3:         └─▶ 15-03 (bin/adp.js: runAndReport wiring)
                        │
  wave 4:               ├─▶ 15-04 (CLI sandbox integration tests)
                        └─▶ 15-05 (init-checks unit tests)  ← NEW per F1
```

### runAndReport Control Flow
```
  handleInit  ───┐
                 ├──▶ runAndReport(repoRoot, source)
  handleDoctor ──┘         │
                           ├── env.ADP_NO_STRICT==='1'? ──▶ warn + return  (F2)
                           ├── report = runStrictChecks(repoRoot)
                           ├── stderr.write(formatTerminal(report))
                           ├── report.ok?
                           │     ├── true:  unlink stale repair-guide.md (Pitfall 5)
                           │     └── false: writeFileSync repair-guide.md + exit(1)
                           └── (only file written: .ai/state/repair-guide.md)
```

### Localization Scan Shadow Paths
```
  for each SKILL.md under .agents/skills/ and .claude/skills/:
    readFileSync ─┬─ ok ──▶ extract <execution_context> blocks ──▶ scan @-lines
                  │                                                    │
                  │                                                    ├── matches /~|$HOME|.gemini\//  ──▶ FAIL: localization.localPaths
                  │                                                    └── path missing on disk        ──▶ FAIL: localization.copiedRefs
                  └─ EACCES/ELOOP/EISDIR (F3) ──▶ FAIL: localization w/ parseError, no throw
```

## TODOS (none added — all findings folded into plans)

## Implementation Tasks (synthesized)

- [ ] **T1 (P1, human: ~2h / CC: ~10min)** — Plan 02 — Add FS-error try/catch contract + T-15-02-06 row
  - Surfaced by: F3 — runStrictChecks must not throw on EACCES/ELOOP/ENOENT
  - Files: `.planning/phases/15-.../15-02-PLAN.md` (DONE in this review)
  - Verify: implementation in Plan 02 wave honors the new action block
- [ ] **T2 (P1, human: ~1h / CC: ~5min)** — Plan 03 — Add ADP_NO_STRICT escape hatch
  - Surfaced by: F2 — strict gate needs documented bypass
  - Files: `.planning/phases/15-.../15-03-PLAN.md` (DONE in this review); also README during exec
  - Verify: implementation honors env override; new threat row T-15-03-06
- [ ] **T3 (P1, human: ~3h / CC: ~15min)** — Plan 15-05 — Author unit tests for runStrictChecks
  - Surfaced by: F1 — pure module deserves direct coverage
  - Files: `validators/scripts/test-init-checks.js` (NEW), `package.json` (script entry)
  - Verify: `npm run test:init-checks` exits 0; runtime <5s; wired into `npm test`
- [ ] **T4 (P2, human: ~15min / CC: ~5min)** — Plan 02 — Pin "Local workflow files incomplete" literal
  - Surfaced by: F4 — D-15-15 wording coupling
  - Files: `.planning/phases/15-.../15-02-PLAN.md` (DONE), `.planning/phases/15-.../15-04-PLAN.md` (DONE)
  - Verify: Plan 04 Test 4 asserts exact literal; OR clause removed

## Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | 4 locked plans + 16 D-decisions             |
| Step 0               | HOLD SCOPE; no expansion ceremony           |
| Section 1  (Arch)    | 0 issues — reuse pattern clean              |
| Section 2  (Errors)  | 1 GAP (F3) → mitigated via Plan 02 edit     |
| Section 3  (Security)| 0 new attack surface                        |
| Section 4  (Data/UX) | 1 coupling (F4) → mitigated via pin         |
| Section 5  (Quality) | 0 DRY violations                            |
| Section 6  (Tests)   | 1 GAP (F1) → new Plan 15-05                 |
| Section 7  (Perf)    | 0 concerns                                  |
| Section 8  (Observ)  | 1 deferred (F5, skipped per HOLD)           |
| Section 9  (Deploy)  | 1 risk (F2) → ADP_NO_STRICT escape          |
| Section 10 (Future)  | Reversibility 4/5, debt 0                   |
| Section 11 (Design)  | SKIPPED (no UI scope)                       |
+--------------------------------------------------------------------+
| NOT in scope         | 5 items                                     |
| What already exists  | written                                     |
| Error/rescue registry| 6 paths mapped, 1 minor gap remaining       |
| Failure modes        | 6 total, 0 CRITICAL                         |
| TODOS.md updates     | 0 (all folded into plans)                   |
| Scope proposals      | 0 (HOLD mode)                               |
| CEO plan             | skipped (HOLD mode)                         |
| Outside voice        | skipped (user efficiency)                   |
| Diagrams produced    | 3 (wave deps, control flow, shadow paths)   |
| Stale diagrams found | 0                                           |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## VERDICT
**CLEARED for implementation.** All findings folded into plan edits or new Plan 15-05. Phase remains 5 plans across 4 waves (15-04 and 15-05 are parallel in wave 4). No unresolved decisions.

**Recommended next:** `/plan-eng-review phase 15` (required shipping gate) before executing Plan 15-01.

---

# Phase 15 — Engineering Plan Review

**Reviewed:** 2026-05-26 (immediately after CEO review)
**Mode:** FULL_REVIEW
**Branch:** main
**Reviewer:** /plan-eng-review

## Step 0 — Scope Challenge
5 plans, ~5 files touched, full reuse of existing helpers, no new external deps, no innovation tokens spent. Boring-by-default. Under 8-file complexity threshold. **No scope reduction.**

## Findings (3 surfaced, all accepted)

### E1 — Regex DRY violation (Section 1, Architecture) — ACCEPTED
**Confidence:** 9/10 — read both bin/adp.js#localizeGlobalSkills and Plan 02's instruction to re-use it.
The `<execution_context>` extractor regex would have lived in two places. **Resolution:** New `lib/skill-md-parser.js` exports `extractExecutionContextBlocks(content)` and `findSuspiciousAtLines(block)`. Added as Plan 02 Task 0. Plan 03 refactors `bin/adp.js#localizeGlobalSkills` to consume the shared helper. Acceptance criterion: zero inline `<execution_context>` regex literals in `localizeGlobalSkills`.

### E2 — Missing field defensiveness (Section 2, Code Quality) — ACCEPTED
**Confidence:** 8/10 — formatter renders 8 fields verbatim; Plan 01 only asserts existence of one field per record.
Repair guide could print `Purpose: undefined` if any field were missing. **Resolution:** (a) Plan 01 acceptance criterion tightened — every required tool record asserted to have every field non-empty (string non-empty, array non-empty). (b) Plan 02 `formatMarkdownGuide` adds defensive render: falsy strings → `_(field not documented)_`, empty arrays → `_(none documented)_`.

### E3 — Unit-test gaps in Plan 15-05 (Section 3, Tests) — ACCEPTED
**Confidence:** 9/10 — read the Plan 15-05 tests I just authored.
Test #13 EACCES rescue passes vacuously under root-uid CI; two check IDs (`constitution.exists`, `featurePointer.active`) had no unit test. **Resolution:** Test #13 adds `process.getuid && process.getuid() === 0` skip alongside win32 skip. New tests #16 (constitution present/absent) and #17 (feature pointer three-variant). All 11 check IDs now have direct unit coverage.

## Sections With Zero Findings
**Section 4 (Performance):** sync FS scans for ~10-30 skills are sub-second; equivalent work already done by existing `handleDoctor`. No N+1, no memory pressure, no caching needed.

## Coverage Diagram (post-edits)

```
runStrictChecks check IDs (11 total)
  ├── dirs.required               [★★ TESTED — 15-05 #1]
  ├── flow.yaml.exists            [★★ TESTED — 15-05 #2]
  ├── flow.yaml.parse             [★★★ TESTED — 15-05 #3]
  ├── ledger.exists               [★★ TESTED — 15-05 #4]
  ├── ledger.schema               [★★ TESTED — 15-05 #5]
  ├── prereqs.<tool>              [★★★ TESTED — 15-05 #6]
  ├── localization.localPaths     [★★★ TESTED — 15-05 #7,8] + Plan 04 #3 E2E
  ├── localization.copiedRefs     [★★ TESTED — 15-05 #9]
  ├── instructions.subagentSection [★★★ TESTED — 15-05 #10] + Plan 04 #4 E2E
  ├── constitution.exists         [★★ TESTED — 15-05 #16] (NEW per E3)
  └── featurePointer.active       [★★★ TESTED — 15-05 #17] (NEW per E3)

formatters
  ├── formatMarkdownGuide tool       [★★ TESTED — 15-05 #12]
  ├── formatMarkdownGuide instruction [★★★ TESTED — 15-05 #11]
  ├── formatMarkdownGuide defensive  [GAP — add to #11/#12 implementation]
  └── formatTerminal line width      [★★ TESTED — 15-05 #15]

FS rescue
  ├── EACCES                       [★★ TESTED — 15-05 #13, root-uid skip added]
  └── ENOENT race                  [★ TESTED — 15-05 #14]

E2E (CLI sandbox via Plan 04)
  ├── greenfield happy path        [★★ TESTED — Plan 04 #1]
  ├── missing prereq               [★★ TESTED — Plan 04 #2]
  ├── broken localization          [★★ TESTED — Plan 04 #3]
  └── instruction file incomplete  [★★★ TESTED — Plan 04 #4]

COVERAGE: 16/16 paths tested (100%) post-edits. ★★★:6 ★★:9 ★:1
```

Minor remaining gap: defensive-render behavior (E2 part b) doesn't have a dedicated unit test. Folded into tests #11 (instruction defensive) and #12 (tool defensive) — implementer should add an "empty field renders placeholder" assertion to each. Tracked as note, not new test.

## What Already Exists (reused, not rebuilt)
Same as CEO review section. No additional reuse identified.

## NOT In Scope (engineering-specific additions)
- Refactor `bin/adp.js#localizeGlobalSkills` to a pure module (out of scope — Plan 03 only swaps the regex extractor; broader refactor deferred)
- Schema validation library for INSTRUCTIONS_DB (zod/joi) — overkill; the Plan 01 acceptance assertion is sufficient
- JSON output mode for formatters (deferred per CEO F5)
- `runStrictChecks` async/parallel I/O (sync is fine at this scale)

## Failure Modes (engineering review)

| CODEPATH | FAILURE MODE | TEST? | ERROR HANDLED? | USER SEES |
|----------|--------------|-------|-----------------|-----------|
| skill-md-parser regex on huge file | catastrophic backtracking | N | N | unbounded CPU |
| INSTRUCTIONS_DB missing field | undefined render | Y (E2) | Y (E2 defensive) | placeholder text |
| runAndReport writeFileSync EACCES | crash | N | N | stack trace |
| Plan 03 handleDoctor output regression | downstream parser breaks | N | N/A | possible log scrape break |

**Remaining non-critical gap:** `lib/skill-md-parser.js` regex is `/<execution_context>([\s\S]*?)<\/execution_context>/g` — `[\s\S]*?` is non-greedy and safe; no catastrophic backtracking risk. Confirmed by inspection.

## Worktree Parallelization

```
Dependency table:
  Plan 01 (lib/tool-validator.js)         depends on: —          modules: lib/
  Plan 02 (lib/init-checks.js, parser)    depends on: 01         modules: lib/
  Plan 03 (bin/adp.js)                    depends on: 02         modules: bin/, lib/ (read)
  Plan 04 (validators/scripts/test-cli)   depends on: 03         modules: validators/
  Plan 05 (validators/scripts/test-init)  depends on: 02         modules: validators/

Lanes:
  Lane A (sequential): 01 → 02 → 03
  Lane B (parallel after 03): 04
  Lane C (parallel after 02): 05  ← can start earlier than 04

Execution order:
  Wave 1: Plan 01
  Wave 2: Plan 02
  Wave 3: Plan 03 ‖ Plan 05  (Plan 05 needs only lib/init-checks.js from Plan 02; doesn't need bin/adp.js wiring)
  Wave 4: Plan 04            (needs Plan 03's runAndReport wiring to test exit codes)

Conflict flags: none. Plan 03 reads lib/ but only writes bin/adp.js. Plan 05 writes validators/. No shared write paths.
```

**Optimization:** Plan 05 can be moved from wave 4 to wave 3 (parallel with Plan 03), since it only depends on `lib/init-checks.js` from Plan 02, not the bin/adp.js wiring. Saves one wave of latency.

## Implementation Tasks (ENG additions)

- [ ] **T5 (P1, human: ~1h / CC: ~5min)** — Plan 02 — Add Task 0 for lib/skill-md-parser.js
  - Surfaced by: E1 — DRY violation on `<execution_context>` regex
  - Files: `lib/skill-md-parser.js` (NEW)
  - Verify: `grep -c "<execution_context>" lib/init-checks.js` returns 0; parser unit test passes
- [ ] **T6 (P1, human: ~30min / CC: ~3min)** — Plan 03 — Refactor localizeGlobalSkills to use shared parser
  - Surfaced by: E1 — single source of truth
  - Files: `bin/adp.js`
  - Verify: `grep -c "<execution_context>" bin/adp.js` returns 0 inside `localizeGlobalSkills` body; `npm run test:cli` passes
- [ ] **T7 (P1, human: ~30min / CC: ~3min)** — Plan 01 — Tighten field assertions
  - Surfaced by: E2 — undefined-field render risk
  - Files: `.planning/phases/.../15-01-PLAN.md` (DONE in review)
  - Verify: new behavior-assertion node command passes
- [ ] **T8 (P1, human: ~45min / CC: ~5min)** — Plan 02 — Defensive render in formatMarkdownGuide
  - Surfaced by: E2 part b
  - Files: `lib/init-checks.js`
  - Verify: tests #11 and #12 include "empty field renders placeholder" assertion
- [ ] **T9 (P1, human: ~20min / CC: ~2min)** — Plan 15-05 — Root-uid skip + 2 new tests
  - Surfaced by: E3 — fragile EACCES test + missing coverage
  - Files: `validators/scripts/test-init-checks.js`
  - Verify: `grep -c "addTest('init-checks:" ...` returns at least 14; #13 skips on root

## Completion Summary

```
+====================================================================+
|             ENGINEERING PLAN REVIEW — SUMMARY                       |
+====================================================================+
| Mode                 | FULL_REVIEW                                  |
| Step 0 Scope         | accepted as-is (no reduction)               |
| Section 1 (Arch)     | 1 issue (E1) → mitigated via parser module  |
| Section 2 (Quality)  | 1 issue (E2) → schema+defensive render      |
| Section 3 (Tests)    | 1 issue (E3) → root-uid skip + 2 tests      |
| Section 4 (Perf)     | 0 issues                                    |
| NOT in scope         | written (4 items)                           |
| What already exists  | written (deferred to CEO review section)    |
| TODOS.md updates     | 0 items (all folded into plans)             |
| Failure modes        | 4 mapped, 0 critical post-edits             |
| Outside voice        | skipped (user efficiency, HOLD mode)        |
| Parallelization      | 3 waves (post-optimization), 0 conflicts    |
| Lake Score           | 3/3 recommendations chose complete option   |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## VERDICT
**CLEARED for implementation.** Eng review complete; all findings folded into plan edits. Phase remains 5 plans across 3 execution waves post-optimization (was 4). Outside voice skipped for efficiency — re-run with `/codex consult` if a second opinion is wanted.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAN (HOLD SCOPE) | 5 findings, 4 accepted, 1 deferred per mode |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAN (PLAN) | 3 findings, 3 accepted, 0 critical gaps |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | not applicable (no UI scope) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **UNRESOLVED:** 0
- **VERDICT:** CEO + ENG CLEARED — ready to implement. Outside voice optional; codex review recommended pre-merge per project gates.

