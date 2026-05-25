const { parseYaml } = require('./yaml-parser');

/**
 * Creates a ledger state object from a parsed flow definition.
 * The ledger tracks stage progress, artifact verification, gate results,
 * and revision history for a project flow.
 *
 * @param {object} flowDefinition - Parsed flow definition (output of parseYaml)
 * @param {string} [flowDefinitionPath] - Relative path to the flow definition file
 * @returns {object} Ledger JSON object ready to write to disk
 */
function createLedgerFromFlow(flowDefinition, flowDefinitionPath) {
  if (!flowDefinition || typeof flowDefinition !== 'object') {
    throw new Error('Flow definition must be a non-null object.');
  }

  if (!flowDefinition.name || typeof flowDefinition.name !== 'string') {
    throw new Error('Flow definition must have a "name" field.');
  }

  if (!Array.isArray(flowDefinition.stages) || flowDefinition.stages.length === 0) {
    throw new Error('Flow definition must have a non-empty "stages" array.');
  }

  const now = new Date().toISOString();

  const stages = flowDefinition.stages.map(stage => {
    if (!stage.id || typeof stage.id !== 'string') {
      throw new Error(`Each stage must have an "id" field. Found: ${JSON.stringify(stage)}`);
    }

    return {
      id: stage.id,
      name: stage.name || stage.id,
      status: 'pending',
      artifacts: [],
      gate_result: null,
      started_at: null,
      completed_at: null,
      revision_count: 0
    };
  });

  return {
    flow_name: flowDefinition.name,
    flow_version: flowDefinition.version != null ? String(flowDefinition.version) : '0.0.0',
    flow_definition_path: flowDefinitionPath || null,
    current_stage: stages[0].id,
    created_at: now,
    updated_at: now,
    stages,
    revision_history: []
  };
}

module.exports = {
  createLedgerFromFlow
};
