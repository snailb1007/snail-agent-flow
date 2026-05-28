'use strict';

const fs = require('fs');
const path = require('path');

// Locate artifact-map.json relative to repository root
// Since we reside in lib/, root is one directory up
const repoRoot = path.resolve(__dirname, '..');
const mapPath = path.join(repoRoot, '.claude', 'skills', 'contracts', 'artifact-map.json');

let map;
try {
  map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
} catch (err) {
  throw new Error(`Failed to load artifact-map.json from ${mapPath}: ${err.message}`);
}

function getCanonical(key) {
  if (!map.canonical || !(key in map.canonical)) {
    const err = new Error(`Canonical path key '${key}' not found in artifact map.`);
    err.code = 'INVALID_KEY';
    throw err;
  }
  return map.canonical[key];
}

function resolvePath(dottedKey, variables = {}) {
  const parts = dottedKey.split('.');
  if (parts.length === 1) {
    // Try canonical lookup
    try {
      return getCanonical(dottedKey);
    } catch (e) {
      if (e.code === 'INVALID_KEY') {
        const err = new Error(`Key '${dottedKey}' not found in artifact map.`);
        err.code = 'INVALID_KEY';
        throw err;
      }
      throw e;
    }
  }

  const [group, key] = parts;
  let template;

  if (group === 'feature' && map.feature_artifacts && (key in map.feature_artifacts)) {
    template = map.feature_artifacts[key];
  } else if (group === 'staging' && map.staging_outputs && (key in map.staging_outputs)) {
    template = map.staging_outputs[key];
  } else {
    const err = new Error(`Dotted key '${dottedKey}' does not match any registered templates.`);
    err.code = 'INVALID_KEY';
    throw err;
  }

  // Replace variables in format {var_name}
  return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, varName) => {
    if (!(varName in variables)) {
      throw new Error(`Missing template variable '${varName}' to resolve path '${dottedKey}'`);
    }
    return variables[varName];
  });
}

// resolve is an alias for resolvePath
function resolve(dottedKey, variables = {}) {
  return resolvePath(dottedKey, variables);
}

module.exports = {
  resolve,
  resolvePath,
  getCanonical
};
