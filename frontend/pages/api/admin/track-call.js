import apiTracker from '../../../lib/api-tracker';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    const { 
      type, 
      endpoint, 
      method = 'GET', 
      duration = 0, 
      success = true, 
      responseSize = 0,
      apiName = 'internal',
      memoryMB = 128
    } = req.body;

    if (!type || !endpoint) {
      return res.status(400).json({
        success: false,
        error: { message: 'Type and endpoint are required' }
      });
    }

    let callCount = 0;

    if (type === 'internal') {
      callCount = await apiTracker.trackInternal(
        endpoint, 
        method, 
        duration, 
        success, 
        memoryMB, 
        responseSize
      );
    } else if (type === 'external') {
      callCount = await apiTracker.trackExternal(
        apiName, 
        endpoint, 
        method, 
        duration, 
        success, 
        responseSize
      );
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid tracking type' }
      });
    }

    return handleAPIResponse(res, { 
      tracked: true, 
      callCount,
      type,
      endpoint 
    }, { 
      cache: false 
    });

  } catch (error) {
    console.error('Track call error:', error);
    return handleAPIError(res, error);
  }
}