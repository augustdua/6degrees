import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '@/lib/api';

export interface Offer {
  id: string;
  offer_creator_id: string;
  connection_user_id: string;
  title: string;
  description: string;
  asking_price_inr: number;
  status: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  bids_count?: number;
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
    targetOrganization?: string;
    targetPosition?: string;
    targetLogoUrl?: string;
    relationshipType?: string;
    relationshipDescription?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(offerData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create offer');
      }

      const offer = await response.json();
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const getOffers = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.status) queryParams.append('status', params.status);

      const response = await fetch(`${API_BASE_URL}/api/offers?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const offers: Offer[] = await response.json();
      return offers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const getMyOffers = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/my/offers`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch your offers');
      }

      const offers: Offer[] = await response.json();
      return offers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch your offers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const getOfferById = useCallback(async (offerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch offer');
      }

      const offer: Offer = await response.json();
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const updateOffer = useCallback(async (offerId: string, updates: {
    title?: string;
    description?: string;
    price?: number;
  }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update offer');
      }

      const offer = await response.json();
      return offer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const deleteOffer = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete offer');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete offer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const likeOffer = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to like offer');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to like offer';
      setError(errorMessage);
      throw err;
    }
  }, [user, API_BASE_URL]);

  const bidOnOffer = useCallback(async (offerId: string, bidAmount: number) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ bidAmount })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit bid');
      }

      const bid = await response.json();
      return bid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit bid';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const getOfferBids = useCallback(async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/bids`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bids');
      }

      const bids: OfferBid[] = await response.json();
      return bids;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bids';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const acceptOfferBid = useCallback(async (offerId: string, bidId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept bid');
      }

      const bid = await response.json();
      return bid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  const getMyIntros = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token');

      const response = await fetch(`${API_BASE_URL}/api/offers/my/intros`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch intros');
      }

      const intros: Intro[] = await response.json();
      return intros;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch intros';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  return {
    loading,
    error,
    createOffer,
    getOffers,
    getMyOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    likeOffer,
    bidOnOffer,
    getOfferBids,
    acceptOfferBid,
    getMyIntros
  };
};

