# Operating Constitution Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `.ai/constitution.md` into a concise hybrid operating constitution with enforceable rules, engineering principles, pipeline gates, failure handling, and artifact contracts.

**Architecture:** Keep the constitution as the single authoritative policy document for this repository. It references the existing pipeline blueprint instead of duplicating tool manuals, and it remains documentation-only so future validators can consume it without any script changes.

**Tech Stack:** Markdown, shell verification commands, repository-local `.ai` documentation.

---

## File Structure

- Modify: `.ai/constitution.md`
  - Responsibility: Durable operating constitution for agents working in this repository.
  - Required sections: Authority Order, Non-Negotiables, Engineering Principles, Pipeline Gates, Agent Operating Rules, Failure Rules and Circuit Breakers, Artifact Contract.
- Inspect only: `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`
  - Responsibility: Source requirements for the constitution rewrite.
- Inspect only: `ai-delivery-pipeline-blueprint.md`
  - Responsibility: Canonical phase names and `.ai` artifact shape.
- Inspect only: `.ai/pipeline.md`
  - Responsibility: Existing local pipeline artifact; do not change in this plan.
- Inspect only: `.ai/recon.md`
  - Responsibility: Existing recon artifact; do not change in this plan.

No execution scripts, validators, source code, or runtime configuration files are changed.

---

### Task 1: Pre-Change Documentation Check

**Files:**
- Inspect: `.ai/constitution.md`
- Inspect: `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`
- Inspect: `ai-delivery-pipeline-blueprint.md`

- [ ] **Step 1: Confirm current constitution is missing required operating sections**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync(".ai/constitution.md","utf8"); const required=["# Constitution","## Authority Order","## Non-Negotiables","## Engineering Principles","## Pipeline Gates","## Agent Operating Rules","## Failure Rules and Circuit Breakers","## Artifact Contract"]; const missing=required.filter(x=>!text.includes(x)); if (missing.length){ console.error("FAIL missing sections: "+missing.join(", ")); process.exit(1); } console.log("PASS all required sections present");'
```

Expected: FAIL with missing sections including `## Authority Order`, `## Pipeline Gates`, `## Agent Operating Rules`, `## Failure Rules and Circuit Breakers`, and `## Artifact Contract`.

- [ ] **Step 2: Confirm canonical blueprint phases to preserve**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync("ai-delivery-pipeline-blueprint.md","utf8"); const phases=["Step 0 — Superpowers Constitution","Step 1 — Recon","Step 2 — GStack CEO / Eng Manager Review","Step 3 — Spec-Kit / OpenSpec","Step 3.5 — Spec Validation Gate","Step 4 — GSD Full Execution","Step 4.5 — Failure Feedback Loop","Step 5 — GStack QA","Step 5.5 — Memory Handoff","Step 6 — GStack Ship"]; const missing=phases.filter(x=>!text.includes(x)); if (missing.length){ console.error("FAIL missing blueprint phases: "+missing.join(", ")); process.exit(1); } console.log("PASS blueprint contains canonical phases");'
```

Expected: PASS with `PASS blueprint contains canonical phases`.

- [ ] **Step 3: Confirm no files changed during recon**

Run:

```bash
git diff -- .ai/constitution.md docs/superpowers/specs/2026-05-23-operating-constitution-design.md ai-delivery-pipeline-blueprint.md .ai/pipeline.md .ai/recon.md
```

Expected: No output.

---

### Task 2: Rewrite Operating Constitution

**Files:**
- Modify: `.ai/constitution.md`

- [ ] **Step 1: Replace `.ai/constitution.md` with the hybrid operating constitution**

Write this exact file content:

```markdown
# Constitution

This constitution defines how agents operate in this repository. It is subordinate to explicit user instructions and repository `AGENTS.md` instructions, and it is authoritative over model defaults, tool habits, and phase-local preferences.

## Authority Order

When instructions conflict, apply them in this order:

1. Explicit user instructions in the active conversation.
2. Repository instructions, including `AGENTS.md` and this constitution.
3. Phase-specific artifacts, including specs, plans, task lists, review packets, and validation reports.
4. Tool defaults, model habits, and inferred preferences.

If a lower-authority instruction conflicts with a higher-authority instruction, follow the higher-authority instruction and record the conflict in the relevant session notes or review packet.

## Non-Negotiables

- Do not rewrite blindly; inspect the current system before changing it.
- Preserve existing behavior by default unless the accepted spec requires a change.
- Perform recon before planning changes to existing projects.
- Require a spec before broad implementation or cross-cutting changes.
- Prefer the smallest safe change that satisfies the accepted spec.
- Use test-backed implementation for code changes and documented review for documentation-only changes.
- Apply a security baseline to every change: protect secrets, user data, auth boundaries, permissions, and destructive operations.
- Do not enter infinite self-repair loops.
- Do not claim completion without verification.
- Do not ship without memory handoff when the work changes architecture, behavior, operations, or known risks.

## Engineering Principles

- Favor clarity over cleverness.
- Keep scope narrow and explicit.
- Use strict type safety where applicable.
- Protect compatibility and migration paths.
- Justify new dependencies before adding them.
- Avoid framework soup; prefer established project patterns and tools.
- Log decisions that affect architecture, behavior, operations, security, or rollback.
- Prefer explicit rollback or recovery paths for risky changes.

## Pipeline Gates

The canonical delivery flow is:

1. Step 0 — Superpowers Constitution.
2. Step 1 — Recon.
3. Step 2 — GStack CEO / Eng Manager Review.
4. Step 3 — Spec-Kit / OpenSpec.
5. Step 3.5 — Spec Validation Gate.
6. Step 4 — GSD Full Execution.
7. Step 4.5 — Failure Feedback Loop.
8. Step 5 — GStack QA.
9. Step 5.5 — Memory Handoff.
10. Step 6 — GStack Ship.

Gate outcomes are:

- `PASS`: Continue to the next gate.
- `FAIL`: Return to the earliest artifact that can correct the failure.
- `NEEDS_HUMAN_REVIEW`: Stop autonomous work and prepare a human review packet.

## Agent Operating Rules

- Use codebase discovery before changing existing systems.
- Use impact analysis for shared, public, risky, or cross-module code.
- Use current third-party documentation for libraries, frameworks, SDKs, APIs, CLIs, and cloud services.
- Use validation and QA tools before claiming completion.
- Do not skip verification because a change appears small.
- Keep documentation aligned with the implemented system.
- Keep session notes factual: record decisions, failed attempts, verification results, and unresolved risks.

## Failure Rules and Circuit Breakers

- If the same validation category fails more than three times, stop and mark the work `NEEDS_HUMAN_REVIEW`.
- If implementation exposes a local bug, return to the execution plan and add the smallest task that fixes the bug.
- If a failure exposes a missing or wrong requirement, return to the spec step before changing implementation.
- If the agent cannot distinguish between materially different interpretations, stop and ask for human direction.
- If a change may cause data loss, a security regression, API incompatibility, or an irreversible operation, require an explicit rollback or recovery plan before execution.

## Artifact Contract

Expected project artifacts:

- `.ai/constitution.md`: Repository operating constitution.
- `.ai/pipeline.md`: Local pipeline notes or overrides.
- `.ai/recon.md`: Current or recent reconnaissance notes.
- `.ai/sessions/<session-id>/agent-recon.md`: Session-specific recon.
- `.ai/sessions/<session-id>/gstack-plan-review.md`: Product and engineering critique.
- `.ai/specs/current/spec.md`: Accepted implementation spec.
- `.ai/specs/current/plan.md`: Implementation plan.
- `.ai/specs/current/tasks.md`: Executable task list.
- `.ai/specs/current/validation-report.md`: Spec validation output.
- `.ai/state/spec-validation-state.json`: Spec validation status and failure count.
- `.ai/memory/project-summary.md`: Durable project summary.
- `.ai/memory/current-architecture.md`: Durable architecture notes.
- `.ai/memory/known-risks.md`: Durable known risks.
- `.ai/memory/decisions.md`: Durable decisions that affect architecture, behavior, operations, or security.
- `.ai/memory/verification-history.md`: Durable verification history.

Artifacts must be concise, current, and specific enough for the next agent to continue without reconstructing context from scratch.
```

- [ ] **Step 2: Verify required sections are present**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync(".ai/constitution.md","utf8"); const required=["# Constitution","## Authority Order","## Non-Negotiables","## Engineering Principles","## Pipeline Gates","## Agent Operating Rules","## Failure Rules and Circuit Breakers","## Artifact Contract"]; const missing=required.filter(x=>!text.includes(x)); if (missing.length){ console.error("FAIL missing sections: "+missing.join(", ")); process.exit(1); } console.log("PASS all required sections present");'
```

Expected: PASS with `PASS all required sections present`.

- [ ] **Step 3: Verify canonical pipeline phases are preserved**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync(".ai/constitution.md","utf8"); const phases=["Step 0 — Superpowers Constitution","Step 1 — Recon","Step 2 — GStack CEO / Eng Manager Review","Step 3 — Spec-Kit / OpenSpec","Step 3.5 — Spec Validation Gate","Step 4 — GSD Full Execution","Step 4.5 — Failure Feedback Loop","Step 5 — GStack QA","Step 5.5 — Memory Handoff","Step 6 — GStack Ship"]; const missing=phases.filter(x=>!text.includes(x)); if (missing.length){ console.error("FAIL missing phases: "+missing.join(", ")); process.exit(1); } console.log("PASS canonical phases preserved");'
```

Expected: PASS with `PASS canonical phases preserved`.

- [ ] **Step 4: Verify required operating concepts are present**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync(".ai/constitution.md","utf8"); const required=["explicit user instructions","Repository instructions","Phase-specific artifacts","No blind rewrite","Preserve existing behavior","Recon before planning","Spec before broad implementation","Smallest safe change","Security baseline","No infinite self-repair loops","No shipping without verification","No shipping without memory handoff","PASS","FAIL","NEEDS_HUMAN_REVIEW",".ai/specs/current/spec.md",".ai/state/spec-validation-state.json",".ai/memory/known-risks.md"]; const missing=required.filter(x=>!text.toLowerCase().includes(x.toLowerCase())); if (missing.length){ console.error("FAIL missing concepts: "+missing.join(", ")); process.exit(1); } console.log("PASS required operating concepts present");'
```

Expected: PASS with `PASS required operating concepts present`.

- [ ] **Step 5: Verify no unintended files changed**

Run:

```bash
git diff --name-only
```

Expected: Output includes `.ai/constitution.md`. It may also include the plan file if this implementation plan is still uncommitted. No runtime source files, scripts, validators, or package files should appear.

- [ ] **Step 6: Review the constitution diff**

Run:

```bash
git diff -- .ai/constitution.md
```

Expected: Diff shows only the constitution rewrite. It should not change `.ai/pipeline.md`, `.ai/recon.md`, `ai-delivery-pipeline-blueprint.md`, execution scripts, or validators.

- [ ] **Step 7: Commit the constitution rewrite**

Run:

```bash
git add .ai/constitution.md
git commit -m "docs: define operating constitution"
```

Expected: Commit succeeds with one modified file, `.ai/constitution.md`.

---

### Task 3: Final Documentation Verification

**Files:**
- Inspect: `.ai/constitution.md`
- Inspect: `ai-delivery-pipeline-blueprint.md`

- [ ] **Step 1: Cross-check constitution sections against the design spec**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync(".ai/constitution.md","utf8"); const spec=fs.readFileSync("docs/superpowers/specs/2026-05-23-operating-constitution-design.md","utf8"); const sections=["Authority Order","Non-Negotiables","Engineering Principles","Pipeline Gates","Agent Operating Rules","Failure Rules and Circuit Breakers","Artifact Contract"]; const missing=sections.filter(x=>spec.includes("###") && !text.includes("## "+x)); if (missing.length){ console.error("FAIL missing spec sections: "+missing.join(", ")); process.exit(1); } console.log("PASS constitution covers design spec sections");'
```

Expected: PASS with `PASS constitution covers design spec sections`.

- [ ] **Step 2: Check concise length**

Run:

```bash
node -e 'const fs=require("fs"); const lines=fs.readFileSync(".ai/constitution.md","utf8").trim().split(/\n/).length; if (lines > 140){ console.error("FAIL constitution too long: "+lines+" lines"); process.exit(1); } console.log("PASS constitution concise: "+lines+" lines");'
```

Expected: PASS with a line count at or below 140.

- [ ] **Step 3: Check for ambiguous unresolved markers**

Run:

```bash
rg -n "NEEDS_DECISION|OPEN_QUESTION|UNRESOLVED|XXX_REPLACE_ME|DECIDE_BEFORE_SHIP" .ai/constitution.md
```

Expected: No output and exit code 1 from `rg`, meaning none of those unresolved markers are present.

- [ ] **Step 4: Confirm working tree only contains intended documentation changes**

Run:

```bash
git status --short
```

Expected after committing Task 2: no `.ai/constitution.md` entry. If the plan file is intentionally uncommitted, the only relevant untracked entry should be `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`.

- [ ] **Step 5: Commit the plan file if the plan is part of the change set**

Run:

```bash
git add docs/superpowers/plans/2026-05-24-operating-constitution-design.md
git commit -m "docs: plan operating constitution rewrite"
```

Expected: Commit succeeds with one created file, `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`.

---

## Rollback

If the constitution rewrite introduces a contradiction or the user rejects the policy shape, revert only the constitution commit:

```bash
git revert <constitution-commit-sha>
```

If the implementation plan commit was also made and should be removed from project history by a normal revert:

```bash
git revert <plan-commit-sha>
```

Do not revert unrelated user changes.

---

## Self-Review

- Spec coverage: Covered authority order, non-negotiables, engineering principles, pipeline gates, agent operating rules, failure rules, artifact contract, acceptance criteria, testing, and rollback.
- Placeholder scan: The plan contains concrete file paths, exact commands, expected outputs, and full replacement Markdown for `.ai/constitution.md`.
- Type and name consistency: Section names and phase names are consistent across all tasks and match the design spec plus blueprint.
