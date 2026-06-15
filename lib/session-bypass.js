'use strict';

const fs = require('fs');
const path = require('path');

function getBypassPath(repoRoot) {
  return path.join(repoRoot, '.ai/state/session-bypass.json');
}

function normalizeGateId(gateId) {
  return String(gateId || '').trim().toLowerCase();
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

function addBypass(repoRoot, gateId, ttlSeconds, reason) {
  // Sàn cứng: validate-spec core và security gate KHÔNG bao giờ bypass được
  const FORBIDDEN_GATES = ['validate-spec', 'validate-spec-core', 'security', 'security-gate'];
  const normalizedGateId = normalizeGateId(gateId);
  if (FORBIDDEN_GATES.includes(normalizedGateId)) {
    console.error(`Error: Gate "${gateId}" is critical and cannot be bypassed.`);
    process.exit(1);
  }

  const ttl = ttlSeconds || 3600; // default 1 hour
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  
  const bypasses = loadBypasses(repoRoot).filter(b => new Date(b.expires_at) > new Date());
  
  // Remove existing active bypass for same gate to avoid duplicates
  const newBypasses = bypasses.filter(b => normalizeGateId(b.gate) !== normalizedGateId);

  const entry = {
    gate: normalizedGateId,
    expires_at: expiresAt,
    pid: process.pid,
    reason: reason || 'No reason provided'
  };

  newBypasses.push(entry);
  saveBypasses(repoRoot, newBypasses);

  // Log audit trail
  try {
    const auditPath = path.join(repoRoot, '.ai/signals/bypass.jsonl');
    const dir = path.dirname(auditPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const auditRecord = {
      timestamp: new Date().toISOString(),
      action: 'add',
      gate: normalizedGateId,
      expires_at: expiresAt,
      pid: process.pid,
      reason: reason || 'No reason provided'
    };
    fs.appendFileSync(auditPath, JSON.stringify(auditRecord) + '\n', 'utf8');
  } catch (e) {}

  console.log(`[bypass] Created temporary bypass for gate "${normalizedGateId}" (TTL: ${ttl}s, expires at: ${expiresAt})`);
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
  saveBypasses(repoRoot, []);
  console.log('[bypass] Cleared all session bypasses.');
}

module.exports = {
  addBypass,
  checkBypass,
  listBypasses,
  clearBypasses,
  normalizeGateId
};
