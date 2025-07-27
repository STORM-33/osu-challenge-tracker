import { supabaseAdmin } from '../../../lib/supabase-admin';
import { seasonUtils } from '../../../lib/seasons';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../lib/memory-cache';
import { generateETag, checkETag } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheKey = createCacheKey('current_season', 'current');
    
    // TRY MEMORY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log('🎯 Serving current season from memory cache');
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 3600,
        enableETag: true,
        req // Pass req for ETag handling
      });
    }

    const { data: currentSeason, error } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching current season:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch current season' 
      });
    }

    // Check if current season has expired or doesn't exist
    const now = new Date();
    const shouldRotate = !currentSeason || (currentSeason && new Date(currentSeason.end_date) < now);

    let responseData;

    if (shouldRotate) {
      console.log(`🔄 Season rotation needed: ${currentSeason ? `${currentSeason.name} expired on ${currentSeason.end_date}` : 'No current season found'}`);
      
      // Mark any existing current season as not current
      if (currentSeason) {
        await supabaseAdmin
          .from('seasons')
          .update({ 
            is_current: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', currentSeason.id);
        
        console.log(`📅 Marked ${currentSeason.name} as inactive`);
      }
      
      // Use utility functions to get the season info and name
      const { year, half } = seasonUtils.getCurrentSeasonInfo(now);
      const dateRange = seasonUtils.getSeasonDateRange(year, half);
      
      // Generate the next season name using the utility function (pass admin instance)
      const seasonName = await seasonUtils.generateSeasonName(now, supabaseAdmin);
      
      // Check if this exact season already exists
      const { data: existingSeason } = await supabaseAdmin
        .from('seasons')
        .select('*')
        .eq('name', seasonName)
        .single();
      
      if (existingSeason) {
        // Season exists but isn't current - make it current
        const { data: updatedSeason, error: updateError } = await supabaseAdmin
          .from('seasons')
          .update({ 
            is_current: true, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingSeason.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating existing season to current:', updateError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to update existing season to current' 
          });
        }
        
        console.log(`✅ Reactivated existing season: ${seasonName}`);
        responseData = {
          season: updatedSeason,
          rotated: true,
          message: `Season rotated to existing ${seasonName}`
        };
        
      } else {
        // Create brand new season
        const { data: newSeason, error: createError } = await supabaseAdmin
          .from('seasons')
          .insert({
            name: seasonName,
            start_date: dateRange.start_date,
            end_date: dateRange.end_date,
            is_current: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating new season:', createError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create new season' 
          });
        }

        const seasonNumber = seasonUtils.getSeasonNumber(seasonName);
        console.log(`✅ Created new season: ${seasonName} (${dateRange.start_date} to ${dateRange.end_date})`);
        
        responseData = {
          season: newSeason,
          rotated: true,
          season_number: seasonNumber,
          message: `Season rotated to new ${seasonName}`,
        };
      }
    } else {
      // Current season is still valid - return it
      const seasonEnd = new Date(currentSeason.end_date);
      const daysUntilExpiry = Math.ceil((seasonEnd - now) / (1000 * 60 * 60 * 24));
      
      // Extract season number using utility function
      const seasonNumber = seasonUtils.getSeasonNumber(currentSeason.name);
      
      console.log(`✅ Current season ${currentSeason.name} is valid (${daysUntilExpiry} days remaining)`);
      
      responseData = {
        season: currentSeason,
        rotated: false,
        daysUntilExpiry,
        season_number: seasonNumber,
        message: `Current season ${currentSeason.name} is active`
      };
    }

    // Cache for 1 hour
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.SEASONS);

    return handleAPIResponse(res, responseData, { 
      cache: true, 
      cacheTime: 3600,
      enableETag: true,
      req // Pass req for ETag handling
    });

  } catch (error) {
    console.error('Current season API error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;