// Quick diagnostic to test if background sync uses optimized handler

import syncManager from '../../../lib/sync-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, testType = 'background' } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }

  console.log(`🔍 Testing sync path for room ${roomId}, type: ${testType}`);

  try {
    if (testType === 'direct') {
      // Test direct API call
      console.log('📞 Testing direct API call...');
      const directStart = performance.now();
      
      const response = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/update-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: parseInt(roomId) })
      });
      
      const directTime = performance.now() - directStart;
      const directResult = await response.json();
      
      return res.status(200).json({
        success: true,
        testType: 'direct',
        result: {
          timeMs: Math.round(directTime),
          status: response.status,
          success: directResult.success,
          performance: directResult.performance || null,
          requestId: directResult.requestId
        }
      });
      
    } else if (testType === 'background') {
      // Test background sync path
      console.log('🔄 Testing background sync path...');
      const backgroundStart = performance.now();
      
      // Force a background sync
      const queueResult = await syncManager.queueSync('challenge', roomId.toString(), { 
        priority: 10,
        force: true 
      });
      
      if (!queueResult.success) {
        return res.status(200).json({
          success: false,
          testType: 'background',
          error: 'Failed to queue background sync',
          reason: queueResult.reason
        });
      }
      
      // Wait for sync to complete or timeout
      const maxWaitTime = 60000; // 60 seconds max
      const checkInterval = 1000; // Check every 1 second
      let waitTime = 0;
      let syncCompleted = false;
      let syncResult = null;
      
      while (waitTime < maxWaitTime && !syncCompleted) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        const syncStatus = syncManager.getSyncStatus('challenge', roomId.toString());
        
        if (!syncStatus.inProgress) {
          syncCompleted = true;
          const backgroundTime = performance.now() - backgroundStart;
          
          // Try to get result from sync manager if available
          const job = syncManager.activeJobs.get(queueResult.jobId);
          if (job) {
            syncResult = job.result || null;
          }
          
          return res.status(200).json({
            success: true,
            testType: 'background',
            result: {
              timeMs: Math.round(backgroundTime),
              waitTimeMs: waitTime,
              syncCompleted: true,
              jobId: queueResult.jobId,
              syncResult: syncResult
            }
          });
        }
      }
      
      // Timeout case
      const backgroundTime = performance.now() - backgroundStart;
      return res.status(200).json({
        success: false,
        testType: 'background',
        error: 'Background sync timed out',
        result: {
          timeMs: Math.round(backgroundTime),
          waitTimeMs: waitTime,
          syncCompleted: false,
          jobId: queueResult.jobId,
          timeout: true
        }
      });
      
    } else if (testType === 'compare') {
      // Test both paths and compare
      console.log('⚖️ Comparing direct vs background sync...');
      
      // Direct call first
      console.log('📞 Testing direct call...');
      const directStart = performance.now();
      
      const directResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/update-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: parseInt(roomId) })
      });
      
      const directTime = performance.now() - directStart;
      const directResult = await directResponse.json();
      
      // Wait a bit before background test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Background sync test  
      console.log('🔄 Testing background sync...');
      const backgroundStart = performance.now();
      
      const queueResult = await syncManager.queueSync('challenge', roomId.toString(), { 
        priority: 10,
        force: true 
      });
      
      if (!queueResult.success) {
        return res.status(200).json({
          success: true,
          testType: 'compare',
          direct: {
            timeMs: Math.round(directTime),
            success: directResult.success,
            performance: directResult.performance
          },
          background: {
            error: 'Failed to queue',
            reason: queueResult.reason
          }
        });
      }
      
      // Wait for background sync
      const maxWaitTime = 60000;
      const checkInterval = 1000;
      let waitTime = 0;
      let backgroundCompleted = false;
      
      while (waitTime < maxWaitTime && !backgroundCompleted) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        const syncStatus = syncManager.getSyncStatus('challenge', roomId.toString());
        
        if (!syncStatus.inProgress) {
          backgroundCompleted = true;
          const backgroundTime = performance.now() - backgroundStart;
          
          return res.status(200).json({
            success: true,
            testType: 'compare',
            direct: {
              timeMs: Math.round(directTime),
              success: directResult.success,
              performance: directResult.performance || null
            },
            background: {
              timeMs: Math.round(backgroundTime),
              waitTimeMs: waitTime,
              completed: true,
              jobId: queueResult.jobId
            },
            comparison: {
              directFaster: directTime < backgroundTime,
              timeDifferenceMs: Math.round(Math.abs(backgroundTime - directTime)),
              speedRatio: Math.round(backgroundTime / directTime * 100) / 100
            }
          });
        }
      }
      
      // Background sync timed out
      const backgroundTime = performance.now() - backgroundStart;
      return res.status(200).json({
        success: true,
        testType: 'compare',
        direct: {
          timeMs: Math.round(directTime),
          success: directResult.success,
          performance: directResult.performance || null
        },
        background: {
          timeMs: Math.round(backgroundTime),
          waitTimeMs: waitTime,
          completed: false,
          timeout: true,
          jobId: queueResult.jobId
        },
        comparison: {
          backgroundTimeout: true,
          directTime: Math.round(directTime),
          backgroundMinTime: Math.round(backgroundTime)
        }
      });
      
    } else {
      return res.status(400).json({
        error: 'Invalid test type',
        validTypes: ['direct', 'background', 'compare']
      });
    }

  } catch (error) {
    console.error('Sync path diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      testType
    });
  }
}

// USAGE:
/*
1. Add this file as /pages/api/debug/sync-path.js

2. Test direct API call:
   POST /api/debug/sync-path
   { "roomId": "1454583", "testType": "direct" }

3. Test background sync:
   POST /api/debug/sync-path  
   { "roomId": "1454583", "testType": "background" }

4. Compare both:
   POST /api/debug/sync-path
   { "roomId": "1454583", "testType": "compare" }

This will show you:
- If background sync is using the optimized handler
- Exact timing differences between direct and background
- Whether the issue is in sync manager overhead or the handler itself

Expected results:
- Direct: 6-10 seconds (your optimized handler)
- Background: Should be similar if using same handler
- If background is 20+ seconds, the old handler is being used
*/