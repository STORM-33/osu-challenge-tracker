import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Activity, 
  Database, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Target,
  TrendingUp,
  Server,
  Monitor,
  Zap,
  BarChart3,
  DollarSign,
  Globe,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  RefreshCw,
  Info,
  Timer
} from 'lucide-react';
import { useAPI } from '../hooks/useAPI';
import { auth } from '../lib/supabase';
import { formatDate } from '../lib/date-utils';

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // API calls for data
  const { data: healthData, error: healthError } = useAPI('/api/health', {
    refreshInterval: 30000 // Check every 30 seconds
  });

  const { data: statsResponse } = useAPI('/api/stats', {
    refreshInterval: 60000 // Update every minute
  });

  // Extract the actual stats data from the API response
  const stats = statsResponse?.success ? statsResponse.data : statsResponse;

  useEffect(() => {
    console.log('=== STATS DEBUG ===');
    console.log('Raw stats response:', statsResponse);
    console.log('Extracted stats object:', stats);
    console.log('Recent activity exists:', !!stats?.recentActivity);
    console.log('Recent activity length:', stats?.recentActivity?.length);
    console.log('First activity item:', stats?.recentActivity?.[0]);
    console.log('==================');
  }, [statsResponse, stats]);

  const { data: apiCallData, refresh: refreshUsage } = useAPI('/api/admin/vercel-usage', {
    refreshInterval: 30000 // Update every 30 seconds
  });

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await auth.getCurrentUser();
        if (!user || !user.admin) {
          router.push('/');
          return;
        }
        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check failed:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

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

  const getAlertIcon = (level) => {
    switch (level) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'growing': return <ArrowUp className="w-4 h-4 text-red-400" />;
      case 'declining': return <ArrowDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter out non-critical alerts that are just informational
  const getRelevantAlerts = (alerts) => {
    if (!alerts) return [];
    
    // Filter out the informational tracking alerts unless they're warnings/critical
    return alerts.filter(alert => 
      alert.level === 'critical' || 
      alert.level === 'warning' || 
      (alert.type !== 'tracking' && alert.type !== 'environment')
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  const relevantAlerts = getRelevantAlerts(apiCallData?.alerts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-purple-400" />
            Admin Monitoring Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {/* Tracking Status Indicator */}
            {apiCallData?.debug && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-600/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">
                  Custom Tracking Active
                </span>
              </div>
            )}
            <button
              onClick={refreshUsage}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">API Status</span>
              <span className={getStatusColor(healthData?.checks?.api || 'checking')}>
                {getStatusIcon(healthData?.checks?.api || 'checking')}
              </span>
            </div>
            <p className={`font-semibold ${getStatusColor(healthData?.checks?.api || 'checking')}`}>
              {(healthData?.checks?.api || 'checking').toUpperCase()}
            </p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Database</span>
              <span className={getStatusColor(healthData?.checks?.database || 'checking')}>
                {getStatusIcon(healthData?.checks?.database || 'checking')}
              </span>
            </div>
            <p className={`font-semibold ${getStatusColor(healthData?.checks?.database || 'checking')}`}>
              {(healthData?.checks?.database || 'checking').toUpperCase()}
            </p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Uptime</span>
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <p className="font-semibold text-white">
              {healthData ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : '---'}
            </p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Environment</span>
              <Server className="w-5 h-5 text-green-400" />
            </div>
            <p className="font-semibold text-white">
              {healthData?.checks?.environment?.toUpperCase() || 'UNKNOWN'}
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black/30 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-gray-400">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-green-400" />
              <span className="text-gray-400">Active Challenges</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.activeChallenges || 0}</p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
              <span className="text-gray-400">Scores Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.scoresToday || 0}</p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-purple-400" />
              <span className="text-gray-400">API Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">{apiCallData?.usage?.monthly?.total?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-400">This month</p>
          </div>
        </div>

        {/* Enhanced API Call Statistics */}
        {apiCallData && (
          <div className="space-y-8">
            {/* Alerts Section - Only show if there are relevant alerts */}
            {relevantAlerts.length > 0 && (
              <div className="bg-black/30 rounded-xl p-6 border border-red-500/30">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  System Alerts ({relevantAlerts.length})
                </h3>
                <div className="space-y-3">
                  {relevantAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      alert.level === 'critical' ? 'bg-red-900/30 border-red-500/50' :
                      alert.level === 'warning' ? 'bg-yellow-900/30 border-yellow-500/50' :
                      'bg-blue-900/30 border-blue-500/50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getAlertIcon(alert.level)}
                          <div className="flex-1">
                            <div className="font-semibold text-white">{alert.message}</div>
                            <div className="text-sm text-gray-400 mt-1">{alert.action}</div>
                            <div className="text-xs text-gray-500 mt-1 capitalize">{alert.type} • {alert.resource?.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          alert.level === 'critical' ? 'bg-red-600 text-red-100' :
                          alert.level === 'warning' ? 'bg-yellow-600 text-yellow-100' :
                          'bg-blue-600 text-blue-100'
                        }`}>
                          {alert.level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Usage Analytics */}
            <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  API Usage Analytics
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    apiCallData.status?.limitStatus === 'critical' ? 'bg-red-600 text-red-100' :
                    apiCallData.status?.limitStatus === 'warning' ? 'bg-yellow-600 text-yellow-100' :
                    apiCallData.status?.limitStatus === 'caution' ? 'bg-orange-600 text-orange-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    {apiCallData.status?.limitStatus?.toUpperCase() || 'OK'}
                  </span>
                </div>
              </div>

              {/* Key Metrics - Only data we can actually track */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/50">
                  <div className="text-sm text-gray-400 mb-1">Total API Calls</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.monthly?.total?.toLocaleString() || 0}</div>
                  <div className="text-xs text-blue-400">This month</div>
                </div>

                <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/50">
                  <div className="text-sm text-gray-400 mb-1">Bandwidth Used</div>
                  <div className="text-xl font-bold text-white">{formatBytes(apiCallData.usage?.monthly?.bandwidth || 0)}</div>
                  <div className="text-xs text-green-400">Data transferred</div>
                </div>

                <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/50">
                  <div className="text-sm text-gray-400 mb-1">Avg Response</div>
                  <div className="text-xl font-bold text-white">{apiCallData.quickMetrics?.averageResponseTime || 0}ms</div>
                  <div className="text-xs text-yellow-400">Response time</div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Monthly Reset</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.monthly?.daysUntilReset || 0}</div>
                  <div className="text-xs text-gray-500">Days remaining</div>
                </div>
              </div>

              {/* Performance & Cost Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Response</span>
                      <span className="text-white">{apiCallData.quickMetrics?.averageResponseTime || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error Rate</span>
                      <span className={`${parseFloat(apiCallData.quickMetrics?.errorRate || 0) > 5 ? 'text-red-400' : 'text-green-400'}`}>
                        {apiCallData.quickMetrics?.errorRate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Requests/Day</span>
                      <span className="text-white">{apiCallData.efficiency?.requestsPerDay?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Cost Estimate
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current</span>
                      <span className={`${(apiCallData.costs?.estimated || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ${apiCallData.costs?.estimated?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Projected</span>
                      <span className={`${(apiCallData.costAnalysis?.projected?.estimated || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                        ${apiCallData.costAnalysis?.projected?.estimated?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bandwidth/Req</span>
                      <span className="text-white">{formatBytes(apiCallData.efficiency?.bandwidthPerRequest || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Growth Trends
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">7-Day Growth</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(apiCallData.trends?.growth?.trend)}
                        <span className={`font-semibold ${
                          (apiCallData.trends?.growth?.growth || 0) > 0 ? 'text-yellow-400' : 
                          (apiCallData.trends?.growth?.growth || 0) < 0 ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {apiCallData.trends?.growth?.growth > 0 ? '+' : ''}{apiCallData.trends?.growth?.growth || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trend</span>
                      <span className="text-white capitalize">{apiCallData.trends?.growth?.trend || 'stable'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Top Endpoint</span>
                      <span className="text-white text-xs font-mono">{apiCallData.quickMetrics?.topEndpoint?.endpoint?.split('/').pop() || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal vs External Calls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    Internal API Calls
                  </h4>
                  <div className="text-2xl font-bold text-blue-400 mb-2">{apiCallData.usage?.breakdown?.internal?.total?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-400 mb-3">Your Next.js API routes</div>
                  <div className="text-xs text-gray-500">{apiCallData.usage?.breakdown?.internal?.endpoints || 0} unique endpoints</div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-400" />
                    External API Calls
                  </h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">{apiCallData.usage?.breakdown?.external?.total?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-400 mb-3">osu! API, etc.</div>
                  <div className="text-xs text-gray-500">{apiCallData.usage?.breakdown?.external?.apis || 0} different APIs</div>
                </div>
              </div>

              {/* External API Breakdown */}
              {apiCallData.usage?.breakdown?.external?.details && apiCallData.usage.breakdown.external.details.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-400" />
                    External API Breakdown
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400">API</th>
                          <th className="text-left py-3 px-4 text-gray-400">Endpoint</th>
                          <th className="text-right py-3 px-4 text-gray-400">Calls</th>
                          <th className="text-right py-3 px-4 text-gray-400">Avg Duration</th>
                          <th className="text-right py-3 px-4 text-gray-400">Error Rate</th>
                          <th className="text-left py-3 px-4 text-gray-400">Last Called</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiCallData.usage.breakdown.external.details.slice(0, 10).map((api, index) => (
                          <tr key={index} className="border-b border-gray-800">
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                api.apiName === 'osu-api' ? 'bg-blue-600 text-blue-100' :
                                api.apiName === 'osu-auth' ? 'bg-purple-600 text-purple-100' :
                                'bg-gray-600 text-gray-100'
                              }`}>
                                {api.apiName}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-white">{api.endpoint}</td>
                            <td className="py-3 px-4 text-right font-semibold text-white">{api.count?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-gray-400">
                              {api.totalDuration && api.count ? `${Math.round(api.totalDuration / api.count)}ms` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-400">
                              {api.errors && api.count ? `${((api.errors / api.count) * 100).toFixed(1)}%` : '0%'}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-400">
                              {api.lastCall ? formatDate(api.lastCall, 'relative') : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Performance Insights */}
              {apiCallData.performance?.slowestEndpoints && apiCallData.performance.slowestEndpoints.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-yellow-400" />
                    Performance Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-300 mb-2">Slowest Endpoints</h5>
                      <div className="space-y-2">
                        {apiCallData.performance.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                            <span className="text-xs font-mono text-white truncate">{endpoint.endpoint}</span>
                            <span className="text-sm text-yellow-400">{Math.round(endpoint.avgDuration)}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {apiCallData.performance.peakHours && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-2">Peak Hours</h5>
                        <div className="space-y-2">
                          {apiCallData.performance.peakHours.slice(0, 5).map((hour, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                              <span className="text-sm text-white">{hour.hour}:00</span>
                              <span className="text-sm text-blue-400">{hour.calls} calls</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Last updated info only */}
              <div className="flex items-center justify-end">
                <div className="text-xs text-gray-500">
                  Last updated: {apiCallData.status?.timestamp ? formatDate(apiCallData.status.timestamp, 'time') : 'Never'}
                </div>
              </div>
            </div>

            {/* Daily Trends Chart */}
            {apiCallData.trends?.daily && apiCallData.trends.daily.length > 0 && (
              <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Usage Trends (Last 30 Days)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Daily API Calls</h4>
                    <div className="space-y-1">
                      {apiCallData.trends.daily.slice(-7).map((day, index) => {
                        const total = (day.internal || 0) + (day.external || 0);
                        const maxTotal = Math.max(...apiCallData.trends.daily.map(d => (d.internal || 0) + (d.external || 0)));
                        const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                        
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-16">{formatDate(day.date, 'short')}</span>
                            <div className="flex-1 bg-gray-800 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-white w-12 text-right">{total.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Usage Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Internal Calls</span>
                        <span className="text-sm text-white">
                          {apiCallData.usage?.breakdown?.internal?.total ? 
                            `${((apiCallData.usage.breakdown.internal.total / apiCallData.usage.monthly.total) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">External Calls</span>
                        <span className="text-sm text-white">
                          {apiCallData.usage?.breakdown?.external?.total ? 
                            `${((apiCallData.usage.breakdown.external.total / apiCallData.usage.monthly.total) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Bandwidth</span>
                        <span className="text-sm text-white">{formatBytes(apiCallData.usage?.monthly?.bandwidth || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Avg Response Time</span>
                        <span className="text-sm text-white">{apiCallData.quickMetrics?.averageResponseTime || 0}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {stats?.recentActivity && (
          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-purple-400" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div>
                    <span className="text-white font-semibold">{activity.users?.username}</span>
                    <span className="text-gray-400 ml-2">scored {activity.score.toLocaleString()}</span>
                    <span className="text-gray-400 ml-1">on {activity.playlists?.challenges?.custom_name || activity.playlists?.challenges?.name}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatDate(activity.submitted_at, 'relative')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}