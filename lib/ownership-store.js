'use strict';

const fs = require('fs');
const path = require('path');

class OwnershipStore {
  /**
   * @param {string} dirPath - Absolute path to the locks/claims directory.
   */
  constructor(dirPath) {
    if (!dirPath) {
      throw new Error('dirPath is required for OwnershipStore');
    }
    this.dirPath = path.resolve(dirPath);
    
    // Ensure the directory exists idempotently
    if (!fs.existsSync(this.dirPath)) {
      fs.mkdirSync(this.dirPath, { recursive: true });
    }
  }

  /**
   * Atomically acquires an exclusive lock.
   *
   * @param {string} key - Safe slug filename matching ^[a-zA-Z0-9_-]+$.
   * @param {string} owner - The owner identifier claiming the lock.
   * @param {object} [options] - Optional configurations.
   * @param {number} [options.staleLockCapSeconds=3600] - TTL in seconds.
   * @param {string} [options.purpose=null] - Purpose description.
   * @returns {boolean} True if successfully acquired.
   * @throws {Error} LOCK_UNAVAILABLE or INVALID_ARGUMENT.
   */
  acquire(key, owner, options = {}) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      const err = new Error(`Invalid lock key format: "${key}". Key must match ^[a-zA-Z0-9_-]+$`);
      err.code = 'INVALID_ARGUMENT';
      throw err;
    }

    const lockFilePath = path.join(this.dirPath, key + '.json');
    const staleLockCapSeconds = options.staleLockCapSeconds || 3600;

    while (true) {
      try {
        // OS kernel-level atomic exclusive creation
        const fd = fs.openSync(lockFilePath, 'wx');
        fs.closeSync(fd);

        const metadata = {
          owner: owner,
          pid: process.pid,
          acquired_at: new Date().toISOString(),
          stale_lock_cap_seconds: staleLockCapSeconds,
          purpose: options.purpose || null
        };

        // Write metadata to unique temp path first (crash safety)
        const tmpPath = lockFilePath + '.' + process.pid + '.' + Date.now() + '.' + Math.random().toString(36).substring(2, 7) + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(metadata, null, 2), 'utf8');

        // Atomically replace empty lock file with metadata
        fs.renameSync(tmpPath, lockFilePath);
        return true;
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }

        // Lock file exists. Read and check if it is stale.
        let isStale = false;
        let existingMetadata = null;

        try {
          const content = fs.readFileSync(lockFilePath, 'utf8').trim();
          if (!content) {
            isStale = true;
          } else {
            existingMetadata = JSON.parse(content);
            if (!existingMetadata || typeof existingMetadata !== 'object' || typeof existingMetadata.pid !== 'number') {
              isStale = true;
            } else {
              // Dead PID check
              let isPidDead = false;
              try {
                process.kill(existingMetadata.pid, 0);
              } catch (killErr) {
                if (killErr.code === 'ESRCH') {
                  isPidDead = true;
                }
              }

              // TTL check
              const elapsedSeconds = (Date.now() - new Date(existingMetadata.acquired_at).getTime()) / 1000;
              const cap = typeof existingMetadata.stale_lock_cap_seconds === 'number'
                ? existingMetadata.stale_lock_cap_seconds
                : staleLockCapSeconds;
              const isTtlExpired = elapsedSeconds > cap;

              if (isPidDead || isTtlExpired) {
                isStale = true;
              }
            }
          }
        } catch (e) {
          isStale = true;
        }

        if (!isStale) {
          const activeErr = new Error(`Lock "${key}" is currently held by owner: ${existingMetadata ? existingMetadata.owner : 'unknown'}`);
          activeErr.code = 'LOCK_UNAVAILABLE';
          throw activeErr;
        }

        // Race-proof stealing by renaming first
        const trashPath = lockFilePath + '.trash.' + process.pid + '.' + Date.now() + '.' + Math.random().toString(36).substring(2, 7);
        try {
          fs.renameSync(lockFilePath, trashPath);
          try {
            fs.unlinkSync(trashPath);
          } catch (e) {
            // Ignore unlink error
          }
          // Stole successfully, loop again to create lock file exclusively
        } catch (renameErr) {
          if (renameErr.code === 'ENOENT') {
            // Another process won the race. Retry.
            continue;
          }
          throw renameErr;
        }
      }
    }
  }

  /**
   * Releases the lock if the owner matches.
   *
   * @param {string} key - Safe slug filename matching ^[a-zA-Z0-9_-]+$.
   * @param {string} owner - The owner identifier releasing the lock.
   * @returns {boolean} True if successfully released, false if it did not exist.
   * @throws {Error} OWNER_MISMATCH or INVALID_ARGUMENT.
   */
  release(key, owner) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      const err = new Error(`Invalid lock key format: "${key}". Key must match ^[a-zA-Z0-9_-]+$`);
      err.code = 'INVALID_ARGUMENT';
      throw err;
    }

    const lockFilePath = path.join(this.dirPath, key + '.json');
    if (!fs.existsSync(lockFilePath)) {
      return false;
    }

    let metadata = null;
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8').trim();
      if (content) {
        metadata = JSON.parse(content);
      }
    } catch (e) {
      // Corrupt or empty JSON, proceed to delete
    }

    if (metadata && metadata.owner !== owner) {
      const err = new Error(`Owner mismatch: lock is held by "${metadata.owner}", requested by "${owner}"`);
      err.code = 'OWNER_MISMATCH';
      throw err;
    }

    try {
      fs.unlinkSync(lockFilePath);
      return true;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw e;
    }
  }

  /**
   * Lists all active, non-stale locks.
   *
   * @returns {Array<object>} Array of parsed active lock objects, including a `key` field.
   */
  list() {
    if (!fs.existsSync(this.dirPath)) {
      return [];
    }

    let files = [];
    try {
      files = fs.readdirSync(this.dirPath);
    } catch (e) {
      return [];
    }

    const activeLocks = [];
    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.dirPath, file);
      const key = file.slice(0, -5);

      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (!content) {
          continue;
        }

        const metadata = JSON.parse(content);
        if (!metadata || typeof metadata !== 'object' || typeof metadata.pid !== 'number') {
          continue;
        }

        // Dead PID check
        let isPidDead = false;
        try {
          process.kill(metadata.pid, 0);
        } catch (killErr) {
          if (killErr.code === 'ESRCH') {
            isPidDead = true;
          }
        }

        // TTL check
        const elapsedSeconds = (Date.now() - new Date(metadata.acquired_at).getTime()) / 1000;
        const cap = typeof metadata.stale_lock_cap_seconds === 'number'
          ? metadata.stale_lock_cap_seconds
          : 3600;
        const isTtlExpired = elapsedSeconds > cap;

        if (isPidDead || isTtlExpired) {
          continue;
        }

        activeLocks.push(Object.assign({ key }, metadata));
      } catch (e) {
        // Skip corrupted/invalid files
      }
    }

    return activeLocks;
  }
}

module.exports = {
  OwnershipStore
};
