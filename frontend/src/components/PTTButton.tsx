import { useState, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { useDailyCall } from './DailyCallProvider';

export function PTTButton() {
  const { sendAppMessage, botState } = useDailyCall();
  const [isPressed, setIsPressed] = useState(false);

  const isBotSpeaking = botState === 'speaking';
  const isDisabled = isBotSpeaking;

  const handlePressStart = useCallback(() => {
    if (isDisabled) return;

    setIsPressed(true);
    sendAppMessage({ type: 'ptt', active: true });
    console.log('🎤 PTT activated');
  }, [sendAppMessage, isDisabled]);

  const handlePressEnd = useCallback(() => {
    if (isDisabled) return;

    setIsPressed(false);
    sendAppMessage({ type: 'ptt', active: false });
    console.log('🔇 PTT deactivated');
  }, [sendAppMessage, isDisabled]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Instruction text */}
      <p className="text-sm text-white/80 font-medium">
        {isDisabled ? 'Bot is speaking...' : 'Hold to talk'}
      </p>

      {/* PTT Button */}
      <button
        type="button"
        disabled={isDisabled}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-150 select-none
          ${isPressed ? 'scale-110' : 'scale-100'}
          ${
            isDisabled
              ? 'bg-gray-500 cursor-not-allowed opacity-50'
              : isPressed
              ? 'bg-red-500 shadow-xl shadow-red-500/50 animate-pulse'
              : 'bg-primary hover:bg-primary/90 shadow-lg'
          }
        `}
        aria-label="Push to talk"
      >
        {/* Outer ring animation when pressed */}
        {isPressed && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
        )}

        {/* Mic icon */}
        <Mic className="w-10 h-10 text-white relative z-10" />
      </button>

      {/* Active indicator */}
      {isPressed && (
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-red-400 font-semibold">Recording...</span>
        </div>
      )}
    </div>
  );
}

