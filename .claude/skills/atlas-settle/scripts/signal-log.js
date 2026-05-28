'use strict';

const fs = require('fs');
const path = require('path');
const flowState = require('../../../../lib/flow-state');
const signalLogger = require('../../../../lib/signal-logger');
const { resolvePath } = require('../../../../lib/artifact-paths');

function main() {
  const repoRoot = process.argv[2] || process.cwd();
  const state = flowState.load(repoRoot);

  if (!state) {
    console.error('No flow state found.');
    process.exit(1);
  }

  const signalsDir = path.join(repoRoot, '.ai', 'signals');

  // 1. Log using the signal-logger utility (writes to Markdown)
  try {
    signalLogger.logSignal('revision_count', state.attempt || 1, 'Final attempt count for feature', signalsDir);
  } catch (e) {
    console.error('Failed to log revision_count to md:', e);
  }

  // 2. Also log JSONL entries conforming to entities.schema.json
  try {
    const signalsFilePath = path.isAbsolute(resolvePath('signals_file'))
      ? resolvePath('signals_file')
      : path.join(repoRoot, resolvePath('signals_file'));

    const dir = path.dirname(signalsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const entries = [
      {
        type: 'revision_count',
        value: state.attempt || 1,
        reason: 'Final attempt count for feature',
        timestamp
      }
    ];

    for (const entry of entries) {
      fs.appendFileSync(signalsFilePath, JSON.stringify(entry) + '\n', 'utf8');
    }
  } catch (e) {
    console.error('Failed to append to signals JSONL file:', e);
  }

  const gateResult = {
    stage_id: 'settle',
    status: 'PASS',
    blocking: [],
    warnings: [],
    artifacts_produced: ['.ai/signals/current-period.jsonl']
  };

  console.log(JSON.stringify(gateResult, null, 2));
}

if (require.main === module) {
  main();
}
