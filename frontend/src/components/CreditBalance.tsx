import React, { useEffect, useState } from 'react';
import { Coins, Plus, TrendingUp, Sprout } from 'lucide-react';

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
      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
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
      <div className="flex items-center gap-2 bg-gradient-to-br from-[#FFC857] to-[#ECF87F] px-4 py-2 rounded-lg border-2 border-[#FFC857] shadow-sm">
        <Coins className="w-5 h-5 text-[#3D550C]" />
        <div>
          <div className="text-sm font-bold text-[#3D550C]">
            {credits?.total_credits || 0}
          </div>
          <div className="text-xs font-medium text-[#59981A]">leaves</div>
        </div>
      </div>

      {showPurchaseButton && (
        <button
          onClick={onPurchaseClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#81B622] text-white rounded-lg hover:bg-[#59981A] transition-all font-semibold text-sm shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Grow Forest
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
      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
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
    <div className="bg-gradient-to-br from-[#3D550C] via-[#59981A] to-[#81B622] rounded-xl shadow-xl p-6 text-white relative overflow-hidden">
      {/* Decorative tree pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <Sprout className="absolute top-2 right-2 w-32 h-32 rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-[#FFC857]" />
            <h3 className="font-bold text-lg">Your Forest</h3>
          </div>
          {onPurchaseClick && (
            <button
              onClick={onPurchaseClick}
              className="p-2 bg-[#FFC857] hover:bg-[#ECF87F] rounded-lg transition-all shadow-md text-[#3D550C]"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="text-5xl font-bold mb-1 text-[#ECF87F]">{credits?.total_credits || 0}</div>
          <div className="text-sm opacity-90 font-medium">Growth Leaves Available</div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/30">
          <div>
            <div className="text-sm opacity-75 mb-1">Harvested</div>
            <div className="text-2xl font-bold flex items-center gap-1 text-[#ECF87F]">
              <TrendingUp className="w-5 h-5" />
              {credits?.earned_credits || 0}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-75 mb-1">Planted</div>
            <div className="text-2xl font-bold text-[#FFC857]">{credits?.spent_credits || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
