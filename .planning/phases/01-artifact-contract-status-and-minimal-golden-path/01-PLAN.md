# Phase 1: Artifact Contract, Status, and Minimal Golden Path - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a unified artifact contract, resolve path ownership between Spec-Kit and orchestration state, deprecate legacy paths, and implement an executable smoke test showing a minimal golden path that validates gates and memory.

**Architecture:** We will move Spec-Kit configurations from `.specify/*` to a unified root at `.specify/*`, keeping tool-specific commands in `.gemini/commands/`. We will document all directory ownerships in `docs/artifact-registry.md` and define an active feature state in `.ai/state/active-feature.json`. Finally, we will write a smoke test script `.specify/scripts/bash/smoke-test.sh` and a validation helper script `.specify/scripts/bash/validate-gates-and-memory.sh` to assert gate checking behavior deterministically.

**Tech Stack:** Bash shell scripts, JSON, Markdown.

---

### Task 1: Path Reconciliation & Cleanup

**Files:**
- Create/Move: `.specify/*` (moved from `.specify/*`)
- Modify: `.gitignore`
- Delete: `.ai/specs/plan.md`, `.ai/specs/spec.md`, `.ai/specs/tasks.md`, `.ai/specs/validation-report.md`
- Delete: `.ai/specs/` directory

- [ ] **Step 1: Move Spec-Kit contents to unified root**

Run command to move the directory `.specify` to `.specify`:
```bash
mv .specify .specify
```
Verify that the files have been moved and `.specify` is gone.

- [ ] **Step 2: Update `.gitignore` to track `.specify` except feature specs**

Ensure `.specify/` is tracked, but feature specifications are kept clean or handled appropriately. We need to check `.gitignore` to see if `.specify` is listed. Let's add any necessary overrides.
Modify `.gitignore` to track `.specify/` but allow user feature specs to be ignored if they are local-only (though roadmap specs are committed, let's verify GSD settings). Let's keep `.specify` fully tracked.
Run:
```bash
git status
```
Ensure all files under `.specify/` show as untracked.

- [ ] **Step 3: Remove legacy spec files under `.ai/specs/`**

Run commands to remove legacy 1-byte specs:
```bash
rm -f .ai/specs/plan.md .ai/specs/spec.md .ai/specs/tasks.md .ai/specs/validation-report.md
rmdir .ai/specs
```
Ensure `.ai/specs` directory is removed from the workspace.

- [ ] **Step 4: Commit cleanup changes**

Run:
```bash
git add .gitignore .specify .ai/specs
git commit -m "feat: relocate spec-kit to .specify and remove legacy .ai/specs"
```

---

### Task 2: Create Artifact Registry

**Files:**
- Create: `docs/artifact-registry.md`

- [ ] **Step 1: Write the Artifact Registry document**

Create `docs/artifact-registry.md` with the following content:
```markdown
# Artifact Registry & Path Ownership

This document defines the canonical artifact contract, path ownership model, and implementation status for all directories and key files in the Snail Agent Flow protocol.

## Multi-Category Path Matrix

| Path | Owner Tool / Role | Category | Status | Description |
|---|---|---|---|---|
| `.specify/` | Spec-Kit / OpenSpec | Authoritative | `implemented` | Spec-Kit root containing presets, templates, and scripts. |
| `specs/<feature-slug>/` | Spec-Kit / User | Authoritative | `specified` | Active requirements, implementation plans, and tasks. |
| `docs/artifact-registry.md` | Protocol / Human | Authoritative | `implemented` | Registry of paths, owners, and statuses. |
| `.ai/state/active-feature.json` | Orchestrator | Generated | `implemented` | JSON state pointer identifying the active feature. |
| `.gemini/commands/` | Gemini CLI / Adapter | Runtime-Specific | `implemented` | Gemini-specific tool wrapper commands. |
| `.claude/settings.json` | Claude CLI | Runtime-Specific | `implemented` | Settings for the Claude CLI agent. |
| `.claude/hooks/` | Claude CLI Hooks | Runtime-Specific | `implemented` | Git/session hooks executed by Claude. |
| `.ai/constitution.md` | Protocol / Human | Authoritative | `implemented` | Repository operating rules and failure-mode policies. |
| `.ai/sessions/` | Coding Agents | Local-Only | `implemented` | Temporary execution notes and scratchpads. |
| `.ai/reviews/<feature-slug>/` | Critique Agents | Local-Only | `implemented` | Reviews, validation reports, and decisions. |
| `.ai/state/` | Orchestrator | Local-Only | `implemented` | Directory storing current execution state. |

## Implementation Status Taxonomy

- **implemented**: Fully active and verified in the repository.
- **specified**: Structure defined, templates ready, but active instances depend on feature work.
- **placeholder**: Exists as an empty file or dummy context to reserve the path.
- **generated-scaffold**: Scaffolding created by tools/CLIs, not yet customized or validated.
- **deferred**: Documented in the roadmap but not yet created in the workspace.

## Directory Layout Status Table

| Directory | Primary Owner | Status | Notes |
|---|---|---|---|
| `.specify/` | Spec-Kit | `implemented` | Unified root for all Spec-Kit templates, presets, and scripts. |
| `.ai/` | Orchestration | `implemented` | Contains constitution, memory, reviews, sessions, and state. |
| `.planning/` | GSD Planner | `implemented` | Roadmaps, project state, phase manifests, and codebase maps. |
| `.agents/` | Agent Skills | `implemented` | Houses agent capabilities and superpower skills. |
```

- [ ] **Step 2: Commit the registry**

Run:
```bash
git add docs/artifact-registry.md
git commit -m "docs: add artifact registry mapping path ownership and statuses"
```

---

### Task 3: Current-Spec State Convention

**Files:**
- Create: `.ai/state/active-feature.json`

- [ ] **Step 1: Initialize active feature state file**

Create the file `.ai/state/active-feature.json` with a placeholder structure:
```json
{
  "feature_slug": "001-artifact-contract-status",
  "spec_path": "specs/001-artifact-contract-status/"
}
```

- [ ] **Step 2: Commit the state file**

Run:
```bash
git add .ai/state/active-feature.json
git commit -m "feat: initialize active-feature state pointer"
```

---

### Task 4: Minimal Golden Path smoke test

**Files:**
- Create: `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/spec.md`
- Create: `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/plan.md`
- Create: `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/tasks.md`
- Create: `.specify/fixtures/minimal-golden-path/state/active-feature.json`
- Create: `.specify/scripts/bash/validate-gates-and-memory.sh`
- Create: `.specify/scripts/bash/smoke-test.sh`

- [ ] **Step 1: Create fixture feature specs**

Create `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/spec.md` with mock feature requirements:
```markdown
# Spec: Fixture Feature
Goal: Provide a minimal spec for the smoke test.
```

Create `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/plan.md` with mock plan:
```markdown
# Plan: Fixture Feature
Plan steps.
```

Create `.specify/fixtures/minimal-golden-path/specs/000-fixture-feature/tasks.md` with mock tasks:
```markdown
- [ ] Task 1
```

- [ ] **Step 2: Create fixture active-feature state JSON**

Create `.specify/fixtures/minimal-golden-path/state/active-feature.json`:
```json
{
  "feature_slug": "000-fixture-feature",
  "spec_path": ".specify/fixtures/minimal-golden-path/specs/000-fixture-feature/"
}
```

- [ ] **Step 3: Implement validation helper script**

Create `.specify/scripts/bash/validate-gates-and-memory.sh` to check validation report status and memory handoff:
```bash
#!/usr/bin/env bash
# Validation helper script to assert gates and memory state
set -euo pipefail

# Set paths
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE_FILE="${SPECIFY_STATE_FILE:-$REPO_ROOT/.ai/state/active-feature.json}"

echo "[validator] Checking active feature state: $STATE_FILE"

if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: Active feature state file not found at $STATE_FILE" >&2
    exit 1
fi

# Parse feature slug using jq (or fallback simple grep if jq is missing)
if command -v jq >/dev/null 2>&1; then
    FEATURE_SLUG=$(jq -r '.feature_slug' "$STATE_FILE")
    SPEC_PATH=$(jq -r '.spec_path' "$STATE_FILE")
else
    FEATURE_SLUG=$(grep -o '"feature_slug":[[:space:]]*"[^"]*"' "$STATE_FILE" | cut -d'"' -d':' -f2 | tr -d ' "')
    SPEC_PATH=$(grep -o '"spec_path":[[:space:]]*"[^"]*"' "$STATE_FILE" | cut -d'"' -d':' -f2 | tr -d ' "')
fi

echo "[validator] Active feature: $FEATURE_SLUG"
echo "[validator] Spec path: $SPEC_PATH"

# Resolve spec path relative to repo root if it is relative
if [[ "$SPEC_PATH" != /* ]]; then
    SPEC_PATH="$REPO_ROOT/$SPEC_PATH"
fi

# Check for required specs
for file in spec.md plan.md tasks.md; do
    if [ ! -f "$SPEC_PATH/$file" ]; then
        echo "ERROR: Missing required spec file: $SPEC_PATH/$file" >&2
        exit 1
    fi
done

# Check validation gate report status
VAL_REPORT="$REPO_ROOT/.ai/reviews/$FEATURE_SLUG/spec-validation-report.md"
echo "[validator] Checking spec validation report: $VAL_REPORT"
if [ ! -f "$VAL_REPORT" ]; then
    echo "ERROR: Validation gate report missing. Run validation first." >&2
    exit 1
fi

if ! grep -q "PASS" "$VAL_REPORT"; then
    echo "ERROR: Spec validation report does not show PASS status." >&2
    exit 1
fi

# Check memory handoff completion status
HANDOFF_FILE="$REPO_ROOT/.ai/state/handoff.md"
echo "[validator] Checking memory handoff report: $HANDOFF_FILE"
if [ ! -f "$HANDOFF_FILE" ]; then
    echo "ERROR: Memory handoff report (.ai/state/handoff.md) is missing." >&2
    exit 1
fi

if ! grep -q "Memory Handoff Complete" "$HANDOFF_FILE"; then
    echo "ERROR: Memory handoff is not marked as complete." >&2
    exit 1
fi

echo "[validator] SUCCESS: All gates and memory handoff verified."
exit 0
```

Make it executable:
```bash
chmod +x .specify/scripts/bash/validate-gates-and-memory.sh
```

- [ ] **Step 4: Implement smoke test script**

Create `.specify/scripts/bash/smoke-test.sh` to simulate a fixture task and assert failure exits when gates are incomplete:
```bash
#!/usr/bin/env bash
# Smoke test for minimal golden path behavior
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

FIXTURE_DIR="$REPO_ROOT/.specify/fixtures/minimal-golden-path"
MOCK_STATE="$FIXTURE_DIR/state/active-feature.json"
SESSION_LOG="$REPO_ROOT/.ai/sessions/smoke-test-run.log"

echo "=== Running Minimal Golden Path Smoke Test ===" | tee "$SESSION_LOG"

# Set override environment variables to use mock fixtures
export SPECIFY_STATE_FILE="$MOCK_STATE"

# Stage A: Verify initial block when reviews and handoff are missing
echo "[smoke-test] 1. Running validation with missing review and handoff files..." | tee -a "$SESSION_LOG"

# Ensure mock reviews and handoff folders are cleared in the real project for this slug
# to simulate incomplete states
rm -f "$REPO_ROOT/.ai/reviews/000-fixture-feature/spec-validation-report.md"
rm -f "$REPO_ROOT/.ai/state/handoff.md"

if "$SCRIPT_DIR/validate-gates-and-memory.sh" 2>&1 | tee -a "$SESSION_LOG"; then
    echo "FAIL: Expected validation script to exit with failure code 1, but it succeeded." | tee -a "$SESSION_LOG"
    exit 1
else
    echo "PASS: Validation script correctly blocked because gates are incomplete." | tee -a "$SESSION_LOG"
fi

# Stage B: Setup dummy verification pass
echo "[smoke-test] 2. Staging dummy validation pass and memory handoff..." | tee -a "$SESSION_LOG"
mkdir -p "$REPO_ROOT/.ai/reviews/000-fixture-feature"
echo "Status: PASS" > "$REPO_ROOT/.ai/reviews/000-fixture-feature/spec-validation-report.md"
echo "Memory Handoff Complete" > "$REPO_ROOT/.ai/state/handoff.md"

# Run validator again
if "$SCRIPT_DIR/validate-gates-and-memory.sh" 2>&1 | tee -a "$SESSION_LOG"; then
    echo "PASS: Validation script correctly succeeded after staging mock gates." | tee -a "$SESSION_LOG"
else
    echo "FAIL: Expected validation script to pass, but it failed." | tee -a "$SESSION_LOG"
    exit 1
fi

# Cleanup staged files
rm -rf "$REPO_ROOT/.ai/reviews/000-fixture-feature"
rm -f "$REPO_ROOT/.ai/state/handoff.md"

echo "=== Smoke Test Completed Successfully ===" | tee -a "$SESSION_LOG"
exit 0
```

Make it executable:
```bash
chmod +x .specify/scripts/bash/smoke-test.sh
```

- [ ] **Step 5: Run the smoke test locally to verify**

Run:
```bash
./.specify/scripts/bash/smoke-test.sh
```
Verify that the output finishes with `=== Smoke Test Completed Successfully ===` and exits with code 0.

- [ ] **Step 6: Commit smoke test files**

Run:
```bash
git add .specify/fixtures .specify/scripts
git commit -m "feat: implement minimal golden path validation and smoke test script"
```

---

### Task 5: Update GSD Status & Verification Files

**Files:**
- Modify: `.planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-UAT.md`
- Modify: `.planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-VERIFICATION.md`

- [ ] **Step 1: Update UAT.md**

Modify `.planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-UAT.md` to map out the tests:
```markdown
# Phase 1: artifact-contract-status-and-minimal-golden-path — User Acceptance Testing

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Move Spec-Kit to root | pending | Check .specify directory contents |
| 2 | Legacy spec removal | pending | Verify .ai/specs is deleted |
| 3 | docs/artifact-registry.md structure | pending | Check path matrix and status taxonomy |
| 4 | active-feature.json format | pending | Check JSON structure and location |
| 5 | smoke-test.sh execution | pending | Run test and verify exit code |

## Summary

_Pending execution_
```

- [ ] **Step 2: Update VERIFICATION.md**

Modify `.planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-VERIFICATION.md` to outline verification:
```markdown
# Phase 1: artifact-contract-status-and-minimal-golden-path — Verification

## Goal-Backward Verification

**Phase Goal:** Establish one canonical artifact contract, path ownership model, and a runnable minimal golden path skeleton.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Path Reconciliation (D-01 to D-04) | pending | verify files relocated and legacy files deleted |
| 2 | Artifact Status & Registry (D-05 to D-08) | pending | check docs/artifact-registry.md |
| 3 | Current-Spec Convention (D-09 to D-12) | pending | active-feature.json check |
| 4 | Minimal Golden Path Example (D-13 to D-16) | pending | run .specify/scripts/bash/smoke-test.sh |

## Result

_Pending verification_
```

- [ ] **Step 3: Commit verification doc changes**

Run:
```bash
git add .planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-UAT.md .planning/phases/01-artifact-contract-status-and-minimal-golden-path/01-VERIFICATION.md
git commit -m "chore: update Phase 1 UAT and verification manifests"
```
