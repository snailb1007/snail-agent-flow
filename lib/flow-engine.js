const fs = require('fs');
const path = require('path');

/**
 * Valid stage status values for the flow ledger.
 */
const VALID_STATUSES = ['pending', 'in_progress', 'done', 'blocked', 'needs_revision'];

/**
 * Validates a ledger object has the required schema.
 * Called defensively before mutation operations.
 *
 * @param {object} ledger - The ledger object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateLedger(ledger, repoRoot) {
  const errors = [];

  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['Ledger must be a non-null object.'] };
  }

  if (!ledger.flow_name || typeof ledger.flow_name !== 'string') {
    errors.push('Ledger must have a non-empty "flow_name" string.');
  }

  if (ledger.current_stage !== null && typeof ledger.current_stage !== 'string') {
    errors.push('"current_stage" must be a string or null.');
  }

  if (!Array.isArray(ledger.stages) || ledger.stages.length === 0) {
    errors.push('Ledger must have a non-empty "stages" array.');
    return { valid: errors.length === 0, errors };
  }

  for (let i = 0; i < ledger.stages.length; i++) {
    const stage = ledger.stages[i];
    if (!stage.id || typeof stage.id !== 'string') {
      errors.push(`Stage at index ${i} must have a non-empty "id" string.`);
    }
    if (!VALID_STATUSES.includes(stage.status)) {
      errors.push(`Stage "${stage.id || i}" has invalid status "${stage.status}". Valid: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  if (!Array.isArray(ledger.revision_history)) {
    errors.push('Ledger must have a "revision_history" array.');
  }

  // Parallel subagent limit check
  if (repoRoot) {
    try {
      const { loadPolicyConfig } = require('./context-budget');
      const policy = loadPolicyConfig(repoRoot);
      const maxParallelism = (policy && typeof policy.max_parallelism === 'number')
        ? policy.max_parallelism
        : 3;
      const inProgressStages = ledger.stages.filter(s => s.status === 'in_progress');
      if (inProgressStages.length > maxParallelism) {
        errors.push(`Number of concurrent in-progress stages (${inProgressStages.length}) exceeds the maximum parallelism limit (${maxParallelism}).`);
      }
    } catch (e) {
      // Fallback if config load fails
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolves the next actionable stage from the ledger.
 * Priority: needs_revision stages first (in order), then pending stages.
 *
 * @param {object} ledger - The flow ledger object
 * @param {object} flowDefinition - Parsed flow definition with stages array
 * @returns {object|null} Object with { ledgerStage, flowStage } or null if all done
 */
function resolveNextStage(ledger, flowDefinition, repoRoot, variables) {
  if (!ledger || !Array.isArray(ledger.stages)) {
    return null;
  }

  const flowStages = flowDefinition && Array.isArray(flowDefinition.stages)
    ? flowDefinition.stages
    : [];

  repoRoot = repoRoot || process.cwd();
  variables = variables || {};

  let resolved = null;

  // Priority 1: Find first needs_revision stage
  for (const stage of ledger.stages) {
    if (stage.status === 'needs_revision') {
      const flowStage = flowStages.find(fs => fs.id === stage.id) || null;
      resolved = { ledgerStage: stage, flowStage };
      break;
    }
  }

  // Priority 2: Find first pending stage
  if (!resolved) {
    for (const stage of ledger.stages) {
      if (stage.status === 'pending') {
        const flowStage = flowStages.find(fs => fs.id === stage.id) || null;
        resolved = { ledgerStage: stage, flowStage };
        break;
      }
    }
  }

  if (resolved) {
    // Check for artifact drift before resolving the next stage
    try {
      const { validateDrift } = require('./validate-drift');
      const driftResults = validateDrift(repoRoot);
      const blocked = driftResults.find(res => res.status === 'BLOCKED');
      if (blocked) {
        throw new Error(`Stage transition blocked by artifact drift: ${blocked.message}`);
      }
    } catch (e) {
      if (e.message.includes('blocked by artifact drift')) {
        throw e;
      }
    }

    // Resolve phase_id centrally if not provided
    if (!variables.phase_id) {
      try {
        const statePath = path.join(repoRoot, '.planning/STATE.md');
        if (fs.existsSync(statePath)) {
          const content = fs.readFileSync(statePath, 'utf8');
          const match = content.match(/Current focus:\s*Phase\s*(\d+)/i) || content.match(/Active Phase:\s*\*\*Phase\s*(\d+)/i);
          if (match) {
            const phaseNum = match[1];
            const phasesDir = path.join(repoRoot, '.planning/phases');
            if (fs.existsSync(phasesDir)) {
              const dirs = fs.readdirSync(phasesDir);
              const prefix = String(phaseNum).padStart(2, '0');
              const exactDir = dirs.find(d => d.startsWith(phaseNum + '-') || d.startsWith(prefix + '-'));
              if (exactDir) {
                variables.phase_id = exactDir;
              }
            }
          }
        }
      } catch (e) {
        // Silent fallback
      }
    }

    const { estimateBudget, computeOutcome, loadPolicyConfig } = require('./context-budget');
    const policyConfig = loadPolicyConfig(repoRoot);
    const { totalBytes, inputs } = estimateBudget(resolved.flowStage, repoRoot, variables);
    const outcome = computeOutcome(totalBytes, resolved.flowStage ? resolved.flowStage.id : null, policyConfig);

    resolved.contextPolicy = {
      outcome,
      estimatedBytes: totalBytes,
      inputs,
      policyConfig
    };
    return resolved;
  }

  // All stages are done or blocked
  return null;
}

/**
 * Resolves template variables in an artifact path.
 *
 * @param {string} templatePath - Path with template variables like {feature_dir}
 * @param {object} variables - Map of variable name to value
 * @returns {string} Resolved path
 */
function resolveTemplatePath(templatePath, variables) {
  if (!templatePath) return templatePath;
  variables = variables || {};

  let resolved = templatePath;
  if (resolved.includes('{{')) {
    const artifactPaths = require('./artifact-paths');
    resolved = resolved.replace(/\{\{([a-zA-Z0-9_\.]+)\}\}/g, (match, dottedKey) => {
      return artifactPaths.resolve(dottedKey, variables);
    });
  }

  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return resolved;
}

/**
 * Checks whether required artifacts for a stage exist and are non-empty.
 *
 * @param {object} flowStage - Flow definition stage with required_artifacts
 * @param {string} repoRoot - Absolute path to the project root
 * @param {object} [variables] - Template variable map (e.g., { feature_dir: 'specs/010-...' })
 * @returns {{ passed: boolean, results: Array<{ path: string, exists: boolean, nonEmpty: boolean }> }}
 */
function checkArtifacts(flowStage, repoRoot, variables) {
  const results = [];

  if (!flowStage || !Array.isArray(flowStage.required_artifacts)) {
    return { passed: true, results };
  }

  let allPassed = true;

  for (const artifact of flowStage.required_artifacts) {
    const templatePath = artifact.path || artifact;
    const resolvedPath = resolveTemplatePath(templatePath, variables || {});
    const fullPath = path.join(repoRoot, resolvedPath);

    let exists = false;
    let nonEmpty = false;

    try {
      exists = fs.existsSync(fullPath);
      if (exists) {
        const stat = fs.statSync(fullPath);
        nonEmpty = stat.size > 0;
      }
    } catch (e) {
      exists = false;
      nonEmpty = false;
    }

    const passed = exists && nonEmpty;
    if (!passed) allPassed = false;

    results.push({ path: resolvedPath, exists, nonEmpty });
  }

  return { passed: allPassed, results };
}

/**
 * Advances a stage to 'done' status and updates the ledger.
 *
 * @param {object} ledger - The flow ledger object (mutated in place)
 * @param {string} stageId - ID of the stage to advance
 * @param {string[]} artifactPaths - List of verified artifact paths
 * @returns {object} The mutated ledger
 */
function advanceStage(ledger, stageId, artifactPaths) {
  if (process.env.SUBAGENT === 'true' || process.env.IS_SUBAGENT === 'true') {
    throw new Error('Mutation blocked: subagents are not permitted to modify the ledger state.');
  }
  const validation = validateLedger(ledger);
  if (!validation.valid) {
    throw new Error(`Invalid ledger: ${validation.errors.join('; ')}`);
  }

  const stage = ledger.stages.find(s => s.id === stageId);
  if (!stage) {
    throw new Error(`Stage "${stageId}" not found in ledger.`);
  }

  const now = new Date().toISOString();

  stage.status = 'done';
  stage.artifacts = artifactPaths || [];
  stage.completed_at = now;

  // Find next non-done stage for current_stage pointer
  const nextStage = ledger.stages.find(s => s.status !== 'done');
  ledger.current_stage = nextStage ? nextStage.id : null;
  ledger.updated_at = now;

  return ledger;
}

/**
 * Triggers a revision by resetting a range of stages.
 * Resets all stages from toStageId through fromStageId (inclusive) to 'needs_revision'.
 *
 * @param {object} ledger - The flow ledger object (mutated in place)
 * @param {string} fromStageId - The stage that detected the problem (downstream)
 * @param {string} toStageId - The stage to route back to (upstream)
 * @param {string} reason - Human-readable reason for the revision
 * @returns {object} The mutated ledger
 */
function triggerRevision(ledger, fromStageId, toStageId, reason) {
  if (process.env.SUBAGENT === 'true' || process.env.IS_SUBAGENT === 'true') {
    throw new Error('Mutation blocked: subagents are not permitted to modify the ledger state.');
  }
  const validation = validateLedger(ledger);
  if (!validation.valid) {
    throw new Error(`Invalid ledger: ${validation.errors.join('; ')}`);
  }

  const toIndex = ledger.stages.findIndex(s => s.id === toStageId);
  const fromIndex = ledger.stages.findIndex(s => s.id === fromStageId);

  if (toIndex === -1) {
    throw new Error(`Target stage "${toStageId}" not found in ledger.`);
  }
  if (fromIndex === -1) {
    throw new Error(`Source stage "${fromStageId}" not found in ledger.`);
  }
  if (toIndex > fromIndex) {
    throw new Error(`Target stage "${toStageId}" must be before source stage "${fromStageId}".`);
  }

  const now = new Date().toISOString();

  // Reset all stages in the range [toIndex, fromIndex]
  for (let i = toIndex; i <= fromIndex; i++) {
    const stage = ledger.stages[i];
    stage.status = 'needs_revision';
    stage.completed_at = null;
    stage.gate_result = null;
    stage.artifacts = [];
    stage.revision_count = (stage.revision_count || 0) + 1;
  }

  // Set current stage to the revision target
  ledger.current_stage = toStageId;
  ledger.updated_at = now;

  // Log revision in history
  if (!Array.isArray(ledger.revision_history)) {
    ledger.revision_history = [];
  }
  ledger.revision_history.push({
    from_stage: fromStageId,
    to_stage: toStageId,
    reason: reason || 'No reason provided.',
    timestamp: now
  });

  return ledger;
}

/**
 * Formats a structured stage instruction block.
 *
 * @param {object} flowStage - Flow definition stage
 * @param {object} ledgerStage - Ledger stage entry
 * @returns {string} Formatted instruction block
 */
function formatStageInstruction(flowStage, ledgerStage, contextPolicy) {
  const lines = [];
  lines.push('═══ NEXT STAGE ═══');
  lines.push(`Stage:     ${flowStage.name || flowStage.id} (${flowStage.id})`);
  lines.push(`Status:    ${ledgerStage.status}`);
  lines.push(`Skill:     ${flowStage.skill || 'none'}`);

  if (flowStage.command) {
    lines.push(`Command:   ${flowStage.command}`);
  }

  if (Array.isArray(flowStage.required_artifacts) && flowStage.required_artifacts.length > 0) {
    lines.push('Artifacts:');
    for (const artifact of flowStage.required_artifacts) {
      const artPath = artifact.path || artifact;
      const headings = Array.isArray(artifact.headings) ? artifact.headings : [];
      if (headings.length > 0) {
        lines.push(`  - ${artPath} [headings: ${headings.map(h => `"${h}"`).join(', ')}]`);
      } else {
        lines.push(`  - ${artPath}`);
      }
    }
  }

  if (Array.isArray(flowStage.revision_routing) && flowStage.revision_routing.length > 0) {
    lines.push('Revision Routes:');
    for (const route of flowStage.revision_routing) {
      lines.push(`  - on: ${route.on} → to: ${route.to}`);
    }
  } else {
    lines.push('Revision Routes: (none)');
  }

  lines.push('═══════════════════');

  if (contextPolicy) {
    lines.push('');
    lines.push('─── CONTEXT POLICY ───');
    lines.push(`Outcome:   ${contextPolicy.outcome}`);
    lines.push(`Est. size: ${(contextPolicy.estimatedBytes / 1024).toFixed(1)} KB`);
    if (contextPolicy.outcome === 'context_pack_required') {
      lines.push('Action:    Create .ai/context-packs/<stage>-<timestamp>.json before starting work.');
      lines.push('           Reference required files by path. Record omissions.');
    } else if (contextPolicy.outcome === 'fresh_session_required') {
      lines.push('Action:    Write .ai/state/context-handoff.json then STOP this session.');
      lines.push('           A new session will resume from this stage using the handoff artifact.');
    }
    lines.push('──────────────────────');
  }

  return lines.join('\n');
}

/**
 * Validates prerequisite tools required for a specific flow stage.
 * Matches stage's skill/command against the flow's prerequisite declarations.
 *
 * @param {object} flowStage - Flow definition stage
 * @param {Array<object>} prerequisites - Prerequisite declarations from flow definition
 * @param {string} repoRoot - Project root directory path
 * @returns {{ passed: boolean, results: Array<{ name: string, available: boolean, reason?: string, description?: string, instructions?: string }> }}
 */
function checkStagePrerequisites(flowStage, prerequisites, repoRoot = process.cwd()) {
  if (!flowStage || !Array.isArray(prerequisites) || prerequisites.length === 0) {
    return { passed: true, results: [] };
  }

  const skill = (flowStage.skill || '').toLowerCase();
  const command = (flowStage.command || '').toLowerCase();

  if (!skill && !command) {
    return { passed: true, results: [] };
  }

  const matched = [];
  for (const pre of prerequisites) {
    const preName = (pre.name || '').toLowerCase();
    const preCmd = (pre.command || '').toLowerCase();

    const matchesSkill = skill && (skill.includes(preName) || (preCmd && skill.includes(preCmd)));
    const matchesCmd = command && (command.includes(preName) || (preCmd && command.includes(preCmd)));

    if (matchesSkill || matchesCmd) {
      matched.push(pre);
    }
  }

  if (matched.length === 0) {
    return { passed: true, results: [] };
  }

  const { validatePrerequisites, getToolInstructions } = require('./tool-validator');
  const checkResults = validatePrerequisites(matched, repoRoot);

  const results = checkResults.map(res => {
    const inst = getToolInstructions(res.name);
    return {
      name: res.name,
      available: res.available,
      reason: res.reason,
      description: inst ? inst.description : undefined,
      instructions: inst ? inst.instructions : undefined
    };
  });

  const passed = results.every(r => r.available);
  return { passed, results };
}

/**
 * Failure Recovery: Spec Drift.
 * Resets the flow ledger stages back to the Spec stage so that spec/plan can be re-validated.
 *
 * @param {object} ledger - The flow ledger (mutated in place)
 * @param {string} currentStageId - The current active/stuck stage
 * @param {string} specStageId - The spec stage to roll back to
 * @param {string} reason - The reason for spec drift
 * @returns {object} The mutated ledger
 */
function handleSpecDrift(ledger, currentStageId, specStageId, reason) {
  return triggerRevision(ledger, currentStageId, specStageId, `Spec Drift: ${reason}`);
}

/**
 * Failure Recovery: Context Fragmentation.
 * Writes a fresh-session handoff artifact to `.ai/state/context-handoff.json` and marks the stage blocked.
 *
 * @param {object} ledger - The flow ledger (mutated in place)
 * @param {string} currentStageId - The current active/stuck stage
 * @param {object} params - Handoff details
 * @param {string} params.nextSkill - The skill to execute next
 * @param {string} params.contextPackPath - Relative path to the context pack JSON
 * @param {string[]} params.verificationCommands - Array of verification commands to run
 * @param {string} params.reason - Reason for handoff
 * @param {string} [repoRoot] - Optional project root path
 * @returns {string} Path to the written handoff file
 */
function triggerContextHandoff(ledger, currentStageId, { nextSkill, contextPackPath, verificationCommands, reason }, repoRoot = process.cwd()) {
  if (process.env.SUBAGENT === 'true' || process.env.IS_SUBAGENT === 'true') {
    throw new Error('Mutation blocked: subagents are not permitted to modify the ledger state.');
  }

  const stage = ledger.stages.find(s => s.id === currentStageId);
  if (!stage) {
    throw new Error(`Stage "${currentStageId}" not found in ledger.`);
  }

  const now = new Date().toISOString();

  // Mark current stage as blocked
  stage.status = 'blocked';
  ledger.updated_at = now;

  const handoffData = {
    schema_version: '1.0.0',
    created_at: now,
    resume_stage: currentStageId,
    next_skill: nextSkill || 'none',
    context_pack_path: contextPackPath || '',
    verification_commands: Array.isArray(verificationCommands) ? verificationCommands : ['npm test'],
    reason: reason || 'Context fragmentation recovery trigger'
  };

  const dirPath = path.join(repoRoot, '.ai/state');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const handoffPath = path.join(dirPath, 'context-handoff.json');
  fs.writeFileSync(handoffPath, JSON.stringify(handoffData, null, 2) + '\n', 'utf8');

  return handoffPath;
}

/**
 * Failure Recovery: Lease Collision.
 * Computes the delay (in ms) for exponential back-off wait, throwing if retries are exhausted.
 *
 * @param {number} retryCount - Current attempt number (0-indexed or 1-indexed)
 * @param {number} [maxRetries=3] - Maximum allowed retries
 * @returns {number} Delay in milliseconds
 */
function handleLeaseCollision(retryCount, maxRetries = 3) {
  if (retryCount >= maxRetries) {
    throw new Error(`Lease collision recovery failed: Max retries (${maxRetries}) exceeded.`);
  }
  return Math.pow(2, retryCount) * 1000;
}

module.exports = {
  VALID_STATUSES,
  validateLedger,
  resolveNextStage,
  resolveTemplatePath,
  checkArtifacts,
  advanceStage,
  triggerRevision,
  formatStageInstruction,
  checkStagePrerequisites,
  handleSpecDrift,
  triggerContextHandoff,
  handleLeaseCollision
};
