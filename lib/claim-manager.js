'use strict';

const fs = require('fs');
const path = require('path');
const { OwnershipStore } = require('./ownership-store');

class ClaimManager {
  /**
   * @param {string} dirPath - Absolute path to the claims directory.
   */
  constructor(dirPath) {
    this.store = new OwnershipStore(dirPath);
  }

  /**
   * Claims a task for an owner.
   *
   * @param {string} task - The task slug.
   * @param {object} metadata - Claim details.
   * @param {string} metadata.owner - The owner claiming the task.
   * @param {string} metadata.profile - The selected profile.
   * @param {Array<string>} [metadata.scope] - Array of write targets.
   * @returns {boolean} True if successfully claimed.
   */
  claim(task, { owner, profile, scope }) {
    if (!owner) {
      throw new Error('owner is required to claim a task');
    }

    // Acquire lock using ownership-store
    this.store.acquire(task, owner);

    // Enrich the lock file with claim-specific fields
    const lockFilePath = path.join(this.store.dirPath, task + '.json');
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const data = JSON.parse(content);

      data.task = task;
      data.profile = profile || null;
      data.scope = scope || [];
      data.start_time = data.acquired_at;
      data.status = 'active';

      fs.writeFileSync(lockFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // Clean up if enrichment fails
      try {
        this.store.release(task, owner);
      } catch (relErr) {
        // ignore
      }
      throw e;
    }

    return true;
  }

  /**
   * Releases a claim.
   *
   * @param {string} task - The task slug.
   * @param {string} owner - The owner releasing the claim.
   * @returns {boolean} True if released.
   */
  release(task, owner) {
    return this.store.release(task, owner);
  }

  /**
   * Gets the status of a claim.
   *
   * @param {string} task - The task slug.
   * @returns {object|null} The claim record or null if not claimed/stale.
   */
  status(task) {
    const activeList = this.store.list();
    const activeLock = activeList.find(item => item.key === task);
    if (!activeLock) {
      return null;
    }

    const lockFilePath = path.join(this.store.dirPath, task + '.json');
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const data = JSON.parse(content);
      return {
        owner: data.owner,
        task: data.task || task,
        profile: data.profile || null,
        scope: data.scope || [],
        start_time: data.start_time || data.acquired_at,
        status: data.status || 'active',
        pid: data.pid,
        stale_lock_cap_seconds: data.stale_lock_cap_seconds
      };
    } catch (e) {
      return {
        owner: activeLock.owner,
        task: activeLock.task || task,
        profile: activeLock.profile || null,
        scope: activeLock.scope || [],
        start_time: activeLock.start_time || activeLock.acquired_at,
        status: activeLock.status || 'active',
        pid: activeLock.pid,
        stale_lock_cap_seconds: activeLock.stale_lock_cap_seconds
      };
    }
  }

  /**
   * Lists all active claims.
   *
   * @returns {Array<object>} List of active claims.
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
          task: data.task || activeLock.key,
          profile: data.profile || null,
          scope: data.scope || [],
          start_time: data.start_time || data.acquired_at,
          status: data.status || 'active',
          pid: data.pid,
          stale_lock_cap_seconds: data.stale_lock_cap_seconds
        };
      } catch (e) {
        return {
          owner: activeLock.owner,
          task: activeLock.task || activeLock.key,
          profile: activeLock.profile || null,
          scope: activeLock.scope || [],
          start_time: activeLock.start_time || activeLock.acquired_at,
          status: activeLock.status || 'active',
          pid: activeLock.pid,
          stale_lock_cap_seconds: activeLock.stale_lock_cap_seconds
        };
      }
    });
  }
}

module.exports = {
  ClaimManager
};
