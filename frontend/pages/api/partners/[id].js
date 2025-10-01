import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';

async function handler(req, res) {
  const { id } = req.query;

  if (!id || isNaN(parseInt(id))) {
    return handleAPIError(res, new Error('Invalid partner ID'), { status: 400 });
  }

  switch (req.method) {
    case 'GET':
      return handleGetPartner(req, res, parseInt(id));
    case 'PUT':
      return withAdminAuth(handleUpdatePartner)(req, res, parseInt(id));
    case 'DELETE':
      return withAdminAuth(handleDeletePartner)(req, res, parseInt(id));
    default:
      return handleAPIError(res, new Error('Method not allowed'), { status: 405 });
  }
}

async function handleGetPartner(req, res, partnerId) {
  try {
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return handleAPIError(res, new Error('Partner not found'), { status: 404 });
      }
      throw error;
    }

    return handleAPIResponse(res, { partner }, {
      cache: true,
      cacheTime: 900,
      enableETag: true,
      req
    });

  } catch (error) {
    console.error('Get partner error:', error);
    return handleAPIError(res, error);
  }
}

async function handleUpdatePartner(req, res, partnerId) {
  try {
    validateRequest(req, {
      method: 'PUT',
      body: {
        name: { type: 'string', maxLength: 255 },
        icon_url: { type: 'string' },
        link_url: { type: 'string' },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' },
        display_order: { type: 'number', min: 0 }
      }
    });

    const updates = {};
    const allowedFields = ['name', 'icon_url', 'link_url', 'description', 'is_active', 'display_order'];
    
    // Only include fields that were provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
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

    if (updates.link_url) {
      try {
        new URL(updates.link_url);
      } catch {
        throw new Error('Invalid link_url format');
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

async function handleDeletePartner(req, res, partnerId) {
  try {
    // Check if partner exists
    const { data: existing } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partnerId)
      .single();

    if (!existing) {
      return handleAPIError(res, new Error('Partner not found'), { status: 404 });
    }

    // Delete partner
    const { error: deleteError } = await supabaseAdmin
      .from('partners')
      .delete()
      .eq('id', partnerId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Deleted partner ${partnerId} (${existing.name})`);

    return handleAPIResponse(res, {
      message: 'Partner deleted successfully',
      deleted: {
        id: partnerId,
        name: existing.name
      }
    });

  } catch (error) {
    console.error('Delete partner error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;