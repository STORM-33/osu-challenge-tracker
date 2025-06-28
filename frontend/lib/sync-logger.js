import { supabaseAdmin } from './supabase-admin';

class SyncLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_SYNC_LOGGING === 'true';
    this.performance = {
      syncTimes: [],
      apiCallTimes: [],
      dbQueryTimes: []
    };
  }

  log(component, type, message, startTime = null, details = {}) {
    if (!this.isEnabled && type !== 'sync-error' && type !== 'sync-complete') return;
    
    const now = Date.now();
    const duration = startTime ? now - startTime : null;
    
    const importantTypes = ['sync-start', 'sync-complete', 'sync-error', 'api-call', 'db-query'];
    if (process.env.NODE_ENV === 'production' && !importantTypes.includes(type)) {
      return;
    }
    
    const logEntry = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      component,
      type,
      level: this.getLogLevel(type, details),
      message,
      duration,
      details: process.env.NODE_ENV === 'development' ? details : {
        roomId: details.roomId,
        error: details.error,
        success: details.success
      }
    };

    this.logs.push(logEntry);
    
    // Trim logs more aggressively in production
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Always log errors to console
    if (logEntry.level === 'error') {
      console.error(`[${component}] ${message}`, details.error || '');
    }

    return logEntry.id;
  }

  syncStart(component, roomId, details = {}) {
    return this.log(component, 'sync-start', `Starting sync for challenge ${roomId}`, null, { roomId, ...details });
  }

  syncComplete(component, roomId, startTime, details = {}) {
    return this.log(component, 'sync-complete', `Sync completed for challenge ${roomId}`, startTime, { roomId, ...details });
  }

  syncError(component, roomId, error, startTime = null, details = {}) {
    return this.log(component, 'sync-error', `Sync failed for challenge ${roomId}: ${error.message}`, startTime, {
      roomId, error, ...details
    });
  }

  apiCall(component, method, endpoint, startTime, success, details = {}) {
    const message = `${success ? '✅' : '❌'} ${method} ${endpoint}`;
    return this.log(component, 'api-call', message, startTime, {
      method,
      endpoint,
      success,
      ...details
    });
  }

  getPerformanceStats() {
    const recentLogs = this.logs.slice(-50);
    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    
    return {
      totalLogs: this.logs.length,
      errorRate: recentLogs.length > 0 ? (errorCount / recentLogs.length) * 100 : 0,
      recentErrors: recentLogs.filter(log => log.level === 'error').slice(-5)
    };
  }

  getLogLevel(type, details) {
    if (details.error || type.includes('error')) return 'error';
    if (type.includes('complete')) return 'info';
    return 'debug';
  }
}

const syncLogger = new SyncLogger();
export default syncLogger;