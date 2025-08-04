import { withAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { settingsQueries, donationQueries } from '../../../lib/supabase';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

async function handler(req, res) {
  const { user } = req;

  if (req.method === 'GET') {
    try {
      // Get user settings
      const settings = await settingsQueries.getUserSettings(user.id);
      
      // Get user's total donations for donor perks
      const totalDonations = await donationQueries.getUserDonationTotal(user.id);
      
      // Get available backgrounds based on donation total (updated function)
      const availableBackgrounds = await settingsQueries.getAvailableBackgrounds(user.id, totalDonations);
      
      return handleAPIResponse(res, {
        settings,
        donorStatus: {
          totalDonations,
          isDonor: totalDonations > 0,
          // Updated tier calculation: supporter at any amount, premium at $10+
          tier: totalDonations >= 10 ? 'premium' : totalDonations >= 0.01 ? 'supporter' : null
        },
        availableBackgrounds
      }, {
        cache: true,
        cacheTime: 300, // 5 minutes
        enableETag: true,
        req
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return handleAPIError(res, error);
    }
  }

  if (req.method === 'PUT') {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid settings data' }
        });
      }

      // Validate settings
      const validatedSettings = validateSettings(settings);
      
      // Check background access if specified (updated field name)
      if (validatedSettings.background_id) {
        const totalDonations = await donationQueries.getUserDonationTotal(user.id);
        const background = await settingsQueries.getBackground(validatedSettings.background_id);
        
        if (!background) {
          return res.status(404).json({
            success: false,
            error: { message: 'Background not found' }
          });
        }

        // Check access based on background category and user donation total
        if (background.category === 'donor' && totalDonations < background.min_donation_total) {
          return res.status(403).json({
            success: false,
            error: { message: 'Insufficient donations for this background' }
          });
        }

        if (background.category === 'premium' && totalDonations < background.min_donation_total) {
          return res.status(403).json({
            success: false,
            error: { message: 'Premium tier required for this background' }
          });
        }

        // Public backgrounds are always accessible
      }
      
      // Update settings
      const updatedSettings = await settingsQueries.updateUserSettings(user.id, validatedSettings);
      
      return handleAPIResponse(res, {
        settings: updatedSettings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return handleAPIError(res, error);
    }
  }

  return res.status(405).json({
    success: false,
    error: { message: 'Method not allowed' }
  });
}

function validateSettings(settings) {
  const validated = {};
  
  // Appearance settings
  if (typeof settings.background_enabled === 'boolean') {
    validated.background_enabled = settings.background_enabled;
  }
  
  if (settings.background_type === 'solid' || settings.background_type === 'gradient') {
    validated.background_type = settings.background_type;
  }
  
  if (settings.background_color && /^#[0-9A-F]{6}$/i.test(settings.background_color)) {
    validated.background_color = settings.background_color;
  }
  
  if (settings.background_gradient_end && /^#[0-9A-F]{6}$/i.test(settings.background_gradient_end)) {
    validated.background_gradient_end = settings.background_gradient_end;
  }
  
  if (typeof settings.background_blur === 'number') {
    validated.background_blur = Math.max(0, Math.min(70, settings.background_blur));
  }
  
  if (typeof settings.background_dimming === 'number') {
    validated.background_dimming = Math.max(20, Math.min(70, settings.background_dimming));
  }
  
  if (typeof settings.background_saturation === 'number') {
    validated.background_saturation = Math.max(-15, Math.min(15, settings.background_saturation));
  }
  
  // Privacy
  if (settings.profile_visibility === 'public' || settings.profile_visibility === 'private') {
    validated.profile_visibility = settings.profile_visibility;
  }
  
  // Background selection (updated field name)
  if (typeof settings.background_id === 'number' || settings.background_id === null) {
    validated.background_id = settings.background_id;
  }
  
  // Legacy field support (for backward compatibility during transition)
  if (typeof settings.donor_background_id === 'number' || settings.donor_background_id === null) {
    validated.background_id = settings.donor_background_id;
  }
  
  if (settings.donor_effects && typeof settings.donor_effects === 'object') {
    validated.donor_effects = settings.donor_effects;
  }
  
  return validated;
}

export default withAuth(handler);