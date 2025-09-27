import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

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
  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's credits from API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const creditsData = await response.json();
      setCredits(creditsData.total_credits || 0);

      // Get transaction history
      const transactionsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/transactions?limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData || []);
      }
    } catch (err) {
      setError('Failed to fetch credits');
      console.error('Error fetching credits:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Award credits to user
  const awardCredits = useCallback(async (
    amount: number,
    source: CreditTransaction['source'],
    description: string,
    chainId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/award`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          source,
          description,
          chain_id: chainId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to award credits');
      }

      // Refresh credits data
      await fetchCredits();
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/spend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          source,
          description,
          chain_id: chainId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to spend credits');
      }

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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/join-chain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chain_id: chainId,
          request_id: requestId,
          creator_id: 'placeholder' // This should be passed from the component
        })
      });

      if (!response.ok) {
        throw new Error('Failed to handle join chain credits');
      }

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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/credits/unlock-chain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chain_id: chainId,
          request_id: chainId, // Assuming chain_id is request_id for now
          credits_cost: cost
        })
      });

      if (!response.ok) {
        throw new Error('Failed to unlock chain');
      }

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
  }, [fetchCredits]);

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