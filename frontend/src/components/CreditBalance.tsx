import React, { useEffect, useState } from 'react';
import { Coins, Plus, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface CreditBalanceProps {
  onPurchaseClick?: () => void;
  showPurchaseButton?: boolean;
}

interface UserCredits {
  total_credits: number;
  earned_credits: number;
  spent_credits: number;
}

export const CreditBalance: React.FC<CreditBalanceProps> = ({
  onPurchaseClick,
  showPurchaseButton = true
}) => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    try {
      const data = await apiGet('/api/credits/balance');
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 px-4 h-10 rounded-lg border border-yellow-200">
        <Coins className="w-5 h-5 text-yellow-600" />
        <div className="flex items-baseline gap-1">
          <div className="text-sm font-semibold text-gray-900">
            {credits?.total_credits || 0}
          </div>
          <span className="text-xs text-gray-600">credits</span>
        </div>
      </div>

      {showPurchaseButton && (
        <button
          onClick={onPurchaseClick}
          className="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Buy Credits
        </button>
      )}
    </div>
  );
};

export const CreditBalanceCard: React.FC<{ onPurchaseClick?: () => void }> = ({ onPurchaseClick }) => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    try {
      const data = await apiGet('/api/credits/balance');
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6" />
          <h3 className="font-semibold">Credit Balance</h3>
        </div>
        {onPurchaseClick && (
          <button
            onClick={onPurchaseClick}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold mb-1">{credits?.total_credits || 0}</div>
        <div className="text-sm opacity-90">Available Credits</div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
        <div>
          <div className="text-sm opacity-75">Earned</div>
          <div className="text-xl font-semibold flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {credits?.earned_credits || 0}
          </div>
        </div>
        <div>
          <div className="text-sm opacity-75">Spent</div>
          <div className="text-xl font-semibold">{credits?.spent_credits || 0}</div>
        </div>
      </div>
    </div>
  );
};
