# Phase 16: Context Budget Gate and Subagent Orchestration Policy - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/context-budget.js` | utility | transform (file-stat → policy outcome) | `lib/tool-validator.js` | role-match |
| `lib/context-policy-validator.js` | utility | transform (JSON → validation result) | `lib/flow-engine.js` (`validateLedger`) | role-match |
| `lib/flow-engine.js` (modify) | utility | request-response | `lib/flow-engine.js` itself | exact (self) |
| `lib/init-checks.js` (modify) | utility | request-response | `lib/init-checks.js` itself | exact (self) |
| `bin/adp.js` (modify) | config/CLI | request-response | `bin/adp.js` itself | exact (self) |
| `validators/scripts/test-context-budget.js` | test | batch | `validators/scripts/test-flow-engine.js` | exact |
| `.ai/state/context-policy.json` | config | — | `.ai/state/flow-ledger.json` | role-match |
| `.ai/context-packs/<stage>-<ts>.json` | artifact | — | `.ai/state/flow-ledger.json` | role-match |

---

## Pattern Assignments

### `lib/context-budget.js` (utility, transform)

**Analog:** `lib/tool-validator.js`

**Imports pattern** (`lib/tool-validator.js` lines 1–4):
```js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');
```

For `lib/context-budget.js`, drop `spawnSync`/`child_process`/`os`; add only `fs` and `path`. No external packages.

**Module shape pattern** (`lib/tool-validator.js` lines 180–184):
```js
module.exports = {
  validatePrerequisites,
  getToolInstructions,
  INSTRUCTIONS_DB
};
```

Mirror this shape exactly for context-budget:
```js
module.exports = { estimateBudget, computeOutcome, loadPolicyConfig, DEFAULT_POLICY };
```

**Structured-result-per-input pattern** (`lib/tool-validator.js` lines 74–85):
```js
results.push({
  name: pre.name,
  available,
  reason: available
    ? undefined
    : checkedPaths.length
      ? `Could not find skill folder in: [${checkedPaths.join(', ')}]...`
      : `Check command "${checkedCommand}" did not succeed.`
});
```

Apply analogously in `estimateBudget` — one entry per input file:
```js
inputs.push({ path: resolvedPath, bytes: stat.size });
```

**Try/catch on filesystem calls** (`lib/flow-engine.js` lines 130–139):
```js
try {
  exists = fs.existsSync(fullPath);
  if (exists) {
    const stat = fs.statSync(fullPath);
    nonEmpty = stat.size > 0;
  }
} catch (e) {
  exists = false;
  nonEmpty = false;
}
```

Use this exact pattern in `estimateBudget` stat calls — ENOENT contributes 0 bytes, never throws.

**Template-variable resolution before path ops** (`lib/flow-engine.js` lines 97–104):
```js
function resolveTemplatePath(templatePath, variables) {
  if (!templatePath || !variables) return templatePath;
  let resolved = templatePath;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return resolved;
}
```

Always call `resolveTemplatePath(templatePath, variables)` (re-exported from `lib/flow-engine.js`) before any `fs.statSync` call in `estimateBudget`.

**Fallback/default merge pattern** (`lib/tool-validator.js` lines 88–106, `INSTRUCTIONS_DB` constant):
```js
const INSTRUCTIONS_DB = {
  gsd: { description: "...", instructions: "...", ... }
};
```

Mirror as `DEFAULT_POLICY` constant at module top:
```js
const DEFAULT_POLICY = {
  inline_threshold_bytes: 50000,
  pack_threshold_bytes: 200000,
  max_parallelism: 3,
  stage_overrides: {},
  budget_inputs: {
    include_required_artifacts: true,
    include_session_logs: true,
    include_planning_artifacts: true,
    include_context_packs: true,
    include_handoff_files: true
  }
};
```

`loadPolicyConfig` merges file contents over `DEFAULT_POLICY`; falls back silently to defaults when `.ai/state/context-policy.json` is absent (same silent fallback philosophy as prerequisite checks that return `available: false` without crashing).

---

### `lib/context-policy-validator.js` (utility, transform)

**Analog:** `lib/flow-engine.js` — specifically `validateLedger`

**Imports pattern** (`lib/flow-engine.js` lines 1–2):
```js
const fs = require('fs');
const path = require('path');
```

Identical — no additional imports.

**Validation return shape** (`lib/flow-engine.js` lines 16–51):
```js
function validateLedger(ledger) {
  const errors = [];

  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['Ledger must be a non-null object.'] };
  }

  // field checks push to errors[]...

  return { valid: errors.length === 0, errors };
}
```

All three validator functions must return `{ valid: boolean, errors: string[] }`:
```js
function validatePolicyConfig(fullPath) { /* returns { valid, errors } */ }
function validateContextPack(fullPath, siblingPacks) { /* returns { valid, errors } */ }
function validateHandoffArtifact(fullPath, knownStageIds) { /* returns { valid, errors } */ }
```

**JSON parse with error capture** (`lib/init-checks.js` lines 127–136):
```js
try {
  const { validateLedger } = require('./flow-engine');
  const ledgerJson = fs.readFileSync(fullLedgerPath, 'utf8');
  const ledger = JSON.parse(ledgerJson);
  const valResult = validateLedger(ledger);
  ledgerValid = valResult.valid;
  ledgerErrors = valResult.errors || [];
} catch (e) {
  ledgerParseError = e.message;
}
```

Apply the same try/catch wrapping every `fs.readFileSync` + `JSON.parse` call inside each validator function. A parse failure returns `{ valid: false, errors: [e.message] }`.

**Module exports**:
```js
module.exports = { validatePolicyConfig, validateContextPack, validateHandoffArtifact };
```

---

### `lib/flow-engine.js` — `resolveNextStage` extension (modify)

**Analog:** `lib/flow-engine.js` lines 61–88 (self, additive change)

**Existing signature and return** (lines 61–88):
```js
function resolveNextStage(ledger, flowDefinition) {
  if (!ledger || !Array.isArray(ledger.stages)) {
    return null;
  }
  // ... priority logic ...
  return { ledgerStage: stage, flowStage };
}
```

**Extension rule:** Add `repoRoot` and `variables` as optional trailing params with defaults. Never make them required — existing callers in `bin/adp.js` and `test-flow-engine.js` pass only `(ledger, flowDef)`.

```js
function resolveNextStage(ledger, flowDefinition, repoRoot, variables) {
  repoRoot = repoRoot || process.cwd();
  variables = variables || {};
  // ... existing priority logic unchanged ...
  // After resolving ledgerStage + flowStage:
  const { estimateBudget, computeOutcome, loadPolicyConfig } = require('./context-budget');
  const policyConfig = loadPolicyConfig(repoRoot);
  const { totalBytes, inputs } = estimateBudget(flowStage, repoRoot, variables);
  const outcome = computeOutcome(totalBytes, flowStage ? flowStage.id : null, policyConfig);
  return {
    ledgerStage,
    flowStage,
    contextPolicy: { outcome, estimatedBytes: totalBytes, inputs, policyConfig }
  };
}
```

The `null` return path remains `return null` unchanged — `contextPolicy` is only attached to a valid result.

**`formatStageInstruction` extension** (`lib/flow-engine.js` lines 250–285):
```js
function formatStageInstruction(flowStage, ledgerStage) {
  const lines = [];
  lines.push('═══ NEXT STAGE ═══');
  // ... existing lines ...
  lines.push('═══════════════════');
  return lines.join('\n');
}
```

Add optional third param `contextPolicy`. Append after the existing footer line:
```js
function formatStageInstruction(flowStage, ledgerStage, contextPolicy) {
  const lines = [];
  // ... all existing content unchanged ...
  lines.push('═══════════════════');

  if (contextPolicy) {
    lines.push('');
    lines.push('─── CONTEXT POLICY ───');
    lines.push(`Outcome:   ${contextPolicy.outcome}`);
    lines.push(`Est. size: ${(contextPolicy.estimatedBytes / 1024).toFixed(1)} KB`);
    if (contextPolicy.outcome === 'context_pack_required') {
      lines.push('Action:    Create .ai/context-packs/<stage>-<timestamp>.json before starting work.');
      lines.push('           Reference required files by path. Record omissions.');
    }
    if (contextPolicy.outcome === 'fresh_session_required') {
      lines.push('Action:    Write .ai/state/context-handoff.json then STOP this session.');
      lines.push('           A new session will resume from this stage using the handoff artifact.');
    }
    lines.push('──────────────────────');
  }

  return lines.join('\n');
}
```

**Module exports extension** (`lib/flow-engine.js` lines 343–353): No new exports needed — `contextPolicy` is embedded in `resolveNextStage` return value.

---

### `lib/init-checks.js` — `runStrictChecks` extension (modify)

**Analog:** `lib/init-checks.js` lines 100–150 (self, additive change)

**Existing check-push pattern** (lines 62–74 for a required artifact check):
```js
results.push({
  id: 'flow.yaml.exists',
  category: 'artifact',
  required: true,
  passed: flowExists,
  subject: flowPath,
  evidence: {
    checkedPaths: [flowPath],
    parseError: flowExists ? undefined : 'Flow YAML file is missing.'
  },
  guidance: null
});
```

**Conditional deeper check pattern** (lines 123–150 — exists gate before schema check):
```js
if (ledgerExists) {
  let ledgerValid = false;
  let ledgerParseError = null;
  let ledgerErrors = [];
  try {
    const { validateLedger } = require('./flow-engine');
    const ledgerJson = fs.readFileSync(fullLedgerPath, 'utf8');
    const ledger = JSON.parse(ledgerJson);
    const valResult = validateLedger(ledger);
    ledgerValid = valResult.valid;
    ledgerErrors = valResult.errors || [];
  } catch (e) {
    ledgerParseError = e.message;
  }

  results.push({
    id: 'ledger.schema',
    category: 'artifact',
    required: true,
    passed: ledgerValid && !ledgerParseError,
    subject: ledgerPath,
    evidence: {
      parseError: ledgerParseError || (ledgerErrors.length ? ledgerErrors.join('; ') : undefined),
      offendingLines: ledgerErrors.length ? ledgerErrors : undefined
    },
    guidance: null
  });
}
```

Copy this two-phase pattern (exists → parse/schema) for each new policy artifact. New check IDs to add at the end of `runStrictChecks`, before the `return` statement:

```js
// Phase 16: policy.config.exists / policy.config.schema
const policyConfigPath = '.ai/state/context-policy.json';
const fullPolicyConfigPath = path.join(repoRoot, policyConfigPath);
let policyConfigExists = false;
try { policyConfigExists = fs.existsSync(fullPolicyConfigPath); } catch (e) {}

results.push({
  id: 'policy.config.exists',
  category: 'artifact',
  required: false,           // absence is OK — defaults apply; warn-only
  passed: true,              // always passes; absence is a warning conveyed via evidence
  subject: policyConfigPath,
  evidence: {
    checkedPaths: [policyConfigPath],
    parseError: policyConfigExists ? undefined : 'Policy config absent — using defaults.'
  },
  guidance: null
});

if (policyConfigExists) {
  const { validatePolicyConfig } = require('./context-policy-validator');
  const valResult = validatePolicyConfig(fullPolicyConfigPath);
  results.push({
    id: 'policy.config.schema',
    category: 'artifact',
    required: true,
    passed: valResult.valid,
    subject: policyConfigPath,
    evidence: {
      parseError: valResult.errors.length ? valResult.errors.join('; ') : undefined
    },
    guidance: null
  });
}
```

The warnings-vs-failures separation is automatic: `required: false` checks that fail land in `report.warnings`; `required: true` checks that fail land in `report.failures`. See `lib/init-checks.js` lines 452–461:
```js
const failures = results.filter(r => r.required && !r.passed);
const warnings = results.filter(r => !r.required && !r.passed);
return { ok: failures.length === 0, summary: `...`, results, failures, warnings };
```

**`instructions.subagentSection` pattern for heading-presence check** (lines 367–395):
```js
const filesToCheck = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
for (const f of filesToCheck) {
  const fullPath = path.join(repoRoot, f);
  let exists = false;
  try { exists = fs.existsSync(fullPath); } catch (e) {}
  if (exists) {
    let content = '';
    let passed = false;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
      passed = content.includes('## Subagent & Parallel Execution Guidelines');
    } catch (e) { passed = false; }
    results.push({
      id: 'instructions.subagentSection',
      category: 'instruction',
      required: true,
      passed,
      subject: f,
      evidence: {
        parseError: passed ? undefined : `Missing heading "## Subagent & Parallel Execution Guidelines" in ${f}`
      },
      guidance: null
    });
  }
}
```

Copy this pattern for the new `instructions.contextPolicySection` check — replace the heading string with `'## Context Budget and Subagent Orchestration Policy'`.

---

### `bin/adp.js` (modify — minimal)

**Analog:** `bin/adp.js` itself (self, transparent via `runStrictChecks`)

Per RESEARCH.md Integration Points: `doctor` and `init` commands pick up new check IDs automatically through `runAndReport → runStrictChecks`. No explicit changes to `bin/adp.js` are required unless `adp status` is extended to print the context policy outcome.

If `adp status` is extended, follow the existing status-print pattern already in `bin/adp.js` — read the ledger JSON, call `resolveNextStage`, print structured output. The `contextPolicy` field from the extended return value is available there.

---

### `validators/scripts/test-context-budget.js` (test, batch)

**Analog:** `validators/scripts/test-flow-engine.js` — exact pattern

**File header and imports** (lines 1–22):
```js
/**
 * Test suite for lib/context-budget.js and lib/context-policy-validator.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  estimateBudget,
  computeOutcome,
  loadPolicyConfig,
  DEFAULT_POLICY
} = require('../../lib/context-budget');

const {
  validatePolicyConfig,
  validateContextPack,
  validateHandoffArtifact
} = require('../../lib/context-policy-validator');
```

**Test runner boilerplate** (lines 23–46):
```js
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${expectedStr}`);
    console.error(`    Actual:   ${actualStr}`);
  }
}
```

**Temp-dir fixture pattern** (lines 219–238 of `test-flow-engine.js`):
```js
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-engine-test-'));
const testFile = path.join(tmpDir, 'test-artifact.md');
fs.writeFileSync(testFile, '# Test Content\n', 'utf8');

// ... test logic ...

// Cleanup
fs.unlinkSync(testFile);
fs.rmdirSync(tmpDir);
```

Use the same temp-dir pattern in `test-context-budget.js` for tests that need real files on disk (e.g., `estimateBudget` stat calls, `validateContextPack` required_files existence check). Name the temp prefix `context-budget-test-`.

**Section headers** (lines 90–94 of `test-flow-engine.js`):
```js
// ============================================================
// validateLedger tests
// ============================================================

console.log('--- validateLedger ---');
```

Use the same `// ===...===` block comment style and `console.log('--- sectionName ---')` for each test section.

**Summary and exit** (lines 555–560 of `test-flow-engine.js`):
```js
console.log('');
console.log(`Flow engine tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
```

Mirror exactly, changing the label:
```js
console.log(`Context budget tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
```

---

### `.ai/state/context-policy.json` (config artifact)

**Analog:** `.ai/state/flow-ledger.json` — JSON, flat structure, `schema_version` field, written once at init

**JSON style:** 2-space indentation, all lowercase snake_case keys, no trailing commas.

Content shape (from RESEARCH.md):
```json
{
  "schema_version": "1.0",
  "inline_threshold_bytes": 50000,
  "pack_threshold_bytes": 200000,
  "max_parallelism": 3,
  "stage_overrides": {},
  "budget_inputs": {
    "include_required_artifacts": true,
    "include_session_logs": true,
    "include_planning_artifacts": true,
    "include_context_packs": true,
    "include_handoff_files": true
  },
  "note": "Conservative defaults. Stage overrides take precedence over computed outcomes."
}
```

Written by `adp init` only if not already present (idempotent). Do not overwrite on re-init.

---

### `.ai/context-packs/<stage-id>-<ts>.json` (artifact)

**Analog:** `.ai/state/flow-ledger.json` — durable JSON artifact under `.ai/`, written by agent/skill at runtime

**Required fields validated by `validateContextPack`:** `schema_version`, `stage_id`, `objective`, `required_files`, `expected_outputs`, `validation_commands`, `stop_conditions`, `omissions` (empty array `[]` is valid — must be present).

**Fan-out subagent cross-file validation** (`validateContextPack` must accept optional `siblingPacks` array for cross-file write_targets overlap check — see RESEARCH.md Pitfall 4).

---

## Shared Patterns

### CommonJS Module Shape
**Source:** Every `lib/*.js` file in the project
**Apply to:** `lib/context-budget.js`, `lib/context-policy-validator.js`
```js
'use strict';
const fs = require('fs');
const path = require('path');

// ... functions ...

module.exports = { fn1, fn2, CONSTANT };
```

### Structured Validation Result `{ valid, errors }`
**Source:** `lib/flow-engine.js` `validateLedger`, lines 16–51
**Apply to:** All three functions in `lib/context-policy-validator.js`
```js
function validateX(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['X must be a non-null object.'] };
  }
  // field checks push to errors[]
  return { valid: errors.length === 0, errors };
}
```

### Structured Check Result Schema for `runStrictChecks`
**Source:** `lib/init-checks.js` lines 39–51, 62–74, 87–98
**Apply to:** All new check pushes inside `lib/init-checks.js`
```js
results.push({
  id: 'dot.namespaced.id',   // e.g. 'policy.config.schema'
  category: 'artifact',       // 'artifact' | 'tool' | 'skill' | 'instruction' | 'localization'
  required: true,             // false → warning-only; true → blocks doctor/init
  passed: boolean,
  subject: 'relative/path/to/subject',
  evidence: {
    checkedPaths: ['path1'],   // optional array
    parseError: 'human message' // optional string; undefined when passed
  },
  guidance: null              // null for artifact checks; guidance object for tool checks
});
```

### Try/Catch on All fs Calls
**Source:** `lib/flow-engine.js` lines 130–139; `lib/init-checks.js` lines 28–37
**Apply to:** `lib/context-budget.js`, `lib/context-policy-validator.js`, new blocks in `lib/init-checks.js`
```js
try {
  exists = fs.existsSync(fullPath);
  if (exists) {
    const stat = fs.statSync(fullPath);
    // use stat
  }
} catch (e) {
  exists = false;
  // treat ENOENT or other FS error as "not present"
}
```

### Two-Phase Check (Exists → Parse/Schema)
**Source:** `lib/init-checks.js` lines 53–98 (`flow.yaml.exists` + `flow.yaml.parse`)
**Apply to:** All three new artifact check groups in `lib/init-checks.js`
```js
// Phase 1: existence (required: true or false depending on artifact)
results.push({ id: 'x.exists', ... });

// Phase 2: only if exists
if (xExists) {
  const valResult = validateX(fullPath);
  results.push({ id: 'x.schema', required: true, passed: valResult.valid, ... });
}
```

### Idempotent Section Append in Instruction Files
**Source:** `lib/init-checks.js` lines 367–395 (heading-presence check) + Phase 14 D-14-02 precedent
**Apply to:** `bin/adp.js` `adp init` handler when appending `## Context Budget and Subagent Orchestration Policy`
```js
const content = fs.readFileSync(fullPath, 'utf8');
const heading = '## Context Budget and Subagent Orchestration Policy';
if (!content.includes(heading)) {
  fs.appendFileSync(fullPath, '\n' + heading + '\n' + sectionBody, 'utf8');
}
```

Also check for the old Phase 14 heading `'## Subagent & Parallel Execution Guidelines'` to decide whether to replace or append (see RESEARCH.md Open Question 1 — recommendation: merge into single new section, check both headings).

---

## No Analog Found

All files have a close match. No entries.

---

## Metadata

**Analog search scope:** `lib/`, `validators/scripts/`, `bin/`, `.ai/state/`
**Files read:** 6 source files
**Pattern extraction date:** 2026-05-27
