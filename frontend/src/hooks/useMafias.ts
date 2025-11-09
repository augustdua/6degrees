import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface Mafia {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string;
  monthly_price: number;
  creator_id: string;
  founding_member_limit: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  member_count?: number;
  founding_member_count?: number;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

export interface MafiaMember {
  id: string;
  mafia_id: string;
  user_id: string;
  role: 'admin' | 'founding' | 'paid';
  joined_at: string;
  subscription_status?: 'active' | 'expired' | 'cancelled';
  next_payment_date?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
    bio?: string;
    user_organizations?: Array<{
      organization: {
        id: string;
        name: string;
        logo_url?: string;
      };
    }>;
  };
}

export interface MafiaDetails extends Mafia {
  members: MafiaMember[];
  conversation_id?: string;
}

export interface MafiaMembership {
  id: string;
  role: 'admin' | 'founding' | 'paid';
  joined_at: string;
  subscription_status?: 'active' | 'expired' | 'cancelled';
  next_payment_date?: string;
  mafias: Mafia;
}

export interface MafiaRevenue {
  totalRevenue: number;
  thisMonth: number;
  activeSubscribers: number;
}

export const useMafias = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all active mafias (public explore)
   */
  const getAllMafias = useCallback(async (): Promise<Mafia[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet('/api/mafias');
      return response.mafias || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch mafias';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user's mafias (created or joined)
   */
  const getMyMafias = useCallback(
    async (filter?: 'created' | 'joined'): Promise<MafiaMembership[]> => {
      setLoading(true);
      setError(null);
      try {
        const queryParam = filter ? `?filter=${filter}` : '';
        const response = await apiGet(`/api/mafias/my/memberships${queryParam}`);
        return response.memberships || [];
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to fetch your mafias';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get mafia details with members
   */
  const getMafiaDetails = useCallback(async (mafiaId: string): Promise<MafiaDetails> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet(`/api/mafias/${mafiaId}`);
      return response.mafia;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch mafia details';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new mafia
   */
  const createMafia = useCallback(
    async (data: {
      name: string;
      description: string;
      cover_image_url?: string;
      monthly_price: number;
      founding_member_limit?: number;
    }): Promise<Mafia> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiPost('/api/mafias', data);
        return response.mafia;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create mafia';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update mafia info (admin only)
   */
  const updateMafia = useCallback(
    async (
      mafiaId: string,
      data: {
        name?: string;
        description?: string;
        cover_image_url?: string;
        monthly_price?: number;
        status?: 'active' | 'inactive';
      }
    ): Promise<Mafia> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiPatch(`/api/mafias/${mafiaId}`, data);
        return response.mafia;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to update mafia';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deactivate mafia (admin only)
   */
  const deactivateMafia = useCallback(async (mafiaId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/mafias/${mafiaId}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to deactivate mafia';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate founding member invite link (admin only)
   */
  const generateFoundingLink = useCallback(
    async (mafiaId: string): Promise<{ invite_link: string; token: string; expires_at: string }> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiGet(`/api/mafias/${mafiaId}/generate-founding-link`);
        return {
          invite_link: response.invite_link,
          token: response.token,
          expires_at: response.expires_at,
        };
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to generate invite link';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Join as founding member via invite token
   */
  const joinAsFoundingMember = useCallback(async (token: string): Promise<MafiaMember> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiPost(`/api/mafias/join-founding/${token}`, {});
      return response.member;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to join mafia';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Join as paid member (deduct from wallet)
   */
  const joinAsPaidMember = useCallback(async (mafiaId: string): Promise<MafiaMember> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiPost(`/api/mafias/${mafiaId}/join-paid`, {});
      return response.member;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to join mafia';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Leave mafia
   */
  const leaveMafia = useCallback(async (mafiaId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/mafias/${mafiaId}/leave`, {});
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to leave mafia';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get revenue stats (admin and founding members only)
   */
  const getMafiaRevenue = useCallback(async (mafiaId: string): Promise<MafiaRevenue> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet(`/api/mafias/${mafiaId}/revenue`);
      return response.revenue;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch revenue';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getAllMafias,
    getMyMafias,
    getMafiaDetails,
    createMafia,
    updateMafia,
    deactivateMafia,
    generateFoundingLink,
    joinAsFoundingMember,
    joinAsPaidMember,
    leaveMafia,
    getMafiaRevenue,
  };
};

