# Project Research Summary

**Project:** Snail Agent Flow  
**Domain:** Local AI coding workflow orchestration protocol / spec-to-ship agent pipeline  
**Researched:** 2026-05-24  
**Confidence:** HIGH for protocol direction, MEDIUM-HIGH for future stack sequencing

## Executive Summary

Snail Agent Flow is not an IDE, hosted agent platform, or replacement for GSD, GStack, Superpowers, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright. It is a local, file-based operating protocol that tells AI coding agents which tool runs next, which artifact is authoritative, what evidence must be produced, and when autonomous work must stop.

The recommended approach is to stabilize the protocol before building product automation. Start with canonical `.ai/` and `.planning/` artifact contracts, path ownership, routing rules, gate semantics, memory handoff, and manual templates. Then add deterministic validators and only later introduce a thin Node.js + TypeScript CLI for session creation, health checks, validation, template installation, and adapter alignment.

The main risks are path drift, framework soup, aspirational validation, empty durable memory, and unbounded self-repair loops. The mitigation is roadmap order: define artifacts and ownership first, make gates mechanically checkable second, normalize runtime adapters third, and delay CLI, Promptfoo, Playwright, dashboards, MCP, or packaging until the protocol invariants are explicit.

## Stack Recommendation

The current repository is documentation-first: Markdown, JSON, YAML, TOML, Bash compatibility scripts, agent instruction files, Spec-Kit/Gemini scaffolding, `.ai/` durable artifacts, and GSD planning docs. There is no app runtime, package manifest, test runner, CI workflow, API layer, database schema, or deployment target. That is acceptable for the first milestone and should not be "fixed" prematurely.

Recommended sequencing:

- **Template/protocol MVP:** Markdown, JSON, YAML, TOML, and small Bash shims for canonical artifacts, routing docs, templates, and deterministic documentation checks.
- **Future CLI:** Node.js LTS + strict TypeScript + Commander.js, with Node built-ins for filesystem/path/process work and `node:test` initially.
- **Testing growth:** Add Vitest only after TypeScript test complexity warrants watch mode, coverage, or project grouping.
- **Validation growth:** Start with deterministic validators; add Promptfoo only as an optional rubric layer after file/path/state checks exist.
- **Defer:** React/Next.js dashboard, database, hosted backend, MCP server, Playwright, Bun/Deno, monorepo tooling, and custom agent frameworks.

## Table-Stakes Scope

The table-stakes product is a runtime-neutral protocol and artifact system, not a UI or another agent. Requirements should focus on making the workflow inspectable, resumable, and enforceable.

Must have:

- **Canonical artifact contract:** Define `.ai/specs/current/`, `.ai/sessions/<session-id>/`, `.ai/state/`, `.ai/memory/`, `.ai/reviews/`, `.planning/`, and Spec-Kit/Gemini ownership.
- **Runtime-neutral instructions:** Keep `CLAUDE.md`, `GEMINI.md`, future `AGENTS.md`, `.agents/skills/`, and `.ai/constitution.md` aligned to one shared contract.
- **Tool routing matrix:** Map task types to tools, required input artifacts, expected output artifacts, validators, and stop conditions.
- **Recon-before-plan workflow:** Require source/context inspection before planning or broad edits.
- **Spec generation and validation gate:** Orchestrate Spec-Kit/OpenSpec-style spec/plan/tasks artifacts and validate them before execution.
- **Failure classification and circuit breaker:** Track failure category and retry count; produce `NEEDS_HUMAN_REVIEW` after repeated unresolved failures.
- **QA, verification, and memory handoff:** Require evidence before ship and promote only durable facts into `.ai/memory/`.
- **Health/drift checks:** Detect missing files, stale references, path mismatches, placeholder memory, and missing validation reports.

Should have:

- Artifact authority resolver for `.ai/specs/`, `.gemini/.specify/`, future `.specify/`, docs, and memory.
- Human review packet generator with category, attempt count, evidence, changed files, options, and recommended decision.
- Multi-runtime template pack for Claude, Gemini, Codex/GSD, and future agents.
- Compatibility bridge for generated Spec-Kit/Gemini scaffolds without treating vendored internals as canonical policy.

Defer:

- Hosted UI/dashboard, full CLI polish, deep Promptfoo/LLM evaluation suite, automatic git operations, MCP server, database-backed state, and broad multi-runtime generation before the neutral contract is stable.

## Key Architecture Implications

The core architecture boundary is not frontend/backend. It is governance, active workflow state, runtime adapters, reusable templates/validators, and future CLI packaging.

Major components:

1. **Governance and product intent:** `docs/prd.md`, `.ai/constitution.md`, and future protocol docs define authority, rules, gate meanings, and product direction.
2. **Artifact contract:** `.ai/specs/current/`, `.ai/sessions/<session-id>/`, `.ai/state/`, `.ai/memory/`, and `.ai/reviews/` hold current work, validation state, evidence, durable memory, and review packets.
3. **Runtime adapter layer:** `CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/`, `.agents/skills/`, and future `AGENTS.md` adapt runtimes to the shared protocol.
4. **Validation layer:** Future `validators/` should check paths, schemas/headings, stale references, missing evidence, loop counts, and docs/runtime parity.
5. **CLI/product layer:** Future Node.js + TypeScript CLI should create sessions, copy templates, run validators, print next-step routing, and manage files only through documented artifact APIs.

Architecture rules for requirements and roadmap:

- Stabilize `.ai/specs/current/` or another single current-spec convention before automation.
- Keep `.planning/` as GSD planning context, not runtime state consumed by agents during execution.
- Treat `.gemini/.specify/` as adapter/generated scaffold unless explicitly classified otherwise.
- Make every pipeline phase name its input paths, output paths, validator, and failure route.
- Prefer deterministic validation before LLM-judged validation.

## Major Pitfalls

1. **Path drift becomes the real runtime:** Prevent by creating a canonical path registry and failing checks on stale or noncanonical references.
2. **Framework soup hides ownership:** Prevent by defining layer ownership and a routing matrix before adding integrations.
3. **Validation stays aspirational:** Prevent by building a minimal local health/validate command or script early, even if it only checks files, headings, references, memory, and reports.
4. **Self-repair loops become autonomous debate:** Prevent by storing failure categories and retry counts in `.ai/state/` and generating human review packets after repeated failures.
5. **Docs and runtime diverge:** Prevent by marking implementation status, checking docs/runtime parity, and not claiming enforcement until a command can fail.
6. **Memory handoff is present but empty:** Prevent by seeding `.ai/memory/` with current facts, decisions, risks, and verification history, then validating required structure.

## Roadmap Implications

### Phase 1: Artifact Contract and Status

**Rationale:** Every validator, template, adapter, and CLI command depends on stable paths and source-of-truth ownership.  
**Delivers:** Canonical artifact contract, path registry, implementation-status labels, current-spec convention, `.ai/state/` shape, scaffold ownership classification.  
**Addresses:** Canonical artifact contract, runtime-neutral protocol authority, path consistency.  
**Avoids:** Path drift, docs/runtime ambiguity, generated scaffold ownership confusion.

### Phase 2: Routing, Gates, and Memory Foundation

**Rationale:** Agents need operational routing and stop conditions before broad execution or automation.  
**Delivers:** Tool routing matrix, gate outcome definitions, failure taxonomy, retry rules, human review packet template, seeded `.ai/memory/` files.  
**Addresses:** Tool routing, recon-before-plan, validation semantics, memory handoff, circuit breaker.  
**Avoids:** Framework soup, empty durable memory, self-repair loops.

### Phase 3: Deterministic Validator and Drift Checks

**Rationale:** The protocol becomes credible only when key claims can fail mechanically.  
**Delivers:** Local validation checks for required files, stale references, noncanonical paths, required headings, placeholder memory, validation evidence, retry state, and unsafe broad git defaults.  
**Uses:** Current documentation/config stack; future-ready for TypeScript CLI but can start as simple scripts/checklists if needed.  
**Avoids:** Aspirational validation, security policy without enforcement, completion claims without evidence.

### Phase 4: Templates and Runtime Adapter Alignment

**Rationale:** Once invariants are stable and checkable, runtime-specific files can safely converge on the shared protocol.  
**Delivers:** Templates for recon, critique, spec, plan, tasks, validation, execution, QA, memory handoff, ship, and human review; aligned Claude/Gemini/Codex/GSD adapter instructions.  
**Addresses:** Runtime-neutral instructions, multi-runtime templates, Spec-Kit/Gemini compatibility bridge.  
**Avoids:** Runtime-specific guardrail gaps and adapter drift.

### Phase 5: CLI Packaging

**Rationale:** CLI automation should manage accepted artifacts, not invent the contract.  
**Delivers:** Node.js + TypeScript + Commander.js CLI for `init`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff`; tests using `node:test` initially.  
**Addresses:** Health command, repeatable validation, template installation, next-step routing.  
**Avoids:** CLI-before-contract lock-in.

### Phase 6: Examples, CI, and Optional Evaluation

**Rationale:** After local behavior is stable, examples and CI prove repeatability across fixture projects.  
**Delivers:** Greenfield/brownfield fixtures, CI for validators/docs/templates, optional Promptfoo rubric checks, later Playwright only if a browser target exists.  
**Addresses:** Regression confidence and packaging readiness.  
**Avoids:** Docs/runtime divergence after scripts exist.

### Research Flags

Needs deeper phase research:

- **Phase 3:** Validator implementation details, especially whether to start with Bash, Node scripts, or TypeScript depending on accepted Phase 1 contracts.
- **Phase 5:** CLI packaging details, package naming, command names, distribution approach, and cross-platform behavior.
- **Phase 6:** Promptfoo/LLM evaluation design if subjective spec quality gates become required.

Standard patterns, likely no extra research:

- **Phase 1:** Artifact inventory, path registry, status labels, and ownership docs are repo-local decisions.
- **Phase 2:** Routing matrix, failure taxonomy, review packet template, and memory seed can be derived from existing PRD, constitution, and research.
- **Phase 4:** Markdown templates and adapter alignment are standard once the canonical contract exists.

## Requirements Implications

Requirements should be written around enforceable protocol behavior rather than product polish. Each requirement should name the artifact path it creates or validates, the authority source it follows, the gate or command that proves completion, and the failure route when validation does not pass.

Recommended requirement groups:

- **Artifact contract requirements:** canonical paths, owners, lifecycle, aliases, and migration/compatibility rules.
- **Routing requirements:** tool selection matrix with inputs, outputs, validators, and stop conditions.
- **Validation requirements:** deterministic checks, allowed gate outcomes, validation report shape, and evidence requirements.
- **Failure loop requirements:** retry state, failure categories, `NEEDS_HUMAN_REVIEW`, and review packet generation.
- **Memory requirements:** durable memory schema, promotion rules, and validation that memory is non-empty and current.
- **Adapter requirements:** runtime-specific files must reference the shared constitution and artifact contract rather than redefining them.
- **Security/change-control requirements:** no broad staging by default, explicit destructive operation approval, and basic secret/path safety checks before automation.

Do not write requirements for dashboard UI, database, hosted service, MCP server, Playwright QA, or deep Promptfoo evaluation unless a later roadmap phase explicitly proves the local protocol and CLI need them.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Strong repo evidence supports protocol-first and Node.js + TypeScript later; exact CLI naming/package details remain undecided. |
| Features | HIGH | Table stakes and anti-features are directly grounded in `docs/prd.md`, `.ai/constitution.md`, `.planning/PROJECT.md`, and codebase concerns. |
| Architecture | HIGH | Current structure and target boundaries are clear; implementation details depend on later stack decisions. |
| Pitfalls | HIGH | Risks are repo-specific and repeatedly supported by PRD, constitution, and codebase map findings. |

**Overall confidence:** HIGH for roadmap direction; MEDIUM for later implementation choices that depend on Phase 1 decisions.

### Gaps to Address

- **Exact current-spec convention:** Decide whether `.ai/specs/current/` is canonical and how existing flat `.ai/specs/*.md` files migrate.
- **Spec-Kit/Gemini scaffold ownership:** Classify generated files as vendored, adapted, or owned before editing them as product logic.
- **CLI binary name:** Decide between PRD examples like `adp`, project-derived names like `snail-flow`, or another command name.
- **Validator implementation language:** Choose after Phase 1 clarifies whether early checks stay script-level or immediately become TypeScript.
- **External evaluation scope:** Decide later whether Promptfoo is necessary for subjective spec quality checks after deterministic validation exists.

## Sources

Primary project evidence:

- `.planning/PROJECT.md`
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/TESTING.md`
- `docs/prd.md`
- `.ai/constitution.md`

External references summarized by research files:

- Context7 Node.js documentation for package exports and `node --test`
- Context7 Commander.js documentation for CLI commands and options
- Context7 Vitest documentation for TypeScript testing, projects, and coverage
- Spec Kit official documentation and CLI/workflow references
- Promptfoo CLI/configuration/assertion documentation
- Playwright CLI documentation
- Claude Code hooks and Agent SDK documentation

---
*Research completed: 2026-05-24*  
*Ready for roadmap: yes*
