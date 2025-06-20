import apiTracker, { trackedFetch } from './api-tracker';

class TrackedOsuAPI {
  constructor() {
    this.baseURL = 'https://osu.ppy.sh/api/v2';
    this.token = null;
  }

  // Get OAuth token (tracked)
  async getToken() {
    if (this.token && this.token.expires > Date.now()) {
      return this.token.access_token;
    }

    console.log('Authenticating with osu! API...');
    
    const response = await trackedFetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'public'
      })
    }, 'osu-auth');

    if (!response.ok) {
      throw new Error(`Failed to get osu! token: ${response.status}`);
    }

    const tokenData = await response.json();
    this.token = {
      access_token: tokenData.access_token,
      expires: Date.now() + (tokenData.expires_in * 1000) - 60000 // 1 min buffer
    };

    console.log('osu! API authentication successful');
    return this.token.access_token;
  }

  // Get user data (tracked)
  async getUser(userId) {
    const token = await this.getToken();
    
    console.log(`Making osu! API request: /api/v2/users/${userId}`);
    
    const response = await trackedFetch(`${this.baseURL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /users/${userId} (${response.status})`);
      throw new Error(`Failed to get user ${userId}: ${response.status}`);
    }

    console.log(`osu! API request successful: /users/${userId}`);
    return response.json();
  }

  // Get multiplayer room (tracked)
  async getRoom(roomId) {
    const token = await this.getToken();
    
    console.log(`Making osu! API request: /api/v2/rooms/${roomId}`);
    
    const response = await trackedFetch(`${this.baseURL}/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /rooms/${roomId} (${response.status})`);
      throw new Error(`Failed to get room ${roomId}: ${response.status}`);
    }

    console.log(`osu! API request successful: /rooms/${roomId}`);
    return response.json();
  }

  // Get room scores (tracked)
  async getRoomScores(roomId, playlistId, limit = 50, cursor = null) {
    const token = await this.getToken();
    
    let url = `${this.baseURL}/rooms/${roomId}/playlist/${playlistId}/scores?limit=${limit}&sort=score_desc`;
    if (cursor) {
      url += `&cursor_string=${cursor}`;
    }
    
    console.log(`Making osu! API request: /api/v2/rooms/${roomId}/playlist/${playlistId}/scores?limit=${limit}&sort=score_desc`);
    
    const response = await trackedFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /rooms/${roomId}/playlist/${playlistId}/scores (${response.status})`);
      throw new Error(`Failed to get scores for room ${roomId}, playlist ${playlistId}: ${response.status}`);
    }

    console.log(`osu! API request successful: /rooms/${roomId}/playlist/${playlistId}/scores`);
    return response.json();
  }

  // Get all scores for a playlist (handles pagination)
  async getAllRoomScores(roomId, playlistId) {
    console.log(`Fetching all scores for room ${roomId}, playlist ${playlistId}`);
    
    let allScores = [];
    let cursor = null;
    let apiCallCount = 0;
    
    do {
      const response = await this.getRoomScores(roomId, playlistId, 50, cursor);
      const scores = response.scores || [];
      
      allScores.push(...scores);
      cursor = response.cursor_string;
      apiCallCount++;
      
      console.log(`Fetched ${scores.length} scores (total: ${allScores.length})`);
      
      // Safety check to avoid infinite loops
      if (apiCallCount > 20) {
        console.warn('⚠️ Too many API calls, stopping pagination');
        break;
      }
      
    } while (cursor);
    
    console.log(`Finished fetching scores: ${allScores.length} total (${apiCallCount} API calls made)`);
    
    // Log current API usage
    const stats = apiTracker.getUsageStats();
    const percentage = stats.usage?.functions?.percentage || '0';
    console.log(`📊 After fetching ${allScores.length} scores: Usage at ${percentage}%`);
    
    return allScores;
  }

  // Get beatmap data (tracked)
  async getBeatmap(beatmapId) {
    const token = await this.getToken();
    
    console.log(`Making osu! API request: /api/v2/beatmaps/${beatmapId}`);
    
    const response = await trackedFetch(`${this.baseURL}/beatmaps/${beatmapId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /beatmaps/${beatmapId} (${response.status})`);
      throw new Error(`Failed to get beatmap ${beatmapId}: ${response.status}`);
    }

    console.log(`osu! API request successful: /beatmaps/${beatmapId}`);
    return response.json();
  }

  // Batch get users (tracked - but counts as multiple calls)
  async getUsers(userIds) {
    const users = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getUser(id).catch(err => {
        console.warn(`Failed to get user ${id}:`, err.message);
        return null;
      }));
      
      const batchResults = await Promise.all(batchPromises);
      users.push(...batchResults.filter(user => user !== null));
      
      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return users;
  }

  // Helper method to get current API usage stats
  getCurrentUsage() {
    const stats = apiTracker.getUsageStats();
    return {
      percentage: stats.usage?.functions?.percentage || '0',
      current: stats.usage?.functions?.current || 0,
      limit: stats.usage?.functions?.limit || 100000,
      external: stats.breakdown?.external?.total || 0
    };
  }

  // Log current usage with context
  logUsage(context = '') {
    const usage = this.getCurrentUsage();
    console.log(`📊 ${context} Usage at ${usage.percentage}% (${usage.current}/${usage.limit}) - External: ${usage.external}`);
  }
}

// Export singleton instance
export const trackedOsuAPI = new TrackedOsuAPI();