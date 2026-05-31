#requires -Version 5.1
<#
  Snail Agent Flow - one-command onboarding for a target project (Windows).
  Run from your PROJECT ROOT (where you ran `npm install ... snail-agent-flow`):

    pwsh node_modules/snail-agent-flow/scripts/saf-onboard.ps1
    # or: powershell -ExecutionPolicy Bypass -File node_modules/snail-agent-flow/scripts/saf-onboard.ps1

  Fail-fast: gstack check -> snapshot -> init -> prove non-intrusive -> doctor.
#>
$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host "`n[saf-onboard] $m" -ForegroundColor White }
function Fail ($m) { Write-Host "[saf-onboard] $m" -ForegroundColor Red; exit 1 }

# 1. Prerequisite: gstack
Say 'Checking gstack...'
$gstackBin = Join-Path $HOME '.claude/skills/gstack/bin'
if (Test-Path $gstackBin) {
  Write-Host '  gstack: OK'
} else {
  Write-Host '  gstack: MISSING'
  Write-Host '  Install it, then re-run this script:'
  Write-Host '    git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack'
  Write-Host '    cd ~/.claude/skills/gstack; ./setup --team'
  Fail 'gstack is required.'
}

# 2. Resolve the saf CLI (prefer local install)
$localSaf = Join-Path 'node_modules/.bin' 'saf.cmd'
if (Test-Path $localSaf) {
  $Saf = $localSaf
} elseif (Get-Command saf -ErrorAction SilentlyContinue) {
  $Saf = 'saf'
} else {
  Fail "'saf' not found. Install first:  npm install --save-dev ./snail-agent-flow-*.tgz"
}
Write-Host "  using CLI: $Saf"

# 3. Snapshot team instruction files BEFORE init
Say 'Snapshotting team instruction files...'
$snap = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("saf-onboard-" + [System.Guid]::NewGuid().ToString('N')))
$instructionFiles = @('CLAUDE.md', 'GEMINI.md', 'AGENTS.md')
foreach ($f in $instructionFiles) {
  if (Test-Path $f) { Copy-Item $f (Join-Path $snap $f); Write-Host "  snapshot: $f" }
}

try {
  # 4. Initialize (non-intrusive smart-default)
  Say 'Running saf init...'
  & $Saf init
  if ($LASTEXITCODE -ne 0) { Fail "saf init exited with code $LASTEXITCODE" }

  # 5. Verify the non-intrusive guarantee
  Say 'Verifying non-intrusive guarantee...'
  $violated = $false
  foreach ($f in $instructionFiles) {
    $snapFile = Join-Path $snap $f
    if (Test-Path $snapFile) {
      $before = Get-FileHash $snapFile -Algorithm SHA256
      $after  = Get-FileHash $f        -Algorithm SHA256
      if ($before.Hash -eq $after.Hash) { Write-Host "  ${f}: unchanged [OK]" }
      else { Write-Host "  ${f}: MODIFIED [X]"; $violated = $true }
    }
  }
  if ($violated) { Fail 'init mutated a pre-existing instruction file - stopping.' }

  # 6. Strict verification gate
  Say 'Running saf doctor...'
  & $Saf doctor
  if ($LASTEXITCODE -ne 0) { Fail "saf doctor exited with code $LASTEXITCODE" }
}
finally {
  Remove-Item $snap -Recurse -Force -ErrorAction SilentlyContinue
}

Say 'Onboarding scaffold ready. Next steps:'
@'
  1. Review the footprint:   git status   (team CLAUDE.md/AGENTS.md must be unchanged)
  2. SAF guidance lives in:  .ai/instructions/ATLAS.md  (when your files pre-existed)
  3. Commit the scaffold on a branch and open a PR for the team to review.
  4. Start a first small feature:
       npx saf feature "small, low-risk feature"
       npx saf validate-spec
'@ | Write-Host
