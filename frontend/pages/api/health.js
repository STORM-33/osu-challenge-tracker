import { supabase } from '../../lib/supabase';
import { withAPITracking } from '../../middleware';

async function handler(req, res) {
  const checks = {
    api: 'ok',
    database: 'unknown',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  };

  try {
    // Test database connection
    const { error } = await supabase
      .from('challenges')
      .select('id')
      .limit(1);

    checks.database = error ? 'error' : 'ok';

    // Overall health status
    const isHealthy = checks.api === 'ok' && checks.database === 'ok';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      uptime: process.uptime(),
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      checks: {
        ...checks,
        database: 'error',
        error: error.message
      }
    });
  }
}

export default withAPITracking(handler, { memoryMB: 128 });