# Feature Landscape

**Domain:** Local AI coding workflow orchestration protocol / spec-to-ship agent pipeline  
**Project:** Snail Agent Flow  
**Researched:** 2026-05-24  
**Research focus:** Features dimension only  
**Overall confidence:** HIGH for project-specific features, MEDIUM for ecosystem positioning

## Summary

Snail Agent Flow should not compete as another coding agent, IDE, hosted agent platform, or Spec-Kit replacement. Its feature surface should be a local, file-based operating protocol that tells agents which tool runs next, which artifact is authoritative, what gate must pass, and when autonomous work must stop.

The repo evidence points to a documentation-first product that already has the desired pipeline shape but lacks enforceable contracts and automation. Table stakes are therefore not "build an app UI" or "add more agents"; they are canonical artifact layout, routing rules, validation gates, memory handoff, human review packets, and drift checks. Differentiation comes from making those gates runtime-neutral across Claude, Gemini, Codex/GSD, Superpowers, GStack, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, and Playwright.

## Table Stakes

Features users expect. Missing means the protocol feels incomplete or unsafe.

| Feature | Why Expected | Complexity | Project Evidence | Notes |
|---------|--------------|------------|------------------|-------|
| Canonical artifact contract | A protocol must define where specs, plans, tasks, reports, state, reviews, and memory live. | Medium | `.planning/PROJECT.md` active requirement to define canonical artifact contract; `docs/prd.md` section 4; `.ai/constitution.md` artifact contract; `.planning/codebase/CONCERNS.md` "Artifact layout mismatch" | First feature to stabilize. Current `.ai/specs/` flat files conflict with documented `.ai/specs/current/` paths. |
| Runtime-neutral agent instructions | The project coordinates multiple runtimes; users should not have to infer Claude/Gemini/Codex behavior separately. | Medium | `.planning/PROJECT.md` runtime neutrality constraint; `.ai/constitution.md` authority order; `.planning/codebase/CONCERNS.md` "Claude-only gstack guard does not cover all runtimes" | Keep `CLAUDE.md`, `GEMINI.md`, future `AGENTS.md`, and `.ai/constitution.md` aligned through generated templates or checks. |
| Tool routing matrix | The core value is knowing which tool runs next. | Low | `docs/prd.md` "Tool Routing Rules"; `.planning/PROJECT.md` core value; `.planning/codebase/CONCERNS.md` "Tool dependency breadth" | Must be short and prescriptive: unknown code location -> Semble, known symbol -> Serena, impact -> GitNexus, docs -> Context7, QA -> Playwright/GStack QA. |
| Recon-before-plan workflow | Existing-project work needs source-of-truth inspection before specs or edits. | Medium | `docs/prd.md` Step 1; `.ai/constitution.md` "Recon before planning for existing projects"; `.planning/PROJECT.md` documentation-first constraint | MVP can be template/checklist driven before automation exists. |
| Spec generation handoff | Users expect a structured spec/plan/tasks flow before broad execution. | Medium | `docs/prd.md` Step 3; `.ai/constitution.md` "Spec before broad implementation"; `.gemini/commands/` in `.planning/codebase/STRUCTURE.md` | Snail should orchestrate Spec-Kit/OpenSpec, not fork it. |
| Spec validation gate | The protocol is not credible unless specs can fail before execution. | High | `docs/prd.md` Step 3.5; `.ai/constitution.md` gate outcomes; `.planning/codebase/CONCERNS.md` "No executable validator" | Start with markdown/rule validator, then add Promptfoo or LLM-as-judge checks with fixed rubrics. |
| Failure classification loop | Agents need explicit handling for local implementation failures vs spec-level failures. | Medium | `docs/prd.md` Step 4.5; `.ai/constitution.md` failure rules | Prevents agents from patching around bad requirements. |
| Human review circuit breaker | Autonomous retries must stop after repeated validation failures or safety ambiguity. | Medium | `docs/prd.md` section 6; `.ai/constitution.md` `NEEDS_HUMAN_REVIEW`; `.planning/PROJECT.md` no infinite self-repair constraint | Needs state file with retry counts and review packet generation. |
| QA and verification report | Ship requires evidence, not a chat claim. | Medium | `docs/prd.md` Step 5 and Step 6; `.ai/constitution.md` "Verify before claiming completion"; `.planning/codebase/CONCERNS.md` "No automated tests detected" | Support build/test/lint/typecheck/manual logs even before runtime automation exists. |
| Memory handoff | Future agents need durable project facts, decisions, risks, and verification history. | Medium | `docs/prd.md` Step 5.5; `.ai/constitution.md` memory artifacts; `.planning/codebase/CONCERNS.md` "Durable memory files are placeholders" | MVP should seed and validate `.ai/memory/*` rather than leave placeholders. |
| Health check command or checklist | Users need a fast way to detect missing files, stale paths, and broken workflow state. | Medium | `.planning/codebase/CONCERNS.md` "No health check command"; `docs/prd.md` proposed health checks | Can begin as `snail doctor` later; first phase can be a docs-backed checklist. |
| Documentation consistency checks | A docs-first repo fails if path references drift. | Medium | `.planning/codebase/CONCERNS.md` deleted blueprint path, path mismatches, no doc consistency checks | Check references to `docs/prd.md`, `.ai/constitution.md`, `.ai/specs/current/*`, `.gemini/.specify/*`, and legacy `ai-delivery-pipeline-blueprint.md`. |
| Safe git/change handling | Local workflow tooling must avoid broad staging, destructive operations, or secret leakage. | Medium | `.ai/constitution.md` destructive operation rule; `.planning/codebase/CONCERNS.md` git automation stages all changes; `.gitignore` summary in `.planning/codebase/STRUCTURE.md` | Prefer explicit path staging and visible permission gates. |

## Differentiators

Features that make Snail Agent Flow more valuable than a plain prompt pack or generated Spec-Kit scaffold.

| Feature | Value Proposition | Complexity | Project Evidence | Notes |
|---------|-------------------|------------|------------------|-------|
| Cross-tool orchestration contract | Gives each tool a narrow role and prevents framework soup. | Medium | `docs/prd.md` core idea and routing rules; `.ai/constitution.md` "Use tools for their strongest role"; `.planning/PROJECT.md` out-of-scope replacement rule | This is the product's sharpest positioning: coordinate, do not replace. |
| Brownfield-first mode | Most agent failures happen when existing behavior, source-of-truth code, or path ownership is skipped. | High | `.planning/PROJECT.md` brownfield documentation-first context; `.ai/constitution.md` no blind rewrite; `.planning/codebase/CONCERNS.md` fragile instruction layering | Differentiate from greenfield-only spec templates by requiring recon and impact analysis before broad work. |
| Artifact authority resolver | Resolves conflicts between `.ai/specs/`, `.gemini/.specify/`, future `.specify/`, docs, memory, and runtime instructions. | High | `.planning/PROJECT.md` path consistency constraint; `.planning/codebase/CONCERNS.md` artifact layout mismatch and Spec-Kit config path mismatch | This should become a concrete validator/doctor capability, not just prose. |
| Loop-state and retry accounting | Tracks validation failures by category and stops after repeated failures. | Medium | `docs/prd.md` Step 3.5 and section 6; `.ai/constitution.md` no infinite self-repair | Many workflows say "human in the loop"; Snail should make the loop state explicit in `.ai/state/spec-validation-state.json`. |
| Human review packet generator | Converts blocked autonomous work into an actionable packet with failed rule, attempts, evidence, and decision options. | Medium | `docs/prd.md` section 6 and example packet; `.ai/reviews/` in `.planning/codebase/STRUCTURE.md` | This is a strong differentiator because it turns "agent got stuck" into a resumable review artifact. |
| Memory promotion rules | Separates temporary session logs from durable project memory. | Medium | `docs/prd.md` memory handoff rules; `.ai/constitution.md` "Update memory or state only with durable decisions"; `.planning/codebase/CONCERNS.md` placeholder memory files | Avoids polluted memory and stale chat summaries. |
| Multi-runtime template pack | Generates or validates consistent instruction files for Claude, Gemini, Codex/GSD, and future runtimes. | High | `CLAUDE.md`/`GEMINI.md` described in `.planning/codebase/STRUCTURE.md`; `.planning/PROJECT.md` runtime neutrality | Useful only if backed by consistency checks; otherwise it becomes more files to drift. |
| Protocol health dashboard in files | A local status artifact showing current phase, gate status, validation state, memory status, stale references, and next action. | Medium | `.ai/state/current-session.json` proposed in `docs/prd.md`; `.planning/PROJECT.md` core value "what should run next" | Can start as Markdown/JSON output before UI or CLI polish. |
| Failure taxonomy library | Standard categories for validation, spec, execution, QA, security, data loss, path drift, and memory conflicts. | Medium | `docs/prd.md` failure feedback loop; `.ai/constitution.md` failure rules | Makes validation and review packets consistent across agents. |
| Compatibility bridge for generated scaffolds | Treats `.gemini/.specify/` as vendored/generated and overlays project-specific Snail rules without hand-editing generated internals. | Medium | `.planning/codebase/CONCERNS.md` "Generated integration files are committed as project logic"; `.planning/codebase/STRUCTURE.md` `.gemini/.specify/` purpose | Important for long-term maintainability when Spec-Kit updates. |

## Anti-Features

Features to explicitly not build, because they dilute the project or conflict with repo constraints.

| Anti-Feature | Why Avoid | What to Do Instead | Evidence |
|--------------|-----------|-------------------|----------|
| Full IDE or hosted agent platform | Out of scope and too broad for a local protocol repo. | Stay file-based and local; integrate with existing agents. | `.planning/PROJECT.md` out of scope |
| Replacing GSD, GStack, Superpowers, Spec-Kit, OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright | The stated value is orchestration, not reimplementation. | Define contracts, templates, routing, and validation around those tools. | `docs/prd.md` core idea; `.planning/PROJECT.md` out of scope |
| One runtime as the only source of truth | Claude-only or Gemini-only behavior would break runtime neutrality. | Maintain a runtime-neutral constitution and generate runtime adapters. | `.planning/PROJECT.md` runtime neutrality; `.planning/codebase/CONCERNS.md` Claude-only guard risk |
| Auto-commit or `git add .` as a default feature | Risks staging unrelated edits or secrets in dirty worktrees. | Use explicit path staging and visible ship reports. | `.planning/codebase/CONCERNS.md` git automation risk |
| Infinite auto-repair | Creates agent debate loops and hides unresolved spec failures. | Track retry counts and stop with `NEEDS_HUMAN_REVIEW`. | `docs/prd.md` section 6; `.ai/constitution.md` failure rules |
| Broad scaffolding before artifact paths are settled | Would bake in current `.ai/specs/` vs `.ai/specs/current/` drift. | Resolve artifact contract first. | `.planning/codebase/CONCERNS.md` artifact layout mismatch |
| Product UI before CLI/templates/validators | A UI cannot enforce the protocol until the underlying contracts exist. | Build file contracts, doctor checks, validators, and reports first. | `.planning/PROJECT.md` no app runtime; `.planning/codebase/ARCHITECTURE.md` not implemented runtime |
| Secret-scanning theater without enforceable scope | Policy-only security claims are already a risk. | Add concrete security checklist/validator before claiming enforcement. | `.planning/codebase/CONCERNS.md` security baseline is policy-only |
| Memory dumping entire session logs | Pollutes durable memory with speculation and temporary details. | Promote only verified, durable facts with dates and affected files. | `docs/prd.md` memory handoff rules; `.ai/constitution.md` engineering principles |
| Hand-editing vendored Spec-Kit internals as product logic | Creates upgrade drift and noisy diffs. | Document ownership and use overlays/adapters/presets where possible. | `.planning/codebase/CONCERNS.md` generated integration files |

## Feature Dependencies

```text
Canonical artifact contract -> Documentation consistency checks
Canonical artifact contract -> Health check command/checklist
Canonical artifact contract -> Spec validation gate
Canonical artifact contract -> Memory handoff validation

Runtime-neutral instructions -> Multi-runtime template pack
Runtime-neutral instructions -> Instruction consistency checks

Tool routing matrix -> Recon-before-plan workflow
Recon-before-plan workflow -> Spec generation handoff
Spec generation handoff -> Spec validation gate
Spec validation gate -> Failure classification loop
Spec validation gate -> Loop-state and retry accounting
Loop-state and retry accounting -> Human review packet generator

QA and verification report -> Ship report
Memory handoff -> Ship report

Generated scaffold ownership decision -> Compatibility bridge for Spec-Kit/Gemini scaffolds
```

## MVP Recommendation

Prioritize:

1. **Canonical artifact contract and path migration decision** - unblock every other phase by choosing `.ai/specs/current/` vs flat `.ai/specs/` and reconciling `docs/prd.md`, `.ai/constitution.md`, and `.gemini/.specify/` expectations.
2. **Tool routing and gate templates** - give agents the exact next-step protocol for recon, critique, spec, validation, execution, QA, memory, and ship.
3. **Health/checklist validator** - detect missing artifacts, stale references, placeholder memory, missing validation reports, and repeated self-repair state before adding a full CLI.
4. **Memory seed and handoff rules** - make future recon useful by replacing placeholder durable memory with verified current facts.
5. **Human review packet template** - enforce the circuit breaker early, even before automated validators are sophisticated.

Defer:

- **Runtime CLI polish:** Useful later, but premature until file contracts and validators are stable.
- **Hosted UI/dashboard:** Out of scope for the local protocol milestone.
- **Deep Promptfoo/LLM-as-judge evaluation suite:** Valuable after deterministic artifact checks exist.
- **Full multi-runtime generation:** Wait until the canonical neutral contract is settled, then generate adapters.
- **Automatic git operations:** Keep manual or explicit until validation, ignore rules, and path ownership are reliable.

## Roadmap Implications

Suggested feature phase structure:

1. **Artifact Contract Foundation** - define canonical `.ai/`, `.planning/`, `.gemini/.specify/`, and future `.specify/` ownership; resolve deleted/stale blueprint references.
2. **Protocol Templates and Routing** - create concise templates for recon, critique, spec, validation, execution, QA, memory handoff, ship, and human review.
3. **Doctor and Drift Checks** - add checks for required files, placeholder memory, broken references, path mismatches, and missing validation state.
4. **Validation and Circuit Breaker** - implement PASS/FAIL/NEEDS_HUMAN_REVIEW with retry counts and review packet creation.
5. **Runtime Adapter Layer** - align Claude/Gemini/Codex/GSD instructions with the neutral contract.
6. **CLI Packaging** - add commands only after the protocol is stable enough to automate.

## Ecosystem Notes

- GitHub Spec Kit documentation positions Spec Kit around spec-driven development, agent integrations, workflows, presets, and workflow state files. That supports using Spec-Kit as an orchestrated dependency rather than reimplementing its specify/plan/tasks lifecycle.
- Current Claude Code documentation emphasizes project instructions, settings, hooks, permissions, and lifecycle automation. That supports treating runtime-specific files and hooks as adapters under a neutral Snail contract.
- Recent SDD and agent workflow writing repeatedly emphasizes context-grounding, human checkpoints, validation hooks, and state persistence. This aligns with Snail's brownfield-first recon, validation, memory handoff, and human review packet features.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes | HIGH | Directly grounded in `docs/prd.md`, `.ai/constitution.md`, `.planning/PROJECT.md`, and codebase concerns. |
| Differentiators | HIGH | Derived from the project's explicit orchestration-not-replacement positioning and current drift risks. |
| Anti-features | HIGH | Most are named as out of scope or risks in project artifacts. |
| Ecosystem positioning | MEDIUM | Verified against current Spec Kit docs via Context7 and web search, but the feature recommendations intentionally prioritize local repo evidence. |

## Sources

Project evidence:

- `.planning/PROJECT.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `docs/prd.md`
- `.ai/constitution.md`

External ecosystem checks:

- Context7: `/github/spec-kit`, query on Spec Kit workflows, integrations, presets, hooks, and state files.
- GitHub Spec Kit docs: https://github.github.com/spec-kit/index.html
- Spec Kit workflows docs: https://github.github.com/spec-kit/reference/workflows.html
- Claude Code hooks guide: https://code.claude.com/docs/en/hooks-guide
- Claude Code Agent SDK features: https://code.claude.com/docs/en/agent-sdk/claude-code-features
