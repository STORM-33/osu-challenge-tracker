class SimpleAPITracker {
  constructor() {
    this.stats = {
      internal: 0,
      external: 0,
      total: 0
    };
  }

  // Minimal tracking without database syncing
  async trackInternal() {
    this.stats.internal++;
    this.stats.total++;
    return this.stats.internal;
  }

  async trackExternal() {
    this.stats.external++;
    this.stats.total++;
    return this.stats.external;
  }

  checkLimits() {
    return 'ok'; // Always OK for now
  }

  getUsageStats() {
    return {
      monthly: this.stats,
      usage: {
        functions: {
          current: this.stats.total,
          percentage: '0',
          remaining: 100000
        }
      }
    };
  }

  // No-op methods to prevent errors
  trackMiddleware() {}
  trackEdgeFunction() {}
  trackImageOptimization() {}
  generateRecommendations() { return []; }
  destroy() {}
}

// Simple singleton with proper cleanup
function createOrGetTracker() {
  if (typeof global !== 'undefined' && global.apiTrackerInstance) {
    return global.apiTrackerInstance;
  }

  const instance = new SimpleAPITracker();
  
  if (typeof global !== 'undefined') {
    global.apiTrackerInstance = instance;
  }
  
  return instance;
}

// Enhanced fetch wrapper with proper error handling
export function trackedFetch(url, options = {}, apiName = 'external') {
  const startTime = Date.now();
  const method = options.method || 'GET';
  const endpoint = new URL(url).pathname;
  
  return fetch(url, options)
    .then(async response => {
      const duration = Date.now() - startTime;
      const success = response.ok;
      
      let responseSize = 0;
      try {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          responseSize = parseInt(contentLength, 10);
        }
      } catch (e) {
        // Ignore if we can't get the size
      }
      
      apiTracker.trackExternal(apiName, endpoint, method, duration, success, responseSize);
      
      if (!success) {
        console.warn(`❌ External API failed: ${method} ${url} (${response.status})`);
      }
      
      return response;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      apiTracker.trackExternal(apiName, endpoint, method, duration, false, 0);
      
      console.error(`🚨 External API error: ${method} ${url}`, error);
      throw error;
    });
}

// Create singleton instance
const apiTracker = createOrGetTracker();

export default apiTracker;