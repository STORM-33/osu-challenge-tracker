import { withAdminAuth } from '../../../lib/auth-middleware';
import { withAPITracking } from '../../../middleware'; 
import apiTracker from '../../../lib/api-tracker';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    // Get comprehensive usage statistics from custom tracking
    const usageStats = apiTracker.getUsageStats();
    const limitStatus = apiTracker.checkLimits();
    const recommendations = apiTracker.generateRecommendations();
    
    // Note: Vercel doesn't provide public API endpoints for usage data
    // We'll rely on custom tracking only
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocal = !isProduction;
    
    console.log('📊 Usage tracking - using custom tracking only');
    
    // Use custom tracking data
    const mergedUsageStats = enhanceUsageData(usageStats, isLocal);
    
    // Generate alerts based on current usage (without Vercel API warnings)
    const alerts = generateAlerts(mergedUsageStats, limitStatus, isLocal);
    
    // Calculate efficiency metrics
    const efficiency = calculateEfficiencyMetrics(usageStats);
    
    // Generate cost analysis
    const costAnalysis = generateCostAnalysis(mergedUsageStats);
    
    // Real-time status
    const realTimeStatus = {
      status: limitStatus,
      timestamp: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 30000).toISOString(),
      isHealthy: limitStatus === 'ok' || limitStatus === 'caution',
      environment: isLocal ? 'local' : 'production',
      dataSource: isLocal ? 'local_tracking' : 'custom_tracking'
    };

    const responseData = {
      // Core usage data from custom tracking
      usage: mergedUsageStats,
      
      // Status and health
      status: realTimeStatus,
      limitStatus,
      
      // Analysis and insights
      recommendations,
      alerts,
      efficiency,
      costAnalysis,
      
      // Trends and patterns
      trends: {
        daily: usageStats.trends,
        hourly: usageStats.performance.peakHours,
        growth: calculateGrowthTrends(usageStats)
      },
      
      // Quick metrics for dashboard
      quickMetrics: {
        totalCalls: mergedUsageStats.monthly.total,
        averageResponseTime: usageStats.performance.averageResponseTime,
        errorRate: calculateOverallErrorRate(usageStats.performance.errorRates),
        topEndpoint: getTopEndpoint(usageStats.breakdown.internal.details),
        bandwidth: formatBytes(mergedUsageStats.monthly.bandwidth),
        projectedOverage: mergedUsageStats.projections?.willExceedLimits || {}
      },
      
      // Debug info for troubleshooting
      debug: {
        isLocal,
        trackingMethod: 'custom_only',
        note: 'Vercel does not provide public usage APIs. Using custom tracking.',
        customTracking: {
          internal: usageStats.monthly.internal,
          external: usageStats.monthly.external,
          total: usageStats.monthly.total
        }
      },
      
      // Export options
      export: {
        csvUrl: '/api/admin/export/usage-csv',
        jsonUrl: '/api/admin/export/usage-json',
        reportUrl: '/api/admin/export/usage-report'
      }
    };

    return handleAPIResponse(res, responseData, { 
      cache: false // Always fresh data for admin dashboard
    });

  } catch (error) {
    console.error('Enhanced Vercel usage tracking error:', error);
    return handleAPIError(res, error);
  }
}

// Enhanced usage data with custom tracking only
function enhanceUsageData(customStats, isLocal) {
  const enhanced = JSON.parse(JSON.stringify(customStats));
  
  if (isLocal) {
    enhanced.usage = {
      ...enhanced.usage,
      functions: {
        ...enhanced.usage.functions,
        current: enhanced.monthly.total,
        note: 'Local development - using custom tracking'
      }
    };
    enhanced.environment = 'local';
  } else {
    enhanced.usage = {
      ...enhanced.usage,
      functions: {
        ...enhanced.usage.functions,
        current: enhanced.monthly.total,
        note: 'Production - custom tracking (Vercel does not provide usage APIs)'
      }
    };
    enhanced.environment = 'production_custom_tracking';
  }
  
  return enhanced;
}

// Updated alerts without Vercel API warnings
function generateAlerts(stats, limitStatus, isLocal) {
  const alerts = [];
  
  // Add environment-specific alerts
  if (isLocal) {
    alerts.push({
      level: 'info',
      type: 'environment',
      resource: 'development',
      message: 'Running in local development mode',
      action: 'Deploy to Vercel to see production usage metrics',
      priority: 3
    });
  } else {
    alerts.push({
      level: 'info',
      type: 'tracking',
      resource: 'usage_data',
      message: 'Using custom tracking for usage monitoring',
      action: 'Monitor usage through this dashboard for accurate local tracking',
      priority: 3
    });
  }
  
  // Usage-based alerts
  Object.entries(stats.usage || {}).forEach(([resource, data]) => {
    const percentage = parseFloat(data.percentage);
    
    if (percentage >= 95) {
      alerts.push({
        level: 'critical',
        type: 'usage',
        resource,
        message: `${resource} usage is at ${percentage}% (${data.current?.toLocaleString()}/${data.limit?.toLocaleString()})`,
        action: 'Immediate action required to prevent service disruption',
        priority: 1
      });
    } else if (percentage >= 85) {
      alerts.push({
        level: 'warning',
        type: 'usage',
        resource,
        message: `${resource} usage is at ${percentage}%`,
        action: 'Consider optimization or monitoring closely',
        priority: 2
      });
    }
  });
  
  return alerts.sort((a, b) => a.priority - b.priority);
}

// Keep all your existing helper functions exactly the same:
function calculateEfficiencyMetrics(stats) {
  const totalRequests = stats.monthly.total;
  const totalDuration = stats.performance.slowestEndpoints.reduce(
    (sum, ep) => sum + ep.totalDuration, 0
  );
  const totalCalls = stats.performance.slowestEndpoints.reduce(
    (sum, ep) => sum + ep.callCount, 0
  );
  
  return {
    averageResponseTime: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    requestsPerDay: Math.round(totalRequests / Math.max(1, stats.projections.daysElapsed)),
    errorRate: calculateOverallErrorRate(stats.performance.errorRates),
    bandwidthPerRequest: totalRequests > 0 ? Math.round(stats.monthly.bandwidth / totalRequests) : 0,
    functionEfficiency: {
      avgDuration: stats.performance.averageResponseTime,
      avgMemoryUsage: calculateAverageMemoryUsage(stats.breakdown.internal.details),
      costPerRequest: totalRequests > 0 ? (stats.costs.estimated / totalRequests).toFixed(4) : 0
    }
  };
}

function generateCostAnalysis(stats) {
  const currentCosts = stats.costs;
  const projectedCosts = {
    functions: Math.max(0, stats.projections.projectedMonthly.functions - stats.limits.functions) * 0.40 / 1000,
    bandwidth: Math.max(0, stats.projections.projectedMonthly.bandwidth - stats.limits.bandwidth) * 20 / (1024 * 1024 * 1024)
  };
  
  return {
    current: currentCosts,
    projected: {
      estimated: projectedCosts.functions + projectedCosts.bandwidth,
      breakdown: projectedCosts
    },
    optimization: {
      potentialSavings: calculatePotentialSavings(stats),
      recommendations: [
        'Cache responses for frequently called endpoints',
        'Optimize database queries to reduce function duration',
        'Implement request batching for bulk operations',
        'Use Edge Functions for simple operations',
        'Compress API responses to reduce bandwidth usage'
      ]
    },
    planComparison: {
      hobby: { cost: 0, limits: stats.limits },
      pro: { 
        cost: 20, 
        limits: {
          functions: 1000000,
          bandwidth: 1000 * 1024 * 1024 * 1024,
          edgeExecutionUnits: 5000000
        }
      }
    }
  };
}

function calculateGrowthTrends(stats) {
  const trends = stats.trends;
  if (trends.length < 2) return { growth: 0, trend: 'insufficient_data' };
  
  const recent = trends.slice(-7);
  const older = trends.slice(-14, -7);
  
  if (older.length === 0) return { growth: 0, trend: 'insufficient_data' };
  
  const recentAvg = recent.reduce((sum, day) => sum + (day.internal + day.external), 0) / recent.length;
  const olderAvg = older.reduce((sum, day) => sum + (day.internal + day.external), 0) / older.length;
  
  const growth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100) : 0;
  
  return {
    growth: Math.round(growth * 100) / 100,
    trend: growth > 10 ? 'growing' : growth < -10 ? 'declining' : 'stable',
    recentAverage: Math.round(recentAvg),
    previousAverage: Math.round(olderAvg)
  };
}

function calculateOverallErrorRate(errorRates) {
  if (errorRates.length === 0) return 0;
  
  const totalRequests = errorRates.reduce((sum, ep) => sum + ep.totalRequests, 0);
  const totalErrors = errorRates.reduce((sum, ep) => sum + ep.errorCount, 0);
  
  return totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0;
}

function getTopEndpoint(internalDetails) {
  if (internalDetails.length === 0) return null;
  
  const top = internalDetails[0];
  return {
    endpoint: top.endpoint,
    count: top.count,
    avgDuration: Math.round(top.totalDuration / top.count)
  };
}

function calculateAverageMemoryUsage(internalDetails) {
  if (internalDetails.length === 0) return 0;
  
  const totalMemory = internalDetails.reduce((sum, ep) => sum + (ep.totalMemoryUsage || 0), 0);
  const totalCalls = internalDetails.reduce((sum, ep) => sum + ep.count, 0);
  
  return totalCalls > 0 ? Math.round(totalMemory / totalCalls) : 128;
}

function calculatePotentialSavings(stats) {
  const topEndpoints = stats.breakdown.internal.details.slice(0, 3);
  let estimatedSavings = 0;
  
  topEndpoints.forEach(endpoint => {
    if (endpoint.count > 1000) {
      const potentialReduction = Math.round(endpoint.count * 0.3);
      estimatedSavings += potentialReduction;
    }
  });
  
  return {
    functionCalls: estimatedSavings,
    costSavings: estimatedSavings * 0.40 / 1000,
    percentage: stats.monthly.total > 0 ? ((estimatedSavings / stats.monthly.total) * 100).toFixed(1) : 0
  };
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export default withAPITracking(withAdminAuth(handler), { memoryMB: 256 });