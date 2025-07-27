class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = 1000;
  }

  set(key, value, ttl = 600000) { // Default 10 minutes
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    // Set value with metadata
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    // Track access for analytics
    item.accessCount++;
    return item.value;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const memoryCache = new MemoryCache();

// Cache duration constants (milliseconds)
export const CACHE_DURATIONS = {
  SEASONS: 3600000,        // 1 hour
  PARTNERS: 1800000,       // 30 minutes
  CHALLENGES_LIST: 600000, // 10 minutes
  CHALLENGE_DETAIL: 600000, // 10 minutes
  LEADERBOARD: 600000,     // 10 minutes
  USER_PROFILE: 600000,    // 10 minutes
  STATS: 300000,           // 5 minutes
  HEALTH: 60000,           // 1 minute
  AUTH_STATUS: 30000,      // 30 seconds
  ADMIN_DATA: 300000       // 5 minutes
};

// Helper function to create cache keys
export function createCacheKey(type, id, params = {}) {
  const paramsStr = Object.keys(params).length > 0 
    ? '_' + Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k,v]) => `${k}=${v}`)
        .join('&')
    : '';
  return `${type}_${id}${paramsStr}`;
}