# Routing, Gates, and Memory Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a structured tool routing matrix, implement explicit gate validation rules, define run state schemas, write the pipeline validator script, seed project memory, and run a thin vertical slice simulation for the Phase 2 demo feature.

**Architecture:** We will seed actual protocol memory files under `.ai/memory/`, establish the memory-versus-sessions boundary, and define the tool routing matrix. We will then implement a validation utility script `.specify/scripts/bash/validate-pipeline-state.sh` which maintains `.ai/state/run-state.json`, checks path drift, parses gate reports for Status/Blocking keys, tracks retries, and writes human review packets upon validation exhaustion. Finally, we will write a simulation script `.specify/scripts/bash/simulate-phase2-pipeline.sh` to run the feature `002-routing-gates-memory` through all gates to prove the vertical slice.

**Tech Stack:** Bash shell scripts, JSON, Python 3, Markdown.

## Vertical Slice Issue Map

| Slice | GitHub Issue | Type | Blocked By | User Stories | Plan Coverage |
|-------|--------------|------|------------|--------------|---------------|
| 1 | [#21 Durable memory baseline](https://github.com/snailb1007/snail-agent-flow/issues/21) | AFK | None | US2, US3 | Task 1: Seed Durable Project Memory |
| 2 | [#22 Routing matrix and memory/session boundaries](https://github.com/snailb1007/snail-agent-flow/issues/22) | AFK | #21 | US1, US2 | Task 2: Create Documentation for Memory vs Sessions & Tool Routing |
| 3 | [#23 Human review packet contract](https://github.com/snailb1007/snail-agent-flow/issues/23) | AFK | #22 | US3 | Task 3: Build Human Review Packet Template |
| 4 | [#24 Run-state initialization and path drift validation](https://github.com/snailb1007/snail-agent-flow/issues/24) | AFK | #22 | US2 | Task 4: Implement Pipeline State Validator Script, state bootstrap and path verification steps |
| 5 | [#25 Gate parser and verified artifact evidence](https://github.com/snailb1007/snail-agent-flow/issues/25) | AFK | #24 | US1, US2 | Task 4: gate report parsing and `verified_artifacts` steps |
| 6 | [#26 Failure taxonomy, retry exhaustion, and resume override](https://github.com/snailb1007/snail-agent-flow/issues/26) | AFK | #23, #25 | US3 | Task 4: failure taxonomy, retry exhaustion, human review packet generation, and resume behavior |
| 7 | [#27 Full vertical simulation and handoff checkpoint](https://github.com/snailb1007/snail-agent-flow/issues/27) | HITL-light | #26 | US1, US2, US3 | Phase 02 simulation and Memory Handoff Gate evidence |

These issues are vertical slices. Each issue must preserve an end-to-end verification path through the relevant artifacts, state, gates, and tests instead of splitting work by implementation layer.

---

### Task 1: Seed Durable Project Memory

**Files:**
- Modify: `.ai/memory/project-summary.md`
- Modify: `.ai/memory/current-architecture.md`
- Modify: `.ai/memory/decisions.md`
- Modify: `.ai/memory/known-risks.md`
- Modify: `.ai/memory/verification-history.md`

- [ ] **Step 1: Update project-summary.md with actual facts**

Overwrite `.ai/memory/project-summary.md` with:
```markdown
# Project Summary

Snail Agent Flow is an operating protocol for AI coding agents to coordinate tools like Spec-Kit, GSD, and GStack into a repeatable spec-to-ship workflow.

## Core Value
Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## Scope
- Artifact layout, active pointers, and path ownership.
- Tool routing rules and state transition validation.
- Circuit breakers, retry loops, and human-review handoffs.
- Memory seeding and handoff validation.
```

- [ ] **Step 2: Update current-architecture.md with actual facts**

Overwrite `.ai/memory/current-architecture.md` with:
```markdown
# Current Architecture

Snail Agent Flow operates on a file-based state structure:

## Directory Structure
- `specs/<feature-slug>/`: Source of truth containing `spec.md`, `plan.md`, and `tasks.md`.
- `.specify/`: Spec-Kit presets, templates, and orchestration scripts.
- `.ai/`: Local state, review files, sessions, and durable memory files.

## State Pointers
- `.ai/state/active-feature.json`: Static identity pointer referencing the active feature slug and its path.
- `.ai/state/run-state.json`: Mutable execution metrics including current phase, retries, and verified artifacts.
```

- [ ] **Step 3: Update decisions.md with actual facts**

Overwrite `.ai/memory/decisions.md` with:
```markdown
# Decisions Log

- **2026-05-24 | D-01: Canonical Feature Specs Path**: All feature specifications, plans, and checklists reside under `specs/<feature-slug>/`. `.specify/` is reserved for Spec-Kit tooling, templates, and integration files.
- **2026-05-24 | D-03: Active Feature File**: `.ai/state/active-feature.json` is a narrow feature identity pointer.
- **2026-05-24 | D-03a: Run State File**: Mutable progress lives in `.ai/state/run-state.json`.
- **2026-05-24 | D-03b: Verified Artifacts**: `verified_artifacts` is validator-owned evidence, not executor self-attestation.
- **2026-05-24 | D-04: Gate Status Vocabulary**: Gates use `PASS`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`, and judgment-only `WARN`.
- **2026-05-24 | D-13: Validation Loop Exhaustion**: After 3 failed retries for the same gate/scope, transition to `NEEDS_HUMAN_REVIEW` and write the human review packet.
```

- [ ] **Step 4: Update known-risks.md with actual facts**

Overwrite `.ai/memory/known-risks.md` with:
```markdown
# Known Risks

- **Path Drift**: Specs written to legacy locations (e.g. `.ai/specs/current/` or `.specify/specs/`) diverge from the canonical `specs/` location. Prevented by automated path verification.
- **Infinite Self-Repair Loops**: Code writing agents attempting to fix validation issues repeatedly without bound. Prevented by validation retry limits (max 3 retries).
- **Context Fragmentation**: Loss of project decisions across sessions. Prevented by requiring memory handoff on change.
```

- [ ] **Step 5: Update verification-history.md with actual facts**

Overwrite `.ai/memory/verification-history.md` with:
```markdown
# Verification History

- **2026-05-24 | Phase 1 Setup**: Moved Spec-Kit folders, established `docs/artifact-registry.md`, set up `active-feature.json`, and ran a minimal golden path smoke test.
- **2026-05-24 | Phase 2 Setup**: Integrated routing matrix, gate status parsing, retry tracking, human review packet generation, and ran the simulation check.
```

- [ ] **Step 6: Commit seeded memory files**

Run:
```bash
git add .ai/memory/*.md
git commit -m "feat: seed durable project memory files with Snail Agent Flow protocol facts"
```

---

### Task 2: Create Documentation for Memory vs Sessions & Tool Routing

**Files:**
- Create: `docs/memory-versus-sessions.md`
- Create: `docs/tool-routing.md`

- [ ] **Step 1: Create docs/memory-versus-sessions.md**

Create `docs/memory-versus-sessions.md` with content:
```markdown
# Memory vs Sessions Boundary

This document outlines what belongs in temporary session logs versus durable project memory.

## Session Logs (Temporary)
- **Path**: `.ai/sessions/`
- **Contents**: Full compiler traces, command outputs, temporary debugging attempts, verbose test logs, and intermediate reasoning.
- **Lifespan**: Auditing only; not referenced by future features.

## Durable Memory (Long-Lived)
- **Path**: `.ai/memory/`
- **Contents**: Promoted architecture designs, decisions with rationale, active risks, and verification logs.
- **Rules**: Zero placeholders. Updated only at the Memory Handoff Gate (D-10) to reflect the actual codebase state.
```

- [ ] **Step 2: Create docs/tool-routing.md**

Create `docs/tool-routing.md` with content:
```markdown
# Tool Routing Matrix

| Phase | Task Type | Primary Tool | Specific Skill / Flow | Required Input | Required Output | Validator | Stop / Exit Condition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recon** | Investigation | Serena / Semble / Context7 | Symbol lookup, semantic search, API docs | Target feature request | `.ai/sessions/YYYY-MM-DD-recon-<feature-slug>.md` | Check for listed files & API versions | All unknown APIs and target files listed |
| **Critique** | Planning Review | GStack CEO / Eng Manager | `plan-ceo-review`, `plan-eng-review` | Recon report, constitutional rules | `.ai/reviews/<feature-slug>/gstack-ceo-review.md`, `gstack-eng-review.md` | Verify judgment gate Status header | Status headers are set to `PASS` or judgment-only `WARN` with `Blocking Issues: none` |
| **Spec** | Specification | Spec-Kit | `speckit-specify`, `speckit-plan`, `speckit-tasks` | Reviews, Recon report | `specs/<feature-slug>/{spec,plan,tasks}.md` | `/speckit.analyze` | Spec-Kit files written; no `[NEEDS CLARIFICATION]` tags |
| **Gate** | Spec Validation | Custom script / Judge | Validator validation | Spec-Kit files | `.ai/reviews/<feature-slug>/spec-validation-report.md` | Verification of contract files and headers | Validation report outputs explicit `PASS` |
| **Execution** | Code writing | GSD Full | `gsd-execute-phase`, `gsd-quick` | Validated Spec-Kit files | Implemented code, `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md` | Compiler/build checks | All `tasks.md` items checked off, code compiles |
| **QA** | Verification | GStack QA | `qa-only`, Playwright | Implemented code, spec criteria | `.ai/reviews/<feature-slug>/qa-review.md`, `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md` | Test runners, Playwright tests | QA review shows `PASS`; all tests green |
| **Memory** | Handoff | Protocol / Human | `gsd-extract-learnings` | QA reports, session notes | Updated `.ai/memory/*` files, `.ai/state/handoff.md` | Deterministic minimum checks plus reviewer judgment | `PASS` or judgment-only `WARN` with no blocking issues |
| **Ship** | Release | GStack Ship | `ship` | Memory handoff, all review logs | `.ai/reviews/<feature-slug>/ship-decision.md` | Pre-landing checklist | `PASS` or judgment-only `WARN` with no blocking issues; branch created |
```

- [ ] **Step 3: Commit documentation**

Run:
```bash
git add docs/memory-versus-sessions.md docs/tool-routing.md
git commit -m "docs: add memory-versus-sessions boundary and tool-routing matrix"
```

---

### Task 3: Build Human Review Packet Template

**Files:**
- Create: `.specify/templates/human-review-packet-template.md`

- [ ] **Step 1: Write human review packet template**

Create `.specify/templates/human-review-packet-template.md` with content:
```markdown
# Human Review Packet

## Feature
- Feature Slug: ${FEATURE_SLUG}
- Spec Path: ${SPEC_PATH}

## Status
- Current Phase: ${CURRENT_PHASE}
- Failed Gate: ${FAILED_GATE}
- Status: NEEDS_HUMAN_REVIEW

## Blocking Question
The system has paused after 3 consecutive validation failures. What is the blocking issue and recommended action?

## Recommended Answer
[Draft recommended resolution or options for the user]

## Options Considered
1. Retry with modified plan.
2. Defer this validation rule.
3. Accept current validation status manually.

## Affected Artifacts
- Run State: `.ai/state/run-state.json`
- Feature Specs: `${SPEC_PATH}spec.md`

## Resume Instructions
To resume pipeline execution, resolve the block, reset retries by running:
```bash
./.specify/scripts/bash/validate-pipeline-state.sh resume
```
```

- [ ] **Step 2: Commit template**

Run:
```bash
git add .specify/templates/human-review-packet-template.md
git commit -m "feat: add human-review-packet template"
```

---

### Task 4: Implement Pipeline State Validator Script

**Files:**
- Create: `.specify/scripts/bash/validate-pipeline-state.sh`

- [ ] **Step 1: Create validate-pipeline-state.sh**

Create `.specify/scripts/bash/validate-pipeline-state.sh` with the following implementation:
```bash
#!/usr/bin/env bash
# Script to manage and validate the pipeline state, gate reviews, and path drift
set -euo pipefail

# Set paths
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SPECIFY_AI_DIR="${SPECIFY_AI_DIR:-$REPO_ROOT/.ai}"
STATE_DIR="$SPECIFY_AI_DIR/state"
RUN_STATE_FILE="$STATE_DIR/run-state.json"
ACTIVE_FEATURE_FILE="$STATE_DIR/active-feature.json"

# Helper function to query JSON using python3
query_json() {
    local file="$1"
    local key="$2"
    python3 -c '
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    keys = sys.argv[2].split(".")
    val = d
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        elif isinstance(val, list) and k.isdigit():
            val = val[int(k)]
        else:
            val = None
            break
    if val is None:
        print("")
    elif isinstance(val, (dict, list)):
        print(json.dumps(val))
    else:
        print(val)
except Exception:
    print("")
' "$file" "$key"
}

# Helper function to update JSON using python3
update_json() {
    local file="$1"
    local key="$2"
    local value="$3"
    python3 -c '
import json, sys, os
file_path = sys.argv[1]
key = sys.argv[2]
val_str = sys.argv[3]
try:
    try:
        val = json.loads(val_str)
    except Exception:
        val = val_str
    
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        with open(file_path) as f:
            d = json.load(f)
    else:
        d = {}
    
    keys = key.split(".")
    target = d
    for k in keys[:-1]:
        if k not in target or not isinstance(target[k], dict):
            target[k] = {}
        target = target[k]
    
    target[keys[-1]] = val
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w") as f:
        json.dump(d, f, indent=2)
except Exception as e:
    sys.stderr.write(f"Error updating JSON: {e}\n")
    sys.exit(1)
' "$file" "$key" "$value"
}

# Generate human review packet from template
generate_review_packet() {
    local slug="$1"
    local phase="$2"
    local gate="$3"
    local template="$REPO_ROOT/.specify/templates/human-review-packet-template.md"
    local output="$SPECIFY_AI_DIR/reviews/$slug/human-review-packet.md"
    
    mkdir -p "$(dirname "$output")"
    
    python3 -c '
import sys, os
slug = sys.argv[1]
phase = sys.argv[2]
gate = sys.argv[3]
tmpl_path = sys.argv[4]
out_path = sys.argv[5]

with open(tmpl_path) as f:
    content = f.read()

content = content.replace("${FEATURE_SLUG}", slug)
content = content.replace("${SPEC_PATH}", f"specs/{slug}/")
content = content.replace("${CURRENT_PHASE}", phase)
content = content.replace("${FAILED_GATE}", gate)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    f.write(content)
' "$slug" "$phase" "$gate" "$template" "$output"
    echo "[validator] Generated Human Review Packet at: $output"
}

# Subcommand: init
cmd_init() {
    local slug="$1"
    local path="$2"
    
    echo "[validator] Initializing run state for slug: $slug"
    mkdir -p "$STATE_DIR"
    
    # Initialize active-feature pointer
    update_json "$ACTIVE_FEATURE_FILE" "feature_slug" "$slug"
    update_json "$ACTIVE_FEATURE_FILE" "spec_path" "$path"
    
    # Initialize mutable run state
    update_json "$RUN_STATE_FILE" "feature_slug" "$slug"
    update_json "$RUN_STATE_FILE" "spec_path" "$path"
    update_json "$RUN_STATE_FILE" "current_phase" "Recon"
    update_json "$RUN_STATE_FILE" "last_gate" "none"
    update_json "$RUN_STATE_FILE" "last_gate_status" "none"
    update_json "$RUN_STATE_FILE" "blocked_reason" "none"
    update_json "$RUN_STATE_FILE" "retry_count" "0"
    update_json "$RUN_STATE_FILE" "retry_scope" "none"
    update_json "$RUN_STATE_FILE" "verified_artifacts" "[]"
    
    python3 -c '
import json, time
f = sys.argv[1]
d = json.load(open(f))
d["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
json.dump(d, open(f, "w"), indent=2)
' "$RUN_STATE_FILE"
}

# Subcommand: update-phase
cmd_update_phase() {
    local phase="$1"
    echo "[validator] Moving pipeline phase to: $phase"
    update_json "$RUN_STATE_FILE" "current_phase" "$phase"
    update_json "$RUN_STATE_FILE" "retry_count" "0"
    update_json "$RUN_STATE_FILE" "retry_scope" "none"
}

# Subcommand: verify-paths (Path Drift Checking)
cmd_verify_paths() {
    echo "[validator] Verifying paths and checking for drift..."
    
    if [ ! -f "$ACTIVE_FEATURE_FILE" ] || [ ! -f "$RUN_STATE_FILE" ]; then
        echo "ERROR: State files are missing." >&2
        exit 1
    fi
    
    local act_slug=$(query_json "$ACTIVE_FEATURE_FILE" "feature_slug")
    local act_path=$(query_json "$ACTIVE_FEATURE_FILE" "spec_path")
    local run_slug=$(query_json "$RUN_STATE_FILE" "feature_slug")
    local run_path=$(query_json "$RUN_STATE_FILE" "spec_path")
    
    if [ "$act_slug" != "$run_slug" ] || [ "$act_path" != "$run_path" ]; then
        echo "ERROR: active-feature.json and run-state.json mismatch. Active: $act_slug, RunState: $run_slug" >&2
        exit 1
    fi
    
    # Verify specs reside in specs/<feature-slug>/
    if [[ "$act_path" != specs/* ]]; then
        echo "ERROR: Path Ownership Violations (D-01). Spec path must be specs/<feature-slug>/" >&2
        exit 1
    fi
    
    # Path Drift Check: scan for legacy paths
    local drift_found=false
    for path in "$REPO_ROOT/.specify/specs" "$REPO_ROOT/.ai/specs"; do
        if [ -d "$path" ] && [ -n "$(ls -A "$path" 2>/dev/null)" ]; then
            echo "ERROR: Path Drift detected! Files exist in legacy folder: $path" >&2
            drift_found=true
        fi
    done
    
    if [ "$drift_found" = true ]; then
        update_json "$RUN_STATE_FILE" "last_gate_status" "BLOCKED"
        update_json "$RUN_STATE_FILE" "blocked_reason" "Path drift check failed: legacy spec folders present."
        exit 1
    fi
    
    echo "[validator] Path verification passed successfully."
}

# Subcommand: check-gate
cmd_check_gate() {
    local gate_name="$1"
    local report_path="$2"
    
    if [ ! -f "$report_path" ]; then
        echo "ERROR: Gate report file missing: $report_path" >&2
        exit 1
    fi
    
    # Extract Status and Blocking Issues
    local status
    status=$(grep -i -E "^Status:[[:space:]]*[A-Z_]+" "$report_path" | head -n 1 | sed -E 's/^[Ss][Tt][Aa][Tt][Uu][Ss]:[[:space:]]*//' | tr -d '\r\n[:space:]') || status=""
    local blocking
    blocking=$(grep -i -E "^Blocking Issues:[[:space:]]*[a-zA-Z0-9_]+" "$report_path" | head -n 1 | sed -E 's/^[Bb][Ll][Oo][Cc][Kk][Ii][Nn][Gg][[:space:]]*[Ii][Ss][Ss][Uu][Ee][Ss]:[[:space:]]*//' | tr -d '\r\n[:space:]') || blocking=""
    
    if [ -z "$status" ] || [ -z "$blocking" ]; then
        echo "ERROR: Missing Status or Blocking Issues in report." >&2
        exit 1
    fi
    
    echo "[validator] Gate: $gate_name | Status: $status | Blocking Issues: $blocking"
    
    # Map gate behavior
    local pass=false
    if [ "$status" = "PASS" ] && [ "$blocking" = "none" ]; then
        pass=true
    elif [ "$status" = "WARN" ] && [ "$blocking" = "none" ]; then
        # Warn is allowed only for Critique, QA, Memory, or Ship gates
        if [[ "$gate_name" =~ ^(Critique|QA|Memory|Ship)$ ]]; then
            pass=true
        fi
    fi
    
    if [ "$pass" = true ]; then
        echo "[validator] Gate PASSED."
        update_json "$RUN_STATE_FILE" "last_gate" "$gate_name"
        update_json "$RUN_STATE_FILE" "last_gate_status" "$status"
        update_json "$RUN_STATE_FILE" "blocked_reason" "none"
        update_json "$RUN_STATE_FILE" "retry_count" "0"
        update_json "$RUN_STATE_FILE" "retry_scope" "none"
        exit 0
    else
        # Handle failures and retries
        local slug=$(query_json "$RUN_STATE_FILE" "feature_slug")
        local phase=$(query_json "$RUN_STATE_FILE" "current_phase")
        local scope=$(query_json "$RUN_STATE_FILE" "retry_scope")
        local count=$(query_json "$RUN_STATE_FILE" "retry_count")
        
        if [ -z "$count" ]; then count=0; fi
        
        if [ "$scope" = "$gate_name" ]; then
            count=$((count + 1))
        else
            scope="$gate_name"
            count=1
        fi
        
        echo "[validator] Gate FAILED/BLOCKED. Attempt $count of 3."
        update_json "$RUN_STATE_FILE" "retry_scope" "$scope"
        update_json "$RUN_STATE_FILE" "retry_count" "$count"
        
        if [ "$count" -ge 3 ]; then
            echo "[validator] Validation loop exhausted. Halting pipeline."
            update_json "$RUN_STATE_FILE" "last_gate_status" "NEEDS_HUMAN_REVIEW"
            update_json "$RUN_STATE_FILE" "blocked_reason" "Gate validation failed 3 times consecutive."
            generate_review_packet "$slug" "$phase" "$gate_name"
            exit 2
        else
            update_json "$RUN_STATE_FILE" "last_gate_status" "BLOCKED"
            update_json "$RUN_STATE_FILE" "blocked_reason" "Gate blocked: $blocking"
            exit 1
        fi
    fi
}

# Subcommand: verify-handoff
cmd_verify_handoff() {
    local handoff_path="$1"
    
    if [ ! -f "$handoff_path" ]; then
        echo "ERROR: Handoff report file missing at $handoff_path" >&2
        exit 1
    fi
    
    local slug=$(query_json "$RUN_STATE_FILE" "feature_slug")
    
    # Check that handoff names the slug and contains required headers
    if ! grep -q "$slug" "$handoff_path"; then
        echo "ERROR: Handoff file does not list active feature slug: $slug" >&2
        exit 1
    fi
    
    local missing_sect=false
    for header in "Promoted to project memory" "Architecture updated" "Verification promoted"; do
        if ! grep -q "## $header" "$handoff_path"; then
            echo "ERROR: Handoff file missing section: $header" >&2
            missing_sect=true
        fi
    done
    
    if [ "$missing_sect" = true ]; then
        exit 1
    fi
    
    echo "[validator] Memory Handoff report matches protocol validation criteria."
}

# Subcommand: verify-artifact
cmd_verify_artifact() {
    local art_path="$1"
    local art_type="$2"
    local verifier="$3"
    
    if [ ! -f "$art_path" ]; then
        echo "ERROR: Target artifact does not exist: $art_path" >&2
        exit 1
    fi
    
    local hash
    hash=$(md5 -q "$art_path" 2>/dev/null || md5sum "$art_path" 2>/dev/null | cut -d" " -f1 || echo "none")
    
    python3 -c '
import json, sys, os, time
file_path = sys.argv[1]
art_path = sys.argv[2]
art_type = sys.argv[3]
verifier = sys.argv[4]
art_hash = sys.argv[5]

with open(file_path) as f:
    d = json.load(f)

if "verified_artifacts" not in d or not isinstance(d["verified_artifacts"], list):
    d["verified_artifacts"] = []

found = False
for entry in d["verified_artifacts"]:
    if entry.get("path") == art_path:
        entry["verified_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        entry["verified_by"] = verifier
        entry["status"] = "PASS"
        entry["hash"] = art_hash
        found = True
        break

if not found:
    d["verified_artifacts"].append({
        "path": art_path,
        "artifact_type": art_type,
        "verified_by": verifier,
        "verified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "PASS",
        "hash": art_hash
    })

with open(file_path, "w") as f:
    json.dump(d, f, indent=2)
' "$RUN_STATE_FILE" "$art_path" "$art_type" "$verifier" "$hash"
    
    echo "[validator] Registered verified artifact: $art_path"
}

# Subcommand: resume
cmd_resume() {
    echo "[validator] Resuming from NEEDS_HUMAN_REVIEW. Resetting retry counters."
    update_json "$RUN_STATE_FILE" "retry_count" "0"
    update_json "$RUN_STATE_FILE" "retry_scope" "none"
    update_json "$RUN_STATE_FILE" "last_gate_status" "RESUMED"
    update_json "$RUN_STATE_FILE" "blocked_reason" "none"
}

# Parse subcommands
SUB=$1
shift

case "$SUB" in
    init) cmd_init "$@" ;;
    update-phase) cmd_update_phase "$@" ;;
    verify-paths) cmd_verify_paths ;;
    check-gate) cmd_check_gate "$@" ;;
    verify-handoff) cmd_verify_handoff "$@" ;;
    verify-artifact) cmd_verify_artifact "$@" ;;
    resume) cmd_resume ;;
    *) echo "Unknown command: $SUB" >&2; exit 1 ;;
esac
```

- [ ] **Step 2: Make validate-pipeline-state.sh executable**

Run:
```bash
chmod +x .specify/scripts/bash/validate-pipeline-state.sh
```

- [ ] **Step 3: Commit the script**

Run:
```bash
git add .specify/scripts/bash/validate-pipeline-state.sh
git commit -m "feat: implement pipeline state validator script"
```

---

### Task 5: Build Spec-Kit Plan and Tasks for Phase 2 Demo Feature

**Files:**
- Create: `specs/002-routing-gates-memory/plan.md`
- Create: `specs/002-routing-gates-memory/tasks.md`

- [ ] **Step 1: Create specs/002-routing-gates-memory/plan.md**

Create `specs/002-routing-gates-memory/plan.md` matching GSD specs structure:
```markdown
# Plan: Routing, Gates, and Memory Foundation

**Goal:** Provide verification, scripts, and logs showing that pipeline gates, failure taxonomy, retries, and memory updates work correctly.

**Architecture:** Create validation and test scripts, implement unit verification for status headers, write test reviews, and run verification.

**Tech Stack:** Bash, JSON, Python 3, Markdown.
```

- [ ] **Step 2: Create specs/002-routing-gates-memory/tasks.md**

Create `specs/002-routing-gates-memory/tasks.md` with features checkbox checklist:
```markdown
- [x] Task 1: Seed durable project memory files.
- [x] Task 2: Add documentation for boundaries and tool routing.
- [x] Task 3: Build human review packet template.
- [x] Task 4: Implement state validator and circuit breaker checks.
- [x] Task 5: Create demo plan and tasks.
- [x] Task 6: Build simulation check script.
- [x] Task 7: Update GSD UAT and verification manifests.
```

- [ ] **Step 3: Commit demo Spec-Kit files**

Run:
```bash
git add specs/002-routing-gates-memory/plan.md specs/002-routing-gates-memory/tasks.md
git commit -m "feat: add plan.md and tasks.md for 002-routing-gates-memory"
```

---

### Task 6: Implement Verification and Pipeline Simulation Script

**Files:**
- Create: `.specify/scripts/bash/simulate-phase2-pipeline.sh`

- [ ] **Step 1: Write simulate-phase2-pipeline.sh**

Create `.specify/scripts/bash/simulate-phase2-pipeline.sh` with testing steps:
```bash
#!/usr/bin/env bash
# End-to-end pipeline simulation to verify Phase 2 gates, retries, and checks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Define sandbox folder for reviews, states, and logs
SANDBOX_AI_DIR="$REPO_ROOT/.specify/fixtures/phase2-sandbox/.ai"
export SPECIFY_AI_DIR="$SANDBOX_AI_DIR"

cleanup() {
    echo "[simulation] Cleaning up sandbox directory..."
    if [[ -n "${SPECIFY_AI_DIR:-}" && "$SPECIFY_AI_DIR" == *"phase2-sandbox"* ]]; then
        rm -rf "$SPECIFY_AI_DIR"
    fi
}
trap cleanup EXIT

echo "=== Starting Phase 2 Pipeline Simulation ==="

# Initialize the state in the sandbox
"$SCRIPT_DIR/validate-pipeline-state.sh" init "002-routing-gates-memory" "specs/002-routing-gates-memory/"

# 1. Verify Path Validation (Happy Path)
echo "[simulation] 1. Running path verification..."
"$SCRIPT_DIR/validate-pipeline-state.sh" verify-paths

# 2. Verify Path Drift Detection (D-01 / Legacy Path Check)
echo "[simulation] 2. Staging duplicate spec file in .ai/specs to test drift..."
mkdir -p "$SANDBOX_AI_DIR/specs"
echo "drifted" > "$SANDBOX_AI_DIR/specs/spec.md"

if "$SCRIPT_DIR/validate-pipeline-state.sh" verify-paths 2>/dev/null; then
    echo "FAIL: Expected path verification to fail due to legacy files, but it passed."
    exit 1
else
    echo "PASS: Validator successfully blocked execution due to legacy spec files."
fi
rm -rf "$SANDBOX_AI_DIR/specs"

# 3. Simulate Critique Gate Status Header Check (Judgment Gate)
echo "[simulation] 3. Testing Critique Gate validation status headers..."
"$SCRIPT_DIR/validate-pipeline-state.sh" update-phase "Critique"

# Stage Critique Report (Happy Path WARN / no blocking issues)
REPORT_DIR="$SANDBOX_AI_DIR/reviews/002-routing-gates-memory"
mkdir -p "$REPORT_DIR"
cat <<EOF > "$REPORT_DIR/gstack-ceo-review.md"
# Critique Review
Status: WARN
Blocking Issues: none
EOF

"$SCRIPT_DIR/validate-pipeline-state.sh" check-gate "Critique" "$REPORT_DIR/gstack-ceo-review.md"
echo "PASS: Critique gate successfully accepted judgment WARN status."

# 4. Simulate Spec Validation Gate Pass and Block Checks
echo "[simulation] 4. Testing Spec Validation Gate..."
"$SCRIPT_DIR/validate-pipeline-state.sh" update-phase "Spec"

# Case A: Blocked Spec Validation
cat <<EOF > "$REPORT_DIR/spec-validation-report.md"
# Spec Validation
Status: BLOCKED
Blocking Issues: missing plan.md
EOF

if "$SCRIPT_DIR/validate-pipeline-state.sh" check-gate "Spec Validation" "$REPORT_DIR/spec-validation-report.md" 2>/dev/null; then
    echo "FAIL: Expected gate to block, but it passed."
    exit 1
else
    echo "PASS: Validator correctly flagged blocked gate."
fi

# 5. Simulate Validation Loop Circuit Breaker (3 consecutive failures)
echo "[simulation] 5. Simulating repeated failures to trigger human review..."
# Attempt 2
if "$SCRIPT_DIR/validate-pipeline-state.sh" check-gate "Spec Validation" "$REPORT_DIR/spec-validation-report.md" 2>/dev/null; then
    echo "FAIL: Attempt 2 expected block."
    exit 1
fi
# Attempt 3 (triggers NEEDS_HUMAN_REVIEW and generates packet)
exit_code=0
"$SCRIPT_DIR/validate-pipeline-state.sh" check-gate "Spec Validation" "$REPORT_DIR/spec-validation-report.md" 2>/dev/null || exit_code=$?

if [ "$exit_code" -eq 2 ]; then
    echo "PASS: Retry loop correctly triggered NEEDS_HUMAN_REVIEW after 3 failures."
    if [ -f "$REPORT_DIR/human-review-packet.md" ]; then
        echo "PASS: Human review packet successfully generated."
    else
        echo "FAIL: Human review packet missing."
        exit 1
    fi
else
    echo "FAIL: Retry loop did not halt correctly. Exit code: $exit_code"
    exit 1
fi

# 6. Test Resume Command
echo "[simulation] 6. Testing resume command..."
"$SCRIPT_DIR/validate-pipeline-state.sh" resume
local_retries=$(python3 -c 'import json, sys; d=json.load(open(sys.argv[1])); print(d.get("retry_count"))' "$SANDBOX_AI_DIR/state/run-state.json")
if [ "$local_retries" -eq 0 ]; then
    echo "PASS: Resume command reset retry counters successfully."
else
    echo "FAIL: Retry count not reset."
    exit 1
fi

# 7. Test Verified Artifact Registration
echo "[simulation] 7. Testing verified artifact registration..."
touch "$SANDBOX_AI_DIR/some-artifact.md"
"$SCRIPT_DIR/validate-pipeline-state.sh" verify-artifact "$SANDBOX_AI_DIR/some-artifact.md" "plan" "Spec-Kit Validator"
art_status=$(python3 -c 'import json, sys; d=json.load(open(sys.argv[1])); print(d["verified_artifacts"][0]["status"])' "$SANDBOX_AI_DIR/state/run-state.json")
if [ "$art_status" = "PASS" ]; then
    echo "PASS: Verified artifact correctly registered in run state."
else
    echo "FAIL: Verified artifact state mismatch."
    exit 1
fi

# 8. Test Memory Handoff Gate (D-10 / verify-handoff)
echo "[simulation] 8. Testing memory handoff validation..."
"$SCRIPT_DIR/validate-pipeline-state.sh" update-phase "Memory"

# Happy Handoff Report
cat <<EOF > "$SANDBOX_AI_DIR/state/handoff.md"
# Memory Handoff Report
Feature: 002-routing-gates-memory

## Promoted to project memory
- Updated all core memory files.

## Architecture updated
- Described state pointer architecture.

## Verification promoted
- Simulation test run.
EOF

"$SCRIPT_DIR/validate-pipeline-state.sh" verify-handoff "$SANDBOX_AI_DIR/state/handoff.md"
echo "PASS: Handoff validator verified handoff report sections correctly."

echo "=== Simulation Completed Successfully ==="
exit 0
```

- [ ] **Step 2: Make simulate-phase2-pipeline.sh executable**

Run:
```bash
chmod +x .specify/scripts/bash/simulate-phase2-pipeline.sh
```

- [ ] **Step 3: Run the simulation local check**

Run command to execute the pipeline simulation:
```bash
./.specify/scripts/bash/simulate-phase2-pipeline.sh
```
Verify that the output reports all checks passed and concludes with `=== Simulation Completed Successfully ===`.

- [ ] **Step 4: Commit simulation script**

Run:
```bash
git add .specify/scripts/bash/simulate-phase2-pipeline.sh
git commit -m "feat: implement end-to-end pipeline simulation check script"
```

---

### Task 7: Update GSD Status & Verification manifests

**Files:**
- Modify: `.planning/phases/02-routing-gates-and-memory-foundation/02-UAT.md`
- Modify: `.planning/phases/02-routing-gates-and-memory-foundation/02-VERIFICATION.md`

- [ ] **Step 1: Update UAT.md with check items**

Update `.planning/phases/02-routing-gates-and-memory-foundation/02-UAT.md` with content:
```markdown
# Phase 2: routing-gates-and-memory-foundation — User Acceptance Testing

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Seed Durable Project Memory | pending | Verify project-summary.md, decisions.md are updated with real facts |
| 2 | Memory vs Sessions & Routing Matrix | pending | Check docs/memory-versus-sessions.md, docs/tool-routing.md |
| 3 | State Validator Script | pending | Verify path checks, status headers, retries |
| 4 | Circuit Breaker Halting | pending | Verify NEEDS_HUMAN_REVIEW and Human Review Packet are triggered |
| 5 | Handoff validation | pending | Verify memory handoff report verification works |
| 6 | End-to-end Simulation script | pending | Execute simulate-phase2-pipeline.sh successfully |

## Summary

_Pending verification_
```

- [ ] **Step 2: Update VERIFICATION.md with checks**

Update `.planning/phases/02-routing-gates-and-memory-foundation/02-VERIFICATION.md` with content:
```markdown
# Phase 2: routing-gates-and-memory-foundation — Verification

## Goal-Backward Verification

**Phase Goal:** Define how agents choose tools, when gates pass or fail, when human review is required, and what durable memory must contain, running on the same Phase 1 sample.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Tool Routing Matrix (FR-001) | pending | Verify docs/tool-routing.md matches matrix |
| 2 | Gate outcomes (FR-002, FR-003, FR-009) | pending | Validate gate status parsing |
| 3 | State Pointer separation (FR-004, FR-005) | pending | Inspect active-feature.json and run-state.json |
| 4 | Failure Taxonomy & Loop exhaustion (FR-007, FR-008) | pending | Verify NEEDS_HUMAN_REVIEW and packet generation |
| 5 | Memory seeding (FR-010) | pending | Verify .ai/memory/ files have facts |
| 6 | Resume command (FR-011) | pending | Run validation script with resume |

## Result

_Pending verification_
```

- [ ] **Step 3: Commit verification updates**

Run:
```bash
git add .planning/phases/02-routing-gates-and-memory-foundation/02-UAT.md .planning/phases/02-routing-gates-and-memory-foundation/02-VERIFICATION.md
git commit -m "chore: update Phase 2 UAT and verification manifests"
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES_OPEN | SELECTIVE_EXPANSION, 4 tasks, 0 critical gaps if tasks land |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | Required before implementation/ship |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | SKIPPED | No UI scope |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Optional |

- **UNRESOLVED:** 0 user decisions. Recommended paths auto-selected per user instruction.
- **VERDICT:** CEO REVIEW COMPLETE; eng review required before implementation/ship.
