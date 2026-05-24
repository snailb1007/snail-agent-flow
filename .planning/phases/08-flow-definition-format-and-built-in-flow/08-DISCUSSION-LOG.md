# Phase 8: Flow Definition Format and Built-in Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 8-flow-definition-format-and-built-in-flow
**Areas discussed:** Flow Format selection, Schema Validation Approach, Tool Validation method, Flow Definition Structure, and Default Flow Location.

---

## Flow Format Selection

### Question 1: YAML vs. JSON for Flow Definitions
| Option | Description | Selected |
|--------|-------------|----------|
| JSON | Machine-readable, native to JS, zero parsing complexity. | |
| YAML | Human-readable, supports multi-line strings, allows comments, standard for pipeline definitions. | ✓ |

**Recommended choice:** YAML
**Selected:** YAML
**Notes:** YAML is much easier for developers to write, read, and maintain. Since custom flows are a requirement (FLOW-03), YAML is the preferred developer experience. A simple parser will be implemented in Node.js to read the subset of YAML needed for definitions, avoiding external dependencies.

---

## Schema Validation Approach

### Question 1: Schema validation implementation
| Option | Description | Selected |
|--------|-------------|----------|
| JSON Schema (Ajv) | Implement validation using AJV, requiring npm dependencies. | |
| Custom Schema Checker | Write a deterministic, zero-dependency validation function in pure JavaScript that checks key presence, types, and values. | ✓ |

**Recommended choice:** Custom Schema Checker
**Selected:** Custom Schema Checker
**Notes:** To maintain the zero-dependency design of the core CLI, a custom validation script is chosen. This aligns with our existing deterministic validator strategy.

---

## Tool Validation Method

### Question 1: How to verify tool availability
| Option | Description | Selected |
|--------|-------------|----------|
| Run CLI checks | Spawn command line checks (e.g., `gsd --version` or `adp status`) using child_process. | |
| File-based checks | Check for the presence of skill folders in `.agents/skills/`, `.claude/skills/`, or the user config folder. | ✓ |

**Recommended choice:** File-based checks (with fallback command checks)
**Selected:** File-based checks (with fallback command checks)
**Notes:** Spawning CLI processes is slow and prone to sandbox restrictions (e.g., in some LLM runtimes). Checking for skill folders in directories is faster and more reliable, but check commands can serve as a fallback for external tools.

---

## Flow Definition Structure

### Question 1: How to structure stages and revision routing
| Option | Description | Selected |
|--------|-------------|----------|
| Inline routing | Put routing rules inside the stage definitions under a `revision_routing` key. | ✓ |
| Global routing table | Define all routing rules in a separate section of the YAML file. | |

**Recommended choice:** Inline routing
**Selected:** Inline routing
**Notes:** Inline routing makes it clear when looking at a stage where it loops back to in case of failure or rejection.

---

## Default Flow Location

### Question 1: Where to store the built-in flow
| Option | Description | Selected |
|--------|-------------|----------|
| Under `.specify/templates/` | Keep it in the package templates folder so `adp init` can copy it. | ✓ |
| Bundled in CLI code | Hardcode the built-in flow inside JS files. | |

**Recommended choice:** Under `.specify/templates/`
**Selected:** Under `.specify/templates/`
**Notes:** Keeping it as a file under `.specify/templates/rough-project-flow.yaml` makes it customizable and editable in the repository without altering CLI code.

---

## Deferred Ideas

- Full JSON Schema specification and publication to SchemaStore (deferred to Phase 12 or post-v2.0).
