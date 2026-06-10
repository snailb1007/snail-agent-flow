'use strict';

const fs = require('fs');
const path = require('path');
const { validateContextPack } = require('./context-policy-validator');

const PACK_SCHEMA_VERSION = '1.0.0';
const PACKS_DIR = path.join('.ai', 'context-packs');

function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/**
 * Reads the active feature pointer from .specify/feature.json.
 * Returns { directory, slug } or null when no pointer exists.
 */
function readActiveFeature(repoRoot) {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.specify', 'feature.json'), 'utf8')
    );
    if (raw && typeof raw.feature_directory === 'string' && raw.feature_directory.trim()) {
      const directory = raw.feature_directory.replace(/[\/\\]+$/, '');
      return { directory: toPosix(directory), slug: path.basename(directory) };
    }
  } catch (e) {
    // No pointer or unreadable JSON: caller falls back to feature-less pack
  }
  return null;
}

/**
 * Builds a context-pack manifest object conforming to
 * specs/017-context-budget-gate/contracts/context-pack.schema.json.
 * Pure with respect to options.now; only files that exist under repoRoot
 * are listed in required_files (path-only references, never file bodies).
 */
function buildPackManifest(repoRoot, options) {
  options = options || {};
  const now = options.now instanceof Date ? options.now : new Date();
  const stageId = options.stageId || 'adhoc';
  const feature = readActiveFeature(repoRoot);

  const objective = options.objective
    || (feature
      ? `Continue stage "${stageId}" for feature ${feature.slug} with minimal context.`
      : `Continue stage "${stageId}" with minimal context.`);

  const candidates = [];
  if (feature) {
    candidates.push(
      { path: `${feature.directory}/spec.md`, reason: 'Canonical requirements for the active feature.' },
      { path: `${feature.directory}/plan.md`, reason: 'Architecture and change plan for the active feature.' },
      { path: `${feature.directory}/tasks.md`, reason: 'Task checklist driving this stage.' }
    );
  }
  candidates.push(
    { path: '.ai/state/flow-state.json', reason: 'Current flow stage and status.' },
    { path: '.ai/flows/atlas-flow.yaml', reason: 'Flow definition including stage gates.' },
    { path: '.ai/constitution.md', reason: 'Repository engineering principles.' }
  );

  const required_files = candidates.filter(entry =>
    fs.existsSync(path.join(repoRoot, entry.path))
  );

  const omissions = options.omissions || [
    { path: '.ai/sessions', reason: 'Session transcripts intentionally omitted; durable facts live in .ai/memory.' },
    { path: '.ai/reviews', reason: 'Historical review logs are not required for this stage.' },
    { path: 'specs', reason: 'Specs for non-active features are out of scope for this pack.' }
  ];

  const expected_outputs = options.expectedOutputs || (feature
    ? [{ path: `${feature.directory}/tasks.md`, description: 'Task checklist updated with work completed in this stage.' }]
    : [{ path: '.ai/state/flow-state.json', description: 'Flow state advanced after the stage completes.' }]);

  const validation_commands = options.validationCommands || [
    'node validators/scripts/validate-spec.js',
    'npm test'
  ];

  const stop_conditions = options.stopConditions || [
    'Validation fails 3 consecutive times: halt and generate a human review packet.',
    'Budget outcome is fresh_session_required: write .ai/state/context-handoff.json and stop.',
    'Any write outside the files listed in this pack: stop and report to the parent agent.'
  ];

  return {
    schema_version: PACK_SCHEMA_VERSION,
    created_at: now.toISOString(),
    stage_id: stageId,
    objective,
    required_files,
    omissions,
    expected_outputs,
    validation_commands,
    stop_conditions
  };
}

function defaultPackFilename(stageId, now) {
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const safeStage = String(stageId).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `${safeStage}-${ts}.json`;
}

/**
 * Builds, writes, and validates a context pack under .ai/context-packs/.
 * Fail-closed contract: an invalid pack never persists on disk (the written
 * file is removed when post-write validation fails) and an existing file is
 * never overwritten.
 *
 * @returns {{ ok: boolean, path: string, manifest: object, errors: string[] }}
 */
function generatePack(repoRoot, options) {
  options = options || {};
  const now = options.now instanceof Date ? options.now : new Date();
  const manifest = buildPackManifest(repoRoot, Object.assign({}, options, { now }));

  let outPath;
  if (options.outPath) {
    outPath = path.isAbsolute(options.outPath)
      ? options.outPath
      : path.join(repoRoot, options.outPath);
    const packsRoot = path.join(repoRoot, PACKS_DIR);
    const relative = path.relative(packsRoot, outPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return {
        ok: false,
        path: outPath,
        manifest,
        errors: [`--out must resolve inside ${toPosix(PACKS_DIR)}/ (artifact path ownership), got: ${options.outPath}`]
      };
    }
  } else {
    outPath = path.join(repoRoot, PACKS_DIR, defaultPackFilename(manifest.stage_id, now));
  }

  if (fs.existsSync(outPath)) {
    return {
      ok: false,
      path: outPath,
      manifest,
      errors: [`Refusing to overwrite existing context pack: ${toPosix(path.relative(repoRoot, outPath))}`]
    };
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const result = validateContextPack(outPath);
  if (!result.valid) {
    try {
      fs.unlinkSync(outPath);
    } catch (e) {
      // Removal is best-effort; validation errors below are authoritative
    }
    return { ok: false, path: outPath, manifest, errors: result.errors };
  }

  return { ok: true, path: outPath, manifest, errors: [] };
}

module.exports = {
  buildPackManifest,
  generatePack,
  readActiveFeature,
  defaultPackFilename,
  PACK_SCHEMA_VERSION
};
