import React from 'react';
import { AlertTriangle, RefreshCw, Home, ExternalLink } from 'lucide-react';

// Error types for better categorization
const ERROR_TYPES = {
  NETWORK: 'network',
  API: 'api',
  AUTH: 'auth',
  RATE_LIMIT: 'rate_limit',
  NOT_FOUND: 'not_found',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// Determine error type from error object
function getErrorType(error) {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  const message = error.message?.toLowerCase() || '';
  
  if (error.name === 'TypeError' && message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  
  if (error.status) {
    if (error.status === 401 || error.status === 403) {
      return ERROR_TYPES.AUTH;
    }
    if (error.status === 404) {
      return ERROR_TYPES.NOT_FOUND;
    }
    if (error.status === 429) {
      return ERROR_TYPES.RATE_LIMIT;
    }
    if (error.status >= 400 && error.status < 500) {
      return ERROR_TYPES.VALIDATION;
    }
    if (error.status >= 500) {
      return ERROR_TYPES.API;
    }
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return ERROR_TYPES.AUTH;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

// Get user-friendly error messages
function getErrorMessage(error, errorType) {
  const messages = {
    [ERROR_TYPES.NETWORK]: {
      title: 'Connection Problem',
      description: 'Unable to connect to our servers. Please check your internet connection and try again.',
      action: 'Retry'
    },
    [ERROR_TYPES.API]: {
      title: 'Server Error',
      description: 'Our servers are experiencing issues. This is usually temporary.',
      action: 'Try Again'
    },
    [ERROR_TYPES.AUTH]: {
      title: 'Authentication Required',
      description: 'You need to log in to access this feature.',
      action: 'Login'
    },
    [ERROR_TYPES.RATE_LIMIT]: {
      title: 'Too Many Requests',
      description: 'You\'re making requests too quickly. Please wait a moment before trying again.',
      action: 'Wait & Retry'
    },
    [ERROR_TYPES.NOT_FOUND]: {
      title: 'Not Found',
      description: 'The content you\'re looking for doesn\'t exist or has been moved.',
      action: 'Go Home'
    },
    [ERROR_TYPES.PERMISSION]: {
      title: 'Access Denied',
      description: 'You don\'t have permission to access this resource.',
      action: 'Go Back'
    },
    [ERROR_TYPES.VALIDATION]: {
      title: 'Invalid Request',
      description: 'The request contains invalid data. Please check your input and try again.',
      action: 'Retry'
    },
    [ERROR_TYPES.UNKNOWN]: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try refreshing the page.',
      action: 'Refresh'
    }
  };

  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorType = getErrorType(error);
    
    // Store error info
    this.setState({ errorInfo });
    
    // Log error details
    const errorDetails = {
      id: this.state.errorId,
      type: errorType,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    console.error('Error caught by boundary:', errorDetails);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send to error tracking service (e.g., Sentry)
        if (window.Sentry) {
          window.Sentry.withScope((scope) => {
            scope.setTag('errorBoundary', true);
            scope.setTag('errorType', errorType);
            scope.setContext('errorDetails', errorDetails);
            window.Sentry.captureException(error);
          });
        }
        
        // Optionally send to your own error logging endpoint
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorDetails)
        }).catch(() => {
          // Silently fail if error logging fails
        });
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  render() {
    if (this.state.hasError) {
      const errorType = getErrorType(this.state.error);
      const errorMessage = getErrorMessage(this.state.error, errorType);
      const isNetworkError = errorType === ERROR_TYPES.NETWORK;
      const isAuthError = errorType === ERROR_TYPES.AUTH;
      const isRateLimit = errorType === ERROR_TYPES.RATE_LIMIT;

      // Custom fallback from props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold mb-2">{errorMessage.title}</h1>
            <p className="text-gray-400 mb-6">{errorMessage.description}</p>

            {/* Additional Info for Rate Limiting */}
            {isRateLimit && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-300 text-sm">
                  Rate limit will reset in a few minutes. You can try again then.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {isAuthError ? (
                <button
                  onClick={this.handleLogin}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Login with osu!
                </button>
              ) : errorType === ERROR_TYPES.NOT_FOUND ? (
                <button
                  onClick={this.handleGoHome}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              ) : (
                <button
                  onClick={isNetworkError ? this.handleRetry : this.handleRefresh}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={isRateLimit}
                >
                  <RefreshCw className="w-4 h-4" />
                  {errorMessage.action}
                </button>
              )}

              {/* Secondary Actions */}
              <div className="flex gap-2">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={this.handleRefresh}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Retry Count */}
            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                Retry attempts: {this.state.retryCount}
              </p>
            )}

            {/* Support Information */}
            <div className="text-xs text-gray-500">
              <p>Error ID: {this.state.errorId}</p>
              {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
                <p className="mt-1">
                  Need help? Contact{' '}
                  <a 
                    href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Error Report - ${this.state.errorId}`}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    support
                  </a>
                </p>
              )}
            </div>

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-4 bg-black/50 rounded text-xs overflow-auto max-h-64">
                  <div className="mb-2">
                    <strong>Type:</strong> {errorType}
                  </div>
                  <div className="mb-2">
                    <strong>Message:</strong> {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary integration
export function useErrorHandler() {
  return (error, errorInfo) => {
    // This can be used to manually trigger error boundary
    throw error;
  };
}

export default ErrorBoundary;