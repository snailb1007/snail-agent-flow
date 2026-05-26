# Phase 15: Strict Initialization Checks and Detailed Installation Guides — Research

**Researched:** 2026-05-26
**Domain:** CLI initialization hardening, deterministic post-init validation, structured repair guidance
**Confidence:** HIGH (all findings verified against in-repo source files; no external library decisions required)

## Summary

Phase 15 hardens `adp init` (and `adp doctor`) by inserting a deterministic post-init "strict gate" that re-checks the full local/offline setup surface produced by Phases 9/12/14, classifies every failure as either "tool missing" or "local workflow files incomplete", and emits a layered terminal + Markdown repair artifact. The work is almost entirely **integration glue plus structured data expansion** — no new external dependencies, no new runtimes. The reusable primitives already exist: `validatePrerequisites` in `lib/tool-validator.js`, `checkStagePrerequisites` in `lib/flow-engine.js`, `parseYaml` / `validateLedger` for artifact sanity, and the `localizeGlobalSkills` helper in `bin/adp.js` for the localization signal we must re-inspect.

The main planning decisions are: (1) where the new check/report layer lives as a reusable module so `handleInit` and `handleDoctor` cannot drift, (2) the schema of an enriched `INSTRUCTIONS_DB` record that powers both terminal and Markdown rendering, (3) the path/idempotency rules for the repair-guide artifact, and (4) the test matrix that proves the strict gate fires correctly across the agreed required/optional categories.

**Primary recommendation:** Add a single module `lib/init-checks.js` exporting a pure `runStrictChecks(repoRoot)` function returning a structured `{ ok, results[], failures[], warnings[] }` report. Have `handleInit` call it after `localizeGlobalSkills` / `appendSubagentGuidelines`; have `handleDoctor` call the same function. Render terminal output and Markdown via two small formatters in the same module. Expand `INSTRUCTIONS_DB` from `{description, instructions}` to a structured record (purpose / why / detected-failure / checked / install / workspace-fallback / home-fallback / verify). Write the Markdown guide to `.ai/state/repair-guide.md` (matching the existing `specs/016` spec). Add four new tests to `validators/scripts/test-cli.js` covering greenfield happy path, missing-prereq failure, broken-localization failure, and brownfield-skip-blocks-init failure.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-15-01:** `adp init` remains non-destructive and brownfield-safe but runs a strict deterministic post-init gate after artifact creation and skill localization.
- **D-15-02:** Required failures make `adp init` exit nonzero after printing a repair summary. Required failures include: malformed flow YAML, invalid/missing ledger state after generation, missing required flow prerequisites, unreadable required skill definitions, failed required workflow/reference localization, and localized skill files still pointing at inaccessible home/global paths.
- **D-15-03:** Existing project files must not be overwritten to satisfy strictness. Report the exact file and required manual action instead.
- **D-15-04:** Optional compatibility outputs may warn without failing only when the flow can still proceed deterministically. Planner defines the precise required-vs-optional list; default is required for artifacts the flow engine or skill loader needs before the next stage runs.
- **D-15-05:** Strict init validates the full local/offline setup surface: `.ai/flows/rough-project-flow.yaml`, `.ai/state/flow-ledger.json`, declared flow prerequisites, `.agents/skills/` + `.claude/skills/`, localized workflow/reference files, instruction-file guideline sections, and the active feature/spec pointer when present.
- **D-15-06:** Reuse existing deterministic helpers (`lib/tool-validator.js`, `lib/flow-engine.js`, spec/CLI validators). No LLM-as-judge, no live web lookups.
- **D-15-07:** Strict init gate shares behavior with `adp doctor`.
- **D-15-08:** Checks report evidence: checked paths, checked commands, missing files, parse errors, stage that needs the missing tool.
- **D-15-09:** Layered output — concise terminal failure summary + detailed Markdown repair guide.
- **D-15-10:** Per missing tool/skill the guide includes: purpose, why required, detected failure reason, checked paths/commands, install/copy commands, workspace-local fallback, home-directory fallback, exact verification command.
- **D-15-11:** Enhance the structured `INSTRUCTIONS_DB` in `lib/tool-validator.js` rather than scattering prose in CLI code. CLI formats records for terminal and Markdown.
- **D-15-12:** Guide stays local/offline; may reference package managers but must not perform network lookups at runtime.
- **D-15-13:** Phase 14 localization failures (cannot read or copy a referenced required workflow/reference file) fail closed with a repair guide entry.
- **D-15-14:** Localized `SKILL.md` files re-checked after rewrite. Any remaining `~`, home-directory, or known global GSD workflow references in `<execution_context>` paths are reported as init failures unless explicitly classified as safe documentation text.
- **D-15-15:** Repair output distinguishes "tool missing" from "tool exists but local workflow files incomplete".
- **D-15-16:** Preserve Phase 14 safe overwrite policy (skip existing local files), but report skipped files that prevent a valid localized setup.

### Claude's Discretion

The user approved recommended defaults for every gray area. Downstream agents may choose exact function names, output wording, and file paths for generated repair guides, provided the decisions above and existing project conventions are preserved.

### Deferred Ideas (OUT OF SCOPE)

- Automatic installation of tools or skills (still excluded by `.planning/PROJECT.md`).
- Network lookups for package availability or version.
- New flow execution automation beyond reusing existing engine helpers.

## Phase Requirements

No new requirement IDs are explicitly assigned in `.planning/REQUIREMENTS.md`. The phase tightens behavior tied to the v2.0 cluster:

| ID | Description | Research Support |
|----|-------------|------------------|
| WARN-02 | Checker warns if required tools missing. | Existing `validatePrerequisites` already supports this; phase upgrades it to a hard gate during `adp init`. |
| WARN-03 | Provide platform-specific installation instructions. | Phase expands `INSTRUCTIONS_DB` from 2-field to 8-field structured records to satisfy D-15-10. |
| WARN-04 | Integrate tool verification with flow startup. | Phase reuses `checkStagePrerequisites` and reports the offending stage per D-15-08. |
| SUB-01/02 | Local skill localization. | Phase 14 already implements it; this phase adds post-localization verification (D-15-13/14). |
| INIT-03 | Brownfield merge, no overwrite. | Preserved by D-15-03/16. |
| FR-15-01..07 (spec 016) | Authoritative functional list. | All addressed below. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Strict post-init gate orchestration | CLI handler (`bin/adp.js`) | New module `lib/init-checks.js` | Handlers must own exit codes; pure check logic belongs in a reusable lib so `handleDoctor` shares it. |
| Prerequisite tool detection | `lib/tool-validator.js` | — | Already authoritative for tool/skill probing; stays the single source. |
| Flow YAML / ledger parse | `lib/yaml-parser.js` + `lib/flow-engine.js` (`validateLedger`) | New checks module | Existing parsers/validators; new module orchestrates calls. |
| Localized SKILL.md path re-inspection | New module `lib/init-checks.js` | `localizeGlobalSkills` (signal source) | Localization is a separate concern; re-inspection runs after and can be tested independently. |
| Structured instruction records | `lib/tool-validator.js` (`INSTRUCTIONS_DB`) | New module renders them | Per D-15-11 the data stays where the lookup helper lives. |
| Terminal rendering | `lib/init-checks.js` (formatter) | `bin/adp.js` (consumer) | Same renderer used by init + doctor prevents drift. |
| Markdown repair-guide generation | `lib/init-checks.js` (formatter) | Filesystem write in CLI | Pure formatter returns string; CLI writes — easier to test. |
| Repair-guide artifact location | `.ai/state/` (durable mutable state) | `.ai/reviews/` (alternative) | `specs/016` already declares `.ai/state/repair-guide.md`; `.ai/state/` is the documented home for mutable orchestration state per CLAUDE.md and matches existing files like `flow-ledger.json`, `handoff.md`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node `fs`, `path`, `os`, `child_process` (built-ins) | bundled with Node | File reads, path joins, home dir, `command -v` probing | Already the only runtime primitives used in `bin/adp.js`, `lib/tool-validator.js`, `lib/flow-engine.js`. No external deps allowed (`package.json` is intentionally absent for the CLI project). [VERIFIED: repo grep — only `fs`, `path`, `os`, `child_process` imported across lib/* and bin/*] |
| `lib/yaml-parser.js` (in-repo) | n/a | Parses `rough-project-flow.yaml` | Already in use by `handleInit` (line 177) and `handleDoctor` (line 666). [VERIFIED: bin/adp.js:177, 666] |
| `lib/flow-engine.js#validateLedger` | n/a | Schema-check `.ai/state/flow-ledger.json` | Already exported and unit-testable. Returns `{valid, errors[]}`. [VERIFIED: lib/flow-engine.js:13] |
| `lib/tool-validator.js#validatePrerequisites` | n/a | Probe local skills + PATH | Already powers Phase 12 doctor logic. Returns per-prereq `{name, available, reason}`. [VERIFIED: lib/tool-validator.js:21] |
| `lib/tool-validator.js#getToolInstructions` + `INSTRUCTIONS_DB` | n/a | Source of structured guidance | The exact extension point per D-15-11. [VERIFIED: lib/tool-validator.js:91, 117] |
| `lib/flow-engine.js#checkStagePrerequisites` | n/a | Maps stage → prereqs and runs the validator | Lets the repair guide name the *stage* that needs each missing tool (D-15-08). [VERIFIED: lib/flow-engine.js — checkStagePrerequisites] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `validators/scripts/test-cli.js` framework (in-repo `addTest`) | n/a | Sandbox-based CLI integration testing | The phase's tests must extend this file (the only CLI test harness in the repo). [VERIFIED: 21 tests already use `addTest` here] |
| `lib/flow-ledger.js#createLedgerFromFlow` | n/a | Reference for ledger schema invariants | Read-only; used to understand what fields strict-check must verify after generation. [VERIFIED: bin/adp.js:178] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New module `lib/init-checks.js` | Inline logic in `bin/adp.js` | Inline duplicates logic between `handleInit`/`handleDoctor` (the very drift D-15-07 forbids). |
| `.ai/state/repair-guide.md` | `.ai/reviews/repair-guide-<timestamp>.md` | Reviews are append-only human-review packets; the repair guide is a *current snapshot* that should be overwritten on every run. `.ai/state/` matches that semantics and matches `specs/016` already. |
| Expand `INSTRUCTIONS_DB` in place | New `lib/repair-records.js` | D-15-11 explicitly says enhance the existing DB. Splitting modules would create two sources of truth. |

**Installation:** None — no external packages.

**Version verification:** N/A (Node built-ins + in-repo modules only).

## Package Legitimacy Audit

No external packages are added by this phase. The CLI project has no `package.json` and all logic uses Node built-ins plus in-repo modules under `lib/`. The slopcheck gate is therefore not applicable here. If a future task proposes a new dependency, it must trigger the Package Legitimacy Gate.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none) | — | — | — | — | — | — |

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────────────────────────┐
                         │  User runs:                          │
                         │     adp init   |   adp doctor        │
                         └──────────────────┬───────────────────┘
                                            │
            ┌───────────────────────────────┴───────────────────────────────┐
            │                                                               │
            ▼                                                               ▼
   ┌────────────────────┐                                       ┌─────────────────────┐
   │   handleInit()     │                                       │   handleDoctor()    │
   │  (bin/adp.js)      │                                       │   (bin/adp.js)      │
   │                    │                                       │                     │
   │  1. mkdir dirs     │                                       │  1. mkdir/dir check │
   │  2. write CLAUDE/  │                                       │  2. flow YAML parse │
   │     GEMINI/AGENTS  │                                       │  3. doctor static   │
   │  3. copy flow YAML │                                       │     prereq check    │
   │  4. gen ledger     │                                       │                     │
   │  5. copy SKILL stub│                                       │                     │
   │  6. localizeSkills │                                       │                     │
   │  7. appendSubagent │                                       │                     │
   └──────────┬─────────┘                                       └──────────┬──────────┘
              │                                                            │
              └────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │  NEW: runStrictChecks(root)   │
                       │       lib/init-checks.js      │
                       └──────────────┬────────────────┘
                                      │
       ┌────────────┬──────────────┬──┴──────────────┬──────────────┬─────────────┐
       ▼            ▼              ▼                 ▼              ▼             ▼
  ┌─────────┐  ┌──────────┐  ┌────────────┐   ┌──────────────┐ ┌────────────┐ ┌──────────┐
  │ checkDirs│  │parseFlow │  │checkLedger │   │checkPrereqs  │ │checkLocal  │ │checkInst │
  │  & files │  │YAML      │  │schema      │   │(per-stage)   │ │SkillPaths  │ │Sections  │
  └─────────┘  └──────────┘  └────────────┘   └──────────────┘ └────────────┘ └──────────┘
       │            │              │                 │              │             │
       └────────────┴──────────────┴────────┬────────┴──────────────┴─────────────┘
                                            ▼
                       ┌───────────────────────────────────┐
                       │  Aggregated CheckReport           │
                       │   { ok, failures[], warnings[] }  │
                       └──────────────┬────────────────────┘
                                      │
                       ┌──────────────┴────────────────┐
                       ▼                                ▼
            ┌─────────────────────┐         ┌────────────────────────┐
            │  formatTerminal()   │         │  formatMarkdownGuide() │
            │  → stderr           │         │  → .ai/state/          │
            │                     │         │      repair-guide.md   │
            └─────────────────────┘         └────────────────────────┘
                       │                                │
                       └──────────────┬─────────────────┘
                                      ▼
                          process.exit(report.ok ? 0 : 1)
```

### Recommended Project Structure (delta from current tree)

```
lib/
├── tool-validator.js       # EXTEND: enrich INSTRUCTIONS_DB schema
├── flow-engine.js          # NO CHANGE (consumed)
├── flow-ledger.js          # NO CHANGE (consumed)
├── yaml-parser.js          # NO CHANGE (consumed)
└── init-checks.js          # NEW: pure check + format module
bin/
└── adp.js                  # MODIFY: handleInit + handleDoctor call runStrictChecks
validators/scripts/
└── test-cli.js             # EXTEND: 4 new sandbox scenarios
```

### Pattern 1: Pure Reporter, Imperative Renderer

**What:** `lib/init-checks.js` exports pure functions that read the filesystem and return a structured report object. Rendering (terminal text, Markdown) and side effects (writing the repair guide, calling `process.exit`) live in `bin/adp.js`.

**When to use:** Always — this is how the existing `lib/flow-engine.js` is structured (e.g., `checkArtifacts`, `validateLedger` return `{passed/valid, results/errors}` with no I/O), and matches `validatePrerequisites` (returns `results[]`, no console writes).

**Example interface (no implementation):**
```javascript
// lib/init-checks.js
/**
 * @param {string} repoRoot
 * @param {{ requireOptional?: boolean }} [opts]
 * @returns {CheckReport}
 *
 * CheckReport:
 *   {
 *     ok: boolean,                         // overall pass/fail
 *     summary: string,                     // 1-line human summary
 *     results: CheckResult[],              // one per check (passed or not)
 *     failures: CheckResult[],             // results where required && !passed
 *     warnings: CheckResult[]              // results where optional && !passed
 *   }
 *
 * CheckResult:
 *   {
 *     id: string,                          // e.g. "flow.yaml.parse"
 *     category: 'tool' | 'artifact' | 'localization' | 'instruction',
 *     required: boolean,
 *     passed: boolean,
 *     subject: string,                     // file path or tool name
 *     evidence: {
 *       checkedPaths?: string[],
 *       checkedCommand?: string,
 *       parseError?: string,
 *       offendingLines?: string[],
 *       stage?: string                     // flow stage that needs the missing tool
 *     },
 *     guidance: InstructionRecord | null   // hydrated from INSTRUCTIONS_DB when relevant
 *   }
 */
function runStrictChecks(repoRoot, opts) { /* ... */ }

function formatTerminal(report) { /* returns string */ }
function formatMarkdownGuide(report, meta) { /* returns string */ }

module.exports = { runStrictChecks, formatTerminal, formatMarkdownGuide };
```

### Pattern 2: Shared Invocation in Two Handlers

```javascript
// bin/adp.js  (sketch — not final wording)
const { runStrictChecks, formatTerminal, formatMarkdownGuide } = require('../lib/init-checks');

function runAndReport(repoRoot, source /* 'init' | 'doctor' */) {
  const report = runStrictChecks(repoRoot);
  process.stderr.write(formatTerminal(report));
  if (!report.ok) {
    const guidePath = path.join(repoRoot, '.ai/state/repair-guide.md');
    fs.mkdirSync(path.dirname(guidePath), { recursive: true });
    fs.writeFileSync(guidePath, formatMarkdownGuide(report, { source }), 'utf8');
    console.error(`[${source}] Repair guide written to .ai/state/repair-guide.md`);
    process.exit(1);
  }
}
```

`handleInit` calls `runAndReport(repoRoot, 'init')` after `appendSubagentGuidelines(repoRoot)` and *before* the existing `console.log('[init] Initialization complete.')`.
`handleDoctor` calls the same function near the top, *replacing* its current ad-hoc directory + prereq probe (keeping the spec-validation gate that runs afterward).

### Anti-Patterns to Avoid

- **Re-implementing prerequisite probing inline.** `validatePrerequisites` already covers local-skill + PATH resolution. Calling it twice or rolling a third copy violates D-15-06.
- **Writing the repair guide from `lib/init-checks.js`.** That module must stay pure so tests can assert on the report object without filesystem cleanup.
- **Mutating CLAUDE.md/GEMINI.md/AGENTS.md during strict checks.** D-15-03 forbids overwrite-to-pass; this is a *check*, not a fix.
- **Calling `process.exit` from inside `runStrictChecks`.** Tests need to call it directly and assert on the return value.
- **Hard-coding instruction text in `bin/adp.js`.** D-15-11 requires the structured DB to be the only source.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing of `rough-project-flow.yaml` | Custom regex | `lib/yaml-parser.js#parseYaml` | Already in use; same parser everywhere prevents schema divergence. |
| Ledger schema validation | New JSON validator | `lib/flow-engine.js#validateLedger` | Already exported and unit-tested. |
| Local skill / PATH detection | New `spawnSync` block | `lib/tool-validator.js#validatePrerequisites` | Handles all three resolution paths (`.agents/skills`, `.claude/skills`, `~/.gemini/config/skills`, `command -v` fallback). |
| Stage→prerequisite matching | Recompute mapping in checker | `lib/flow-engine.js#checkStagePrerequisites` | Reuses the same fuzzy match used by the engine at runtime so doctor reports match runtime reality. |
| Markdown table/section rendering | Pull in a Markdown lib | Template strings in `formatMarkdownGuide` | Repo convention is zero deps; existing repair text in `getToolInstructions` is plain Markdown. |
| Idempotent overwrite of `.ai/state/repair-guide.md` | Append timestamps | Plain overwrite | The file represents *current* state, parallels `flow-ledger.json` overwrite semantics. |

**Key insight:** Phase 15 is 90% wiring and schema extension over already-correct primitives. Every "Don't" item above represents a place where regression risk would be introduced for zero benefit.

## Runtime State Inventory

Phase 15 is a forward-only behavior change to `adp init`/`adp doctor`. It does not rename or migrate stored state. The audit below confirms no migration tasks are required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by reading `.ai/state/` contents (`flow-ledger.json`, `handoff.md`, `run-state.json`). No record uses keys this phase would rename. | None |
| Live service config | None — no external service is configured by this CLI. | None |
| OS-registered state | None — `adp` is not registered with launchd/systemd/Task Scheduler. | None |
| Secrets / env vars | The CLI honors `PROJECT_ROOT`/`REPO_ROOT` env vars (used by `runSpecValidatorSync` and the test harness). Names unchanged. | None |
| Build artifacts | None — repo has no compiled artifacts or installed eggs. `package.json` is intentionally absent. | None |

**The canonical question:** after every file in the repo is updated, what runtime systems still have the old behavior cached? **Answer: none.** The behavior change is purely a new code path on the next CLI invocation; nothing persists between invocations except `.ai/state/repair-guide.md` itself, which is regenerated each run.

## Common Pitfalls

### Pitfall 1: Localized SKILL.md re-inspection over-fires

**What goes wrong:** D-15-14 says any remaining `~`, home directory, or known global GSD workflow reference in `<execution_context>` should fail init. A naive grep for `~` will also match documentation prose, code samples, or `~/` paths inside fenced code blocks that are *intentionally* preserved.

**Why it happens:** `localizeGlobalSkills` only rewrites the *path tokens it copied*. The rest of the SKILL.md body may legitimately contain `~/...` strings as documentation. D-15-14 hedges this with "unless explicitly classified as safe documentation text."

**How to avoid:**
- Re-parse the `<execution_context>` block specifically (same regex as `localizeGlobalSkills`: `/<execution_context>([\s\S]*?)<\/execution_context>/`) and scan only the lines inside.
- Only flag lines that begin with `@` (the documented context-include syntax) and still contain `~`, `$HOME`, or a `.gemini/` segment.
- Lines outside `<execution_context>` are out of scope.

**Warning signs:** Strict gate fails on a freshly initialized greenfield project that the user did not touch.

### Pitfall 2: Brownfield false-fail on overwrite-skipped files

**What goes wrong:** A user has a custom `CLAUDE.md` that lacks the `## Subagent & Parallel Execution Guidelines` heading. Phase 14 `appendSubagentGuidelines` will *append* — but if the file was *missing* before init wrote the default and a downstream brownfield rule prevented overwrite (D-15-03/16), the section might be absent and strict mode fails. The user thinks they followed instructions yet init fails.

**Why it happens:** Strict checks must distinguish "file exists but lacks required section" (legitimate failure, user must edit) from "file does not exist at all" (handleInit should have written it).

**How to avoid:**
- The instruction-file section check (D-15-05) must read the file fresh after `appendSubagentGuidelines`.
- Provide an `evidence.offendingFile` and an explicit "Manual action: append the following block to `CLAUDE.md`" in the repair guide.
- D-15-15 wording matters: the guide must say "instruction file incomplete" *not* "instruction tool missing".

**Warning signs:** Repair guide says "install CLAUDE" when the file already exists.

### Pitfall 3: Mixing required and optional in a single exit code

**What goes wrong:** A check intended as a warning (D-15-04) bumps the exit code to 1, blocking brownfield projects that ran fine pre-Phase-15.

**Why it happens:** Easy to flip `failed = true` in a loop without checking the `required` flag.

**How to avoid:**
- `runStrictChecks` returns `{ failures, warnings }` as *separate* arrays.
- `report.ok = failures.length === 0` — warnings never affect `ok`.
- Default everything to `required: true` (per D-15-04) and explicitly opt items into optional.

**Warning signs:** Existing CI on a healthy fixture suddenly returns nonzero after Phase 15 lands.

### Pitfall 4: Doctor and Init formatting drift

**What goes wrong:** `handleDoctor`'s current ad-hoc loop (bin/adp.js:672-696) prints `✅`/`❌` with custom prefixes. If only `handleInit` switches to the new formatter, doctor output drifts from init output, violating D-15-07.

**How to avoid:** Remove the inline prereq loop in `handleDoctor` entirely. Replace it with `runAndReport(repoRoot, 'doctor')`. Keep the `runSpecValidatorSync` call that runs *after* (it is a separate gate not in scope for this phase).

**Warning signs:** Test 'CLI Doctor Command' (test-cli.js:144) starts passing on different output than 'CLI Init Command' (test-cli.js:93) for the same sandbox state.

### Pitfall 5: Repair guide pollutes git on every run

**What goes wrong:** `.ai/state/repair-guide.md` is written on failure and *not removed* on success. Stale guides linger.

**How to avoid:**
- On a successful run, delete `.ai/state/repair-guide.md` if it exists (idempotent: only if `fs.existsSync`).
- Mention in the file header `Generated: <ISO timestamp>` and a one-line "This file is automatically regenerated by `adp init` / `adp doctor`. Delete after fixing."
- Optionally add `.ai/state/repair-guide.md` to `.gitignore` — but `.ai/state/flow-ledger.json` is committed, so consistency suggests committing the guide is fine and the success-path deletion is the real fix.

**Warning signs:** `git status` always dirty even after fixes.

## Code Examples

All examples below are *interface sketches*, not final implementations. They show the contract surface the planner should encode in tasks.

### Example A — Enriched `INSTRUCTIONS_DB` record (D-15-10, D-15-11)

```javascript
// lib/tool-validator.js  (extension proposal)
const INSTRUCTIONS_DB = {
  gsd: {
    purpose: 'Scaffold phases, record decisions, and run execution tasks.',
    whyRequired: 'The rough-project-flow uses gsd-discuss-phase / gsd-plan-phase / gsd-execute-phase to drive every stage transition.',
    detectionHint: 'Looks for a `gsd-discuss-phase` skill folder or the `gsd` command on PATH.',
    checkedPaths: [
      '.agents/skills/gsd-discuss-phase',
      '.claude/skills/gsd-discuss-phase',
      '~/.gemini/config/skills/gsd-discuss-phase'
    ],
    installCommands: [
      '# Workspace-local (preferred for sandboxed agents):',
      'mkdir -p .agents/skills && cp -R <gsd-source>/skills/gsd-discuss-phase .agents/skills/'
    ],
    workspaceFallback: 'Copy the GSD skill folder to `.agents/skills/gsd-discuss-phase` so sandboxed agents can read it.',
    homeFallback: 'Copy to `~/.gemini/config/skills/gsd-discuss-phase` for system-wide use (non-sandboxed runtimes only).',
    verifyCommand: 'adp doctor'
  },
  // ... superpowers, spec-kit, gstack with same shape
};
```

The Markdown formatter renders this as one `### Tool: gsd` section per failure, with subsections for each field. The terminal formatter prints `whyRequired` (one line) + `verifyCommand`.

### Example B — Localized SKILL.md re-inspection

```javascript
// lib/init-checks.js  (sketch)
function checkLocalizedSkillPaths(repoRoot) {
  const offenders = [];
  for (const baseDir of ['.agents/skills', '.claude/skills']) {
    const fullBase = path.join(repoRoot, baseDir);
    if (!fs.existsSync(fullBase)) continue;
    for (const entry of fs.readdirSync(fullBase, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('gsd-')) continue;
      const skillMd = path.join(fullBase, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const content = fs.readFileSync(skillMd, 'utf8');
      const m = content.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
      if (!m) continue;
      const bad = m[1].split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('@'))
        .filter(l => /~|\$HOME|\.gemini\//.test(l));
      if (bad.length > 0) {
        offenders.push({ file: path.join(baseDir, entry.name, 'SKILL.md'), lines: bad });
      }
    }
  }
  return offenders;
}
```

### Example C — Test sandbox extension

```javascript
// validators/scripts/test-cli.js (new test sketch)
addTest('CLI Init Strict Gate Fails on Broken Localized SKILL.md', () => {
  setupSandbox();
  // Pre-create a localized skill that still references ~/.gemini/...
  const skillDir = path.join(testSandboxRoot, '.agents/skills/gsd-discuss-phase');
  fs.mkdirSync(skillDir, { recursive: true });
  writeFile('.agents/skills/gsd-discuss-phase/SKILL.md',
    '# Test\n<execution_context>\n@~/.gemini/antigravity/workflows/foo.md\n</execution_context>\n');
  const res = runCLI(['init']);
  if (res.code !== 1) throw new Error(`Expected exit 1, got ${res.code}`);
  if (!fileExists('.ai/state/repair-guide.md')) throw new Error('Expected repair guide written');
  const guide = readFile('.ai/state/repair-guide.md');
  if (!guide.includes('SKILL.md')) throw new Error('Repair guide must name the offending file');
  cleanupSandbox();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `adp init` always exits 0 even when prereqs missing | Strict post-init gate exits 1 on required failures | Phase 15 (this work) | Brownfield CI must be re-verified — failing checks now block. |
| `adp doctor` does its own ad-hoc prereq loop | Doctor reuses `runStrictChecks` | Phase 15 | Eliminates output drift; simpler doctor handler. |
| `INSTRUCTIONS_DB` records have 2 fields (`description`, `instructions`) | Records have 8 fields (purpose, why, detection, checked paths, install commands, workspace/home fallbacks, verify) | Phase 15 | All callers that read `getToolInstructions` continue to work (object shape extended, not narrowed). |
| Terminal-only failure reporting | Terminal + durable Markdown at `.ai/state/repair-guide.md` | Phase 15 | New committed (or success-deleted) artifact. |

**Deprecated/outdated:** Nothing removed. All Phase 12/14 helpers remain in active use.

## Required-vs-Optional Check Inventory (per D-15-04, D-15-05)

| Check ID | Subject | Required? | Failure Action | Rationale |
|----------|---------|-----------|----------------|-----------|
| `dirs.required` | All paths in the `handleInit` `dirs` array exist after init | Required | Fail + repair entry | Flow engine and validators read these. |
| `flow.yaml.exists` | `.ai/flows/rough-project-flow.yaml` exists | Required | Fail + repair entry (says "copy template manually") | Without it the flow engine cannot start. |
| `flow.yaml.parse` | `parseYaml(flowYaml)` succeeds | Required | Fail + repair entry with parse error | D-15-02 lists "malformed flow YAML". |
| `ledger.exists` | `.ai/state/flow-ledger.json` exists | Required | Fail + repair entry | D-15-02 lists "missing ledger state". |
| `ledger.schema` | `validateLedger(ledger).valid === true` | Required | Fail + repair entry with each error from `validateLedger` | D-15-02 lists "invalid ledger". |
| `prereqs.<tool>` | `validatePrerequisites(flowDef.prerequisites)` per tool | Required for any tool referenced by a stage in `flowDef.stages`; Optional for unreferenced prereqs | Required → fail + INSTRUCTIONS_DB entry; Optional → warning | D-15-04 default is required, but a declared prereq with no consuming stage is by definition not blocking the next stage. |
| `localization.copiedRefs` | Every `@`-referenced file in original SKILL.md `<execution_context>` blocks resolved successfully | Required | Fail + repair entry naming the original raw path | D-15-13. |
| `localization.localPaths` | Localized SKILL.md `<execution_context>` `@` lines are workspace-relative (no `~`, `$HOME`, `.gemini/`) | Required | Fail + repair entry naming the offending file/lines | D-15-14. |
| `skill.projectFlow.exists` | `.agents/skills/project-flow/SKILL.md` + `.claude/skills/project-flow/SKILL.md` present | Required | Fail (handleInit copies these unless template missing) | INIT-04. |
| `instructions.subagentSection` | CLAUDE.md, GEMINI.md, AGENTS.md each contain `## Subagent & Parallel Execution Guidelines` | Required for the runtime adapter the project targets; Optional for others | Required → fail; Optional → warning | D-15-05 mentions instruction sections; SUB-03 requires it. |
| `constitution.exists` | `.ai/constitution.md` exists | Required | Fail | Doctor already enforces this. |
| `featurePointer.active` | If `.specify/feature.json` exists, the `feature_directory` it points at exists | Required when pointer present, Optional when absent | Required if present | D-15-05 mentions "active feature/spec pointer when present". |

The planner may refine which `prereqs.<tool>` items are optional based on actual `flowDef.stages` content at check time (use `checkStagePrerequisites` to find the consuming stage, mark unreferenced declarations as warnings).

## Repair Guide Schema (per D-15-10)

**Path:** `.ai/state/repair-guide.md`
**Idempotency:** Overwritten on every failing run. Deleted on every successful run.
**Encoding:** UTF-8, LF.

**Top-level structure:**

```markdown
# Repair Guide

**Generated:** <ISO8601 timestamp>
**Source:** adp init   |   adp doctor
**Status:** 1 failure(s), 0 warning(s)

> This file is automatically regenerated by `adp init` / `adp doctor`. Delete after fixing.

## Summary

| # | Category | Subject | One-line reason |
|---|----------|---------|-----------------|
| 1 | tool | gsd | gsd-discuss-phase skill folder not found in workspace or home |

## Failures

### 1. Tool missing — gsd  *(category: tool)*

**Purpose:** Scaffold phases, record decisions, and run execution tasks.
**Why required:** The rough-project-flow uses gsd-discuss-phase / gsd-plan-phase / gsd-execute-phase to drive every stage transition.
**Needed by stage:** decision-discovery
**Detected failure:** No `gsd-discuss-phase` folder under `.agents/skills`, `.claude/skills`, or `~/.gemini/config/skills`; `command -v gsd` returned non-zero.
**Checked paths:**
- `.agents/skills/gsd-discuss-phase`
- `.claude/skills/gsd-discuss-phase`
- `~/.gemini/config/skills/gsd-discuss-phase`
**Checked command:** `command -v gsd`

**Install — workspace-local (preferred):**

```bash
mkdir -p .agents/skills
cp -R <gsd-source>/skills/gsd-discuss-phase .agents/skills/
```

**Install — home directory fallback:**

```bash
mkdir -p ~/.gemini/config/skills
cp -R <gsd-source>/skills/gsd-discuss-phase ~/.gemini/config/skills/
```

**Verify:**

```bash
adp doctor
```

---

### 2. Localized SKILL.md still references global path  *(category: localization)*

**Subject:** `.agents/skills/gsd-execute-phase/SKILL.md`
**Detected failure:** `<execution_context>` block still contains `@~/.gemini/antigravity/workflows/foo.md` after localization. Sandboxed agents will get `Permission denied`.
**Offending lines:**
- `@~/.gemini/antigravity/workflows/foo.md`
**Manual action:** Re-run `adp init` *after* removing `.agents/skills/gsd-execute-phase/` and `.claude/skills/gsd-execute-phase/` so localization recreates them from scratch. If the referenced file does not exist in your `~/.gemini/antigravity/`, install GSD globally first or copy the workflow manually into `.agents/skills/gsd-execute-phase/workflows/`.

**Verify:** `adp doctor`

## Warnings  *(do not block init)*

(none)
```

**Render rule:** Each failure becomes one `### N. <Title>  *(category: ...)*` section. `category` is one of `tool | artifact | localization | instruction`. The exact wording of "Tool missing" vs "Local workflow files incomplete" implements D-15-15.

## Integration Points in `bin/adp.js`

| Function | Current line range | Required change |
|----------|-------------------|-----------------|
| `handleInit` | lines 66–232 | After line 229 (`appendSubagentGuidelines(repoRoot);`) and before line 231 (`console.log('[init] Initialization complete.');`), call `runAndReport(repoRoot, 'init')`. On success, the existing `Initialization complete` log fires. On failure, `runAndReport` calls `process.exit(1)` itself. |
| `handleDoctor` | lines 629–719 | Replace lines 640–706 (the directory loop + the flow prerequisite block) with a single `runAndReport(repoRoot, 'doctor')` call. Keep lines 709–718 (spec validation gate + final pass log). |
| `runAndReport` | — | NEW small helper near `runSpecValidatorSync` (line 734). Imports `runStrictChecks`, `formatTerminal`, `formatMarkdownGuide` from `lib/init-checks.js`. Writes guide to `.ai/state/repair-guide.md` on failure, deletes the file on success. |
| Top-of-file `require()` | line 5 | Add `const { runStrictChecks, formatTerminal, formatMarkdownGuide } = require('../lib/init-checks');`. |

## Project Constraints (from CLAUDE.md)

- **gstack global install required.** The phase touches the CLI which is invoked under gstack-managed AI runs. Do not regress `.claude/hooks/check-gstack.sh`.
- **`npm run validate` must stay green.** Plan must include running it after every code change.
- **`npm run test:cli`** runs `validators/scripts/test-cli.js`. The new tests live there and must pass on macOS-default Node.
- **Path ownership.** Repair guide goes under `.ai/state/` (durable orchestration state). `.planning/`, `.specify/`, `.github/workflows/` are out of scope for this phase.
- **CommonJS, 2-space indent, semicolons, explicit `process.exit(1)`** on CLI failure paths (matches existing `bin/adp.js` style).
- **GitNexus impact analysis required before edits.** Plan tasks must include `gitnexus_impact` on `handleInit`, `handleDoctor`, `validatePrerequisites`, `getToolInstructions`, `INSTRUCTIONS_DB`, and `checkStagePrerequisites`. Risk is likely MEDIUM (`handleInit` is called by `handleRun` at line 257; doctor is independently tested).
- **`node validators/scripts/validate-spec.js` must remain passing.** `specs/016-strict-initialization-checks-detailed/` already contains a draft spec/plan/tasks — the planner should update those rather than create new ones.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Running `adp` | ✓ (assumed — user invokes `adp`) | ≥14 implied by `fs.rmSync` use in tests | — |
| `lib/yaml-parser.js` | Strict checks parsing flow YAML | ✓ (in-repo) | — | — |
| `lib/flow-engine.js` | Ledger validation, stage→prereq mapping | ✓ (in-repo) | — | — |
| `lib/tool-validator.js` | Tool/skill probing | ✓ (in-repo) | — | — |
| Bash `command -v` | PATH lookup inside `validatePrerequisites` | ✓ (macOS/Linux default) | — | Existing fallback: returns `available: false` if `command -v` fails. No additional fallback needed. |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Security Domain

Project config has `security_enforcement: true` with `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | CLI runs as the invoking user; no auth surface. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | Filesystem-only; respects user's existing permissions. |
| V5 Input Validation | yes | `parseYaml` on user-supplied flow YAML; `JSON.parse` on ledger. Use existing `validateLedger` to bound JSON parse output. Wrap both in try/catch and report parse errors as structured failures (already standard in `handleDoctor`). |
| V6 Cryptography | no | No crypto. |
| V7 Errors / Logging | yes (L1 baseline) | Repair guide must not echo arbitrary user file contents into a committed file unrestrained. Quote *only* known fields (paths, parse error messages from the YAML/JSON parsers) — never `console.log` raw env or process state. |
| V10 Malicious code | yes (L1) | Never execute commands from the user's flow YAML, repair guide, or skill files. All `spawnSync` calls remain inside `validatePrerequisites` and run only known commands (`command -v <token>` or the explicit `pre.check` from a *trusted* flow definition shipped with the repo). |
| V12 Files / Resources | yes (L1) | Repair guide written under `.ai/state/`, a controlled relative path. No user-controlled path is used as a write target. |
| V14 Configuration | yes (L1) | The phase reads `.ai/state/`, `.ai/flows/`, `.agents/skills/`, `.claude/skills/`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.specify/feature.json`. All are inside `repoRoot`. The check module must reject any `..` traversal in derived paths (use `path.join(repoRoot, ...)` and never trust raw user strings as the first arg). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via crafted flow YAML reference | Tampering | Always `path.join(repoRoot, relative)`; reject `relative` that begins with `/` or contains `..` segments after normalization. |
| Command execution via `pre.check` field | Elevation of Privilege | `validatePrerequisites` runs `pre.check` via `spawnSync(..., { shell: true })`. The current contract trusts the flow definition. **Plan task:** document that only flow definitions shipped with the project should use `pre.check`; do not extend this to user-extracted flows in Phase 15. (Out of scope to fix; in scope to note.) |
| Repair guide leaking absolute home paths into a committed file | Information Disclosure | Always render paths as workspace-relative when writing the repair guide. When the failure involves `~/.gemini/...`, leave the literal `~` in the rendered text rather than resolving to `/Users/<name>/...`. |
| Stale repair guide misleads next user | Tampering by omission | Delete `.ai/state/repair-guide.md` on every successful gate run. |

**ASVS L1 verdict:** No new threats introduced; existing controls suffice. Security review can be a checklist item rather than a separate task.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.ai/state/repair-guide.md` is the correct durable location (matches `specs/016` spec). | Repair Guide Schema | Low — if the planner prefers `.ai/reviews/`, update spec 016 and adjust one path constant. |
| A2 | The four prereq tools listed in `INSTRUCTIONS_DB` (gsd, superpowers, spec-kit, gstack) are the complete required set for Phase 15. | Required-vs-Optional Inventory | Low — adding new entries is a pure data extension. |
| A3 | Localized SKILL.md `<execution_context>` checks should only inspect lines starting with `@`. | Pitfall 1 | Medium — overly strict regex would false-fail documentation prose; this rule mirrors the regex used by `localizeGlobalSkills` itself. |
| A4 | Plan compatibility: `INIT-03`-style brownfield projects expect the strict gate to fail gracefully with repair guidance, not silently overwrite. | User Constraints (D-15-03) | Low — this is the explicit decision. |
| A5 | `handleRun` (which calls `handleInit`) is acceptable to fail-fast in strict mode. | Integration Points | Low — `handleRun` already exits nonzero if downstream gates fail; same pattern continues. |

## Open Questions

1. **Repair guide commit policy.**
   - What we know: `.ai/state/flow-ledger.json` is committed; `.ai/state/run-state.json` is committed. Spec 016 declares `.ai/state/repair-guide.md` is the path.
   - What's unclear: whether the repair guide should be `.gitignore`d (it churns) or committed (matches sibling files and is auditable).
   - Recommendation: **commit it.** It is regenerated only when init/doctor fails and deleted on success, so churn is bounded. Consistency with siblings beats churn-avoidance.

2. **Optional vs required for instruction-file subagent section across runtimes.**
   - What we know: D-15-05 lists "instruction-file guideline sections" without ranking them.
   - What's unclear: whether missing the section in *all three* files fails, or only the one matching the user's runtime.
   - Recommendation: **fail if missing in any of the three files that already exist after init.** `handleInit` always writes all three default files, so all three should pass. If a user deletes one, that's their explicit choice and we should not fail on its absence — only on its presence-without-section.

## Sources

### Primary (HIGH confidence)
- `/Volumes/D/snail-agent-flow/bin/adp.js` — `handleInit` (66-232), `handleDoctor` (629-719), `localizeGlobalSkills` (825-933), `appendSubagentGuidelines` (935-967), `runSpecValidatorSync` (734-750).
- `/Volumes/D/snail-agent-flow/lib/tool-validator.js` — `validatePrerequisites` (21), `INSTRUCTIONS_DB` (91), `getToolInstructions` (117).
- `/Volumes/D/snail-agent-flow/lib/flow-engine.js` — `validateLedger` (13), `checkStagePrerequisites`, `checkArtifacts`, `resolveNextStage`.
- `/Volumes/D/snail-agent-flow/specs/016-strict-initialization-checks-detailed/spec.md` — authoritative FR-15-01..07, repair-guide path, acceptance criteria.
- `/Volumes/D/snail-agent-flow/.planning/phases/15-.../15-CONTEXT.md` — locked decisions D-15-01..16.
- `/Volumes/D/snail-agent-flow/.planning/phases/12-.../12-CONTEXT.md` — Phase 12 D-12-01..03 (doctor + INSTRUCTIONS_DB origins).
- `/Volumes/D/snail-agent-flow/.planning/phases/14-.../14-CONTEXT.md` — Phase 14 D-14-01..04 (localization mechanics).
- `/Volumes/D/snail-agent-flow/validators/scripts/test-cli.js` — existing 21 tests including `CLI Init Command` (93), `CLI Doctor Command` (144), `CLI Init Creates Flow Infrastructure` (723).
- `/Volumes/D/snail-agent-flow/.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` — language, layering, error-handling conventions.
- `/Volumes/D/snail-agent-flow/CLAUDE.md` — gstack requirement, validation gates, GitNexus impact rule.
- `/Volumes/D/snail-agent-flow/.planning/config.json` — `nyquist_validation: false`, `security_enforcement: true`, `security_asvs_level: 1`.

### Secondary (MEDIUM confidence)
- None — all decisions verified against in-repo source.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives are in-repo and grep-verified.
- Architecture: HIGH — pattern mirrors existing `lib/flow-engine.js` pure-reporter style.
- Pitfalls: HIGH — derived from concrete code in `localizeGlobalSkills` and `handleDoctor`.
- Required-vs-optional inventory: MEDIUM — depends on planner's final stage-aware filter of declared prereqs.
- Repair-guide schema: MEDIUM — concrete proposal; final wording is at the planner's discretion per D-15-discretion clause.

**Research date:** 2026-05-26
**Valid until:** 2026-06-25 (30 days — code surface is stable, no recent churn on `lib/` modules touched).
