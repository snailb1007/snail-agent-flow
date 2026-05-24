#!/usr/bin/env bash
# Validation helper script to assert gates and memory state
set -euo pipefail

# Set paths
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SPECIFY_AI_DIR="${SPECIFY_AI_DIR:-$REPO_ROOT/.ai}"
STATE_FILE="${SPECIFY_STATE_FILE:-$SPECIFY_AI_DIR/state/active-feature.json}"

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
    FEATURE_SLUG=$(grep -o '"feature_slug"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" | cut -d'"' -f4)
    SPEC_PATH=$(grep -o '"spec_path"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" | cut -d'"' -f4)
fi

if [ -z "${FEATURE_SLUG:-}" ] || [ -z "${SPEC_PATH:-}" ]; then
    echo "ERROR: Failed to parse feature_slug or spec_path from $STATE_FILE" >&2
    exit 1
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
VAL_REPORT="$SPECIFY_AI_DIR/reviews/$FEATURE_SLUG/spec-validation-report.md"
echo "[validator] Checking spec validation report: $VAL_REPORT"
if [ ! -f "$VAL_REPORT" ]; then
    echo "ERROR: Validation gate report missing. Run validation first." >&2
    exit 1
fi

if ! grep -q -i "^Status:[[:space:]]*PASS$" "$VAL_REPORT"; then
    echo "ERROR: Spec validation report does not show PASS status." >&2
    exit 1
fi

# Check memory handoff completion status
HANDOFF_FILE="$SPECIFY_AI_DIR/state/handoff.md"
echo "[validator] Checking memory handoff report: $HANDOFF_FILE"
if [ ! -f "$HANDOFF_FILE" ]; then
    echo "ERROR: Memory handoff report ($SPECIFY_AI_DIR/state/handoff.md) is missing." >&2
    exit 1
fi

if ! grep -q -i "^Memory Handoff Complete$" "$HANDOFF_FILE"; then
    echo "ERROR: Memory handoff is not marked as complete." >&2
    exit 1
fi

echo "[validator] SUCCESS: All gates and memory handoff verified."
exit 0
