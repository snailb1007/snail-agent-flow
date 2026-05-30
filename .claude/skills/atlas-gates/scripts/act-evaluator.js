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

const { resolvePath } = requireLib('artifact-paths');

let flowState;
try {
  flowState = requireLib('flow-state');
} catch (e) {
  // Fallback if lib/flow-state.js is not yet present on this isolated subagent branch
  flowState = {
    load: (repoRoot) => {
      let resolved;
      try {
        resolved = resolvePath('flow_state');
      } catch (err) {
        resolved = '.ai/state/flow-state.json';
      }
      const statePath = path.isAbsolute(resolved) ? resolved : path.join(repoRoot, resolved);
      if (!fs.existsSync(statePath)) {
        return null;
      }
      try {
        return JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (err) {
        return null;
      }
    }
  };
}

function main() {
  const repoRoot = process.argv[2] || process.cwd();
  const state = flowState.load(repoRoot);

  if (!state) {
    console.error('No flow state found.');
    process.exit(1);
  }

  const blocking = [];
  const warnings = [];

  // Determine active profile / mode
  const workMode = state.work_mode || 'FEATURE';
  const riskProfile = state.risk_profile || 'STANDARD';

  let profile = riskProfile;
  let cap = 5;

  if (workMode === 'BUGFIX' || workMode === 'PROTOTYPE') {
    profile = workMode;
    cap = 5;
  } else {
    switch (riskProfile) {
      case 'FAST':
        cap = 3;
        break;
      case 'STANDARD':
        cap = 5;
        break;
      case 'FULL':
        cap = 8;
        break;
      default:
        cap = 5;
        break;
    }
  }

  // 1. Check attempt cap
  const attempt = typeof state.attempt === 'number' ? state.attempt : 1;
  if (attempt > cap) {
    blocking.push(`Execution attempt count (${attempt}) has exceeded the cap (${cap}) for the ${profile} profile.`);
  }

  // 2. Check for stuck state (consecutive failures)
  const consecutiveFailures = typeof state.consecutive_failures === 'number' ? state.consecutive_failures : 0;
  if (consecutiveFailures >= 2) {
    warnings.push(`Stuck state warning: ${consecutiveFailures} consecutive failures detected.`);
  }

  const status = blocking.length === 0 ? 'PASS' : 'BLOCKED';
  const gateResult = {
    stage_id: 'act',
    status: status,
    blocking: blocking,
    warnings: warnings,
    artifacts_produced: []
  };

  console.log(JSON.stringify(gateResult, null, 2));
  process.exit(status === 'PASS' ? 0 : 1);
}

if (require.main === module) {
  main();
}
