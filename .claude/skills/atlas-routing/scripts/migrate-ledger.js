'use strict';

const fs = require('fs');
const path = require('path');
const flowState = require('../../../../lib/flow-state');

function migrate(repoRoot) {
  const statePath = path.join(repoRoot, '.ai', 'state', 'flow-state.json');
  const ledgerPath = path.join(repoRoot, '.ai', 'state', 'flow-ledger.json');
  const runStatePath = path.join(repoRoot, '.ai', 'state', 'run-state.json');

  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (state.schema_version === '2.0') {
        console.log('Flow state is already v2.0. No migration needed.');
        return;
      }
    } catch (e) {
      // If corrupt, overwrite/migrate
    }
  }

  if (!fs.existsSync(ledgerPath)) {
    console.log('No flow-ledger.json found. Skipping migration.');
    return;
  }

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  let runState = {};
  if (fs.existsSync(runStatePath)) {
    try {
      runState = JSON.parse(fs.readFileSync(runStatePath, 'utf8'));
    } catch (e) {}
  }

  // Map v1 stage ID to v2 stage ID
  const stageMapping = {
    'decision_discovery': 'align',
    'decision_challenge': 'align',
    'canonical_spec': 'trace',
    'implementation_plan': 'trace',
    'plan_critique': 'trace',
    'revision_loop': 'trace',
    'vertical_slicing': 'trace',
    'execution': 'act',
    'verification': 'settle',
    'release_readiness': 'settle'
  };

  const v2Stage = stageMapping[ledger.current_stage] || 'align';

  // Extract completed steps from stages status
  const completedSteps = [];
  if (ledger.stages) {
    for (const stg of ledger.stages) {
      if (stg.status === 'done') {
        completedSteps.push(`${stageMapping[stg.id] || stg.id}.complete`);
      }
    }
  }

  const v2State = {
    schema_version: '2.0',
    run_id: runState.run_id || 'run_' + Math.random().toString(36).substr(2, 9),
    feature_slug: ledger.feature_slug || path.basename(ledger.flow_definition_path || 'unknown').replace('-flow.yaml', ''),
    risk_profile: runState.risk_profile || 'STANDARD',
    work_mode: runState.work_mode || 'FEATURE',
    stage: v2Stage,
    status: ledger.status || 'running',
    attempt: runState.attempt || 1,
    last_verified_commit: runState.last_verified_commit || '',
    completed_steps: completedSteps,
    pending_step: ledger.current_stage ? `${v2Stage}.pending` : '',
    locks: [],
    signals: [],
    last_gate: runState.last_gate || null,
    last_gate_status: runState.last_gate_status || null,
    consecutive_failures: runState.consecutive_failures || 0,
    retry_count: runState.retry_count || 0,
    verified_artifacts: [],
    revision_history: ledger.revision_history || []
  };

  flowState.save(repoRoot, v2State);
  console.log('Migration complete: converted flow-ledger.json to flow-state.json.');
}

if (require.main === module) {
  const repoRoot = process.argv[2] || process.cwd();
  migrate(repoRoot);
}

module.exports = { migrate };
