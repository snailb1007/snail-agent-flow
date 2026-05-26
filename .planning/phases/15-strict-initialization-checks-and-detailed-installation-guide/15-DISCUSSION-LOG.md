# Phase 15: Strict Initialization Checks and Detailed Installation Guides for Missing Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 15-strict-initialization-checks-and-detailed-installation-guide
**Areas discussed:** Init strictness, Check coverage, Installation guide shape, Skill localization failures

---

## Init Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict post-init gate | Create/merge artifacts safely, then fail nonzero if required setup is incomplete. | ✓ |
| Warn and continue | Always complete initialization even when required tools or localized files are missing. | |
| Hard fail before writing | Refuse to create artifacts until all tools are already installed. | |

**User's choice:** Use recommended defaults for all areas.
**Notes:** Recommended choice preserves brownfield-safe initialization while ensuring users do not proceed with a broken flow setup.

---

## Check Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Full local/offline setup surface | Validate flow YAML, ledger, prerequisites, local skill folders, localized refs, instruction sections, and active feature pointer where relevant. | ✓ |
| Missing tools only | Restrict strictness to prerequisite tool availability. | |
| Flow artifacts only | Validate flow YAML and ledger without checking skills or instructions. | |

**User's choice:** Use recommended defaults for all areas.
**Notes:** Recommended choice avoids a split-brain setup where `init` passes but agent loading or flow resolution fails immediately afterward.

---

## Installation Guide Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Layered terminal plus Markdown guide | Print concise failure output and generate detailed local repair instructions. | ✓ |
| Terminal only | Keep output short and do not write a durable repair guide. | |
| Markdown only | Write detailed guidance but keep terminal output minimal. | |

**User's choice:** Use recommended defaults for all areas.
**Notes:** Recommended choice gives users immediate terminal feedback and a durable artifact another agent or human can inspect later.

---

## Skill Localization Failures

| Option | Description | Selected |
|--------|-------------|----------|
| Fail closed with repair guidance | Treat missing localized workflow/reference files as required setup failures. | ✓ |
| Fall back to global refs | Keep home/global paths in local skills with warnings. | |
| Skip localization checks | Let later agent loading reveal missing files. | |

**User's choice:** Use recommended defaults for all areas.
**Notes:** Recommended choice directly addresses the sandbox-path failure class Phase 14 was designed to remove.

---

## the agent's Discretion

- Exact helper function names, generated repair guide path, output formatting, and tests can be chosen by the planner/executor as long as they preserve the decisions in `15-CONTEXT.md`.

## Deferred Ideas

- Automatic installation remains out of scope.
