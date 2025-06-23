import { supabaseAdmin as supabase } from './supabase-admin';

class MemoryManagedAPITracker {
  constructor() {
    console.log('📊 Creating memory-managed tracker instance');
    
    // Only initialize in server environment
    this.isServer = typeof window === 'undefined' && typeof global !== 'undefined';
    this.isInitializing = false;
    
    // Memory cache with size limits
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
    
    // Cache size limits to prevent memory leaks
    this.limits = {
      maxEndpoints: 1000, // Maximum number of unique endpoints to track
      maxDailyEntries: 30, // Keep only last 30 days
      maxRecentCalls: 10,  // Recent calls per endpoint
      maxSlowEndpoints: 20, // Track top 20 slowest endpoints
      maxErrorRates: 50    // Track error rates for 50 endpoints
    };
    
    // Batch changes for efficient database writes
    this.pendingWrites = {
      monthly: false,
      daily: false,
      endpoints: new Set()
    };
    
    this.syncTimer = null;
    this.cleanupTimer = null;
    
    // Only initialize database operations on server
    if (this.isServer) {
      this.initializeData();
      this.setupPeriodicSync();
      this.setupMemoryCleanup();
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

  // Memory cleanup to prevent leaks
  setupMemoryCleanup() {
    if (!this.isServer) return;
    
    // Clean up every 10 minutes
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, 10 * 60 * 1000);

    // Setup process exit handlers
    if (typeof process !== 'undefined' && process.on) {
      try {
        const cleanup = () => {
          if (this.syncTimer) clearInterval(this.syncTimer);
          if (this.cleanupTimer) clearInterval(this.cleanupTimer);
          this.syncToDatabase();
        };
        
        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
        process.on('exit', cleanup);
      } catch (error) {
        console.warn('Could not setup process exit handlers:', error.message);
      }
    }
  }

  // Perform memory cleanup
  performMemoryCleanup() {
    console.log('🧹 Performing memory cleanup...');
    
    const before = {
      internal: this.memoryCache.internal.size,
      external: this.memoryCache.external.size,
      daily: this.memoryCache.daily.size
    };
    
    // Clean up old internal endpoints (keep only most active)
    if (this.memoryCache.internal.size > this.limits.maxEndpoints) {
      const sortedInternal = Array.from(this.memoryCache.internal.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, this.limits.maxEndpoints);
      
      this.memoryCache.internal.clear();
      sortedInternal.forEach(([key, value]) => {
        this.memoryCache.internal.set(key, value);
      });
    }
    
    // Clean up old external endpoints
    if (this.memoryCache.external.size > this.limits.maxEndpoints) {
      const sortedExternal = Array.from(this.memoryCache.external.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, this.limits.maxEndpoints);
      
      this.memoryCache.external.clear();
      sortedExternal.forEach(([key, value]) => {
        this.memoryCache.external.set(key, value);
      });
    }
    
    // Clean up old daily entries (keep only last 30 days)
    if (this.memoryCache.daily.size > this.limits.maxDailyEntries) {
      const sortedDates = Array.from(this.memoryCache.daily.keys()).sort();
      const toKeep = sortedDates.slice(-this.limits.maxDailyEntries);
      
      this.memoryCache.daily.clear();
      toKeep.forEach(date => {
        this.memoryCache.daily.set(date, {
          internal: 0,
          external: 0,
          edge: 0,
          middleware: 0,
          bandwidth: 0,
          errors: 0
        });
      });
    }
    
    // Clean up recent calls in endpoints to prevent memory growth
    for (const [key, stats] of this.memoryCache.internal.entries()) {
      if (stats.recentCalls && stats.recentCalls.length > this.limits.maxRecentCalls) {
        stats.recentCalls = stats.recentCalls.slice(-this.limits.maxRecentCalls);
      }
    }
    
    for (const [key, stats] of this.memoryCache.external.entries()) {
      if (stats.recentCalls && stats.recentCalls.length > this.limits.maxRecentCalls) {
        stats.recentCalls = stats.recentCalls.slice(-this.limits.maxRecentCalls);
      }
    }
    
    // Clean up performance tracking
    if (this.memoryCache.performance.slowestEndpoints.length > this.limits.maxSlowEndpoints) {
      this.memoryCache.performance.slowestEndpoints = 
        this.memoryCache.performance.slowestEndpoints.slice(0, this.limits.maxSlowEndpoints);
    }
    
    if (this.memoryCache.performance.errorRates.size > this.limits.maxErrorRates) {
      const sortedErrors = Array.from(this.memoryCache.performance.errorRates.entries())
        .sort(([, a], [, b]) => b.errorRate - a.errorRate)
        .slice(0, this.limits.maxErrorRates);
      
      this.memoryCache.performance.errorRates.clear();
      sortedErrors.forEach(([key, value]) => {
        this.memoryCache.performance.errorRates.set(key, value);
      });
    }
    
    const after = {
      internal: this.memoryCache.internal.size,
      external: this.memoryCache.external.size,
      daily: this.memoryCache.daily.size
    };
    
    console.log('🧹 Memory cleanup completed:', {
      before,
      after,
      freed: {
        internal: before.internal - after.internal,
        external: before.external - after.external,
        daily: before.daily - after.daily
      }
    });
    
    // Force garbage collection if available (Node.js with --expose-gc)
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc();
        console.log('🗑️ Forced garbage collection');
      } catch (e) {
        // Ignore if GC not available
      }
    }
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
        console.log('📊 Loaded monthly data from database');
      }

      // Load endpoint data (with limit to prevent memory issues)
      const { data: endpointData } = await supabase
        .from('api_endpoint_performance')
        .select('*')
        .eq('month', currentMonth)
        .order('call_count', { ascending: false })
        .limit(this.limits.maxEndpoints);

      if (endpointData && endpointData.length > 0) {
        console.log(`📊 Loading ${endpointData.length} endpoint records from database`);
        endpointData.forEach(endpoint => {
          // FIXED: Generate keys consistently
          let key;
          if (endpoint.type === 'internal') {
            key = `${endpoint.method}:${endpoint.endpoint}`;
          } else {
            key = `${endpoint.api_name}:${endpoint.method}:${endpoint.endpoint}`;
          }
          
          const stats = {
            endpoint: endpoint.endpoint,
            method: endpoint.method,
            count: endpoint.call_count || 0,
            errors: endpoint.error_count || 0,
            totalDuration: endpoint.total_duration || 0,
            lastCall: endpoint.last_called,
            recentCalls: [] // Start fresh for recent calls
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
    if (!this.isServer) return;
    
    // Save to database every 30 seconds
    this.syncTimer = setInterval(async () => {
      await this.syncToDatabase();
    }, 30000);
  }

  async syncToDatabase() {
    if (!this.memoryCache.initialized || !this.isServer) return;

    // Skip if no pending writes
    if (!this.pendingWrites.monthly && !this.pendingWrites.daily && this.pendingWrites.endpoints.size === 0) {
      return;
    }

    console.log('💾 Syncing data to database...');
    console.log(`📝 Pending endpoints: ${this.pendingWrites.endpoints.size}`);

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

      // FIXED: Process endpoint performance data with proper key handling
      if (this.pendingWrites.endpoints.size > 0) {
        console.log(`💾 Processing ${this.pendingWrites.endpoints.size} endpoint updates`);
        
        const processedKeys = new Set();
        let successCount = 0;
        let errorCount = 0;
        
        // Process internal endpoints
        for (const [memoryKey, stats] of this.memoryCache.internal.entries()) {
          if (!this.pendingWrites.endpoints.has(memoryKey)) continue;
          
          try {
            await this.syncSingleEndpoint({
              ...stats,
              type: 'internal',
              api_name: null // Important: internal endpoints have null api_name
            }, currentMonth);
            
            processedKeys.add(memoryKey);
            successCount++;
            console.log(`✅ Synced internal: ${stats.endpoint}`);
            
          } catch (error) {
            console.error(`❌ Failed to sync internal endpoint ${stats.endpoint}:`, error);
            errorCount++;
          }
        }
        
        // Process external endpoints
        for (const [memoryKey, stats] of this.memoryCache.external.entries()) {
          if (!this.pendingWrites.endpoints.has(memoryKey)) continue;
          
          try {
            await this.syncSingleEndpoint({
              ...stats,
              type: 'external',
              api_name: stats.apiName // External endpoints have api_name
            }, currentMonth);
            
            processedKeys.add(memoryKey);
            successCount++;
            console.log(`✅ Synced external: ${stats.apiName}:${stats.endpoint}`);
            
          } catch (error) {
            console.error(`❌ Failed to sync external endpoint ${stats.apiName}:${stats.endpoint}:`, error);
            errorCount++;
          }
        }
        
        // Remove successfully processed keys from pending writes
        for (const key of processedKeys) {
          this.pendingWrites.endpoints.delete(key);
        }
        
        console.log(`📊 Endpoint sync completed: ${successCount} success, ${errorCount} errors`);
      }

      this.memoryCache.lastSyncTime = Date.now();
      console.log('💾 Database sync completed');
      
    } catch (error) {
      console.error('❌ Database sync failed:', error);
    }
  }

  async syncSingleEndpoint(stats, month) {
    const recordData = {
      month: month,
      endpoint: stats.endpoint,
      method: stats.method,
      type: stats.type,
      api_name: stats.api_name, // null for internal, string for external
      call_count: stats.count,
      total_duration: stats.totalDuration,
      error_count: stats.errors,
      last_called: stats.lastCall,
      updated_at: new Date().toISOString()
    };

    try {
      // FIXED: Build the correct query based on whether it's internal or external
      let query = supabase
        .from('api_endpoint_performance')
        .select('id, call_count, total_duration, error_count')
        .eq('endpoint', stats.endpoint)
        .eq('method', stats.method)
        .eq('type', stats.type)
        .eq('month', month);

      // Handle the conditional api_name constraint properly
      if (stats.type === 'internal') {
        query = query.is('api_name', null);
      } else {
        query = query.eq('api_name', stats.api_name);
      }

      const { data: existing, error: selectError } = await query.maybeSingle();
      
      if (selectError) {
        console.error(`Query error for ${stats.endpoint}:`, selectError);
        throw selectError;
      }

      if (existing) {
        // Update existing record - add to existing counts
        const { error: updateError } = await supabase
          .from('api_endpoint_performance')
          .update({
            call_count: existing.call_count + recordData.call_count,
            total_duration: (existing.total_duration || 0) + (recordData.total_duration || 0),
            error_count: (existing.error_count || 0) + (recordData.error_count || 0),
            last_called: recordData.last_called,
            updated_at: recordData.updated_at
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Update error for ${stats.endpoint}:`, updateError);
          throw updateError;
        }

      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('api_endpoint_performance')
          .insert([{
            ...recordData,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error(`Insert error for ${stats.endpoint}:`, insertError);
          throw insertError;
        }
      }

    } catch (error) {
      console.error(`Sync error for endpoint ${stats.endpoint}:`, error);
      throw error;
    }
  }

  // Enhanced tracking methods with memory limits
  async trackInternal(endpoint, method = 'GET', duration = 0, success = true, memoryMB = 128, responseSize = 0) {
    if (!this.memoryCache.initialized) {
      await this.initializeData();
    }
    
    // Check if initialized after attempting to load data
    if (!this.memoryCache.initialized) {
      console.warn("API tracker not initialized, skipping internal tracking.");
      return 0;
    }

    this.checkMonthlyReset();
    
    // FIXED: Use consistent key format that matches sync logic
    const key = `${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    // Check if we're at capacity before adding new endpoints
    if (!this.memoryCache.internal.has(key) && this.memoryCache.internal.size >= this.limits.maxEndpoints) {
      // Remove least used endpoint to make room
      const leastUsed = Array.from(this.memoryCache.internal.entries())
        .sort(([, a], [, b]) => a.count - b.count)[0];
      
      if (leastUsed) {
        this.memoryCache.internal.delete(leastUsed[0]);
        console.log(`🗑️ Removed least used endpoint: ${leastUsed[0]}`);
      }
    }
    
    // Initialize endpoint stats if it doesn't exist
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

    // Get and update endpoint stats
    const stats = this.memoryCache.internal.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    stats.totalMemoryUsage += memoryMB;
    stats.totalResponseSize += responseSize;
    
    if (!success) {
      stats.errors++;
    }

    // Limit recent calls to prevent memory growth
    stats.recentCalls.push({ 
      timestamp, 
      duration, 
      success, 
      memoryMB, 
      responseSize 
    });
    
    if (stats.recentCalls.length > this.limits.maxRecentCalls) {
      stats.recentCalls = stats.recentCalls.slice(-this.limits.maxRecentCalls);
    }

    // Update monthly counters
    this.memoryCache.monthly.internal++;
    this.memoryCache.monthly.total++;
    this.memoryCache.monthly.bandwidth += responseSize;
    
    // Calculate GB-Hours: (memoryMB / 1024) * (duration in hours)
    const gbHours = (memoryMB / 1024) * (duration / 3600000); // duration is in ms, convert to hours
    this.memoryCache.monthly.functionDurationGBHours += gbHours;
    
    // Update daily stats
    this.updateDailyStats('internal', 1);
    this.updateDailyStats('bandwidth', responseSize);
    
    if (!success) {
      this.updateDailyStats('errors', 1);
    }
    
    // Mark for database sync using the same key format
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
    this.pendingWrites.endpoints.add(key);

    return stats.count;
  }

  async trackExternal(apiName, endpoint, method = 'GET', duration = 0, success = true, responseSize = 0) {
    if (!this.memoryCache.initialized) {
      await this.initializeData();
    }
    
    // Check if initialized after attempting to load data
    if (!this.memoryCache.initialized) {
      console.warn("API tracker not initialized, skipping external tracking.");
      return 0;
    }

    this.checkMonthlyReset();
    
    // FIXED: Use consistent key format - this should match what you already have
    const key = `${apiName}:${method}:${endpoint}`;
    const timestamp = new Date().toISOString();
    
    // Check capacity for external endpoints too
    if (!this.memoryCache.external.has(key) && this.memoryCache.external.size >= this.limits.maxEndpoints) {
      const leastUsed = Array.from(this.memoryCache.external.entries())
        .sort(([, a], [, b]) => a.count - b.count)[0];
      
      if (leastUsed) {
        this.memoryCache.external.delete(leastUsed[0]);
        console.log(`🗑️ Removed least used external endpoint: ${leastUsed[0]}`);
      }
    }
    
    // Initialize endpoint stats if it doesn't exist
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

    // Get and update endpoint stats
    const stats = this.memoryCache.external.get(key);
    stats.count++;
    stats.lastCall = timestamp;
    stats.totalDuration += duration;
    stats.totalResponseSize += responseSize;
    
    if (!success) {
      stats.errors++;
    }

    // Limit recent calls to prevent memory growth
    stats.recentCalls.push({ 
      timestamp, 
      duration, 
      success, 
      responseSize 
    });
    
    if (stats.recentCalls.length > this.limits.maxRecentCalls) {
      stats.recentCalls = stats.recentCalls.slice(-this.limits.maxRecentCalls);
    }

    // Update monthly counters
    this.memoryCache.monthly.external++;
    this.memoryCache.monthly.total++;
    this.memoryCache.monthly.bandwidth += responseSize;

    // Update daily stats
    this.updateDailyStats('external', 1);
    this.updateDailyStats('bandwidth', responseSize);
    
    if (!success) {
      this.updateDailyStats('errors', 1);
    }

    // Mark for database sync using the same key format
    this.pendingWrites.monthly = true;
    this.pendingWrites.daily = true;
    this.pendingWrites.endpoints.add(key);

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
  
  // New method to track image optimizations
  trackImageOptimization(count = 1) {
    this.memoryCache.monthly.imageOptimizations += count;
    this.pendingWrites.monthly = true;
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
    if (this.memoryCache.daily.size > this.limits.maxDailyEntries) {
      const oldestDate = Array.from(this.memoryCache.daily.keys()).sort()[0];
      this.memoryCache.daily.delete(oldestDate);
    }
  }

  checkMonthlyReset() {
    const now = new Date();
    const resetDate = new Date(this.memoryCache.monthly.resetDate);
    
    if (now >= resetDate) {
      console.log('🔄 Monthly API tracking reset');
      
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
      
      // Also clear performance tracking for the new month
      this.memoryCache.performance.slowestEndpoints = [];
      this.memoryCache.performance.errorRates.clear();
      this.memoryCache.performance.peakHours.clear();

      this.pendingWrites.monthly = true;
    }
  }

  getUsageStats() {
    const VERCEL_LIMITS = {
      hobby: {
        functions: 100000,
        edgeExecutionUnits: 500000,
        middlewareInvocations: 1000000,
        functionDuration: 100, // GB-Hours
        imageOptimization: 1000,
        bandwidth: 100 * 1024 * 1024 * 1024 // 100 GB in bytes
      }
    };

    // Vercel Hobby plan pricing (as of a hypothetical future date, adjust as needed)
    // This is where you would define your custom cost calculations.
    const VERCEL_PRICING = {
      functionsPerMillion: 20, // $/million invocations beyond free tier
      edgeExecutionUnitsPerMillion: 0.5, // $/million units beyond free tier
      middlewareInvocationsPerMillion: 0.5, // $/million invocations beyond free tier
      functionDurationPerGBHour: 0.0000025, // $/GB-Hour beyond free tier (example value)
      imageOptimizationPerThousand: 0.5, // $/thousand beyond free tier (example value)
      bandwidthPerGB: 0.05 // $/GB beyond free tier (example value)
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

    // Calculate estimated costs
    let estimatedMonthlyCost = 0;

    // Functions
    const excessFunctions = Math.max(0, this.memoryCache.monthly.total - VERCEL_LIMITS.hobby.functions);
    estimatedMonthlyCost += (excessFunctions / 1000000) * VERCEL_PRICING.functionsPerMillion;

    // Edge Execution Units
    const excessEdgeUnits = Math.max(0, this.memoryCache.monthly.edgeExecutionUnits - VERCEL_LIMITS.hobby.edgeExecutionUnits);
    estimatedMonthlyCost += (excessEdgeUnits / 1000000) * VERCEL_PRICING.edgeExecutionUnitsPerMillion;

    // Middleware Invocations
    const excessMiddleware = Math.max(0, this.memoryCache.monthly.middlewareInvocations - VERCEL_LIMITS.hobby.middlewareInvocations);
    estimatedMonthlyCost += (excessMiddleware / 1000000) * VERCEL_PRICING.middlewareInvocationsPerMillion;

    // Function Duration (GB-Hours)
    const excessFunctionDuration = Math.max(0, this.memoryCache.monthly.functionDurationGBHours - VERCEL_LIMITS.hobby.functionDuration);
    estimatedMonthlyCost += excessFunctionDuration * VERCEL_PRICING.functionDurationPerGBHour;

    // Image Optimizations
    const excessImageOptimizations = Math.max(0, this.memoryCache.monthly.imageOptimizations - VERCEL_LIMITS.hobby.imageOptimization);
    estimatedMonthlyCost += (excessImageOptimizations / 1000) * VERCEL_PRICING.imageOptimizationPerThousand;

    // Bandwidth (convert bytes to GB for calculation)
    const excessBandwidthGB = Math.max(0, (this.memoryCache.monthly.bandwidth - VERCEL_LIMITS.hobby.bandwidth) / (1024 * 1024 * 1024));
    estimatedMonthlyCost += excessBandwidthGB * VERCEL_PRICING.bandwidthPerGB;

    // Calculate performance metrics with memory limits
    const calculatePerformanceMetrics = () => {
      let totalDuration = 0;
      let totalCalls = 0;
      const slowestEndpoints = [];
      const errorRates = [];
      const hourlyStats = new Map();

      // Process internal endpoints (limited)
      for (const [key, stats] of this.memoryCache.internal.entries()) {
        totalDuration += stats.totalDuration;
        totalCalls += stats.count;

        const avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
        
        slowestEndpoints.push({
          endpoint: stats.endpoint,
          method: stats.method,
          count: stats.count,
          totalDuration: stats.totalDuration,
          avgDuration: avgDuration,
          callCount: stats.count
        });

        if (stats.count > 0) {
          errorRates.push({
            endpoint: stats.endpoint,
            method: stats.method,
            totalRequests: stats.count,
            errorCount: stats.errors,
            errorRate: (stats.errors / stats.count) * 100
          });
        }

        // Process recent calls for hourly stats (limited)
        if (stats.recentCalls && stats.recentCalls.length > 0) {
          stats.recentCalls.forEach(call => {
            if (call.timestamp) {
              const hour = new Date(call.timestamp).getHours();
              if (!hourlyStats.has(hour)) {
                hourlyStats.set(hour, { hour, calls: 0 });
              }
              hourlyStats.get(hour).calls++;
            }
          });
        }
      }

      // Process external endpoints (limited)
      for (const [key, stats] of this.memoryCache.external.entries()) {
        totalDuration += stats.totalDuration;
        totalCalls += stats.count;

        const avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
        
        slowestEndpoints.push({
          endpoint: `${stats.apiName}: ${stats.endpoint}`,
          method: stats.method,
          count: stats.count,
          totalDuration: stats.totalDuration,
          avgDuration: avgDuration,
          callCount: stats.count
        });

        if (stats.count > 0) {
          errorRates.push({
            endpoint: `${stats.apiName}: ${stats.endpoint}`,
            method: stats.method,
            totalRequests: stats.count,
            errorCount: stats.errors,
            errorRate: (stats.errors / stats.count) * 100
          });
        }
      }

      const averageResponseTime = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      // Sort and limit results to prevent memory issues
      const sortedSlowestEndpoints = slowestEndpoints
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, this.limits.maxSlowEndpoints);

      const sortedErrorRates = errorRates
        .filter(e => e.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, this.limits.maxErrorRates);

      const peakHours = Array.from(hourlyStats.values())
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);

      return {
        averageResponseTime,
        slowestEndpoints: sortedSlowestEndpoints,
        errorRates: sortedErrorRates,
        peakHours
      };
    };

    const performanceMetrics = calculatePerformanceMetrics();

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
      // Added costs property
      costs: {
        estimated: parseFloat(estimatedMonthlyCost.toFixed(2)) // Ensure it's always a number, rounded to 2 decimal places
      },
      breakdown: {
        internal: {
          total: this.memoryCache.monthly.internal,
          endpoints: this.memoryCache.internal.size,
          details: Array.from(this.memoryCache.internal.values()).sort((a, b) => b.count - a.count).slice(0, 20)
        },
        external: {
          total: this.memoryCache.monthly.external,
          apis: this.memoryCache.external.size,
          details: Array.from(this.memoryCache.external.values()).sort((a, b) => b.count - a.count).slice(0, 20)
        }
      },
      performance: {
        slowestEndpoints: performanceMetrics.slowestEndpoints,
        errorRates: performanceMetrics.errorRates,
        peakHours: performanceMetrics.peakHours,
        averageResponseTime: performanceMetrics.averageResponseTime
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
      memory: {
        cacheSize: {
          internal: this.memoryCache.internal.size,
          external: this.memoryCache.external.size,
          daily: this.memoryCache.daily.size
        },
        limits: this.limits,
        lastCleanup: this.memoryCache.lastSyncTime
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

    // Cost recommendations
    if (stats.costs.estimated > 0) {
        recommendations.push({
            type: 'cost-awareness',
            category: 'Billing',
            message: `Projected monthly cost: $${stats.costs.estimated.toFixed(2)}. Monitor usage closely.`,
            actions: [
                'Review areas with high projected costs (e.g., functions, bandwidth).',
                'Consider upgrading your Vercel plan if usage consistently exceeds Hobby tier limits and the cost justifies it.'
            ]
        });
    }
    
    return recommendations;
  }

  // Cleanup method for graceful shutdown
  async destroy() {
    console.log('🧹 Destroying API tracker...');
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Final sync to database
    await this.syncToDatabase();
    
    // Clear all caches
    this.memoryCache.internal.clear();
    this.memoryCache.external.clear();
    this.memoryCache.daily.clear();
    
    console.log('✅ API tracker destroyed cleanly');
  }
}

// Simple singleton with proper cleanup
function createOrGetTracker() {
  if (typeof global !== 'undefined' && global.apiTrackerInstance) {
    return global.apiTrackerInstance;
  }

  const instance = new MemoryManagedAPITracker();
  
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