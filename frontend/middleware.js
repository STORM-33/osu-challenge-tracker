import { NextResponse } from 'next/server';
import apiTracker from './lib/api-tracker';

export function middleware(request) {
  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  
  // Track middleware invocation for all routes
  apiTracker.trackMiddleware(pathname);
  
  // Create response
  const response = NextResponse.next();
  
  // Only track API routes for function invocations
  if (pathname.startsWith('/api/')) {
    // Add headers to track the request
    response.headers.set('x-call-start', startTime.toString());
    response.headers.set('x-tracked-endpoint', pathname);
    response.headers.set('x-tracked-method', method);
    
    // Check current limit status and add warning headers
    const limitStatus = apiTracker.checkLimits();
    response.headers.set('x-api-limit-status', limitStatus);
    
    if (limitStatus === 'critical') {
      response.headers.set('x-api-limit-warning', 'CRITICAL: API usage above 95%');
    } else if (limitStatus === 'warning') {
      response.headers.set('x-api-limit-warning', 'WARNING: API usage above 85%');
    }
    
    // Add tracking completion hook
    // Note: This runs when the response is being sent
    const originalResponse = response;
    
    // Override the response to capture completion
    const trackedResponse = new Response(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers
    });
    
    // Track the function call completion
    // This is an approximation since middleware runs before the API handler
    setTimeout(() => {
      const duration = Date.now() - startTime;
      const success = trackedResponse.status < 400;
      
      // Estimate memory usage based on endpoint complexity
      let memoryEstimate = 128; // Base memory
      if (pathname.includes('admin')) memoryEstimate = 256;
      if (pathname.includes('challenge') || pathname.includes('scores')) memoryEstimate = 192;
      
      // Estimate response size from headers
      let responseSize = 0;
      const contentLength = trackedResponse.headers.get('content-length');
      if (contentLength) {
        responseSize = parseInt(contentLength, 10);
      } else {
        // Estimate based on endpoint type
        if (pathname.includes('stats') || pathname.includes('admin')) responseSize = 2048;
        else if (pathname.includes('scores')) responseSize = 1024;
        else responseSize = 512;
      }
      
      apiTracker.trackInternal(
        pathname, 
        method, 
        duration, 
        success, 
        memoryEstimate, 
        responseSize
      );
    }, 0);
    
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

// Enhanced API wrapper for more accurate tracking
export function withAPITracking(handler, options = {}) {
  return async (req, res) => {
    const startTime = Date.now();
    const endpoint = req.url || req.nextUrl?.pathname || 'unknown';
    const method = req.method || 'GET';
    const memoryMB = options.memoryMB || 128;
    
    // Get original response methods to intercept size
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;
    
    let responseSize = 0;
    let responseData = null;
    
    // Override response methods to capture size
    res.json = function(data) {
      responseData = data;
      responseSize = JSON.stringify(data).length;
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      return originalSend.call(this, data);
    };
    
    res.end = function(data) {
      if (data && typeof data === 'string') {
        responseSize = data.length;
      }
      return originalEnd.call(this, data);
    };
    
    try {
      // Execute the original handler
      const result = await handler(req, res);
      
      // Track successful function call
      const duration = Date.now() - startTime;
      apiTracker.trackInternal(endpoint, method, duration, true, memoryMB, responseSize);
      
      return result;
    } catch (error) {
      // Track failed function call
      const duration = Date.now() - startTime;
      apiTracker.trackInternal(endpoint, method, duration, false, memoryMB, responseSize);
      
      throw error;
    }
  };
}

// Enhanced external API wrapper with better tracking
export function withExternalAPITracking(apiName) {
  return function(originalFetch) {
    return async function(url, options = {}) {
      const startTime = Date.now();
      const method = options.method || 'GET';
      const endpoint = typeof url === 'string' ? new URL(url).pathname : url.pathname;
      
      try {
        const response = await originalFetch(url, options);
        const duration = Date.now() - startTime;
        const success = response.ok;
        
        // Get response size
        let responseSize = 0;
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          responseSize = parseInt(contentLength, 10);
        }
        
        // Track the external API call
        apiTracker.trackExternal(apiName, endpoint, method, duration, success, responseSize);
        
        if (!success) {
          console.warn(`❌ External API ${apiName} failed: ${method} ${url} (${response.status})`);
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        apiTracker.trackExternal(apiName, endpoint, method, duration, false, 0);
        
        console.error(`🚨 External API ${apiName} error: ${method} ${url}`, error);
        throw error;
      }
    };
  };
}

// Utility to track edge functions (call this from your edge functions)
export function trackEdgeFunction(functionName, executionUnits = 1) {
  apiTracker.trackEdgeFunction(functionName, executionUnits);
}

// Utility to track image optimizations (call this when serving optimized images)
export function trackImageOptimization(originalSize, optimizedSize) {
  apiTracker.trackImageOptimization(originalSize, optimizedSize);
}