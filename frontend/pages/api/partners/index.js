import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../lib/memory-cache';
import { generateETag, checkETag } from '../../../lib/api-utils';
import { invalidateAfterUpdate } from '../../../lib/cache-invalidation';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetPartners(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreatePartner)(req, res);
  } else if (req.method === 'PUT') {
    return withAdminAuth(handleUpdatePartner)(req, res);
  } else {
    return handleAPIError(res, new Error('Method not allowed'), { status: 405 });
  }
}

async function handleGetPartners(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        active_only: { type: 'string', enum: ['true', 'false'] }
      }
    });

    const { active_only = 'true' } = req.query;
    const cacheKey = createCacheKey('partners_list', 'all', { active_only });

    // TRY MEMORY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log('🤝 Serving partners from memory cache');
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

    console.log(`📋 Fetching partners list (active_only: ${active_only})`);

    let query = supabase
      .from('partners')
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
      partners: data || [],
      count: data?.length || 0
    };

    // Cache for 30 minutes
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.PARTNERS);

    console.log(`✅ Fetched ${data?.length || 0} partners`);

    return handleAPIResponse(res, responseData, { 
      cache: true, 
      cacheTime: 1800,
      enableETag: true 
    });

  } catch (error) {
    console.error('Get partners error:', error);
    return handleAPIError(res, error);
  }
}

async function handleCreatePartner(req, res) {
  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        name: { required: true, type: 'string', maxLength: 255 },
        icon_url: { required: true, type: 'string' },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' },
        display_order: { type: 'number', min: 0 }
      }
    });

    const { name, icon_url, description, is_active = true, display_order = 0 } = req.body;

    // Validate URLs
    try {
      new URL(icon_url);
    } catch (urlError) {
      throw new Error('Invalid URL format for icon_url');
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('partners')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      throw new Error('A partner with this name already exists');
    }

    // Create partner
    const { data: partner, error: createError } = await supabaseAdmin
      .from('partners')
      .insert({
        name,
        icon_url,
        description: description || null,
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

    console.log(`✅ Created new partner: ${name} (ID: ${partner.id})`);

    // INVALIDATE PARTNERS CACHE AFTER CREATION
    invalidateAfterUpdate('partner');

    return handleAPIResponse(res, {
      partner,
      message: 'Partner created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create partner error:', error);
    return handleAPIError(res, error);
  }
}

async function handleUpdatePartner(req, res) {
  try {
    validateRequest(req, {
      method: 'PUT',
      body: {
        id: { required: true, type: 'number' },
        name: { type: 'string', maxLength: 255 },
        icon_url: { type: 'string' },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' },
        display_order: { type: 'number', min: 0 }
      }
    });

    const { id: partnerId, ...updateData } = req.body;

    const updates = {};
    const allowedFields = ['name', 'icon_url', 'description', 'is_active', 'display_order'];
    
    // Only include fields that were provided
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Validate URLs if provided
    if (updates.icon_url) {
      try {
        new URL(updates.icon_url);
      } catch {
        throw new Error('Invalid icon_url format');
      }
    }

    // Check if partner exists
    const { data: existing, error: checkError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partnerId)
      .single();

    if (checkError || !existing) {
      return handleAPIError(res, new Error('Partner not found'), { status: 404 });
    }

    // Check for duplicate name if updating name
    if (updates.name && updates.name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('partners')
        .select('id')
        .eq('name', updates.name)
        .neq('id', partnerId)
        .single();

      if (duplicate) {
        throw new Error('A partner with this name already exists');
      }
    }

    // Update partner
    updates.updated_at = new Date().toISOString();

    const { data: partner, error: updateError } = await supabaseAdmin
      .from('partners')
      .update(updates)
      .eq('id', partnerId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Updated partner ${partnerId}: ${Object.keys(updates).join(', ')}`);

    return handleAPIResponse(res, {
      partner,
      message: 'Partner updated successfully'
    });

  } catch (error) {
    console.error('Update partner error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;