// frontend/pages/monitoring-admin.js
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
  Info
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

  const { data: stats } = useAPI('/api/stats', {
    refreshInterval: 60000 // Update every minute
  });

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

  const getUsageColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 95) return 'text-red-400';
    if (pct >= 85) return 'text-yellow-400';
    if (pct >= 70) return 'text-orange-400';
    return 'text-green-400';
  };

  const getUsageBgColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 95) return 'bg-red-900/30 border-red-500/50';
    if (pct >= 85) return 'bg-yellow-900/30 border-yellow-500/50';
    if (pct >= 70) return 'bg-orange-900/30 border-orange-500/50';
    return 'bg-green-900/30 border-green-500/50';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'growing': return <ArrowUp className="w-4 h-4 text-red-400" />;
      case 'declining': return <ArrowDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
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
                  {apiCallData.debug.trackingMethod === 'custom_only' ? 'Custom Tracking' : 'Unknown Tracking'}
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
          {/* API Status */}
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

          {/* Database Status */}
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

          {/* Uptime */}
          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Uptime</span>
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <p className="font-semibold text-white">
              {healthData ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : '---'}
            </p>
          </div>

          {/* Environment */}
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

            {/* Tracking Information Panel */}
            {apiCallData.debug && (
              <div className="bg-black/30 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Usage Tracking Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Tracking Method</div>
                    <div className="text-lg font-semibold text-white capitalize">
                      {apiCallData.debug.trackingMethod?.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {apiCallData.debug.note}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Environment</div>
                    <div className="text-lg font-semibold text-white">
                      {apiCallData.debug.isLocal ? 'Local Development' : 'Production'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Data source: {apiCallData.status?.dataSource?.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Custom Tracking</div>
                    <div className="text-lg font-semibold text-white">
                      {apiCallData.debug.customTracking?.total?.toLocaleString() || 0} calls
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {apiCallData.debug.customTracking?.internal || 0} internal • {apiCallData.debug.customTracking?.external || 0} external
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Usage Statistics */}
            <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Comprehensive Usage Analytics
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

              {/* Vercel Resource Usage */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className={`rounded-lg p-4 border ${getUsageBgColor(apiCallData.usage?.functions?.percentage)}`}>
                  <div className="text-sm text-gray-400 mb-1">Functions</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.functions?.current?.toLocaleString() || 0}</div>
                  <div className={`text-xs font-semibold ${getUsageColor(apiCallData.usage?.functions?.percentage)}`}>
                    {apiCallData.usage?.functions?.percentage || '0'}%
                  </div>
                </div>

                <div className={`rounded-lg p-4 border ${getUsageBgColor(apiCallData.usage?.edgeExecutionUnits?.percentage)}`}>
                  <div className="text-sm text-gray-400 mb-1">Edge Units</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.edgeExecutionUnits?.current?.toLocaleString() || 0}</div>
                  <div className={`text-xs font-semibold ${getUsageColor(apiCallData.usage?.edgeExecutionUnits?.percentage)}`}>
                    {apiCallData.usage?.edgeExecutionUnits?.percentage || '0'}%
                  </div>
                </div>

                <div className={`rounded-lg p-4 border ${getUsageBgColor(apiCallData.usage?.middleware?.percentage)}`}>
                  <div className="text-sm text-gray-400 mb-1">Middleware</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.middleware?.current?.toLocaleString() || 0}</div>
                  <div className={`text-xs font-semibold ${getUsageColor(apiCallData.usage?.middleware?.percentage)}`}>
                    {apiCallData.usage?.middleware?.percentage || '0'}%
                  </div>
                </div>

                <div className={`rounded-lg p-4 border ${getUsageBgColor(apiCallData.usage?.functionDuration?.percentage)}`}>
                  <div className="text-sm text-gray-400 mb-1">GB-Hours</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.functionDuration?.current?.toFixed(2) || '0.00'}</div>
                  <div className={`text-xs font-semibold ${getUsageColor(apiCallData.usage?.functionDuration?.percentage)}`}>
                    {apiCallData.usage?.functionDuration?.percentage || '0'}%
                  </div>
                </div>

                <div className={`rounded-lg p-4 border ${getUsageBgColor(apiCallData.usage?.bandwidth?.percentage)}`}>
                  <div className="text-sm text-gray-400 mb-1">Bandwidth</div>
                  <div className="text-xl font-bold text-white">{apiCallData.quickMetrics?.bandwidth || '0 B'}</div>
                  <div className={`text-xs font-semibold ${getUsageColor(apiCallData.usage?.bandwidth?.percentage)}`}>
                    {apiCallData.usage?.bandwidth?.percentage || '0'}%
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Reset In</div>
                  <div className="text-xl font-bold text-white">{apiCallData.usage?.monthly?.daysUntilReset || 0}</div>
                  <div className="text-xs text-gray-500">Days</div>
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
                    Cost Analysis
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
                      <span className="text-gray-400">Savings</span>
                      <span className="text-blue-400">${apiCallData.costAnalysis?.optimization?.potentialSavings?.costSavings?.toFixed(2) || '0.00'}</span>
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

              {/* Export Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Export Data:</span>
                  {apiCallData.export && (
                    <>
                      <a
                        href={apiCallData.export.csvUrl}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        CSV
                      </a>
                      <a
                        href={apiCallData.export.jsonUrl}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        JSON
                      </a>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {apiCallData.status?.timestamp ? formatDate(apiCallData.status.timestamp, 'time') : 'Never'}
                </div>
              </div>
            </div>
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