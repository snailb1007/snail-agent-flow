# Phase 12: Prerequisite Tool Checker and Installation Guide - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 12-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 12-prerequisite-tool-checker-and-installation-guide
**Areas discussed:** Command extension, Tool verification integration, Platform-specific instructions, Warning format.

---

## Command Extension

### Question 1: How should the standalone prerequisite tool checker be exposed to the user?
| Option | Description | Selected |
|--------|-------------|----------|
| Extend `adp doctor` | Modify the existing `adp doctor` CLI command to load the flow definition and validate the prerequisite tools. | ✓ |
| Add `adp check-prerequisites` | Add a new standalone CLI command dedicated to checking tool prerequisites. | |
| Standalone validation script | Create a separate validation script (e.g. `node validators/scripts/check-tools.js`) to be run manually. | |

**Recommended choice:** Extend `adp doctor`
**Selected:** Extend `adp doctor`
**Notes:** Extending `adp doctor` is clean, intuitive, and preserves command footprint. `adp doctor` already runs static sanity checks; verifying prerequisite tools required to successfully run the flow is a perfect semantic fit.

---

## Tool Verification Integration

### Question 1: How and when should tool verification be triggered in the flow engine?
| Option | Description | Selected |
|--------|-------------|----------|
| On every flow engine mention / next stage resolution | The `project-flow` skill (SKILL.md / engine helper) automatically verifies prerequisites for the next stage and warns/halts if they are missing. | ✓ |
| Only on flow start | Prerequisite verification is run once when the flow is initialized or when the first stage is started. | |
| User-triggered only | Rely entirely on `adp doctor` to warn the user, keeping the flow engine skill free of environmental checks. | |

**Recommended choice:** On every next stage resolution
**Selected:** On every next stage resolution
**Notes:** Verifying tools before proposing the next stage is extremely robust. Since the flow engine skill instructs the agent which skill/command to run next, it should verify the tool for that specific stage is available before telling the agent to run it. If missing, it halts and warns the user with installation instructions.

---

## Platform-Specific Installation Instructions

### Question 1: How should platform-specific setup and installation instructions be mapped?
| Option | Description | Selected |
|--------|-------------|----------|
| Inline hardcoded instructions in a helper module | Maintain a dictionary mapping tool names to detailed brew/npm/git installation steps in a Javascript module. | ✓ |
| Flow definition metadata | Add an `instructions` field to each tool entry in the `prerequisites` block of the YAML definition. | |
| Dynamic online lookup | Perform a web search or API call to fetch current installation instructions. | |

**Recommended choice:** Inline hardcoded instructions in a helper module
**Selected:** Inline hardcoded instructions in a helper module
**Notes:** Maintaining a structured helper dictionary of installation guides in JS is simple, highly portable, and reliable. Since the prerequisites (GSD, Superpowers, Spec-Kit, GStack) are known, we can provide precise platform-specific (macOS, npm) instructions directly.

---

## Warning/Halt Formatting

### Question 1: How should warnings be presented to the user/agent when prerequisites are missing?
| Option | Description | Selected |
|--------|-------------|----------|
| Warning Block in structured output | Prepend a prominent `⚠️ PREREQUISITE WARNING` block in the flow engine's output showing missing tools and setup instructions. | ✓ |
| Throw command-line error | Crash/throw process errors in the helper library. | |
| Soft warning only | Mention missing tools in the stage description without blocking advancement. | |

**Recommended choice:** Warning Block in structured output
**Selected:** Warning Block in structured output
**Notes:** A prominent, structured warning block ensures both the user and the agent immediately see that a tool is missing and how to install it. Halting/blocking stage execution prevents agents from attempting to run missing commands, which would inevitably fail and waste tokens.

---

## Deferred Ideas

- Auto-installation script (`adp install-tools`): Out of scope because environment configuration is highly user-dependent.
- Global JSON config for custom tool instructions: Defer to a future milestone if custom flows become highly popular.
