# Implementation Plan: Flow Initialization and Ledger State

**Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

### 1. Package Configuration

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)
- Add `"lib/"` to the `"files"` array so `yaml-parser.js` and `tool-validator.js` ship with the package.

---

### 2. Ledger Factory Module

#### [NEW] [flow-ledger.js](file:///Volumes/D/snail-agent-flow/lib/flow-ledger.js)
- New module with a `createLedgerFromFlow(flowDefinition)` function.
- Accepts a parsed flow definition object (output of `parseYaml`).
- Returns a ledger JSON object with:
  - `flow_name`, `flow_version`, `flow_definition_path` from the definition metadata
  - `current_stage` set to the first stage ID
  - `created_at`, `updated_at` set to current ISO timestamp
  - `stages` array generated from the definition's stages, each with:
    - `id`, `name` copied from definition
    - `status`: `"pending"`
    - `artifacts`: `[]`
    - `gate_result`: `null`
    - `started_at`: `null`
    - `completed_at`: `null`
    - `revision_count`: `0`
  - `revision_history`: `[]`

---

### 3. SKILL.md Template

#### [NEW] [project-flow-skill-template.md](file:///Volumes/D/snail-agent-flow/.specify/templates/project-flow-skill-template.md)
- A SKILL.md template with YAML frontmatter (`name: project-flow`, `description`).
- Markdown instructions telling agents:
  - Where to find the flow definition (`.ai/flows/rough-project-flow.yaml`)
  - Where to find the ledger state (`.ai/state/flow-ledger.json`)
  - That this is a stub — full orchestration is Phase 10
  - How to read the ledger to determine the current stage

---

### 4. Init Extension

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
- Add `.ai/flows` to the `dirs` array in `handleInit()`.
- After directory creation, add three new blocks:
  1. **Copy flow definition**: Copy `rough-project-flow.yaml` from `packageRoot/.specify/templates/` to `repoRoot/.ai/flows/` (skip-if-exists).
  2. **Generate ledger**: Parse the flow definition YAML using `require('../lib/yaml-parser')`, pass to `createLedgerFromFlow()`, write to `repoRoot/.ai/state/flow-ledger.json` (skip-if-exists). Wrap in try-catch to handle parse failures gracefully.
  3. **Generate SKILL.md**: Copy the skill template from `packageRoot/.specify/templates/project-flow-skill-template.md` to `repoRoot/.agents/skills/project-flow/SKILL.md` (skip-if-exists, create directory if needed).

---

### 5. Tests

#### [MODIFY] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)
- Add test cases:
  - **Greenfield flow init**: Run init in a clean temp dir, verify `.ai/flows/rough-project-flow.yaml` exists and is valid YAML.
  - **Greenfield ledger init**: Verify `.ai/state/flow-ledger.json` exists, parse it, check stage count matches flow definition, all statuses are `pending`.
  - **Greenfield skill init**: Verify `.agents/skills/project-flow/SKILL.md` exists with correct frontmatter.
  - **Brownfield skip**: Pre-create the flow files, run init again, verify files are not modified (compare mtimes or content).
  - **Ledger stage ID match**: Verify each ledger stage ID matches the corresponding flow definition stage ID.

---

### 6. Feature Directory Cleanup

#### [DELETE] [specs/009-artifact-gate-enforcement](file:///Volumes/D/snail-agent-flow/specs/009-artifact-gate-enforcement)
- Already removed. Was a misnamed scaffold from a previous session.

#### [MODIFY] [feature.json](file:///Volumes/D/snail-agent-flow/.specify/feature.json)
- Update `feature_directory` to `specs/009-flow-initialization-ledger`.

## Verification Plan

### Automated Tests

```bash
# Run spec validation
npm run validate

# Run full test suite including new flow init tests
npm test

# Run only CLI tests (focused feedback loop)
npm run test:cli
```

### Manual Verification

```bash
# Test greenfield init
mkdir /tmp/test-phase09 && cd /tmp/test-phase09
node /Volumes/D/snail-agent-flow/bin/adp.js init
cat .ai/flows/rough-project-flow.yaml
cat .ai/state/flow-ledger.json
cat .agents/skills/project-flow/SKILL.md

# Test brownfield init (run again)
node /Volumes/D/snail-agent-flow/bin/adp.js init
# Should print "already exists" for flow files
```

## Artifact Layout

- `specs/009-flow-initialization-ledger/spec.md`
- `specs/009-flow-initialization-ledger/plan.md`
- `specs/009-flow-initialization-ledger/tasks.md`
- `specs/009-flow-initialization-ledger/checklists/requirements.md`
