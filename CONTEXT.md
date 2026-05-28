# AI Delivery Pipeline

This context defines the language for the orchestration protocol that coordinates AI-agent tools from idea to release.

## Language

**Superpowers Constitution**:
The global rule layer that defines non-negotiable engineering behavior for every later step.
_Avoid_: Superpowers execution engine

**Spec-Kit**:
The canonical spec system for the MVP. The Spec-Kit artifact stack owns the spec, plan, and tasks.
_Avoid_: OpenSpec or GSD as parallel spec authoring sources

**Feature Spec Source of Truth**:
The `specs/<feature-slug>/` directory that owns feature requirements, plan, tasks, and related design artifacts.
_Avoid_: `.ai/specs/current` or using session logs/reviews as the source of truth

**Orchestration State**:
The `.ai/` project area that stores session notes, reviews, handoff state, and durable memory.
_Avoid_: feature spec source of truth

**GSD**:
The execution and workflow-state layer that consumes the canonical Spec-Kit artifacts and performs implementation, verification support, and handoff.
_Avoid_: release owner, competing spec/plan owner

**GStack Review**:
The critique layer (Matt/GStack) for product, architecture, design, developer experience, QA, and release readiness. They act as critique gates.
_Avoid_: implementation executor

**Issue Projections**:
GitHub issues are strict projections from tasks in tasks.md.
_Avoid_: manual issue creation or out-of-sync task tracking

**GStack Ship**:
The release-readiness owner for the final handoff.
_Avoid_: executor self-approval

**Memory Handoff**:
The transition point where durable project memory is reviewed and updated so the next pipeline step can rely on current decisions, risks, architecture, and verification history.
_Avoid_: transcript summary, automatic memory dump

**Failure-mode Policy**:
The mandatory state-transition rules that define what must happen when the pipeline cannot proceed normally.
_Avoid_: recovery checklist

**Failure-mode Runbook**:
The operational procedure for handling a specific failure mode.
_Avoid_: system invariant

**Spec Drift**:
A mismatch between the accepted spec and implementation or repository reality.
_Avoid_: local implementation bug

**Context Fragmentation**:
Loss or scattering of durable work state across sessions, agents, or notes.
_Avoid_: normal session notes

**Deterministic Spec Validator**:
A Node.js script (`validators/scripts/validate-spec.js`) that verifies the completeness, path correctness, structure, and placeholders of feature specifications without relying on LLMs.
_Avoid_: LLM-as-judge, Promptfoo validation rubric

**Path Drift Check**:
A verification step in the validator that checks if spec, plan, or checklist files reside in legacy or shadow paths rather than the canonical feature spec path.
_Avoid_: manual path validation

**Placeholder Scan**:
A case-insensitive text search executed by the validator across Spec-Kit files to block execution if forbidden tokens like `TODO` or `NEEDS CLARIFICATION` are found.
_Avoid_: manual review scan

**Human Review Packet**:
A markdown document (`.ai/reviews/<feature-slug>/human-review.md`) automatically created when consecutive validation failures reach 3, defining the block context and presenting resolution options.
_Avoid_: block report, unstructured review request

**Flow Validator**:
The deterministic, offline flow/ledger validation capability that checks flow definition syntax (`lib/yaml-parser.js`), ledger state consistency (`lib/flow-engine.js` `validateLedger`), and the cross-reference between them. It is not a standalone command; it runs as part of the Strict Post-Init Gate invoked by `adp init` and `adp doctor`. Runs without LLMs.
_Avoid_: runtime gate evaluation, tool prerequisite check, spec validator, standalone `adp flow validate`

**Ledger Corruption**:
A state in which the flow ledger (`.ai/state/flow-ledger.json`) violates an invariant — invalid stage references, impossible status transitions, orphaned entries, or version mismatch with the flow definition. Detected by the Strict Post-Init Gate (which calls `validateLedger`), never by the Flow Engine at execution time.
_Avoid_: gate failure, spec drift

**Skill Reference Check**:
The Flow Validator pass that verifies each stage's `skill:` field is declared in the same flow definition's `prerequisites:` block. Emits a warning, not an error — the authoritative runtime check belongs to the Phase 12 tool-checker.
_Avoid_: tool prerequisite check, runtime skill resolution

**Sandbox Compliance**:
The requirement that all referenced skill execution context files must reside within the workspace to bypass environment-level read-permission boundaries.
_Avoid_: global path referencing, home directory execution contexts

**Skill Localization**:
The initialization-time protocol step that creates workspace-readable copies of globally installed GSD skills and their declared supporting context so sandboxed agents can use them.
_Avoid_: skill installation, remote download, runtime skill execution

**Execution Context**:
The supporting workflow and reference material that a skill declares it needs in order to operate correctly.
_Avoid_: process environment, runtime state, session context

**Runtime Skill Mirror**:
A workspace-local copy of the same skill capability prepared for a specific agent runtime.
_Avoid_: global skill, new skill, generated skill

**Brownfield Preservation**:
The rule that initialization must protect existing workspace artifacts that may contain user customization.
_Avoid_: overwrite, forced regeneration, destructive merge

**Subagent Parallelization**:
The technique of splitting independent tasks in tasks.md into concurrent execution threads using specialized subagents, minimizing overall wall-clock delivery time.
_Avoid_: sequential execution of independent checklists, single-thread task processing

**Strict Post-Init Gate**:
The deterministic, offline check (`lib/init-checks.js` `runStrictChecks`) that runs after `adp init` scaffolds files and localizes skills. It verifies required directories, flow YAML, ledger schema, tool prerequisites, skill localization, and instruction files, then exits non-zero on any required failure. Reused verbatim by `adp doctor`.
_Avoid_: spec validator, runtime gate evaluation, standalone flow validator

**Repair Guide**:
The Markdown remediation document (`.ai/state/repair-guide.md`) the Strict Post-Init Gate writes when it fails, listing each failure's purpose, detected reason, checked paths, install/copy commands, and the verify command. Regenerated on every failing run and deleted on a passing run.
_Avoid_: human review packet, block report, session log

**Context Budget Gate**:
The offline check that estimates byte-pressure before starting a stage to decide the execution outcome (`inline`, `context_pack_required`, or `fresh_session_required`).
_Avoid_: token counting, LLM-as-judge calls

**Context Pack Manifest**:
A minimal task descriptor file directing an agent or subagent on a scoped unit of work, containing only essential path references.
_Avoid_: embedded file bodies

**Fresh-Session Handoff**:
The handover process and artifact (`.ai/state/context-handoff.json`) written when context pressure forces a session restart.
_Avoid_: memory handoff, transcript summary

**Risk-Adaptive Operating System (RAOS)**:
The core operating system of Snail Agent Flow that dynamically gates execution rigor using task-based risk scoring.
_Avoid_: static process policies

**Operating Profile**:
An execution mode (FAST, STANDARD, FULL, BUGFIX, PROTOTYPE) that defines the required gates and planning checkpoints for a given task.
_Avoid_: phase type

**Task Scorer**:
The kernel component that evaluates a task specification against a 5-dimension risk rubric to output an Operating Profile.
_Avoid_: manual profile selection

**Work Unit Claim**:
A transient reservation record (`.ai/claims/<task-slug>.json`) asserting exclusive execution ownership of a specific checklist task.
_Avoid_: task status update

**Shared Artifact Lock**:
A time-limited lease (`.ai/locks/<file-hash>.json`) preventing concurrent writes to source-of-truth files by parallel agents.
_Avoid_: file write permissions

**Profile Switch Checkpoint**:
A transient state log (`.ai/state/profile-switch-*.md`) documenting an in-flight transition between operating profiles (e.g. escalating from FAST to STANDARD).
_Avoid_: run state checkpoint

**Decision-Linked Signal**:
A workflow metric tracked in `.ai/signals/current-period.md` specifically to inform pipeline improvements or refactoring tasks.
_Avoid_: raw telemetry


## Example Dialogue

**Dev**: I need to check if my new feature specification is ready for the GSD execution phase. Should I run Promptfoo or check it myself?

**Domain Expert**: Neither. You should run the **Deterministic Spec Validator**. It does not use any LLM; instead, it checks the **Feature Spec Source of Truth** at `specs/<feature-slug>/` for the correct markdown headings and scans files to ensure they conform to our standard.

**Dev**: What happens if some files were left in `.ai/specs/` instead of `specs/`?

**Domain Expert**: The validator will run a **Path Drift Check**. If it detects files in legacy directories, it will mark the run as blocked and record a `Path Drift` violation in our **Orchestration State** under `run-state.json`.

**Dev**: I still have a few `TODO` items inside `plan.md`. Will that pass?

**Domain Expert**: No. The validator performs a **Placeholder Scan** to find forbidden tokens like `TODO` or `TBD`. If it finds any, it fails with an `Open Clarification` error. If you fail validation 3 times consecutively, it automatically generates a **Human Review Packet** at `.ai/reviews/<feature-slug>/human-review.md` and halts. You will then need to review the packet options before resuming.

