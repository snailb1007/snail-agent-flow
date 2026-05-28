const fs = require('fs');
const path = require('path');

const VALID_SIGNALS = new Set([
  'phase_duration',
  'revision_count',
  'escalation_count',
  'test_pain',
  'review_flag'
]);

/**
 * Logs a signal to the current-period.md file.
 * 
 * @param {string} type - The signal type.
 * @param {string|number} value - The value of the signal.
 * @param {string} [reason] - Optional reason/details.
 * @param {string} [targetDir] - Optional directory to write to.
 * @returns {string} The path to the written file.
 */
function logSignal(type, value, reason = '', targetDir) {
  if (!VALID_SIGNALS.has(type)) {
    throw new Error(`Invalid signal type: "${type}". Expected one of: ${Array.from(VALID_SIGNALS).join(', ')}`);
  }

  const dirPath = targetDir || path.resolve(process.env.PROJECT_ROOT || process.cwd(), '.ai/signals');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, 'current-period.md');
  const now = new Date();
  const timestamp = now.toISOString();

  // If file doesn't exist, write a header
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# RAOS Observability Signals Log\n\nThis file tracks decision-aligned metrics for the current period.\n\n`, 'utf8');
  }

  const entry = `### [${timestamp}] ${type.toUpperCase()}\n- **Value:** ${value}\n- **Reason:** ${reason || 'Not specified'}\n\n`;

  fs.appendFileSync(filePath, entry, 'utf8');
  return filePath;
}

module.exports = {
  logSignal,
  VALID_SIGNALS
};
