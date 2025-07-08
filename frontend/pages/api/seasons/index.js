import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';

async function handleGetSeasons(req, res) {
  try {
    const { data: seasons, error } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch seasons' 
      });
    }

    res.status(200).json({
      success: true,
      seasons: seasons || []
    });
  } catch (error) {
    console.error('Seasons fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function handleCreateSeason(req, res) {
  try {
    const { name, start_date, end_date, is_current = false } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Name, start_date, and end_date are required'
      });
    }

    // If this season is set as current, unset all other current seasons
    if (is_current) {
      const { error: updateError } = await supabaseAdmin
        .from('seasons')
        .update({ is_current: false })
        .eq('is_current', true);

      if (updateError) {
        console.error('Error updating current seasons:', updateError);
      }
    }

    const { data: season, error } = await supabaseAdmin
      .from('seasons')
      .insert({
        name,
        start_date,
        end_date,
        is_current,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating season:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create season' 
      });
    }

    res.status(201).json({
      success: true,
      season,
      message: 'Season created successfully'
    });
  } catch (error) {
    console.error('Season creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function handler(req, res) {
  if (req.method === 'GET') {
    // Public access for GET requests
    return handleGetSeasons(req, res);
  } else if (req.method === 'POST') {
    // Admin-only for POST requests
    return withAdminAuth(handleCreateSeason)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default handler;