# Phase 14: Improve AI for Spawn Subagent Support - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 14-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 14-improve-ai-for-spawn-subagent-support
**Areas discussed:** Localization scope, target directories, subagent guidelines format, test verification.

---

## Localization Scope

### Question 1: How should GSD skills and their referenced files be localized to the workspace?
| Option | Description | Selected |
|--------|-------------|----------|
| Static pre-defined list | Only copy and localize files for a pre-defined list of skills (e.g. `gsd-execute-phase` and `gsd-explore`). | |
| Explicit JS Registry | Maintain a registry of known `gsd-*` skills in the CLI code. | |
| Dynamic Discovery & Rewrite | Scan `~/.gemini/config/skills/`, detect GSD skills, parse their `<execution_context>` blocks, and copy/rewrite all referenced files. | ✓ |

**Recommended choice:** Dynamic Discovery & Rewrite
**Selected:** Dynamic Discovery & Rewrite (Option 3)
**Notes:** Dynamic discovery is highly resilient. It ensures that if new skills are added or global workflows are renamed/updated, the CLI handles them without requiring package updates.

---

## Target Directories

### Question 1: Which directories should localized skills be written to?
| Option | Description | Selected |
|--------|-------------|----------|
| `.agents/skills/` only | Write only to the default Gemini Agent skill directory. | |
| `.claude/skills/` only | Write only to the Claude Code skill directory. | |
| Both directories | Write to both `.agents/skills/` and `.claude/skills/` to support both runtimes. | ✓ |

**Recommended choice:** Both directories
**Selected:** Both directories
**Notes:** Providing parity across runtimes is a core pipeline design goal. Since users may run the flow via Claude Code or Gemini Agent, both skill directories must be populated with local relative-path stubs.

---

## Subagent Guidelines Format

### Question 1: How should parallel execution guidelines be delivered to the agent?
| Option | Description | Selected |
|--------|-------------|----------|
| Append to instruction files | Append `## Subagent & Parallel Execution Guidelines` to the end of `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`. | ✓ |
| System prompt template | Inject the guidelines dynamically into the flow engine's proposed instruction blocks. | |
| Interactive user prompt | Remind the user in chat output to tell the agent to spawn subagents. | |

**Recommended choice:** Append to instruction files
**Selected:** Append to instruction files
**Notes:** Appending instructions to `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` is the most direct and reliable way to load instructions into the agent's system prompt at startup.

---

## Test Verification

### Question 1: How should this dynamic behavior be validated in the test suite?
| Option | Description | Selected |
|--------|-------------|----------|
| Simulated global directory | Create a mock home directory structure inside the sandbox with mock skill files, run `init`, and verify localization. | ✓ |
| Manual validation only | Rely on manual checking on local development environments. | |
| Mock FS calls | Use a mocking library to spy on fs read/write calls. | |

**Recommended choice:** Simulated global directory
**Selected:** Simulated global directory
**Notes:** Simulating the directories inside the test sandbox allows `test-cli.js` to run in a clean, isolated environment in CI. It verifies the copy and rewrite code paths end-to-end without touching the developer's actual home directory.

---

## Deferred Ideas

- **Auto-installation of missing skills**: Out of scope since installing global skills depends on user settings and network access. We focus strictly on localizing existing global skills.
- **Dynamic context generation on-the-fly**: Out of scope since it requires running a server or daemon to intercept tool calls. File-based static localization during `init` is simple and fits the current architecture.
