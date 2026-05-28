'use strict';

const path = require('path');
const fs = require('fs');
const flowState = require('../../../../lib/flow-state');
const { ClaimManager } = require('../../../../lib/claim-manager');
const { LeaseManager } = require('../../../../lib/lease-manager');
const { resolvePath } = require('../../../../lib/artifact-paths');

function main() {
  const repoRoot = process.argv[2] || process.cwd();
  const state = flowState.load(repoRoot);

  if (!state) {
    console.error('No flow state found.');
    process.exit(1);
  }

  const featureSlug = state.feature_slug;
  const owner = 'agent';

  const claimsDir = path.isAbsolute(resolvePath('claims_dir'))
    ? resolvePath('claims_dir')
    : path.join(repoRoot, resolvePath('claims_dir'));

  const locksDir = path.isAbsolute(resolvePath('locks_dir'))
    ? resolvePath('locks_dir')
    : path.join(repoRoot, resolvePath('locks_dir'));

  const claimMgr = new ClaimManager(claimsDir);
  const leaseMgr = new LeaseManager(locksDir);

  // 1. Release active file leases
  let leasesReleased = 0;
  if (state.locks && state.locks.length > 0) {
    for (const lock of state.locks) {
      try {
        const absoluteFilePath = path.isAbsolute(lock.file) ? lock.file : path.resolve(repoRoot, lock.file);
        leaseMgr.release(absoluteFilePath, owner);
        leasesReleased++;
      } catch (e) {}
    }
    state.locks = [];
  }

  // 2. Release work claims
  let claimReleased = false;
  try {
    claimReleased = claimMgr.release(featureSlug, owner);
  } catch (e) {}

  flowState.save(repoRoot, state);

  const gateResult = {
    stage_id: 'settle',
    status: 'PASS',
    blocking: [],
    warnings: [],
    artifacts_produced: []
  };

  console.log(JSON.stringify(gateResult, null, 2));
}

if (require.main === module) {
  main();
}
