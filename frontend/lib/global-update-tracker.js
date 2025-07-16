// Global cache that persists across page navigations 
import { syncConfig } from './sync-config';

const updateCache = new Map(); // roomId -> lastUpdateTimestamp

class GlobalUpdateTracker {
  constructor() {
    // Use centralized configuration
    this.UPDATE_THRESHOLD = syncConfig.thresholds.SYNC_THRESHOLD;
    this.CLEANUP_INTERVAL = syncConfig.thresholds.CACHE_CLEANUP_INTERVAL;
    this.STORAGE_KEY = syncConfig.cache.STORAGE_KEY;
    this.MAX_ENTRIES = syncConfig.cache.MAX_ENTRIES;
    this.CLEANUP_THRESHOLD = syncConfig.cache.CLEANUP_THRESHOLD;
    
    console.log('🔧 GlobalUpdateTracker initialized with threshold:', `${this.UPDATE_THRESHOLD / 60000}min`);
    
    // Try to restore from sessionStorage on browser
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      
      // Save to storage periodically
      this.saveInterval = setInterval(() => {
        this.saveToStorage();
      }, 30000); // Save every 30 seconds
      
      // Cleanup old entries periodically
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.CLEANUP_INTERVAL);
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
        this.destroy();
      });
    }
  }
  
  // Load cache from sessionStorage
  loadFromStorage() {
    // Only try to load if we're in a browser environment
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          Object.entries(data).forEach(([roomId, timestamp]) => {
            updateCache.set(roomId, timestamp);
          });
          console.log(`📥 Loaded ${updateCache.size} cached update timestamps`);
        }
      } catch (error) {
        console.warn('Failed to load update cache from storage:', error);
      }
    }
  }
  
  // Save cache to sessionStorage
  saveToStorage() {
    // Only try to save if we're in a browser environment
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const data = Object.fromEntries(updateCache.entries());
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save update cache to storage:', error);
      }
    }
    // On server side, we just skip storage (cache still works in memory)
  }
    
  // Check if challenge needs updating (global check)
  needsUpdate(challenge) {
    if (!challenge || !challenge.is_active) {
      return false;
    }
    
    const roomId = challenge.room_id.toString();
    const now = Date.now();
    
    // Check our global cache first
    const cachedUpdate = updateCache.get(roomId);
    if (cachedUpdate && (now - cachedUpdate) < this.UPDATE_THRESHOLD) {
      console.log(`⏭️ Challenge ${roomId} was updated ${Math.floor((now - cachedUpdate) / 60000)}min ago (cached), skipping (threshold: ${this.UPDATE_THRESHOLD / 60000}min)`);
      return false;
    }
    
    // Check database timestamp
    const dbTimestamp = challenge.updated_at ? new Date(challenge.updated_at + (challenge.updated_at.endsWith('Z') ? '' : 'Z')).getTime() : 0;
    const timeSinceDbUpdate = now - dbTimestamp;
    
    if (timeSinceDbUpdate < this.UPDATE_THRESHOLD) {
      // Database is fresh, update our cache
      updateCache.set(roomId, dbTimestamp);
      console.log(`✅ Challenge ${roomId} is fresh in database (${Math.floor(timeSinceDbUpdate / 60000)}min ago < ${this.UPDATE_THRESHOLD / 60000}min threshold), updating cache`);
      return false;
    }
    
    console.log(`🔄 Challenge ${roomId} needs update (DB: ${Math.floor(timeSinceDbUpdate / 60000)}min ago > ${this.UPDATE_THRESHOLD / 60000}min threshold, Cache: ${cachedUpdate ? Math.floor((now - cachedUpdate) / 60000) + 'min ago' : 'none'})`);
    return true;
  }
  
  // Mark challenge as updated (call this after successful osu! API update)
  markAsUpdated(roomId) {
    const timestamp = Date.now();
    updateCache.set(roomId.toString(), timestamp);
    console.log(`✅ Marked challenge ${roomId} as updated at ${new Date(timestamp).toLocaleTimeString()}`);
    
    // Save immediately after important updates
    this.saveToStorage();
  }
  
  // Get last update time for display
  getLastUpdateTime(roomId) {
    return updateCache.get(roomId.toString()) || null;
  }
  
  // Clear old entries (cleanup)
  cleanup() {
    const now = Date.now();
    
    let removed = 0;
    for (const [roomId, timestamp] of updateCache.entries()) {
      if (now - timestamp > this.CLEANUP_THRESHOLD) {
        updateCache.delete(roomId);
        removed++;
      }
    }
    
    // Also limit total entries
    if (updateCache.size > this.MAX_ENTRIES) {
      const entries = Array.from(updateCache.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, this.MAX_ENTRIES);
      updateCache.clear();
      entries.forEach(([k, v]) => updateCache.set(k, v));
      removed += (updateCache.size - this.MAX_ENTRIES);
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old cache entries (threshold: ${this.CLEANUP_THRESHOLD / 60000}min, max entries: ${this.MAX_ENTRIES})`);
      this.saveToStorage();
    }
  }
  
  // Get cache stats for debugging
  getStats() {
    const now = Date.now();
    return {
      totalCached: updateCache.size,
      threshold: `${this.UPDATE_THRESHOLD / 60000}min`,
      cleanupThreshold: `${this.CLEANUP_THRESHOLD / 60000}min`,
      maxEntries: this.MAX_ENTRIES,
      entries: Array.from(updateCache.entries()).map(([roomId, timestamp]) => ({
        roomId,
        lastUpdate: new Date(timestamp).toLocaleString(),
        ageMinutes: Math.floor((now - timestamp) / 60000),
        isStale: (now - timestamp) > this.UPDATE_THRESHOLD
      }))
    };
  }
  
  // Destroy the tracker (cleanup timers)
  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance
const globalUpdateTracker = new GlobalUpdateTracker();

// Helper function to be used in components
export const shouldUpdateChallenge = (challenge) => {
  return globalUpdateTracker.needsUpdate(challenge);
};

export const markChallengeUpdated = (roomId) => {
  globalUpdateTracker.markAsUpdated(roomId);
};

export const getChallengeUpdateStats = () => {
  return globalUpdateTracker.getStats();
};

export default globalUpdateTracker;