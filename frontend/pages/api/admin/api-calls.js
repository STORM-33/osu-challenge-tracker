import { withAdminAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    // Get stats from global storage (or your preferred storage)
    const apiCallStats = global.apiCallStats || new Map();
    
    // Convert Map to object for JSON response
    const statsArray = Array.from(apiCallStats.entries()).map(([key, stats]) => ({
      endpoint: stats.endpoint,
      method: stats.method,
      totalCalls: stats.count,
      firstCall: stats.firstCall,
      lastCall: stats.lastCall,
      avgResponseTime: stats.avgResponseTime || null,
      errorRate: stats.errorCount ? (stats.errorCount / stats.count * 100).toFixed(2) + '%' : '0%',
      recentCalls: stats.calls.slice(-10) // Last 10 calls
    }));

    // Sort by most called endpoints
    statsArray.sort((a, b) => b.totalCalls - a.totalCalls);

    // Calculate totals
    const totalApiCalls = statsArray.reduce((sum, stat) => sum + stat.totalCalls, 0);
    const uniqueEndpoints = statsArray.length;
    const totalErrors = statsArray.reduce((sum, stat) => {
      const errorCount = stat.recentCalls.filter(call => !call.success).length;
      return sum + errorCount;
    }, 0);

    return handleAPIResponse(res, {
      data: {
        summary: {
          totalApiCalls,
          uniqueEndpoints,
          totalErrors,
          errorRate: totalApiCalls > 0 ? (totalErrors / totalApiCalls * 100).toFixed(2) + '%' : '0%',
          generatedAt: new Date().toISOString()
        },
        endpoints: statsArray,
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    });

  } catch (error) {
    console.error('API tracking error:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Failed to fetch API call statistics',
        code: 'API_TRACKING_ERROR'
      }
    });
  }
}

export default handler;