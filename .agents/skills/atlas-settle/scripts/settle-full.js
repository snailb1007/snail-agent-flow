'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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
    const { execSync: execSyncLocal } = require('child_process');
    let cmdPath = '';
    try {
      cmdPath = execSyncLocal('which adp', { encoding: 'utf8', stdio: [] }).trim();
    } catch (e) {
      try {
        cmdPath = execSyncLocal('which saf', { encoding: 'utf8', stdio: [] }).trim();
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

/**
 * Resolve the verify command through a priority chain:
 * 1. CLI arg --cmd "..."
 * 2. flow-state.json verify_command field
 * 3. atlas-flow.yaml settle stage verify_command (simple regex parse)
 * 4. Default: npm test
 */
function resolveVerifyCommand(cmdArg, state, repoRoot) {
  // 1. CLI arg
  if (cmdArg) return cmdArg;

  // 2. flow-state field
  if (state && state.verify_command) return state.verify_command;

  // 3. Parse atlas-flow.yaml for settle stage verify_command
  const yamlPath = path.resolve(repoRoot, '.specify', 'templates', 'atlas-flow.yaml');
  if (fs.existsSync(yamlPath)) {
    try {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      // Simple regex: find verify_command under settle stage context
      // Look for the settle stage block, then a verify_command key
      const settleMatch = yamlContent.match(/- id:\s*settle[\s\S]*?(?=\n\s*- id:|$)/);
      if (settleMatch) {
        const vcMatch = settleMatch[0].match(/verify_command:\s*(.+)/);
        if (vcMatch) {
          const cmd = vcMatch[1].trim();
          if (cmd && cmd !== '""' && cmd !== "''") return cmd;
        }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // 4. Default
  return 'npm test';
}

function main() {
  const args = process.argv.slice(2);

  // Parse CLI flags
  let cmdArg = '';
  let repoRoot = process.cwd();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cmd' && i + 1 < args.length) {
      cmdArg = args[++i];
    } else {
      repoRoot = args[i];
    }
  }

  const blocking = [];
  const warnings = [];
  const artifactsProduced = [];

  // Load flow state
  let state;
  try {
    state = flowState.load(repoRoot);
  } catch (err) {
    const gateResult = {
      stage_id: 'settle',
      status: 'FAIL',
      blocking: ['Failed to load flow state: ' + err.message],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(1);
  }

  if (!state) {
    const gateResult = {
      stage_id: 'settle',
      status: 'FAIL',
      blocking: ['No flow state found.'],
      warnings: [],
      artifacts_produced: []
    };
    console.log(JSON.stringify(gateResult, null, 2));
    process.exit(1);
  }

  // Step 1: Verify
  const verifyCmd = resolveVerifyCommand(cmdArg, state, repoRoot);
  let verifySuccess = true;
  try {
    execSync(verifyCmd, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8' });
  } catch (err) {
    verifySuccess = false;
    const output = err.stdout || err.message;
    blocking.push('Verify command failed (' + verifyCmd + '): ' + output.substring(0, 500));
  }

  // Step 2: Signal log (run as child process)
  const signalLogScript = path.resolve(__dirname, 'signal-log.js');
  if (fs.existsSync(signalLogScript)) {
    try {
      const result = spawnSync(process.execPath, [signalLogScript, repoRoot], {
        cwd: repoRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      if (result.status === 0) {
        artifactsProduced.push('.ai/signals/current-period.jsonl');
      } else {
        warnings.push('signal-log.js exited with status ' + result.status);
      }
    } catch (e) {
      warnings.push('Failed to run signal-log.js: ' + e.message);
    }
  } else {
    warnings.push('signal-log.js not found at ' + signalLogScript);
  }

  // Step 3: Release locks (run as child process)
  const releaseLocksScript = path.resolve(__dirname, 'release-locks.js');
  if (fs.existsSync(releaseLocksScript)) {
    try {
      const result = spawnSync(process.execPath, [releaseLocksScript, repoRoot], {
        cwd: repoRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      if (result.status !== 0) {
        const releaseOutput = (result.stdout || result.stderr || '').trim();
        blocking.push(
          'release-locks.js exited with status ' + result.status +
          (releaseOutput ? ': ' + releaseOutput.substring(0, 500) : '')
        );
      }
    } catch (e) {
      blocking.push('Failed to run release-locks.js: ' + e.message);
    }
  } else {
    warnings.push('release-locks.js not found at ' + releaseLocksScript);
  }

  // Step 4: Mark done
  if (verifySuccess && blocking.length === 0) {
    // Reload state since release-locks.js may have modified it
    try {
      state = flowState.load(repoRoot) || state;
    } catch (e) { /* use existing state */ }
    state.status = 'done';
    state.stage = 'settle';
    if (!state.completed_steps) state.completed_steps = [];
    if (!state.completed_steps.includes('settle.verify')) {
      state.completed_steps.push('settle.verify');
    }
    if (!state.completed_steps.includes('settle.signal')) {
      state.completed_steps.push('settle.signal');
    }
    if (!state.completed_steps.includes('settle.release')) {
      state.completed_steps.push('settle.release');
    }
    try {
      flowState.save(repoRoot, state);
      artifactsProduced.push('.ai/state/flow-state.json');
    } catch (e) {
      blocking.push('Failed to save flow state: ' + e.message);
    }
  }

  const status = blocking.length === 0 ? 'PASS' : 'FAIL';
  const gateResult = {
    stage_id: 'settle',
    status: status,
    blocking: blocking,
    warnings: warnings,
    artifacts_produced: artifactsProduced
  };

  console.log(JSON.stringify(gateResult, null, 2));
  process.exit(status === 'PASS' ? 0 : 1);
}

if (require.main === module) {
  main();
}
