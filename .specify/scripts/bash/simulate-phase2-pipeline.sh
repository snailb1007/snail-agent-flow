#!/usr/bin/env bash
# End-to-end pipeline simulation to verify Phase 2 gates, retries, and checks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Define sandbox folder for reviews, states, and logs
SANDBOX_AI_DIR="$REPO_ROOT/.specify/fixtures/phase2-sandbox/.ai"
export SPECIFY_AI_DIR="$SANDBOX_AI_DIR"
export SPECIFY_STATE_FILE="$SANDBOX_AI_DIR/feature.json"

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
