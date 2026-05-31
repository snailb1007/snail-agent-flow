#!/usr/bin/env bash
#
# Snail Agent Flow — one-command onboarding for a target project.
# Run from your PROJECT ROOT (where you ran `npm install ... snail-agent-flow`):
#
#   bash node_modules/snail-agent-flow/scripts/saf-onboard.sh
#
# It is fail-fast: gstack check -> snapshot -> init -> prove non-intrusive -> doctor.
set -euo pipefail

say()  { printf '\n\033[1m[saf-onboard] %s\033[0m\n' "$1"; }
fail() { printf '\033[31m[saf-onboard] %s\033[0m\n' "$1" >&2; exit 1; }

# 1. Prerequisite: gstack (required by this protocol)
say "Checking gstack..."
if [ -d "$HOME/.claude/skills/gstack/bin" ]; then
  echo "  gstack: OK"
else
  echo "  gstack: MISSING"
  echo "  Install it, then re-run this script:"
  echo "    git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack"
  echo "    (cd ~/.claude/skills/gstack && ./setup --team)"
  fail "gstack is required."
fi

# 2. Resolve the saf CLI (prefer the local install in this project)
if [ -x "node_modules/.bin/saf" ]; then
  SAF="node_modules/.bin/saf"
elif command -v saf >/dev/null 2>&1; then
  SAF="saf"
else
  fail "'saf' not found. Install first:  npm install --save-dev ./snail-agent-flow-*.tgz"
fi
echo "  using CLI: $SAF"

# 3. Snapshot team instruction files BEFORE init, to prove non-intrusive afterwards
say "Snapshotting team instruction files..."
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"' EXIT
for f in CLAUDE.md GEMINI.md AGENTS.md; do
  [ -f "$f" ] && cp "$f" "$SNAP/$f" && echo "  snapshot: $f" || true
done

# 4. Initialize (non-intrusive smart-default)
say "Running saf init..."
"$SAF" init

# 5. Verify the non-intrusive guarantee: pre-existing files must be byte-identical
say "Verifying non-intrusive guarantee..."
violated=0
for f in CLAUDE.md GEMINI.md AGENTS.md; do
  if [ -f "$SNAP/$f" ]; then
    if diff -q "$SNAP/$f" "$f" >/dev/null 2>&1; then
      echo "  $f: unchanged ✓"
    else
      echo "  $f: MODIFIED ✗"
      violated=1
    fi
  fi
done
[ "$violated" -eq 0 ] || fail "init mutated a pre-existing instruction file — stopping."

# 6. Strict verification gate
say "Running saf doctor..."
"$SAF" doctor

say "Onboarding scaffold ready. Next steps:"
cat <<'EOF'
  1. Review the footprint:   git status   (team CLAUDE.md/AGENTS.md must be unchanged)
  2. SAF guidance lives in:  .ai/instructions/ATLAS.md  (when your files pre-existed)
  3. Commit the scaffold on a branch and open a PR for the team to review.
  4. Start a first small feature:
       npx saf feature "small, low-risk feature"
       npx saf validate-spec
EOF
