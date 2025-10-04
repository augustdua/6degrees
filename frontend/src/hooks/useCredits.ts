import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiGet, apiPost, API_ENDPOINTS } from '../lib/api';
import { triggerCoinAnimation } from '../components/CoinAnimation';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent';
  source: 'join_chain' | 'others_joined' | 'unlock_chain' | 'bonus';
  description: string;
  chainId?: string;
  createdAt: string;
}

export interface UserCredits {
  userId: string;
  totalCredits: number;
  earnedCredits: number;
  spentCredits: number;
  lastUpdated: string;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's current credit balance
  const fetchCredits = useCallback(async (showAnimation = false) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const previousCredits = credits;

      // Get user's credits from API
      const creditsData = await apiGet(API_ENDPOINTS.CREDITS_BALANCE);
      const newCredits = creditsData.total_credits || 0;
      setCredits(newCredits);

      // Show coin animation if credits increased
      if (showAnimation && newCredits > previousCredits) {
        const creditsDiff = newCredits - previousCredits;
        triggerCoinAnimation(creditsDiff);
      }

      // Get transaction history
      try {
        const transactionsData = await apiGet(`${API_ENDPOINTS.CREDITS_TRANSACTIONS}?limit=100`);
        setTransactions(transactionsData || []);
      } catch (err) {
        // Transactions are optional, don't fail the whole request
        console.warn('Failed to fetch transactions:', err);
      }
    } catch (err) {
      setError('Failed to fetch credits');
      console.error('Error fetching credits:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, credits]);

  // Award credits to user
  const awardCredits = useCallback(async (
    amount: number,
    source: CreditTransaction['source'],
    description: string,
    chainId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await apiPost(API_ENDPOINTS.CREDITS_AWARD, {
        amount,
        source,
        description,
        chain_id: chainId
      });

      // Show coin animation
      triggerCoinAnimation(amount);

      // Refresh credits data
      await fetchCredits(true);
      return true;
    } catch (err) {
      setError('Failed to award credits');
      console.error('Error awarding credits:', err);
      return false;
    }
  }, [user?.id, fetchCredits]);

  // Spend credits
  const spendCredits = useCallback(async (
    amount: number,
    source: CreditTransaction['source'],
    description: string,
    chainId?: string
  ): Promise<boolean> => {
    if (!user?.id || credits < amount) return false;

    try {
      await apiPost(API_ENDPOINTS.CREDITS_SPEND, {
        amount,
        source,
        description,
        chain_id: chainId
      });

      // Refresh credits data
      await fetchCredits();
      return true;
    } catch (err) {
      setError('Failed to spend credits');
      console.error('Error spending credits:', err);
      return false;
    }
  }, [user?.id, credits, fetchCredits]);

  // Handle joining a chain (award credits)
  const handleJoinChain = useCallback(async (chainId: string, requestId?: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await apiPost(API_ENDPOINTS.CREDITS_JOIN_CHAIN, {
        chain_id: chainId,
        request_id: requestId,
        creator_id: 'placeholder' // This should be passed from the component
      });

      // Refresh credits data
      await fetchCredits();
      return true;
    } catch (err) {
      console.error('Error handling join chain credits:', err);
      return false;
    }
  }, [user?.id, fetchCredits]);

  // Handle when someone joins user's chain (award credits)
  const handleOthersJoined = useCallback(async (chainId: string, joinerName: string): Promise<boolean> => {
    return await awardCredits(
      3, // 3 credits when someone joins your chain
      'others_joined',
      `Earned when ${joinerName} joined your chain`,
      chainId
    );
  }, [awardCredits]);

  // Handle unlocking a completed chain (spend credits)
  const handleUnlockChain = useCallback(async (chainId: string, cost: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await apiPost(API_ENDPOINTS.CREDITS_UNLOCK_CHAIN, {
        chain_id: chainId,
        request_id: chainId, // Assuming chain_id is request_id for now
        credits_cost: cost
      });

      // Refresh credits data
      await fetchCredits();
      return true;
    } catch (err) {
      console.error('Error unlocking chain:', err);
      return false;
    }
  }, [user?.id, fetchCredits]);

  // Calculate credits from transactions
  const getTransactionSummary = useCallback(() => {
    const earned = transactions
      .filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = transactions
      .filter(t => t.type === 'spent')
      .reduce((sum, t) => sum + t.amount, 0);

    return { earned, spent, total: earned - spent };
  }, [transactions]);

  useEffect(() => {
    fetchCredits();
  }, [user?.id]); // Only depend on user.id, not fetchCredits

  return {
    credits,
    transactions,
    loading,
    error,
    awardCredits,
    spendCredits,
    handleJoinChain,
    handleOthersJoined,
    handleUnlockChain,
    getTransactionSummary,
    refetch: fetchCredits
  };
};