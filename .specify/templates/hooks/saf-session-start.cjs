'use strict';

const { execSync } = require('child_process');
const path = require('path');

function run() {
  const repoRoot = path.resolve(__dirname, '../..');
  try {
    const output = execSync('node bin/adp.js status', {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, PAGER: 'cat' }
    });
    // Print first 15 lines of status output to seed LLM context
    const lines = output.split(/\r?\n/).slice(0, 15).join('\n');
    console.log('\n--- SAF Status Context ---');
    console.log(lines);
    console.log('--------------------------\n');
  } catch (e) {
    // Fail silently to not block session start
  }
}

run();
