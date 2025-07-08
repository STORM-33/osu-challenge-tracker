import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';

async function handler(req, res) {
  return withAdminAuth(handleAdminPartners)(req, res);
}

async function handleAdminPartners(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGetAllPartners(req, res);
    case 'POST':
      return handleBulkOperations(req, res);
    case 'PUT':
      return handleReorderPartners(req, res);
    default:
      return handleAPIError(res, new Error('Method not allowed'), { status: 405 });
  }
}

async function handleGetAllPartners(req, res) {
  try {
    // Get all partners with admin view (including inactive)
    const { data: partners, error } = await supabaseAdmin
      .from('partners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Get stats
    const activeCount = partners?.filter(p => p.is_active).length || 0;
    const inactiveCount = partners?.filter(p => !p.is_active).length || 0;

    return handleAPIResponse(res, {
      partners: partners || [],
      stats: {
        total: partners?.length || 0,
        active: activeCount,
        inactive: inactiveCount
      }
    });

  } catch (error) {
    console.error('Admin get partners error:', error);
    return handleAPIError(res, error);
  }
}

async function handleBulkOperations(req, res) {
  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        operation: { required: true, type: 'string', enum: ['activate', 'deactivate', 'delete'] },
        partnerIds: { required: true, type: 'array' }
      }
    });

    const { operation, partnerIds } = req.body;

    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      throw new Error('No partner IDs provided');
    }

    // Validate all IDs are numbers
    if (!partnerIds.every(id => typeof id === 'number')) {
      throw new Error('Invalid partner ID format');
    }

    let result;

    switch (operation) {
      case 'activate':
        result = await supabaseAdmin
          .from('partners')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .in('id', partnerIds)
          .select();
        break;

      case 'deactivate':
        result = await supabaseAdmin
          .from('partners')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', partnerIds)
          .select();
        break;

      case 'delete':
        result = await supabaseAdmin
          .from('partners')
          .delete()
          .in('id', partnerIds)
          .select();
        break;

      default:
        throw new Error('Invalid operation');
    }

    if (result.error) {
      throw result.error;
    }

    console.log(`✅ Bulk ${operation} completed for ${result.data?.length || 0} partners`);

    return handleAPIResponse(res, {
      operation,
      affected: result.data?.length || 0,
      partners: result.data || [],
      message: `Successfully ${operation}d ${result.data?.length || 0} partners`
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return handleAPIError(res, error);
  }
}

async function handleReorderPartners(req, res) {
  try {
    validateRequest(req, {
      method: 'PUT',
      body: {
        partners: { required: true, type: 'array' }
      }
    });

    const { partners } = req.body;

    if (!Array.isArray(partners) || partners.length === 0) {
      throw new Error('No partners provided for reordering');
    }

    // Validate partner format
    const isValid = partners.every(p => 
      typeof p.id === 'number' && 
      typeof p.display_order === 'number'
    );

    if (!isValid) {
      throw new Error('Invalid partner format for reordering');
    }

    // Update all partners in a transaction-like manner
    const updates = await Promise.all(
      partners.map(partner => 
        supabaseAdmin
          .from('partners')
          .update({ 
            display_order: partner.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', partner.id)
          .select()
          .single()
      )
    );

    // Check for errors
    const errors = updates.filter(u => u.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} partners`);
    }

    console.log(`✅ Reordered ${partners.length} partners`);

    return handleAPIResponse(res, {
      updated: updates.map(u => u.data).filter(Boolean),
      message: 'Partners reordered successfully'
    });

  } catch (error) {
    console.error('Reorder partners error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;