import { useDailyCall } from './DailyCallProvider';
import { Ear, Radio, Loader2, Hand, Volume2 } from 'lucide-react';

export function BotStateIndicator() {
  const { botState } = useDailyCall();

  const getStateConfig = () => {
    switch (botState) {
      case 'passive_listening':
        return {
          label: 'Listening',
          icon: <Ear className="w-4 h-4" />,
          bgColor: 'bg-green-500/90',
          animation: 'animate-pulse',
        };
      case 'active_listening':
        return {
          label: 'Active Listening',
          icon: <Radio className="w-4 h-4" />,
          bgColor: 'bg-blue-500/90',
          animation: '',
        };
      case 'thinking':
        return {
          label: 'Thinking...',
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          bgColor: 'bg-yellow-500/90',
          animation: '',
        };
      case 'raised_hand':
        return {
          label: 'Hand Raised',
          icon: <Hand className="w-4 h-4" />,
          bgColor: 'bg-orange-500/90',
          animation: 'animate-bounce',
        };
      case 'speaking':
        return {
          label: 'Speaking',
          icon: <Volume2 className="w-4 h-4" />,
          bgColor: 'bg-red-500/90',
          animation: 'animate-pulse',
        };
      default:
        return {
          label: 'Idle',
          icon: <Ear className="w-4 h-4" />,
          bgColor: 'bg-gray-500/90',
          animation: '',
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm
        ${config.bgColor} ${config.animation}
        shadow-lg
      `}
    >
      <div className="text-white">{config.icon}</div>
      <span className="text-white text-sm font-semibold">{config.label}</span>
    </div>
  );
}

