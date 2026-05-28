'use strict';

const path = require('path');
const fs = require('fs');
const flowState = require('../../../../lib/flow-state');
const { ClaimManager } = require('../../../../lib/claim-manager');
const { LeaseManager } = require('../../../../lib/lease-manager');
const { resolvePath } = require('../../../../lib/artifact-paths');

function main() {
  const repoRoot = process.argv[2] || process.cwd();
  
  let state;
  try {
    state = flowState.load(repoRoot);
  } catch (err) {
    const gateResult = {
      stage_id: 'settle',
      status: 'FAIL',
      blocking: [`Failed to load flow state: ${err.message}`],
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

  const featureSlug = state.feature_slug;
  const claimsDir = path.isAbsolute(resolvePath('claims_dir'))
    ? resolvePath('claims_dir')
    : path.join(repoRoot, resolvePath('claims_dir'));

  const locksDir = path.isAbsolute(resolvePath('locks_dir'))
    ? resolvePath('locks_dir')
    : path.join(repoRoot, resolvePath('locks_dir'));

  const claimMgr = new ClaimManager(claimsDir);
  const leaseMgr = new LeaseManager(locksDir);

  // Dynamic owner resolution: try to read the active claim's owner, fallback to 'agent'
  let owner = 'agent';
  try {
    const claimRecord = claimMgr.status(featureSlug);
    if (claimRecord && claimRecord.owner) {
      owner = claimRecord.owner;
    }
  } catch (e) {
    // Ignore and fallback to 'agent'
  }

  const blocking = [];
  const warnings = [];

  // 1. Release active file leases
  let leasesReleased = 0;
  if (state.locks && state.locks.length > 0) {
    const remainingLocks = [];
    for (const lock of state.locks) {
      try {
        const absoluteFilePath = path.isAbsolute(lock.file) ? lock.file : path.resolve(repoRoot, lock.file);
        leaseMgr.release(absoluteFilePath, owner);
        leasesReleased++;
      } catch (e) {
        blocking.push(`Failed to release lease on file '${lock.file}': ${e.message}`);
        remainingLocks.push(lock);
      }
    }
    state.locks = remainingLocks;
  }

  // 2. Release work claims
  let claimReleased = false;
  try {
    claimReleased = claimMgr.release(featureSlug, owner);
  } catch (e) {
    blocking.push(`Failed to release work claim for task '${featureSlug}': ${e.message}`);
  }

  try {
    flowState.save(repoRoot, state);
  } catch (e) {
    blocking.push(`Failed to save flow state: ${e.message}`);
  }

  const status = blocking.length === 0 ? 'PASS' : 'FAIL';
  const gateResult = {
    stage_id: 'settle',
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
