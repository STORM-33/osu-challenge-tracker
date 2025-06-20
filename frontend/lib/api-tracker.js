// Global API call tracking for Vercel limits

class APITracker {
  constructor() {
    if (typeof global !== 'undefined') {
      if (!global.vercelApiTracker) {
        global.vercelApiTracker = {
          internal: new Map(), // Your API routes
          external: new Map(), // External API calls (osu!, etc.)
          monthly: {
            internal: 0,
            external: 0,
            total: 0,
            resetDate: this.getNextResetDate()
          }
        };
      }
      this.tracker = global.vercelApiTracker;
    }
  }

  getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  checkMonthlyReset() {
    const now = new Date();
    const resetDate = new Date(this.tracker.monthly.resetDate);
    
    if (now >= resetDate) {
      // Reset monthly counters
      this.tracker.monthly = {
        internal: 0,
        external: 0,
        total: 0,
        resetDate: this.getNextResetDate()
      };
      console.log('🔄 Monthly API tracking reset');
    }
  }

  // Track internal API calls (your Next.js routes)
  trackInternal(endpoint, method = 'GET', duration = 0, success = true) {
    this.checkMonthlyReset();
    
    const key = `${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    if (!this.tracker.internal.has(key)) {
      this.tracker.internal.set(key, {
        endpoint,
        method,
        count: 0,
        errors: 0,
        totalDuration: 0,
        firstCall: timestamp,
        lastCall: timestamp,
        recentCalls: []
      });
    }

    const stats = this.tracker.internal.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    
    if (!success) stats.errors++;

    stats.recentCalls.push({
      timestamp,
      duration,
      success
    });

    // Keep only last 20 calls
    if (stats.recentCalls.length > 20) {
      stats.recentCalls = stats.recentCalls.slice(-20);
    }

    // Update monthly counter
    this.tracker.monthly.internal++;
    this.tracker.monthly.total++;

    return stats.count;
  }

  // Track external API calls (osu!, etc.)
  trackExternal(apiName, endpoint, method = 'GET', duration = 0, success = true) {
    this.checkMonthlyReset();
    
    const key = `${apiName}:${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    if (!this.tracker.external.has(key)) {
      this.tracker.external.set(key, {
        apiName,
        endpoint,
        method,
        count: 0,
        errors: 0,
        totalDuration: 0,
        firstCall: timestamp,
        lastCall: timestamp,
        recentCalls: []
      });
    }

    const stats = this.tracker.external.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    
    if (!success) stats.errors++;

    stats.recentCalls.push({
      timestamp,
      duration,
      success
    });

    if (stats.recentCalls.length > 20) {
      stats.recentCalls = stats.recentCalls.slice(-20);
    }

    // Update monthly counter
    this.tracker.external.internal++;
    this.tracker.monthly.total++;

    return stats.count;
  }

  // Get current usage stats
  getUsageStats() {
    this.checkMonthlyReset();
    
    const VERCEL_LIMITS = {
      hobby: {
        functions: 100000, // 100k function invocations per month
        bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
        executions: 100000 // 100k serverless function executions
      }
    };

    const internal = Array.from(this.tracker.internal.values());
    const external = Array.from(this.tracker.external.values());
    
    const totalInternal = internal.reduce((sum, stat) => sum + stat.count, 0);
    const totalExternal = external.reduce((sum, stat) => sum + stat.count, 0);
    const totalCalls = totalInternal + totalExternal;

    return {
      monthly: {
        internal: this.tracker.monthly.internal,
        external: this.tracker.monthly.external,
        total: this.tracker.monthly.total,
        resetDate: this.tracker.monthly.resetDate,
        daysUntilReset: Math.ceil((new Date(this.tracker.monthly.resetDate) - new Date()) / (1000 * 60 * 60 * 24))
      },
      limits: VERCEL_LIMITS.hobby,
      usage: {
        percentage: (this.tracker.monthly.total / VERCEL_LIMITS.hobby.functions * 100).toFixed(2),
        remaining: VERCEL_LIMITS.hobby.functions - this.tracker.monthly.total
      },
      breakdown: {
        internal: {
          total: totalInternal,
          endpoints: internal.length,
          details: internal
        },
        external: {
          total: totalExternal,
          apis: external.length,
          details: external
        }
      }
    };
  }

  // Check if approaching limits
  checkLimits() {
    const stats = this.getUsageStats();
    const percentage = parseFloat(stats.usage.percentage);
    
    if (percentage > 90) {
      console.warn('🚨 API usage above 90%!', stats.monthly);
      return 'critical';
    } else if (percentage > 75) {
      console.warn('⚠️ API usage above 75%', stats.monthly);
      return 'warning';
    } else if (percentage > 50) {
      console.info('📊 API usage above 50%', stats.monthly);
      return 'info';
    }
    
    return 'ok';
  }
}

// Create singleton instance
const apiTracker = new APITracker();

// Wrapper for fetch to track external calls
export function trackedFetch(url, options = {}, apiName = 'external') {
  const startTime = Date.now();
  const method = options.method || 'GET';
  const endpoint = new URL(url).pathname;
  
  return fetch(url, options)
    .then(response => {
      const duration = Date.now() - startTime;
      const success = response.ok;
      
      apiTracker.trackExternal(apiName, endpoint, method, duration, success);
      
      if (!success) {
        console.warn(`❌ External API failed: ${method} ${url} (${response.status})`);
      }
      
      return response;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      apiTracker.trackExternal(apiName, endpoint, method, duration, false);
      
      console.error(`🚨 External API error: ${method} ${url}`, error);
      throw error;
    });
}

export default apiTracker;