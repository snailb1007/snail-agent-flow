'use strict';

const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

async function run() {
  const repoRoot = path.resolve(__dirname, '../..');
  const inputStr = await readStdin();
  if (!inputStr.trim()) {
    process.exit(0);
  }

  try {
    const event = JSON.parse(inputStr);
    if (event.hookEventName !== 'PreToolUse') {
      process.exit(0);
    }

    const toolInput = event.toolInput || event.tool_input || {};
    const filePath = toolInput.file_path || toolInput.filePath || toolInput.path;

    if (!filePath) {
      process.exit(0);
    }

    const absFile = path.resolve(repoRoot, filePath);
    const { LeaseManager } = require('../../lib/lease-manager');
    const leaseManager = new LeaseManager(path.join(repoRoot, '.ai/locks'));
    
    const currentOwner = process.env.USER || process.env.USERNAME || 'agent';
    const info = leaseManager.inspect(absFile);

    if (info.held && info.owner !== currentOwner) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `This file is currently leased by owner: ${info.owner} (pid: ${info.pid}, purpose: ${info.purpose})`
        }
      }));
    }
  } catch (e) {
    // Fail silently to avoid blocking tools on unexpected errors
  }
  process.exit(0);
}

run();
