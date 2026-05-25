# Implementation Plan: Flow Engine Skill

**Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

## Proposed Changes

### Component 1: Flow Engine Library (`lib/flow-engine.js`)

#### [NEW] [flow-engine.js](file:///Volumes/D/snail-agent-flow/lib/flow-engine.js)

New module exporting five functions:

- **`resolveNextStage(ledger)`** — Iterates `ledger.stages`, returns the first stage with `status === 'needs_revision'`, then falls back to the first with `status === 'pending'`. Returns `null` if all are `done`. Also cross-references the flow definition to return the full stage metadata (skill, command, required_artifacts, revision_routing).

- **`checkArtifacts(stage, flowStage, repoRoot, variables)`** — Takes the ledger stage entry, corresponding flow definition stage, and a `variables` map (e.g., `{ feature_dir: 'specs/010-flow-engine-skill', phase_id: '10', feature_slug: '010-flow-engine-skill' }`). Resolves template variables in artifact paths, then checks `fs.existsSync()` and `fs.statSync().size > 0`. Returns `{ passed: boolean, results: [{ path, exists, nonEmpty }] }`.

- **`advanceStage(ledger, stageId, artifactPaths)`** — Sets `stages[stageId].status = 'done'`, `completed_at = now`, `artifacts = artifactPaths`. Updates `current_stage` to the next non-done stage. Sets root `updated_at`. Returns the mutated ledger.

- **`triggerRevision(ledger, fromStageId, toStageId, reason)`** — Finds the index range from `toStageId` through `fromStageId`. Resets all stages in that range to `status: 'needs_revision'`, clears `completed_at`, `gate_result`, and `artifacts` array, increments `revision_count`. Sets `current_stage = toStageId`. Appends `{ from_stage, to_stage, reason, timestamp }` to `revision_history`. Returns the mutated ledger.

- **`validateLedger(ledger)`** — Lightweight schema validation: checks required top-level fields exist (`flow_name`, `current_stage`, `stages`), all stage IDs are non-empty strings, all statuses are valid enum values (`pending`, `in_progress`, `done`, `blocked`, `needs_revision`). Returns `{ valid: boolean, errors: string[] }`. Called defensively before mutations.

- **`formatStageInstruction(flowStage, ledgerStage)`** — Returns a formatted string matching the D-10-03 structured block format with stage name, ID, skill, command, required artifacts with headings, and revision routes.

Dependencies: `fs`, `path`, `./yaml-parser` (for parsing flow definitions), `./flow-ledger` (for ledger schema reference).

---

### Component 2: Flow Engine SKILL.md

#### [MODIFY] [SKILL.md](file:///Volumes/D/snail-agent-flow/.agents/skills/project-flow/SKILL.md)

Replace the Phase 9 stub with the full flow engine skill. The SKILL.md will contain:

**Sections:**

1. **YAML Frontmatter** — `name: project-flow`, `description: ...`
2. **Quick Start** — 5-step summary: read flow def, read ledger, find next stage, invoke skill, verify artifacts.
3. **Starting a Flow** — Full instructions for a fresh flow with all stages pending.
4. **Resuming a Flow** — Instructions for returning mid-flow after a context reset.
5. **Stage Resolution Algorithm** — Step-by-step: check for `needs_revision` first, then `pending`. Output structured block.
6. **Completing a Stage** — Instructions for artifact verification (exists + non-empty), ledger update, advancing to next stage. Includes JSON before/after examples.
7. **Triggering a Revision** — Instructions for reading `revision_routing`, identifying the failure type, resetting stages, logging revision. Includes JSON examples.
8. **Variable Resolution** — Table mapping `{phase_id}`, `{feature_slug}`, `{feature_dir}` to sources (`.planning/STATE.md`, `.specify/feature.json`, active feature directory).
9. **Structured Output Format** — Reference block showing the exact format for stage instructions.
10. **Files Reference** — Table of all files the skill reads/writes.

**Key changes from stub:**
- Remove "Current Limitations" section stating it's a stub.
- Add full stage resolution, completion, and revision instructions.
- Add JSON mutation examples.
- Add variable resolution table.

---

### Component 3: SKILL.md Template Update

#### [MODIFY] [project-flow-skill-template.md](file:///Volumes/D/snail-agent-flow/.specify/templates/project-flow-skill-template.md)

Update the template to match the new full SKILL.md. This ensures future `adp init` runs generate the engine skill, not the stub.

---

### Component 4: Test Suite

#### [NEW] [test-flow-engine.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-flow-engine.js)

Test file covering:

- **resolveNextStage tests:**
  - All stages pending → returns first stage.
  - First stage done, second pending → returns second stage.
  - Stage with `needs_revision` prioritized over `pending`.
  - All stages done → returns null.

- **checkArtifacts tests:**
  - All artifacts exist and non-empty → passes.
  - Missing artifact → fails with correct path.
  - Empty artifact → fails.

- **advanceStage tests:**
  - Sets status to `done`, records artifacts, updates timestamps.
  - Updates `current_stage` to next non-done stage.
  - When all stages done, `current_stage` is null.

- **triggerRevision tests:**
  - Resets target through current to `needs_revision`.
  - Logs entry in `revision_history`.
  - Increments `revision_count` on affected stages.
  - Edge case: revision to immediately previous stage.
  - Edge case: revision to first stage.

- **formatStageInstruction tests:**
  - Output contains stage name, ID, skill, artifacts.
  - Output handles missing command gracefully.

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)

Add `node validators/scripts/test-flow-engine.js` to the test script (appended with `&&`).

---

### Component 5: Feature Pointer Update

#### [MODIFY] [feature.json](file:///Volumes/D/snail-agent-flow/.specify/feature.json)

Update `feature_directory` to `specs/010-flow-engine-skill`.

---

## Verification Plan

### Automated Tests

```bash
# Run new flow engine tests
node validators/scripts/test-flow-engine.js

# Run full test suite
npm test

# Run spec validation
npm run validate
```

### Manual Verification

1. Read the SKILL.md as an agent would — follow the Quick Start to verify instructions are actionable.
2. Create a test ledger, invoke each `lib/flow-engine.js` function, and verify the output matches what SKILL.md describes.
3. Verify the SKILL.md template matches the installed SKILL.md.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| SKILL.md instructions drift from `lib/flow-engine.js` logic | Test suite validates both; keep them in sync during edits |
| Agent writes malformed JSON to ledger | SKILL.md includes exact JSON examples; Phase 13 adds corruption detection |
| Template variables unresolved by agent | Variable Resolution section with explicit source mapping |
| Phase 11 gate logic overlaps with Phase 10 basic checks | Phase 10 checks existence only; Phase 11 owns content validation |

## Artifact Layout

- `lib/flow-engine.js` — Flow engine helper module
- `.agents/skills/project-flow/SKILL.md` — Full flow engine skill (replaces stub)
- `.specify/templates/project-flow-skill-template.md` — Updated template
- `validators/scripts/test-flow-engine.js` — Test suite
- `specs/010-flow-engine-skill/spec.md` — Canonical spec
- `specs/010-flow-engine-skill/plan.md` — This plan
- `specs/010-flow-engine-skill/tasks.md` — Task checklist
