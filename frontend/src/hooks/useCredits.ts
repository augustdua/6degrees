import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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

      // For now, we'll use localStorage to store credits
      // In production, this would be a database call
      const storedCredits = localStorage.getItem(`credits_${user.id}`);
      const storedTransactions = localStorage.getItem(`credit_transactions_${user.id}`);

      if (storedCredits) {
        setCredits(parseInt(storedCredits, 10));
      } else {
        // Initialize new user with starting credits
        setCredits(10);
        localStorage.setItem(`credits_${user.id}`, '10');
      }

      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
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
      const newTransaction: CreditTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: user.id,
        amount,
        type: 'earned',
        source,
        description,
        chainId,
        createdAt: new Date().toISOString()
      };

      const newCredits = credits + amount;
      const newTransactions = [newTransaction, ...transactions];

      setCredits(newCredits);
      setTransactions(newTransactions);

      // Store in localStorage (in production, this would be a database call)
      localStorage.setItem(`credits_${user.id}`, newCredits.toString());
      localStorage.setItem(`credit_transactions_${user.id}`, JSON.stringify(newTransactions));

      return true;
    } catch (err) {
      setError('Failed to award credits');
      console.error('Error awarding credits:', err);
      return false;
    }
  }, [user?.id, credits, transactions]);

  // Spend credits
  const spendCredits = useCallback(async (
    amount: number,
    source: CreditTransaction['source'],
    description: string,
    chainId?: string
  ): Promise<boolean> => {
    if (!user?.id || credits < amount) return false;

    try {
      const newTransaction: CreditTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: user.id,
        amount,
        type: 'spent',
        source,
        description,
        chainId,
        createdAt: new Date().toISOString()
      };

      const newCredits = credits - amount;
      const newTransactions = [newTransaction, ...transactions];

      setCredits(newCredits);
      setTransactions(newTransactions);

      // Store in localStorage (in production, this would be a database call)
      localStorage.setItem(`credits_${user.id}`, newCredits.toString());
      localStorage.setItem(`credit_transactions_${user.id}`, JSON.stringify(newTransactions));

      return true;
    } catch (err) {
      setError('Failed to spend credits');
      console.error('Error spending credits:', err);
      return false;
    }
  }, [user?.id, credits, transactions]);

  // Handle joining a chain (award credits)
  const handleJoinChain = useCallback(async (chainId: string): Promise<boolean> => {
    return await awardCredits(
      2, // 2 credits for joining a chain
      'join_chain',
      'Earned for joining a connection chain',
      chainId
    );
  }, [awardCredits]);

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
    return await spendCredits(
      cost,
      'unlock_chain',
      'Spent to unlock completed chain details',
      chainId
    );
  }, [spendCredits]);

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