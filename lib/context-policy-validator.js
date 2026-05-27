'use strict';

const fs = require('fs');
const path = require('path');

const VALID_OUTCOMES = ['inline', 'context_pack_required', 'fresh_session_required'];

/**
 * Helper to read and parse JSON input from a file path or parsed object.
 */
function readAndParse(input) {
  if (typeof input === 'string') {
    try {
      if (!fs.existsSync(input)) {
        return { data: null, error: `File does not exist: ${input}` };
      }
      const content = fs.readFileSync(input, 'utf8');
      return { data: JSON.parse(content), error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  } else if (input && typeof input === 'object') {
    return { data: input, error: null };
  }
  return { data: null, error: 'Input must be a file path or parsed object.' };
}

/**
 * Helper to resolve repo root from a file path, falling back to process.cwd()
 */
function resolveRepoRoot(filePath) {
  let repoRoot = process.cwd();
  if (typeof filePath === 'string') {
    const idx = filePath.indexOf(path.join('.ai', 'context-packs'));
    if (idx !== -1) {
      repoRoot = filePath.substring(0, idx);
    } else {
      const idxState = filePath.indexOf(path.join('.ai', 'state'));
      if (idxState !== -1) {
        repoRoot = filePath.substring(0, idxState);
      }
    }
  }
  return repoRoot;
}

/**
 * Validates a policy configuration JSON.
 * @param {string|object} input - File path or parsed object
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePolicyConfig(input) {
  const errors = [];
  const parsed = readAndParse(input);
  if (parsed.error) {
    return { valid: false, errors: [parsed.error] };
  }
  
  const config = parsed.data;
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Policy config must be a non-null object.'] };
  }
  
  // Required fields check
  const requiredFields = [
    'schema_version',
    'inline_threshold_bytes',
    'pack_threshold_bytes',
    'max_parallelism',
    'stage_overrides',
    'budget_inputs'
  ];
  
  for (const field of requiredFields) {
    if (config[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Threshold value validations
  if (typeof config.inline_threshold_bytes !== 'number' || Math.floor(config.inline_threshold_bytes) !== config.inline_threshold_bytes || config.inline_threshold_bytes < 1) {
    errors.push('inline_threshold_bytes must be a positive integer.');
  }
  
  if (typeof config.pack_threshold_bytes !== 'number' || Math.floor(config.pack_threshold_bytes) !== config.pack_threshold_bytes || config.pack_threshold_bytes < 1) {
    errors.push('pack_threshold_bytes must be a positive integer.');
  }
  
  if (typeof config.inline_threshold_bytes === 'number' && typeof config.pack_threshold_bytes === 'number') {
    if (config.inline_threshold_bytes >= config.pack_threshold_bytes) {
      errors.push('inline_threshold_bytes must be strictly less than pack_threshold_bytes.');
    }
  }
  
  // Max parallelism validation
  if (typeof config.max_parallelism !== 'number' || Math.floor(config.max_parallelism) !== config.max_parallelism || config.max_parallelism < 1 || config.max_parallelism > 10) {
    errors.push('max_parallelism must be an integer between 1 and 10 inclusive.');
  }
  
  // Stage overrides validation
  if (config.stage_overrides && typeof config.stage_overrides === 'object') {
    for (const [stageId, override] of Object.entries(config.stage_overrides)) {
      if (!override || typeof override !== 'object') {
        errors.push(`Stage override for "${stageId}" must be an object.`);
        continue;
      }
      if (!override.outcome) {
        errors.push(`Stage override for "${stageId}" is missing required field "outcome".`);
      } else if (!VALID_OUTCOMES.includes(override.outcome)) {
        errors.push(`Stage override for "${stageId}" has invalid outcome "${override.outcome}". Valid outcomes: ${VALID_OUTCOMES.join(', ')}.`);
      }
    }
  } else {
    errors.push('stage_overrides must be an object.');
  }
  
  // Budget inputs validation
  if (config.budget_inputs && typeof config.budget_inputs === 'object') {
    const requiredInputs = [
      'include_required_artifacts',
      'include_session_logs',
      'include_planning_artifacts',
      'include_context_packs',
      'include_handoff_files'
    ];
    for (const inputKey of requiredInputs) {
      if (typeof config.budget_inputs[inputKey] !== 'boolean') {
        errors.push(`budget_inputs.${inputKey} must be a boolean.`);
      }
    }
  } else {
    errors.push('budget_inputs must be an object.');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a context pack JSON.
 * @param {string|object} input - File path or parsed object
 * @param {Array<string|object>} [siblingPacks] - Other packs in the same fan-out group
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateContextPack(input, siblingPacks) {
  const errors = [];
  const parsed = readAndParse(input);
  if (parsed.error) {
    return { valid: false, errors: [parsed.error] };
  }
  
  const pack = parsed.data;
  if (!pack || typeof pack !== 'object') {
    return { valid: false, errors: ['Context pack must be a non-null object.'] };
  }
  
  // Required fields check
  const requiredFields = [
    'schema_version',
    'created_at',
    'stage_id',
    'objective',
    'required_files',
    'omissions',
    'expected_outputs',
    'validation_commands',
    'stop_conditions'
  ];
  
  for (const field of requiredFields) {
    if (pack[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const repoRoot = resolveRepoRoot(typeof input === 'string' ? input : null);
  
  // Helper to validate paths for traversal and sanity size
  function checkPath(p, fieldName) {
    if (typeof p !== 'string') {
      errors.push(`${fieldName} entry is not a string.`);
      return false;
    }
    if (p.length > 1024) {
      errors.push(`embeds file body instead of path reference (D-16-07) in ${fieldName}.`);
      return false;
    }
    if (path.isAbsolute(p) || p.startsWith('/') || p.includes('..')) {
      errors.push(`Path traversal detected in ${fieldName}: "${p}" (must be workspace-relative and not contain ..).`);
      return false;
    }
    return true;
  }
  
  // Validate required_files
  if (Array.isArray(pack.required_files)) {
    for (let i = 0; i < pack.required_files.length; i++) {
      const item = pack.required_files[i];
      if (!item || typeof item !== 'object') {
        errors.push(`required_files[${i}] must be an object.`);
        continue;
      }
      if (item.path === undefined) {
        errors.push(`required_files[${i}] is missing required field "path".`);
        continue;
      }
      
      const p = item.path;
      if (checkPath(p, `required_files[${i}].path`)) {
        const fullPath = path.join(repoRoot, p);
        try {
          if (!fs.existsSync(fullPath)) {
            errors.push(`required file does not exist: "${p}"`);
          }
        } catch (e) {
          errors.push(`Error checking existence of required file "${p}": ${e.message}`);
        }
      }
    }
  } else {
    errors.push('required_files must be an array.');
  }
  
  // Validate expected_outputs
  if (Array.isArray(pack.expected_outputs)) {
    for (let i = 0; i < pack.expected_outputs.length; i++) {
      const item = pack.expected_outputs[i];
      if (!item || typeof item !== 'object') {
        errors.push(`expected_outputs[${i}] must be an object.`);
        continue;
      }
      if (item.path === undefined) {
        errors.push(`expected_outputs[${i}] is missing required field "path".`);
      } else {
        checkPath(item.path, `expected_outputs[${i}].path`);
      }
      if (item.description === undefined) {
        errors.push(`expected_outputs[${i}] is missing required field "description".`);
      }
    }
  } else {
    errors.push('expected_outputs must be an array.');
  }
  
  // Validate omissions
  if (Array.isArray(pack.omissions)) {
    for (let i = 0; i < pack.omissions.length; i++) {
      const item = pack.omissions[i];
      if (!item || typeof item !== 'object') {
        errors.push(`omissions[${i}] must be an object.`);
        continue;
      }
      if (item.path === undefined) {
        errors.push(`omissions[${i}] is missing required field "path".`);
      } else {
        checkPath(item.path, `omissions[${i}].path`);
      }
      if (item.reason === undefined) {
        errors.push(`omissions[${i}] is missing required field "reason".`);
      }
    }
  } else {
    errors.push('omissions must be an array.');
  }
  
  // Validate arrays of strings
  if (!Array.isArray(pack.validation_commands)) {
    errors.push('validation_commands must be an array.');
  }
  if (!Array.isArray(pack.stop_conditions)) {
    errors.push('stop_conditions must be an array.');
  }
  
  // Validate subagent_fanout
  if (pack.subagent_fanout !== undefined && pack.subagent_fanout !== null) {
    const fanout = pack.subagent_fanout;
    if (typeof fanout !== 'object') {
      errors.push('subagent_fanout must be an object.');
    } else {
      const requiredFanoutFields = [
        'group_id',
        'subagent_index',
        'total_subagents',
        'write_targets',
        'sequential_inline_fallback',
        'join_owner'
      ];
      for (const f of requiredFanoutFields) {
        if (fanout[f] === undefined) {
          errors.push(`subagent_fanout missing required field: "${f}"`);
        }
      }
      
      if (typeof fanout.sequential_inline_fallback !== 'boolean') {
        errors.push('subagent_fanout.sequential_inline_fallback must be a boolean.');
      }
      
      if (typeof fanout.join_owner !== 'string') {
        errors.push('subagent_fanout.join_owner must be a string.');
      }
      
      if (!Array.isArray(fanout.write_targets)) {
        errors.push('subagent_fanout.write_targets must be an array.');
      } else {
        for (let i = 0; i < fanout.write_targets.length; i++) {
          checkPath(fanout.write_targets[i], `subagent_fanout.write_targets[${i}]`);
        }
      }
      
      // Sibling overlap checks
      if (siblingPacks && Array.isArray(siblingPacks)) {
        for (const sibInput of siblingPacks) {
          const sibParsed = readAndParse(sibInput);
          if (sibParsed.error || !sibParsed.data) continue;
          
          const sib = sibParsed.data;
          if (sib.subagent_fanout && sib.subagent_fanout.group_id === fanout.group_id) {
            if (sib.subagent_fanout.subagent_index !== fanout.subagent_index) {
              // Check overlaps in write_targets
              const sibTargets = sib.subagent_fanout.write_targets || [];
              const myTargets = fanout.write_targets || [];
              for (const myTarget of myTargets) {
                if (sibTargets.includes(myTarget)) {
                  // Overlap detected. Check coordination note.
                  const coordinationNote = fanout.coordination_note || sib.subagent_fanout.coordination_note;
                  if (!coordinationNote || coordinationNote.trim() === '') {
                    errors.push(`Overlap in write targets detected between sibling subagents without a coordination note: "${myTarget}"`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a fresh-session handoff JSON.
 * @param {string|object} input - File path or parsed object
 * @param {string[]} [knownStageIds] - Array of valid stage IDs from flow definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateHandoffArtifact(input, knownStageIds) {
  const errors = [];
  const parsed = readAndParse(input);
  if (parsed.error) {
    return { valid: false, errors: [parsed.error] };
  }
  
  const handoff = parsed.data;
  if (!handoff || typeof handoff !== 'object') {
    return { valid: false, errors: ['Handoff artifact must be a non-null object.'] };
  }
  
  // Required fields check
  const requiredFields = [
    'schema_version',
    'created_at',
    'resume_stage',
    'next_skill',
    'context_pack_path',
    'verification_commands',
    'reason'
  ];
  
  for (const field of requiredFields) {
    if (handoff[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const repoRoot = resolveRepoRoot(typeof input === 'string' ? input : null);
  
  // Validate context_pack_path traversal
  const cpp = handoff.context_pack_path;
  if (typeof cpp !== 'string') {
    errors.push('context_pack_path must be a string.');
  } else {
    if (path.isAbsolute(cpp) || cpp.startsWith('/') || cpp.includes('..')) {
      errors.push(`Path traversal detected in context_pack_path: "${cpp}" (must be workspace-relative and not contain ..).`);
    } else {
      const fullPackPath = path.join(repoRoot, cpp);
      try {
        if (!fs.existsSync(fullPackPath)) {
          errors.push(`context_pack_path file does not exist: "${cpp}"`);
        }
      } catch (e) {
        errors.push(`Error checking existence of context_pack_path "${cpp}": ${e.message}`);
      }
    }
  }
  
  // Validate verification_commands non-empty array
  if (!Array.isArray(handoff.verification_commands) || handoff.verification_commands.length === 0) {
    errors.push('verification_commands must be a non-empty array of strings.');
  } else {
    for (let i = 0; i < handoff.verification_commands.length; i++) {
      if (typeof handoff.verification_commands[i] !== 'string') {
        errors.push(`verification_commands[${i}] must be a string.`);
      }
    }
  }
  
  // Validate resume_stage
  if (knownStageIds && Array.isArray(knownStageIds)) {
    if (!knownStageIds.includes(handoff.resume_stage)) {
      errors.push(`resume_stage "${handoff.resume_stage}" is invalid. Must be one of: ${knownStageIds.join(', ')}.`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validatePolicyConfig,
  validateContextPack,
  validateHandoffArtifact
};
