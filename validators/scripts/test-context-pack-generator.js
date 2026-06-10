/**
 * Test suite for lib/context-pack-generator.js
 */

const fs = require('fs');
const path = require('path');
const {
  buildPackManifest,
  generatePack,
  defaultPackFilename,
  PACK_SCHEMA_VERSION
} = require('../../lib/context-pack-generator');
const { validateContextPack } = require('../../lib/context-policy-validator');

const tempDir = path.resolve(__dirname, '../../.ai/context-pack-generator-test');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function resetTempRepo() {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(tempDir, '.specify'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'flows'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'specs', '001-demo-feature'), { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, '.specify', 'feature.json'),
    JSON.stringify({ feature_directory: 'specs/001-demo-feature' }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(tempDir, 'specs', '001-demo-feature', 'spec.md'), '# Spec\n', 'utf8');
  fs.writeFileSync(path.join(tempDir, 'specs', '001-demo-feature', 'plan.md'), '# Plan\n', 'utf8');
  fs.writeFileSync(path.join(tempDir, 'specs', '001-demo-feature', 'tasks.md'), '# Tasks\n', 'utf8');
  fs.writeFileSync(path.join(tempDir, '.ai', 'flows', 'atlas-flow.yaml'), 'version: "2.0.0"\n', 'utf8');
}

const FIXED_NOW = new Date('2026-06-10T12:00:00.000Z');

console.log('--- buildPackManifest ---');

resetTempRepo();
const manifest = buildPackManifest(tempDir, { stageId: 'act', now: FIXED_NOW });

assert(manifest.schema_version === PACK_SCHEMA_VERSION, `schema_version expected ${PACK_SCHEMA_VERSION}, got ${manifest.schema_version}`);
assert(manifest.created_at === FIXED_NOW.toISOString(), 'created_at uses injected timestamp');
assert(manifest.stage_id === 'act', 'stage_id propagated');
assert(manifest.objective.includes('001-demo-feature'), 'objective references active feature slug');

const requiredPaths = manifest.required_files.map(e => e.path);
assert(requiredPaths.includes('specs/001-demo-feature/spec.md'), 'required_files includes active feature spec.md');
assert(requiredPaths.includes('specs/001-demo-feature/plan.md'), 'required_files includes active feature plan.md');
assert(requiredPaths.includes('specs/001-demo-feature/tasks.md'), 'required_files includes active feature tasks.md');
assert(requiredPaths.includes('.ai/flows/atlas-flow.yaml'), 'required_files includes flow definition');
assert(!requiredPaths.includes('.ai/state/flow-state.json'), 'missing files are filtered out of required_files');

const allPaths = []
  .concat(manifest.required_files.map(e => e.path))
  .concat(manifest.omissions.map(e => e.path))
  .concat(manifest.expected_outputs.map(e => e.path));
assert(allPaths.every(p => !p.includes('\\')), 'all manifest paths use forward slashes');
assert(manifest.omissions.every(e => typeof e.reason === 'string' && e.reason.length > 0), 'every omission carries a reason');
assert(Array.isArray(manifest.validation_commands) && manifest.validation_commands.length > 0, 'validation_commands present');
assert(Array.isArray(manifest.stop_conditions) && manifest.stop_conditions.length > 0, 'stop_conditions present');

// Without a feature pointer, the manifest still builds with fallbacks
fs.rmSync(path.join(tempDir, '.specify', 'feature.json'));
const featureless = buildPackManifest(tempDir, { stageId: 'adhoc', now: FIXED_NOW });
assert(!featureless.objective.includes('001-demo-feature'), 'featureless objective omits feature slug');
assert(featureless.expected_outputs.length > 0, 'featureless manifest keeps expected_outputs fallback');

console.log('--- generatePack ---');

resetTempRepo();
const genResult = generatePack(tempDir, { stageId: 'act', now: FIXED_NOW });
assert(genResult.ok === true, `generatePack expected ok, got errors: ${genResult.errors.join('; ')}`);
assert(fs.existsSync(genResult.path), 'generated pack exists on disk');
assert(genResult.path.includes(path.join('.ai', 'context-packs')), 'pack written under .ai/context-packs');
assert(path.basename(genResult.path) === defaultPackFilename('act', FIXED_NOW), 'default filename derived from stage and timestamp');

const validation = validateContextPack(genResult.path);
assert(validation.valid === true, `written pack passes validateContextPack: ${validation.errors.join('; ')}`);

// Overwrite refusal: same stage + same timestamp resolves to the same filename
const overwriteResult = generatePack(tempDir, { stageId: 'act', now: FIXED_NOW });
assert(overwriteResult.ok === false, 'second generatePack with same target refuses to overwrite');
assert(overwriteResult.errors.some(e => e.includes('Refusing to overwrite')), 'overwrite error message present');
assert(fs.existsSync(genResult.path), 'original pack untouched after refused overwrite');

// --out must stay inside .ai/context-packs (artifact path ownership)
const escapeResult = generatePack(tempDir, { stageId: 'act', now: FIXED_NOW, outPath: 'specs/evil-pack.json' });
assert(escapeResult.ok === false, '--out outside .ai/context-packs is rejected');
assert(!fs.existsSync(path.join(tempDir, 'specs', 'evil-pack.json')), 'nothing written outside .ai/context-packs');

// Fail-closed: an invalid manifest (omission without reason) never persists
const invalidResult = generatePack(tempDir, {
  stageId: 'lay',
  now: FIXED_NOW,
  omissions: [{ path: '.ai/sessions' }]
});
assert(invalidResult.ok === false, 'invalid manifest reports failure');
assert(!fs.existsSync(invalidResult.path), 'invalid pack removed from disk (fail-closed)');

fs.rmSync(tempDir, { recursive: true, force: true });

console.log(`\n[test-context-pack-generator] Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
console.log('[test-context-pack-generator] All tests passed.');
