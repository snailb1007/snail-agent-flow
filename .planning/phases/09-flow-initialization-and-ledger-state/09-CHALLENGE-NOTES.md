# Phase 9: Flow Initialization and Ledger State — Challenge Notes

**Date:** 2026-05-25
**Phase:** 9-flow-initialization-and-ledger-state

We challenged the decisions from `09-CONTEXT.md` against the project's PRD, existing codebase, conventions, and runtime constraints:

---

## 1. Challenge: Extending handleInit() vs. Separate Flow Init

- **Question:** Will extending `handleInit()` make the function too large or create ordering issues with the YAML parse step?
- **Analysis:** Current `handleInit()` is ~94 lines (lines 66–159 of `bin/adp.js`). It creates 6 directories and writes 4 template files. Adding flow init adds: 1 directory (`ai/flows/`), 1 file copy (flow YAML), 1 generated file (ledger JSON), 1 generated file (SKILL.md stub) + reading the YAML to build the ledger. This is ~40-60 more lines.
- **Resolution:** Acceptable. The function follows a linear pattern (create dirs, copy templates, write defaults). The new flow init steps fit the same pattern. Extract ledger generation into a helper function to keep `handleInit()` readable. No architectural change needed.

---

## 2. Challenge: YAML Parse Dependency During Init

- **Question:** `handleInit()` will now `require('../lib/yaml-parser')`. If the YAML parser has a bug or the flow template is malformed, init will crash. Is this acceptable for a bootstrap command?
- **Analysis:** The YAML parser was tested in Phase 8 (`test-flow-parser.js`). The template `rough-project-flow.yaml` is known-good and ships with the package. A parse failure would indicate a corrupted install, not a user error.
- **Resolution:** Wrap the YAML parse + ledger generation in a try-catch. If parsing fails, log a warning and skip ledger creation (the directory and flow file copy can still succeed). This prevents init from crashing on a parse bug while still reporting the issue.

---

## 3. Challenge: Ledger Schema Completeness

- **Question:** The ledger schema includes `gate_result` per stage. Phase 11 defines artifact gate enforcement. Is it premature to include gate fields now?
- **Analysis:** The roadmap says Phase 9 creates the ledger "with fields: flow name, current stage, stage statuses, artifact paths per stage, timestamps, gate results, and revision history." Gate results are explicitly in scope.
- **Resolution:** Include `gate_result` with `null` initial value. The field exists structurally but has no checking logic until Phase 11. This is forward-compatible and avoids a schema migration.

---

## 4. Challenge: Skip-If-Exists Brownfield Risk

- **Question:** If a user has a stale or corrupted `flow-ledger.json` from a previous partial init, skip-if-exists will not repair it. Is this a problem?
- **Analysis:** The existing init pattern skips all files if they exist (constitution, CLAUDE.md, etc.). No repair logic exists for any of these. Phase 13's flow validator (`adp flow validate`) will detect ledger corruption. For now, `adp doctor` does not check flow files either.
- **Resolution:** Accepted. Skip-if-exists is consistent and safe. Repair is Phase 13's scope. We will log a clear message: `[init] .ai/state/flow-ledger.json already exists, skipping.` so users know.

---

## 5. Challenge: SKILL.md Stub vs. Full Engine

- **Question:** Is a stub SKILL.md useful? Agents that mention `project-flow` will find a skill that doesn't actually orchestrate anything. Could this confuse agents?
- **Analysis:** The SKILL.md frontmatter (name + description) is enough for agent discovery. The instructions can explicitly say "This skill is a stub — read the flow definition and ledger manually. Full orchestration will be added in a future version." Agents are capable of reading files when instructed.
- **Resolution:** Accepted. The stub provides discoverability now. The instructions should be clear that this is manual-read-only, not an orchestrator. Phase 10 will replace the stub body with engine logic.

---

## 6. Challenge: `lib/` in Package Distribution

- **Question:** Adding `lib/` to `files` in `package.json` means all future `lib/` modules ship. Is this a problem?
- **Analysis:** `lib/` currently has exactly 2 files: `yaml-parser.js` (177 lines) and `tool-validator.js` (67 lines). Both are small, tested, and needed. Future phases may add more, but the `lib/` directory is purpose-built for shared utilities.
- **Resolution:** Accepted. Adding `lib/` is appropriate. It's no different from `bin/` already being in `files`.

---

## 7. Challenge: Feature Directory Naming

- **Question:** Removing `specs/009-artifact-gate-enforcement` and creating a new spec directory changes git history. Is this disruptive?
- **Analysis:** The existing `specs/009-artifact-gate-enforcement` contains only generic scaffolds from `adp feature` — no real content was authored. It's a naming error (Phase 11's topic, not Phase 9's). Leaving it creates confusion. The scaffold content will be replaced entirely by the canonical spec anyway.
- **Resolution:** Remove the misnamed directory, create a correct one. The generic scaffolds have no value to preserve. This should be done during Stage 3 (canonical spec).

---

## Conclusion

All decisions in `09-CONTEXT.md` are viable and consistent with the PRD, existing codebase patterns, and Phase 8 outputs. Two minor mitigations identified:
- Add try-catch around YAML parsing during init (Challenge #2).
- Make the SKILL.md stub explicitly state it's a placeholder (Challenge #5).

No blocking contradictions found. Ready to proceed to Stage 3 (Canonical spec).
