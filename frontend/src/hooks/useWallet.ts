import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  referenceId?: string; // Chain ID or Request ID
  createdAt: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wallet for new users
  const initializeWallet = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          currency: 'USD'
        })
        .select()
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (err) {
      console.error('Error initializing wallet:', err);
    }
  };

  // Fetch wallet data
  const fetchWallet = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Wallet doesn't exist, create one
          await initializeWallet();
          return;
        }
        throw error;
      }

      setWallet(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!wallet) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  // Add funds to wallet
  const addFunds = async (amount: number) => {
    if (!wallet) return;

    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + amount,
          total_earned: wallet.total_earned + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          type: 'credit',
          description: 'Funds added to wallet',
          status: 'completed'
        });

      await fetchWallet();
      await fetchTransactions();
    } catch (err) {
      throw err;
    }
  };

  // Process reward payment
  const processReward = async (chainId: string, amount: number) => {
    if (!wallet) return;

    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + amount,
          total_earned: wallet.total_earned + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          type: 'credit',
          description: `Reward from chain ${chainId}`,
          status: 'completed',
          reference_id: chainId
        });

      await fetchWallet();
      await fetchTransactions();
    } catch (err) {
      throw err;
    }
  };

  // Withdraw funds
  const withdrawFunds = async (amount: number, description: string) => {
    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient funds');
    }

    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - amount,
          total_spent: wallet.total_spent + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          type: 'debit',
          description,
          status: 'completed'
        });

      await fetchWallet();
      await fetchTransactions();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchWallet();
    }
  }, [user]);

  useEffect(() => {
    if (wallet) {
      fetchTransactions();
    }
  }, [wallet]);

  return {
    wallet,
    transactions,
    loading,
    error,
    addFunds,
    processReward,
    withdrawFunds,
    refreshWallet: fetchWallet
  };
};

