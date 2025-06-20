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
  BarChart3
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

  const { data: apiCallData } = useAPI('/api/admin/vercel-usage', {
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

  const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Monitor className="w-8 h-8 text-purple-400" />
          Admin Monitoring Dashboard
        </h1>

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
              <span className="text-gray-400">Total API Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">{apiCallData?.monthly?.total || 0}</p>
            <p className="text-sm text-gray-400">This month</p>
          </div>
        </div>

        {/* API Call Statistics */}
        {apiCallData && (
          <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30 mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Vercel API Usage Statistics
            </h3>

            {/* API Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Monthly Usage</div>
                <div className="text-xl font-bold text-white">{apiCallData.monthly?.total || 0}</div>
                <div className="text-xs text-gray-500">of {apiCallData.limits?.functions?.toLocaleString() || '100,000'}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Usage Percentage</div>
                <div className="text-xl font-bold text-white">{apiCallData.usage?.percentage || '0.00'}%</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Remaining</div>
                <div className="text-xl font-bold text-white">{apiCallData.usage?.remaining?.toLocaleString() || '100,000'}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Days Until Reset</div>
                <div className="text-xl font-bold text-white">{apiCallData.monthly?.daysUntilReset || 0}</div>
              </div>
            </div>

            {/* Internal vs External Calls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Internal API Calls</h4>
                <div className="text-2xl font-bold text-blue-400 mb-2">{apiCallData.breakdown?.internal?.total || 0}</div>
                <div className="text-sm text-gray-400">Your Next.js API routes</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">External API Calls</h4>
                <div className="text-2xl font-bold text-green-400 mb-2">{apiCallData.breakdown?.external?.total || 0}</div>
                <div className="text-sm text-gray-400">osu! API, etc.</div>
              </div>
            </div>

            {/* External API Breakdown */}
            {apiCallData.breakdown?.external?.details && apiCallData.breakdown.external.details.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">External API Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400">API</th>
                        <th className="text-left py-3 px-4 text-gray-400">Endpoint</th>
                        <th className="text-right py-3 px-4 text-gray-400">Calls</th>
                        <th className="text-right py-3 px-4 text-gray-400">Avg Duration</th>
                        <th className="text-left py-3 px-4 text-gray-400">Last Called</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiCallData.breakdown.external.details.map((api, index) => (
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
                          <td className="py-3 px-4 text-right font-semibold text-white">{api.count}</td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            {api.totalDuration ? `${Math.round(api.totalDuration / api.count)}ms` : 'N/A'}
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

            {/* Projections and Warnings */}
            {apiCallData.projections && (
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Monthly Projection</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Daily Average</div>
                    <div className="text-lg font-bold text-white">{apiCallData.projections.dailyAverage}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Projected Monthly</div>
                    <div className={`text-lg font-bold ${
                      apiCallData.projections.onTrackToExceed ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {apiCallData.projections.projectedMonthly?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Projected Usage</div>
                    <div className={`text-lg font-bold ${
                      parseFloat(apiCallData.projections.projectedUsagePercentage) > 80 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {apiCallData.projections.projectedUsagePercentage}%
                    </div>
                  </div>
                </div>
                
                {apiCallData.projections.onTrackToExceed && (
                  <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-semibold">Warning: On track to exceed monthly limit!</span>
                    </div>
                  </div>
                )}
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