import { useDailyCall } from './DailyCallProvider';
import { VideoTile } from './VideoTile';
import { PTTButton } from './PTTButton';
import { BotStateIndicator } from './BotStateIndicator';
import { ApproveHandButton } from './ApproveHandButton';
import { Loader2 } from 'lucide-react';

export function AICoilotCallUI() {
  const { meetingState, participants, error } = useDailyCall();

  // Handle loading state
  if (meetingState === 'new' || meetingState === 'joining-meeting') {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white text-lg font-medium">Joining call...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (meetingState === 'error') {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-red-500 text-5xl">⚠️</div>
          <h3 className="text-white text-xl font-semibold">Call Error</h3>
          <p className="text-gray-400">{error || 'An error occurred while connecting to the call'}</p>
        </div>
      </div>
    );
  }

  // Handle left meeting state
  if (meetingState === 'left-meeting') {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center space-y-4">
          <div className="text-4xl">👋</div>
          <p className="text-white text-lg font-medium">You left the call</p>
        </div>
      </div>
    );
  }

  // Get participants array
  const participantsList = Object.entries(participants);
  const localParticipant = participantsList.find(([id]) => id === 'local');
  const remoteParticipants = participantsList.filter(([id]) => id !== 'local');

  // Identify bot participant (assumes bot name contains "AI Co-Pilot" or "bot")
  const botParticipant = remoteParticipants.find(([, p]) => {
    if (!p) return false;
    const name = (p.user_name || '').toLowerCase();
    return name.includes('ai co-pilot') || name.includes('bot') || name.includes('copilot');
  });

  const otherParticipants = remoteParticipants.filter(([id]) => id !== botParticipant?.[0]);

  return (
    <div className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Grid */}
      <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
        {/* Local participant (you) */}
        {localParticipant && (
          <VideoTile
            participant={localParticipant[1]}
            isLocal={true}
            isBot={false}
          />
        )}

        {/* Bot participant */}
        {botParticipant && (
          <VideoTile
            participant={botParticipant[1]}
            isLocal={false}
            isBot={true}
          />
        )}

        {/* Other participants */}
        {otherParticipants.map(([id, participant]) => (
          <VideoTile
            key={id}
            participant={participant}
            isLocal={false}
            isBot={false}
          />
        ))}

        {/* Placeholder if only one participant */}
        {participantsList.length === 1 && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
            <p className="text-gray-400">Waiting for others to join...</p>
          </div>
        )}
      </div>

      {/* Bot State Indicator - Top Center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <BotStateIndicator />
      </div>

      {/* PTT Button - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <PTTButton />
      </div>

      {/* Approve Hand Modal */}
      <ApproveHandButton />
    </div>
  );
}

