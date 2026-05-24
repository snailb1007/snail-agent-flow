# Phase 5: cli-packaging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 05-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 5-cli-packaging
**Areas discussed:** CLI Implementation Strategy, CLI Command Name & Aliases, Dependency Choice, Integration with Existing Validator, Command Behaviors (init, new-session, status, doctor, validate-spec, handoff)

---

## CLI Implementation Strategy

### Question 1: CLI Language & Packaging
| Option | Description | Selected |
|--------|-------------|----------|
| Compiled TypeScript Binary | Compile TypeScript CLI into a single-file executable using a packager (like pkg). | |
| Node.js Executable Script | A standard Node.js executable script (with `#!/usr/bin/env node`) under `bin/adp.js` that run-state parses. | ✓ |

**Recommended choice:** Node.js Executable Script
**Selected:** Node.js Executable Script
**Notes:** Pure Node.js runs natively on any machine with Node installed. It avoids compilation/transpilation overhead and extra build steps, keeping development fast and portable.

---

## CLI Command Name & Aliases

### Question 1: CLI Executable Name
| Option | Description | Selected |
|--------|-------------|----------|
| `adp` only | Register the CLI command name strictly as `adp` (representing AI Delivery Pipeline). | |
| `adp` and `saf` | Register both `adp` and `saf` (for Snail Agent Flow) in package.json. | ✓ |

**Recommended choice:** `adp` and `saf`
**Selected:** `adp` and `saf`
**Notes:** Registering both commands in package.json provides maximum user convenience (allowing the short, fast `saf` or the PRD-standard `adp`).

---

## Dependency Choice

### Question 1: Third-Party Packages vs Vanilla Node.js
| Option | Description | Selected |
|--------|-------------|----------|
| CLI Framework (e.g. commander, chalk) | Use external packages for option parsing, coloring, and execution flow. | |
| Vanilla Node.js | Write CLI commands using native Node.js libraries (`fs`, `path`, `child_process`) and parse args manually. | ✓ |

**Recommended choice:** Vanilla Node.js
**Selected:** Vanilla Node.js
**Notes:** Vanilla Node.js requires zero npm install step, runs instantly with no dependency bloat, and makes testing robust and easy to integrate in any environment.

---

## Integration with Existing Validator

### Question 1: Validator Execution
| Option | Description | Selected |
|--------|-------------|----------|
| Subprocess Execution | Run `validators/scripts/validate-spec.js` using `child_process.fork` or `exec`. | ✓ |
| Code Import | Refactor validator to export functions and import them directly. | |

**Recommended choice:** Subprocess Execution
**Selected:** Subprocess Execution
**Notes:** Running the validator script as a subprocess ensures we preserve the identical environment, exit-code contract, and runtime isolation. It keeps the validator script as the authoritative gatekeeper.

---

## Command Behaviors

### Question 1: `adp init` Overwrite Policy
| Option | Description | Selected |
|--------|-------------|----------|
| Silent Overwrite | Overwrite any existing files with template files. | |
| Safe Creation | Only create missing files and folders; skip existing ones and log a warning. | ✓ |

**Recommended choice:** Safe Creation
**Selected:** Safe Creation
**Notes:** Safe creation prevents destroying existing configuration files (like custom rules or constitutions) while ensuring missing directories and boilerplate files are initialized.

### Question 2: `adp status` Output Format
| Option | Description | Selected |
|--------|-------------|----------|
| Compact / Machine Readable | Output minimal JSON/key-value logs. | |
| Human Friendly | Output a clean, colored status matrix showing active feature, phase progress, and gate status. | ✓ |

**Recommended choice:** Human Friendly
**Selected:** Human Friendly
**Notes:** A formatted, visually structured output helps developers immediately see which gate is active, the retry status, and what should be run next.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
