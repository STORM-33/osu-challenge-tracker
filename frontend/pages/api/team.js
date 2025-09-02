// frontend/pages/api/team.js (rename from team/index.js)
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { withAdminAuth } from '../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../lib/memory-cache';
import { generateETag, checkETag } from '../../lib/api-utils';
import { invalidateAfterUpdate } from '../../lib/cache-invalidation';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetTeam(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreateTeamMember)(req, res);
  } else {
    return handleAPIError(res, new Error('Method not allowed'), { status: 405 });
  }
}

async function handleGetTeam(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        active_only: { type: 'string', enum: ['true', 'false'] }
      }
    });

    const { active_only = 'true' } = req.query;
    const cacheKey = createCacheKey('team_list', 'all', { active_only });

    // TRY MEMORY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log('🤖 Serving team from memory cache');
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 1800,
        enableETag: true 
      });
    }

    console.log(`📋 Fetching team list (active_only: ${active_only})`);

    let query = supabase
      .from('team_members')
      .select('*');

    // Apply filters
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    // Order by display_order, then by created_at
    query = query.order('display_order', { ascending: true })
                 .order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const responseData = {
      success: true,
      team: data || [],
      count: data?.length || 0
    };

    // Cache for 30 minutes
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.TEAM);

    console.log(`✅ Fetched ${data?.length || 0} team members`);

    return handleAPIResponse(res, responseData, { 
      cache: true, 
      cacheTime: 1800,
      enableETag: true 
    });

  } catch (error) {
    console.error('Get team error:', error);
    return handleAPIError(res, error);
  }
}

async function handleCreateTeamMember(req, res) {
  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        name: { required: true, type: 'string', maxLength: 255 },
        role: { required: true, type: 'string', maxLength: 255 },
        bio: { type: 'string', maxLength: 1000 },
        avatar_url: { type: 'string' },
        osu_username: { type: 'string', maxLength: 255 },
        osu_user_id: { type: 'number' },
        social_links: { type: 'object' },
        is_active: { type: 'boolean' },
        display_order: { type: 'number', min: 0 }
      }
    });

    const { 
      name, 
      role, 
      bio, 
      avatar_url, 
      osu_username, 
      osu_user_id,
      social_links = {},
      is_active = true, 
      display_order = 0 
    } = req.body;

    // Validate avatar URL if provided
    if (avatar_url) {
      try {
        new URL(avatar_url);
      } catch (urlError) {
        throw new Error('Invalid URL format for avatar_url');
      }
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      throw new Error('A team member with this name already exists');
    }

    // Create team member
    const { data: teamMember, error: createError } = await supabaseAdmin
      .from('team_members')
      .insert({
        name,
        role,
        bio: bio || null,
        avatar_url: avatar_url || null,
        osu_username: osu_username || null,
        osu_user_id: osu_user_id || null,
        social_links,
        is_active,
        display_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log(`✅ Created new team member: ${name} (ID: ${teamMember.id})`);

    // INVALIDATE TEAM CACHE AFTER CREATION
    invalidateAfterUpdate('team');

    return handleAPIResponse(res, {
      success: true,
      teamMember,
      message: 'Team member created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create team member error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;