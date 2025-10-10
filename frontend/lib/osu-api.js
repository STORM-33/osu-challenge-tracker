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

  /**
   * Refresh a user's osu! token using their refresh token
   * @param {string} refreshToken - User's refresh token
   * @returns {Promise<Object>} { access_token, expires_in, refresh_token }
   */
  async refreshUserToken(refreshToken) {
    console.log('🔄 Refreshing user token...');
    
    const response = await trackedFetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: '*'
      })
    }, 'osu-user-token-refresh');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token refresh failed:', response.status, errorText);
      throw new Error(`Failed to refresh user token: ${response.status}`);
    }

    const tokenData = await response.json();
    console.log('✅ User token refreshed successfully');
    
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token
    };
  }

  /**
   * Create a multiplayer room using a user's access token
   * @param {Object} roomData - Room configuration object
   * @param {string} userAccessToken - User's access token (not client credentials)
   * @returns {Promise<Object>} Created room object
   */
  async createRoomWithUserToken(roomData, userAccessToken) {
    const startTime = Date.now();
    
    try {
      console.log('🎮 Creating multiplayer room with user token:', {
        name: roomData.name,
        type: roomData.type,
        playlist_items: roomData.playlist?.length || 0
      });
      
      const response = await trackedFetch(`${this.baseURL}/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'osu!'
        },
        body: JSON.stringify(roomData)
      }, 'osu-api-create-room');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Room creation failed:', response.status, errorText);
        throw new Error(`Failed to create room: ${response.status} - ${errorText}`);
      }

      const room = await response.json();
      const duration = Date.now() - startTime;
      
      console.log('✅ Room created successfully:', {
        room_id: room.id,
        name: room.name,
        duration: `${duration}ms`
      });
      
      return room;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ createRoomWithUserToken failed (${duration}ms):`, error.message);
      throw error;
    }
  }

  /**
   * Send chat messages to a multiplayer room
   * Temporarily adds the user to the room, sends messages, then removes them
   * @param {number} roomId - osu! room ID
   * @param {number} userId - osu! user ID (the bot user)
   * @param {string[]} messages - Array of message strings to send
   * @param {string} userAccessToken - User's access token
   */
  async sendChatToRoom(roomId, userId, messages, userAccessToken) {
    const startTime = Date.now();
    
    if (!messages || messages.length === 0) {
      console.log('ℹ️ No chat messages to send');
      return;
    }

    console.log(`💬 Sending ${messages.length} chat messages to room ${roomId}`);

    try {
      // Step 1: Put user in the room
      console.log(`Adding user ${userId} to room ${roomId}...`);
      const joinResponse = await trackedFetch(
        `${this.baseURL}/rooms/${roomId}/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'User-Agent': 'osu!'
          }
        },
        'osu-api-join-room'
      );

      if (!joinResponse.ok) {
        throw new Error(`Failed to join room: ${joinResponse.status}`);
      }

      const roomInfo = await joinResponse.json();
      const channelId = roomInfo.channel_id;

      if (!channelId) {
        throw new Error('Room has no channel_id');
      }

      console.log(`✅ User joined room, channel_id: ${channelId}`);

      // Step 2: Send messages (with retry logic)
      try {
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          console.log(`Sending message ${i + 1}/${messages.length}: "${message.substring(0, 50)}..."`);

          let sent = false;
          let lastError = null;

          // Retry up to 3 times per message
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const msgResponse = await trackedFetch(
                `${this.baseURL}/chat/channels/${channelId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${userAccessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'osu!'
                  },
                  body: JSON.stringify({
                    message: message,
                    is_action: false
                  })
                },
                'osu-api-send-message'
              );

              if (msgResponse.ok) {
                console.log(`✅ Message ${i + 1} sent successfully`);
                sent = true;
                break;
              } else {
                const errorText = await msgResponse.text();
                lastError = new Error(`HTTP ${msgResponse.status}: ${errorText}`);
                console.warn(`⚠️ Attempt ${attempt}/3 failed:`, lastError.message);
              }
            } catch (err) {
              lastError = err;
              console.warn(`⚠️ Attempt ${attempt}/3 failed:`, err.message);
            }

            // Wait before retry (exponential backoff)
            if (attempt < 3) {
              const delay = Math.pow(2, attempt) * 500; // 1s, 2s
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          if (!sent) {
            console.error(`❌ Failed to send message ${i + 1} after 3 attempts`);
            throw lastError || new Error('Failed to send message');
          }

          // Small delay between messages to avoid rate limiting
          if (i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        console.log('✅ All messages sent successfully');

      } finally {
        // Step 3: Remove user from room (always try this, even if sending failed)
        console.log(`3️⃣ Removing user ${userId} from room ${roomId}...`);
        
        let removed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const leaveResponse = await trackedFetch(
              `${this.baseURL}/rooms/${roomId}/users/${userId}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${userAccessToken}`,
                  'User-Agent': 'osu!'
                }
              },
              'osu-api-leave-room'
            );

            if (leaveResponse.ok || leaveResponse.status === 404) {
              console.log('✅ User removed from room');
              removed = true;
              break;
            } else {
              console.warn(`⚠️ Leave attempt ${attempt}/3 failed: ${leaveResponse.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ Leave attempt ${attempt}/3 failed:`, err.message);
          }

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (!removed) {
          console.error('⚠️ Failed to remove user from room after 3 attempts (non-critical)');
          // Don't throw - user being stuck in room is not critical
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Chat operations complete (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ sendChatToRoom failed (${duration}ms):`, error.message);
      throw error;
    }
  }

  /**
   * Helper: Get user info with user token (for verification)
   * @param {string} userAccessToken 
   * @returns {Promise<Object>} User object
   */
  async getUserWithToken(userAccessToken) {
    console.log('👤 Getting user info with provided token...');
    
    const response = await trackedFetch(`${this.baseURL}/me`, {
      headers: {
        'Authorization': `Bearer ${userAccessToken}`,
        'User-Agent': 'osu!'
      }
    }, 'osu-api-get-me');

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const user = await response.json();
    console.log('✅ User info retrieved:', {
      id: user.id,
      username: user.username
    });
    
    return user;
  }
}

// Export singleton instance
export const trackedOsuAPI = new TrackedOsuAPI();