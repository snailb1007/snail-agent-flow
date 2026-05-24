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
import json, time, sys
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
    for path in "$REPO_ROOT/.specify/specs" "$SPECIFY_AI_DIR/specs"; do
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
