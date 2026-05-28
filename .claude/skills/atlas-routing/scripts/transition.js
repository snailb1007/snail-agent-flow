'use strict';

const flowState = require('../../../../lib/flow-state');

function resolveNext(state) {
  const stages = ['align', 'trace', 'lay', 'act', 'settle'];
  const currentIdx = stages.indexOf(state.stage);

  if (state.status === 'done') {
    return { nextStage: null, skipped: [] };
  }

  let nextIdx = currentIdx + 1;
  const skipped = [];

  // Handle align -> trace quick transition for FAST
  if (state.stage === 'align' && state.risk_profile === 'FAST') {
    skipped.push('align-gate');
  }

  // FAST profile skips S2 PR check step
  if (state.risk_profile === 'FAST') {
    skipped.push('settle.pr-check');
  }

  // Loop to resolve skipped stages/steps based on profile + mode rules
  while (nextIdx < stages.length) {
    const stage = stages[nextIdx];

    if (stage === 'lay') {
      if (state.work_mode === 'DOCS') {
        // DOCS mode skips test setup in Lay
        skipped.push('lay.test-setup');
      }
    }

    if (stage === 'act') {
      if (state.work_mode === 'DOCS') {
        // DOCS mode skips Act coding iterations entirely
        skipped.push('act');
        nextIdx++;
        continue;
      }
    }

    break;
  }

  const nextStage = nextIdx < stages.length ? stages[nextIdx] : null;

  return { nextStage, skipped };
}

function main() {
  try {
    const repoRoot = process.argv[2] || process.cwd();
    const state = flowState.load(repoRoot);
    if (!state) {
      const output = {
        stage_id: 'align',
        status: 'FAIL',
        blocking: ['No flow state found.'],
        warnings: [],
        artifacts_produced: []
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    const { nextStage, skipped } = resolveNext(state);

    if (nextStage) {
      flowState.setStage(state, nextStage);
      flowState.save(repoRoot, state);
    } else {
      state.status = 'done';
      flowState.save(repoRoot, state);
    }

    const output = {
      stage_id: state.stage,
      next_stage: nextStage,
      skipped_steps: skipped,
      status: 'PASS',
      blocking: [],
      warnings: [],
      artifacts_produced: ['.ai/state/flow-state.json']
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(0);

  } catch (err) {
    const output = {
      stage_id: 'align',
      status: 'FAIL',
      blocking: [err.message],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { resolveNext };
