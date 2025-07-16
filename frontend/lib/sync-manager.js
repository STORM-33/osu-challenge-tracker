// Central background sync coordination
import { supabaseAdmin } from './supabase-admin';
import apiTracker from './api-tracker';
import syncLogger from './sync-logger';
import { syncConfig } from './sync-config';

class SyncManager {
  constructor() {
    this.activeJobs = new Map();
    this.globalCooldowns = new Map();
    
    // Use centralized configuration
    this.SYNC_THRESHOLD = syncConfig.thresholds.SYNC_THRESHOLD;
    this.GLOBAL_COOLDOWN = syncConfig.thresholds.GLOBAL_COOLDOWN;
    this.ESTIMATED_SYNC_DURATION = syncConfig.thresholds.ESTIMATED_SYNC_DURATION;
    this.LOCK_TIMEOUT = syncConfig.thresholds.LOCK_TIMEOUT;
    this.MAX_RETRIES = syncConfig.thresholds.MAX_RETRIES;
    
    console.log('🔧 SyncManager initialized with thresholds:', {
      SYNC_THRESHOLD: `${this.SYNC_THRESHOLD / 60000}min`,
      GLOBAL_COOLDOWN: `${this.GLOBAL_COOLDOWN / 60000}min`,
      ESTIMATED_SYNC_DURATION: `${this.ESTIMATED_SYNC_DURATION / 1000}s`
    });
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
      const timeRemaining = this.GLOBAL_COOLDOWN - (now - lastGlobalSync);
      console.log(`⏱️ Global cooldown active for ${key}: ${Math.ceil(timeRemaining / 1000)}s remaining`);
      
      return {
        canSync: false,
        reason: 'global_cooldown',
        nextSyncIn: timeRemaining,
        lastSynced: lastGlobalSync
      };
    }

    // Check database staleness
    if (!forceCheck) {
      const staleness = await this.checkStaleness(resourceType, resourceId);
      if (!staleness.isStale) {
        console.log(`✅ Data is fresh for ${key}: ${Math.ceil(staleness.timeSinceUpdate / 60000)}min ago`);
        
        return {
          canSync: false,
          reason: 'not_stale',
          lastSynced: staleness.lastUpdated,
          timeSinceUpdate: staleness.timeSinceUpdate
        };
      }
      
      console.log(`📊 Data is stale for ${key}: ${Math.ceil(staleness.timeSinceUpdate / 60000)}min ago (threshold: ${this.SYNC_THRESHOLD / 60000}min)`);
    }

    // Check API limits
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      console.warn(`🚨 API limits critical, cannot sync ${key}`);
      
      return {
        canSync: false,
        reason: 'api_limit_critical',
        apiUsage: apiTracker.getUsageStats()
      };
    }

    console.log(`🟢 Sync allowed for ${key} (limit status: ${limitStatus})`);
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
          console.warn(`⚠️ Challenge ${resourceId} not found or error:`, error?.message);
          return { isStale: true, lastUpdated: null, timeSinceUpdate: Infinity };
        }

        if (!challenge.is_active) {
          console.log(`📴 Challenge ${resourceId} is inactive, not stale`);
          return { isStale: false, lastUpdated: challenge.updated_at, timeSinceUpdate: 0 };
        }

        const lastUpdated = new Date(challenge.updated_at + (challenge.updated_at.endsWith('Z') ? '' : 'Z')).getTime();
        const timeSinceUpdate = now - lastUpdated;
        const isStale = timeSinceUpdate > this.SYNC_THRESHOLD;
        
        console.log(`🔍 Challenge ${resourceId} staleness check:`, {
          lastUpdated: new Date(lastUpdated).toISOString(),
          timeSinceUpdate: `${Math.ceil(timeSinceUpdate / 60000)}min`,
          threshold: `${this.SYNC_THRESHOLD / 60000}min`,
          isStale
        });
      
        return {
          isStale,
          lastUpdated,
          timeSinceUpdate
        };
      }

      default:
        return { isStale: true, lastUpdated: null, timeSinceUpdate: Infinity };
    }
  }

  async queueSync(resourceType, resourceId, options = {}) {
    const logId = syncLogger.syncStart('sync-manager', resourceId, {
      resourceType,
      options,
      priority: options.priority || 0
    });

    const { priority = 0, force = false } = options;
    const jobId = `${resourceType}_${resourceId}_${Date.now()}`;
    const startTime = Date.now();

    console.log(`🔄 Queue sync request: ${jobId} (priority: ${priority}, force: ${force})`);

    try {
      // Check if sync is allowed
      const syncCheck = await this.canSync(resourceType, resourceId, force);
      if (!syncCheck.canSync && !force) {
        console.log(`❌ Sync rejected for ${jobId}: ${syncCheck.reason}`);
        
        syncLogger.log('sync-manager', 'sync-rejected', `Sync rejected for ${resourceType}:${resourceId} - ${syncCheck.reason}`, startTime, {
          resourceType,
          resourceId,
          reason: syncCheck.reason,
          details: syncCheck,
          parentLogId: logId
        });

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
        options,
        logId
      };

      this.activeJobs.set(jobId, job);

      console.log(`✅ Sync queued: ${jobId}`);
      
      syncLogger.log('sync-manager', 'sync-queued', `Sync queued: ${jobId}`, startTime, {
        jobId,
        resourceType,
        resourceId,
        estimatedDuration: this.ESTIMATED_SYNC_DURATION,
        parentLogId: logId
      });

      // Start processing immediately (non-blocking)
      this.processJob(job).catch(error => {
        console.error(`❌ Job ${jobId} failed:`, error);
        syncLogger.syncError('sync-manager', resourceId, error, startTime, {
          jobId,
          resourceType,
          parentLogId: logId
        });
        this.activeJobs.delete(jobId);
      });

      return {
        success: true,
        queued: true,
        jobId,
        estimatedDuration: this.ESTIMATED_SYNC_DURATION
      };

    } catch (error) {
      console.error(`❌ Queue sync error for ${jobId}:`, error);
      syncLogger.syncError('sync-manager', resourceId, error, startTime, {
        resourceType,
        options,
        parentLogId: logId
      });
      throw error;
    }
  }

  async processJob(job) {
    const { jobId, resourceType, resourceId, logId } = job;
    const startTime = Date.now();
    
    console.log(`🚀 Processing job: ${jobId}`);
    
    syncLogger.log('sync-manager', 'job-processing', `Processing job ${jobId}`, null, {
      jobId,
      resourceType,
      resourceId,
      parentLogId: logId
    });

    try {
      // Update job stage
      job.stage = 'syncing';
      this.activeJobs.set(jobId, job);

      syncLogger.log('sync-manager', 'job-stage', `Job ${jobId} stage: syncing`, null, {
        jobId,
        stage: 'syncing',
        parentLogId: logId
      });

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
      const cooldownTime = Date.now();
      this.globalCooldowns.set(key, cooldownTime);
      
      console.log(`✅ Job ${jobId} completed, cooldown set until ${new Date(cooldownTime + this.GLOBAL_COOLDOWN).toLocaleTimeString()}`);

      // Clean up old cooldowns (keep last 100)
      if (this.globalCooldowns.size > 100) {
        const entries = Array.from(this.globalCooldowns.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 100);
        this.globalCooldowns.clear();
        entries.forEach(([k, v]) => this.globalCooldowns.set(k, v));
      }

      syncLogger.syncComplete('sync-manager', resourceId, startTime, {
        jobId,
        resourceType,
        result,
        parentLogId: logId
      });

      return result;

    } catch (error) {
      console.error(`❌ Job ${jobId} processing error:`, error);
      syncLogger.syncError('sync-manager', resourceId, error, startTime, {
        jobId,
        resourceType,
        parentLogId: logId
      });
      throw error;
    } finally {
      // Always clean up job
      this.activeJobs.delete(jobId);
      console.log(`🧹 Job ${jobId} cleaned up`);
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
        const elapsed = now - job.startedAt;
        const estimated = Math.max(0, this.ESTIMATED_SYNC_DURATION - elapsed);
        
        return {
          inProgress: true,
          jobId,
          startedAt: job.startedAt,
          estimatedTimeRemaining: estimated,
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
   * Sync a specific challenge
   */
  async syncChallenge(roomId, job) {
    console.log(`📡 Syncing challenge ${roomId}...`);
    
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

    console.log(`✅ Challenge ${roomId} sync completed`);
    
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
      thresholds: {
        sync_threshold_minutes: this.SYNC_THRESHOLD / 60000,
        global_cooldown_minutes: this.GLOBAL_COOLDOWN / 60000,
        estimated_sync_seconds: this.ESTIMATED_SYNC_DURATION / 1000
      },
      jobs: Array.from(this.activeJobs.values()).map(job => ({
        jobId: job.jobId,
        resourceType: job.resourceType,
        resourceId: job.resourceId,
        stage: job.stage,
        duration: now - job.startedAt,
        priority: job.priority
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
    const OLD_JOB_THRESHOLD = this.LOCK_TIMEOUT; // Use lock timeout for job cleanup
    const OLD_COOLDOWN_THRESHOLD = syncConfig.cache.CLEANUP_THRESHOLD;

    // Clean up old jobs (shouldn't normally happen, but safety net)
    let removedJobs = 0;
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (now - job.startedAt > OLD_JOB_THRESHOLD) {
        this.activeJobs.delete(jobId);
        removedJobs++;
        console.warn(`🧹 Removed stale job: ${jobId}`);
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

// Periodic cleanup using centralized config
if (typeof window === 'undefined') {
  setInterval(() => {
    syncManager.cleanup();
  }, syncConfig.thresholds.CACHE_CLEANUP_INTERVAL);
}

export default syncManager;