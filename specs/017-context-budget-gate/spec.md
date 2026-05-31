# Feature Specification: Context Budget Gate and Subagent Orchestration Policy

**Feature Branch**: `017-context-budget-gate`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Phase 16: Context budget gate and subagent orchestration policy"

## Goal

Add a deterministic context budget and subagent orchestration policy layer so the flow engine can decide when work stays inline, when it must hand off to a fresh session, and when independent tasks should run as isolated subagents with minimal context packs instead of inheriting a large chat history. This provides safety, token optimization, and structure for parallel work, building on top of the subagent guidelines and strict initialization gates.

## Non-Goals

- Dynamically counting active tokens using runtime APIs or online tokenization services.
- Automating tool installation or sandbox execution.
- Implementing a custom hosted agent server.
- Managing git merges or conflict resolution automatically (which remains the parent agent's/developer's responsibility).

## Acceptance Criteria

1. **Byte-Pressure Heuristics**: Calculators must run locally and offline, basing size estimations on the byte size of current session artifacts, referenced plan files, and staged file reads.
2. **Orchestration Outcomes**: Emits exactly one of `inline`, `context_pack_required`, or `fresh_session_required` based on thresholds.
3. **Context Packs**: Bounded context packs must be written to `.ai/context-packs/` with objective, files, and omission fields using relative paths.
4. **Handoff Manifests**: Handoffs must be written to `.ai/state/context-handoff.json` with next stage, pack path, and verification commands.
5. **Validator Verification**: Strict verification must check config schemas, subagent disjoint write targets, and handoff validity.

## Test Strategy

- **Unit Testing**: Add focused unit tests in `validators/scripts/test-context-budget.js` covering calculations, schema checks, and subagent target overlap verification.
- **Integration Testing**: Extend `test-flow-engine.js`, `test-init-checks.js`, and `test-cli.js` to assert flow engine resolving and adp doctor/init integration.
- **Run Tests**: Execute `npm test` to run the full verification suite.

## Behavior-Preservation Rules

- **No breaking changes**: Keep existing command signatures compatible; extend `resolveNextStage` additively.
- **No automated modifications**: The engine must never auto-mutate ledger state or git status on subagent execution except through parent updates.
- **Offline operation**: Do not introduce any network or tokenization dependencies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Context Budget Gate Stage Resolution (Priority: P1)

A developer runs the flow engine. The flow engine automatically estimates the context pressure for the next stage based on local artifacts, referenced files, and session size. It output-advises whether the work can proceed inline, needs a context pack, or needs a fresh-session handoff.

**Why this priority**: This is the core gate mechanism that prevents context blowup and keeps sessions small and responsive.

**Independent Test**: Mock large session/file sizes, run the stage resolver, and verify the engine outputs the correct policy decision (`inline`, `context_pack_required`, or `fresh_session_required`) before the stage begins.

**Acceptance Scenarios**:

1. **Given** a stage with a small session log and few referenced files, **When** the next stage is resolved, **Then** the policy decision is "inline" and the developer is instructed to proceed immediately.
2. **Given** a stage requiring large implementation plans and prior references, **When** the next stage is resolved, **Then** the policy decision is "context_pack_required" and the engine instructs the developer to create a context pack.
3. **Given** a session with accumulated large logs exceeding the pressure threshold, **When** the next stage is resolved, **Then** the policy decision is "fresh_session_required" and the engine instructs the developer to write a handoff and switch to a fresh session.

---

### User Story 2 - Minimal Context Pack Generation (Priority: P1)

An agent is instructed to create a context pack before executing a heavy stage. The agent generates a minimal structured manifest under `.ai/` containing only the essential context: objective, active stage, files to edit/read, expected outputs, validation commands, and what was intentionally omitted.

**Why this priority**: Keeps subsequent sessions or subagents focused on a narrow scope without importing unrelated history.

**Independent Test**: Check that the generated context pack contains all mandatory fields and correctly references files by path without embedding full contents.

**Acceptance Scenarios**:

1. **Given** a stage requiring a context pack, **When** the agent generates the context pack, **Then** the manifest records the objective, stage, file paths, and omissions.
2. **Given** a generated context pack, **When** checked by the validator, **Then** it passes checks for completeness and workspace-relative paths.

---

### User Story 3 - Conservative Subagent Fan-Out (Priority: P2)

For a phase with multiple independent tasks, the flow engine coordinates spawning parallel subagents. Each subagent receives a minimal context pack containing only its specific sub-task. The parent agent coordinates the results and merges them once completed.

**Why this priority**: Enables safe concurrent work without sharing full session history or causing write conflicts.

**Independent Test**: Spawn mock subagents with disjoint file targets, verify concurrency limits are enforced, and confirm the parent merges outputs.

**Acceptance Scenarios**:

1. **Given** three independent tasks with disjoint file targets, **When** fanning out, **Then** the engine allows spawning up to three subagents in parallel, each with its own context pack.
2. **Given** four independent tasks, **When** spawning subagents, **Then** the engine limits active subagents to three, queueing or executing the fourth sequentially or once others complete.
3. **Given** a subagent completing its task, **When** returning output, **Then** the parent reconciles the findings and updates the ledger status.

---

### User Story 4 - Strict Orchestration Validation (Priority: P1)

The validator strictly audits the context budget policy config, generated context packs, and subagent plans. It detects issues like overlapping file targets, missing context packs, or malformed handoffs, and blocks unsafe operations.

**Why this priority**: Safety gate to prevent agent errors, race conditions, or sandbox violations.

**Independent Test**: Introduce conflicting write targets in a subagent fan-out plan and verify the validator fails the check.

**Acceptance Scenarios**:

1. **Given** two subagents assigned to write to the same file, **When** validating the fan-out plan, **Then** the validator fails the gate with a clear error reporting the target overlap.
2. **Given** a fresh-session handoff lacking a resume target, **When** validating, **Then** the validator fails the gate.

### Edge Cases

- **Overlapping Write Targets**: If a fan-out plan assigns multiple subagents to write to the same file, the validator rejects the plan.
- **Unreachable Subagent Fallback**: If the host environment cannot spawn subagents, the policy falls back to sequential inline execution using the same context packs.
- **Subagent Ledger Modification**: Subagents must not be allowed to modify the main ledger file directly; only the parent agent can update the ledger after verifying all subagent work.

## Requirements *(mandatory)*

### Functional Requirements

Canonical IDs are **CTX-01..CTX-05** (matching `.planning/REQUIREMENTS.md` and the Phase 16 GSD plans). The original FR-01..FR-11 statements are preserved as mapped sub-bullets so requirement→test traceability stays explicit.

The budget gate is a deterministic **byte-pressure heuristic**, not token accounting (see Assumptions). Module names and diagnostics must say "byte" / "estimated size", never imply exact token counts.

- **CTX-01: Deterministic Budget Gate + Policy Decision + Flow Integration**: Estimate byte pressure for the next stage locally and offline, emit one of `inline` / `context_pack_required` / `fresh_session_required`, and return + render that decision alongside stage resolution. The phase/stage scope of the byte walk is resolved centrally in `lib/flow-engine.js` from the ledger and injected as a `{phase_id}` template variable — callers must not infer the current phase independently.
  - *FR-01*: Estimate context pressure locally and offline by counting the byte size of current session artifacts, referenced plan files, and staged file reads, without external APIs or token counters.
  - *FR-02*: Output exactly one of `inline`, `context_pack_required`, or `fresh_session_required`.
  - *FR-03*: Return the decision and required action alongside stage resolution, formatted into the stage instruction printed to the console.
- **CTX-02: Minimal Context Pack Schema + Path-Only References**:
  - *FR-04*: Bounded context packs are structured files containing objective, active stage, required/allowed file paths, excluded files, expected outputs, validation commands, and omissions.
  - *FR-05*: Context packs reference files by workspace-relative path, not embedded file bodies (small line-range snippets allowed only when necessary).
- **CTX-03: Conservative Subagent Fan-Out Guard + Concurrency + Parent Join**:
  - *FR-06*: Spawn subagents only for tasks with disjoint write targets and no sequential ledger dependency.
  - *FR-07*: Default active parallelism capped at 3 unless explicitly overridden in config.
  - *FR-08*: The parent owns merge/verify/ledger updates; subagents cannot modify the main ledger.
- **CTX-04: Generic Fresh-Session Handoff Format**:
  - *FR-09*: Handoff artifacts specify next stage, required context pack, known risks, and verification commands, written to a fixed well-known workspace path under `.ai/state/` so a new session resumes deterministically.
- **CTX-05: Strict Validation Gates + Doctor/Init Parity**:
  - *FR-10*: The validator enforces schema completeness, fan-out write-target uniqueness, and handoff resume targets, failing closed with non-zero exit codes.
  - *FR-11*: `adp doctor` and strict init checks validate the presence and syntax of the context budget policy config.

### Key Entities

- **Context Budget Policy Config**: A configuration file defining thresholds and stage-specific budget rules.
- **Context Pack Manifest**: A JSON or YAML file containing objective, files, and omit records for a subagent or fresh session.
- **Handoff Artifact**: A markdown file recording the resume state for a fresh session.
- **Fan-out Plan**: A structured declaration of concurrent subagent tasks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-01**: The context budget gate executes locally in under 100ms.
- **SC-02**: The validator detects overlapping write targets in parallel subagent plans and fails the gate with exit code 1.
- **SC-03**: The flow engine correctly blocks stage transition if a required context pack or handoff artifact is missing or invalid.
- **SC-04**: No external LLM call or live chat token introspect is used for the gate.

## Assumptions

- **Byte-pressure heuristic, not token accounting (locked).** The gate estimates context pressure from the byte size of declared/staged artifacts, referenced files, session logs, and context packs on disk. It does not introspect live chat-token usage. This is a deliberate, deterministic, runtime-neutral proxy — bytes are not tokens and not actual conversation footprint. Thresholds (default 50 KB / 200 KB) are conservative, configurable, and not calibrated to any specific model's token budget. Naming and diagnostics must reflect "estimated byte size" rather than implying token precision. Any bias introduced by multi-byte UTF-8 character encodings for non-English texts is explicitly accepted as a conscious fail-safe design choice, as it defaults safely to earlier session rotation without risk of context overflow or latency issues.
- **Current-phase resolution is centralized (locked).** The byte walk over `.planning/phases/<phase>/*.md` requires a phase scope. That scope is resolved once in `lib/flow-engine.js` from the ledger (current/next stage) and passed to the existing template resolver as `{phase_id}`; `<current-phase>` exists only as an alias. No caller derives the current phase on its own.
- The system runs in a local environment with standard file access.
- Subagents are supported by the runner/client; if not, sequential fallback with the same context packs is supported.
- Workspace-relative paths are readable by all session runtimes.
