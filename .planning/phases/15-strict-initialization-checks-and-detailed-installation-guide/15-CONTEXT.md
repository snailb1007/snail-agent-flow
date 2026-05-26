# Phase 15: Strict Initialization Checks and Detailed Installation Guides for Missing Tools - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase tightens initialization and onboarding checks so `adp init` and related startup paths detect incomplete setup early, explain exactly what is missing, and produce actionable installation or repair guidance. It builds on the Phase 12 prerequisite checker and Phase 14 skill-localization work; it does not auto-install tools or add new flow execution automation.

</domain>

<decisions>
## Implementation Decisions

### Init Strictness
- **D-15-01:** `adp init` should remain non-destructive and brownfield-safe, but it should run a strict deterministic post-init gate after attempting required artifact creation and skill localization.
- **D-15-02:** Required setup failures should make `adp init` exit nonzero after printing a repair summary. Required failures include malformed flow YAML, invalid or missing ledger state after generation, missing required flow prerequisites, unreadable required skill definitions, failed required workflow/reference localization, and generated local skill files that still point at inaccessible home/global paths.
- **D-15-03:** Existing project files must not be overwritten to satisfy strictness. If an existing file blocks successful initialization, the command should report the exact file and required manual action instead of replacing it.
- **D-15-04:** Optional compatibility outputs can warn without failing only when the flow can still proceed deterministically. The planner should define the precise required-versus-optional list; default to required for artifacts the flow engine or agent skill loader needs before the next stage can run.

### Check Coverage
- **D-15-05:** Strict initialization should validate the full local/offline setup surface: `.ai/flows/rough-project-flow.yaml`, `.ai/state/flow-ledger.json`, declared flow prerequisites, local skill folders under `.agents/skills/` and `.claude/skills/`, localized workflow/reference files, instruction-file guideline sections, and the active feature/spec pointer when present.
- **D-15-06:** Validation must reuse existing deterministic helpers where possible: `lib/tool-validator.js` for prerequisite checks, `lib/flow-engine.js` / ledger helpers for flow-stage readiness, and existing spec/CLI validators for artifact sanity. Do not add LLM-as-judge checks or live web lookups.
- **D-15-07:** The strict init gate should share behavior with `adp doctor` so users see consistent pass/fail reasons whether they run initialization or a later health check.
- **D-15-08:** Checks should report evidence: checked paths, checked commands, missing files, parse errors, and the stage or prerequisite that needs the missing tool.

### Installation Guide Shape
- **D-15-09:** Missing-tool guidance should be layered: concise terminal output for immediate failure visibility, plus a detailed generated Markdown repair guide for copy/paste setup steps and later review.
- **D-15-10:** The detailed guide should include, per missing tool or skill: purpose, why it is required, detected failure reason, checked paths/commands, installation or copy commands, workspace-local fallback, home-directory fallback, and the exact verification command to rerun.
- **D-15-11:** Prefer enhancing the existing structured instruction database in `lib/tool-validator.js` rather than scattering prose across CLI code. The CLI should format those structured records for terminal and Markdown output.
- **D-15-12:** The guide should stay local and offline. It can reference known package managers or copy commands, but it must not depend on network lookups at runtime.

### Skill Localization Failures
- **D-15-13:** If Phase 14 localization cannot read or copy a referenced required workflow/reference file, strict init should fail closed with a repair guide entry. Falling back to inaccessible global paths is not acceptable because it recreates the sandbox failure this work is meant to prevent.
- **D-15-14:** Localized `SKILL.md` files should be checked after rewrite. Any remaining `~`, home-directory, or known global GSD workflow references in execution-context paths should be reported as initialization failures unless explicitly classified as safe documentation text.
- **D-15-15:** The repair output should distinguish "tool missing" from "tool exists but local workflow files are incomplete" so users do not reinstall the wrong thing.
- **D-15-16:** Keep the Phase 14 safe overwrite policy: skip existing local files rather than replacing custom edits, but report skipped files that prevent a valid localized setup.

### the agent's Discretion
The user selected all areas and asked the agent to use recommended defaults, asking only when no recommendation is possible or when a real tradeoff blocks a clear choice. Downstream agents may choose exact function names, output wording, and file paths for generated repair guides, provided they preserve the decisions above and existing project conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Prior Decisions
- `.planning/ROADMAP.md` — Phase 15 entry and milestone boundary; note that the roadmap goal is still a placeholder and must be refined during planning.
- `.planning/REQUIREMENTS.md` — Active v2 requirements, especially WARN and SUB requirements that Phase 15 builds on.
- `.planning/PROJECT.md` — Project constraints: no automatic installation, runtime neutrality, local file-based orchestration, and verification-required completion.
- `.planning/STATE.md` — Current milestone state and accumulated context noting Phase 15 as strict init checks plus detailed installation guides.
- `.planning/phases/12-prerequisite-tool-checker-and-installation-guide/12-CONTEXT.md` — Locked prerequisite-checker decisions from Phase 12.
- `.planning/phases/14-improve-ai-for-spawn-subagent-support/14-CONTEXT.md` — Locked skill-localization and subagent instruction decisions from Phase 14.

### Existing Implementation
- `bin/adp.js` — `handleInit`, `handleDoctor`, skill localization, and instruction-file initialization behavior.
- `lib/tool-validator.js` — Existing prerequisite detection and structured installation instruction database.
- `lib/flow-engine.js` — Existing stage prerequisite check integration and flow readiness helpers.
- `specs/011-prerequisite-tool-checker-installation/spec.md` — Feature spec for Phase 12 prerequisite checker behavior.
- `specs/011-prerequisite-tool-checker-installation/walkthrough.md` — Verification and implementation evidence for existing prerequisite warning behavior.
- `specs/016-strict-initialization-checks-detailed/spec.md` — Current generated feature packet for this work; currently generic and should be refined by planning.
- `specs/016-strict-initialization-checks-detailed/plan.md` — Current generated implementation plan placeholder.
- `specs/016-strict-initialization-checks-detailed/tasks.md` — Current generated task checklist placeholder.

### Codebase Maps
- `.planning/codebase/STACK.md` — Runtime and tool dependency context.
- `.planning/codebase/ARCHITECTURE.md` — Layering and flow architecture.
- `.planning/codebase/CONVENTIONS.md` — CLI/script conventions, error handling, and documentation artifact conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validatePrerequisites` in `lib/tool-validator.js`: already resolves local skill folders, home config skill folders, explicit checks, and PATH commands.
- `getToolInstructions` / `INSTRUCTIONS_DB` in `lib/tool-validator.js`: the right place to expand missing-tool guidance into structured terminal and Markdown content.
- `checkStagePrerequisites` in `lib/flow-engine.js`: already maps flow stages to prerequisite declarations and attaches installation guidance.
- `handleInit` and `handleDoctor` in `bin/adp.js`: the main integration points for strict post-init checks and consistent health-check output.
- Existing CLI integration tests in `validators/scripts/test-cli.js`: the expected place for greenfield, brownfield, missing-prerequisite, and localization failure coverage.

### Established Patterns
- The CLI is Node/CommonJS with built-in modules, 2-space indentation, semicolons, and explicit `process.exit(1)` on command failures.
- Initialization is brownfield-safe: create missing files, skip existing files, and avoid overwriting user-customized artifacts.
- Validation is deterministic and local/offline. Existing project constraints reject automatic installation, web lookup, and LLM-as-judge gates.
- Planning and repair artifacts should use concrete relative paths so another agent can resume without guessing.

### Integration Points
- `adp init` should run strict checks after directory/template/flow/ledger/skill initialization and after Phase 14 localization.
- `adp doctor` should reuse the same check/reporting layer so init failures and doctor failures do not drift.
- `.ai/state/flow-ledger.json` may need blocked status updates only when the missing prerequisite blocks the current or next flow stage.
- Generated repair guidance should live under an existing durable review/state location rather than being printed only to stdout.

</code_context>

<specifics>
## Specific Ideas

The user approved the recommended path for every gray area and only wants follow-up questions when no recommendation is possible or a meaningful tradeoff blocks a clear choice.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Automatic installation remains explicitly out of scope.

</deferred>

---

*Phase: 15-strict-initialization-checks-and-detailed-installation-guide*
*Context gathered: 2026-05-26*
