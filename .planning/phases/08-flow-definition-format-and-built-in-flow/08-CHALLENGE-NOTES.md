# Phase 8: Flow Definition Format and Built-in Flow — Challenge Notes

**Date:** 2026-05-25
**Phase:** 8-flow-definition-format-and-built-in-flow

We challenged the decisions from `08-CONTEXT.md` against the project's PRD, conventions, and runtime constraints:

---

## 1. Challenge: Zero-Dependency YAML Parsing in Node.js
- **Question:** How feasible is parsing YAML without dependencies? What if a user provides a complex custom YAML file with anchors, aliases, or complicated nested structures?
- **Analysis:** Our PRD states that we must avoid database/auth/hosting layers and keep the CLI light. Introducing `js-yaml` or `yaml` package adds dependency bloat and installation complexity for a minimal protocol tool. 
- **Feasibility/Resolution:** For the flow definitions, we only need to parse simple keys, values, and arrays with indentation. We will implement a lightweight, regex-based YAML parser that:
  - Splits by lines
  - Ignores comments (`# ...`)
  - Detects indentations (spaces) to construct basic objects and arrays
  - Parses key-value pairs (e.g. `key: value`) and list items (e.g. `  - item`)
  If a user uses highly advanced YAML features (like anchors/aliases), we will document this restriction as a known limitation. A validator will detect parsing failures and reject invalid custom flows.

---

## 2. Challenge: Prerequisite Tool Validation Reliability
- **Question:** How do we detect if tools like GSD, Superpowers, Spec-Kit, and GStack are available when the agent executes the flow? Runtimes vary: some run in sandboxed terminal environments where commands like `gsd` are not globally registered, but the skill files are present.
- **Analysis:** If we only check `command -v gsd-discuss-phase`, it might fail in runtimes where the agent resolves skills by reading folders instead of invoking binary commands.
- **Feasibility/Resolution:** We will use a dual-checking mechanism:
  - First, check for local or config skill directories under `.agents/skills/`, `.claude/skills/`, or the user's config directory (e.g. `~/.gemini/config/skills/`).
  - Second, fall back to checking if the CLI commands are in the system `PATH`.
  This guarantees compatibility across Cursor, Gemini, Claude Code, and GSD harnesses.

---

## 3. Challenge: Placeholders inside Artifact Paths
- **Question:** The stages declare required artifacts. How will the engine know what `{feature_slug}` resolves to when verifying files?
- **Analysis:** Different features have different slugs (e.g., `008-flow-definition-format-built`). The paths cannot be hardcoded in the built-in flow.
- **Feasibility/Resolution:** The artifact checking logic must support placeholder resolution:
  - `{feature_slug}` -> replaced with the active feature slug (from `.specify/feature.json`)
  - `{feature_dir}` -> replaced with the active feature directory path (e.g., `specs/008-flow-definition-format-built`)
  - `{phase_id}` -> replaced with the two-digit phase prefix (e.g., `08`)
  This will be formally declared in the schema documentation and supported in the engine's gate verification logic.

---

## 4. Challenge: Revision Routing Loops
- **Question:** What happens if there's a circular revision route that causes an infinite loop of resetting stage statuses?
- **Analysis:** If stage A routes to stage B, and stage B routes to stage A under failure conditions, the ledger could loop indefinitely if there's no limit or human intervention.
- **Feasibility/Resolution:** We must enforce a circuit breaker. If any stage is reset due to revision routing, we increment a failure/retry count in the ledger state. After a configurable limit (default: 3), the flow halts and generates a `NEEDS_HUMAN_REVIEW` packet.

---

## Conclusion
Decisions in `08-CONTEXT.md` are viable and match PRD constraints. No blocking contradictions were found. We are ready to proceed to Stage 3 (Canonical spec).
