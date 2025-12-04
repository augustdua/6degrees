import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { enrichPerson } from '../services/apolloService';

// Admin user ID for notifications
const ADMIN_USER_ID = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

/**
 * Request a warm intro for an Apollo-sourced offer
 * This triggers enrichment (paid) and notifies the admin
 */
export const requestIntro = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { offerId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!offerId) {
      res.status(400).json({ error: 'Offer ID is required' });
      return;
    }

    console.log(`🤝 Intro request from user ${userId} for offer ${offerId}`);

    // 1. Get the offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('Error fetching offer:', offerError);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check if it's an Apollo-sourced offer
    if (!offer.is_apollo_sourced || !offer.apollo_person_id) {
      res.status(400).json({ error: 'This offer does not support warm intro requests' });
      return;
    }

    // 2. Check if user already requested intro for this offer
    const { data: existingRequest } = await supabase
      .from('intro_requests')
      .select('id, status')
      .eq('offer_id', offerId)
      .eq('requester_id', userId)
      .single();

    if (existingRequest) {
      res.status(400).json({ 
        error: 'You have already requested an intro for this person',
        existingRequest 
      });
      return;
    }

    // 3. Create the intro request
    const { data: introRequest, error: createError } = await supabase
      .from('intro_requests')
      .insert({
        offer_id: offerId,
        requester_id: userId,
        apollo_person_id: offer.apollo_person_id,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating intro request:', createError);
      res.status(500).json({ error: 'Failed to create intro request' });
      return;
    }

    console.log(`✅ Created intro request ${introRequest.id}`);

    // 4. Enrich the person data from Apollo (PAID - costs credits)
    let enrichedData = null;
    try {
      console.log(`💰 Enriching Apollo person ${offer.apollo_person_id}...`);
      enrichedData = await enrichPerson(offer.apollo_person_id);
      
      if (enrichedData) {
        // Update the intro request with enriched data
        await supabase
          .from('intro_requests')
          .update({
            enriched_data: enrichedData,
            status: 'enriched',
            enriched_at: new Date().toISOString()
          })
          .eq('id', introRequest.id);

        // Also update the offer with enriched status
        await supabase
          .from('offers')
          .update({
            apollo_enriched: true,
            enriched_data: enrichedData
          })
          .eq('id', offerId);

        console.log(`✅ Enriched data saved for ${enrichedData.name}`);
      }
    } catch (enrichError: any) {
      console.error('Apollo enrichment failed:', enrichError);
      // Continue without enrichment - admin can manually look up
    }

    // 5. Get requester info for notification
    const { data: requester } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    // 6. Create notification for admin
    const notificationMessage = enrichedData
      ? `🤝 New Intro Request!\n\nFrom: ${requester?.first_name} ${requester?.last_name} (${requester?.email})\n\nTarget: ${enrichedData.name}\nTitle: ${enrichedData.title}\nCompany: ${enrichedData.organization?.name || 'Unknown'}\nEmail: ${enrichedData.email || 'Not available'}\nLinkedIn: ${enrichedData.linkedin_url || 'Not available'}`
      : `🤝 New Intro Request!\n\nFrom: ${requester?.first_name} ${requester?.last_name} (${requester?.email})\n\nTarget: ${offer.first_name} ${offer.last_name_obfuscated}\nTitle: ${offer.target_position}\nCompany: ${offer.target_organization}\n\n⚠️ Enrichment failed - manual lookup required`;

    // Insert notification for admin
    await supabase
      .from('notifications')
      .insert({
        user_id: ADMIN_USER_ID,
        type: 'intro_request',
        title: 'New Warm Intro Request',
        message: notificationMessage,
        metadata: {
          intro_request_id: introRequest.id,
          offer_id: offerId,
          requester_id: userId,
          target_name: enrichedData?.name || `${offer.first_name} ${offer.last_name_obfuscated}`,
          enriched: !!enrichedData
        }
      });

    console.log(`📧 Admin notification sent for intro request ${introRequest.id}`);

    res.json({
      success: true,
      message: 'Your warm intro request has been submitted! We will reach out to the target and get back to you.',
      introRequest: {
        id: introRequest.id,
        status: enrichedData ? 'enriched' : 'pending',
        targetName: enrichedData?.name || `${offer.first_name} ${offer.last_name_obfuscated}`,
        targetTitle: offer.target_position,
        targetCompany: offer.target_organization
      }
    });

  } catch (error: any) {
    console.error('Error in requestIntro:', error);
    res.status(500).json({ error: error.message || 'Failed to process intro request' });
  }
};

/**
 * Get user's intro requests
 */
export const getMyIntroRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: requests, error } = await supabase
      .from('intro_requests')
      .select(`
        *,
        offer:offers(
          id, title, target_organization, target_position, first_name, last_name_obfuscated
        )
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching intro requests:', error);
      res.status(500).json({ error: 'Failed to fetch intro requests' });
      return;
    }

    res.json({ requests: requests || [] });
  } catch (error: any) {
    console.error('Error in getMyIntroRequests:', error);
    res.status(500).json({ error: 'Failed to fetch intro requests' });
  }
};

/**
 * Admin: Get all pending intro requests
 */
export const getAllIntroRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Only admin can access this
    if (userId !== ADMIN_USER_ID) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { data: requests, error } = await supabase
      .from('intro_requests')
      .select(`
        *,
        offer:offers(
          id, title, target_organization, target_position, first_name, last_name_obfuscated, apollo_person_id
        ),
        requester:users!intro_requests_requester_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all intro requests:', error);
      res.status(500).json({ error: 'Failed to fetch intro requests' });
      return;
    }

    res.json({ requests: requests || [] });
  } catch (error: any) {
    console.error('Error in getAllIntroRequests:', error);
    res.status(500).json({ error: 'Failed to fetch intro requests' });
  }
};

/**
 * Admin: Update intro request status
 */
export const updateIntroRequestStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { status, admin_notes } = req.body;

    // Only admin can access this
    if (userId !== ADMIN_USER_ID) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const validStatuses = ['pending', 'enriched', 'contacted', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const updateData: any = {
      status,
      admin_notes
    };

    // Set timestamp based on status
    if (status === 'contacted') {
      updateData.contacted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('intro_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating intro request:', error);
      res.status(500).json({ error: 'Failed to update intro request' });
      return;
    }

    res.json({ success: true, request: updated });
  } catch (error: any) {
    console.error('Error in updateIntroRequestStatus:', error);
    res.status(500).json({ error: 'Failed to update intro request' });
  }
};





