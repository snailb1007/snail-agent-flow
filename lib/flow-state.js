'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePath } = require('./artifact-paths');

// A minimal JSON Schema-like validator for flow_state (using AJV or manual schema checks)
// To avoid adding heavy packages, we will write a strict manual validator.
function validate(state) {
  const required = [
    'schema_version', 'run_id', 'feature_slug', 'risk_profile', 'work_mode',
    'stage', 'status', 'attempt', 'completed_steps', 'pending_step',
    'locks', 'signals', 'consecutive_failures', 'retry_count', 'verified_artifacts'
  ];
  for (const field of required) {
    if (state[field] === undefined) {
      throw new Error(`Invalid flow state: missing required field '${field}'`);
    }
  }
  if (state.schema_version !== '2.0') {
    throw new Error(`Unsupported schema version: ${state.schema_version}`);
  }
  if (!['FAST', 'STANDARD', 'FULL'].includes(state.risk_profile)) {
    throw new Error(`Invalid risk profile: ${state.risk_profile}`);
  }
  if (!['FEATURE', 'BUGFIX', 'PROTOTYPE', 'REFACTOR', 'DOCS'].includes(state.work_mode)) {
    throw new Error(`Invalid work mode: ${state.work_mode}`);
  }
  if (!['align', 'trace', 'lay', 'act', 'settle'].includes(state.stage)) {
    throw new Error(`Invalid stage: ${state.stage}`);
  }
}

function load(repoRoot) {
  const statePath = path.isAbsolute(resolvePath('flow_state')) 
    ? resolvePath('flow_state') 
    : path.join(repoRoot, resolvePath('flow_state'));

  if (!fs.existsSync(statePath)) {
    return null;
  }
  const data = fs.readFileSync(statePath, 'utf8');
  const state = JSON.parse(data);
  validate(state);
  return state;
}

function save(repoRoot, state) {
  validate(state);
  const statePath = path.isAbsolute(resolvePath('flow_state'))
    ? resolvePath('flow_state')
    : path.join(repoRoot, resolvePath('flow_state'));

  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = statePath + '.' + process.pid + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, statePath);
}

function markStepComplete(state, stepId) {
  if (!state.completed_steps.includes(stepId)) {
    state.completed_steps.push(stepId);
  }
  if (state.pending_step === stepId) {
    state.pending_step = '';
  }
}

function setStage(state, stageId) {
  if (state.stage !== stageId) {
    if (!state.revision_history) {
      state.revision_history = [];
    }
    state.revision_history.push({
      task: state.feature_slug,
      from: state.stage,
      to: stageId,
      at: new Date().toISOString()
    });
    state.stage = stageId;
  }
}

module.exports = {
  load,
  save,
  markStepComplete,
  setStage,
  validate
};
