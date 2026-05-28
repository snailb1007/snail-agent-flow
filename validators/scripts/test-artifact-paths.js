'use strict';

const assert = require('assert');
const path = require('path');
const { resolve, resolvePath, getCanonical } = require('../../lib/artifact-paths');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

addTest('getCanonical happy path', () => {
  const res = getCanonical('flow_state');
  assert.strictEqual(res, '.ai/state/flow-state.json');
});

addTest('getCanonical invalid key', () => {
  assert.throws(() => {
    getCanonical('nonexistent_key');
  }, (err) => {
    return err.code === 'INVALID_KEY';
  });
});

addTest('resolvePath canonical alias', () => {
  const res = resolvePath('flow_state');
  assert.strictEqual(res, '.ai/state/flow-state.json');
});

addTest('resolvePath feature template resolution', () => {
  const res = resolvePath('feature.spec', { feature_slug: 'my-feature' });
  assert.strictEqual(res, 'specs/my-feature/spec.md');
});

addTest('resolvePath staging template resolution', () => {
  const res = resolvePath('staging.matt_to_prd', { run_id: 'run_123' });
  assert.strictEqual(res, '.ai/staging/run_123/matt-to-prd.md');
});

addTest('resolvePath missing template variables throws', () => {
  assert.throws(() => {
    resolvePath('feature.spec', {});
  }, /Missing template variable 'feature_slug'/);
});

addTest('resolvePath invalid dotted alias throws', () => {
  assert.throws(() => {
    resolvePath('invalid.alias');
  }, (err) => {
    return err.code === 'INVALID_KEY';
  });
});

// Run tests
let failed = false;
for (const test of tests) {
  try {
    test.fn();
    console.log(`[PASS] ${test.name}`);
  } catch (err) {
    console.error(`[FAIL] ${test.name}:`, err);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
