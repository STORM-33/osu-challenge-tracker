// frontend/middleware.js
import { NextResponse } from 'next/server';
import apiTracker from './lib/api-tracker';

export function middleware(request) {
  // Only track API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const startTime = Date.now();
    const endpoint = request.nextUrl.pathname;
    const method = request.method;

    // Track the internal API call
    apiTracker.trackInternal(endpoint, method);

    // Clone the response to measure completion time
    const response = NextResponse.next();
    
    // Add headers for response tracking
    response.headers.set('x-call-start', startTime.toString());
    response.headers.set('x-tracked-endpoint', endpoint);
    response.headers.set('x-tracked-method', method);

    // Check if approaching Vercel limits
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      response.headers.set('x-api-limit-warning', 'critical');
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};