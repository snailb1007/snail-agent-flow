'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { OwnershipStore } = require('../../lib/ownership-store');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// Helper to create a temporary test directory
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-ownership-store-'));
}

// 1. Greenfield acquire creates a valid JSON file and metadata
addTest('Greenfield acquire creates a valid JSON lock file', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-1';
    const owner = 'agent-alice';
    const purpose = 'Testing greenfield lock';
    const cap = 120;

    const result = store.acquire(key, owner, {
      staleLockCapSeconds: cap,
      purpose: purpose
    });

    assert.strictEqual(result, true, 'Greenfield acquire should return true');

    const lockPath = path.join(tempDir, key + '.json');
    assert.strictEqual(fs.existsSync(lockPath), true, 'Lock file should exist on disk');

    const content = fs.readFileSync(lockPath, 'utf8');
    const metadata = JSON.parse(content);

    assert.strictEqual(metadata.owner, owner, 'Owner should match Alice');
    assert.strictEqual(metadata.pid, process.pid, 'PID should match current process');
    assert.strictEqual(metadata.purpose, purpose, 'Purpose should match input');
    assert.strictEqual(metadata.stale_lock_cap_seconds, cap, 'Stale cap should match input');
    assert.ok(metadata.acquired_at, 'acquired_at should be defined');
    assert.doesNotThrow(() => new Date(metadata.acquired_at), 'acquired_at should be a valid date');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 2. Double acquire fails with LOCK_UNAVAILABLE
addTest('Double acquire fails with LOCK_UNAVAILABLE', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-2';

    // Alice acquires first
    store.acquire(key, 'agent-alice');

    // Bob tries to acquire the same lock
    assert.throws(() => {
      store.acquire(key, 'agent-bob');
    }, (err) => {
      return err.code === 'LOCK_UNAVAILABLE';
    }, 'Bob should be blocked and receive LOCK_UNAVAILABLE');

    // Alice tries to acquire again
    assert.throws(() => {
      store.acquire(key, 'agent-alice');
    }, (err) => {
      return err.code === 'LOCK_UNAVAILABLE';
    }, 'Alice should be blocked by her own active lock');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 3. Path Traversal Prevention
addTest('Key with path traversal characters throws INVALID_ARGUMENT', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const badKeys = [
      '../test',
      'test/../file',
      'test/slug',
      'test.json',
      'bad_key!',
      'spaces in key'
    ];

    for (const key of badKeys) {
      assert.throws(() => {
        store.acquire(key, 'agent-alice');
      }, (err) => {
        return err.code === 'INVALID_ARGUMENT';
      }, `Key "${key}" should trigger INVALID_ARGUMENT on acquire`);

      assert.throws(() => {
        store.release(key, 'agent-alice');
      }, (err) => {
        return err.code === 'INVALID_ARGUMENT';
      }, `Key "${key}" should trigger INVALID_ARGUMENT on release`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 4. Release deletes the file and returns true/false
addTest('Release happy path and non-existent lock behavior', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-4';
    const owner = 'agent-alice';

    // Greenfield release on non-existent lock returns false
    const relBefore = store.release(key, owner);
    assert.strictEqual(relBefore, false, 'Release on non-existent lock should return false');

    // Acquire and release
    store.acquire(key, owner);
    const relAfter = store.release(key, owner);
    assert.strictEqual(relAfter, true, 'Release on active lock should return true');

    const lockPath = path.join(tempDir, key + '.json');
    assert.strictEqual(fs.existsSync(lockPath), false, 'Lock file should have been deleted');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 5. Release by wrong owner throws OWNER_MISMATCH
addTest('Release by wrong owner throws OWNER_MISMATCH', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-5';

    store.acquire(key, 'agent-alice');

    assert.throws(() => {
      store.release(key, 'agent-bob');
    }, (err) => {
      return err.code === 'OWNER_MISMATCH';
    }, 'Bob trying to release Alice\'s lock should throw OWNER_MISMATCH');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 6. Stale steal - Dead PID
addTest('Stale lock is stolen when PID is dead', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-6';

    // Write a lock file manually with a dead process ID
    const lockPath = path.join(tempDir, key + '.json');
    const staleMetadata = {
      owner: 'agent-dead',
      pid: 999999, // Guaranteed dead PID
      acquired_at: new Date().toISOString(),
      stale_lock_cap_seconds: 3600,
      purpose: 'stale process'
    };
    fs.writeFileSync(lockPath, JSON.stringify(staleMetadata, null, 2), 'utf8');

    // Bob acquires, should succeed by stealing
    const result = store.acquire(key, 'agent-bob');
    assert.strictEqual(result, true, 'Bob should steal the dead PID lock');

    const content = fs.readFileSync(lockPath, 'utf8');
    const newMetadata = JSON.parse(content);
    assert.strictEqual(newMetadata.owner, 'agent-bob', 'Owner should now be Bob');
    assert.strictEqual(newMetadata.pid, process.pid, 'PID should be updated to current process');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 7. Stale steal - TTL Expired
addTest('Stale lock is stolen when TTL has expired', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-7';

    // Write lock file manually with expired acquired_at timestamp
    const lockPath = path.join(tempDir, key + '.json');
    const expiredTime = new Date(Date.now() - 5000 * 1000).toISOString(); // 5000s ago
    const staleMetadata = {
      owner: 'agent-alice',
      pid: process.pid, // Current PID is alive, but TTL is expired
      acquired_at: expiredTime,
      stale_lock_cap_seconds: 10, // TTL expired
      purpose: 'expired TTL'
    };
    fs.writeFileSync(lockPath, JSON.stringify(staleMetadata, null, 2), 'utf8');

    // Bob acquires, should steal
    const result = store.acquire(key, 'agent-bob');
    assert.strictEqual(result, true, 'Bob should steal the expired TTL lock');

    const content = fs.readFileSync(lockPath, 'utf8');
    const newMetadata = JSON.parse(content);
    assert.strictEqual(newMetadata.owner, 'agent-bob', 'Owner should now be Bob');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 8. Stale steal - Empty/Malformed File
addTest('Stale lock is stolen when lock file is empty or malformed JSON', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-8';
    const lockPath = path.join(tempDir, key + '.json');

    // Malformed JSON lock file
    fs.writeFileSync(lockPath, 'invalid json content here', 'utf8');

    // Bob acquires, should steal
    const result1 = store.acquire(key, 'agent-bob');
    assert.strictEqual(result1, true, 'Bob should steal the malformed JSON lock');
    assert.strictEqual(store.release(key, 'agent-bob'), true);

    // Empty lock file
    fs.writeFileSync(lockPath, '', 'utf8');

    // Alice acquires, should steal
    const result2 = store.acquire(key, 'agent-alice');
    assert.strictEqual(result2, true, 'Alice should steal the empty lock');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 9. Concurrency / Race-proof stale steal
addTest('Race-proof stale-steal retry handling on rename collision', () => {
  const tempDir = createTempDir();
  const originalRenameSync = fs.renameSync;
  try {
    const store = new OwnershipStore(tempDir);
    const key = 'test-lock-9';
    const lockPath = path.join(tempDir, key + '.json');

    // Create a stale lock file first
    const staleMetadata = {
      owner: 'agent-alice',
      pid: 999999, // dead PID
      acquired_at: new Date().toISOString(),
      stale_lock_cap_seconds: 3600
    };
    fs.writeFileSync(lockPath, JSON.stringify(staleMetadata, null, 2), 'utf8');

    // Stub fs.renameSync to simulate another process renaming the file first (losing the race)
    let renamesAttempted = 0;
    fs.renameSync = function(oldPath, newPath) {
      if (oldPath === lockPath && newPath.includes('.trash.')) {
        renamesAttempted++;
        if (renamesAttempted === 1) {
          // Process C loses the race: lock file got stolen or deleted by Process B in the split-second before
          try {
            fs.unlinkSync(lockPath);
          } catch (e) {}
          const err = new Error('ENOENT: no such file or directory');
          err.code = 'ENOENT';
          throw err;
        }
      }
      return originalRenameSync.apply(this, arguments);
    };

    // Bob tries to acquire. Since the first renameSync fails with ENOENT, Bob's acquire
    // should catch it, retry, and successfully acquire the lock via Greenfield open Sync
    const result = store.acquire(key, 'agent-bob');
    assert.strictEqual(result, true, 'Bob should acquire lock on retry');
    assert.strictEqual(renamesAttempted, 1, 'Rename should have been attempted once and stubbed as ENOENT');

    // Verify Bob is the owner
    const content = fs.readFileSync(lockPath, 'utf8');
    const newMetadata = JSON.parse(content);
    assert.strictEqual(newMetadata.owner, 'agent-bob', 'Owner should now be Bob');
  } finally {
    fs.renameSync = originalRenameSync;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 10. list() ignores malformed or expired locks
addTest('list() filters out invalid, stale, or malformed locks', () => {
  const tempDir = createTempDir();
  try {
    const store = new OwnershipStore(tempDir);

    // 1. Valid Active Lock A
    store.acquire('lock-a', 'agent-alice');

    // 2. Valid Active Lock B
    store.acquire('lock-b', 'agent-bob', { staleLockCapSeconds: 2000 });

    // 3. Stale Lock C (dead PID)
    const staleMetadata = {
      owner: 'agent-dead',
      pid: 999999,
      acquired_at: new Date().toISOString(),
      stale_lock_cap_seconds: 3600
    };
    fs.writeFileSync(path.join(tempDir, 'lock-c.json'), JSON.stringify(staleMetadata, null, 2), 'utf8');

    // 4. Stale Lock D (expired TTL)
    const expiredMetadata = {
      owner: 'agent-alice',
      pid: process.pid,
      acquired_at: new Date(Date.now() - 100 * 1000).toISOString(),
      stale_lock_cap_seconds: 5 // expired
    };
    fs.writeFileSync(path.join(tempDir, 'lock-d.json'), JSON.stringify(expiredMetadata, null, 2), 'utf8');

    // 5. Corrupt lock (malformed JSON)
    fs.writeFileSync(path.join(tempDir, 'lock-corrupt.json'), '{invalid json}', 'utf8');

    // 6. Empty lock
    fs.writeFileSync(path.join(tempDir, 'lock-empty.json'), '', 'utf8');

    // 7. Non-JSON file (should be ignored)
    fs.writeFileSync(path.join(tempDir, 'ignored-file.txt'), 'text data', 'utf8');

    const activeLocks = store.list();
    assert.strictEqual(activeLocks.length, 2, 'list() should return exactly 2 active locks');

    const keys = activeLocks.map(l => l.key).sort();
    assert.deepStrictEqual(keys, ['lock-a', 'lock-b'], 'Active keys should be lock-a and lock-b');

    const lockA = activeLocks.find(l => l.key === 'lock-a');
    assert.strictEqual(lockA.owner, 'agent-alice');
    assert.strictEqual(lockA.pid, process.pid);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// Run all tests
let failedCount = 0;
console.log('Running OwnershipStore unit tests...\n');

for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ PASS: ${t.name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${t.name}`);
    console.error(`   Error: ${err.message}`);
    console.error(err.stack);
    failedCount++;
  }
}

console.log('\n--- OwnershipStore Test Summary ---');
console.log(`Passed: ${tests.length - failedCount}/${tests.length}`);
if (failedCount > 0) {
  console.error(`Failed: ${failedCount}`);
  process.exit(1);
} else {
  console.log('All OwnershipStore unit tests passed successfully!');
  process.exit(0);
}
