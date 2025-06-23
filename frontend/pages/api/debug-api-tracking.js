import apiTracker from '../../lib/api-tracker';
import { supabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-06"
    
    console.log('🔍 Starting comprehensive API tracking diagnostic...');
    
    // 1. Check if tables exist
    const tableChecks = {};
    
    const tables = [
      'api_usage_monthly',
      'api_endpoint_performance', 
      'api_daily_stats',
      'api_locks'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .limit(1);
        tableChecks[table] = error ? `Error: ${error.message}` : 'EXISTS';
      } catch (e) {
        tableChecks[table] = `Exception: ${e.message}`;
      }
    }

    // 2. Get current memory state
    const memoryState = {
      initialized: apiTracker.memoryCache.initialized,
      externalEndpoints: apiTracker.memoryCache.external.size,
      internalEndpoints: apiTracker.memoryCache.internal.size,
      dailyEntries: apiTracker.memoryCache.daily.size,
      pendingWrites: {
        monthly: apiTracker.pendingWrites.monthly,
        daily: apiTracker.pendingWrites.daily,
        endpoints: apiTracker.pendingWrites.endpoints.size,
        endpointsList: Array.from(apiTracker.pendingWrites.endpoints)
      },
      lastSyncTime: apiTracker.memoryCache.lastSyncTime,
      timeSinceLastSync: apiTracker.memoryCache.lastSyncTime ? 
        Math.floor((Date.now() - apiTracker.memoryCache.lastSyncTime) / 1000) : 'never'
    };

    // 3. Analyze memory cache keys for issues
    const keyAnalysis = {
      internal: {
        total: apiTracker.memoryCache.internal.size,
        sample: [],
        issues: []
      },
      external: {
        total: apiTracker.memoryCache.external.size,
        sample: [],
        issues: [],
        byApiName: {}
      }
    };

    // Analyze internal keys
    let internalCount = 0;
    for (const [key, stats] of apiTracker.memoryCache.internal.entries()) {
      if (internalCount < 5) {
        keyAnalysis.internal.sample.push({
          key,
          endpoint: stats.endpoint,
          method: stats.method,
          count: stats.count,
          lastCall: stats.lastCall
        });
      }
      
      // Check for key format issues
      const expectedKey = `${stats.method}:${stats.endpoint}`;
      if (key !== expectedKey) {
        keyAnalysis.internal.issues.push({
          key,
          expected: expectedKey,
          issue: 'KEY_FORMAT_MISMATCH'
        });
      }
      
      internalCount++;
    }

    // Analyze external keys
    let externalCount = 0;
    for (const [key, stats] of apiTracker.memoryCache.external.entries()) {
      if (externalCount < 10) {
        keyAnalysis.external.sample.push({
          key,
          endpoint: stats.endpoint,
          method: stats.method,
          apiName: stats.apiName,
          count: stats.count,
          lastCall: stats.lastCall,
          recentCallsCount: stats.recentCalls?.length || 0
        });
      }
      
      // Count by API name
      if (!keyAnalysis.external.byApiName[stats.apiName]) {
        keyAnalysis.external.byApiName[stats.apiName] = 0;
      }
      keyAnalysis.external.byApiName[stats.apiName]++;
      
      // Check for key format issues
      const expectedKey = `${stats.apiName}:${stats.method}:${stats.endpoint}`;
      if (key !== expectedKey) {
        keyAnalysis.external.issues.push({
          key,
          expected: expectedKey,
          issue: 'KEY_FORMAT_MISMATCH',
          apiName: stats.apiName
        });
      }
      
      externalCount++;
    }

    // 4. Get database records for comparison
    let dbRecordsBefore = [];
    try {
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('api_endpoint_performance')
        .select('*')
        .eq('month', currentMonth)
        .order('last_called', { ascending: false })
        .limit(200);
      
      if (dbError) {
        console.error('Database query error:', dbError);
      } else {
        dbRecordsBefore = dbData || [];
      }
    } catch (e) {
      console.error('Database query exception:', e);
    }

    // 5. Check monthly usage data
    let monthlyUsage = null;
    try {
      const { data: monthlyData, error: monthlyError } = await supabaseAdmin
        .from('api_usage_monthly')
        .select('*')
        .eq('month', currentMonth)
        .single();
      
      if (!monthlyError && monthlyData) {
        monthlyUsage = monthlyData;
      }
    } catch (e) {
      console.error('Monthly usage query error:', e);
    }

    // 6. Force a sync and check results
    console.log('🔄 Forcing database sync...');
    let syncResult = null;
    try {
      await apiTracker.syncToDatabase();
      syncResult = { success: true, message: 'Sync completed successfully' };
      console.log('✅ Sync completed');
    } catch (syncError) {
      syncResult = { success: false, error: syncError.message };
      console.error('❌ Sync failed:', syncError);
    }

    // 7. Get updated database records after sync
    let dbRecordsAfter = [];
    try {
      const { data: dbDataAfter, error: dbErrorAfter } = await supabaseAdmin
        .from('api_endpoint_performance')
        .select('*')
        .eq('month', currentMonth)
        .order('last_called', { ascending: false })
        .limit(200);
      
      if (!dbErrorAfter) {
        dbRecordsAfter = dbDataAfter || [];
      }
    } catch (e) {
      console.error('Post-sync database query exception:', e);
    }

    // 8. Test a simple database operation (no upsert conflicts)
    let manualTestResult = null;
    try {
      const testRecord = {
        month: currentMonth,
        endpoint: '/api/v2/test-debug-endpoint',
        method: 'GET',
        type: 'external',
        api_name: 'test-api',
        call_count: 1,
        total_duration: 100,
        error_count: 0,
        last_called: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use simple insert instead of upsert to avoid constraint issues
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('api_endpoint_performance')
        .insert([testRecord])
        .select();

      if (insertError) {
        manualTestResult = {
          success: false,
          error: insertError.message,
          data: null
        };
      } else {
        manualTestResult = {
          success: true,
          error: null,
          data: insertData
        };

        // Clean up test record
        if (insertData?.[0]?.id) {
          await supabaseAdmin
            .from('api_endpoint_performance')
            .delete()
            .eq('id', insertData[0].id);
        }
      }
    } catch (e) {
      manualTestResult = {
        success: false,
        error: e.message,
        data: null
      };
    }

    // 9. Generate recommendations based on findings
    const recommendations = [];

    // Key format issues
    if (keyAnalysis.external.issues.length > 0) {
      recommendations.push({
        type: 'critical',
        category: 'Key Format',
        message: `${keyAnalysis.external.issues.length} external endpoints have incorrect key format`,
        action: 'Run apiTracker.fixLegacyKeys() to correct key formats',
        details: keyAnalysis.external.issues.slice(0, 5)
      });
    }

    if (keyAnalysis.internal.issues.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Key Format',
        message: `${keyAnalysis.internal.issues.length} internal endpoints have incorrect key format`,
        action: 'Check internal endpoint key generation logic'
      });
    }

    // Sync issues
    if (!syncResult?.success) {
      recommendations.push({
        type: 'critical',
        category: 'Database Sync',
        message: 'Database sync failed',
        action: 'Check database connection and constraints',
        error: syncResult?.error
      });
    }

    // Pending writes stuck
    if (memoryState.pendingWrites.endpoints > 10) {
      recommendations.push({
        type: 'warning',
        category: 'Performance',
        message: `${memoryState.pendingWrites.endpoints} endpoints pending sync`,
        action: 'Check if sync process is working correctly'
      });
    }

    // Memory vs database discrepancy
    const memoryTotal = keyAnalysis.internal.total + keyAnalysis.external.total;
    const dbTotal = dbRecordsAfter.length;
    if (Math.abs(memoryTotal - dbTotal) > 10) {
      recommendations.push({
        type: 'warning',
        category: 'Data Consistency',
        message: `Memory cache (${memoryTotal}) and database (${dbTotal}) have significant differences`,
        action: 'Investigate sync process and key format issues'
      });
    }

    // 10. Calculate statistics
    const statistics = {
      memory: {
        totalEndpoints: memoryTotal,
        internal: keyAnalysis.internal.total,
        external: keyAnalysis.external.total,
        dailyEntries: memoryState.dailyEntries,
        pendingWrites: memoryState.pendingWrites.endpoints
      },
      database: {
        totalRecords: dbRecordsAfter.length,
        byType: {
          internal: dbRecordsAfter.filter(r => r.type === 'internal').length,
          external: dbRecordsAfter.filter(r => r.type === 'external').length
        },
        byApiName: {}
      },
      sync: {
        beforeCount: dbRecordsBefore.length,
        afterCount: dbRecordsAfter.length,
        recordsAdded: dbRecordsAfter.length - dbRecordsBefore.length,
        lastSyncAgo: memoryState.timeSinceLastSync
      }
    };

    // Count database records by API name
    dbRecordsAfter.forEach(record => {
      const apiName = record.api_name || 'internal';
      if (!statistics.database.byApiName[apiName]) {
        statistics.database.byApiName[apiName] = 0;
      }
      statistics.database.byApiName[apiName]++;
    });

    return res.status(200).json({
      diagnostic: {
        timestamp: new Date().toISOString(),
        month: currentMonth,
        
        // Core status
        tableChecks,
        memoryState,
        syncResult,
        manualTest: manualTestResult,
        
        // Detailed analysis
        keyAnalysis,
        statistics,
        
        // Sample data
        sampleData: {
          memoryExternal: keyAnalysis.external.sample,
          memoryInternal: keyAnalysis.internal.sample,
          databaseRecent: dbRecordsAfter.slice(0, 5)
        },
        
        // Monthly usage
        monthlyUsage,
        
        // Actionable recommendations
        recommendations,
        
        // System info
        systemInfo: {
          nodeEnv: process.env.NODE_ENV,
          timestamp: Date.now(),
          uptime: process.uptime ? process.uptime() : 'unknown'
        }
      }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}