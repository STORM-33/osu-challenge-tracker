import { withAPITracking } from '../../../middleware';
import { supabaseAdmin } from '../../../lib/supabase-admin';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // If no current season, create a default one based on current date
    if (!currentSeason) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      // Determine if we're in Spring (Jan-Jun) or Fall (Jul-Dec)
      const half = month <= 6 ? 1 : 2;
      const seasonName = half === 1 ? `Spring ${year}` : `Fall ${year}`;
      
      let startDate, endDate;
      if (half === 1) {
        // Spring: January 1 - June 30
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 5, 30, 23, 59, 59);
      } else {
        // Fall: July 1 - December 31
        startDate = new Date(year, 6, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }
      
      const { data: newSeason, error: createError } = await supabaseAdmin
        .from('seasons')
        .insert({
          name: seasonName,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default season:', createError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create default season' 
        });
      }

      return res.status(200).json({
        success: true,
        season: newSeason
      });
    }

    res.status(200).json({
      success: true,
      season: currentSeason
    });
  } catch (error) {
    console.error('Current season fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default withAPITracking(handler, { memoryMB: 192 });