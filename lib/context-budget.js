'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = {
  inline_threshold_bytes: 50000,
  pack_threshold_bytes: 200000,
  max_parallelism: 3,
  stage_overrides: {},
  budget_inputs: {
    include_required_artifacts: true,
    include_session_logs: true,
    include_planning_artifacts: true,
    include_context_packs: true,
    include_handoff_files: true
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
        
      const budget_inputs = Object.assign({}, DEFAULT_POLICY.budget_inputs, config.budget_inputs);
      
      return {
        inline_threshold_bytes,
        pack_threshold_bytes,
        max_parallelism,
        stage_overrides,
        budget_inputs
      };
    }
  } catch (e) {
    // Silent fallback
  }
  
  // Return a deep copy of DEFAULT_POLICY
  return JSON.parse(JSON.stringify(DEFAULT_POLICY));
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
  
  // Helper for shallow walk of directories
  function addFilesFromDir(dirRelativePath, extensionFilter) {
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
  
  // 2. Session Logs (.ai/sessions/*.md)
  if (policy.budget_inputs.include_session_logs) {
    addFilesFromDir('.ai/sessions', '.md');
  }
  
  // 3. Planning Artifacts (.planning/phases/{phase_id}/*.md)
  if (policy.budget_inputs.include_planning_artifacts) {
    const phaseId = variables.phase_id;
    if (phaseId && typeof phaseId === 'string' && !phaseId.includes('{') && !phaseId.includes('}')) {
      addFilesFromDir(path.join('.planning/phases', phaseId), '.md');
    }
  }
  
  // 4. Context Packs (.ai/context-packs/*.json)
  if (policy.budget_inputs.include_context_packs) {
    addFilesFromDir('.ai/context-packs', '.json');
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
  DEFAULT_POLICY
};
