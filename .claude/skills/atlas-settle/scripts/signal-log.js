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

const flowState = requireLib('flow-state');
const signalLogger = requireLib('signal-logger');
const { resolvePath } = requireLib('artifact-paths');

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
