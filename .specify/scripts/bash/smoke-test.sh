#!/usr/bin/env bash
# Smoke test for minimal golden path behavior
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

FIXTURE_DIR="$REPO_ROOT/.specify/fixtures/minimal-golden-path"
MOCK_STATE="$FIXTURE_DIR/feature.json"
SESSION_LOG="$REPO_ROOT/.ai/sessions/smoke-test-run.log"

export SPECIFY_AI_DIR="$FIXTURE_DIR/.ai"

# Setup trap for guaranteed cleanup of the sandbox directory
cleanup() {
    echo "[smoke-test] Cleaning up staged test files..."
    if [[ -n "${SPECIFY_AI_DIR:-}" && "$SPECIFY_AI_DIR" == *"minimal-golden-path"* ]]; then
        rm -rf "$SPECIFY_AI_DIR"
    else
        echo "WARNING: Cleanup safety guard triggered. SPECIFY_AI_DIR ($SPECIFY_AI_DIR) was not deleted." >&2
    fi
}
trap cleanup EXIT

# Ensure session dir exists
mkdir -p "$REPO_ROOT/.ai/sessions"

echo "=== Running Minimal Golden Path Smoke Test ===" | tee "$SESSION_LOG"

# Set override environment variables to use mock fixtures
export SPECIFY_STATE_FILE="$MOCK_STATE"

# Stage A: Verify initial block when reviews and handoff are missing
echo "[smoke-test] 1. Running validation with missing review and handoff files..." | tee -a "$SESSION_LOG"

# Ensure sandbox is clean initially
rm -rf "$SPECIFY_AI_DIR"

if "$SCRIPT_DIR/validate-gates-and-memory.sh" 2>&1 | tee -a "$SESSION_LOG"; then
    echo "FAIL: Expected validation script to exit with failure code 1, but it succeeded." | tee -a "$SESSION_LOG"
    exit 1
else
    echo "PASS: Validation script correctly blocked because gates are incomplete." | tee -a "$SESSION_LOG"
fi

# Stage B: Setup dummy verification pass
echo "[smoke-test] 2. Staging dummy validation pass and memory handoff..." | tee -a "$SESSION_LOG"
mkdir -p "$SPECIFY_AI_DIR/reviews/000-fixture-feature"
echo "Status: PASS" > "$SPECIFY_AI_DIR/reviews/000-fixture-feature/spec-validation-report.md"
mkdir -p "$SPECIFY_AI_DIR/state"
echo "Memory Handoff Complete" > "$SPECIFY_AI_DIR/state/handoff.md"

# Run validator again
if "$SCRIPT_DIR/validate-gates-and-memory.sh" 2>&1 | tee -a "$SESSION_LOG"; then
    echo "PASS: Validation script correctly succeeded after staging mock gates." | tee -a "$SESSION_LOG"
else
    echo "FAIL: Expected validation script to pass, but it failed." | tee -a "$SESSION_LOG"
    exit 1
fi

echo "=== Smoke Test Completed Successfully ===" | tee -a "$SESSION_LOG"
exit 0
