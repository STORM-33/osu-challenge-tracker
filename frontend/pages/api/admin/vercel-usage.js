import { withAdminAuth } from '../../../lib/auth-middleware';
import apiTracker from '../../../lib/api-tracker';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    const usageStats = apiTracker.getUsageStats();
    const limitStatus = apiTracker.checkLimits();
    
    // Calculate daily average
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const dailyAverage = Math.round(usageStats.monthly.total / currentDay);
    const projectedMonthly = dailyAverage * daysInMonth;

    res.status(200).json({
      success: true,
      data: {
        ...usageStats,
        limitStatus,
        projections: {
          dailyAverage,
          projectedMonthly,
          projectedUsagePercentage: (projectedMonthly / usageStats.limits.functions * 100).toFixed(2),
          onTrackToExceed: projectedMonthly > usageStats.limits.functions
        },
        recommendations: generateRecommendations(usageStats, limitStatus, projectedMonthly)
      }
    });

  } catch (error) {
    console.error('Vercel usage tracking error:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Failed to fetch Vercel usage statistics',
        code: 'USAGE_TRACKING_ERROR'
      }
    });
  }
}

function generateRecommendations(stats, limitStatus, projectedMonthly) {
  const recommendations = [];
  
  if (limitStatus === 'critical') {
    recommendations.push({
      type: 'critical',
      message: 'API usage is critical! Consider implementing request caching or rate limiting.',
      action: 'Implement caching for frequently called endpoints'
    });
  }
  
  if (projectedMonthly > stats.limits.functions) {
    recommendations.push({
      type: 'warning',
      message: `Projected to exceed monthly limit by ${(projectedMonthly - stats.limits.functions).toLocaleString()} calls`,
      action: 'Optimize high-traffic endpoints or upgrade plan'
    });
  }
  
  // Find highest usage endpoints
  const topInternal = stats.breakdown.internal.details
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
    
  if (topInternal.length > 0 && topInternal[0].count > 1000) {
    recommendations.push({
      type: 'optimization',
      message: `Top endpoint ${topInternal[0].endpoint} has ${topInternal[0].count} calls`,
      action: 'Consider caching or optimizing this endpoint'
    });
  }
  
  return recommendations;
}

export default withAdminAuth(handler);