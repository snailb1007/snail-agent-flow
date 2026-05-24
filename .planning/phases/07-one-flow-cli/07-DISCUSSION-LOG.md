# Phase 7: one-flow-cli - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 07-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 7-one-flow-cli
**Areas discussed:** Command Design & Routing, Kebab-Case & Kebab-Kebab, Description Text Sanitization, Overwrite Protection

---

## Command Design & Routing

### Question 1: CLI Entry Points
| Option | Description | Selected |
|--------|-------------|----------|
| `adp feature` only | Expose only the feature command; require manual `init` first. | |
| `adp feature` and `adp run` | Expose both commands; `run` acts as the zero-config initialization + scaffold command. | ✓ |

**Recommended choice:** `adp feature` and `adp run`
**Selected:** `adp feature` and `adp run`
**Notes:** Exposing both commands allows experienced users to quickly add a feature using `feature`, while `run` offers a one-command greenfield bootstrapping flow.

---

## Kebab-Case & Kebab-Kebab

### Question 1: Feature Slug Derivation
| Option | Description | Selected |
|--------|-------------|----------|
| Short name derivation from description | Filter out stop words (a, an, and, the, etc.) and construct a short 4-word kebab-case name with a 3-digit numeric prefix. | ✓ |
| Raw copy of description | Copy description directly into directory name. | |

**Recommended choice:** Short name derivation from description
**Selected:** Short name derivation from description
**Notes:** Clean, short numeric directory names prevent overly long folder paths and maintain consistent directory structure in `specs/`.

---

## Description Text Sanitization

### Question 1: Handling validator placeholder keywords in description
| Option | Description | Selected |
|--------|-------------|----------|
| Prevent using placeholder keywords | Reject feature descriptions containing TODO, FIXME, etc. | |
| Automatic sanitization | Sanitize keywords like `TODO`, `TBD`, `FIXME`, `XXX` inside description before writing them to generated markdown templates. | ✓ |

**Recommended choice:** Automatic sanitization
**Selected:** Automatic sanitization
**Notes:** Since our deterministic validator blocks files containing standard placeholders, automatically replacing them in CLI scaffolds guarantees the created feature passes validation on day zero.

---

## Overwrite Protection

### Question 1: Directory Conflict Resolution
| Option | Description | Selected |
|--------|-------------|----------|
| Exit non-zero on conflict | Exit CLI immediately with code 1 if the target feature slug directory already exists. | ✓ |
| Overwrite/Merge | Overwrite existing files or merge folders silently. | |

**Recommended choice:** Exit non-zero on conflict
**Selected:** Exit non-zero on conflict
**Notes:** Guarding against overwriting ensures that prior spec/plan files are never accidentally destroyed by running commands.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
