'use strict';

const fs = require('fs');
const path = require('path');
function requireLib(moduleName) {
  try {
    const relativePath = path.resolve(__dirname, '../../../../lib', moduleName);
    if (fs.existsSync(relativePath + '.js') || fs.existsSync(relativePath)) {
      return require(relativePath);
    }
  } catch (e) {}
  try {
    return require(`snail-agent-flow/lib/${moduleName}`);
  } catch (e) {}
  try {
    const { execSync } = require('child_process');
    let cmdPath = '';
    try {
      cmdPath = execSync('which adp', { encoding: 'utf8', stdio: [] }).trim();
    } catch (e) {
      try {
        cmdPath = execSync('which saf', { encoding: 'utf8', stdio: [] }).trim();
      } catch (err) {}
    }
    if (cmdPath) {
      const realCmdPath = fs.realpathSync(cmdPath);
      const libPath = path.resolve(path.dirname(realCmdPath), '../lib', moduleName);
      if (fs.existsSync(libPath + '.js') || fs.existsSync(libPath)) {
        return require(libPath);
      }
    }
  } catch (e) {}
  try {
    const localNodeModulesLib = path.resolve(process.cwd(), 'node_modules/snail-agent-flow/lib', moduleName);
    if (fs.existsSync(localNodeModulesLib + '.js') || fs.existsSync(localNodeModulesLib)) {
      return require(localNodeModulesLib);
    }
  } catch (e) {}
  throw new Error(`[snail-agent-flow] Cannot find required library module: "${moduleName}". Please ensure snail-agent-flow is installed.`);
}

const scorer = requireLib('profile-scorer');
const { ClaimManager } = requireLib('claim-manager');
const flowState = requireLib('flow-state');
const { resolvePath } = requireLib('artifact-paths');

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    const gateResult = {
      stage_id: 'align',
      status: 'FAIL',
      blocking: ['Usage: node score-and-claim.js <task_json_or_file> [repoRoot]'],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(1);
  }

  const repoRoot = args[1] || process.cwd();

  let task;
  try {
    if (fs.existsSync(args[0])) {
      task = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    } else {
      task = JSON.parse(args[0]);
    }
  } catch (err) {
    const gateResult = {
      stage_id: 'align',
      status: 'FAIL',
      blocking: ['Failed to parse task JSON: ' + err.message],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(1);
  }

  try {
    // 1. Score task risk and select profile
    const scoreResult = scorer.score(task);

    // Determine work mode (default FEATURE, can be overridden)
    const workMode = task.workMode || task.override || 'FEATURE';

    // 2. Claim work unit
    const slug = task.slug || 'task-' + Date.now();
    const owner = task.owner || 'agent';

    let claimSuccess = false;
    let blocking = [];
    try {
      const claimsDir = resolvePath('claims_dir');
      const absClaimsDir = path.isAbsolute(claimsDir) ? claimsDir : path.join(repoRoot, claimsDir);
      if (!fs.existsSync(absClaimsDir)) {
        fs.mkdirSync(absClaimsDir, { recursive: true });
      }
      const claimManager = new ClaimManager(absClaimsDir);
      claimSuccess = claimManager.claim(slug, {
        owner,
        profile: scoreResult.profile,
        scope: task.writeScope || []
      });
    } catch (err) {
      claimSuccess = false;
      blocking.push('Failed to claim work unit ownership: ' + err.message);
    }

    // Git commit hash retrieval
    let commit = '';
    try {
      const { execSync } = require('child_process');
      commit = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
    } catch (e) {
      // ignore
    }

    // Write-scope file leasing
    const { LeaseManager } = requireLib('lease-manager');
    const locksDir = resolvePath('locks_dir');
    const absLocksDir = path.isAbsolute(locksDir) ? locksDir : path.join(repoRoot, locksDir);
    if (!fs.existsSync(absLocksDir)) {
      fs.mkdirSync(absLocksDir, { recursive: true });
    }
    const leaseManager = new LeaseManager(absLocksDir);

    let scope = task.writeScope || [];
    if (scope.length === 0) {
      const specMd = path.join('specs', slug, 'spec.md');
      const contextMd = path.join('.planning/phases', slug, 'CONTEXT.md');
      if (fs.existsSync(path.join(repoRoot, specMd))) {
        scope = [specMd];
      } else if (fs.existsSync(path.join(repoRoot, contextMd))) {
        scope = [contextMd];
      } else {
        scope = ['.specify/feature.json'];
      }
    }

    const acquiredLocks = [];
    let leaseSuccess = true;

    if (claimSuccess) {
      for (const f of scope) {
        try {
          const absoluteFilePath = path.isAbsolute(f) ? f : path.join(repoRoot, f);
          leaseManager.acquire(absoluteFilePath, { owner });
          acquiredLocks.push({
            file: path.isAbsolute(f) ? path.relative(repoRoot, f) : f,
            acquired_at: new Date().toISOString()
          });
        } catch (err) {
          leaseSuccess = false;
          blocking.push(`Failed to acquire lease on file '${f}': ${err.message}`);
          break;
        }
      }

      if (!leaseSuccess) {
        // Rollback claim
        try {
          const claimsDir = resolvePath('claims_dir');
          const absClaimsDir = path.isAbsolute(claimsDir) ? claimsDir : path.join(repoRoot, claimsDir);
          const claimManager = new ClaimManager(absClaimsDir);
          claimManager.release(slug, owner);
        } catch (e) {}
        // Rollback acquired leases
        for (const lock of acquiredLocks) {
          try {
            const absoluteFilePath = path.isAbsolute(lock.file) ? lock.file : path.join(repoRoot, lock.file);
            leaseManager.release(absoluteFilePath, owner);
          } catch (e) {}
        }
        claimSuccess = false;
      }
    }

    // 3. Initialize/Load flow state
    let state = flowState.load(repoRoot);
    if (!state) {
      state = {
        schema_version: '2.0',
        run_id: 'run_' + Math.random().toString(36).substring(2, 11),
        feature_slug: slug,
        risk_profile: scoreResult.profile,
        work_mode: workMode,
        stage: 'align',
        status: 'running',
        attempt: 1,
        last_verified_commit: commit || 'unknown',
        completed_steps: ['align.score'],
        pending_step: 'align.claim',
        locks: acquiredLocks,
        signals: [],
        consecutive_failures: 0,
        retry_count: 0,
        verified_artifacts: []
      };
    } else {
      state.risk_profile = scoreResult.profile;
      state.work_mode = workMode;
      state.feature_slug = slug;
      state.last_verified_commit = commit || state.last_verified_commit || 'unknown';
      state.locks = acquiredLocks;
      if (!state.completed_steps.includes('align.score')) {
        state.completed_steps.push('align.score');
      }
    }

    if (claimSuccess) {
      if (!state.completed_steps.includes('align.claim')) {
        state.completed_steps.push('align.claim');
      }
      state.pending_step = '';
    }

    flowState.save(repoRoot, state);

    const gateResult = {
      stage_id: 'align',
      status: claimSuccess ? 'PASS' : 'FAIL',
      blocking: blocking,
      warnings: [],
      artifacts_produced: [
        path.join('.ai', 'claims', `${slug}.json`),
        '.ai/state/flow-state.json'
      ]
    };

    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(claimSuccess ? 0 : 1);

  } catch (err) {
    const gateResult = {
      stage_id: 'align',
      status: 'FAIL',
      blocking: [err.message],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
