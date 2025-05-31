import { useState, useEffect } from 'react';
import { Activity, Database, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAPI } from '../hooks/useAPI';
import { formatDate } from '../lib/date-utils';

export default function MonitoringDashboard() {
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    database: 'checking',
    worker: 'checking'
  });

  const { data: healthData, error: healthError } = useAPI('/api/health', {
    refreshInterval: 30000 // Check every 30 seconds
  });

  const { data: stats } = useAPI('/api/stats', {
    refreshInterval: 60000 // Update every minute
  });

  useEffect(() => {
    if (healthData) {
      setSystemStatus({
        api: healthData.checks.api,
        database: healthData.checks.database,
        worker: 'ok' // Would need separate worker health endpoint
      });
    }
    if (healthError) {
      setSystemStatus(prev => ({
        ...prev,
        api: 'error'
      }));
    }
  }, [healthData, healthError]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5 animate-pulse" />;
    }
  };

  return (
    <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-400" />
        System Status
      </h3>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">API Status</span>
            <span className={getStatusColor(systemStatus.api)}>
              {getStatusIcon(systemStatus.api)}
            </span>
          </div>
          <p className={`font-semibold ${getStatusColor(systemStatus.api)}`}>
            {systemStatus.api.toUpperCase()}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Database</span>
            <span className={getStatusColor(systemStatus.database)}>
              {getStatusIcon(systemStatus.database)}
            </span>
          </div>
          <p className={`font-semibold ${getStatusColor(systemStatus.database)}`}>
            {systemStatus.database.toUpperCase()}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Worker</span>
            <span className={getStatusColor(systemStatus.worker)}>
              {getStatusIcon(systemStatus.worker)}
            </span>
          </div>
          <p className={`font-semibold ${getStatusColor(systemStatus.worker)}`}>
            {systemStatus.worker.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Active Challenges</span>
            <span className="font-semibold">{stats.activeChallenges}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Users</span>
            <span className="font-semibold">{stats.totalUsers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Scores Today</span>
            <span className="font-semibold">{stats.scoresToday}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Update</span>
            <span className="font-semibold">
              {formatDate(stats.lastUpdate, 'relative')}
            </span>
          </div>
        </div>
      )}

      {/* Uptime */}
      {healthData && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Uptime
            </span>
            <span className="font-mono">
              {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
            </span>
          </div>
        </div>
      )}
    </div>
  );
}