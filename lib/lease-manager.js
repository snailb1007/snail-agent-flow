'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { OwnershipStore } = require('./ownership-store');

class LeaseManager {
  /**
   * @param {string} dirPath - Absolute path to the locks directory.
   */
  constructor(dirPath) {
    this.store = new OwnershipStore(dirPath);
  }

  /**
   * Generates a unique, safe key for a file path.
   *
   * @param {string} file - Path to the file.
   * @returns {string} SHA-256 hex string.
   */
  getFileKey(file) {
    const resolvedPath = path.resolve(file);
    return crypto.createHash('sha256').update(resolvedPath).digest('hex');
  }

  /**
   * Acquires a lease on a file.
   *
   * @param {string} file - Path to the target file.
   * @param {object} options - Details.
   * @param {string} options.owner - The owner identifier.
   * @param {string} [options.purpose] - The purpose of the lease.
   * @param {number} [options.stale_lock_cap_seconds=3600] - TTL.
   * @returns {boolean} True if successfully acquired.
   */
  acquire(file, { owner, purpose, stale_lock_cap_seconds }) {
    if (!owner) {
      throw new Error('owner is required to acquire a lease');
    }

    const key = this.getFileKey(file);
    const staleSeconds = stale_lock_cap_seconds || 3600;

    // Acquire lock using ownership-store
    this.store.acquire(key, owner, {
      staleLockCapSeconds: staleSeconds,
      purpose: purpose || null
    });

    // Enrich the lock file with target_file path
    const lockFilePath = path.join(this.store.dirPath, key + '.json');
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const data = JSON.parse(content);

      data.target_file = path.resolve(file);
      data.acquired_time = data.acquired_at;

      fs.writeFileSync(lockFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // Clean up if enrichment fails
      try {
        this.store.release(key, owner);
      } catch (relErr) {
        // ignore
      }
      throw e;
    }

    return true;
  }

  /**
   * Releases a lease on a file.
   *
   * @param {string} file - Path to the target file.
   * @param {string} owner - The owner identifier releasing it.
   * @returns {boolean} True if released.
   */
  release(file, owner) {
    const key = this.getFileKey(file);
    return this.store.release(key, owner);
  }

  /**
   * Lists all active leases.
   *
   * @returns {Array<object>} Array of lease objects.
   */
  list() {
    const activeList = this.store.list();
    return activeList.map(activeLock => {
      const lockFilePath = path.join(this.store.dirPath, activeLock.key + '.json');
      try {
        const content = fs.readFileSync(lockFilePath, 'utf8');
        const data = JSON.parse(content);
        return {
          owner: data.owner,
          target_file: data.target_file || null,
          purpose: data.purpose || null,
          acquired_time: data.acquired_time || data.acquired_at,
          pid: data.pid,
          stale_lock_cap_seconds: data.stale_lock_cap_seconds,
          key: activeLock.key
        };
      } catch (e) {
        return {
          owner: activeLock.owner,
          target_file: null,
          purpose: activeLock.purpose || null,
          acquired_time: activeLock.acquired_at,
          pid: activeLock.pid,
          stale_lock_cap_seconds: activeLock.stale_lock_cap_seconds,
          key: activeLock.key
        };
      }
    });
  }
}

module.exports = {
  LeaseManager
};
