import { withAdminAuth } from '../../../lib/auth-middleware';
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
    
    // Generate alerts based on current usage
    const alerts = generateAlerts(usageStats, limitStatus);
    
    // Calculate efficiency metrics
    const efficiency = calculateEfficiencyMetrics(usageStats);
    
    // Generate cost analysis
    const costAnalysis = generateCostAnalysis(usageStats);
    
    // Real-time status
    const realTimeStatus = {
      status: limitStatus,
      timestamp: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 30000).toISOString(), // Next check in 30 seconds
      isHealthy: limitStatus === 'ok' || limitStatus === 'caution'
    };

    const responseData = {
      // Core usage data
      usage: usageStats,
      
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
        totalCalls: usageStats.monthly.total,
        averageResponseTime: usageStats.performance.averageResponseTime,
        errorRate: calculateOverallErrorRate(usageStats.performance.errorRates),
        topEndpoint: getTopEndpoint(usageStats.breakdown.internal.details),
        bandwidth: formatBytes(usageStats.monthly.bandwidth),
        projectedOverage: usageStats.projections.willExceedLimits
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

// Generate alerts based on usage patterns
function generateAlerts(stats, limitStatus) {
  const alerts = [];
  
  // Critical usage alerts
  Object.entries(stats.usage).forEach(([resource, data]) => {
    const percentage = parseFloat(data.percentage);
    
    if (percentage >= 95) {
      alerts.push({
        level: 'critical',
        type: 'usage',
        resource,
        message: `${resource} usage is at ${percentage}% (${data.current.toLocaleString()}/${data.limit.toLocaleString()})`,
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
  
  // Projection alerts
  Object.entries(stats.projections.willExceedLimits).forEach(([resource, willExceed]) => {
    if (willExceed) {
      const projected = stats.projections.projectedMonthly[resource];
      alerts.push({
        level: 'warning',
        type: 'projection',
        resource,
        message: `Projected to exceed ${resource} limit this month (${projected?.toLocaleString() || 'N/A'})`,
        action: 'Optimize usage or consider upgrading plan',
        priority: 2
      });
    }
  });
  
  // Performance alerts
  const slowEndpoints = stats.performance.slowestEndpoints.filter(ep => ep.avgDuration > 5000);
  if (slowEndpoints.length > 0) {
    alerts.push({
      level: 'info',
      type: 'performance',
      resource: 'response_time',
      message: `${slowEndpoints.length} endpoint(s) with >5s average response time`,
      action: 'Review and optimize slow endpoints',
      priority: 3
    });
  }
  
  // Error rate alerts
  const highErrorEndpoints = stats.performance.errorRates.filter(ep => parseFloat(ep.errorRate) > 5);
  if (highErrorEndpoints.length > 0) {
    alerts.push({
      level: 'warning',
      type: 'errors',
      resource: 'error_rate',
      message: `${highErrorEndpoints.length} endpoint(s) with >5% error rate`,
      action: 'Investigate and fix error-prone endpoints',
      priority: 2
    });
  }
  
  // Cost alerts
  if (stats.costs.estimated > 0) {
    alerts.push({
      level: 'warning',
      type: 'cost',
      resource: 'overages',
      message: `Estimated overage cost: $${stats.costs.estimated.toFixed(2)}`,
      action: 'Consider plan upgrade or usage optimization',
      priority: 2
    });
  }
  
  return alerts.sort((a, b) => a.priority - b.priority);
}

// Calculate efficiency metrics
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

// Generate cost analysis
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
          bandwidth: 1000 * 1024 * 1024 * 1024, // 1TB
          edgeExecutionUnits: 5000000
        }
      }
    }
  };
}

// Calculate growth trends
function calculateGrowthTrends(stats) {
  const trends = stats.trends;
  if (trends.length < 2) return { growth: 0, trend: 'insufficient_data' };
  
  const recent = trends.slice(-7); // Last 7 days
  const older = trends.slice(-14, -7); // Previous 7 days
  
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

// Helper functions
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
  // Estimate potential savings from optimization
  const topEndpoints = stats.breakdown.internal.details.slice(0, 3);
  let estimatedSavings = 0;
  
  topEndpoints.forEach(endpoint => {
    if (endpoint.count > 1000) {
      // Assume 30% reduction possible through caching
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

export default withAdminAuth(handler);