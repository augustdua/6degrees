import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { API_BASE_URL, apiGet, apiPost, apiPut, apiDelete, API_ENDPOINTS } from '@/lib/api';

export interface Offer {
  id: string;
  offer_creator_id: string;
  connection_user_id: string;
  title: string;
  description: string;
  asking_price_inr: number;
  asking_price_eur?: number;
  currency?: 'INR' | 'EUR';
  status: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  bids_count?: number;
  target_organization?: string;
  target_position?: string;
  target_logo_url?: string;
  relationship_type?: string;
  relationship_description?: string;
  offer_photo_url?: string;
  additional_org_logos?: Array<{ name: string; logo_url: string }>;
  tags?: string[];
  is_demo?: boolean;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
  };
  connection?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    role?: string;
  };
}

export interface OfferBid {
  id: string;
  offer_id: string;
  buyer_id: string;
  offer_creator_id: string;
  bid_amount_inr: number;
  status: string;
  created_at: string;
  accepted_at?: string;
  buyer?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    role?: string;
  };
}

export interface Intro {
  id: string;
  offer_id: string;
  buyer_id: string;
  offer_creator_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  daily_room_url?: string;
  daily_room_name?: string;
  pipecat_session_id?: string;
  offer?: {
    id: string;
    title: string;
    description: string;
  };
  buyer?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export const useOffers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOffer = useCallback(async (offerData: {
    title: string;
    description: string;
    connectionUserId: string;
    price: number;
    currency?: 'INR' | 'EUR';
    asking_price_inr?: number;
    asking_price_eur?: number;
    targetOrganization?: string;
    targetPosition?: string;
    targetLogoUrl?: string;
    relationshipType?: string;
    relationshipDescription?: string;
    offerPhotoUrl?: string;
    additionalOrgLogos?: Array<{ name: string; logo_url: string }>;
  }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const offer = await apiPost(API_ENDPOINTS.OFFERS, offerData);
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOffers = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    tags?: string[];
    include_demo?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.tags && params.tags.length > 0) {
        queryParams.append('tags', params.tags.join(','));
      }
      if (params?.include_demo !== undefined) {
        queryParams.append('include_demo', params.include_demo.toString());
      }

      const offers: Offer[] = await apiGet(`${API_ENDPOINTS.OFFERS}?${queryParams.toString()}`);
      
      // Parse tags from JSON string if needed
      const parsedOffers = offers.map(offer => ({
        ...offer,
        tags: typeof offer.tags === 'string' ? JSON.parse(offer.tags as any) : offer.tags || []
      }));
      
      return parsedOffers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyOffers = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const offers = await apiGet(`${API_ENDPOINTS.OFFERS}/my/offers`);
      return offers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch your offers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOfferById = useCallback(async (offerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const offer: Offer = await apiGet(`${API_ENDPOINTS.OFFERS}/${offerId}`);
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOffer = useCallback(async (offerId: string, updates: {
    title?: string;
    description?: string;
    asking_price_inr?: number;
    targetOrganization?: string;
    targetPosition?: string;
    targetLogoUrl?: string;
    relationshipType?: string;
    relationshipDescription?: string;
    offerPhotoUrl?: string;
    additionalOrgLogos?: Array<{ name: string; logo_url: string }>;
  }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const offer = await apiPut(`${API_ENDPOINTS.OFFERS}/${offerId}`, updates);
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteOffer = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const result = await apiDelete(`${API_ENDPOINTS.OFFERS}/${offerId}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const likeOffer = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const result = await apiPost(`${API_ENDPOINTS.OFFERS}/${offerId}/like`, {});
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to like offer';
      setError(errorMessage);
      throw err;
    }
  }, [user]);

  const bidOnOffer = useCallback(async (offerId: string, bidAmount: number) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const bid = await apiPost(`${API_ENDPOINTS.OFFERS}/${offerId}/bid`, { bidAmount });
      return bid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit bid';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOfferBids = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const bids = await apiGet(`${API_ENDPOINTS.OFFERS}/${offerId}/bids`);
      return bids;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bids';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const acceptOfferBid = useCallback(async (offerId: string, bidId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const bid = await apiPost(`${API_ENDPOINTS.OFFERS}/${offerId}/bids/${bidId}/accept`, {});
      return bid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getMyIntros = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const intros: Intro[] = await apiGet(`${API_ENDPOINTS.OFFERS}/my/intros`);
      return intros;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch intros';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateOfferTags = useCallback(async (offerId: string, tags: string[]) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const offer = await apiPut(`${API_ENDPOINTS.OFFERS}/${offerId}/tags`, { tags });
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tags';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    createOffer,
    getOffers,
    getMyOffers,
    getOfferById,
    updateOffer,
    updateOfferTags,
    deleteOffer,
    likeOffer,
    bidOnOffer,
    getOfferBids,
    acceptOfferBid,
    getMyIntros
  };
};

