// lib/api-tracker.js - Complete Fixed Version with Simple Singleton

import { supabase } from './supabase';

class ProductionAPITracker {
  constructor() {
    console.log('📊 Creating NEW tracker instance');
    
    // Only initialize in server environment
    this.isServer = typeof window === 'undefined' && typeof global !== 'undefined';
    this.isInitializing = false;
    
    // Memory cache for fast access
    this.memoryCache = {
      internal: new Map(),
      external: new Map(),
      monthly: {
        internal: 0,
        external: 0,
        total: 0,
        edgeExecutionUnits: 0,
        middlewareInvocations: 0,
        functionDurationGBHours: 0,
        imageOptimizations: 0,
        bandwidth: 0,
        resetDate: this.getNextResetDate(),
        startDate: new Date().toISOString()
      },
      daily: new Map(),
      performance: {
        slowestEndpoints: [],
        errorRates: new Map(),
        peakHours: new Map()
      },
      lastSyncTime: null,
      initialized: false
    };
    
    // Batch changes for efficient database writes (only on server)
    this.pendingWrites = {
      monthly: false,
      daily: false,
      endpoints: new Set()
    };
    
    this.syncTimer = null;
    
    // Only initialize database operations on server
    if (this.isServer) {
      // Initialize data loading
      this.initializeData();
      
      // Setup periodic database sync (every 30 seconds)
      this.setupPeriodicSync();
    } else {
      // On client side, mark as initialized immediately
      this.memoryCache.initialized = true;
    }
  }

  getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  getCurrentMonth() {
    return new Date().toISOString().slice(0, 7); // "2025-01"
  }

  getCurrentDate() {
    return new Date().toISOString().split('T')[0]; // "2025-01-20"
  }

  async initializeData() {
    if (this.memoryCache.initialized || this.isInitializing || !this.isServer) {
      return;
    }
    
    this.isInitializing = true;
    
    try {
      await this.loadFromDatabase();
      this.memoryCache.initialized = true;
      console.log('✅ API tracker initialized with database data');
    } catch (error) {
      console.error('❌ Failed to initialize API tracker:', error);
      // Continue with empty cache if database load fails
      this.memoryCache.initialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  async loadFromDatabase() {
    if (!this.isServer) return;
    
    const currentMonth = this.getCurrentMonth();
    
    try {
      // Load monthly data
      const { data: monthlyData } = await supabase
        .from('api_usage_monthly')
        .select('*')
        .eq('month', currentMonth)
        .single();

      if (monthlyData) {
        this.memoryCache.monthly = {
          internal: monthlyData.internal_calls || 0,
          external: monthlyData.external_calls || 0,
          total: monthlyData.total_calls || 0,
          edgeExecutionUnits: monthlyData.edge_execution_units || 0,
          middlewareInvocations: monthlyData.middleware_invocations || 0,
          functionDurationGBHours: parseFloat(monthlyData.function_duration_gb_hours || 0),
          imageOptimizations: monthlyData.image_optimizations || 0,
          bandwidth: parseInt(monthlyData.bandwidth_bytes || 0),
          resetDate: monthlyData.reset_date || this.getNextResetDate(),
          startDate: monthlyData.created_at || new Date().toISOString()
        };
        console.log('📊 Loaded monthly data from database:', this.memoryCache.monthly);
      }

      // Load endpoint data
      const { data: endpointData } = await supabase
        .from('api_endpoint_performance')
        .select('*')
        .eq('month', currentMonth);

      if (endpointData && endpointData.length > 0) {
        console.log(`📊 Loading ${endpointData.length} endpoint records from database`);
        endpointData.forEach(endpoint => {
          const key = `${endpoint.method}:${endpoint.endpoint}`;
          const stats = {
            endpoint: endpoint.endpoint,
            method: endpoint.method,
            count: endpoint.call_count || 0,
            errors: endpoint.error_count || 0,
            totalDuration: endpoint.total_duration || 0,
            lastCall: endpoint.last_called,
            recentCalls: []
          };

          if (endpoint.type === 'internal') {
            this.memoryCache.internal.set(key, stats);
          } else {
            this.memoryCache.external.set(key, {
              ...stats,
              apiName: endpoint.api_name
            });
          }
        });
      }

    } catch (error) {
      console.error('Database load error:', error);
      throw error;
    }
  }

  setupPeriodicSync() {
    if (typeof window === 'undefined' && typeof global !== 'undefined') {
      // Save to database every 30 seconds (more frequent for testing)
      this.syncTimer = setInterval(async () => {
        await this.syncToDatabase();
      }, 30000);

      if (typeof process !== 'undefined' && process.on && typeof process.on === 'function') {
        try {
          process.on('SIGTERM', () => {
            if (this.syncTimer) clearInterval(this.syncTimer);
            this.syncToDatabase();
          });
          process.on('SIGINT', () => {
            if (this.syncTimer) clearInterval(this.syncTimer);
            this.syncToDatabase();
          });
        } catch (error) {
          console.warn('Could not setup process exit handlers:', error.message);
        }
      }
    }
  }

  async syncToDatabase() {
    if (!this.memoryCache.initialized || !this.isServer) return;

    // Skip if no pending writes
    if (!this.pendingWrites.monthly && !this.pendingWrites.daily && this.pendingWrites.endpoints.size === 0) {
      return;
    }

    console.log('💾 Syncing data to database...');

    try {
      const currentMonth = this.getCurrentMonth();
      const currentDate = this.getCurrentDate();

      // Update monthly data if changed
      if (this.pendingWrites.monthly) {
        const monthlyData = {
          month: currentMonth,
          internal_calls: this.memoryCache.monthly.internal,
          external_calls: this.memoryCache.monthly.external,
          total_calls: this.memoryCache.monthly.total,
          edge_execution_units: this.memoryCache.monthly.edgeExecutionUnits,
          middleware_invocations: this.memoryCache.monthly.middlewareInvocations,
          function_duration_gb_hours: this.memoryCache.monthly.functionDurationGBHours,
          image_optimizations: this.memoryCache.monthly.imageOptimizations,
          bandwidth_bytes: this.memoryCache.monthly.bandwidth,
          reset_date: this.memoryCache.monthly.resetDate,
          updated_at: new Date().toISOString()
        };

        console.log('💾 Saving monthly data:', monthlyData);
        
        const { error: monthlyError } = await supabase
          .from('api_usage_monthly')
          .upsert(monthlyData, { onConflict: 'month' });
        
        if (monthlyError) {
          console.error('❌ Monthly sync error:', monthlyError);
        } else {
          console.log('✅ Monthly data synced');
          this.pendingWrites.monthly = false;
        }
      }

      // Update today's daily data if changed
      if (this.pendingWrites.daily && this.memoryCache.daily.has(currentDate)) {
        const todayData = this.memoryCache.daily.get(currentDate);
        const dailyData = {
          date: currentDate,
          internal_calls: todayData.internal,
          external_calls: todayData.external,
          edge_calls: todayData.edge,
          middleware_calls: todayData.middleware,
          bandwidth_bytes: todayData.bandwidth,
          errors: todayData.errors
        };

        console.log('💾 Saving daily data:', dailyData);

        const { error: dailyError } = await supabase
          .from('api_daily_stats')
          .upsert(dailyData, { onConflict: 'date' });
        
        if (dailyError) {
          console.error('❌ Daily sync error:', dailyError);
        } else {
          console.log('✅ Daily data synced');
          this.pendingWrites.daily = false;
        }
      }

      // Update endpoint performance data
      if (this.pendingWrites.endpoints.size > 0) {
        const endpointUpdates = [];
        
        for (const endpointKey of this.pendingWrites.endpoints) {
          const internal = this.memoryCache.internal.get(endpointKey);
          const external = this.memoryCache.external.get(endpointKey);
          const endpoint = internal || external;
          
          if (endpoint) {
            endpointUpdates.push({
              month: currentMonth,
              endpoint: endpoint.endpoint,
              method: endpoint.method,
              type: internal ? 'internal' : 'external',
              api_name: external?.apiName || null,
              call_count: endpoint.count,
              total_duration: endpoint.totalDuration,
              error_count: endpoint.errors,
              last_called: endpoint.lastCall,
              updated_at: new Date().toISOString()
            });
          }
        }

        if (endpointUpdates.length > 0) {
          console.log(`💾 Saving ${endpointUpdates.length} endpoint records`);

          const { error: endpointError } = await supabase
            .from('api_endpoint_performance')
            .upsert(endpointUpdates, { onConflict: 'endpoint,method,type,month' });
        
          if (endpointError) {
            console.error('❌ Endpoint sync error:', endpointError);
          } else {
            console.log('✅ Endpoint data synced');
            this.pendingWrites.endpoints.clear();
          }
        }
      }

      console.log('💾 Database sync completed');
      
    } catch (error) {
      console.error('❌ Database sync failed:', error);
    }
  }

  // Enhanced tracking methods
  async trackInternal(endpoint, method = 'GET', duration = 0, success = true, memoryMB = 128, responseSize = 0) {
    if (!this.memoryCache.initialized) {
      await this.initializeData();
    }

    this.checkMonthlyReset();
    
    const key = `${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    if (!this.memoryCache.internal.has(key)) {
      this.memoryCache.internal.set(key, {
        endpoint,
        method,
        count: 0,
        errors: 0,
        totalDuration: 0,
        totalMemoryUsage: 0,
        totalResponseSize: 0,
        firstCall: timestamp,
        lastCall: timestamp,
        recentCalls: []
      });
    }

    const stats = this.memoryCache.internal.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    stats.totalMemoryUsage += memoryMB;
    stats.totalResponseSize += responseSize;
    
    if (!success) stats.errors++;

    stats.recentCalls.push({ timestamp, duration, success, memoryMB, responseSize });
    if (stats.recentCalls.length > 10) {
      stats.recentCalls = stats.recentCalls.slice(-10);
    }

    // Update monthly counters
    this.memoryCache.monthly.internal++;
    this.memoryCache.monthly.total++;
    this.memoryCache.monthly.bandwidth += responseSize;
    
    const gbHours = (memoryMB / 1024) * (duration / 3600000);
    this.memoryCache.monthly.functionDurationGBHours += gbHours;
    
    // Update daily stats
    this.updateDailyStats('internal', 1);
    this.updateDailyStats('bandwidth', responseSize);
    
    // Mark for database sync
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
    this.pendingWrites.endpoints.add(key);

    console.log(`📊 Tracked internal call: ${method} ${endpoint} (${this.memoryCache.monthly.total} total calls)`);

    return stats.count;
  }

  async trackExternal(apiName, endpoint, method = 'GET', duration = 0, success = true, responseSize = 0) {
    if (!this.memoryCache.initialized) {
      await this.initializeData();
    }

    this.checkMonthlyReset();
    
    const key = `${apiName}:${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    if (!this.memoryCache.external.has(key)) {
      this.memoryCache.external.set(key, {
        apiName,
        endpoint,
        method,
        count: 0,
        errors: 0,
        totalDuration: 0,
        totalResponseSize: 0,
        firstCall: timestamp,
        lastCall: timestamp,
        recentCalls: []
      });
    }

    const stats = this.memoryCache.external.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    stats.totalResponseSize += responseSize;
    
    if (!success) stats.errors++;

    stats.recentCalls.push({ timestamp, duration, success, responseSize });
    if (stats.recentCalls.length > 10) {
      stats.recentCalls = stats.recentCalls.slice(-10);
    }

    // Update monthly counters
    this.memoryCache.monthly.external++;
    this.memoryCache.monthly.total++;
    this.memoryCache.monthly.bandwidth += responseSize;

    // Update daily stats
    this.updateDailyStats('external', 1);
    this.updateDailyStats('bandwidth', responseSize);

    // Mark for database sync
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
    this.pendingWrites.endpoints.add(key);

    console.log(`📊 Tracked external call: ${apiName} ${method} ${endpoint} (${this.memoryCache.monthly.external} external calls)`);

    return stats.count;
  }

  trackMiddleware(route) {
    this.memoryCache.monthly.middlewareInvocations++;
    this.updateDailyStats('middleware');
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
  }

  trackEdgeFunction(functionName, executionUnits = 1) {
    this.memoryCache.monthly.edgeExecutionUnits += executionUnits;
    this.updateDailyStats('edge', executionUnits);
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
  }

  updateDailyStats(type, value = 1) {
    const today = this.getCurrentDate();
    
    if (!this.memoryCache.daily.has(today)) {
      this.memoryCache.daily.set(today, {
        internal: 0,
        external: 0,
        edge: 0,
        middleware: 0,
        bandwidth: 0,
        errors: 0
      });
    }
    
    const dayStats = this.memoryCache.daily.get(today);
    dayStats[type] += value;
    
    // Keep only last 30 days
    if (this.memoryCache.daily.size > 30) {
      const oldestDate = Array.from(this.memoryCache.daily.keys()).sort()[0];
      this.memoryCache.daily.delete(oldestDate);
    }
  }

  checkMonthlyReset() {
    const now = new Date();
    const resetDate = new Date(this.memoryCache.monthly.resetDate);
    
    if (now >= resetDate) {
      // Reset monthly counters but keep daily history
      this.memoryCache.monthly = {
        internal: 0,
        external: 0,
        total: 0,
        edgeExecutionUnits: 0,
        middlewareInvocations: 0,
        functionDurationGBHours: 0,
        imageOptimizations: 0,
        bandwidth: 0,
        resetDate: this.getNextResetDate(),
        startDate: new Date().toISOString()
      };
      
      // Clear endpoint stats for new month
      this.memoryCache.internal.clear();
      this.memoryCache.external.clear();
      
      this.pendingWrites.monthly = true;
      console.log('🔄 Monthly API tracking reset');
    }
  }

  getUsageStats() {
    const VERCEL_LIMITS = {
      hobby: {
        functions: 100000,
        edgeExecutionUnits: 500000,
        middlewareInvocations: 1000000,
        functionDuration: 100,
        imageOptimization: 1000,
        bandwidth: 100 * 1024 * 1024 * 1024
      }
    };

    // Convert daily Map to array for trends
    const dailyTrends = [];
    const sortedDays = Array.from(this.memoryCache.daily.keys()).sort();
    sortedDays.forEach(date => {
      const dayData = this.memoryCache.daily.get(date);
      dailyTrends.push({ date, ...dayData });
    });

    // Calculate projections
    const now = new Date();
    const startOfMonth = new Date(this.memoryCache.monthly.startDate);
    const daysElapsed = Math.max(1, Math.ceil((now - startOfMonth) / (1000 * 60 * 60 * 24)));
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const dailyAverages = {
      functions: Math.ceil(this.memoryCache.monthly.total / daysElapsed),
      edgeExecutionUnits: Math.ceil(this.memoryCache.monthly.edgeExecutionUnits / daysElapsed),
      middleware: Math.ceil(this.memoryCache.monthly.middlewareInvocations / daysElapsed),
      functionDuration: this.memoryCache.monthly.functionDurationGBHours / daysElapsed,
      images: Math.ceil(this.memoryCache.monthly.imageOptimizations / daysElapsed),
      bandwidth: this.memoryCache.monthly.bandwidth / daysElapsed
    };
    
    const projectedMonthly = {
      functions: dailyAverages.functions * daysInMonth,
      edgeExecutionUnits: dailyAverages.edgeExecutionUnits * daysInMonth,
      middleware: dailyAverages.middleware * daysInMonth,
      functionDuration: dailyAverages.functionDuration * daysInMonth,
      images: dailyAverages.images * daysInMonth,
      bandwidth: dailyAverages.bandwidth * daysInMonth
    };

    return {
      monthly: {
        ...this.memoryCache.monthly,
        daysUntilReset: Math.ceil((new Date(this.memoryCache.monthly.resetDate) - new Date()) / (1000 * 60 * 60 * 24))
      },
      limits: VERCEL_LIMITS.hobby,
      usage: {
        functions: {
          current: this.memoryCache.monthly.total,
          limit: VERCEL_LIMITS.hobby.functions,
          percentage: (this.memoryCache.monthly.total / VERCEL_LIMITS.hobby.functions * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.functions - this.memoryCache.monthly.total
        },
        edgeExecutionUnits: {
          current: this.memoryCache.monthly.edgeExecutionUnits,
          limit: VERCEL_LIMITS.hobby.edgeExecutionUnits,
          percentage: (this.memoryCache.monthly.edgeExecutionUnits / VERCEL_LIMITS.hobby.edgeExecutionUnits * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.edgeExecutionUnits - this.memoryCache.monthly.edgeExecutionUnits
        },
        middleware: {
          current: this.memoryCache.monthly.middlewareInvocations,
          limit: VERCEL_LIMITS.hobby.middlewareInvocations,
          percentage: (this.memoryCache.monthly.middlewareInvocations / VERCEL_LIMITS.hobby.middlewareInvocations * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.middlewareInvocations - this.memoryCache.monthly.middlewareInvocations
        },
        functionDuration: {
          current: this.memoryCache.monthly.functionDurationGBHours,
          limit: VERCEL_LIMITS.hobby.functionDuration,
          percentage: (this.memoryCache.monthly.functionDurationGBHours / VERCEL_LIMITS.hobby.functionDuration * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.functionDuration - this.memoryCache.monthly.functionDurationGBHours
        },
        imageOptimization: {
          current: this.memoryCache.monthly.imageOptimizations,
          limit: VERCEL_LIMITS.hobby.imageOptimization,
          percentage: (this.memoryCache.monthly.imageOptimizations / VERCEL_LIMITS.hobby.imageOptimization * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.imageOptimization - this.memoryCache.monthly.imageOptimizations
        },
        bandwidth: {
          current: this.memoryCache.monthly.bandwidth,
          limit: VERCEL_LIMITS.hobby.bandwidth,
          percentage: (this.memoryCache.monthly.bandwidth / VERCEL_LIMITS.hobby.bandwidth * 100).toFixed(2),
          remaining: VERCEL_LIMITS.hobby.bandwidth - this.memoryCache.monthly.bandwidth
        }
      },
      breakdown: {
        internal: {
          total: this.memoryCache.monthly.internal,
          endpoints: this.memoryCache.internal.size,
          details: Array.from(this.memoryCache.internal.values()).sort((a, b) => b.count - a.count)
        },
        external: {
          total: this.memoryCache.monthly.external,
          apis: this.memoryCache.external.size,
          details: Array.from(this.memoryCache.external.values()).sort((a, b) => b.count - a.count)
        }
      },
      performance: {
        slowestEndpoints: this.memoryCache.performance.slowestEndpoints.slice(0, 10),
        errorRates: [],
        peakHours: [],
        averageResponseTime: 0
      },
      trends: dailyTrends,
      projections: {
        dailyAverages,
        projectedMonthly,
        projectedUsagePercentages: {
          functions: ((projectedMonthly.functions / VERCEL_LIMITS.hobby.functions) * 100).toFixed(2),
          edgeExecutionUnits: ((projectedMonthly.edgeExecutionUnits / VERCEL_LIMITS.hobby.edgeExecutionUnits) * 100).toFixed(2),
          middlewareInvocations: ((projectedMonthly.middleware / VERCEL_LIMITS.hobby.middlewareInvocations) * 100).toFixed(2),
          functionDuration: ((projectedMonthly.functionDuration / VERCEL_LIMITS.hobby.functionDuration) * 100).toFixed(2),
          imageOptimization: ((projectedMonthly.images / VERCEL_LIMITS.hobby.imageOptimization) * 100).toFixed(2),
          bandwidth: ((projectedMonthly.bandwidth / VERCEL_LIMITS.hobby.bandwidth) * 100).toFixed(2)
        },
        willExceedLimits: {
          functions: projectedMonthly.functions > VERCEL_LIMITS.hobby.functions,
          edgeExecutionUnits: projectedMonthly.edgeExecutionUnits > VERCEL_LIMITS.hobby.edgeExecutionUnits,
          middlewareInvocations: projectedMonthly.middleware > VERCEL_LIMITS.hobby.middlewareInvocations,
          functionDuration: projectedMonthly.functionDuration > VERCEL_LIMITS.hobby.functionDuration,
          imageOptimization: projectedMonthly.images > VERCEL_LIMITS.hobby.imageOptimization,
          bandwidth: projectedMonthly.bandwidth > VERCEL_LIMITS.hobby.bandwidth
        },
        daysElapsed
      },
      costs: {
        estimated: 0,
        breakdown: { functions: 0, bandwidth: 0 },
        overages: { functions: 0, bandwidth: 0 }
      }
    };
  }

  checkLimits() {
    const stats = this.getUsageStats();
    let status = 'ok';
    
    Object.entries(stats.usage || {}).forEach(([resource, data]) => {
      if (!data.percentage) return;
      const percentage = parseFloat(data.percentage);
      
      if (percentage >= 95) status = 'critical';
      else if (percentage >= 85 && status !== 'critical') status = 'warning';
      else if (percentage >= 70 && status === 'ok') status = 'caution';
    });
    
    return status;
  }

  generateRecommendations() {
    const stats = this.getUsageStats();
    const recommendations = [];
    
    // Function invocation recommendations
    if (parseFloat(stats.usage.functions.percentage) > 80) {
      recommendations.push({
        type: 'critical',
        category: 'Functions',
        message: `Function usage at ${stats.usage.functions.percentage}%`,
        actions: [
          'Implement caching for frequently called endpoints',
          'Optimize database queries to reduce execution time',
          'Consider request batching for bulk operations'
        ]
      });
    }
    
    // Edge function recommendations
    if (parseFloat(stats.usage.edgeExecutionUnits.percentage) > 80) {
      recommendations.push({
        type: 'warning',
        category: 'Edge Functions',
        message: `Edge execution units at ${stats.usage.edgeExecutionUnits.percentage}%`,
        actions: [
          'Optimize edge function code for better performance',
          'Reduce payload sizes in edge functions',
          'Consider moving complex logic to serverless functions'
        ]
      });
    }
    
    // Performance recommendations based on slow endpoints
    const slowEndpoints = stats.breakdown.internal.details.slice(0, 3);
    if (slowEndpoints.length > 0) {
      const avgDuration = slowEndpoints[0].totalDuration / slowEndpoints[0].count;
      if (avgDuration > 3000) {
        recommendations.push({
          type: 'optimization',
          category: 'Performance',
          message: `Slow endpoints detected (avg: ${Math.round(avgDuration)}ms)`,
          actions: [
            `Optimize ${slowEndpoints[0].endpoint}`,
            'Add database indexing',
            'Implement response compression'
          ]
        });
      }
    }
    
    // Bandwidth recommendations
    if (parseFloat(stats.usage.bandwidth.percentage) > 70) {
      recommendations.push({
        type: 'warning',
        category: 'Bandwidth',
        message: `Bandwidth usage at ${stats.usage.bandwidth.percentage}%`,
        actions: [
          'Enable response compression',
          'Optimize API response sizes',
          'Implement data pagination'
        ]
      });
    }
    
    return recommendations;
  }
}

// Simple singleton function
function createOrGetTracker() {
  if (typeof global !== 'undefined' && global.apiTrackerInstance) {
    console.log('📊 Returning existing global tracker instance');
    return global.apiTrackerInstance;
  }

  const instance = new ProductionAPITracker();
  
  if (typeof global !== 'undefined') {
    global.apiTrackerInstance = instance;
    console.log('📊 Stored tracker instance in global scope');
  }
  
  return instance;
}

// Enhanced fetch wrapper
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