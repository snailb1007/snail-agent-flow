# Phase 1: artifact-contract-status-and-minimal-golden-path - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish one canonical artifact contract, path ownership model, status registry, current-spec convention, and a runnable minimal golden path smoke test.
</domain>

<decisions>
## Implementation Decisions

### Path Reconciliation
- **D-01:** **Spec-Kit Unified Root:** Move Spec-Kit configurations, templates, and scripts from `.gemini/.specify/*` to `.specify/*` so that all Spec-Kit configuration and feature specs share a single root.
- **D-02:** **Gemini Command TOMLs:** Keep Gemini-specific command TOMLs under `.gemini/commands/` as tool-specific wrappers, keeping the `.specify/` directory runtime-neutral.
- **D-03:** **Legacy Spec Paths:** Completely deprecate and remove `.ai/specs/current/` and enforce `.specify/specs/<feature-slug>/` as the sole spec location.
- **D-04:** **Script Locations:** Keep Spec-Kit scripts nested in `.specify/scripts/` and Claude hooks nested in `.claude/hooks/` to maintain tool context and isolation.

### the agent's Discretion
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specifications and Plans
- [docs/prd.md](file:///Volumes/D/snail-agent-flow/docs/prd.md) — Product requirements and recommended pipeline architecture.
- [.planning/ROADMAP.md](file:///Volumes/D/snail-agent-flow/.planning/ROADMAP.md) — The 6-phase project implementation roadmap.
- [.planning/REQUIREMENTS.md](file:///Volumes/D/snail-agent-flow/.planning/REQUIREMENTS.md) — Mapping of requirements to phases.

### Core Orchestration Policy
- [.ai/constitution.md](file:///Volumes/D/snail-agent-flow/.ai/constitution.md) — The repository-level operating constitution and failure-mode policies.
- [CONTEXT.md](file:///Volumes/D/snail-agent-flow/CONTEXT.md) — Defining terms and naming boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [gsd-tools.cjs](file:///Volumes/D/snail-agent-flow/get-shit-done/bin/gsd-tools.cjs) — GSD helper SDK.
- [check-gstack.sh](file:///Volumes/D/snail-agent-flow/.claude/hooks/check-gstack.sh) — Claude hook scripts.
- [.gemini/.specify/scripts/bash/](file:///Volumes/D/snail-agent-flow/.gemini/.specify/scripts/bash/) — Spec-Kit runner scripts.

### Established Patterns
- **Durable Codebase Maps:** Mappings stored in [.planning/codebase/](file:///Volumes/D/snail-agent-flow/.planning/codebase/).
- **Durable AI Memory:** Session notes, reviews, and architecture facts stored in [.ai/](file:///Volumes/D/snail-agent-flow/.ai/).

### Integration Points
- **Spec-Kit Workflows:** Relocating `.gemini/.specify/` to `.specify/` will be the new entry point for spec-driven workflows.
- **Tool Routing:** Standardizing symbols lookup via Serena, and libraries via Context7.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 1-artifact-contract-status-and-minimal-golden-path*
*Context gathered: 2026-05-24*
