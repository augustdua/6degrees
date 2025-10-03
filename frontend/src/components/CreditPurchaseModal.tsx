import React, { useState } from 'react';
import { X, Coins, CreditCard, Sprout, TreeDeciduous, Trees } from 'lucide-react';

interface CreditPackage {
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
  tier: string;
  icon: 'sprout' | 'tree' | 'forest' | 'woodland';
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 100, price: 99, tier: 'Seedling', icon: 'sprout' },
  { credits: 500, price: 449, bonus: 50, popular: true, tier: 'Sapling', icon: 'tree' },
  { credits: 1000, price: 849, bonus: 150, tier: 'Tree', icon: 'tree' },
  { credits: 2500, price: 1999, bonus: 500, tier: 'Forest', icon: 'forest' }
];

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onPurchaseSuccess: () => void;
}

export const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  onPurchaseSuccess
}) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          credits_amount: selectedPackage.credits + (selectedPackage.bonus || 0),
          price_paid: selectedPackage.price,
          currency: 'INR',
          payment_method: 'card',
          payment_reference: `PURCHASE_${Date.now()}`
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to purchase credits');
      }

      onPurchaseSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'sprout':
        return <Sprout className="w-12 h-12 text-[#81B622]" />;
      case 'tree':
        return <TreeDeciduous className="w-12 h-12 text-[#59981A]" />;
      case 'forest':
        return <Trees className="w-12 h-12 text-[#3D550C]" />;
      default:
        return <Sprout className="w-12 h-12 text-[#81B622]" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-[#ECF87F]/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#81B622] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#3D550C] to-[#59981A] border-b-4 border-[#FFC857] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="w-7 h-7 text-[#FFC857]" />
              Grow Your Forest
            </h2>
            <p className="text-sm text-[#ECF87F] mt-1 font-medium">
              Current Leaves: <span className="font-bold text-[#FFC857]">{currentCredits}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Packages */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.credits}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative border-3 rounded-2xl p-6 cursor-pointer transition-all transform hover:scale-105 ${
                  selectedPackage === pkg
                    ? 'border-[#81B622] bg-gradient-to-br from-[#ECF87F]/30 to-[#81B622]/10 shadow-xl'
                    : 'border-[#59981A] bg-white hover:border-[#81B622] hover:shadow-lg'
                } ${pkg.popular ? 'ring-4 ring-[#FFC857] shadow-2xl' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#FFC857] to-[#ECF87F] text-[#3D550C] text-xs font-bold px-4 py-1 rounded-full shadow-lg border-2 border-[#81B622]">
                      🌟 BEST VALUE
                    </span>
                  </div>
                )}

                <div className="flex flex-col items-center justify-center mb-4">
                  {getIcon(pkg.icon)}
                  <span className="text-xs font-bold text-[#59981A] mt-2 uppercase tracking-wide">
                    {pkg.tier}
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-extrabold text-[#3D550C] mb-1">
                    {pkg.credits}
                    {pkg.bonus && (
                      <span className="text-lg text-[#81B622]"> +{pkg.bonus}</span>
                    )}
                  </div>
                  <div className="text-sm text-[#59981A] mb-3 font-semibold">leaves</div>
                  <div className="text-3xl font-bold text-[#FFC857]">
                    ₹{pkg.price}
                  </div>
                  {pkg.bonus && (
                    <div className="text-xs text-[#81B622] font-bold mt-2 bg-[#ECF87F]/50 rounded-full px-3 py-1">
                      +{pkg.bonus} bonus leaves!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Selected Package Info */}
          {selectedPackage && (
            <div className="bg-gradient-to-br from-[#ECF87F]/40 to-[#FFC857]/20 rounded-xl p-5 mb-6 border-2 border-[#81B622] shadow-lg">
              <h3 className="font-bold text-[#3D550C] mb-3 flex items-center gap-2 text-lg">
                <TreeDeciduous className="w-5 h-5 text-[#81B622]" />
                Growth Summary
              </h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#59981A] font-medium">Leaves:</span>
                <span className="font-bold text-[#3D550C]">
                  {selectedPackage.credits}
                  {selectedPackage.bonus && ` + ${selectedPackage.bonus} bonus`}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#59981A] font-medium">Investment:</span>
                <span className="font-bold text-[#FFC857]">₹{selectedPackage.price}</span>
              </div>
              <div className="border-t-2 border-[#81B622] pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#3D550C]">Total Growth:</span>
                  <span className="text-2xl font-extrabold text-[#81B622]">
                    {selectedPackage.credits + (selectedPackage.bonus || 0)} leaves
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-[#59981A] text-[#3D550C] rounded-lg font-bold hover:bg-[#59981A]/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!selectedPackage || isProcessing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#81B622] to-[#59981A] text-white rounded-lg font-bold hover:from-[#59981A] hover:to-[#81B622] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {isProcessing ? 'Planting...' : 'Plant Seeds'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#ECF87F]/30 to-[#81B622]/10 rounded-xl border-2 border-[#81B622]">
            <p className="text-sm text-[#3D550C] font-medium">
              <strong className="text-[#59981A]">🌱 How it grows:</strong> Leaves are used to plant connection requests.
              Helpers in your network earn leaves, while targets receive cash rewards. Watch your forest flourish!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
