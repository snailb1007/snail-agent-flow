'use strict';

const fs = require('fs');
const path = require('path');
const scorer = require('../../../../lib/profile-scorer');
const { ClaimManager } = require('../../../../lib/claim-manager');
const flowState = require('../../../../lib/flow-state');
const { resolvePath } = require('../../../../lib/artifact-paths');

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
        last_verified_commit: '',
        completed_steps: ['align.score'],
        pending_step: 'align.claim',
        locks: [],
        signals: [],
        consecutive_failures: 0,
        retry_count: 0,
        verified_artifacts: []
      };
    } else {
      state.risk_profile = scoreResult.profile;
      state.work_mode = workMode;
      state.feature_slug = slug;
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
