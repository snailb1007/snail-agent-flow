# Feature-Scoped Memory Budgeting and Handoff Integrity

## Goal

Close three accumulation/verification defects in the snail-trail memory subsystem
without breaking any installed target project:

1. **O(N) context bloat.** `estimateBudget` (`lib/context-budget.js`) and
   `handleCompactMemory` (`bin/adp.js`) scan *every* file under `.ai/sessions/`
   and `.ai/context-packs/`. As a project accumulates features, the byte-pressure
   estimate sums unrelated historical logs, inflating the estimate toward
   `fresh_session_required` and leaking unrelated features into the compaction
   input pack. Make both scans scope to the active feature, using the
   `**Feature:** <slug>` marker that `new-session` already writes into each log.

2. **Surface-only handoff verification.** `saf handoff` only checks that
   `handoff.md` exists, contains the active feature slug, and contains three
   required headings. The scaffold that `compact-memory` writes already contains
   all three headings and the slug, so an *unedited* scaffold passes the gate.
   Add deterministic, offline integrity checks that reject the unedited scaffold
   and (in strict mode) correlate the report against real `.ai/memory/*` state.

3. **Flat, unbounded memory.** Durable memory is a fixed set of flat Markdown
   files with no typed classification and no archival, so both `.ai/sessions/`
   and the memory files grow without bound. Add the typed memory files the
   compatibility matrix prescribes (`patterns.md`, `gotchas.md`) and an opt-in
   archival path that moves compacted raw session logs out of the active scan
   surface — the root-cause fix for defect 1.

All three changes follow `docs/compatibility-policy.md`: new behavior is opt-in
for existing projects (default for fresh `init`), schemas are additive, and no
existing artifact path, command signature, or exit code changes.

## Non-Goals

- **Embedding-based semantic search / vector RAG.** A deterministic CLI must stay
  offline (`docs/compatibility-policy.md` §1.6); an embedding store is a large new
  dependency. Semantic recall already exists in the project's MCP layer
  (claude-mem / semble) which indexes the repository; typed memory files make that
  layer more effective. Vector retrieval is explicitly out of scope and called out
  as a known gap rather than silently claimed as solved.
- Deleting any session log or memory content. Archival *moves* logs; it never
  deletes (policy §2: "Never delete user state").
- Changing the prescribed-model / subagent delegation protocol of the snail-trail
  compaction, or running any LLM inside `validate-spec` or `handoff`.
- Renaming or relocating the five existing memory files, or changing their format.
- Retroactively re-scoping or migrating existing projects without a user-invoked
  `init`, flag, or policy edit.

## Acceptance Criteria

1. **MH-01 (Scoped session budget):** When `context-policy.json` sets
   `budget_inputs.session_scope: "active_feature"` and an active feature slug is
   resolvable, `estimateBudget` counts only session `.md` files whose header
   carries `**Feature:** <active-slug>`. Files marked for a different feature, and
   files carrying no `**Feature:**` marker, are excluded from the scoped total and
   appear in no `inputs` entry. With `session_scope: "all"` or the key absent, the
   estimate is byte-for-byte identical to today.
2. **MH-02 (Scoped context-pack budget):** Under
   `budget_inputs.context_pack_scope: "active_feature"`, `estimateBudget` counts
   only `.ai/context-packs/*.json` whose filename matches the active feature
   (e.g. `compact-<slug>.json` or any name containing the slug); other packs are
   excluded. Absent key or `"all"` preserves today's behavior.
3. **MH-03 (Scoped compaction inputs):** `handleCompactMemory` builds its
   `input_files` list from session logs scoped to the active feature by the same
   `**Feature:**` rule, plus `.ai/memory/*` and the feature's `.ai/reviews/<slug>/`.
   Logs of other features no longer appear in the pack. When no feature is active,
   behavior is unchanged (all logs included), preserving the current no-feature path.
4. **MH-04 (Reject unedited scaffold — always on):** `saf handoff` exits `1` when
   `.ai/state/handoff.md` still contains the seed marker text written by
   `compact-memory` (`Seeded by saf compact-memory` or the template's
   "Remove this comment once authored"). This is a correctness fix, always active,
   with a remediation message naming the file to author. A genuinely authored
   handoff with the marker removed still exits `0`.
5. **MH-05 (Strict integrity — opt-in):** With `--strict` (or
   `context-policy.json: handoff.strict: true`), `saf handoff` additionally fails
   when (a) any required section contains no non-placeholder body line — a line
   that is neither blank nor an italic `_..._` template prompt — or (b) the
   "Promoted to project memory" section names no existing, non-empty, non-seed
   `.ai/memory/*.md` file. All checks are deterministic and offline. Without
   `--strict` and without the policy flag, `saf handoff` behavior equals MH-04 only.
6. **MH-06 (Typed memory files):** Fresh `saf init` seeds
   `.ai/memory/patterns.md` and `.ai/memory/gotchas.md` from templates alongside
   the existing five files, non-overwriting per policy §1.3. `saf handoff` strict
   cross-check (MH-05b) accepts any `.ai/memory/*.md` — old or typed — as a valid
   promotion target. Existing projects missing these files are not failed; they
   gain the files on the next `init`.
7. **MH-07 (Opt-in archival):** `saf compact-memory --archive` (or
   `context-policy.json: memory.archive_on_compact: true`) moves the active
   feature's raw session logs into `.ai/sessions/archive/<slug>/` after writing
   the compaction pack. Archived logs are never deleted and are excluded from all
   budget scans (the `archive/` subdirectory is not walked). Without the flag/key,
   no log moves and the directory layout is unchanged.
8. **MH-08 (Doctor advisories):** `saf doctor` emits non-blocking warnings
   (`required: false`) when (a) a project's `context-policy.json` lacks
   `session_scope` (recommending `"active_feature"`), and (b) `.ai/sessions/`
   holds logs attributable to already-compacted features that could be archived.
   No advisory ever changes an exit code.
9. **MH-09 (No behavior drift):** Command signatures, exit codes, exported
   function names, `schema_version` read-old/write-new semantics, and the
   five-file memory format are unchanged. Every policy key added is optional and
   defaults to today's behavior when absent.

## Test Strategy

- **Unit (`validators/scripts/test-budget.js` or the existing budget test):**
  - `estimateBudget` with mixed-feature session logs: scoped total counts only
    active-slug logs; unmarked and other-slug logs excluded; `"all"`/absent key
    reproduces the current total exactly.
  - Context-pack scoping by filename.
  - Archive subdirectory is never walked.
- **CLI integration (`validators/scripts/test-cli.js`):**
  - `handoff` against an unedited scaffold exits `1` (MH-04); against an authored
    handoff exits `0`.
  - `handoff --strict` fails on empty/placeholder sections and on a
    "Promoted to project memory" section naming no real memory file; passes when a
    real non-empty `.ai/memory/*.md` is named.
  - Fresh `init` seeds `patterns.md` and `gotchas.md`; re-running `init` does not
    overwrite an edited typed file (idempotent, non-intrusive).
  - `compact-memory --archive` moves scoped logs to `.ai/sessions/archive/<slug>/`
    and leaves other features' logs in place; the pack lists only scoped inputs.
  - `doctor` prints the `memory.budgetScope.recommended` and
    `memory.sessions.archivable` advisories on a stale fixture and stays silent on
    a fresh one.
- **Compatibility (`validators/scripts/test-init-checks.js` /
  `test-target-project-bootstrap.js`):** a fixture initialized by the previous
  layout (five flat files, policy file without the new keys) produces identical
  budget numbers and a passing `handoff`, with only non-blocking doctor warnings.
- Full suite via `npm test`.

## Behavior-Preservation Rules

- `estimateBudget`, `computeOutcome`, and `loadPolicyConfig` keep their names,
  signatures, and module exports; `handleCompactMemory` and `handleHandoff` keep
  their command names and exit-code contract (`0 = pass`, `1 = fail`).
- New `budget_inputs.session_scope`, `budget_inputs.context_pack_scope`,
  `handoff.strict`, and `memory.archive_on_compact` are optional keys; when absent
  every code path reproduces current behavior byte-for-byte. This matches the
  017 budget row of the compatibility matrix ("old context-policy files behave
  exactly as today").
- Typed memory files are *new files* per the matrix's "typed memory" row; the
  existing five files keep their format, and `handoff`/`onboard-memory` accept both
  layouts.
- Archival moves logs to a backup-style location and never deletes (policy §2);
  the move is opt-in and reversible.
- The MH-04 scaffold-rejection is classified as a bugfix (an unedited template was
  never intended to pass), so it is always on; every other new check is opt-in and
  becomes default only in a later minor with a doctor notice (policy §1.4).
- `handoff` and `validate-spec` remain fully offline and LLM-free (policy §1.6).

## User Scenarios

### Scenario 1: Feature 017 in a project with 16 prior features
The active feature is `017-...`. Session logs from features 001–016 sit in
`.ai/sessions/`. With `session_scope: "active_feature"`, `saf budget` counts only
the 017 logs, the estimate stays in the `inline`/`context_pack` band, and
`compact-memory` produces a pack containing only 017 inputs.

### Scenario 2: An agent forgets to author the handoff
A subagent runs `compact-memory` but the scaffold is left unedited. `saf handoff`
exits `1` with "handoff.md still contains the seed marker; author it before
closing the session", instead of falsely passing.

### Scenario 3: Strict promotion check
A reviewer runs `saf handoff --strict`. The handoff claims facts were promoted but
names no real memory file; the gate fails and points at the missing cross-reference,
catching a compaction that produced a report but no durable memory write.

### Scenario 4: Bounded session directory
After a feature ships, the team runs `compact-memory --archive`. That feature's
raw logs move to `.ai/sessions/archive/<slug>/`; future budget estimates and
compaction packs never see them again, so the active scan surface stays bounded.

## Functional Requirements

- **FR-022-01:** Add a deterministic helper that reads a session log's
  `**Feature:**` marker from its header without loading the whole file, and a
  predicate that decides membership for the active slug.
- **FR-022-02:** Teach `estimateBudget`'s session and context-pack walks to honor
  `session_scope` / `context_pack_scope`, defaulting to `"all"` when the key is
  absent, and to skip the `archive/` subdirectory.
- **FR-022-03:** Teach `handleCompactMemory` to scope its session inputs by the
  same predicate and to support `--archive` / `memory.archive_on_compact`.
- **FR-022-04:** Add the always-on seed-marker rejection and the opt-in strict
  checks to `handleHandoff`, reading `handoff.strict` from policy and accepting a
  `--strict` flag.
- **FR-022-05:** Seed `.ai/memory/patterns.md` and `.ai/memory/gotchas.md` from
  new templates in `init`'s memory-file list, non-overwriting.
- **FR-022-06:** Add the two non-blocking doctor advisories in `lib/init-checks.js`.
- **FR-022-07:** Set `session_scope: "active_feature"` and
  `context_pack_scope: "active_feature"` in the policy file that fresh `init`
  writes; leave existing policy files untouched.
- **FR-022-08:** Document the upgrade path (new keys, archival, strict handoff,
  typed files) in `docs/migration.md` and `CHANGELOG.md` `### Upgrade notes`.

## Assumptions

- `new-session` is the canonical way logs are created, so the `**Feature:**`
  header marker is present on logs authored after SAF init; logs without it are
  legacy/external and are conservatively excluded under `active_feature` scope.
- Context packs are named with the feature slug (`compact-<slug>.json`), matching
  the current `handleCompactMemory` naming, so filename matching is sufficient for
  pack scoping.
- The estimate feeds an enforcement gate that is itself opt-in (`enforce: false`
  default, per the 017 row), and scoping only ever lowers the estimate, so no
  existing project can be pushed into a more restrictive outcome by this change.
- "Semantic" verification here means deterministic content-correlation between the
  handoff report and on-disk memory state, not LLM judgment, consistent with the
  offline-validation guarantee.
