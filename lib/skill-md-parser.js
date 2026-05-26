/**
 * Shared SKILL.md parser utilities.
 */

/**
 * Extracts all content inside <execution_context>...</execution_context> blocks.
 *
 * @param {string} content
 * @returns {string[]} Inner text of each execution context block.
 */
function extractExecutionContextBlocks(content) {
  const blocks = [];
  const regex = /<execution_context>([\s\S]*?)<\/execution_context>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * Finds lines starting with `@` containing suspicious global/home directories.
 *
 * @param {string} block
 * @returns {Array<{line: string, body: string}>} Array of offending lines with their bodies.
 */
function findSuspiciousAtLines(block) {
  const offenders = [];
  const lines = block.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) {
      const body = trimmed.slice(1);
      if (/~|\$HOME|\.gemini\//.test(body)) {
        offenders.push({ line: trimmed, body });
      }
    }
  }
  return offenders;
}

module.exports = {
  extractExecutionContextBlocks,
  findSuspiciousAtLines
};
