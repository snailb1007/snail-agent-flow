'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const flowStateMod = require('./flow-state');

function getGitRepoRoot() {
  try {
    return runGit(null, ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function runGit(repoRoot, args, options = {}) {
  const execOptions = Object.assign({}, options);
  if (repoRoot) {
    execOptions.cwd = repoRoot;
  }
  return execFileSync('git', args, execOptions);
}

function getActiveFeatureSlug(repoRoot) {
  try {
    const state = flowStateMod.load(repoRoot);
    if (state && state.feature_slug) {
      return state.feature_slug;
    }
  } catch (e) {
    // Ignore and fallback
  }

  try {
    const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');
    if (fs.existsSync(specifyFeaturePath)) {
      const raw = JSON.parse(fs.readFileSync(specifyFeaturePath, 'utf8'));
      if (raw.feature_directory) {
        return path.basename(raw.feature_directory.replace(/\/+$/, ''));
      }
    }
  } catch (e) {
    // Ignore
  }

  return 'unknown-feature';
}

function getActiveStage(repoRoot) {
  try {
    const state = flowStateMod.load(repoRoot);
    if (state && state.stage) {
      return state.stage;
    }
  } catch (e) {
    // Ignore
  }
  return 'act';
}

function checkGitOrExit(repoRoot) {
  try {
    runGit(repoRoot, ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  } catch (e) {
    console.error('Error: Not a git repository or git command failed.');
    process.exit(1);
  }
}

function loadCheckpoints(repoRoot) {
  const dbPath = path.join(repoRoot, '.ai/state/act-checkpoints.json');
  if (!fs.existsSync(dbPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveCheckpoints(repoRoot, checkpoints) {
  const dbPath = path.join(repoRoot, '.ai/state/act-checkpoints.json');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(checkpoints, null, 2), 'utf8');
}

function handleSnapshot(repoRoot, cmdArgs) {
  checkGitOrExit(repoRoot);

  let label = '';
  let list = false;

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--label') {
      label = cmdArgs[++i];
    } else if (arg === '--list') {
      list = true;
    } else if (arg.startsWith('--')) {
      console.error(`Error: Unknown flag "${arg}"`);
      process.exit(1);
    }
  }

  const featureSlug = getActiveFeatureSlug(repoRoot);

  if (list) {
    const checkpoints = loadCheckpoints(repoRoot).filter(c => c.feature_slug === featureSlug);
    if (checkpoints.length === 0) {
      console.log(`No Act checkpoints found for feature "${featureSlug}".`);
      return;
    }
    console.log(`Act Checkpoints for feature "${featureSlug}":`);
    console.log('----------------------------------------------------');
    for (const cp of checkpoints) {
      console.log(`ID: ${cp.id} | SHA: ${cp.sha.substring(0, 7)} | Stage: ${cp.stage} | Created: ${cp.created_at}${cp.label ? ` | Label: ${cp.label}` : ''}`);
    }
    return;
  }

  // Create snapshot
  // Check if there are changes (git status --porcelain)
  const statusOut = runGit(repoRoot, ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  let sha = '';
  // type distinguishes a plain HEAD commit ('head') from a stash-shaped commit
  // ('stash'); restore needs it because only stash commits work with stash apply.
  let type = 'head';
  if (!statusOut) {
    // No changes, use HEAD SHA
    sha = runGit(repoRoot, ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    console.log('[snapshot] No changes in working tree. Using HEAD commit as checkpoint.');
  } else {
    // Create stash commit
    sha = runGit(repoRoot, ['stash', 'create'], { encoding: 'utf8' }).trim();
    if (!sha) {
      // Fallback
      sha = runGit(repoRoot, ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    } else {
      type = 'stash';
    }
  }

  const checkpoints = loadCheckpoints(repoRoot);
  const nextId = checkpoints.length > 0 ? Math.max(...checkpoints.map(c => c.id)) + 1 : 1;
  const stage = getActiveStage(repoRoot);

  const newCheckpoint = {
    id: nextId,
    sha,
    type,
    label: label || null,
    stage,
    feature_slug: featureSlug,
    created_at: new Date().toISOString()
  };

  checkpoints.push(newCheckpoint);
  saveCheckpoints(repoRoot, checkpoints);

  // Sync to flow-state act_snapshots
  try {
    const state = flowStateMod.load(repoRoot);
    if (state) {
      if (!state.act_snapshots) state.act_snapshots = [];
      state.act_snapshots.push({ id: nextId, sha, created_at: newCheckpoint.created_at });
      flowStateMod.save(repoRoot, state);
    }
  } catch (syncErr) {
    // Ignore or warn
  }

  console.log(`[snapshot] Created checkpoint ID ${nextId} (SHA: ${sha.substring(0, 7)}) for feature "${featureSlug}".`);
}

function handleRestore(repoRoot, cmdArgs) {
  checkGitOrExit(repoRoot);

  let id = null;
  let hard = false;
  let yes = false;

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--hard') {
      hard = true;
    } else if (arg === '--yes') {
      yes = true;
    } else if (arg.startsWith('--')) {
      console.error(`Error: Unknown flag "${arg}"`);
      process.exit(1);
    } else {
      id = parseInt(arg, 10);
    }
  }

  if (id === null || isNaN(id)) {
    console.error('Error: Missing or invalid checkpoint ID. Usage: adp restore <id> [--hard] [--yes]');
    process.exit(1);
  }

  const checkpoints = loadCheckpoints(repoRoot);
  const cp = checkpoints.find(c => c.id === id);

  if (!cp) {
    console.error(`Error: Checkpoint ID ${id} not found.`);
    process.exit(1);
  }

  if (hard) {
    if (!yes) {
      console.log('WARNING: --hard restore will reset your working tree and discard ALL unstaged/staged changes.');
      console.log('Are you sure you want to proceed? Run with --yes to confirm.');
      process.exit(1);
    }
    console.log(`[restore] Hard resetting working tree to checkpoint ${id} (SHA: ${cp.sha.substring(0, 7)})...`);
    runGit(repoRoot, ['reset', '--hard', cp.sha], { stdio: 'inherit' });
  } else {
    // Legacy checkpoints (pre-`type`) recorded a stash commit when changes existed;
    // default to 'stash' so they keep applying as before.
    const cpType = cp.type || 'stash';
    if (cpType === 'head') {
      console.log(`[restore] Checkpoint ${id} (SHA: ${cp.sha.substring(0, 7)}) captured a clean working tree — no changes to apply.`);
      console.log('[restore] To reset the working tree to that commit, re-run with --hard.');
      return;
    }
    console.log(`[restore] Applying checkpoint ${id} (SHA: ${cp.sha.substring(0, 7)}) non-destructively...`);
    try {
      runGit(repoRoot, ['stash', 'apply', cp.sha], { stdio: 'inherit' });
    } catch (applyErr) {
      console.warn('[restore] Warning: git stash apply failed (conflicts, or the checkpoint is not a stash-shaped commit). Resolve manually or re-run with --hard.');
    }
  }
}

module.exports = {
  handleSnapshot,
  handleRestore,
  runGit
};
