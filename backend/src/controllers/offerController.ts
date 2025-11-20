import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Helper function to validate user can only create offers for their connections
const validateConnection = async (userId: string, connectionUserId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_connections')
      .select('id')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${connectionUserId}),and(user1_id.eq.${connectionUserId},user2_id.eq.${userId})`)
      .eq('status', 'connected')
      .maybeSingle();

    if (error) {
      console.error('Error validating connection:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in validateConnection:', error);
    return false;
  }
};

// Helper function to send offer approval request message
const sendOfferApprovalMessage = async (
  creatorId: string, 
  targetId: string, 
  offerId: string, 
  offerTitle: string,
  targetUser: any
): Promise<void> => {
  try {
    // Get creator details
    const { data: creator } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', creatorId)
      .single();

    const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';
    const targetName = targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'you';

    // Create a special message for offer approval
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: creatorId,
        receiver_id: targetId,
        content: `🤝 ${creatorName} wants to create an offer to introduce people to you!\n\n📋 Offer: "${offerTitle}"\n\nThey would like to offer connections to you for networking opportunities. You can review and approve or decline this offer.`,
        message_type: 'offer_approval_request',
        metadata: {
          offer_id: offerId,
          offer_title: offerTitle,
          action_required: true,
          actions: ['approve', 'reject']
        }
      });

    if (messageError) {
      console.error('Error sending offer approval message:', messageError);
      throw messageError;
    }

    // Create notification for target
    await supabase
      .from('notifications')
      .insert({
        user_id: targetId,
        type: 'offer_approval_request',
        title: 'Offer Approval Request',
        message: `${creatorName} wants to create an introduction offer featuring you`,
        data: {
          offer_id: offerId,
          creator_id: creatorId,
          offer_title: offerTitle
        }
      });

  } catch (error) {
    console.error('Error in sendOfferApprovalMessage:', error);
    throw error;
  }
};

export const createOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      connectionUserId, 
      price,
      currency,
      asking_price_inr,
      asking_price_eur,
      targetOrganization,
      targetPosition,
      targetLogoUrl,
      relationshipType,
      relationshipDescription,
      offerPhotoUrl,
      additionalOrgLogos
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!title || !description || !connectionUserId || !price) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (price <= 0) {
      res.status(400).json({ error: 'Price must be greater than 0' });
      return;
    }

    // Validate that the user is connected to the person they're offering
    const isConnected = await validateConnection(userId, connectionUserId);
    if (!isConnected) {
      res.status(403).json({ 
        error: 'You can only create offers for your direct connections' 
      });
      return;
    }

    // Determine currency and prices
    const offerCurrency = currency || 'INR';
    let priceInr = asking_price_inr || price;
    let priceEur = asking_price_eur;

    // Convert if only one price is provided
    if (offerCurrency === 'EUR' && !priceEur) {
      priceEur = price;
      priceInr = Math.round(price * 90); // EUR to INR conversion
    } else if (offerCurrency === 'INR' && !priceInr) {
      priceInr = price;
    }

    // Calculate the other currency if not provided
    if (!priceEur) {
      priceEur = Math.round((priceInr / 90) * 100) / 100; // INR to EUR
    }
    if (!priceInr) {
      priceInr = Math.round(priceEur * 90); // EUR to INR
    }

    // Generate AI use cases based on target profile (using separate service, not the app AI assistant)
    let useCases: string[] = [];
    try {
      const { generateOfferUseCases } = await import('../services/offerAIService');
      useCases = await generateOfferUseCases({
        position: targetPosition,
        organization: targetOrganization,
        description: description,
        title: title,
        relationshipDescription: relationshipDescription,
      });
    } catch (error) {
      console.error('Error generating use cases (continuing without them):', error);
      // Continue without use cases if generation fails
    }

    // Auto-tag the offer using AI
    let tags: string[] = [];
    try {
      const { autoTagContent } = await import('../services/taggingService');
      tags = await autoTagContent(title, description);
      console.log(`Auto-tagged offer with ${tags.length} tags:`, tags);
    } catch (error) {
      console.error('Error auto-tagging offer (continuing without tags):', error);
      // Continue without tags if auto-tagging fails
    }

    // Create the offer with pending_approval status
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        offer_creator_id: userId,
        connection_user_id: connectionUserId,
        title,
        description,
        asking_price_inr: priceInr,
        asking_price_eur: priceEur,
        currency: offerCurrency,
        status: 'pending_approval',
        approved_by_target: false,
        offer_photo_url: offerPhotoUrl || null,
        target_organization: targetOrganization,
        target_position: targetPosition,
        target_logo_url: targetLogoUrl,
        relationship_type: relationshipType,
        relationship_description: relationshipDescription,
        tags: JSON.stringify(tags),
        additional_org_logos: additionalOrgLogos || [],
        use_cases: useCases.length > 0 ? useCases : null
      })
      .select()
      .single();

    if (offerError) {
      console.error('Error creating offer:', offerError);
      res.status(500).json({ error: 'Failed to create offer' });
      return;
    }

    // Get connection user details for offer_connections
    const { data: connectionUser } = await supabase
      .from('users')
      .select('first_name, last_name, company, role')
      .eq('id', connectionUserId)
      .single();

    // Create the offer_connection record
    const { data: offerConnection, error: connectionError } = await supabase
      .from('offer_connections')
      .insert({
        offer_id: offer.id,
        connected_user_id: connectionUserId,
        full_name: connectionUser ? `${connectionUser.first_name} ${connectionUser.last_name}` : 'Connection',
        role_title: targetPosition || connectionUser?.role || '',
        company: targetOrganization || connectionUser?.company || '',
        public_role: targetPosition || 'Connection',
        public_company: targetOrganization || 'Company'
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Error creating offer connection:', connectionError);
      // Rollback offer creation
      await supabase.from('offers').delete().eq('id', offer.id);
      res.status(500).json({ error: 'Failed to create offer connection' });
      return;
    }

    // Send approval request message to target connection
    try {
      await sendOfferApprovalMessage(userId, connectionUserId, offer.id, title, connectionUser);
    } catch (msgError) {
      console.error('Error sending approval message:', msgError);
      // Don't fail the offer creation if message fails
    }

    // Fetch complete offer data with relations
    const { data: completeOffer, error: fetchError } = await supabase
      .from('offers')
      .select(`
        *,
        creator:users!offer_creator_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        connection:users!connection_user_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        )
      `)
      .eq('id', offer.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete offer:', fetchError);
      res.status(201).json(offer);
      return;
    }

    res.status(201).json(completeOffer);
  } catch (error) {
    console.error('Error in createOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 offerController: getOffers called');
    console.log('📊 offerController: Request query params:', req.query);
    
    const { 
      limit = 20, 
      offset = 0, 
      status = 'active',
      tags,
      include_demo = 'true'
    } = req.query;
    console.log('🔧 offerController: Parsed params:', { limit, offset, status, tags, include_demo });

    console.log('🚀 offerController: Making Supabase query...');
    let query = supabase
      .from('offers')
      .select(`
        *,
        creator:users!offer_creator_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        connection:users!connection_user_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        )
      `)
      .eq('status', status)
      .eq('approved_by_target', true);  // Only show target-approved offers
    
    // Filter by demo data inclusion
    if (include_demo === 'false') {
      // Show only real offers (is_demo = false OR is_demo IS NULL for legacy offers)
      query = query.or('is_demo.eq.false,is_demo.is.null');
    }
    // If include_demo is 'true' or undefined, show all offers (both demo and real)
    
    // Apply tag filtering if tags are provided
    if (tags && typeof tags === 'string' && tags.trim() !== '') {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagArray.length > 0) {
        console.log('🏷️ offerController: Filtering by tags:', tagArray);
        // Use PostgREST's overlap operator (ov) to check if tags JSONB array has any common elements
        // For JSONB arrays, use JSON format: ["tag1","tag2","tag3"]
        const jsonArrayString = JSON.stringify(tagArray);
        console.log('🏷️ offerController: Tag filter (JSON array):', jsonArrayString);
        query = query.filter('tags', 'ov', jsonArrayString);
      }
    }
    // When no tags filter is applied, all offers (including those without tags) will be returned
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    console.log('📊 offerController: Supabase response:', { 
      dataLength: data?.length || 0, 
      error: error?.message || 'none',
      hasData: !!data 
    });

    if (error) {
      console.error('❌ offerController: Supabase error:', error);
      res.status(500).json({ error: 'Failed to fetch offers' });
      return;
    }

    console.log('✅ offerController: Raw offers data:', data);

    // Get likes and bids count for each offer
    console.log('🔢 offerController: Getting likes and bids counts...');
    const offersWithCounts = await Promise.all(
      data.map(async (offer) => {
        console.log(`🔍 offerController: Getting counts for offer ${offer.id}`);
        const [likesResult, bidsResult] = await Promise.all([
          supabase
            .from('offer_likes')
            .select('id', { count: 'exact' })
            .eq('offer_id', offer.id),
          supabase
            .from('offer_bids')
            .select('id', { count: 'exact' })
            .eq('offer_id', offer.id)
        ]);

        const result = {
          ...offer,
          likes_count: likesResult.count || 0,
          bids_count: bidsResult.count || 0
        };
        
        console.log(`✅ offerController: Offer ${offer.id} counts:`, {
          likes: result.likes_count,
          bids: result.bids_count
        });
        
        return result;
      })
    );

    console.log('🎉 offerController: Final offers with counts:', offersWithCounts);
    console.log('📤 offerController: Sending response with', offersWithCounts.length, 'offers');
    res.json(offersWithCounts);
  } catch (error) {
    console.error('❌ offerController: Error in getOffers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOfferById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        creator:users!offer_creator_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        connection:users!connection_user_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        ),
        likes_count:offer_likes(count),
        bids_count:offer_bids(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getOfferById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyOffers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        creator:users!offer_creator_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        connection:users!connection_user_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        )
      `)
      .eq('offer_creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user offers:', error);
      res.status(500).json({ error: 'Failed to fetch your offers' });
      return;
    }

    // Get counts for each offer
    const offersWithCounts = await Promise.all(
      data.map(async (offer) => {
        const [likesResult, bidsResult] = await Promise.all([
          supabase
            .from('offer_likes')
            .select('id', { count: 'exact' })
            .eq('offer_id', offer.id),
          supabase
            .from('offer_bids')
            .select('id', { count: 'exact' })
            .eq('offer_id', offer.id)
        ]);

        return {
          ...offer,
          likes_count: likesResult.count || 0,
          bids_count: bidsResult.count || 0
        };
      })
    );

    res.json(offersWithCounts);
  } catch (error) {
    console.error('Error in getMyOffers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      asking_price_inr,
      asking_price_eur,
      currency,
      targetOrganization,
      targetPosition,
      targetLogoUrl,
      relationshipType,
      relationshipDescription,
      offerPhotoUrl,
      additionalOrgLogos
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user owns the offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('offer_creator_id, currency, asking_price_inr, asking_price_eur')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to update this offer' });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    // Handle currency updates
    if (currency !== undefined) updateData.currency = currency;
    
    // Handle price updates with conversion
    if (asking_price_inr !== undefined) {
      updateData.asking_price_inr = asking_price_inr;
      // Auto-convert to EUR if EUR price not explicitly provided
      if (asking_price_eur === undefined) {
        updateData.asking_price_eur = Math.round((asking_price_inr / 90) * 100) / 100;
      }
    }
    
    if (asking_price_eur !== undefined) {
      updateData.asking_price_eur = asking_price_eur;
      // Auto-convert to INR if INR price not explicitly provided
      if (asking_price_inr === undefined) {
        updateData.asking_price_inr = Math.round(asking_price_eur * 90);
      }
    }
    
    if (targetOrganization !== undefined) updateData.target_organization = targetOrganization || null;
    if (targetPosition !== undefined) updateData.target_position = targetPosition || null;
    if (targetLogoUrl !== undefined) updateData.target_logo_url = targetLogoUrl || null;
    if (relationshipType !== undefined) updateData.relationship_type = relationshipType || null;
    if (relationshipDescription !== undefined) updateData.relationship_description = relationshipDescription || null;
    if (offerPhotoUrl !== undefined) updateData.offer_photo_url = offerPhotoUrl || null;
    if (additionalOrgLogos !== undefined) updateData.additional_org_logos = additionalOrgLogos || [];

    const { data, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users!offer_creator_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        connection:users!connection_user_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error updating offer:', error);
      console.error('Update data:', updateData);
      res.status(500).json({ 
        error: 'Failed to update offer',
        details: error.message,
        code: error.code 
      });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in updateOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Regenerate use cases for an offer (when editing)
export const regenerateUseCases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { position, organization, description, title, relationshipDescription } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verify user owns the offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('offer_creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to update this offer' });
      return;
    }

    // Generate new use cases
    let useCases: string[] = [];
    try {
      const { generateOfferUseCases } = await import('../services/offerAIService');
      useCases = await generateOfferUseCases({
        position,
        organization,
        description,
        title,
        relationshipDescription,
      });
    } catch (error) {
      console.error('Error generating use cases:', error);
      res.status(500).json({ error: 'Failed to generate use cases' });
      return;
    }

    // Update offer with new use cases
    const { error: updateError } = await supabase
      .from('offers')
      .update({ use_cases: useCases })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating use cases:', updateError);
      res.status(500).json({ error: 'Failed to update use cases' });
      return;
    }

    res.json({ use_cases: useCases });
  } catch (error) {
    console.error('Error in regenerateUseCases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user owns the offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('offer_creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this offer' });
      return;
    }

    const { error } = await supabase
      .from('offers')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({ error: 'Failed to delete offer' });
      return;
    }

    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error in deleteOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user already liked this offer
    const { data: existingLike } = await supabase
      .from('offer_likes')
      .select('id')
      .eq('offer_id', id)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('offer_likes')
        .delete()
        .eq('offer_id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing like:', error);
        res.status(500).json({ error: 'Failed to remove like' });
        return;
      }

      res.json({ liked: false, message: 'Like removed' });
    } else {
      // Like
      const { error } = await supabase
        .from('offer_likes')
        .insert({
          offer_id: id,
          user_id: userId
        });

      if (error) {
        console.error('Error adding like:', error);
        res.status(500).json({ error: 'Failed to add like' });
        return;
      }

      res.json({ liked: true, message: 'Offer liked' });
    }
  } catch (error) {
    console.error('Error in likeOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bidOnOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, bidAmount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!bidAmount) {
      res.status(400).json({ error: 'Bid amount is required' });
      return;
    }

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('offer_creator_id, title')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Create offer bid
    const { data, error } = await supabase
      .from('offer_bids')
      .insert({
        offer_id: id,
        buyer_id: userId,
        offer_creator_id: offer.offer_creator_id,
        bid_amount_inr: bidAmount,
        status: 'pending'
      })
      .select(`
        *,
        buyer:users!buyer_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        )
      `)
      .single();

    if (error) {
      console.error('Error creating bid:', error);
      res.status(500).json({ error: 'Failed to submit bid' });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in bidOnOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOfferBids = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user is the offer creator
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('offer_creator_id')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to view bids on this offer' });
      return;
    }

    // Get all bids for this offer
    const { data, error } = await supabase
      .from('offer_bids')
      .select(`
        *,
        buyer:users!buyer_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          company,
          role
        )
      `)
      .eq('offer_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching offer bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getOfferBids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptOfferBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { offerId, bidId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user owns the offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('offer_creator_id')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to accept bids on this offer' });
      return;
    }

    // Update bid status to accepted
    const { data, error } = await supabase
      .from('offer_bids')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', bidId)
      .eq('offer_id', offerId)
      .select(`
        *,
        buyer:users!buyer_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        )
      `)
      .single();

    if (error) {
      console.error('Error accepting bid:', error);
      res.status(500).json({ error: 'Failed to accept bid' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in acceptOfferBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyIntros = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get intros where user is either the buyer or the offer creator
    const { data, error } = await supabase
      .from('intros')
      .select(`
        *,
        offer:offers!intros_offer_id_fkey(
          id,
          title,
          description
        ),
        buyer:users!intros_buyer_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        creator:users!intros_offer_creator_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .or(`buyer_id.eq.${userId},offer_creator_id.eq.${userId}`)
      .order('scheduled_start', { ascending: false });

    if (error) {
      console.error('Error fetching intros:', error);
      res.status(500).json({ error: 'Failed to fetch intros' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getMyIntros:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user is the target of this offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('connection_user_id, offer_creator_id, title, status')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      console.error('Error fetching offer:', fetchError);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.connection_user_id !== userId) {
      res.status(403).json({ error: 'You are not authorized to approve this offer' });
      return;
    }

    if (offer.status !== 'pending_approval') {
      res.status(400).json({ error: 'Offer is not pending approval' });
      return;
    }

    // Approve the offer
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'active',
        approved_by_target: true,
        target_approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving offer:', error);
      res.status(500).json({ error: 'Failed to approve offer' });
      return;
    }

    console.log('✅ Offer approved successfully:', id);

    // Send confirmation message to creator
    await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: offer.offer_creator_id,
        content: `✅ Great news! Your offer "${offer.title}" has been approved and is now live in the marketplace!`,
        message_type: 'offer_approval_response'
      });

    // Create notification for creator
    await supabase
      .from('notifications')
      .insert({
        user_id: offer.offer_creator_id,
        type: 'offer_approved',
        title: 'Offer Approved!',
        message: `Your offer "${offer.title}" has been approved and is now live`,
        data: {
          offer_id: id
        }
      });

    res.json(data);
  } catch (error) {
    console.error('Error in approveOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reason } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if user is the target of this offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('connection_user_id, offer_creator_id, title, status')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      console.error('Error fetching offer:', fetchError);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.connection_user_id !== userId) {
      res.status(403).json({ error: 'You are not authorized to reject this offer' });
      return;
    }

    if (offer.status !== 'pending_approval') {
      res.status(400).json({ error: 'Offer is not pending approval' });
      return;
    }

    // Reject the offer
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'rejected',
        approved_by_target: false,
        target_rejected_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting offer:', error);
      res.status(500).json({ error: 'Failed to reject offer' });
      return;
    }

    console.log('✅ Offer rejected successfully:', id);

    // Send rejection message to creator
    const rejectionMessage = reason 
      ? `Your offer "${offer.title}" was declined. Reason: ${reason}`
      : `Your offer "${offer.title}" was declined.`;

    await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: offer.offer_creator_id,
        content: `❌ ${rejectionMessage}`,
        message_type: 'offer_approval_response'
      });

    // Create notification for creator
    await supabase
      .from('notifications')
      .insert({
        user_id: offer.offer_creator_id,
        type: 'offer_rejected',
        title: 'Offer Declined',
        message: `Your offer "${offer.title}" was declined`,
        data: {
          offer_id: id,
          reason: reason || null
        }
      });

    res.json(data);
  } catch (error) {
    console.error('Error in rejectOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Request an intro call for an offer
export const requestIntroCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // offer id
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, creator:users!offer_creator_id(first_name, last_name)')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Get requester details
    const { data: requester } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : 'Someone';

    // Send approval request message to creator
    const { error: messageError } = await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: (offer as any).offer_creator_id,
      content: `📞 ${requesterName} wants to book a call for your offer!\n\n📋 Offer: "${offer.title}"\n\nThey would like to schedule an intro call. You can approve or decline this request.`,
      message_type: 'intro_call_request',
      metadata: {
        offer_id: id,
        offer_title: offer.title,
        action_required: true,
        actions: ['approve', 'reject']
      }
    });

    if (messageError) {
      console.error('Error sending intro call request message:', messageError);
      res.status(500).json({ error: 'Failed to send request' });
      return;
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: (offer as any).offer_creator_id,
      type: 'intro_call_request',
      title: 'Call Request',
      message: `${requesterName} wants to book a call for "${offer.title}"`,
      data: {
        offer_id: id,
        requester_id: userId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in requestIntroCall:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve an intro call request
export const approveIntroCallRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('sender_id, metadata')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Error fetching message:', messageError);
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const offerId = message.metadata?.offer_id;
    if (!offerId) {
      console.error('No offer_id in message metadata:', message.metadata);
      res.status(400).json({ error: 'Invalid message: no offer_id' });
      return;
    }

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('connection_user_id, title, offer_creator_id')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('Error fetching offer:', offerError);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Verify the user is the offer creator
    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'Only the offer creator can approve call requests' });
      return;
    }

    // Create intro call
    const { data: intro, error: introError } = await supabase
      .from('intro_calls')
      .insert({
        offer_id: offerId,
        buyer_id: message.sender_id,
        creator_id: userId,
        target_id: offer.connection_user_id,
        status: 'pending'
      })
      .select()
      .single();

    if (introError) {
      console.error('Error creating intro call:', introError);
      res.status(500).json({ error: 'Failed to create intro call' });
      return;
    }

    console.log('✅ Intro call created successfully:', intro.id);

    // Send confirmation to buyer
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: message.sender_id,
      content: `✅ Great! Your call request has been approved. Check your Intros tab to start the call.`,
      message_type: 'intro_call_approved'
    });

    // Notify buyer
    await supabase.from('notifications').insert({
      user_id: message.sender_id,
      type: 'intro_call_approved',
      title: 'Call Approved!',
      message: `Your intro call request for "${offer.title}" was approved`,
      data: {
        intro_id: intro.id,
        offer_id: offerId
      }
    });

    console.log('✅ Approval complete: intro_id =', intro.id);
    res.json({ success: true, intro_id: intro.id });
  } catch (error) {
    console.error('Error in approveIntroCallRequest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject an intro call request
export const rejectIntroCallRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('sender_id, metadata')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const offerTitle = message.metadata.offer_title || 'the offer';

    // Send rejection message
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: message.sender_id,
      content: `Sorry, your call request for "${offerTitle}" was declined.`,
      message_type: 'intro_call_rejected'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in rejectIntroCallRequest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update offer tags
export const updateOfferTags = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'Tags must be an array' });
      return;
    }

    // Check if user is the creator of this offer
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('offer_creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      console.error('Error fetching offer:', fetchError);
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.offer_creator_id !== userId) {
      res.status(403).json({ error: 'You can only update tags for your own offers' });
      return;
    }

    // Update tags
    const { data: updatedOffer, error: updateError } = await supabase
      .from('offers')
      .update({ tags: JSON.stringify(tags) })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer tags:', updateError);
      res.status(500).json({ error: 'Failed to update offer tags' });
      return;
    }

    res.status(200).json(updatedOffer);
  } catch (error) {
    console.error('Error in updateOfferTags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

