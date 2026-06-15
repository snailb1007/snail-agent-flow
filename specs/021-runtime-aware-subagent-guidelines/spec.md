# Runtime-Aware Subagent Guidelines

## Goal

Replace the subagent guidance that `adp init` injects into target projects — which currently references `define_subagent` and `invoke_subagent`, tools that exist in no supported runtime — with a capability-detection block plus per-runtime notes, and convert the guideline writers from append-if-missing to section upsert so already-initialized target projects receive corrected guidance when `init` runs again. Add a non-blocking doctor warning that detects outdated guidance in target projects.

## Non-Goals

- Implementing an actual subagent orchestrator or changing ATLAS flow stages or stage scripts.
- Runtime detection via environment variables at agent execution time (file-name routing of `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` already selects the audience).
- Auto-migrating target projects without a user-invoked `init` or upgrade run.
- Changing the brownfield `skipExisting` policy: instruction files that pre-existed before SAF still receive guidance via `.ai/instructions/ATLAS.md` only.

## Acceptance Criteria

1. **GU-01 (Capability-detection content):** The generated `## Subagent & Parallel Execution Guidelines` block instructs the agent to first check whether its runtime exposes a subagent/delegation tool and to fall back to sequential, dependency-safe execution when none exists. No generated output anywhere references `define_subagent` or `invoke_subagent`.
2. **GU-02 (Per-runtime notes):** The block written to `CLAUDE.md` carries a runtime note naming Claude Code's `Agent` (Task) tool and parallel invocation; `AGENTS.md` carries a note that Codex and most AGENTS.md readers expose no subagent tool and must use the sequential fallback; `GEMINI.md` carries a note for Gemini-based environments such as Antigravity; `.ai/instructions/ATLAS.md` carries a runtime-neutral note.
3. **GU-03 (Upsert semantics):** When the guideline writers run against a SAF-managed instruction file (any file not gated as team-owned by the brownfield check), an older SAF-generated block is replaced in place — scoped from its `##` heading to the next `##` heading — without duplicating headings and without modifying any other content. This applies to the subagent, context-policy, and behavioral-core sections. Team-owned (pre-existing) files are still never touched.
4. **GU-04 (ATLAS.md refresh):** `writeSeparateAtlasInstructions` replaces stale SAF-owned sections in `.ai/instructions/ATLAS.md` instead of skipping them, while preserving any sections the team added.
5. **GU-05 (Doctor warning):** `adp doctor` emits a non-blocking warning (check id `instructions.subagentGuidelines.current`, `required: false`) when an instruction file or `.ai/instructions/ATLAS.md` still contains the legacy tool names. The remediation message directs the user to re-run `init` (which refreshes `.ai/instructions/ATLAS.md`) and to remove the legacy section from team-owned files manually, since SAF never edits pre-existing instruction files.
6. **GU-06 (No behavior drift):** Command signatures, exit codes, exported function names, and the `skipExisting` brownfield contract are unchanged. Writers are idempotent: a second run against up-to-date files performs no file writes.

## Test Strategy

- CLI integration tests in `validators/scripts/test-cli.js`:
  - Fresh `init` produces the capability-detection block and the correct per-file runtime note in `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`.
  - A file seeded with the legacy `define_subagent` block is upserted in place: new content present, legacy tool names gone, exactly one section heading, surrounding custom content untouched.
  - Re-running the writers against current content performs no write (mtime/content unchanged).
  - `.ai/instructions/ATLAS.md` with a stale subagent section is refreshed; a team-added custom section survives.
  - `doctor` reports the `instructions.subagentGuidelines.current` warning on stale content and stays silent on fresh content.
- Full suite via `npm test`.

## Behavior-Preservation Rules

- `appendSubagentGuidelines`, `appendContextPolicyGuidelines`, `appendBehavioralCoreGuidelines`, `writeSeparateAtlasInstructions`, and `removeAtlasGuidelineSections` keep their names, signatures, and module exports.
- The `skipExisting` contract is untouched: pre-existing team files are never mutated by these writers.
- Section upsert is scoped strictly to the SAF-owned heading range, matching the precedent set by `upsertAtlasGuidelines`.
- The doctor check is a warning (`required: false`), never an error, per `docs/compatibility-policy.md` (same disposition as `skills.version.current`).

## User Scenarios

### Scenario 1: Fresh init on a new target project
A user runs `adp init` in a repo with no instruction files. `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` are created with the capability-detection block and the runtime note matching each file's reader.

### Scenario 2: Upgrading an existing target project
A project initialized with an older SAF carries the legacy `define_subagent` text. The user upgrades SAF and re-runs `init`: `.ai/instructions/ATLAS.md` is refreshed in place with the corrected guidance, and `doctor` warns that instruction files still carry the legacy tool names, with steps to remove the stale sections (the `saf-upgrade` skill can apply this with user consent).

### Scenario 3: Codex runtime
An agent running under Codex reads `AGENTS.md`, finds no subagent tool in its tool list, and follows the explicit sequential fallback instead of attempting to call nonexistent tools.

## Functional Requirements

- **FR-021-01:** Provide a single canonical builder for the subagent guidelines body that accepts a runtime note, used by both the instruction-file writers and `writeSeparateAtlasInstructions`.
- **FR-021-02:** Generalize heading-scoped section removal into a reusable helper; `removeAtlasGuidelineSections` remains as a thin wrapper.
- **FR-021-03:** Convert the three `append*Guidelines` writers to upsert semantics with a no-op fast path when content is already current.
- **FR-021-04:** Teach `writeSeparateAtlasInstructions` to replace stale SAF-owned sections while preserving foreign content, with the same no-op fast path.
- **FR-021-05:** Add doctor check `instructions.subagentGuidelines.current` (`required: false`) scanning `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and `.ai/instructions/ATLAS.md` for legacy tool names.
- **FR-021-06:** Document the refresh path in `docs/migration.md`.

## Assumptions

- AGENTS.md-compatible readers generally lack a subagent tool today; the capability check governs if that changes.
- Section ownership equals heading match (`##` heading to next `##` heading), consistent with existing upsert behavior.
- Refreshing this repository's own instruction files is performed with the new writers as a dogfooding step.
