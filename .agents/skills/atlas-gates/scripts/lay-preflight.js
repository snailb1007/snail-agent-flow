'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePath } = require('../../../../lib/artifact-paths');

let flowState;
try {
  flowState = require('../../../../lib/flow-state');
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

  // 1. Check last_verified_commit
  if (!state.last_verified_commit) {
    blocking.push('Pre-execution base commit hash (last_verified_commit) is not recorded.');
  }

  // 2. Check leases/locks
  if (!state.locks || state.locks.length === 0) {
    blocking.push('No active file advisory leases acquired in flow state.');
  }

  // 3. Check for unit/validation test file
  const testDirs = [
    path.join(repoRoot, 'validators', 'scripts'),
    path.join(repoRoot, 'tests')
  ];
  let testExists = false;
  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        if (files.some(f => f.startsWith('test-') && f.endsWith('.js'))) {
          testExists = true;
          break;
        }
      } catch (e) {
        // Directory read error, ignore
      }
    }
  }

  if (!testExists) {
    blocking.push('No unit or validation test file detected.');
  }

  const status = blocking.length === 0 ? 'PASS' : 'FAIL';
  const gateResult = {
    stage_id: 'lay',
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
