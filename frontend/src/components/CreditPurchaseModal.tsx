import React, { useState } from 'react';
import { X, Coins, CreditCard } from 'lucide-react';
import { apiPost, API_ENDPOINTS } from '../lib/api';

interface CreditPackage {
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 100, price: 99 },
  { credits: 500, price: 449, bonus: 50, popular: true },
  { credits: 1000, price: 849, bonus: 150 },
  { credits: 2500, price: 1999, bonus: 500 }
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
      const totalCredits = selectedPackage.credits + (selectedPackage.bonus || 0);
      // Temporary: directly award credits without real payment
      await apiPost(API_ENDPOINTS.CREDITS_AWARD, {
        amount: totalCredits,
        source: 'bonus',
        description: `Manual grant via Purchase Now (${totalCredits} credits)`
      });

      onPurchaseSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Credits</h2>
            <p className="text-sm text-gray-600 mt-1">
              Current Balance: <span className="font-semibold text-indigo-600">{currentCredits} credits</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPackage === pkg
                    ? 'border-[#CBAA5A] bg-[#CBAA5A]/10'
                    : 'border-border hover:border-[#CBAA5A]/50'
                } ${pkg.popular ? 'ring-2 ring-[#CBAA5A]' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#CBAA5A] text-[#0B0E11] text-xs font-semibold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-center mb-4">
                  <Coins className="w-12 h-12 text-yellow-500" />
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {pkg.credits}
                    {pkg.bonus && (
                      <span className="text-lg text-green-600"> +{pkg.bonus}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">credits</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    ₹{pkg.price}
                  </div>
                  {pkg.bonus && (
                    <div className="text-xs text-green-600 font-medium mt-2">
                      {pkg.bonus} bonus credits
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
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Purchase Summary</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Credits:</span>
                <span className="font-semibold">
                  {selectedPackage.credits}
                  {selectedPackage.bonus && ` + ${selectedPackage.bonus} bonus`}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold">₹{selectedPackage.price}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total Credits:</span>
                  <span className="text-indigo-600">
                    {selectedPackage.credits + (selectedPackage.bonus || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!selectedPackage || isProcessing}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {isProcessing ? 'Processing...' : 'Purchase Now'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Credits are used to create connection requests.
              Participants in winning paths earn credits as rewards, while targets receive cash payouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
