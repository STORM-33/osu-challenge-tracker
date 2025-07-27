import { supabase } from '../../lib/supabase';
import { handleAPIResponse, handleAPIError } from '../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../lib/memory-cache';

async function handler(req, res) {
  try {
    const cacheKey = createCacheKey('health', 'check');

    // VERY SHORT CACHE FOR HEALTH CHECKS
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 60 
      });
    }

    const checks = {
      api: 'ok',
      database: 'unknown',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV
    };

    // Test database connection
    const { error } = await supabase
      .from('challenges')
      .select('id')
      .limit(1);

    checks.database = error ? 'error' : 'ok';

    // Overall health status
    const isHealthy = checks.api === 'ok' && checks.database === 'ok';

    const responseData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      uptime: process.uptime(),
    };

    // Cache for 1 minute
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.HEALTH);

    return handleAPIResponse(res, responseData, { 
      status: isHealthy ? 200 : 503,
      cache: true,
      cacheTime: 60
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      checks: {
        api: 'error',
        database: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export default handler;