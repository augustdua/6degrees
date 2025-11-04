import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

// ============================================================================
// LISTING MANAGEMENT (Seller)
// ============================================================================

/**
 * Create a new marketplace listing
 * POST /api/marketplace/listings
 */
export const createListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, description, asking_price_inr } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    if (!title || title.length < 10 || title.length > 100) {
      return res.status(400).json({ error: 'Title must be between 10 and 100 characters' });
    }

    if (!description || description.length < 50 || description.length > 2000) {
      return res.status(400).json({ error: 'Description must be between 50 and 2000 characters' });
    }

    if (!asking_price_inr || asking_price_inr < 1000) {
      return res.status(400).json({ error: 'Asking price must be at least ₹1000' });
    }

    // Calculate 10% deposit
    const depositAmount = Math.round(asking_price_inr * 0.1);

    // Create listing
    const { data: listing, error } = await supabase
      .from('network_listings')
      .insert({
        seller_id: userId,
        title,
        description,
        asking_price_inr,
        deposit_amount_inr: depositAmount,
        status: 'draft' // Created as draft until deposit paid
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return res.status(500).json({ error: 'Failed to create listing' });
    }

    return res.status(201).json({
      listing,
      deposit_required: depositAmount,
      message: 'Listing created. Pay deposit to activate.'
    });
  } catch (error) {
    console.error('Error in createListing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all marketplace listings (public - with filters)
 * GET /api/marketplace/listings
 */
export const getListings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      limit = 20,
      offset = 0,
      status = 'active',
      verified_only = 'false',
      min_rating = 0,
      sort_by = 'created_at'
    } = req.query;

    let query = supabase
      .from('network_listings')
      .select(`
        *,
        seller:users!seller_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          seller_rating,
          seller_verified
        ),
        contacts_count:listing_contacts(count)
      `)
      .eq('status', status);

    if (verified_only === 'true') {
      query = query.eq('verification_status', 'verified');
    }

    if (Number(min_rating) > 0) {
      query = query.gte('average_rating', Number(min_rating));
    }

    // Sort
    if (sort_by === 'rating') {
      query = query.order('average_rating', { ascending: false });
    } else if (sort_by === 'price_low') {
      query = query.order('asking_price_inr', { ascending: true });
    } else if (sort_by === 'price_high') {
      query = query.order('asking_price_inr', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    return res.json({ listings: data || [] });
  } catch (error) {
    console.error('Error in getListings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single listing by ID (public)
 * GET /api/marketplace/listings/:id
 */
export const getListingById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabase
      .from('network_listings')
      .select(`
        *,
        seller:users!seller_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          seller_rating,
          seller_verified,
          seller_total_calls,
          seller_successful_calls,
          seller_response_rate
        ),
        contacts:listing_contacts(
          id,
          public_role,
          public_department,
          public_company,
          verified
        ),
        availability:listing_availability(
          id,
          slot_start,
          slot_end,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get recent reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviewer_id(
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    return res.json({
      listing,
      reviews: reviews || []
    });
  } catch (error) {
    console.error('Error in getListingById:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update listing
 * PUT /api/marketplace/listings/:id
 */
export const updateListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, description, asking_price_inr } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: existing, error: fetchError } = await supabase
      .from('network_listings')
      .select('*')
      .eq('id', id)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    const updateData: any = { updated_at: new Date().toISOString() };

    if (title) {
      if (title.length < 10 || title.length > 100) {
        return res.status(400).json({ error: 'Title must be between 10 and 100 characters' });
      }
      updateData.title = title;
    }

    if (description) {
      if (description.length < 50 || description.length > 2000) {
        return res.status(400).json({ error: 'Description must be between 50 and 2000 characters' });
      }
      updateData.description = description;
    }

    if (asking_price_inr) {
      if (asking_price_inr < 1000) {
        return res.status(400).json({ error: 'Asking price must be at least ₹1000' });
      }
      updateData.asking_price_inr = asking_price_inr;
      updateData.deposit_amount_inr = Math.round(asking_price_inr * 0.1);
    }

    const { data: listing, error } = await supabase
      .from('network_listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating listing:', error);
      return res.status(500).json({ error: 'Failed to update listing' });
    }

    return res.json({ listing });
  } catch (error) {
    console.error('Error in updateListing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete listing
 * DELETE /api/marketplace/listings/:id
 */
export const deleteListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if there are any active bids
    const { data: activeBids } = await supabase
      .from('listing_bids')
      .select('id')
      .eq('listing_id', id)
      .in('status', ['pending', 'accepted', 'scheduled', 'in_progress']);

    if (activeBids && activeBids.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete listing with active bids. Complete or cancel all bids first.'
      });
    }

    const { error } = await supabase
      .from('network_listings')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('seller_id', userId);

    if (error) {
      console.error('Error deleting listing:', error);
      return res.status(500).json({ error: 'Failed to delete listing' });
    }

    return res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error in deleteListing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Pause listing
 * POST /api/marketplace/listings/:id/pause
 */
export const pauseListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('network_listings')
      .update({ status: 'paused' })
      .eq('id', id)
      .eq('seller_id', userId);

    if (error) {
      console.error('Error pausing listing:', error);
      return res.status(500).json({ error: 'Failed to pause listing' });
    }

    return res.json({ message: 'Listing paused successfully' });
  } catch (error) {
    console.error('Error in pauseListing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unpause listing
 * POST /api/marketplace/listings/:id/unpause
 */
export const unpauseListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('network_listings')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('seller_id', userId);

    if (error) {
      console.error('Error unpausing listing:', error);
      return res.status(500).json({ error: 'Failed to unpause listing' });
    }

    return res.json({ message: 'Listing activated successfully' });
  } catch (error) {
    console.error('Error in unpauseListing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// CONTACT MANAGEMENT (Seller)
// ============================================================================

/**
 * Add contact to listing
 * POST /api/marketplace/listings/:id/contacts
 */
export const addContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;
    const {
      full_name,
      role_title,
      company,
      photo_url,
      public_role,
      public_department,
      public_company,
      relationship_type,
      relationship_description
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Validate inputs
    if (!full_name || !role_title || !company || !photo_url || !public_role || !public_company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: contact, error } = await supabase
      .from('listing_contacts')
      .insert({
        listing_id: listingId,
        full_name,
        role_title,
        company,
        photo_url,
        public_role,
        public_department,
        public_company,
        relationship_type,
        relationship_description
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding contact:', error);
      return res.status(500).json({ error: 'Failed to add contact' });
    }

    return res.status(201).json({ contact });
  } catch (error) {
    console.error('Error in addContact:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all contacts for a listing
 * GET /api/marketplace/listings/:id/contacts
 */
export const getListingContacts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    const { data: contacts, error } = await supabase
      .from('listing_contacts')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    return res.json({ contacts: contacts || [] });
  } catch (error) {
    console.error('Error in getListingContacts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update contact
 * PUT /api/marketplace/listings/:id/contacts/:contactId
 */
export const updateContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId, contactId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    const { data: contact, error } = await supabase
      .from('listing_contacts')
      .update(req.body)
      .eq('id', contactId)
      .eq('listing_id', listingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return res.status(500).json({ error: 'Failed to update contact' });
    }

    return res.json({ contact });
  } catch (error) {
    console.error('Error in updateContact:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete contact
 * DELETE /api/marketplace/listings/:id/contacts/:contactId
 */
export const deleteContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId, contactId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Check if contact is used in any active bids
    const { data: activeBids } = await supabase
      .from('listing_bids')
      .select('id')
      .eq('selected_contact_id', contactId)
      .in('status', ['accepted', 'scheduled', 'in_progress']);

    if (activeBids && activeBids.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete contact with active bids'
      });
    }

    const { error } = await supabase
      .from('listing_contacts')
      .delete()
      .eq('id', contactId)
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error deleting contact:', error);
      return res.status(500).json({ error: 'Failed to delete contact' });
    }

    return res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error in deleteContact:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// AVAILABILITY MANAGEMENT (Seller)
// ============================================================================

/**
 * Add availability slot
 * POST /api/marketplace/listings/:id/availability
 */
export const addAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;
    const { slot_start, slot_end } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Validate times
    if (!slot_start || !slot_end) {
      return res.status(400).json({ error: 'Slot start and end times required' });
    }

    const start = new Date(slot_start);
    const end = new Date(slot_end);

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: 'Cannot create slot in the past' });
    }

    const { data: slot, error } = await supabase
      .from('listing_availability')
      .insert({
        listing_id: listingId,
        seller_id: userId,
        slot_start,
        slot_end,
        status: 'available'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding availability:', error);
      return res.status(500).json({ error: 'Failed to add availability' });
    }

    return res.status(201).json({ slot });
  } catch (error) {
    console.error('Error in addAvailability:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get listing availability
 * GET /api/marketplace/listings/:id/availability
 */
export const getAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: listingId } = req.params;

    const { data: slots, error } = await supabase
      .from('listing_availability')
      .select('*')
      .eq('listing_id', listingId)
      .gte('slot_start', new Date().toISOString())
      .order('slot_start', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }

    return res.json({ slots: slots || [] });
  } catch (error) {
    console.error('Error in getAvailability:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete availability slot
 * DELETE /api/marketplace/listings/:id/availability/:slotId
 */
export const deleteAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId, slotId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Check if slot is booked
    const { data: slot } = await supabase
      .from('listing_availability')
      .select('status')
      .eq('id', slotId)
      .single();

    if (slot?.status === 'booked') {
      return res.status(400).json({ error: 'Cannot delete booked slot' });
    }

    const { error } = await supabase
      .from('listing_availability')
      .delete()
      .eq('id', slotId)
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error deleting availability:', error);
      return res.status(500).json({ error: 'Failed to delete availability' });
    }

    return res.json({ message: 'Availability slot deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAvailability:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// BID MANAGEMENT (Seller)
// ============================================================================

/**
 * Get all bids for a listing
 * GET /api/marketplace/listings/:id/bids
 */
export const getListingBids = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;
    const { status = 'all' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    let query = supabase
      .from('listing_bids')
      .select(`
        *,
        buyer:users!buyer_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        selected_contact:listing_contacts(
          id,
          full_name,
          role_title,
          company
        ),
        scheduled_slot:listing_availability(
          id,
          slot_start,
          slot_end
        )
      `)
      .eq('listing_id', listingId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: bids, error } = await query;

    if (error) {
      console.error('Error fetching bids:', error);
      return res.status(500).json({ error: 'Failed to fetch bids' });
    }

    return res.json({ bids: bids || [] });
  } catch (error) {
    console.error('Error in getListingBids:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single bid details
 * GET /api/marketplace/bids/:bidId
 */
export const getBidDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: bid, error } = await supabase
      .from('listing_bids')
      .select(`
        *,
        listing:network_listings(
          id,
          title,
          seller_id
        ),
        buyer:users!buyer_id(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio
        ),
        selected_contact:listing_contacts(
          id,
          full_name,
          role_title,
          company,
          photo_url
        ),
        scheduled_slot:listing_availability(
          id,
          slot_start,
          slot_end
        )
      `)
      .eq('id', bidId)
      .single();

    if (error || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify user is either seller or buyer
    if (bid.seller_id !== userId && bid.buyer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    return res.json({ bid });
  } catch (error) {
    console.error('Error in getBidDetails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Accept bid
 * POST /api/marketplace/bids/:bidId/accept
 */
export const acceptBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get bid details
    const { data: bid, error: fetchError } = await supabase
      .from('listing_bids')
      .select('*, listing:network_listings(*)')
      .eq('id', bidId)
      .single();

    if (fetchError || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify user is the seller
    if (bid.seller_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only accept pending bids
    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'Bid is not in pending status' });
    }

    // Update bid status
    const { data: updatedBid, error: updateError } = await supabase
      .from('listing_bids')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', bidId)
      .select()
      .single();

    if (updateError) {
      console.error('Error accepting bid:', updateError);
      return res.status(500).json({ error: 'Failed to accept bid' });
    }

    // TODO: Send notification to buyer
    // TODO: Create escrow transaction

    return res.json({
      bid: updatedBid,
      message: 'Bid accepted. Buyer will be notified to pay to escrow.'
    });
  } catch (error) {
    console.error('Error in acceptBid:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reject bid
 * POST /api/marketplace/bids/:bidId/reject
 */
export const rejectBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get bid details
    const { data: bid, error: fetchError } = await supabase
      .from('listing_bids')
      .select('*')
      .eq('id', bidId)
      .single();

    if (fetchError || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify user is the seller
    if (bid.seller_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only reject pending bids
    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'Bid is not in pending status' });
    }

    // Update bid status
    const { error: updateError } = await supabase
      .from('listing_bids')
      .update({
        status: 'rejected'
      })
      .eq('id', bidId);

    if (updateError) {
      console.error('Error rejecting bid:', updateError);
      return res.status(500).json({ error: 'Failed to reject bid' });
    }

    // TODO: Send notification to buyer

    return res.json({ message: 'Bid rejected successfully' });
  } catch (error) {
    console.error('Error in rejectBid:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// VERIFICATION (Seller)
// ============================================================================

/**
 * Request verification for listing
 * POST /api/marketplace/listings/:id/verify
 */
export const requestVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;
    const { contact_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify listing exists and user is the seller
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    if (!contact_id) {
      return res.status(400).json({ error: 'Contact ID required for verification' });
    }

    // Update listing verification status
    const { error: updateError } = await supabase
      .from('network_listings')
      .update({
        verification_status: 'pending'
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('Error requesting verification:', updateError);
      return res.status(500).json({ error: 'Failed to request verification' });
    }

    // TODO: Schedule verification call
    // TODO: Send verification instructions

    return res.json({
      message: 'Verification requested successfully',
      next_steps: 'You will receive instructions for your verification call'
    });
  } catch (error) {
    console.error('Error in requestVerification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get verification status
 * GET /api/marketplace/listings/:id/verification-status
 */
export const getVerificationStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: listing, error } = await supabase
      .from('network_listings')
      .select('verification_status, verified_at')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    return res.json({
      verification_status: listing.verification_status,
      verified_at: listing.verified_at
    });
  } catch (error) {
    console.error('Error in getVerificationStatus:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// BUYER ENDPOINTS
// ============================================================================

/**
 * Place bid on listing
 * POST /api/paynet/listings/:id/bid
 */
export const placeBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: listingId } = req.params;
    const { bid_amount_inr, buyer_deposit_coins } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get listing details
    const { data: listing, error: fetchError } = await supabase
      .from('network_listings')
      .select('*, seller:users!seller_id(*)')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or not active' });
    }

    // Validate bid amount
    if (!bid_amount_inr || bid_amount_inr <= 0) {
      return res.status(400).json({ error: 'Valid bid amount required' });
    }

    // Create bid
    const { data: bid, error: bidError } = await supabase
      .from('listing_bids')
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id,
        bid_amount_inr,
        buyer_deposit_coins: buyer_deposit_coins || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error creating bid:', bidError);
      return res.status(500).json({ error: 'Failed to create bid' });
    }

    // TODO: Send notification to seller
    // TODO: Deduct buyer deposit coins

    return res.status(201).json({
      bid,
      message: 'Bid placed successfully. Seller will be notified.'
    });
  } catch (error) {
    console.error('Error in placeBid:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Pay to escrow after bid accepted
 * POST /api/paynet/bids/:bidId/pay
 */
export const payToEscrow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;
    const { payment_method } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get bid details
    const { data: bid, error: fetchError } = await supabase
      .from('listing_bids')
      .select('*, listing:network_listings(*)')
      .eq('id', bidId)
      .eq('buyer_id', userId)
      .single();

    if (fetchError || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.status !== 'accepted') {
      return res.status(400).json({ error: 'Bid must be accepted before payment' });
    }

    // Calculate amounts
    const platformCommission = Math.round(bid.bid_amount_inr * 0.2); // 20%
    const sellerPayout = bid.bid_amount_inr - platformCommission;

    // Create escrow transaction
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        bid_id: bidId,
        listing_id: bid.listing_id,
        buyer_id: userId,
        seller_id: bid.seller_id,
        buyer_payment_amount: bid.bid_amount_inr,
        seller_deposit_amount: bid.listing.deposit_amount_inr,
        platform_commission_amount: platformCommission,
        seller_payout_amount: sellerPayout,
        status: 'locked'
      })
      .select()
      .single();

    if (escrowError) {
      console.error('Error creating escrow:', escrowError);
      return res.status(500).json({ error: 'Failed to create escrow' });
    }

    // Update bid status
    await supabase
      .from('listing_bids')
      .update({
        status: 'payment_pending',
        payment_received_at: new Date().toISOString()
      })
      .eq('id', bidId);

    // TODO: Process actual payment via Razorpay
    // TODO: Lock funds in escrow

    return res.json({
      escrow,
      message: 'Payment received. Select time slot to schedule call.'
    });
  } catch (error) {
    console.error('Error in payToEscrow:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Select time slot and contact person
 * POST /api/paynet/bids/:bidId/select-slot
 */
export const selectSlot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;
    const { slot_id, contact_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!slot_id || !contact_id) {
      return res.status(400).json({ error: 'Slot ID and Contact ID required' });
    }

    // Get bid details
    const { data: bid, error: fetchError } = await supabase
      .from('listing_bids')
      .select('*, listing:network_listings(*)')
      .eq('id', bidId)
      .eq('buyer_id', userId)
      .single();

    if (fetchError || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Verify slot is available
    const { data: slot, error: slotError } = await supabase
      .from('listing_availability')
      .select('*')
      .eq('id', slot_id)
      .eq('listing_id', bid.listing_id)
      .eq('status', 'available')
      .single();

    if (slotError || !slot) {
      return res.status(400).json({ error: 'Slot not available' });
    }

    // Verify contact exists for listing
    const { data: contact, error: contactError } = await supabase
      .from('listing_contacts')
      .select('*')
      .eq('id', contact_id)
      .eq('listing_id', bid.listing_id)
      .single();

    if (contactError || !contact) {
      return res.status(400).json({ error: 'Contact not found' });
    }

    // Update slot as booked
    await supabase
      .from('listing_availability')
      .update({
        status: 'booked',
        booked_by_bid_id: bidId,
        booked_at: new Date().toISOString()
      })
      .eq('id', slot_id);

    // Update bid with slot and contact
    await supabase
      .from('listing_bids')
      .update({
        scheduled_slot_id: slot_id,
        selected_contact_id: contact_id,
        status: 'scheduled',
        scheduled_at: new Date().toISOString()
      })
      .eq('id', bidId);

    // Create intro_call record
    const { data: call, error: callError } = await supabase
      .from('intro_calls')
      .insert({
        bid_id: bidId,
        listing_id: bid.listing_id,
        seller_id: bid.seller_id,
        buyer_id: userId,
        target_contact_id: contact_id,
        scheduled_start: slot.slot_start,
        scheduled_end: slot.slot_end,
        status: 'scheduled'
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating call:', callError);
      return res.status(500).json({ error: 'Failed to create call' });
    }

    // Create Daily.co room
    try {
      const { createDailyRoom } = await import('../services/dailyService');
      const room = await createDailyRoom(call.id);
      await supabase
        .from('intro_calls')
        .update({
          daily_room_url: room.url,
          daily_room_name: room.name
        })
        .eq('id', call.id);
    } catch (e) {
      console.error('Failed to create Daily room:', (e as any).message);
      // Non-fatal
    }

    // Optionally auto-start Pipecat agent here (commented until configured)
    // try {
    //   const { generateMeetingToken } = await import('../services/dailyService');
    //   const { startAgent } = await import('../services/pipecatService');
    //   const botToken = await generateMeetingToken(`paynet-call-${call.id}`, 'AI Agent', true, 7200);
    //   const result = await startAgent({
    //     callId: call.id,
    //     roomName: `paynet-call-${call.id}`,
    //     roomUrl: `https://6degrees.daily.co/paynet-call-${call.id}`,
    //     token: botToken
    //   });
    //   await supabase
    //     .from('intro_calls')
    //     .update({ ai_agent_status: 'active', ai_agent_session_id: result.sessionId })
    //     .eq('id', call.id);
    // } catch (e) {
    //   console.error('Failed to start Pipecat agent:', (e as any).message);
    // }

    return res.json({
      call,
      contact: {
        full_name: contact.full_name,
        role_title: contact.role_title,
        company: contact.company
      },
      message: 'Call scheduled successfully. Calendar invite sent.'
    });
  } catch (error) {
    console.error('Error in selectSlot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit questions for verification
 * POST /api/paynet/bids/:bidId/questions
 */
export const submitQuestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bidId } = req.params;
    const { questions } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!questions || !Array.isArray(questions) || questions.length !== 5) {
      return res.status(400).json({ error: 'Exactly 5 questions required' });
    }

    // Update bid with questions
    const { error } = await supabase
      .from('listing_bids')
      .update({
        question_1: questions[0],
        question_2: questions[1],
        question_3: questions[2],
        question_4: questions[3],
        question_5: questions[4],
        questions_submitted_at: new Date().toISOString()
      })
      .eq('id', bidId)
      .eq('buyer_id', userId);

    if (error) {
      console.error('Error submitting questions:', error);
      return res.status(500).json({ error: 'Failed to submit questions' });
    }

    return res.json({ message: 'Questions submitted successfully' });
  } catch (error) {
    console.error('Error in submitQuestions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// ============================================================================
// CALL MANAGEMENT
// ============================================================================

/**
 * Join call
 * POST /api/paynet/calls/:callId/join
 */
export const joinCall = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get call details
    const { data: call, error: fetchError } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (fetchError || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is participant
    if (call.seller_id !== userId && call.buyer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // TODO: Create Daily.co room if not exists
    // TODO: Generate join token

    const dailyRoomUrl = call.daily_room_url || `https://6degrees.daily.co/${callId}`;

    // Update join status
    if (call.seller_id === userId) {
      await supabase
        .from('intro_calls')
        .update({ seller_joined: true })
        .eq('id', callId);
    } else if (call.buyer_id === userId) {
      await supabase
        .from('intro_calls')
        .update({ buyer_joined: true })
        .eq('id', callId);
    }

    try {
      const { generateMeetingToken } = await import('../services/dailyService');
      const roomName = call.daily_room_name || `paynet-call-${callId}`;

      // Determine user role and get their name
      let userRole: 'buyer' | 'seller' | 'target' | undefined;
      let userName = 'Participant';

      if (call.buyer_id === userId) {
        userRole = 'buyer';
        const { data: buyer } = await supabase
          .from('users')
          .select('first_name, last_name, full_name')
          .eq('id', userId)
          .single();
        userName = buyer?.full_name || `${buyer?.first_name} ${buyer?.last_name}` || 'Buyer';
      } else if (call.seller_id === userId) {
        userRole = 'seller';
        const { data: seller } = await supabase
          .from('users')
          .select('first_name, last_name, full_name')
          .eq('id', userId)
          .single();
        userName = seller?.full_name || `${seller?.first_name} ${seller?.last_name}` || 'Seller';
      }
      // Note: Target doesn't authenticate through your system, handle separately if needed

      // Generate token with user metadata
      const token = await generateMeetingToken(
        roomName,
        userName,
        false,
        7200,
        {
          role: userRole,
          userId: userId,
          callId: callId
        }
      );

      return res.json({
        room_url: call.daily_room_url || `https://6degrees.daily.co/${roomName}`,
        token,
        role: userRole,
        call
      });
    } catch (e) {
      console.error('Failed to generate Daily token:', (e as any).message);
      return res.json({
        room_url: call.daily_room_url || `https://6degrees.daily.co/${callId}`,
        token: null,
        call
      });
    }
  } catch (error) {
    console.error('Error in joinCall:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get call status
 * GET /api/paynet/calls/:callId/status
 */
export const getCallStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select(`
        *,
        bid:listing_bids(
          *,
          listing:network_listings(*)
        ),
        verification:ai_verification_reports(*)
      `)
      .eq('id', callId)
      .single();

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is participant
    if (call.seller_id !== userId && call.buyer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    return res.json({ call });
  } catch (error) {
    console.error('Error in getCallStatus:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Start recording for a call
 * POST /api/paynet/calls/:callId/recording/start
 */
export const startCallRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const roomName = call.daily_room_name || `paynet-call-${callId}`;
    const { startRecording } = await import('../services/dailyService');
    await startRecording(roomName);
    return res.json({ message: 'Recording started' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to start recording' });
  }
};

/**
 * Stop recording for a call
 * POST /api/paynet/calls/:callId/recording/stop
 */
export const stopCallRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const roomName = call.daily_room_name || `paynet-call-${callId}`;
    const { stopRecording } = await import('../services/dailyService');
    await stopRecording(roomName);
    return res.json({ message: 'Recording stopped' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to stop recording' });
  }
};

/**
 * Start transcription for a call
 * POST /api/paynet/calls/:callId/transcription/start
 */
export const startCallTranscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const roomName = call.daily_room_name || `paynet-call-${callId}`;
    const { startTranscription } = await import('../services/dailyService');
    await startTranscription(roomName);
    return res.json({ message: 'Transcription started' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to start transcription' });
  }
};

/**
 * Stop transcription for a call
 * POST /api/paynet/calls/:callId/transcription/stop
 */
export const stopCallTranscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const roomName = call.daily_room_name || `paynet-call-${callId}`;
    const { stopTranscription } = await import('../services/dailyService');
    await stopTranscription(roomName);
    return res.json({ message: 'Transcription stopped' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to stop transcription' });
  }
};

/**
 * Update agent prompt/config
 * PUT /api/paynet/calls/:callId/agent/config
 */
export const updateAgentConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    const { prompt, config } = req.body || {};
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('seller_id, buyer_id')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const updates: any = {};
    if (prompt !== undefined) updates.ai_agent_prompt = prompt;
    if (config !== undefined) updates.ai_agent_config = config;

    const { data: updated, error: updErr } = await supabase
      .from('intro_calls')
      .update(updates)
      .eq('id', callId)
      .select()
      .single();
    if (updErr) return res.status(500).json({ error: 'Failed to update config' });
    return res.json({ call: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to update config' });
  }
};
