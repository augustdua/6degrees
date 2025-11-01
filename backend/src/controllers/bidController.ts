import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// Create a bid on an offer
export const createBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { offerId } = req.params;
    const { bidAmountInr, bidAmountEur, bidCurrency, bidMessage } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Validation
    if (!bidAmountInr || !bidAmountEur || !bidCurrency) {
      res.status(400).json({ error: 'Missing required fields: bid amounts and currency' });
      return;
    }

    if (bidAmountInr <= 0 || bidAmountEur <= 0) {
      res.status(400).json({ error: 'Bid amount must be greater than 0' });
      return;
    }

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, creator:users!offer_creator_id(first_name, last_name, email)')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check if offer is active
    if (offer.status !== 'active') {
      res.status(400).json({ error: 'This offer is not active' });
      return;
    }

    // Prevent bidding on own offer
    if (offer.offer_creator_id === userId) {
      res.status(400).json({ error: 'You cannot bid on your own offer' });
      return;
    }

    // Get bidder details
    const { data: bidder } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    const bidderName = bidder ? `${bidder.first_name} ${bidder.last_name}` : 'Someone';

    // Create bid
    const { data: bid, error: bidError } = await supabase
      .from('offer_bids')
      .insert({
        offer_id: offerId,
        bidder_id: userId,
        creator_id: offer.offer_creator_id,
        bid_amount_inr: Math.round(bidAmountInr),
        bid_amount_eur: Math.round(bidAmountEur * 100) / 100,
        bid_currency: bidCurrency,
        bid_message: bidMessage || null,
        status: 'pending'
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error creating bid:', bidError);
      res.status(500).json({ error: 'Failed to create bid' });
      return;
    }

    // Send bid request message to creator
    const currencySymbol = bidCurrency === 'INR' ? '₹' : bidCurrency === 'EUR' ? '€' : '$';
    const bidAmount = bidCurrency === 'INR' ? bidAmountInr : bidAmountEur;
    
    let messageContent = `💰 ${bidderName} placed a bid on your offer!\n\n📋 Offer: "${offer.title}"\n💵 Bid Amount: ${currencySymbol}${bidAmount.toLocaleString()}`;
    
    if (bidMessage) {
      messageContent += `\n\n💬 Message: "${bidMessage}"`;
    }
    
    messageContent += '\n\nYou can approve or decline this bid.';

    const { error: messageError } = await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: offer.offer_creator_id,
      content: messageContent,
      message_type: 'offer_bid_request',
      metadata: {
        bid_id: bid.id,
        offer_id: offerId,
        offer_title: offer.title,
        bid_amount_inr: bidAmountInr,
        bid_amount_eur: bidAmountEur,
        bid_currency: bidCurrency,
        bid_message: bidMessage,
        action_required: true,
        actions: ['approve', 'reject']
      }
    });

    if (messageError) {
      console.error('Error sending bid request message:', messageError);
      // Don't fail the bid creation, just log the error
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: offer.offer_creator_id,
      type: 'offer_bid_request',
      title: 'New Bid on Your Offer',
      message: `${bidderName} placed a ${currencySymbol}${bidAmount.toLocaleString()} bid on "${offer.title}"`,
      link: `/dashboard?tab=messages`,
      metadata: {
        bid_id: bid.id,
        offer_id: offerId,
        bidder_id: userId
      }
    });

    res.status(201).json({
      message: 'Bid placed successfully',
      bid
    });
  } catch (error) {
    console.error('Error in createBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a bid (creator only)
export const approveBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    const { response } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get bid details
    const { data: bid, error: bidError } = await supabase
      .from('offer_bids')
      .select(`
        *,
        offer:offers!offer_id(
          id,
          title,
          connection_user_id,
          offer_creator_id
        )
      `)
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      res.status(404).json({ error: 'Bid not found' });
      return;
    }

    // Verify user is the creator
    if (bid.creator_id !== userId) {
      res.status(403).json({ error: 'Only the offer creator can approve bids' });
      return;
    }

    // Check if bid is pending
    if (bid.status !== 'pending') {
      res.status(400).json({ error: `Bid is already ${bid.status}` });
      return;
    }

    // Create intro call
    const { data: intro, error: introError } = await supabase
      .from('intro_calls')
      .insert({
        offer_id: bid.offer_id,
        bid_id: bidId,
        buyer_id: bid.bidder_id,
        creator_id: userId,
        target_id: (bid.offer as any).connection_user_id,
        status: 'pending'
      })
      .select()
      .single();

    if (introError) {
      console.error('Error creating intro call:', introError);
      res.status(500).json({ error: 'Failed to create intro call' });
      return;
    }

    // Update bid status (use 'accepted' to match existing schema)
    const { error: updateError } = await supabase
      .from('offer_bids')
      .update({
        status: 'accepted',
        intro_call_id: intro.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', bidId);

    if (updateError) {
      console.error('Error updating bid:', updateError);
      res.status(500).json({ error: 'Failed to update bid' });
      return;
    }

    // Send approval message to bidder
    const currencySymbol = bid.bid_currency === 'INR' ? '₹' : bid.bid_currency === 'EUR' ? '€' : '$';
    const bidAmount = bid.bid_currency === 'INR' ? bid.bid_amount_inr : bid.bid_amount_eur;
    
    let approvalContent = `✅ Your bid of ${currencySymbol}${bidAmount.toLocaleString()} was approved!\n\n📋 Offer: "${(bid.offer as any).title}"`;
    
    if (response) {
      approvalContent += `\n\n💬 Response: "${response}"`;
    }
    
    approvalContent += '\n\nYour intro call has been scheduled. Check the Intros tab to manage it.';

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: bid.bidder_id,
      content: approvalContent,
      message_type: 'offer_bid_approved',
      metadata: {
        bid_id: bidId,
        intro_call_id: intro.id,
        offer_id: bid.offer_id
      }
    });

    // Create notification for bidder
    await supabase.from('notifications').insert({
      user_id: bid.bidder_id,
      type: 'offer_bid_approved',
      title: 'Bid Approved!',
      message: `Your ${currencySymbol}${bidAmount.toLocaleString()} bid on "${(bid.offer as any).title}" was approved`,
      link: `/dashboard?tab=intros`,
      metadata: {
        bid_id: bidId,
        intro_call_id: intro.id,
        offer_id: bid.offer_id
      }
    });

    res.json({
      message: 'Bid approved successfully',
      intro_call_id: intro.id
    });
  } catch (error) {
    console.error('Error in approveBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a bid (creator only)
export const rejectBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    const { response } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get bid details
    const { data: bid, error: bidError } = await supabase
      .from('offer_bids')
      .select(`
        *,
        offer:offers!offer_id(title)
      `)
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      res.status(404).json({ error: 'Bid not found' });
      return;
    }

    // Verify user is the creator
    if (bid.creator_id !== userId) {
      res.status(403).json({ error: 'Only the offer creator can reject bids' });
      return;
    }

    // Check if bid is pending
    if (bid.status !== 'pending') {
      res.status(400).json({ error: `Bid is already ${bid.status}` });
      return;
    }

    // Update bid status
    const { error: updateError } = await supabase
      .from('offer_bids')
      .update({
        status: 'rejected'
      })
      .eq('id', bidId);

    if (updateError) {
      console.error('Error updating bid:', updateError);
      res.status(500).json({ error: 'Failed to update bid' });
      return;
    }

    // Send rejection message to bidder
    const currencySymbol = bid.bid_currency === 'INR' ? '₹' : bid.bid_currency === 'EUR' ? '€' : '$';
    const bidAmount = bid.bid_currency === 'INR' ? bid.bid_amount_inr : bid.bid_amount_eur;
    
    let rejectionContent = `❌ Your bid of ${currencySymbol}${bidAmount.toLocaleString()} was declined.\n\n📋 Offer: "${(bid.offer as any).title}"`;
    
    if (response) {
      rejectionContent += `\n\n💬 Response: "${response}"`;
    }

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: bid.bidder_id,
      content: rejectionContent,
      message_type: 'offer_bid_rejected',
      metadata: {
        bid_id: bidId,
        offer_id: bid.offer_id
      }
    });

    // Create notification for bidder
    await supabase.from('notifications').insert({
      user_id: bid.bidder_id,
      type: 'offer_bid_rejected',
      title: 'Bid Declined',
      message: `Your ${currencySymbol}${bidAmount.toLocaleString()} bid on "${(bid.offer as any).title}" was declined`,
      link: `/dashboard?tab=messages`,
      metadata: {
        bid_id: bidId,
        offer_id: bid.offer_id
      }
    });

    res.json({
      message: 'Bid rejected'
    });
  } catch (error) {
    console.error('Error in rejectBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's bids (both sent and received)
export const getMyBids = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get bids where user is bidder or creator
    const { data: bids, error } = await supabase
      .from('offer_bids')
      .select(`
        *,
        offer:offers!offer_id(id, title, offer_creator_id),
        bidder:users!bidder_id(id, first_name, last_name, avatar_url),
        creator:users!creator_id(id, first_name, last_name, avatar_url)
      `)
      .or(`bidder_id.eq.${userId},creator_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
      return;
    }

    res.json({ bids });
  } catch (error) {
    console.error('Error in getMyBids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

