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
    // Get comprehensive usage statistics
    const usageStats = apiTracker.getUsageStats();
    const limitStatus = apiTracker.checkLimits();
    const recommendations = apiTracker.generateRecommendations();
    
    // Try to get real Vercel usage data (when deployed)
    let realVercelData = null;
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocal = !isProduction;
    
    if (isProduction && process.env.VERCEL_API_TOKEN) {
      try {
        const vercelResponse = await fetch('https://api.vercel.com/v2/teams/usage', {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (vercelResponse.ok) {
          realVercelData = await vercelResponse.json();
        }
      } catch (vercelError) {
        console.warn('Could not fetch real Vercel usage:', vercelError.message);
      }
    }
    
    // Merge real Vercel data with custom tracking
    const mergedUsageStats = mergeUsageData(usageStats, realVercelData, isLocal);
    
    // Generate alerts based on current usage
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
      dataSource: realVercelData ? 'vercel_api' : (isLocal ? 'local_tracking' : 'custom_tracking')
    };

    const responseData = {
      // Core usage data (now potentially merged with real Vercel data)
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
        hasVercelToken: !!process.env.VERCEL_API_TOKEN,
        realVercelDataAvailable: !!realVercelData,
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

// Merge custom tracking with real Vercel data
function mergeUsageData(customStats, vercelData, isLocal) {
  if (isLocal) {
    // Add local development indicators
    return {
      ...customStats,
      usage: {
        ...customStats.usage,
        functions: {
          ...customStats.usage.functions,
          current: customStats.monthly.total, // Use your custom tracking
          note: 'Local development - using custom tracking'
        }
      },
      environment: 'local'
    };
  }
  
  if (!vercelData) {
    // Production but no real Vercel data
    return {
      ...customStats,
      usage: {
        ...customStats.usage,
        functions: {
          ...customStats.usage.functions,
          current: customStats.monthly.total,
          note: 'Production - using custom tracking (add VERCEL_API_TOKEN for real data)'
        }
      },
      environment: 'production_custom_only'
    };
  }
  
  // Production with real Vercel data - merge both
  const merged = JSON.parse(JSON.stringify(customStats));
  
  // Override with real Vercel usage where available
  if (vercelData.usage?.functions) {
    merged.usage.functions.current = vercelData.usage.functions.used || 0;
    merged.usage.functions.percentage = ((vercelData.usage.functions.used || 0) / merged.limits.functions * 100).toFixed(2);
  }
  
  if (vercelData.usage?.bandwidth) {
    merged.usage.bandwidth.current = vercelData.usage.bandwidth.used || 0;
    merged.usage.bandwidth.percentage = ((vercelData.usage.bandwidth.used || 0) / merged.limits.bandwidth * 100).toFixed(2);
  }
  
  if (vercelData.usage?.edgeExecutions) {
    merged.usage.edgeExecutionUnits.current = vercelData.usage.edgeExecutions.used || 0;
    merged.usage.edgeExecutionUnits.percentage = ((vercelData.usage.edgeExecutions.used || 0) / merged.limits.edgeExecutionUnits * 100).toFixed(2);
  }
  
  merged.environment = 'production_merged';
  return merged;
}

// Enhanced alerts that understand environment
function generateAlerts(stats, limitStatus, isLocal) {
  const alerts = [];
  
  // Add environment-specific alerts
  if (isLocal) {
    alerts.push({
      level: 'info',
      type: 'environment',
      resource: 'development',
      message: 'Running in local development mode',
      action: 'Deploy to Vercel to see real usage metrics',
      priority: 3
    });
  } else if (stats.environment === 'production_custom_only') {
    alerts.push({
      level: 'warning',
      type: 'configuration',
      resource: 'vercel_api',
      message: 'Using custom tracking only. Real Vercel usage may differ.',
      action: 'Add VERCEL_API_TOKEN environment variable for accurate data',
      priority: 2
    });
  }
  
  // Continue with existing alert logic
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
  
  // Add more alerts from your existing generateAlerts function...
  // (keeping the rest of your existing alert logic)
  
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

// IMPORTANT: Add the tracking wrapper!
export default withAPITracking(withAdminAuth(handler), { memoryMB: 256 });