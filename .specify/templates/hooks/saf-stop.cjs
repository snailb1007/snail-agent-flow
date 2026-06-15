'use strict';

const { execSync } = require('child_process');
const path = require('path');

function run() {
  const repoRoot = path.resolve(__dirname, '../..');
  try {
    console.log('\n[saf-stop] Running memory compaction prep...');
    execSync('node bin/adp.js compact-memory', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, PAGER: 'cat' }
    });
    console.log('\n[saf-stop] REMINDER: Please spawn a subagent on the prescribed model to complete memory compaction & handoff!');
  } catch (e) {
    // Fail silently on stop
  }
}

run();
