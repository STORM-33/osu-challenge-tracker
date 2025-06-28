// Global cache that persists across page navigations
const updateCache = new Map(); // roomId -> lastUpdateTimestamp
const UPDATE_THRESHOLD = 4 * 60 * 1000; // 10 minutes

class GlobalUpdateTracker {
  constructor() {
    // Try to restore from sessionStorage on browser
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      
      // Save to storage periodically
      this.saveInterval = setInterval(() => {
        this.saveToStorage();
      }, 30000); // Save every 30 seconds
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
        if (this.saveInterval) {
          clearInterval(this.saveInterval);
        }
      });
    }
  }
  
  // Load cache from sessionStorage
  loadFromStorage() {
    try {
      const stored = sessionStorage.getItem('challenge-update-cache');
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
  
  // Save cache to sessionStorage
  saveToStorage() {
    try {
      const data = Object.fromEntries(updateCache.entries());
      sessionStorage.setItem('challenge-update-cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save update cache to storage:', error);
    }
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
    if (cachedUpdate && (now - cachedUpdate) < UPDATE_THRESHOLD) {
      console.log(`⏭️ Challenge ${roomId} was updated ${Math.floor((now - cachedUpdate) / 60000)}min ago (cached), skipping`);
      return false;
    }
    
    // Check database timestamp
    const dbTimestamp = challenge.updated_at ? new Date(challenge.updated_at + (challenge.updated_at.endsWith('Z') ? '' : 'Z')).getTime() : 0;
    const timeSinceDbUpdate = now - dbTimestamp;
    
    if (timeSinceDbUpdate < UPDATE_THRESHOLD) {
      // Database is fresh, update our cache
      updateCache.set(roomId, dbTimestamp);
      console.log(`✅ Challenge ${roomId} is fresh in database (${Math.floor(timeSinceDbUpdate / 60000)}min ago), updating cache`);
      return false;
    }
    
    console.log(`🔄 Challenge ${roomId} needs update (DB: ${Math.floor(timeSinceDbUpdate / 60000)}min ago, Cache: ${cachedUpdate ? Math.floor((now - cachedUpdate) / 60000) + 'min ago' : 'none'})`);
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
    const cutoff = 24 * 60 * 60 * 1000; // 24 hours
    
    let removed = 0;
    for (const [roomId, timestamp] of updateCache.entries()) {
      if (now - timestamp > cutoff) {
        updateCache.delete(roomId);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old cache entries`);
      this.saveToStorage();
    }
  }
  
  // Get cache stats for debugging
  getStats() {
    return {
      totalCached: updateCache.size,
      entries: Array.from(updateCache.entries()).map(([roomId, timestamp]) => ({
        roomId,
        lastUpdate: new Date(timestamp).toLocaleString(),
        ageMinutes: Math.floor((Date.now() - timestamp) / 60000)
      }))
    };
  }
}

// Create singleton instance
const globalUpdateTracker = new GlobalUpdateTracker();

// Cleanup old entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalUpdateTracker.cleanup();
  }, 10 * 60 * 1000);
}

export default globalUpdateTracker;

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