'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = {
  inline_threshold_bytes: 50000,
  pack_threshold_bytes: 200000,
  max_parallelism: 3,
  stage_overrides: {},
  hook_output_warn_bytes: 4096,
  budget_inputs: {
    include_required_artifacts: true,
    include_session_logs: true,
    include_planning_artifacts: true,
    include_context_packs: true,
    include_handoff_files: true,
    // Scoping defaults preserve legacy behavior: count every file under
    // .ai/sessions and .ai/context-packs. When set to 'active_feature', the
    // walk counts only inputs attributable to the active feature, which fixes
    // the O(N) historical accumulation. Absent key === 'all' (022 / matrix 017).
    session_scope: 'all',
    context_pack_scope: 'all'
  },
  // Opt-in handoff integrity strictness (022). Absent === false === today.
  handoff: {
    strict: false
  },
  // Opt-in archival of compacted session logs (022). Absent === false === today.
  memory: {
    archive_on_compact: false
  }
};

/**
 * Loads the policy config file relative to the repoRoot.
 * If file does not exist or fails to parse, returns DEFAULT_POLICY.
 */
function loadPolicyConfig(repoRoot) {
  const policyPath = path.join(repoRoot, '.ai/state/context-policy.json');
  try {
    if (fs.existsSync(policyPath)) {
      const content = fs.readFileSync(policyPath, 'utf8');
      const config = JSON.parse(content);
      
      const inline_threshold_bytes = typeof config.inline_threshold_bytes === 'number'
        ? config.inline_threshold_bytes
        : DEFAULT_POLICY.inline_threshold_bytes;
        
      const pack_threshold_bytes = typeof config.pack_threshold_bytes === 'number'
        ? config.pack_threshold_bytes
        : DEFAULT_POLICY.pack_threshold_bytes;
        
      const max_parallelism = typeof config.max_parallelism === 'number'
        ? config.max_parallelism
        : DEFAULT_POLICY.max_parallelism;
        
      const stage_overrides = config.stage_overrides && typeof config.stage_overrides === 'object'
        ? config.stage_overrides
        : DEFAULT_POLICY.stage_overrides;

      const hook_output_warn_bytes = typeof config.hook_output_warn_bytes === 'number'
        ? config.hook_output_warn_bytes
        : DEFAULT_POLICY.hook_output_warn_bytes;
        
      const budget_inputs = Object.assign({}, DEFAULT_POLICY.budget_inputs, config.budget_inputs);

      const handoff = Object.assign({}, DEFAULT_POLICY.handoff,
        config.handoff && typeof config.handoff === 'object' ? config.handoff : {});
      const memory = Object.assign({}, DEFAULT_POLICY.memory,
        config.memory && typeof config.memory === 'object' ? config.memory : {});

      return {
        inline_threshold_bytes,
        pack_threshold_bytes,
        max_parallelism,
        stage_overrides,
        hook_output_warn_bytes,
        budget_inputs,
        handoff,
        memory
      };
    }
  } catch (e) {
    // Silent fallback
  }
  
  // Return a deep copy of DEFAULT_POLICY
  return JSON.parse(JSON.stringify(DEFAULT_POLICY));
}

/**
 * Reads the `**Feature:** <slug>` marker that `new-session` writes into a
 * session log header, without loading the whole file. Returns the trimmed slug,
 * or null when the file has no marker (legacy/external log) or cannot be read.
 */
function readSessionFeature(absPath) {
  try {
    const fd = fs.openSync(absPath, 'r');
    try {
      const buf = Buffer.alloc(2048);
      const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
      const head = buf.toString('utf8', 0, bytes);
      const m = head.match(/^\*\*Feature:\*\*\s*(.+?)\s*$/m);
      return m ? m[1].trim() : null;
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    return null;
  }
}

/**
 * True when a session log is attributable to the given feature slug. Logs with
 * no marker, or a marker for a different feature (or 'None'), do not match.
 */
function sessionMatchesFeature(absPath, slug) {
  if (!slug) return false;
  return readSessionFeature(absPath) === slug;
}

/**
 * Resolves the active feature slug for scoping: explicit variable, the feature
 * directory passed by the budget command, or the on-disk feature pointer.
 */
function resolveActiveSlug(variables, repoRoot) {
  if (variables && typeof variables.feature_slug === 'string' && variables.feature_slug) {
    return variables.feature_slug;
  }
  if (variables && typeof variables.feature_dir === 'string' && variables.feature_dir) {
    return path.basename(variables.feature_dir.replace(/[\/\\]+$/, ''));
  }
  try {
    const raw = fs.readFileSync(path.join(repoRoot, '.specify/feature.json'), 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.feature_directory === 'string' && data.feature_directory.trim()) {
      return path.basename(data.feature_directory.replace(/[\/\\]+$/, ''));
    }
  } catch (e) {
    // No resolvable pointer: scoping falls back to unscoped at the call site.
  }
  return null;
}

/**
 * Estimates the byte pressure for a given flow stage.
 */
function estimateBudget(flowStage, repoRoot, variables) {
  repoRoot = repoRoot || process.cwd();
  variables = variables || {};
  
  const inputs = [];
  let totalBytes = 0;
  
  if (!flowStage) {
    return { totalBytes, inputs };
  }
  
  const policy = loadPolicyConfig(repoRoot);
  const { checkArtifacts } = require('./flow-engine');
  
  // 1. Required Artifacts
  if (policy.budget_inputs.include_required_artifacts) {
    try {
      const checkResults = checkArtifacts(flowStage, repoRoot, variables);
      if (checkResults && Array.isArray(checkResults.results)) {
        for (const res of checkResults.results) {
          const fullPath = path.join(repoRoot, res.path);
          try {
            if (fs.existsSync(fullPath)) {
              const stat = fs.statSync(fullPath);
              if (stat.isFile()) {
                totalBytes += stat.size;
                inputs.push({ path: res.path, bytes: stat.size });
              }
            }
          } catch (e) {
            // Ignore individual file stat error
          }
        }
      }
    } catch (e) {
      // Ignore checkArtifacts errors
    }
  }
  
  // Helper for shallow walk of directories. The walk is shallow and counts only
  // files, so any subdirectory (e.g. .ai/sessions/archive/) is naturally
  // excluded. An optional filterFn(fullPath, fileName) further scopes inclusion.
  function addFilesFromDir(dirRelativePath, extensionFilter, filterFn) {
    const fullDir = path.join(repoRoot, dirRelativePath);
    try {
      if (fs.existsSync(fullDir)) {
        const files = fs.readdirSync(fullDir);
        for (const file of files) {
          if (extensionFilter && !file.endsWith(extensionFilter)) {
            continue;
          }
          const fullFilePath = path.join(fullDir, file);
          try {
            const stat = fs.statSync(fullFilePath);
            if (stat.isFile()) {
              if (filterFn && !filterFn(fullFilePath, file)) {
                continue;
              }
              const relativeFilePath = path.join(dirRelativePath, file);
              totalBytes += stat.size;
              inputs.push({ path: relativeFilePath, bytes: stat.size });
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // Active feature slug for scoping (null when none is resolvable).
  const activeSlug = resolveActiveSlug(variables, repoRoot);

  // 2. Session Logs (.ai/sessions/*.md), optionally scoped to the active feature.
  if (policy.budget_inputs.include_session_logs) {
    const scope = policy.budget_inputs.session_scope || 'all';
    if (scope === 'active_feature' && activeSlug) {
      addFilesFromDir('.ai/sessions', '.md', (fp) => sessionMatchesFeature(fp, activeSlug));
    } else {
      addFilesFromDir('.ai/sessions', '.md');
    }
  }
  
  // 3. Planning Artifacts (.planning/phases/{phase_id}/*.md)
  if (policy.budget_inputs.include_planning_artifacts) {
    const phaseId = variables.phase_id;
    if (phaseId && typeof phaseId === 'string' && !phaseId.includes('{') && !phaseId.includes('}')) {
      addFilesFromDir(path.join('.planning/phases', phaseId), '.md');
    }
  }
  
  // 4. Context Packs (.ai/context-packs/*.json), optionally scoped by filename.
  if (policy.budget_inputs.include_context_packs) {
    const scope = policy.budget_inputs.context_pack_scope || 'all';
    if (scope === 'active_feature' && activeSlug) {
      addFilesFromDir('.ai/context-packs', '.json', (fp, name) => name.includes(activeSlug));
    } else {
      addFilesFromDir('.ai/context-packs', '.json');
    }
  }
  
  // 5. Handoff Files (.ai/state/context-handoff.json)
  if (policy.budget_inputs.include_handoff_files) {
    const handoffPath = '.ai/state/context-handoff.json';
    const fullHandoff = path.join(repoRoot, handoffPath);
    try {
      if (fs.existsSync(fullHandoff)) {
        const stat = fs.statSync(fullHandoff);
        if (stat.isFile()) {
          totalBytes += stat.size;
          inputs.push({ path: handoffPath, bytes: stat.size });
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return { totalBytes, inputs };
}

/**
 * Computes policy outcome based on total bytes and thresholds.
 */
function computeOutcome(totalBytes, stageId, policyConfig) {
  const policy = policyConfig || DEFAULT_POLICY;
  
  if (stageId && policy.stage_overrides && policy.stage_overrides[stageId]) {
    const override = policy.stage_overrides[stageId];
    if (override && typeof override.outcome === 'string') {
      return override.outcome;
    }
  }
  
  if (totalBytes <= policy.inline_threshold_bytes) {
    return 'inline';
  } else if (totalBytes <= policy.pack_threshold_bytes) {
    return 'context_pack_required';
  } else {
    return 'fresh_session_required';
  }
}

module.exports = {
  estimateBudget,
  computeOutcome,
  loadPolicyConfig,
  readSessionFeature,
  sessionMatchesFeature,
  resolveActiveSlug,
  DEFAULT_POLICY
};
