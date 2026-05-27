# Phase 16: Context Budget Gate and Subagent Orchestration Policy - Research

**Researched:** 2026-05-27
**Domain:** Deterministic context-pressure estimation, orchestration policy artifacts, context-pack schema, subagent fan-out rules, fresh-session handoff, validation integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-16-01:** Deterministic/offline budget gate — estimates context pressure from declared artifacts, referenced files, session/handoff files, and context-pack manifests. NOT live token introspection.
- **D-16-02:** Three outcomes: `inline`, `context_pack_required`, `fresh_session_required`.
- **D-16-03:** Configurable thresholds, conservative defaults — bias toward context packs before large implementation/review stages; fresh-session when prior session logs, phase plans, or review artifacts would need to be pasted wholesale.
- **D-16-04:** Integrated with flow-stage resolution, not an advisory side-note. Emitted alongside the next stage instruction before the agent starts work.
- **D-16-05:** Context packs are minimal task manifests: objective, current stage, required decisions, required files, allowed files, excluded/noise files, expected outputs, validation commands, stop conditions, dependency notes.
- **D-16-06:** Context packs stored under durable `.ai/` paths. Must align with existing `.ai/sessions/` or `.ai/state/` ownership rather than competing sources of truth.
- **D-16-07:** Context packs reference canonical files by path; embedding snippets only when a large file makes full inclusion impractical.
- **D-16-08:** Context packs record intentional omissions to prevent downstream agents from inadvertently reloading broad logs.
- **D-16-09:** Subagent fan-out only for independent, non-sequential tasks with disjoint or explicitly coordinated file ownership.
- **D-16-10:** Fan-out requires one context pack per subagent. Subagent receives only its assigned objective, required references, expected output, verification responsibility — no full parent history.
- **D-16-11:** Default parallelism cap: 3 active subagents. User or flow definition may raise it explicitly.
- **D-16-12:** Parent orchestration owns join/merge after all required subagent results complete.
- **D-16-13:** Runtime-neutral fan-out intent with adapter-specific mappings; sequential inline fallback using same context packs when a runtime cannot spawn subagents.
- **D-16-14:** On `fresh_session_required`, write concise handoff/resume artifact and stop. Handoff names: next skill/command, phase/stage, required context pack, open risks, verification commands.
- **D-16-15:** Fresh-session handoff is not a failure state. Preserves current flow stage unless genuinely blocked.
- **D-16-16:** Handoff path reported in terminal/chat output and linked from ledger or state metadata.
- **D-16-17:** Deterministic validation for policy config and context packs: required fields, known outcome values, referenced-file existence, duplicate file ownership in fan-out groups, max-parallelism bounds.
- **D-16-18:** `adp doctor` and strict init detect missing/malformed context-policy artifacts.
- **D-16-19:** Validation fails closed for unsafe orchestration: subagent plan with overlapping write targets and no coordination note, missing context packs for fan-out tasks, fresh-session handoff lacking a resume target.

### Claude's Discretion
Exact module names, field names, file locations, and threshold values — provided the deterministic/offline policy, runtime-neutral fallback, minimal context-pack shape, and validation requirements are preserved.

### Deferred Ideas (OUT OF SCOPE)
Automatic subprocess execution, hosted orchestration, automatic tool installation, multi-flow support. No subprocess spawning from skills or CLI. No LLM-as-judge.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | Deterministic context budget gate estimating context pressure from declared artifacts and emitting `inline`/`context_pack_required`/`fresh_session_required` | Budget estimation model; `resolveNextStage` integration point; new `lib/context-budget.js` module |
| CTX-02 | Context packs as minimal durable task manifests stored under `.ai/` | Schema definition; path `.ai/context-packs/<stage-id>-<timestamp>.json`; `checkArtifacts` reuse |
| CTX-03 | Subagent fan-out policy: independence check, one context pack per subagent, parallelism cap, parent-owned join, runtime-neutral fallback | Fan-out schema in policy config YAML; instruction-file section shape |
| CTX-04 | Fresh-session handoff artifact with next-skill, phase/stage, context pack, open risks, verification commands | Handoff JSON schema; path `.ai/state/context-handoff.json`; ledger `context_policy` metadata |
| CTX-05 | Deterministic validation for policy config and context packs integrated with `adp doctor` and strict init | New check IDs in `runStrictChecks`; new `lib/context-policy-validator.js`; test patterns from `test-flow-engine.js` |

</phase_requirements>

---

## Summary

Phase 16 adds a deterministic, local/offline context budget and orchestration policy layer. It estimates context pressure from file sizes and counts rather than live token counts, emits one of three outcomes alongside each stage instruction, and produces durable artifact schemas (context packs, handoff files, policy config) that existing flow stages and validators consume.

The codebase already has everything needed to build on: `resolveNextStage` and `formatStageInstruction` in `lib/flow-engine.js` are the natural integration points; `runStrictChecks` in `lib/init-checks.js` follows the exact check-result schema the new policy validator must mimic; `checkArtifacts` and `resolveTemplatePath` handle template-variable resolution reusable for context-pack path validation; and `validatePrerequisites`/`getToolInstructions` in `lib/tool-validator.js` demonstrate the deterministic-check + actionable-guidance pattern.

No external packages are required. All artifacts are plain JSON/YAML/Markdown stored under `.ai/` paths that already exist.

**Primary recommendation:** Introduce `lib/context-budget.js` (estimation + policy decision) and `lib/context-policy-validator.js` (schema validation for config, packs, and handoffs). Wire both into `resolveNextStage` return value and into `runStrictChecks`. Provide a policy config file at `.ai/state/context-policy.json`. Store context packs at `.ai/context-packs/`. Write fresh-session handoffs to `.ai/state/context-handoff.json`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Budget estimation (file-size scan) | `lib/context-budget.js` | Flow engine (caller) | Pure computation on local filesystem — no runtime dependency |
| Policy decision (`inline`/`context_pack_required`/`fresh_session_required`) | `lib/context-budget.js` | `lib/flow-engine.js` (integration) | Decision is a pure function of budget estimate + thresholds from config |
| Stage instruction emission | `lib/flow-engine.js` (`formatStageInstruction`) | — | Existing function; extended to append policy block |
| Context pack creation | Agent / skill (at runtime) | `lib/context-policy-validator.js` (validate) | Packs are authored by agents; the library validates them |
| Context pack storage | `.ai/context-packs/` | — | Durable, under existing `.ai/` contract |
| Subagent fan-out policy | `lib/context-budget.js` (policy config reader) | Instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) | Policy YAML declares intent; instruction files translate to runtime-specific behavior |
| Fresh-session handoff artifact | Agent / skill (at runtime) | `lib/context-policy-validator.js` (validate) | Authored by agent on `fresh_session_required`; validated by CLI |
| Validation (config + packs + handoff) | `lib/context-policy-validator.js` | `lib/init-checks.js` (caller) | Mirrors existing `validateLedger` / `validatePrerequisites` pattern |
| Doctor / strict-init integration | `lib/init-checks.js` (`runStrictChecks`) | `bin/adp.js` (`handleDoctor`) | Adds new check IDs to existing structured-result array |

---

## Standard Stack

### Core — No New Packages

This phase requires zero new npm dependencies. All capabilities use Node.js built-ins already used by `lib/flow-engine.js`, `lib/init-checks.js`, and `lib/tool-validator.js`. [VERIFIED: codebase inspection]

| Module | Already Used By | Purpose in Phase 16 |
|--------|-----------------|----------------------|
| `fs` (built-in) | `lib/flow-engine.js`, `lib/init-checks.js` | File existence + size stat for budget estimation |
| `path` (built-in) | all lib files | Path joining, template-variable resolution |
| `os` (built-in) | `lib/init-checks.js`, `lib/tool-validator.js` | `os.homedir()` for skill-path resolution |
| `lib/yaml-parser.js` (local) | `lib/flow-engine.js`, `lib/init-checks.js` | Parse policy config YAML |
| `lib/flow-engine.js` (local) | `bin/adp.js` | `checkArtifacts`, `resolveTemplatePath`, `resolveNextStage` |
| `lib/tool-validator.js` (local) | `lib/flow-engine.js`, `lib/init-checks.js` | Check/guidance pattern reference |

## Package Legitimacy Audit

No new external packages are introduced in this phase. Section is N/A. [VERIFIED: codebase inspection]

---

## Architecture Patterns

### System Architecture Diagram

```
adp status / adp doctor / flow skill invocation
        |
        v
lib/flow-engine.js::resolveNextStage(ledger, flowDef)
        |
        +---> lib/context-budget.js::estimateBudget(stage, repoRoot, policyConfig)
        |           |
        |           +-- fs.statSync() each declared artifact, referenced file,
        |               session log, handoff file, context-pack manifest
        |           +-- sum byte weights against thresholds from policyConfig
        |           +-- return { outcome, estimatedBytes, inputs, thresholdUsed }
        |
        +---> returns { ledgerStage, flowStage, contextPolicy: { outcome, ... } }
        |
        v
lib/flow-engine.js::formatStageInstruction(flowStage, ledgerStage, contextPolicy)
        |
        +-- appends CONTEXT POLICY block to existing stage instruction text
        |
        v
Agent reads output, acts on outcome:
  "inline"                  --> proceed with stage work in current session
  "context_pack_required"   --> create .ai/context-packs/<stage>-<ts>.json, then proceed
  "fresh_session_required"  --> write .ai/state/context-handoff.json, stop, new session

Validation path:
lib/init-checks.js::runStrictChecks()
        |
        +---> lib/context-policy-validator.js::validatePolicyConfig(path)
        +---> lib/context-policy-validator.js::validateContextPack(path)
        +---> lib/context-policy-validator.js::validateHandoffArtifact(path)
        |
        +-- returns structured check results (same schema as existing checks)
        v
bin/adp.js::handleDoctor() / handleInit() -- runAndReport() prints pass/fail + repair guide
```

### Recommended Project Structure (new files only)

```
lib/
├── context-budget.js          # estimateBudget(), computeOutcome(), loadPolicyConfig()
├── context-policy-validator.js # validatePolicyConfig(), validateContextPack(), validateHandoffArtifact()
.ai/
├── state/
│   ├── context-policy.json    # policy config (thresholds, parallelism cap)
│   └── context-handoff.json   # fresh-session handoff artifact (written on demand)
└── context-packs/             # one JSON file per context pack (written by agent)
    └── <stage-id>-<iso-timestamp>.json
validators/scripts/
└── test-context-budget.js     # unit tests mirroring test-flow-engine.js pattern
```

### Pattern 1: Budget Estimation Function

The estimation function is a pure local computation. It accepts a stage, a repo root, and a policy config; it returns a structured result.

**Source:** [ASSUMED] — derived from codebase patterns in `lib/flow-engine.js::checkArtifacts` and `lib/init-checks.js::runStrictChecks`.

```js
// lib/context-budget.js
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = {
  inline_threshold_bytes: 50000,        // <50 KB → inline
  pack_threshold_bytes: 200000,         // 50–200 KB → context_pack_required
  // above pack_threshold → fresh_session_required
  max_parallelism: 3,
  stage_overrides: {}                   // { "<stage-id>": { outcome: "inline" } }
};

/**
 * Resolves byte-weight inputs for the given stage.
 * Inputs: declared artifacts, referenced files, session logs, handoff files,
 * and context-pack manifests already present in .ai/context-packs/.
 *
 * @param {object} flowStage - Flow definition stage (has required_artifacts)
 * @param {string} repoRoot  - Absolute project root
 * @param {object} [variables] - Template variable map
 * @returns {{ totalBytes: number, inputs: Array<{path, bytes}> }}
 */
function estimateBudget(flowStage, repoRoot, variables) { /* ... */ }

/**
 * Applies thresholds to produce the policy outcome.
 * @param {number} totalBytes
 * @param {string} stageId
 * @param {object} policyConfig
 * @returns {'inline'|'context_pack_required'|'fresh_session_required'}
 */
function computeOutcome(totalBytes, stageId, policyConfig) { /* ... */ }

/**
 * Loads .ai/state/context-policy.json, merging with DEFAULT_POLICY.
 * Falls back silently to defaults when file is absent.
 * @param {string} repoRoot
 * @returns {object} merged policy config
 */
function loadPolicyConfig(repoRoot) { /* ... */ }

module.exports = { estimateBudget, computeOutcome, loadPolicyConfig, DEFAULT_POLICY };
```

### Pattern 2: resolveNextStage Extension

`resolveNextStage` currently returns `{ ledgerStage, flowStage }`. Phase 16 extends it to return `{ ledgerStage, flowStage, contextPolicy }`.

**Source:** [VERIFIED: codebase inspection] — `lib/flow-engine.js` lines 61–88.

```js
// lib/flow-engine.js — extend resolveNextStage signature
function resolveNextStage(ledger, flowDefinition, repoRoot, variables) {
  // ... existing priority logic ...
  const { estimateBudget, computeOutcome, loadPolicyConfig } = require('./context-budget');
  const policyConfig = loadPolicyConfig(repoRoot || process.cwd());
  const { totalBytes, inputs } = estimateBudget(flowStage, repoRoot || process.cwd(), variables || {});
  const outcome = computeOutcome(totalBytes, flowStage.id, policyConfig);
  return {
    ledgerStage,
    flowStage,
    contextPolicy: { outcome, estimatedBytes: totalBytes, inputs, policyConfig }
  };
}
```

The existing callers in `bin/adp.js` that destructure `{ ledgerStage, flowStage }` continue to work because `contextPolicy` is additive. Forward it into `formatStageInstruction`.

### Pattern 3: formatStageInstruction Extension

Appends a CONTEXT POLICY block after the existing stage block. [ASSUMED — extension shape]

```js
function formatStageInstruction(flowStage, ledgerStage, contextPolicy) {
  const lines = [/* ... existing lines ... */];
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

### Pattern 4: runStrictChecks Integration

`lib/init-checks.js::runStrictChecks` follows a strict structured-result schema:

```js
{
  id: 'policy.config.exists',  // dot-namespaced check ID
  category: 'artifact',         // 'artifact' | 'tool' | 'skill'
  required: true,               // fails init/doctor when false
  passed: false,
  subject: '.ai/state/context-policy.json',
  evidence: { checkedPaths: ['.ai/state/context-policy.json'], parseError: '...' },
  guidance: null
}
```

New check IDs to add (all in category `'artifact'`, `required: false` for policy config since defaults are safe; `required: true` for packs and handoff when they are declared but malformed):

| Check ID | Subject | Condition |
|----------|---------|-----------|
| `policy.config.exists` | `.ai/state/context-policy.json` | warn-only if absent (defaults apply) |
| `policy.config.parse` | `.ai/state/context-policy.json` | required=true if file exists but is invalid JSON |
| `policy.config.schema` | `.ai/state/context-policy.json` | required=true if fields are out of range |
| `context.packs.schema` | `.ai/context-packs/*.json` | required=true for each discovered pack — validates required fields |
| `context.packs.refs` | `.ai/context-packs/*.json` | required=true — every `required_files` path must exist |
| `context.packs.fanout.conflicts` | `.ai/context-packs/*.json` | required=true — no duplicate write targets across sibling packs |
| `handoff.exists` | `.ai/state/context-handoff.json` | warn-only if ledger has `context_policy.pending_handoff: true` but file absent |
| `handoff.schema` | `.ai/state/context-handoff.json` | required=true if file exists but is malformed |

### Anti-Patterns to Avoid

- **Embedding live token counts:** The gate must stat files, not query a chat API. [D-16-01]
- **Coupling to a single runtime:** Fan-out instructions must have a `sequential_inline_fallback: true` note and no subprocess calls. [D-16-13]
- **Context packs that embed full file bodies:** Reference paths only except targeted snippets. [D-16-07]
- **Silently skipping omissions:** Every omitted file must appear in `omissions` with a reason. [D-16-08]
- **Validation that passes unsafe orchestration:** A fan-out pack with overlapping write targets and no `coordination_note` must be rejected by `validateContextPack`. [D-16-19]
- **Handoff that loses stage:** `context-handoff.json` must include `resume_stage` matching the current ledger stage. [D-16-15]
- **Adding LLM-as-judge:** All checks remain deterministic file and schema checks. [D-16-06 cross-ref Project.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template-variable resolution in artifact paths | custom string replace | `resolveTemplatePath` in `lib/flow-engine.js` | Already handles `{feature_dir}`, `{feature_slug}`, `{phase_id}` |
| File existence + non-empty check | raw `fs.existsSync` scattered inline | `checkArtifacts` in `lib/flow-engine.js` | Returns structured `{ passed, results }` consumed by validation chain |
| Prerequisite check pattern | new checker logic | `validatePrerequisites` in `lib/tool-validator.js` | Handles skill dirs, home dirs, PATH — reuse for any new config deps |
| Structured check result shape | ad-hoc `{ ok, error }` | `runStrictChecks` result schema (see above) | All callers expect `{ id, category, required, passed, subject, evidence, guidance }` |
| YAML parsing | hand-rolled parser | `lib/yaml-parser.js` (`parseYaml`) | Already used for flow definition; policy config can be JSON (simpler) |
| Terminal repair guide formatting | new formatter | `formatTerminal` / `formatMarkdownGuide` in `lib/init-checks.js` | Existing export; pass new check results into it |

**Key insight:** Every infrastructure primitive exists. Phase 16 is entirely additive — new modules, new schemas, new check IDs — wired into existing call sites.

---

## Context-Pack JSON Schema (Recommended)

**Path:** `.ai/context-packs/<stage-id>-<iso-timestamp>.json`

**Example:** `.ai/context-packs/execution-2026-05-27T10-30-00Z.json`

```json
{
  "schema_version": "1.0",
  "created_at": "<ISO 8601>",
  "stage_id": "<flow stage id>",
  "objective": "<one-sentence task objective>",
  "required_decisions": [
    "path/to/CONTEXT.md#Decisions",
    "path/to/REQUIREMENTS.md"
  ],
  "required_files": [
    { "path": "lib/flow-engine.js", "reason": "integration target" }
  ],
  "allowed_files": [
    { "path": "docs/prd.md", "reason": "background only" }
  ],
  "excluded_files": [
    { "path": ".ai/sessions/", "reason": "full session logs are noise for this task" }
  ],
  "omissions": [
    { "path": ".planning/phases/15-*/15-CONTEXT.md", "reason": "prior phase context not needed" }
  ],
  "expected_outputs": [
    { "path": "lib/context-budget.js", "description": "budget estimator module" }
  ],
  "validation_commands": [
    "npm test",
    "node bin/adp.js doctor"
  ],
  "stop_conditions": [
    "All validation_commands exit 0",
    "No required_files referenced by path produce a 404 from fs.existsSync"
  ],
  "dependency_notes": "Parent session created this pack. Run validation_commands before signaling completion to parent.",
  "subagent_fanout": null
}
```

For a fan-out context pack (CTX-03), add:

```json
{
  "subagent_fanout": {
    "group_id": "<parent-stage>-fanout-<ts>",
    "subagent_index": 1,
    "total_subagents": 2,
    "write_targets": ["lib/context-budget.js"],
    "coordination_note": "Sibling subagent owns lib/context-policy-validator.js. Do not modify it.",
    "sequential_inline_fallback": true,
    "join_owner": "parent",
    "max_parallelism": 3
  }
}
```

**Required fields (validation gate):** `schema_version`, `stage_id`, `objective`, `required_files`, `expected_outputs`, `validation_commands`, `stop_conditions`.

**D-16-19 unsafe conditions checked by `validateContextPack`:**
1. `subagent_fanout` present but `write_targets` overlaps with a sibling pack's `write_targets` AND `coordination_note` is absent/empty → FAIL.
2. `subagent_fanout` present but no `sequential_inline_fallback` field → FAIL.
3. `subagent_fanout` present but `join_owner` is absent → FAIL.

---

## Policy Config Schema (Recommended)

**Path:** `.ai/state/context-policy.json`

```json
{
  "schema_version": "1.0",
  "inline_threshold_bytes": 50000,
  "pack_threshold_bytes": 200000,
  "max_parallelism": 3,
  "stage_overrides": {
    "decision_discovery": { "outcome": "inline" },
    "release_readiness": { "outcome": "context_pack_required" }
  },
  "budget_inputs": {
    "include_required_artifacts": true,
    "include_session_logs": true,
    "include_planning_artifacts": true,
    "include_context_packs": true,
    "include_handoff_files": true
  },
  "note": "Conservative defaults. inline_threshold_bytes and pack_threshold_bytes are configurable. Stage overrides take precedence over computed outcomes."
}
```

**Validation rules (CTX-05, D-16-17):**
- `inline_threshold_bytes` must be a positive integer and less than `pack_threshold_bytes`.
- `pack_threshold_bytes` must be a positive integer.
- `max_parallelism` must be a positive integer ≤ 10 (sanity cap).
- `stage_overrides` values must have `outcome` ∈ `{ inline, context_pack_required, fresh_session_required }`.
- File is optional; absence means defaults apply (warn-only, not failure).

---

## Fresh-Session Handoff Artifact Schema (Recommended)

**Path:** `.ai/state/context-handoff.json`
**Written by:** Agent on `fresh_session_required` outcome before stopping.
**Linked from:** Ledger stage entry as `context_policy.handoff_path`.

```json
{
  "schema_version": "1.0",
  "created_at": "<ISO 8601>",
  "resume_stage": "<flow stage id>",
  "next_skill": "gsd-execute-phase",
  "next_command": "node bin/adp.js status",
  "context_pack_path": ".ai/context-packs/execution-2026-05-27T10-30-00Z.json",
  "open_risks": [
    "lib/flow-engine.js has uncommitted changes — review before resuming"
  ],
  "verification_commands": [
    "npm test",
    "node bin/adp.js doctor"
  ],
  "reason": "Accumulated session context (planning artifacts, review logs) exceeded fresh_session threshold."
}
```

**Required fields:** `schema_version`, `resume_stage`, `next_skill`, `context_pack_path`, `verification_commands`.

**D-16-19 checks:**
- `resume_stage` must match a known stage ID in the flow definition.
- `context_pack_path` must exist on disk.
- `verification_commands` must be non-empty.

---

## Budget Estimation Model (CTX-01, D-16-01)

The estimator sums byte-weights of the following input categories using `fs.statSync(path).size`:

| Input Category | Sources | Config Key |
|---------------|---------|-----------|
| Stage artifacts | `flowStage.required_artifacts` paths (resolved via `resolveTemplatePath`) | `include_required_artifacts` |
| Session logs | `.ai/sessions/*.md` matching current session pattern | `include_session_logs` |
| Planning artifacts | `.planning/phases/<current-phase>/*.md` | `include_planning_artifacts` |
| Context packs | `.ai/context-packs/*.json` | `include_context_packs` |
| Handoff files | `.ai/state/context-handoff.json` if present | `include_handoff_files` |

**Sizing rules:**
- Files that do not exist contribute 0 bytes (not an error — artifact may not yet be written).
- Directories are walked shallowly (top-level entries only) to avoid O(n) recursion on large trees.
- `stage_overrides` in policy config bypass computation entirely and force the configured outcome.

**Threshold table (conservative defaults):**

| Range | Outcome |
|-------|---------|
| 0 — 50,000 bytes | `inline` |
| 50,001 — 200,000 bytes | `context_pack_required` |
| > 200,000 bytes | `fresh_session_required` |

These defaults are tuned conservatively: a typical 10-stage planning run accumulates ~80–150 KB of artifacts, landing in `context_pack_required` for later stages (plan_critique, execution) — which is the correct conservative behavior described in D-16-03.

---

## Integration Points (Concrete)

### lib/flow-engine.js

| Function | Change | How |
|----------|--------|-----|
| `resolveNextStage(ledger, flowDef)` | Add optional `repoRoot, variables` params; return `contextPolicy` in result object | Require `./context-budget`; call `estimateBudget` + `computeOutcome`; attach to return value |
| `formatStageInstruction(flowStage, ledgerStage)` | Add optional `contextPolicy` param; append CONTEXT POLICY block | If `contextPolicy` truthy, append block after existing `═══════════════════` line |
| Module exports | Add nothing — `contextPolicy` is in the return value of `resolveNextStage` | No new exports needed |

### lib/init-checks.js

| Function | Change | How |
|----------|--------|-----|
| `runStrictChecks(repoRoot, opts)` | Add policy config, context pack, and handoff artifact checks to `results` array | Require `./context-policy-validator`; call its three validate functions; push structured results using existing schema |
| No new exports | Callers (`bin/adp.js::runAndReport`) already consume the full `results` array | Transparent to callers |

### bin/adp.js

| Command | Change | How |
|---------|--------|-----|
| `doctor` | Picks up new check IDs automatically via `runAndReport → runStrictChecks` | No change required if init-checks integration is correct |
| `init` | Same — `runAndReport(repoRoot, 'init')` already calls `runStrictChecks` | No change required |
| `status` | Could print current context policy outcome for active stage | Optional enhancement; low priority |

### Instruction Files (CLAUDE.md, AGENTS.md, GEMINI.md)

Each file already has a `## Subagent & Parallel Execution Guidelines` section (5 rules from Phase 14). Phase 16 extends or replaces it with a `## Context Budget and Subagent Orchestration Policy` section containing:

1. **Context policy outcomes** — explain `inline`, `context_pack_required`, `fresh_session_required` and required action for each.
2. **Context pack obligation** — when `context_pack_required`, create `.ai/context-packs/<stage>-<ts>.json` before starting work; reference files by path; record omissions.
3. **Fresh-session handoff obligation** — when `fresh_session_required`, write `.ai/state/context-handoff.json` then stop; do not push deeper.
4. **Fan-out gate** — only spawn subagents for tasks that are independent, non-sequential, and have disjoint write targets; one context pack per subagent; cap at `max_parallelism` (default 3).
5. **Sequential fallback** — if the current runtime cannot spawn subagents, execute the same context packs sequentially inline.
6. **Parent join obligation** — parent session owns reconciliation; do not advance the ledger until all subagent results are received and verified.

This section must be appended by `adp init` (following the Phase 14 D-14-02 pattern): check if the section heading exists; if absent, append it.

---

## Ledger Annotation (Optional — Planner Discretion)

The planner may choose to annotate each ledger stage entry with a `context_policy` field when the policy decision is computed. This avoids recomputing the decision if the agent re-invokes the flow engine within the same session.

```json
{
  "id": "execution",
  "status": "in_progress",
  "context_policy": {
    "outcome": "context_pack_required",
    "estimated_bytes": 87432,
    "context_pack_path": ".ai/context-packs/execution-2026-05-27T10-30-00Z.json",
    "handoff_path": null,
    "computed_at": "2026-05-27T10:30:00.000Z"
  }
}
```

D-16-16 requires that `handoff_path` be linked from ledger or state metadata — this field satisfies that requirement.

`createLedgerFromFlow` in `lib/flow-ledger.js` does not need to change — the `context_policy` field is written by `advanceStage` or a new helper `annotateStagePolicy`, not at ledger creation time.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in assert-style (project convention: `assert()` + `assertDeepEqual()`) |
| Config file | none — scripts run directly |
| Quick run command | `node validators/scripts/test-context-budget.js` |
| Full suite command | `npm test` (already includes all `validators/scripts/test-*.js` files) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | `estimateBudget` returns correct byte sum from staged files | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-01 | `computeOutcome` returns correct outcome for each threshold range | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-01 | `stage_overrides` bypass computation | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-01 | `resolveNextStage` returns `contextPolicy` in result | unit | `node validators/scripts/test-flow-engine.js` (extend) | ✅ extend |
| CTX-02 | `validateContextPack` passes valid pack with all required fields | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-02 | `validateContextPack` fails on missing required field | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-02 | `validateContextPack` fails when `required_files` path does not exist | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-03 | Fan-out pack with overlapping `write_targets` and no `coordination_note` fails | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-03 | Fan-out pack missing `sequential_inline_fallback` fails | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-04 | `validateHandoffArtifact` passes valid handoff | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-04 | `validateHandoffArtifact` fails when `context_pack_path` does not exist | unit | `node validators/scripts/test-context-budget.js` | ❌ Wave 0 |
| CTX-05 | `runStrictChecks` emits `policy.config.schema` fail for out-of-range threshold | unit | `node validators/scripts/test-init-checks.js` (extend) | ✅ extend |
| CTX-05 | `adp doctor` exits 1 when context pack has missing required field | integration | `node validators/scripts/test-cli.js` (extend) | ✅ extend |

### Sampling Rate

- **Per task commit:** `node validators/scripts/test-context-budget.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `validators/scripts/test-context-budget.js` — covers CTX-01 through CTX-05 unit tests
- [ ] `lib/context-budget.js` — stub with exported function signatures
- [ ] `lib/context-policy-validator.js` — stub with exported function signatures
- [ ] `.ai/context-packs/` directory — create with `.gitkeep`

---

## Common Pitfalls

### Pitfall 1: Breaking Existing resolveNextStage Callers

**What goes wrong:** Adding `repoRoot` and `variables` as required params to `resolveNextStage` breaks all existing test and CLI callers that pass only `(ledger, flowDef)`.

**Why it happens:** Signature change without backward compatibility.

**How to avoid:** Make `repoRoot` and `variables` optional with defaults (`repoRoot = process.cwd()`, `variables = {}`). When `repoRoot` is undefined, `estimateBudget` can return a safe zero-byte estimate and the outcome defaults to `inline`.

**Warning signs:** `test-flow-engine.js` tests fail with "Cannot read property of undefined" in the budget estimator.

### Pitfall 2: Stat Errors on Template-Variable Paths

**What goes wrong:** `estimateBudget` calls `fs.statSync` on unresolved paths like `{feature_dir}/spec.md`, throwing `ENOENT`.

**Why it happens:** Template variables not substituted before file stats.

**How to avoid:** Always call `resolveTemplatePath(path, variables)` before `fs.statSync`. Wrap all stat calls in try/catch; treat ENOENT as 0 bytes (file not yet written).

**Warning signs:** Budget estimation returns NaN or throws during `plan_critique` stage which has `{feature_slug}` paths.

### Pitfall 3: Context Pack Written Without Omissions Field

**What goes wrong:** A downstream agent reloads broad planning artifacts because the pack's absence of `omissions` is ambiguous — was it an oversight or intentional?

**Why it happens:** `omissions` is not validated as required (only optional best practice).

**How to avoid:** Make `omissions` required in schema validation. An empty array `[]` is valid and explicitly signals "nothing intentionally omitted."

**Warning signs:** D-16-08 coverage gaps in pack validator tests.

### Pitfall 4: Fan-Out Pack Validation Runs Per-File, Not Cross-File

**What goes wrong:** `write_targets` overlap detection checks each pack in isolation; overlaps only appear when comparing sibling packs in the same fan-out group.

**Why it happens:** Per-file validation has no awareness of sibling packs.

**How to avoid:** `validateContextPack` should accept an optional `siblingPacks` array. `runStrictChecks` discovers all `.ai/context-packs/*.json` and groups by `subagent_fanout.group_id` before calling the cross-file check.

**Warning signs:** Two packs both list `lib/flow-engine.js` in `write_targets` but pass individual validation.

### Pitfall 5: Instruction-File Section Append Duplicates

**What goes wrong:** `adp init` appends `## Context Budget and Subagent Orchestration Policy` on each run, creating duplicate sections.

**Why it happens:** Phase 14 used a heading-presence check; Phase 16 must follow the same guard.

**How to avoid:** Before appending, check if the exact heading string appears in the file. Skip if present (same pattern as D-14-02 implementation for `## Subagent & Parallel Execution Guidelines`).

**Warning signs:** `test-cli.js` init tests show doubled heading in generated CLAUDE.md.

---

## Code Examples

### checkArtifacts Reuse Pattern

Reuse `checkArtifacts` from `lib/flow-engine.js` inside `estimateBudget` to resolve and verify artifact paths before stat-ing them. [VERIFIED: codebase inspection, `lib/flow-engine.js` lines 114–149]

```js
// Inside lib/context-budget.js::estimateBudget
const { checkArtifacts, resolveTemplatePath } = require('./flow-engine');
const artifactCheck = checkArtifacts(flowStage, repoRoot, variables);
for (const r of artifactCheck.results) {
  if (r.exists) {
    try {
      const stat = fs.statSync(path.join(repoRoot, r.path));
      inputs.push({ path: r.path, bytes: stat.size });
      totalBytes += stat.size;
    } catch (e) { /* ENOENT → 0 bytes */ }
  }
}
```

### runStrictChecks Check Object Pattern

Follows existing schema exactly. [VERIFIED: codebase inspection, `lib/init-checks.js` lines 39–51]

```js
// Inside lib/init-checks.js::runStrictChecks — add after ledger checks
const { validatePolicyConfig } = require('./context-policy-validator');
const policyConfigPath = '.ai/state/context-policy.json';
const fullPolicyPath = path.join(repoRoot, policyConfigPath);
const policyExists = fs.existsSync(fullPolicyPath);

results.push({
  id: 'policy.config.exists',
  category: 'artifact',
  required: false,      // absence is OK — defaults apply
  passed: true,         // always passes; absence is a warning not a failure
  subject: policyConfigPath,
  evidence: {
    checkedPaths: [policyConfigPath],
    parseError: policyExists ? undefined : 'Policy config absent — using defaults.'
  },
  guidance: null
});

if (policyExists) {
  const valResult = validatePolicyConfig(fullPolicyPath);
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

### Test Pattern (from test-flow-engine.js)

All new tests must follow the existing `assert` / `assertDeepEqual` / `createMockLedger` pattern. [VERIFIED: codebase inspection, `validators/scripts/test-flow-engine.js` lines 1–88]

```js
// validators/scripts/test-context-budget.js
'use strict';
const { estimateBudget, computeOutcome, DEFAULT_POLICY } = require('../../lib/context-budget');
const { validateContextPack } = require('../../lib/context-policy-validator');
let passed = 0; let failed = 0;
function assert(condition, message) {
  if (condition) { passed++; } else { failed++; console.error(`  FAIL: ${message}`); }
}

console.log('--- computeOutcome ---');
{
  const p = DEFAULT_POLICY;
  assert(computeOutcome(0, 'execution', p) === 'inline', 'zero bytes → inline');
  assert(computeOutcome(50001, 'execution', p) === 'context_pack_required', '50001 bytes → pack required');
  assert(computeOutcome(200001, 'execution', p) === 'fresh_session_required', '200001 bytes → fresh session');
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No context pressure signaling — agent infers from chat length | Deterministic file-size estimation with configurable thresholds | Agents get explicit policy outcome before each stage; no inference needed |
| Subagent rules in prose only (CLAUDE.md, AGENTS.md, GEMINI.md) | Structured fan-out context packs with validation gate | Fan-out overlap conflicts are detected before work begins |
| Manual handoff notes in session logs | Durable `.ai/state/context-handoff.json` linked from ledger | New sessions can deterministically resume without parsing chat history |

**Deprecated/outdated:**
- Prose-only subagent section in instruction files: the Phase 16 section supersedes and extends the Phase 14 `## Subagent & Parallel Execution Guidelines` section rather than replacing it entirely.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default thresholds of 50 KB (inline) and 200 KB (pack) are conservative enough for typical 10-stage planning sessions | Budget Estimation Model | If sessions accumulate more, `inline` stages may be under-pressured; planner should document threshold source and make them easy to tune |
| A2 | `resolveNextStage` callers in `bin/adp.js` do not depend on the return value being exactly `{ ledgerStage, flowStage }` (no destructuring that would break on extra fields) | Integration Points | Need to verify bin/adp.js callers before extension — low risk since JS object destructuring ignores extra keys |
| A3 | The instruction-file section for context policy should be appended rather than replacing the Phase 14 subagent section | Instruction Files | If the two sections conflict at runtime, agents may apply contradictory rules; merging into one section is the safer choice but requires reviewing Phase 14 content |
| A4 | `.ai/context-packs/` is an appropriate new subdirectory under `.ai/` and does not conflict with the artifact registry ownership rules | Architecture Patterns | artifact-registry.md does not list this path; the planner should add it |

---

## Open Questions

1. **Instruction-file section: extend or replace Phase 14 section?**
   - What we know: Phase 14 added `## Subagent & Parallel Execution Guidelines` (5 rules). Phase 16 adds richer context-pack and handoff obligations.
   - What's unclear: Whether to merge into one section or have two adjacent sections.
   - Recommendation: Merge into `## Context Budget and Subagent Orchestration Policy` (replaces Phase 14 section heading only; content supersedes and extends). Add presence check for both the old and new heading.

2. **Ledger context_policy annotation: optional or required?**
   - What we know: D-16-16 requires handoff path be "linked from ledger or state metadata."
   - What's unclear: Whether annotating every stage or only the `fresh_session_required` stage is sufficient.
   - Recommendation: Annotate only when outcome is `context_pack_required` or `fresh_session_required` (not `inline`) to minimize ledger mutation surface.

3. **Should `adp status` display the current context policy outcome?**
   - What we know: Current `handleStatus` reads ledger and prints stage name and gate status.
   - What's unclear: Whether displaying the policy outcome is useful or noisy for most users.
   - Recommendation: Display it only when outcome is not `inline` (i.e., action is required from the agent). This avoids noise on small sessions.

---

## Environment Availability

This phase is purely code/config changes. No external runtime dependencies beyond existing Node.js project. Step 2.6: SKIPPED (no external dependencies identified).

---

## Security Domain

This phase introduces no authentication, session management, cryptography, or user-facing input surfaces. The only new external input is JSON/YAML config files read from the local filesystem.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes (JSON/YAML config, context-pack files) | Explicit field validation in `lib/context-policy-validator.js`; reject unknown outcome values; clamp `max_parallelism` to ≤ 10 |
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V6 Cryptography | no | — |

| Threat Pattern | STRIDE | Mitigation |
|----------------|--------|-----------|
| Malformed context-pack causes validator crash | Denial | Wrap all `JSON.parse` / `fs.readFileSync` in try/catch; report as check failure, not process crash |
| Context pack with absolute paths escaping `.ai/` | Tampering | Validate that all `required_files` and `expected_outputs` paths are relative (no leading `/` or `..` that exits repo root) |
| Overlapping fan-out write targets causing data loss | Tampering | D-16-19 cross-file validation; reject without coordination note |

---

## Sources

### Primary (HIGH confidence)
- `/Volumes/D/snail-agent-flow/lib/flow-engine.js` — `resolveNextStage`, `formatStageInstruction`, `checkArtifacts`, `resolveTemplatePath`, `checkStagePrerequisites`, `advanceStage` — read and analyzed directly
- `/Volumes/D/snail-agent-flow/lib/init-checks.js` — `runStrictChecks` check-result schema, check ID naming pattern, `formatTerminal`, `formatMarkdownGuide` — read and analyzed directly
- `/Volumes/D/snail-agent-flow/lib/tool-validator.js` — `validatePrerequisites`, `getToolInstructions`, `INSTRUCTIONS_DB` pattern — read and analyzed directly
- `/Volumes/D/snail-agent-flow/lib/flow-ledger.js` — `createLedgerFromFlow` ledger shape — read and analyzed directly
- `/Volumes/D/snail-agent-flow/bin/adp.js` — `handleDoctor`, `handleInit`, `runAndReport` call patterns — read and analyzed directly
- `/Volumes/D/snail-agent-flow/validators/scripts/test-flow-engine.js` — test pattern (`assert`, `assertDeepEqual`, `createMockLedger`, `createMockFlowDefinition`) — read and analyzed directly
- `/Volumes/D/snail-agent-flow/.ai/flows/rough-project-flow.yaml` — stage declarations, artifact path shapes — read and analyzed directly
- `/Volumes/D/snail-agent-flow/.ai/state/flow-ledger.json` — ledger JSON shape in production — read and analyzed directly
- `/Volumes/D/snail-agent-flow/docs/artifact-registry.md` — path ownership rules — read and analyzed directly
- `/Volumes/D/snail-agent-flow/.planning/phases/16-context-budget-gate-and-subagent-orchestration-policy/16-CONTEXT.md` — all 19 locked decisions — read in full
- `/Volumes/D/snail-agent-flow/.planning/phases/14-improve-ai-for-spawn-subagent-support/14-CONTEXT.md` — Phase 14 subagent localization decisions (D-14-01 through D-14-04) — read and analyzed
- `/Volumes/D/snail-agent-flow/.planning/phases/15-strict-initialization-checks-and-detailed-installation-guide/15-CONTEXT.md` — Phase 15 strict-init decisions (D-15-01 through D-15-16) — read and analyzed
- `/Volumes/D/snail-agent-flow/CLAUDE.md`, `AGENTS.md`, `GEMINI.md` — existing `## Subagent & Parallel Execution Guidelines` section shape — confirmed via grep

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — confirmed CTX-01..CTX-05 are not yet listed; must be added as part of Phase 16 traceability update [ASSUMED — requirements file does not contain CTX-XX; they appear only in STATE.md]

### Tertiary (LOW confidence)
- None. All findings are from codebase inspection of the actual project.

---

## Metadata

**Confidence breakdown:**
- Integration points: HIGH — derived from direct codebase read
- Schema designs: MEDIUM — derived from codebase patterns; exact field names are Claude's discretion per CONTEXT.md
- Budget thresholds: ASSUMED — conservative values chosen; no empirical session-size data available
- Pitfalls: HIGH — derived from existing code patterns and Phase 14/15 precedent

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable codebase; no external dependencies)
