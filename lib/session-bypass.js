'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_TTL_SECONDS = 3600;
const MAX_TTL_SECONDS = 24 * 60 * 60;
const FORBIDDEN_GATES = new Set([
  'validate-spec',
  'validate-spec-core',
  'security',
  'security-gate'
]);
const BYPASSABLE_GATES = new Set([
  'budget',
  'diff-hygiene',
  'lease'
]);

function getBypassPath(repoRoot) {
  return path.join(repoRoot, '.ai/state/session-bypass.json');
}

function getAuditPath(repoRoot) {
  return path.join(repoRoot, '.ai/signals/bypass.jsonl');
}

function normalizeGateId(gateId) {
  return String(gateId || '').trim().toLowerCase();
}

function formatGateList(gates) {
  return Array.from(gates).sort().join(', ');
}

function validateGateId(gateId) {
  const normalizedGateId = normalizeGateId(gateId);
  if (!normalizedGateId) {
    throw new Error('Missing gate id.');
  }
  if (FORBIDDEN_GATES.has(normalizedGateId)) {
    throw new Error(`Gate "${gateId}" is critical and cannot be bypassed.`);
  }
  if (!BYPASSABLE_GATES.has(normalizedGateId)) {
    throw new Error(`Gate "${gateId}" is not a bypassable secondary gate. Supported gates: ${formatGateList(BYPASSABLE_GATES)}.`);
  }
  return normalizedGateId;
}

function normalizeTtlSeconds(ttlSeconds) {
  const ttl = ttlSeconds === undefined || ttlSeconds === null || ttlSeconds === ''
    ? DEFAULT_TTL_SECONDS
    : Number(ttlSeconds);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error('TTL must be a positive integer number of seconds.');
  }
  if (ttl > MAX_TTL_SECONDS) {
    throw new Error(`TTL must be ${MAX_TTL_SECONDS} seconds or less.`);
  }
  return ttl;
}

function ensureGitignored(repoRoot) {
  try {
    const gitignorePath = path.join(repoRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return;
    }
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const target = '.ai/state/session-bypass.json';
    if (!content.includes(target)) {
      // Append with a newline
      fs.appendFileSync(gitignorePath, '\n# Ephemeral SAF bypass file\n' + target + '\n', 'utf8');
    }
  } catch (e) {
    // Ignore
  }
}

function loadBypasses(repoRoot) {
  const p = getBypassPath(repoRoot);
  if (!fs.existsSync(p)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveBypasses(repoRoot, bypasses) {
  const p = getBypassPath(repoRoot);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, JSON.stringify(bypasses, null, 2) + '\n', 'utf8');
  ensureGitignored(repoRoot);
}

function appendAuditRecord(repoRoot, record) {
  const auditPath = getAuditPath(repoRoot);
  const dir = path.dirname(auditPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(auditPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...record
  }) + '\n', 'utf8');
}

function addBypass(repoRoot, gateId, ttlSeconds, reason) {
  const normalizedGateId = validateGateId(gateId);
  const ttl = normalizeTtlSeconds(ttlSeconds);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
  const bypassReason = reason || 'No reason provided';
  
  const bypasses = loadBypasses(repoRoot).filter(b => new Date(b.expires_at) > now);
  
  // Remove existing active bypass for same gate to avoid duplicates
  const newBypasses = bypasses.filter(b => normalizeGateId(b.gate) !== normalizedGateId);

  const entry = {
    gate: normalizedGateId,
    expires_at: expiresAt,
    pid: process.pid,
    reason: bypassReason
  };

  // Audit first to guarantee the action is logged before making any changes.
  appendAuditRecord(repoRoot, {
    action: 'add',
    gate: normalizedGateId,
    expires_at: expiresAt,
    ttl_seconds: ttl,
    pid: process.pid,
    reason: bypassReason
  });

  newBypasses.push(entry);
  saveBypasses(repoRoot, newBypasses);

  console.log(`[bypass] Created temporary bypass for gate "${normalizedGateId}" (TTL: ${ttl}s, expires at: ${expiresAt})`);
  return entry;
}

function checkBypass(repoRoot, gateId) {
  const bypasses = loadBypasses(repoRoot);
  const now = new Date();
  const normalizedGateId = normalizeGateId(gateId);

  const activeBypasses = bypasses.filter(b => new Date(b.expires_at) > now);
  const found = activeBypasses.find(b => normalizeGateId(b.gate) === normalizedGateId);
  if (found) {
    return {
      bypassed: true,
      reason: found.reason,
      expires_at: found.expires_at
    };
  }

  return { bypassed: false };
}

function listBypasses(repoRoot) {
  const bypasses = loadBypasses(repoRoot).filter(b => new Date(b.expires_at) > new Date());
  if (bypasses.length === 0) {
    console.log('No active bypasses.');
    return;
  }
  console.log('Active Session Bypasses:');
  console.log('----------------------------------------------------');
  for (const b of bypasses) {
    console.log(`Gate: ${b.gate} | Expires: ${b.expires_at} | Reason: ${b.reason}`);
  }
}

function clearBypasses(repoRoot) {
  const existing = loadBypasses(repoRoot);
  // Audit first to guarantee the action is logged before making any changes.
  appendAuditRecord(repoRoot, {
    action: 'clear',
    cleared_count: existing.length,
    pid: process.pid
  });

  saveBypasses(repoRoot, []);
  console.log('[bypass] Cleared all session bypasses.');
  return existing.length;
}

module.exports = {
  addBypass,
  checkBypass,
  listBypasses,
  clearBypasses,
  normalizeGateId,
  normalizeTtlSeconds,
  validateGateId,
  BYPASSABLE_GATES,
  FORBIDDEN_GATES,
  DEFAULT_TTL_SECONDS,
  MAX_TTL_SECONDS
};
