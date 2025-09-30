import apiTracker, { trackedFetch } from './api-tracker';

class TrackedOsuAPI {
  constructor() {
    this.baseURL = 'https://osu.ppy.sh/api/v2';
    this.token = null;
    
    this.getToken = this.getToken.bind(this);
    this.getUser = this.getUser.bind(this);
    this.getRoom = this.getRoom.bind(this);
    this.getRoomScores = this.getRoomScores.bind(this);
    this.getAllRoomScores = this.getAllRoomScores.bind(this);
    this.getBeatmap = this.getBeatmap.bind(this);
    this.getUsers = this.getUsers.bind(this);
  }

  // Get OAuth token
  async getToken() {
    if (this.token && this.token.expires > Date.now()) {
      return this.token.access_token;
    }

    console.log('🔑 Authenticating with osu! API...');
    
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

    console.log('✅ osu! API authentication successful');
    return this.token.access_token;
  }

  // Get user data 
  async getUser(userId) {
    const token = await this.getToken();
    
    console.log(`📡 osu! API: GET /users/${userId}`);
    
    const response = await trackedFetch(`${this.baseURL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /users/${userId} (${response.status})`);
      throw new Error(`Failed to get user ${userId}: ${response.status}`);
    }

    console.log(`✅ osu! API: /users/${userId} success`);
    return response.json();
  }

  // Get multiplayer room 
  async getRoom(roomId) {
    const startTime = Date.now();
    
    try {
      const token = await this.getToken();
      
      console.log(`📡 osu! API: GET /rooms/${roomId}`);
      
      const response = await trackedFetch(`${this.baseURL}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, 'osu-api');

      if (!response.ok) {
        throw new Error(`Failed to get room ${roomId}: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      console.log(`✅ osu! API: /rooms/${roomId} success (${duration}ms)`);
      return data;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ osu! API: GET /rooms/${roomId} failed (${duration}ms):`, error.message);
      throw error;
    }
  }

  // Get room scores
  async getRoomScores(roomId, playlistId, limit = 50, cursor = null) {
    const token = await this.getToken();
    
    let url = `${this.baseURL}/rooms/${roomId}/playlist/${playlistId}/scores?limit=${limit}&sort=score_desc`;
    if (cursor) {
      url += `&cursor_string=${cursor}`;
    }
    
    console.log(`📡 osu! API: GET /rooms/${roomId}/playlist/${playlistId}/scores (limit=${limit})`);
    
    const response = await trackedFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /rooms/${roomId}/playlist/${playlistId}/scores (${response.status})`);
      throw new Error(`Failed to get scores for room ${roomId}, playlist ${playlistId}: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ osu! API: Fetched ${data.scores?.length || 0} scores`);
    
    return data;
  }

  // Get all scores for a playlist (handles pagination)
  async getAllRoomScores(roomId, playlistId) {
    const startTime = Date.now();
    
    let allScores = [];
    let cursor = null;
    let apiCallCount = 0;
    const maxPages = 20; // Safety limit
    
    try {
      console.log(`📊 Starting score fetch for room ${roomId}, playlist ${playlistId}`);
      
      do {
        try {
          const response = await this.getRoomScores(roomId, playlistId, 50, cursor);
          const scores = response.scores || [];
          
          allScores.push(...scores);
          cursor = response.cursor_string;
          apiCallCount++;
          
          console.log(`  Page ${apiCallCount}: +${scores.length} scores (total: ${allScores.length})`);
          
        } catch (pageError) {
          console.error(`❌ Failed to fetch scores page ${apiCallCount + 1}:`, pageError.message);
          break;
        }
        
        if (apiCallCount >= maxPages) {
          console.warn(`⚠️ Reached max pages (${maxPages}), stopping pagination`);
          break;
        }
        
      } while (cursor);

      const duration = Date.now() - startTime;
      console.log(`✅ Score fetch complete: ${allScores.length} scores, ${apiCallCount} API calls, ${duration}ms`);
      
      return allScores;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ getAllRoomScores failed for room ${roomId}, playlist ${playlistId} (${duration}ms):`, error.message);
      throw error;
    }
  }

  // Get beatmap data 
  async getBeatmap(beatmapId) {
    const token = await this.getToken();
    
    console.log(`📡 osu! API: GET /beatmaps/${beatmapId}`);
    
    const response = await trackedFetch(`${this.baseURL}/beatmaps/${beatmapId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      console.error(`❌ osu! API failed: GET /beatmaps/${beatmapId} (${response.status})`);
      throw new Error(`Failed to get beatmap ${beatmapId}: ${response.status}`);
    }

    console.log(`✅ osu! API: /beatmaps/${beatmapId} success`);
    return response.json();
  }

  // Batch get users
  async getUsers(userIds) {
    const startTime = Date.now();
    const users = [];
    
    console.log(`📊 Fetching ${userIds.length} users in batches...`);
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getUser(id).catch(err => {
        console.warn(`⚠️ Failed to get user ${id}:`, err.message);
        return null;
      }));
      
      const batchResults = await Promise.all(batchPromises);
      const validUsers = batchResults.filter(user => user !== null);
      users.push(...validUsers);
      
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${validUsers.length}/${batch.length} users fetched`);
      
      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ User fetch complete: ${users.length}/${userIds.length} users (${duration}ms)`);
    
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
    console.log(`📊 ${context ? context + ' - ' : ''}API Usage: ${usage.percentage}% (${usage.current}/${usage.limit}), External: ${usage.external}`);
  }
}

// Export singleton instance
export const trackedOsuAPI = new TrackedOsuAPI();