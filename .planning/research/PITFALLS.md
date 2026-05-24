# Domain Pitfalls

**Domain:** AI coding workflow orchestration protocol / local spec-to-ship agent pipeline
**Researched:** 2026-05-24
**Scope:** Brownfield documentation-first repository with codebase map present and no app runtime yet
**Overall confidence:** HIGH for repo-specific risks; MEDIUM for roadmap sequencing because implementation phases are not defined yet

## Critical Pitfalls

Mistakes that can make the protocol unreliable, confusing, or impossible to validate.

### Pitfall 1: Path Drift Becomes the Real Runtime

**What goes wrong:** Documents describe one artifact contract while files and generated tool scaffolds use another. Agents then follow whichever path appears most recent or most convenient.

**Why it happens:** This repo already has competing path conventions: `docs/prd.md` and `.ai/constitution.md` describe durable `.ai/` artifacts, the codebase map reports `.ai/specs/current/` expectations, the repository currently has flat `.ai/specs/*.md` files, and the old `ai-delivery-pipeline-blueprint.md` path is deleted while some planning material still references it.

**Warning signs:**
- More than one "current spec" path appears in docs or scripts.
- A validation command checks for a file path that no longer exists.
- Agents create new state files instead of updating the intended durable artifact.
- Roadmap phases say "update the spec" without naming the exact file.
- Generated Spec-Kit/Gemini files write to paths outside the documented `.ai/` contract.

**Prevention strategy:**
- Make a canonical artifact contract the first implementation milestone, before CLI behavior or templates.
- Create a path registry document or machine-readable manifest listing every durable artifact, owner, lifecycle, and allowed aliases.
- Add a docs consistency check that fails on stale references to deleted or noncanonical paths.
- Keep one current-spec convention: either flat `.ai/specs/` or `.ai/specs/current/`, not both.
- Treat path changes as compatibility changes that require search-and-update across `.ai/`, `.planning/`, `docs/`, and runtime-specific instructions.

**Likely phase mapping:** Phase 1 should resolve artifact contract and path registry. Phase 2 should add automated reference checks. Any template or CLI phase must depend on these.

**Detection:** Run a path-reference scan before every roadmap phase and block if documented files do not exist.

### Pitfall 2: Framework Soup Hides Ownership

**What goes wrong:** Superpowers, GStack, GSD, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, Playwright, Codex, Claude, and Gemini all appear in the workflow, but no layer owns routing, state, validation, or failure handling.

**Why it happens:** The product goal is orchestration, not replacement. Without crisp boundaries, the protocol can become a list of tools rather than an operating model.

**Warning signs:**
- A phase says "use GSD/Superpowers/Spec-Kit" without defining entry conditions, exit artifacts, and failure routing.
- Runtime-specific files such as `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and `.ai/constitution.md` contain diverging rules.
- A tool's default behavior changes repository state outside the accepted artifact contract.
- Contributors need to know every framework to complete a basic workflow.
- The roadmap adds more integrations before defining the thin orchestration layer.

**Prevention strategy:**
- Define ownership by layer: constitution sets rules, protocol sets phase routing, specs set scope, validators enforce gates, tools execute assigned jobs.
- Write a routing matrix that maps task type to tool, input artifacts, output artifacts, and stop conditions.
- Keep runtime-specific instructions as adapters to the shared protocol, not independent policies.
- Prefer small compatibility shims over deep framework coupling.
- Defer optional integrations until the core artifact contract and validation loop work with one minimal path.

**Likely phase mapping:** Phase 1 should define routing and ownership. Phase 2 should normalize runtime-specific instructions. Later integration phases should add one tool family at a time behind the shared contract.

**Detection:** Review each new workflow step with the question: "Which artifact authorizes this, which tool executes it, and which validator proves it happened?"

### Pitfall 3: Validation Stays Aspirational

**What goes wrong:** The repository claims validation gates, QA, memory handoff, security checks, and health checks, but no executable command verifies them. Agents can then claim completion based on documentation alignment rather than evidence.

**Why it happens:** The current repo is documentation-first and has no app runtime, test runner, CI workflow, package manifest, CLI implementation, or executable validator. The codebase map explicitly calls out missing automated tests and missing documentation consistency checks.

**Warning signs:**
- Research, roadmap, specs, or sessions say `PASS` without naming a command or review artifact.
- Validation reports are empty placeholders.
- A phase closes because docs were edited, not because a check ran.
- "Manual review" becomes the default for every gate.
- No single command answers "is the protocol internally consistent?"

**Prevention strategy:**
- Build a minimal `health` or `validate` command early, even if it only checks file existence, required headings, stale path references, and non-empty memory artifacts.
- Separate documentation validation from future app/runtime validation.
- Require every phase to declare its verification command or review packet before execution starts.
- Add CI only after the local command is useful; CI should run the same checks, not invent a second validation model.
- Track validation evidence in `.ai/memory/verification-history.md` or a single canonical validation report.

**Likely phase mapping:** Phase 2 should implement the first executable validation layer. Phase 3 should wire validation into templates or CLI entry points. Every later phase should extend the validator when it adds new durable artifacts.

**Detection:** A roadmap item is not complete unless it produces a command result, a generated report, or an explicit human review packet.

### Pitfall 4: Self-Repair Loops Become Autonomous Debate

**What goes wrong:** Agents repeatedly revise specs, plans, tasks, or docs after validation failures without a hard stop. The loop consumes context, hides the original failure, and can gradually rewrite scope to satisfy the validator.

**Why it happens:** The constitution and PRD correctly require `NEEDS_HUMAN_REVIEW` after repeated failures, but the retry counter and failure categories are not executable yet.

**Warning signs:**
- The same validation category fails more than once with different wording but no root-cause decision.
- Agents edit both the validator and the artifact being validated in the same recovery loop.
- A failure report lacks category, attempt number, changed files, or next owner.
- Scope expands during "repair" without returning to spec or planning.
- The agent keeps working because it can still make changes, not because the gate authorizes continuation.

**Prevention strategy:**
- Model failure categories explicitly: path contract, spec contradiction, missing evidence, runtime/tool failure, security/data-loss risk, and user-scope conflict.
- Store retry counts in a durable session or validation state file.
- After three failures in the same category, block autonomous continuation and generate a human review packet.
- Prohibit changing validators and validated artifacts in the same repair attempt unless the spec explicitly authorizes it.
- Require failure reports to route back to the earliest artifact that can correct the issue.

**Likely phase mapping:** Phase 2 should define validation state and failure categories. Phase 3 should implement retry counting and `NEEDS_HUMAN_REVIEW` output. Phase 4 should add recovery templates and review packet generation.

**Detection:** Any repeated `FAIL` without a stable category and attempt count is itself a validation failure.

### Pitfall 5: Docs and Runtime Diverge After the First Script

**What goes wrong:** The protocol docs remain polished while scripts, templates, generated command packs, and future CLI behavior drift. Users then cannot tell whether the docs describe target behavior or implemented behavior.

**Why it happens:** The PRD and constitution already describe validation gates, state files, health checks, QA reports, and memory handoff that are not implemented. Once scripts are added, the divergence risk increases unless docs and executable behavior are tested together.

**Warning signs:**
- A README or PRD says "the pipeline enforces" something that only a human checklist currently enforces.
- Generated templates contain paths, headings, or gate names that differ from docs.
- A CLI command's output cannot be mapped to the phase definitions in `docs/prd.md`.
- The repo has duplicate descriptions of the same phase with different names.
- Implementation status is unclear: target, partial, and complete behavior are mixed in the same document.

**Prevention strategy:**
- Add implementation-status labels to protocol docs: planned, template-only, manually enforced, executable.
- Keep CLI help, templates, and docs generated from shared definitions where practical.
- Add golden-file tests for generated templates and command output once scripts exist.
- Require every runtime behavior change to update the PRD or a generated reference in the same phase.
- Avoid claiming enforcement until a command can fail.

**Likely phase mapping:** Phase 1 should mark current implementation status. Phase 2 should add consistency checks. CLI/template phases should include docs-runtime parity tests.

**Detection:** If a user cannot run or inspect the thing a doc says is enforced, mark it as non-executable until proven otherwise.

### Pitfall 6: Memory Handoff Is Present but Empty

**What goes wrong:** Durable memory files exist, but they do not contain enough current facts for the next agent to resume safely. Each session rediscovers decisions or invents new ones.

**Why it happens:** The codebase map reports placeholder memory files under `.ai/memory/`. The constitution requires memory handoff for behavior, architecture, operations, and known-risk changes, but the handoff schema is not yet enforced.

**Warning signs:**
- `.ai/memory/known-risks.md` does not mention path drift, validation gaps, or framework ownership.
- `.ai/memory/decisions.md` lacks dates and decision owners.
- Session notes contain important decisions that are not promoted to durable memory.
- New phases repeat the same discovery work because prior findings were not summarized.
- Agents cite chat context instead of repository artifacts.

**Prevention strategy:**
- Seed memory files during the first roadmap phase with canonical paths, current implementation status, known risks, and accepted decisions.
- Define a small handoff schema: what changed, why, evidence, affected artifacts, next risk.
- Add validation that required memory files are non-empty and contain expected headings.
- Make memory update a required exit criterion for phases that change protocol behavior, validation, architecture, or operations.

**Likely phase mapping:** Phase 1 should seed durable memory. Phase 2 should validate memory structure. Later phases should update memory as part of done criteria.

**Detection:** If a future agent needs chat history to understand the current protocol state, memory handoff has failed.

## Moderate Pitfalls

### Pitfall 7: Runtime-Specific Guardrails Leave Gaps

**What goes wrong:** One agent runtime enforces a rule, but another runtime bypasses it. For example, Claude-specific hooks can require gstack while Codex or Gemini paths rely on prose instructions only.

**Warning signs:**
- A rule appears only in `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`.
- Hook behavior is described as repository behavior.
- Runtime-specific command scaffolds can mutate project files without the shared constitution.

**Prevention strategy:**
- Put non-negotiable rules in `.ai/constitution.md` first.
- Treat runtime files as adapters that reference the shared rules.
- Add adapter checks that verify each runtime instruction file points back to the constitution and canonical artifact contract.

**Likely phase mapping:** Phase 2 should normalize runtime adapters after the artifact contract is stable.

### Pitfall 8: Generated Scaffolds Are Mistaken for Product Code

**What goes wrong:** Generated `.specify/` scripts and command files become de facto product behavior before the repo decides whether they are vendor scaffolding, editable templates, or runtime implementation.

**Warning signs:**
- Generated files are patched directly to fix protocol behavior.
- Spec-Kit paths conflict with `.ai/` paths.
- The roadmap depends on generated scripts whose ownership is unclear.

**Prevention strategy:**
- Classify generated scaffolds as vendored, adapted, or owned.
- Put owned protocol behavior in a small repo-controlled layer rather than deep inside generated files.
- Document which generated files can be regenerated and which cannot.

**Likely phase mapping:** Phase 1 should classify scaffold ownership. Integration phases should only adapt generated tools through documented extension points.

### Pitfall 9: Security Policy Has No Enforcement Surface

**What goes wrong:** The constitution requires security baseline checks, secret protection, and explicit destructive-operation approval, but no scanner or checklist runner exists.

**Warning signs:**
- Security is mentioned only in prose.
- Auto-commit or broad `git add .` behavior is enabled before ignore rules and secret scans are validated.
- Human review is the only security gate for generated scripts.

**Prevention strategy:**
- Start with a simple local checklist for destructive operations, secret-like filenames, broad git staging, and environment files.
- Keep auto-commit disabled by default.
- Add secret scanning or preflight checks before any phase introduces generated commands that touch git state.

**Likely phase mapping:** Phase 2 should add baseline security checks to validation. Git automation phases must depend on this.

### Pitfall 10: Roadmap Builds CLI Before Protocol Invariants

**What goes wrong:** The project jumps to commands, templates, or automation before deciding the invariant model. That locks in bad paths and ambiguous ownership.

**Warning signs:**
- A CLI phase appears before canonical path, routing, and validation phases.
- Templates are generated from duplicated markdown rather than shared definitions.
- "Health check" is deferred until after multiple behavior phases.

**Prevention strategy:**
- Roadmap order should be: artifact contract, routing matrix, minimal validator, memory handoff, then templates/CLI.
- Keep early scripts intentionally boring: validate, list status, and render current state.
- Add automation only when it enforces an already accepted invariant.

**Likely phase mapping:** Phase 1 and Phase 2 should be foundation phases. CLI automation should start no earlier than Phase 3.

## Minor Pitfalls

### Pitfall 11: Research Files Become Another Source of Truth

**What goes wrong:** `.planning/research/` findings outlive their purpose and conflict with later accepted specs or roadmap decisions.

**Warning signs:**
- Agents cite research over `.ai/constitution.md`, accepted specs, or roadmap.
- Old research recommendations remain after implementation changes.

**Prevention strategy:** Treat research as roadmap input, not standing authority. Promote accepted decisions into `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.ai/constitution.md`, or `.ai/memory/decisions.md`.

**Likely phase mapping:** Requirements and roadmap generation should promote or discard research findings explicitly.

### Pitfall 12: Manual Review Packets Are Not Actionable

**What goes wrong:** The pipeline stops for human review but does not provide enough context for a decision.

**Warning signs:**
- `NEEDS_HUMAN_REVIEW` appears without changed files, failure category, attempted fixes, risk, and requested decision.
- Review packets are stored in inconsistent locations.

**Prevention strategy:** Define a review packet template with status, failure category, attempt count, evidence, affected files, options, and recommended decision.

**Likely phase mapping:** Add with the self-repair loop phase, before broader execution automation.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Artifact contract | Path drift between `.ai/specs/`, `.ai/specs/current/`, `.specify/`, and deleted blueprint paths | Create canonical path registry and fail validation on stale references |
| Routing rules | Framework soup and unclear ownership | Add routing matrix with input, output, owner, validator, and stop conditions |
| Validation foundation | Aspirational gates without executable checks | Build minimal local validator before CLI or template expansion |
| Failure feedback loop | Infinite self-repair and scope mutation | Persist failure category and retry count; stop at `NEEDS_HUMAN_REVIEW` |
| Memory handoff | Placeholder files that do not preserve decisions | Seed memory files and validate required headings/content |
| Runtime adapters | Claude/Gemini/Codex rules diverge | Reference shared constitution and path registry from each adapter |
| CLI/templates | Docs/runtime divergence | Add golden checks for generated files and command output |
| Git automation | Broad staging or accidental secret inclusion | Keep auto-commit off; require explicit path staging and baseline secret checks |

## Roadmap Implications

Recommended ordering:

1. **Foundation: Canonical Contract and Status**
   - Resolve artifact paths, source-of-truth hierarchy, implementation-status labels, and scaffold ownership.
   - Blocks path drift and docs/runtime ambiguity before they spread.

2. **Validation: Minimal Executable Gates**
   - Implement a local validator for file existence, stale references, required headings, non-empty memory, and validation evidence.
   - Converts the protocol from prose to checkable behavior.

3. **Routing and Runtime Adapters**
   - Normalize GSD, Superpowers, Spec-Kit/OpenSpec, Claude, Codex, and Gemini responsibilities through one routing matrix.
   - Prevents framework soup while preserving runtime neutrality.

4. **Failure Loop and Human Review**
   - Add failure categories, retry counting, review packet generation, and `NEEDS_HUMAN_REVIEW` enforcement.
   - Prevents self-repair loops before broader execution automation exists.

5. **Templates and CLI Automation**
   - Generate or operate on accepted artifacts after invariants are validated.
   - Keeps implementation aligned with docs.

## Sources

- `.planning/PROJECT.md` - project purpose, active requirements, constraints, key decisions
- `.planning/codebase/CONCERNS.md` - current tech debt, missing features, security considerations, test gaps
- `.planning/codebase/TESTING.md` - current absence of automated test framework and recommended verification workflow
- `docs/prd.md` - pipeline stages, gates, failure loop, memory handoff, product direction
- `.ai/constitution.md` - authority order, non-negotiables, validation and self-repair rules
