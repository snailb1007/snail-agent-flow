# Phase 15: Strict Initialization Checks and Detailed Installation Guide — Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 4 (1 new, 3 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/init-checks.js` (NEW) | utility / pure-reporter module | request-response (sync read-aggregate-return) | `lib/flow-engine.js` | exact (same pure-reporter style: `validateLedger`, `checkArtifacts`, `checkStagePrerequisites` all return `{ passed/valid, results/errors }`) |
| `lib/tool-validator.js` (MODIFY — enrich `INSTRUCTIONS_DB`) | utility / structured data DB | request-response | `lib/tool-validator.js` (self — extend existing record schema) | exact |
| `bin/adp.js` (MODIFY — `handleInit` + `handleDoctor` + new `runAndReport`) | controller / CLI handler | request-response | `bin/adp.js#handleDoctor` (lines 629–719) and `bin/adp.js#handleInit` (lines 66–232) | exact |
| `validators/scripts/test-cli.js` (MODIFY — 4 new sandbox tests) | test | request-response (sandbox-based integration) | `validators/scripts/test-cli.js` (`CLI Init Command` line 93, `CLI Doctor Command` line 144) | exact |

## Pattern Assignments

### `lib/init-checks.js` (NEW — utility, pure reporter)

**Analog:** `lib/flow-engine.js`

**Imports pattern** (analog `lib/flow-engine.js` lines 1–2, and the lazy-require in lines 325):

```javascript
const fs = require('fs');
const path = require('path');
// Lazy-require sibling lib modules inside functions to avoid circular deps
// (mirrors flow-engine.js line 325: `const { validatePrerequisites, getToolInstructions } = require('./tool-validator');`)
```

**Pure-reporter pattern** (copy shape from `lib/flow-engine.js#validateLedger` lines 16–51, `#checkArtifacts` lines 114–149, `#checkStagePrerequisites` lines 296–341):

```javascript
/**
 * @param {string} repoRoot
 * @param {{ requireOptional?: boolean }} [opts]
 * @returns {{ ok: boolean, summary: string, results: CheckResult[], failures: CheckResult[], warnings: CheckResult[] }}
 */
function runStrictChecks(repoRoot, opts) {
  const results = [];
  // ... sub-checks push to results, each returning { id, category, required, passed, subject, evidence, guidance }
  const failures = results.filter(r => r.required && !r.passed);
  const warnings = results.filter(r => !r.required && !r.passed);
  return {
    ok: failures.length === 0,
    summary: `${failures.length} failure(s), ${warnings.length} warning(s)`,
    results,
    failures,
    warnings
  };
}
```

**Try/catch evidence pattern** (copy from `checkArtifacts` lines 131–140):

```javascript
let exists = false;
try {
  exists = fs.existsSync(fullPath);
  // ... read/parse
} catch (e) {
  exists = false;
  // capture e.message into result.evidence.parseError
}
```

**No I/O / no `process.exit` rule** — pure functions only. All filesystem writes and exits happen in `bin/adp.js`. Mirrors `flow-engine.js` which never calls `console.*` or `process.exit`.

**Module export pattern** (copy from `lib/flow-engine.js` lines 343–353):

```javascript
module.exports = {
  runStrictChecks,
  formatTerminal,
  formatMarkdownGuide
};
```

**Localized SKILL.md re-inspection pattern** — reuse the exact regex used by `localizeGlobalSkills` in `bin/adp.js` line 862 so init and re-check use the same parser:

```javascript
const contextMatch = skillContent.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
// then filter lines that start with '@' (mirrors bin/adp.js lines 866–871)
```

---

### `lib/tool-validator.js` (MODIFY — enrich `INSTRUCTIONS_DB`)

**Analog:** existing `INSTRUCTIONS_DB` at `lib/tool-validator.js` lines 88–105

**Current shape** (lines 89–92):

```javascript
gsd: {
  description: "Scaffold phases, record decisions, and run execution tasks.",
  instructions: "Download and copy the GSD skill folder to `.agents/skills/gsd-discuss-phase` ..."
}
```

**Enriched shape** (additive — keep `description` and `instructions` for back-compat with `handleDoctor` lines 683–684 and `flow-engine.js` lines 332–335):

```javascript
gsd: {
  // Existing fields — DO NOT remove; existing callers (handleDoctor, checkStagePrerequisites) read them.
  description: "Scaffold phases, record decisions, and run execution tasks.",
  instructions: "...",
  // New fields for D-15-10:
  purpose: "Scaffold phases, record decisions, and run execution tasks.",
  whyRequired: "rough-project-flow uses gsd-discuss-phase / gsd-plan-phase / gsd-execute-phase to drive every stage transition.",
  detectionHint: "Looks for `gsd-discuss-phase` skill folder or `gsd` on PATH.",
  checkedPaths: [
    '.agents/skills/gsd-discuss-phase',
    '.claude/skills/gsd-discuss-phase',
    '~/.gemini/config/skills/gsd-discuss-phase'
  ],
  installCommands: [
    'mkdir -p .agents/skills && cp -R <gsd-source>/skills/gsd-discuss-phase .agents/skills/'
  ],
  workspaceFallback: 'Copy to `.agents/skills/gsd-discuss-phase` for sandboxed agents.',
  homeFallback: 'Copy to `~/.gemini/config/skills/gsd-discuss-phase` for system-wide use.',
  verifyCommand: 'adp doctor'
}
```

**`getToolInstructions` lookup** (lines 113–122) — unchanged. The function does a `lower.includes(key)` fuzzy match and returns the whole record; expanding the record requires no caller changes.

**Module export** (lines 124–128) — unchanged.

---

### `bin/adp.js` (MODIFY — `handleInit`, `handleDoctor`, new `runAndReport`)

**Analog:** `bin/adp.js#handleDoctor` (lines 629–719) for the prereq + parse + exit pattern; `bin/adp.js#handleInit` (lines 66–232) for the brownfield-safe write style.

**Imports pattern** (current line 3–5, add new require):

```javascript
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
// NEW:
const { runStrictChecks, formatTerminal, formatMarkdownGuide } = require('../lib/init-checks');
```

**CLI handler exit pattern** (copy from `handleDoctor` lines 656–659, 703–706, 711–714):

```javascript
if (failed) {
  console.error('[doctor] Static checks FAILED.');
  process.exit(1);
}
```

Each CLI handler owns its own `process.exit(1)` on failure paths. The new `runAndReport` follows the same pattern.

**`runAndReport` integration helper** (NEW — place near `runSpecValidatorSync` line 734, sketch):

```javascript
function runAndReport(repoRoot, source /* 'init' | 'doctor' */) {
  const report = runStrictChecks(repoRoot);
  process.stderr.write(formatTerminal(report));
  const guidePath = path.join(repoRoot, '.ai/state/repair-guide.md');
  if (!report.ok) {
    fs.mkdirSync(path.dirname(guidePath), { recursive: true });
    fs.writeFileSync(guidePath, formatMarkdownGuide(report, { source }), 'utf8');
    console.error(`[${source}] Repair guide written to .ai/state/repair-guide.md`);
    process.exit(1);
  }
  // success: clean up stale repair guide (Pitfall 5 in RESEARCH.md)
  if (fs.existsSync(guidePath)) {
    fs.unlinkSync(guidePath);
  }
}
```

**`handleInit` insertion point** — after line 229 (`appendSubagentGuidelines(repoRoot);`) and before line 231 (`console.log('[init] Initialization complete.');`):

```javascript
localizeGlobalSkills(repoRoot);
appendSubagentGuidelines(repoRoot);
// NEW:
runAndReport(repoRoot, 'init');
console.log('[init] Initialization complete.');
```

**`handleDoctor` replacement** — replace lines 640–706 (the inline `dirs` loop + constitution check + ad-hoc prereq loop) with one call. KEEP the spec-validation gate at lines 709–717 because it is a separate concern:

```javascript
function handleDoctor() {
  runAndReport(repoRoot, 'doctor');
  // existing spec validation gate stays:
  console.log('[doctor] Running spec validation gate...');
  const valResult = runSpecValidatorSync(false);
  if (valResult.status !== 0) {
    console.error('[doctor] Spec validation gate FAILED.');
    process.exit(1);
  }
  console.log('[doctor] Spec validation gate PASSED.');
  console.log('[doctor] Project is healthy.');
  process.exit(0);
}
```

**Logging-prefix pattern** (consistent throughout `bin/adp.js`): `[init] ...`, `[doctor] ...`, `[feature] ...`, errors go to `console.error`, info goes to `console.log`. Reuse this in `formatTerminal` output prefix selection via the `source` argument.

**Brownfield-safe write pattern** (copy from `handleInit` lines 80–86, 91–110):

```javascript
if (!fs.existsSync(fullPath)) {
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`[init] Created directory: ${d}`);
} else {
  console.log(`[init] Directory already exists: ${d}`);
}
```

Applied to repair-guide write: write the guide on failure (overwrite OK — it's regenerated state, parallels `flow-ledger.json` overwrite at line 185); delete on success.

---

### `validators/scripts/test-cli.js` (MODIFY — 4 new tests)

**Analog:** `CLI Init Command` (lines 93–141) and `CLI Doctor Command` (lines 144 onward).

**Sandbox setup pattern** (lines 8–19):

```javascript
function setupSandbox() {
  if (fs.existsSync(testSandboxRoot)) {
    fs.rmSync(testSandboxRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(testSandboxRoot, { recursive: true });
  // Pre-create mock skill folders so prereq checks pass on the happy path
  const skills = ['gsd-discuss-phase', 'using-superpowers', 'speckit-specify', 'plan-ceo-review'];
  for (const s of skills) {
    fs.mkdirSync(path.join(testSandboxRoot, '.agents/skills', s), { recursive: true });
  }
}
```

**`runCLI` env injection** (lines 28–42):

```javascript
function runCLI(args = []) {
  const result = spawnSync('node', [cliScriptPath, ...args], {
    env: { ...process.env, PROJECT_ROOT: testSandboxRoot, REPO_ROOT: testSandboxRoot },
    encoding: 'utf8'
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}
```

**Test scaffold pattern** (copy from `addTest('CLI Init Command', ...)` lines 93–141):

```javascript
addTest('CLI Init Strict Gate Fails on Broken Localized SKILL.md', () => {
  setupSandbox();
  // Pre-create a localized skill that still references ~/.gemini/...
  writeFile('.agents/skills/gsd-discuss-phase/SKILL.md',
    '# Test\n<execution_context>\n@~/.gemini/antigravity/workflows/foo.md\n</execution_context>\n');
  const res = runCLI(['init']);
  if (res.code !== 1) throw new Error(`Expected exit 1, got ${res.code}. Stderr: ${res.stderr}`);
  if (!fileExists('.ai/state/repair-guide.md')) throw new Error('Expected repair guide written');
  const guide = readFile('.ai/state/repair-guide.md');
  if (!guide.includes('SKILL.md')) throw new Error('Repair guide must name offending file');
  cleanupSandbox();
});
```

**Required new tests** (per RESEARCH.md "Required-vs-Optional Check Inventory"):

1. Greenfield happy path — strict gate passes, exits 0, no repair guide written.
2. Missing prerequisite — strict gate exits 1 with repair guide containing tool name and `verifyCommand`.
3. Broken localization — SKILL.md `<execution_context>` still references `~/`; init exits 1.
4. Brownfield skip blocks init — pre-existing `CLAUDE.md` lacks `## Subagent & Parallel Execution Guidelines`; strict gate reports "instruction file incomplete" (NOT "tool missing", per D-15-15).

**Assertion helper reuse** — `fileExists`, `readFile`, `writeFile`, `writeJson` (lines 44–68) are already defined and should be used as-is.

---

## Shared Patterns

### Sub-check Result Shape (single source of truth)
**Source:** New `lib/init-checks.js`, modeled on `lib/flow-engine.js#checkArtifacts` return (line 145) and `validatePrerequisites` return (line 74–82).
**Apply to:** every sub-check inside `runStrictChecks` (dirs, flow YAML, ledger, prereqs, localization, instruction sections, feature pointer).

```javascript
{
  id: 'flow.yaml.parse',
  category: 'artifact' | 'tool' | 'localization' | 'instruction',
  required: true,
  passed: false,
  subject: '.ai/flows/rough-project-flow.yaml',
  evidence: { checkedPaths: [...], checkedCommand: '...', parseError: '...', offendingLines: [...], stage: '...' },
  guidance: INSTRUCTIONS_DB.gsd | null
}
```

### Reuse existing primitives — DO NOT re-implement
**Sources:**
- `lib/yaml-parser.js#parseYaml` — used by `handleInit` line 177 and `handleDoctor` line 670. Reuse for `flow.yaml.parse`.
- `lib/flow-engine.js#validateLedger` (lines 16–51) — reuse for `ledger.schema`.
- `lib/tool-validator.js#validatePrerequisites` (lines 21–86) — reuse for all tool/skill probing.
- `lib/flow-engine.js#checkStagePrerequisites` (lines 296–341) — reuse to attach the consuming `stage` to each prereq failure (D-15-08).
- `lib/tool-validator.js#getToolInstructions` (lines 113–122) — reuse to hydrate `result.guidance`.

**Apply to:** every check in `runStrictChecks`. D-15-06 forbids inline duplication.

### Path Safety
**Source:** `bin/adp.js` lines 79, 89, 113 (`path.join(repoRoot, …)` everywhere).
**Apply to:** every filesystem access in `lib/init-checks.js` and `runAndReport`. Never pass a user-derived string as the first arg to `path.join`. Render paths workspace-relative in the repair guide (do not resolve `~` to absolute `/Users/...`).

### Error Reporting Prefix
**Source:** `bin/adp.js` — `[init]`, `[doctor]` log prefixes (lines 77, 82, 94, 640, 657, etc.).
**Apply to:** `formatTerminal(report)` — prefix lines with `[${source}]` so init and doctor outputs are visually consistent (D-15-07).

### Brownfield-Safe Write Policy
**Source:** `bin/adp.js#handleInit` lines 80–86, 91–109, 114–125 (skip if exists).
**Apply to:** repair-guide write is the ONLY file written by strict checks. Existing project files are NEVER modified to satisfy strictness (D-15-03). Strict checks read-only on everything except `.ai/state/repair-guide.md`.

### Markdown Rendering
**Source:** `bin/adp.js#appendSubagentGuidelines` (line 935) — uses plain template-literal strings, no Markdown lib.
**Apply to:** `formatMarkdownGuide` in `lib/init-checks.js`. Schema in RESEARCH.md §"Repair Guide Schema".

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All four touched files have direct analogs in the codebase. |

## Metadata

**Analog search scope:** `lib/`, `bin/`, `validators/scripts/`
**Files scanned:** `lib/flow-engine.js`, `lib/tool-validator.js`, `bin/adp.js` (lines 1–260, 625–965), `validators/scripts/test-cli.js` (lines 1–200)
**Pattern extraction date:** 2026-05-26
