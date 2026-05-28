const RISK_DIMENSIONS = [
  'novelty',
  'blast_radius',
  'ambiguity',
  'reversibility',
  'user_biz_risk'
];

/**
 * Pure scoring function evaluating task risk based on five dimensions.
 *
 * @param {object} task - The task object containing risk ratings and optional override.
 * @returns {object} Score outcome including total and recommended profile.
 */
function score(task) {
  if (!task || typeof task !== 'object') {
    throw new Error('Task must be a valid object');
  }

  // Validate dimensions
  for (const dim of RISK_DIMENSIONS) {
    const val = task[dim];
    if (val === undefined || val === null) {
      throw new Error(`Missing required dimension: ${dim}`);
    }
    if (!Number.isInteger(val) || val < 0 || val > 2) {
      throw new Error(`Invalid value for dimension ${dim}: expected integer between 0 and 2, got ${val}`);
    }
  }

  const total = RISK_DIMENSIONS.reduce((sum, dim) => sum + task[dim], 0);

  let profile;
  if (task.override === 'BUGFIX' || task.override === 'PROTOTYPE') {
    profile = task.override;
  } else {
    if (total <= 2) {
      profile = 'FAST';
    } else if (total <= 5) {
      profile = 'STANDARD';
    } else {
      profile = 'FULL';
    }
  }

  const dimensions = {};
  for (const dim of RISK_DIMENSIONS) {
    dimensions[dim] = task[dim];
  }

  return {
    total,
    profile,
    dimensions
  };
}

module.exports = {
  score,
  RISK_DIMENSIONS
};
