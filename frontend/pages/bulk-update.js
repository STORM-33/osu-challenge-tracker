import React, { useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

export default function AdminBulkUpdate() {
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [results, setResults] = useState(null);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [limit, setLimit] = useState('');

  const runBulkUpdate = async () => {
    setIsRunning(true);
    setResults(null);
    setCurrentProgress({ current: 0, total: 0, status: 'Starting...' });

    try {
      const response = await fetch('/api/admin/bulk-update-challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dryRun: isDryRun,
          limit: limit ? parseInt(limit) : null
        })
      });

      const data = await response.json();
      setResults(data);
      setCurrentProgress(null);

    } catch (error) {
      setResults({ 
        error: 'Failed to run bulk update', 
        details: error.message 
      });
      setCurrentProgress(null);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'updated':
      case 'analyzed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'updated':
      case 'analyzed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'skipped':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Bulk Update Challenges
        </h1>
        <p className="text-gray-600 mb-6">
          Update submission dates for all challenges by re-fetching data from osu! API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={isDryRun}
                  onChange={() => setIsDryRun(true)}
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm">Dry Run (analyze only)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!isDryRun}
                  onChange={() => setIsDryRun(false)}
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm">Actually Update</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limit (optional)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to process all challenges
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={runBulkUpdate}
              disabled={isRunning}
              className={`w-full flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDryRun
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {isDryRun ? 'Analyze' : 'Update'} Challenges
                </>
              )}
            </button>
          </div>
        </div>

        {!isDryRun && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Warning: This will make many API calls
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This operation will consume significant API quota. Make sure you have enough remaining calls.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {currentProgress && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status: {currentProgress.status}</span>
              <span>{currentProgress.current}/{currentProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: currentProgress.total > 0 
                    ? `${(currentProgress.current / currentProgress.total) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <button
              onClick={() => setResults(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {results.error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{results.error}</p>
              {results.details && (
                <p className="text-xs text-red-600 mt-2">{results.details}</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {results.summary?.totalChallenges || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary?.totalUpdated || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isDryRun ? 'Analyzed' : 'Updated'}
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary?.totalFailed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.summary?.totalApiCalls || 0}
                  </div>
                  <div className="text-sm text-gray-600">API Calls</div>
                </div>
              </div>

              {results.apiUsage && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">
                    API Usage: {results.apiUsage.percentage}%
                  </h3>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(parseFloat(results.apiUsage.percentage), 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Challenge Details</h3>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                  {results.results?.map((result, index) => (
                    <div key={index} className={`p-3 border-b border-gray-100 last:border-b-0`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {result.name || `Room ${result.roomId}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Room ID: {result.roomId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          {result.estimatedScores && (
                            <div className="text-xs text-gray-500 mt-1">
                              ~{result.estimatedScores} scores
                            </div>
                          )}
                        </div>
                      </div>
                      {result.error && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}