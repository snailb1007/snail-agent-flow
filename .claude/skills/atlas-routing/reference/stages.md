# ATLAS Loop Stages Reference

This document maps each of the 5 stages of the ATLAS Loop to their respective objectives, actions, and verification gates.

| Stage ID | Stage Name | Objective | Key Actions | Assigned Gate(s) / Validators |
|---|---|---|---|---|
| **align** | Align | Establishes feature scope, scores risk, and claims work unit. | - Score task risk using `profile-scorer`.<br>- Acquire work unit claim via `claim-manager`. | - `align-gate` (Judgment: skipped if profile is `FAST`) |
| **trace** | Trace | Performs codebase recon and designs implementation plan. | - Codebase recon via search symbols/references.<br>- Write specification and tasks checklist. | - `trace-review` (Judgment)<br>- Spec Validation (`validate-spec.js`) |
| **lay** | Lay | Prepares test environment and locks targets. | - Set up tests and reproduction steps (TDD).<br>- Acquire advisory file leases. | - `lay-preflight` (Verification: skipped for `DOCS` mode) |
| **act** | Act | Performs file edits and verifies local requirements. | - Modify files incrementally.<br>- Verify acceptance criteria per task.<br>- Commit atomically. | - `act-evaluator` (Verification: skipped for `DOCS` mode) |
| **settle** | Settle | Cleans environment and updates project memory. | - Release claims and advisory leases.<br>- Compile retrospective summary.<br>- Log execution metrics.<br>- Promote memory. | - `settle` (Verification: S2 PR check step skipped if profile is `FAST`) |

---

## Stage Descriptions

### 1. Align
Before writing any code or plans, the agent must define the scope. The risk scorer analyzes the task parameters to assign a risk profile (`FAST`, `STANDARD`, `FULL`). The `claim-manager` registers task ownership, blocking concurrent execution on the same task.

### 2. Trace
The agent performs reconnaissance on the codebase using symbol analysis, searches, and impact graph tools. A concise implementation spec and task checklist are drafted. Formal validation checks verify that the spec conforms to the required schema.

### 3. Lay
Under Test-Driven Development (TDD), the agent creates the test cases and preflight verifications first. File leases are acquired for any source code files targeted for modification, locking them advisory-style.

### 4. Act
The core implementation phase. The agent edits files to satisfy the acceptance criteria. After each task, verifications are run. All changes are committed atomically with clean git commit messages.

### 5. Settle
Once all implementation tasks are finished, the agent runs final validation checks. All acquired locks (claims and leases) are released. Metrics (attempts, duration) are logged, and a persistent memory summary is compiled.
