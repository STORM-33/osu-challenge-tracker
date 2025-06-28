// Central background sync coordination
import { supabaseAdmin } from './supabase-admin';
import apiTracker from './api-tracker';

class SyncManager {
  constructor() {
    this.activeJobs = new Map(); // jobId -> job info
    this.globalCooldowns = new Map(); // resourceType:resourceId -> timestamp
    this.SYNC_THRESHOLD = 4 * 60 * 1000; // 4 minutes
    this.GLOBAL_COOLDOWN = 4 * 60 * 1000; // 4 minutes global cooldown
  }

  /**
   * Check if a resource can be synced (global cooldown + staleness check)
   */
  async canSync(resourceType, resourceId, forceCheck = false) {
    const key = `${resourceType}:${resourceId}`;
    const now = Date.now();

    // Check global cooldown first
    const lastGlobalSync = this.globalCooldowns.get(key);
    if (lastGlobalSync && (now - lastGlobalSync) < this.GLOBAL_COOLDOWN) {
      return {
        canSync: false,
        reason: 'global_cooldown',
        nextSyncIn: this.GLOBAL_COOLDOWN - (now - lastGlobalSync),
        lastSynced: lastGlobalSync
      };
    }

    // Check database staleness
    if (!forceCheck) {
      const staleness = await this.checkStaleness(resourceType, resourceId);
      if (!staleness.isStale) {
        return {
          canSync: false,
          reason: 'not_stale',
          lastSynced: staleness.lastUpdated,
          timeSinceUpdate: staleness.timeSinceUpdate
        };
      }
    }

    // Check API limits
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      return {
        canSync: false,
        reason: 'api_limit_critical',
        apiUsage: apiTracker.getUsageStats()
      };
    }

    return {
      canSync: true,
      reason: 'ready',
      limitStatus
    };
  }

  /**
   * Check if data is stale by querying the database
   */
  async checkStaleness(resourceType, resourceId) {
    const now = Date.now();

    switch (resourceType) {
      case 'challenge': {
        const { data: challenge, error } = await supabaseAdmin
          .from('challenges')
          .select('updated_at, is_active')
          .eq('room_id', parseInt(resourceId))
          .single();

        if (error || !challenge) {
          return { isStale: true, lastUpdated: null, timeSinceUpdate: Infinity };
        }

        if (!challenge.is_active) {
          return { isStale: false, lastUpdated: challenge.updated_at, timeSinceUpdate: 0 };
        }

        const lastUpdated = new Date(challenge.updated_at + (challenge.updated_at.endsWith('Z') ? '' : 'Z')).getTime();
        const timeSinceUpdate = now - lastUpdated;
      
        return {
          isStale: timeSinceUpdate > this.SYNC_THRESHOLD,
          lastUpdated,
          timeSinceUpdate
        };
      }

      default:
        return { isStale: true, lastUpdated: null, timeSinceUpdate: Infinity };
    }
  }

  /**
   * Get sync status for a resource
   */
  getSyncStatus(resourceType, resourceId) {
    const key = `${resourceType}:${resourceId}`;
    const now = Date.now();

    // Check if there's an active job
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.resourceType === resourceType && job.resourceId === resourceId) {
        return {
          inProgress: true,
          jobId,
          startedAt: job.startedAt,
          estimatedTimeRemaining: Math.max(0, 30000 - (now - job.startedAt)), // Estimate 30s max
          stage: job.stage || 'processing'
        };
      }
    }

    // Check global cooldown
    const lastSync = this.globalCooldowns.get(key);
    if (lastSync) {
      const timeSinceSync = now - lastSync;
      const cooldownRemaining = this.GLOBAL_COOLDOWN - timeSinceSync;

      return {
        inProgress: false,
        lastSynced: lastSync,
        timeSinceSync,
        canSyncIn: Math.max(0, cooldownRemaining)
      };
    }

    return {
      inProgress: false,
      lastSynced: null,
      timeSinceSync: null,
      canSyncIn: 0
    };
  }

  /**
   * Queue a background sync job
   */
  async queueSync(resourceType, resourceId, options = {}) {
    const { priority = 0, force = false } = options;
    const jobId = `${resourceType}_${resourceId}_${Date.now()}`;

    // Check if sync is allowed
    const syncCheck = await this.canSync(resourceType, resourceId, force);
    if (!syncCheck.canSync && !force) {
      return {
        success: false,
        queued: false,
        reason: syncCheck.reason,
        details: syncCheck
      };
    }

    // Create job
    const job = {
      jobId,
      resourceType,
      resourceId,
      priority,
      startedAt: Date.now(),
      stage: 'queued',
      options
    };

    this.activeJobs.set(jobId, job);

    // Start processing immediately (non-blocking)
    this.processJob(job).catch(error => {
      console.error(`Background sync job ${jobId} failed:`, error);
      this.activeJobs.delete(jobId);
    });

    return {
      success: true,
      queued: true,
      jobId,
      estimatedDuration: 30000 // 30 seconds estimate
    };
  }

  /**
   * Process a sync job in the background
   */
  async processJob(job) {
    const { jobId, resourceType, resourceId } = job;
    console.log(`🔄 Starting background sync job ${jobId} for ${resourceType}:${resourceId}`);

    try {
      // Update job stage
      job.stage = 'syncing';
      this.activeJobs.set(jobId, job);

      // Perform the actual sync based on resource type
      let result;
      switch (resourceType) {
        case 'challenge':
          result = await this.syncChallenge(resourceId, job);
          break;
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }

      // Mark global cooldown
      const key = `${resourceType}:${resourceId}`;
      this.globalCooldowns.set(key, Date.now());

      // Clean up old cooldowns (keep last 100)
      if (this.globalCooldowns.size > 100) {
        const entries = Array.from(this.globalCooldowns.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 100);
        this.globalCooldowns.clear();
        entries.forEach(([k, v]) => this.globalCooldowns.set(k, v));
      }

      console.log(`✅ Background sync job ${jobId} completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Background sync job ${jobId} failed:`, error);
      throw error;
    } finally {
      // Always clean up job
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Sync a specific challenge
   */
  async syncChallenge(roomId, job) {
    // Call the existing update-challenge logic
    const { default: updateChallengeHandler } = await import('../pages/api/update-challenge');
    
    // Create mock request/response objects
    const mockReq = {
      method: 'POST',
      body: { roomId: parseInt(roomId) }
    };

    let responseData = null;
    let responseStatus = 200;
    
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data) => {
        responseData = data;
        return mockRes;
      },
      setHeader: () => mockRes
    };

    // Update job stage
    if (job) {
      job.stage = 'fetching_osu_data';
      this.activeJobs.set(job.jobId, job);
    }

    // Execute the sync
    try {
      await updateChallengeHandler(mockReq, mockRes);
    } catch (error) {
      // If handler throws, it's likely handled internally
      console.warn(`Sync handler threw (might be expected):`, error.message);
    }

    if (responseStatus >= 400) {
      throw new Error(responseData?.error || 'Sync failed');
    }

    return {
      success: true,
      data: responseData,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Get statistics about sync operations
   */
  getStats() {
    const now = Date.now();
    return {
      activeJobs: this.activeJobs.size,
      globalCooldowns: this.globalCooldowns.size,
      jobs: Array.from(this.activeJobs.values()).map(job => ({
        jobId: job.jobId,
        resourceType: job.resourceType,
        resourceId: job.resourceId,
        stage: job.stage,
        duration: now - job.startedAt
      })),
      recentSyncs: Array.from(this.globalCooldowns.entries()).map(([key, timestamp]) => ({
        resource: key,
        syncedAt: new Date(timestamp).toISOString(),
        ageMinutes: Math.floor((now - timestamp) / 60000)
      })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
    };
  }

  /**
   * Force cleanup of old jobs and cooldowns
   */
  cleanup() {
    const now = Date.now();
    const OLD_JOB_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const OLD_COOLDOWN_THRESHOLD = 60 * 60 * 1000; // 1 hour

    // Clean up old jobs (shouldn't normally happen, but safety net)
    let removedJobs = 0;
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (now - job.startedAt > OLD_JOB_THRESHOLD) {
        this.activeJobs.delete(jobId);
        removedJobs++;
      }
    }

    // Clean up old cooldowns
    let removedCooldowns = 0;
    for (const [key, timestamp] of this.globalCooldowns.entries()) {
      if (now - timestamp > OLD_COOLDOWN_THRESHOLD) {
        this.globalCooldowns.delete(key);
        removedCooldowns++;
      }
    }

    if (removedJobs > 0 || removedCooldowns > 0) {
      console.log(`🧹 Sync cleanup: removed ${removedJobs} old jobs, ${removedCooldowns} old cooldowns`);
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

// Periodic cleanup
if (typeof window === 'undefined') {
  setInterval(() => {
    syncManager.cleanup();
  }, 10 * 60 * 1000); // Every 10 minutes
}

export default syncManager;