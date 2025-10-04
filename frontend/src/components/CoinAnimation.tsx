import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  onComplete?: () => void;
}

export const CoinAnimation: React.FC<CoinAnimationProps> = ({ amount, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="coin-animation">
        <div className="coin-container">
          <Coins className="w-16 h-16 text-yellow-500" />
        </div>
        <div className="credit-amount">
          +{amount}
        </div>
      </div>

      <style>{`
        @keyframes coinFloat {
          0% {
            transform: translateY(0) scale(0.5) rotateY(0deg);
            opacity: 0;
          }
          20% {
            transform: translateY(-30px) scale(1) rotateY(180deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-40px) scale(1.1) rotateY(360deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-80px) scale(0.8) rotateY(540deg);
            opacity: 0;
          }
        }

        @keyframes textFadeIn {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          30% {
            transform: translateY(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0;
          }
        }

        .coin-animation {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .coin-container {
          animation: coinFloat 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          filter: drop-shadow(0 4px 12px rgba(234, 179, 8, 0.5));
        }

        .credit-amount {
          font-size: 2rem;
          font-weight: bold;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textFadeIn 2s ease-out forwards;
          text-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }
      `}</style>
    </div>
  );
};

interface CoinAnimationManagerProps {
  children: React.ReactNode;
}

interface CoinEvent {
  id: string;
  amount: number;
}

// Global coin animation queue
let coinQueue: CoinEvent[] = [];
let coinQueueListeners: Set<(queue: CoinEvent[]) => void> = new Set();

export const triggerCoinAnimation = (amount: number) => {
  const event: CoinEvent = {
    id: `coin-${Date.now()}-${Math.random()}`,
    amount
  };

  coinQueue = [...coinQueue, event];
  coinQueueListeners.forEach(listener => listener(coinQueue));

  // Auto-remove after animation
  setTimeout(() => {
    coinQueue = coinQueue.filter(e => e.id !== event.id);
    coinQueueListeners.forEach(listener => listener(coinQueue));
  }, 2100);
};

export const CoinAnimationManager: React.FC<CoinAnimationManagerProps> = ({ children }) => {
  const [animations, setAnimations] = useState<CoinEvent[]>([]);

  useEffect(() => {
    const listener = (queue: CoinEvent[]) => {
      setAnimations([...queue]);
    };

    coinQueueListeners.add(listener);
    return () => {
      coinQueueListeners.delete(listener);
    };
  }, []);

  return (
    <>
      {children}
      {animations.map((animation) => (
        <CoinAnimation
          key={animation.id}
          amount={animation.amount}
        />
      ))}
    </>
  );
};
