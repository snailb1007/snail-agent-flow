# Research: Context Budget Gate and Subagent Orchestration Policy

This document consolidates findings, decisions, and technical rationales for the context budget gate and subagent orchestration policy layer.

## Findings and Technical Decisions

### 1. Budget Estimation Model (Local and Offline)

- **Decision**: Estimate context pressure by measuring the byte size of relevant files on the local filesystem instead of querying live tokenization APIs or counting tokens dynamically.
- **Rationale**: Keeps the execution environment offline, fast (<100ms), and runtime-neutral. Byte size acts as a reliable deterministic proxy for token size without incurring performance or network overhead. Any deviation or bias for non-English text (where UTF-8 encoding uses more bytes per character/token) is explicitly accepted as a conservative, fail-safe design choice. It errs on the side of caution, causing earlier session rotation rather than risking context overflow or performance degradation.
- **Alternatives considered**:
  - *Dynamic Tokenization via LLM API*: Rejected due to network dependency, API costs, latency, and potential failure points.
  - *Character/Word Counting Parser*: Rejected to keep the utility zero-dependency, extremely lightweight, and fast, avoiding the complexity of multi-language parsing rules.
  - *Rule-of-thumb line counting*: Rejected because file sizes in bytes represent the actual payload size more accurately (e.g. accounting for character encodings, comments, and spacing) than simple line counts.

### 2. Policy Outcomes & Threshold Boundaries

- **Decision**: Define three discrete outcomes based on byte-pressure thresholds:
  - **`inline`**: 0 - 50,000 bytes. The stage is small enough to run inline in the current session.
  - **`context_pack_required`**: 50,001 - 200,000 bytes. The stage requires the generation of a minimal context pack file under `.ai/context-packs/` to scope the next steps.
  - **`fresh_session_required`**: > 200,000 bytes. The accumulated context size is too large; write `.ai/state/context-handoff.json` and stop to allow switching to a fresh session.
- **Rationale**: Conservative thresholds ensure that complex stages are scoped down using context packs before token accumulation degrades the agent's performance or hits prompt budget limits.
- **Alternatives considered**:
  - *Single threshold (pass/fail)*: Rejected because the distinction between needing a context pack (isolated subagent or focused session) vs. needing a fresh session (restarting with a clean history) is critical for managing agent state.

### 3. Context Pack Schema & Path-Only References

- **Decision**: Define a schema for context packs that references files by their workspace-relative paths in `required_files` and `expected_outputs` rather than embedding full file contents. The schema includes mandatory metadata (`schema_version`, `stage_id`, `objective`, `validation_commands`, `stop_conditions`) and an `omissions` array to explicitly log omitted files.
- **Rationale**: Keeps context packs extremely lightweight (usually <10 KB), allowing downstream agents to load files on-demand without carrying duplicate contents. Requiring `omissions` ensures that omissions are deliberate.
- **Alternatives considered**:
  - *Full inline content packs*: Rejected because they duplicate content, inflating context size and increasing synchronization overhead.

### 4. Conservative Subagent Fan-Out Rules

- **Decision**: Spawn parallel subagents only for stages with independent tasks that have disjoint `write_targets` and no sequential ledger dependencies. Impose a default parallelism cap of 3. Require the parent session to own verification and ledger joins.
- **Rationale**: Prevents write conflicts and race conditions. Restricting subagents to minimal context packs instead of full parent history keeps their sessions fast and targeted.
- **Alternatives considered**:
  - *Shared-state concurrent subagents*: Rejected as it introduces severe merge conflict risks and concurrency bugs.

### 5. Fresh-Session Handoff Format

- **Decision**: Write fresh-session handoffs to `.ai/state/context-handoff.json` listing the next stage to resume, next skill, context pack path, known risks, and verification commands.
- **Rationale**: Allows a newly launched session to start with clean context and resume execution deterministically.
- **Alternatives considered**:
  - *Handoff notes written in chat/prose*: Rejected because structured files can be verified programmatically by the CLI gates (`adp doctor`/`adp init`).

### 6. Validation Integration (adp doctor and post-init gates)

- **Decision**: Add deterministic validation gates for policy configs, context packs, and handoff files directly to `runStrictChecks` in `lib/init-checks.js`.
- **Rationale**: Reuses the existing validation framework, ensuring that any syntax or orchestration errors (e.g. overlapping write targets in subagent plans, invalid schemas, or missing dependencies) are flagged immediately.
- **Alternatives considered**:
  - *Separate CLI validation commands*: Rejected because it increases tool fragmentation; integration with `adp doctor` and `adp init` ensures single-command diagnosis.
