'use strict';

const fs = require('fs');
const path = require('path');

function scanFiles(dir, filterFn, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return acc;
  }
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.gemini' || file === '.bg-shell') {
      continue;
    }
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }
    if (stat.isDirectory()) {
      scanFiles(fullPath, filterFn, acc);
    } else if (filterFn(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function validateDrift(repoRoot) {
  const results = [];

  // 1. Duplicate spec detection (scan for spec.md outside specs/)
  const specsOutside = scanFiles(repoRoot, (file) => {
    const rel = path.relative(repoRoot, file);
    return path.basename(file) === 'spec.md' && !rel.startsWith('specs' + path.sep);
  });

  if (specsOutside.length > 0) {
    results.push({
      check: 'duplicate_spec',
      status: 'BLOCKED',
      message: `Duplicate spec.md found outside specs/ directory: ${specsOutside.join(', ')}`
    });
  } else {
    results.push({
      check: 'duplicate_spec',
      status: 'PASS',
      message: 'No duplicate spec.md files found.'
    });
  }

  // Load artifact map dynamically
  let map;
  const mapPath = path.join(repoRoot, '.claude', 'skills', 'contracts', 'artifact-map.json');
  try {
    map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (err) {
    results.push({
      check: 'artifact_map_load',
      status: 'FAIL',
      message: `Failed to load artifact-map.json: ${err.message}`
    });
    return results;
  }

  // 2. Stale locks & claims checks
  const locksDir = path.join(repoRoot, map.canonical.locks_dir || '.ai/locks');
  const claimsDir = path.join(repoRoot, map.canonical.claims_dir || '.ai/claims');
  const staleFiles = [];

  const checkStale = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(dir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (!content) {
          staleFiles.push(filePath + ' (empty file)');
          continue;
        }
        const meta = JSON.parse(content);
        if (!meta || typeof meta !== 'object') {
          staleFiles.push(filePath + ' (invalid json)');
          continue;
        }

        let isStale = false;
        if (typeof meta.pid === 'number') {
          try {
            process.kill(meta.pid, 0);
          } catch (err) {
            if (err.code === 'ESRCH') {
              isStale = true;
            }
          }
        }

        const acquiredAt = meta.acquired_at || meta.start_time;
        if (acquiredAt) {
          const elapsed = (Date.now() - new Date(acquiredAt).getTime()) / 1000;
          const cap = typeof meta.stale_lock_cap_seconds === 'number'
            ? meta.stale_lock_cap_seconds
            : 3600;
          if (elapsed > cap) {
            isStale = true;
          }
        }

        if (isStale) {
          staleFiles.push(filePath);
        }
      } catch (e) {
        staleFiles.push(filePath + ' (corrupted)');
      }
    }
  };

  checkStale(locksDir);
  checkStale(claimsDir);

  if (staleFiles.length > 0) {
    results.push({
      check: 'stale_locks',
      status: 'WARN',
      message: `Stale locks/claims detected: ${staleFiles.join(', ')}`
    });
  } else {
    results.push({
      check: 'stale_locks',
      status: 'PASS',
      message: 'No stale locks or claims detected.'
    });
  }

  // 3. Path-outside-contract check (.ai/ files not in artifact-map)
  const aiDir = path.join(repoRoot, '.ai');
  const allowedRoots = Object.values(map.canonical).map(p => path.join(repoRoot, p));
  const unmappedAiFiles = scanFiles(aiDir, (file) => {
    if (path.basename(file) === '.DS_Store') return false;
    return !allowedRoots.some(allowed => file.startsWith(allowed) || allowed.startsWith(file));
  });

  if (unmappedAiFiles.length > 0) {
    results.push({
      check: 'path_outside_contract',
      status: 'WARN',
      message: `Unmapped files found in .ai/ folder: ${unmappedAiFiles.join(', ')}`
    });
  } else {
    results.push({
      check: 'path_outside_contract',
      status: 'PASS',
      message: 'All files in .ai/ conform to the artifact contract.'
    });
  }

  // 4. flow-state.json points to existing paths
  let flowStatePath = path.join(repoRoot, map.canonical.flow_state || '.ai/state/flow-state.json');
  if (!fs.existsSync(flowStatePath)) {
    flowStatePath = path.join(repoRoot, '.ai/state/flow-ledger.json');
  }

  if (fs.existsSync(flowStatePath)) {
    try {
      const stateContent = JSON.parse(fs.readFileSync(flowStatePath, 'utf8'));
      const missingArtifacts = [];
      
      if (Array.isArray(stateContent.verified_artifacts)) {
        for (const art of stateContent.verified_artifacts) {
          const artPath = path.isAbsolute(art) ? art : path.join(repoRoot, art);
          if (!fs.existsSync(artPath)) {
            missingArtifacts.push(art);
          }
        }
      }
      if (Array.isArray(stateContent.stages)) {
        for (const stage of stateContent.stages) {
          if (Array.isArray(stage.artifacts)) {
            for (const art of stage.artifacts) {
              const artPath = path.isAbsolute(art) ? art : path.join(repoRoot, art);
              if (!fs.existsSync(artPath)) {
                missingArtifacts.push(art);
              }
            }
          }
        }
      }

      if (missingArtifacts.length > 0) {
        results.push({
          check: 'flow_state_paths',
          status: 'WARN',
          message: `Flow state references non-existent artifacts: ${missingArtifacts.join(', ')}`
        });
      } else {
        results.push({
          check: 'flow_state_paths',
          status: 'PASS',
          message: 'All artifacts referenced in flow state exist on disk.'
        });
      }
    } catch (e) {
      results.push({
        check: 'flow_state_paths',
        status: 'FAIL',
        message: `Failed to parse flow state for path verification: ${e.message}`
      });
    }
  } else {
    results.push({
      check: 'flow_state_paths',
      status: 'PASS',
      message: 'Flow state file does not exist yet.'
    });
  }

  // 5. Signals JSONL validation
  const signalsPath = path.join(repoRoot, map.canonical.signals_file || '.ai/signals/current-period.jsonl');
  if (fs.existsSync(signalsPath)) {
    let validJSONL = true;
    let errMessage = '';
    const content = fs.readFileSync(signalsPath, 'utf8').trim();
    if (content) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          JSON.parse(line);
        } catch (e) {
          validJSONL = false;
          errMessage = `Line ${i + 1} is not valid JSON: ${e.message}`;
          break;
        }
      }
    }

    results.push({
      check: 'signals_format',
      status: validJSONL ? 'PASS' : 'FAIL',
      message: validJSONL ? 'Signals file is valid JSONL.' : `Signals file has corrupted JSON lines: ${errMessage}`
    });
  } else {
    results.push({
      check: 'signals_format',
      status: 'PASS',
      message: 'Signals file does not exist yet.'
    });
  }

  return results;
}

module.exports = {
  validateDrift
};
