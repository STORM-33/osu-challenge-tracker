import { withAPITracking } from '../../../middleware';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetPartners(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreatePartner)(req, res);
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

    console.log(`✅ Fetched ${data?.length || 0} partners`);

    return handleAPIResponse(res, {
      partners: data || [],
      count: data?.length || 0
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
        link_url: { required: true, type: 'string' },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' },
        display_order: { type: 'number', min: 0 }
      }
    });

    const { name, icon_url, link_url, description, is_active = true, display_order = 0 } = req.body;

    // Validate URLs
    try {
      new URL(icon_url);
      new URL(link_url);
    } catch (urlError) {
      throw new Error('Invalid URL format for icon_url or link_url');
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
        link_url,
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

    return handleAPIResponse(res, {
      partner,
      message: 'Partner created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create partner error:', error);
    return handleAPIError(res, error);
  }
}

export default withAPITracking(handler);