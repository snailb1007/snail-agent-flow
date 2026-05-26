---
phase: 15-strict-initialization-checks-and-detailed-installation-guide
plan: 02
status: complete
completed: 2026-05-26
---

# Summary — Create init-checks and skill-md-parser modules

## Findings verified

- The strict checks require parsing `<execution_context>` blocks in `SKILL.md` to identify global references (`~`, `$HOME`, `.gemini/`) and verify local copy paths.
- To prevent circular dependencies, standard Node utilities are imported at the top-level of `lib/init-checks.js`, whereas other internal modules are lazy-required within the checks functions.
- All filesystem calls are wrapped defensively in try/catch blocks to ensure `runStrictChecks` behaves as a pure function and never throws.

## Changes

- **`lib/skill-md-parser.js`** (NEW)
  - Created a pure module containing `extractExecutionContextBlocks` (regex-based `<execution_context>` scraper) and `findSuspiciousAtLines` (home/global path detector).
- **`lib/init-checks.js`** (NEW)
  - Implemented the `runStrictChecks` engine checking: directories, flow YAML existence + parse, ledger existence + schema, per-stage prerequisites, localized skill reference existence, localized global references (Pitfall 1 protection), instruction-file subagent guidelines, constitution, and active feature pointer.
  - Implemented `formatTerminal` returning visually formatted terminal reports.
  - Implemented `formatMarkdownGuide` translating failures to a structured, offline Markdown repair guide.

## Verification

- Verified `lib/skill-md-parser.js` functionality with an inline regex assertion test.
- Tested `lib/init-checks.js` against the active repository. It correctly found `prereqs.gstack` (GStack missing) as the only failing check, and printed both terminal output and Markdown guide as specified.
- Ran `npm test` successfully.
