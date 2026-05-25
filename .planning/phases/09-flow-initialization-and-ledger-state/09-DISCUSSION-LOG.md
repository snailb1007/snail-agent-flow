# Phase 9: Flow Initialization and Ledger State - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 09-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 9-flow-initialization-and-ledger-state
**Areas discussed:** Init extension, Ledger state format, Brownfield merge strategy, SKILL.md generation, Feature directory naming, Package distribution.

---

## Init Extension Scope

### Question 1: How should `adp init` create the flow infrastructure?
| Option | Description | Selected |
|--------|-------------|----------|
| Separate `init-flow` subcommand | Add a new CLI command that only creates flow files. | |
| Extend existing `handleInit()` | Add flow directory creation and file copying to the existing init function. | ✓ |

**Recommended choice:** Extend existing `handleInit()`
**Selected:** Extend existing `handleInit()`
**Notes:** The roadmap says "Extend `adp init`", not add a new command. Adding to the existing init keeps the user interface simple — one init command bootstraps everything. The flow files are just another directory and template copy, consistent with how constitution.md and agent instruction files are already handled.

---

## Flow Definition Copy Location

### Question 1: Where does the flow definition get copied to in the target project?
| Option | Description | Selected |
|--------|-------------|----------|
| `.ai/flows/rough-project-flow.yaml` | Under the `.ai/` tree, consistent with other mutable state. | ✓ |
| `.specify/flows/rough-project-flow.yaml` | Under `.specify/`, consistent with templates. | |
| Project root `flows/` | Top-level directory. | |

**Recommended choice:** `.ai/flows/`
**Selected:** `.ai/flows/`
**Notes:** This was decided in Phase 08 and confirmed in STATE.md. The `.ai/` tree owns mutable orchestration state. The copy in `.ai/flows/` is the per-project customizable version; the source template stays in `.specify/templates/`.

---

## Ledger State Schema

### Question 1: What fields should `flow-ledger.json` contain?
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — just stage statuses | Only track which stages are done/pending. | |
| Full tracking — statuses, artifacts, timestamps, gates, revision history | Track everything needed for the flow engine (Phase 10) to resume and audit. | ✓ |

**Recommended choice:** Full tracking
**Selected:** Full tracking
**Notes:** The roadmap specifies: "flow name, current stage, stage statuses (pending/in_progress/done/blocked/needs_revision), artifact paths per stage, timestamps, gate results, and revision history." This is what Phase 10's flow engine will consume. Building a complete ledger now avoids a breaking schema change later.

### Question 2: Ledger schema structure
| Option | Description | Selected |
|--------|-------------|----------|
| Flat stage array | Each stage is an object in a flat array with all tracking fields. | ✓ |
| Nested stage map | Stages keyed by ID in a map, with a separate metadata section. | |

**Recommended choice:** Flat stage array
**Selected:** Flat stage array
**Notes:** The flow definition uses a `stages` array. Mirroring that structure in the ledger makes it trivial to iterate and match by index or ID. A map adds key-lookup convenience but introduces ordering ambiguity in JSON.

---

## Brownfield Merge Strategy

### Question 1: How to handle existing `.ai/` infrastructure
| Option | Description | Selected |
|--------|-------------|----------|
| Skip if exists | If `.ai/flows/` or `flow-ledger.json` already exists, skip entirely. | ✓ |
| Deep merge | Read existing files and merge new fields into them. | |
| Overwrite with backup | Create a `.bak` of existing files and overwrite. | |

**Recommended choice:** Skip if exists
**Selected:** Skip if exists
**Notes:** This is consistent with how `handleInit()` already works for every other file: "if exists, skip." The constitution, CLAUDE.md, GEMINI.md, AGENTS.md all follow this pattern. Deep merge of JSON ledger state is fragile and risks corrupting in-progress flows. Skip-if-exists is the safest brownfield approach.

---

## SKILL.md Generation

### Question 1: What goes in the generated SKILL.md stub?
| Option | Description | Selected |
|--------|-------------|----------|
| Full engine skill | A complete flow engine implementation in SKILL.md. | |
| Stub referencing flow definition | A lightweight SKILL.md that tells agents where to find the flow definition and ledger, with instructions to read them. | ✓ |

**Recommended choice:** Stub referencing flow definition
**Selected:** Stub referencing flow definition
**Notes:** The full flow engine is Phase 10 (ENGINE-01 through ENGINE-04). Phase 9 only needs to generate a stub that agents can discover. The stub should have correct YAML frontmatter (name, description) and markdown instructions pointing to `.ai/flows/` and `.ai/state/flow-ledger.json`. Phase 10 will replace or extend it.

### Question 2: Where does the SKILL.md get generated?
| Option | Description | Selected |
|--------|-------------|----------|
| `.agents/skills/project-flow/SKILL.md` | Under the project's local skills directory. | ✓ |
| `~/.gemini/config/skills/project-flow/SKILL.md` | In the user's global config. | |

**Recommended choice:** `.agents/skills/project-flow/SKILL.md`
**Selected:** `.agents/skills/project-flow/SKILL.md`
**Notes:** The skill is project-specific — it references project-local files. Installing to the global config would be invasive and could conflict across projects. The `.agents/skills/` directory is already used for project-local skills.

---

## Feature Directory Naming Fix

### Question 1: How to handle the misnamed `specs/009-artifact-gate-enforcement`
| Option | Description | Selected |
|--------|-------------|----------|
| Create new correctly-named scaffold | Create `specs/009-flow-initialization-ledger` and update the feature pointer. | ✓ |
| Rename existing directory | Rename in place and fix the pointer. | |
| Leave as-is and use for Phase 9 | Rewrite the existing scaffold content. | |

**Recommended choice:** Create new correctly-named scaffold
**Selected:** Create new correctly-named scaffold
**Notes:** The existing `specs/009-artifact-gate-enforcement` was created by a previous `adp feature` call with the wrong description (it matches Phase 11, not Phase 9). Creating a new scaffold with `adp feature "flow initialization and ledger state"` would generate `specs/010-*` (next number). Instead, we will manually create `specs/009-flow-initialization-ledger` with proper content during the canonical spec stage, and update `.specify/feature.json`. The misnamed directory should be removed.

---

## Package Distribution

### Question 1: Should `lib/` be added to the `files` array in package.json?
| Option | Description | Selected |
|--------|-------------|----------|
| Add `lib/` to `files` now | Ensures yaml-parser and tool-validator ship with the package. | ✓ |
| Defer to later phase | Handle during a packaging sweep. | |

**Recommended choice:** Add `lib/` now
**Selected:** Add `lib/` now
**Notes:** Phase 9's init extension will import from `lib/yaml-parser.js` to parse the flow definition for ledger creation. If `lib/` isn't in `files`, the init command breaks for npm-installed users. This is a dependency of the work, not scope creep.

---

## Deferred Ideas

- Full flow engine logic that reads ledger and dispatches skills (Phase 10).
- Deterministic artifact gate checking at stage boundaries (Phase 11).
- Flow validator command (`adp flow validate`) (Phase 13).
- `adp status` integration with flow ledger state (can be done in Phase 10 when the engine is built).
