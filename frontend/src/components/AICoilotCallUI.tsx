import { useDailyCall } from './DailyCallProvider';
import { VideoTile } from './VideoTile';
import { PTTButton } from './PTTButton';
import { BotStateIndicator } from './BotStateIndicator';
import { ApproveHandButton } from './ApproveHandButton';

export function AICoilotCallUI() {
  const { participants, meetingState } = useDailyCall();

  if (meetingState === 'error') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold">Connection Error</p>
          <p className="text-gray-400 text-sm mt-2">
            Failed to join the call. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (meetingState !== 'joined-meeting') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-white text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  const participantList = Object.values(participants);
  const localParticipant = participantList.find((p) => p.local);
  const remoteParticipants = participantList.filter((p) => !p.local);

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      {/* Video grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto">
        {/* Local participant */}
        {localParticipant && (
          <VideoTile
            participant={localParticipant}
            isLocal={true}
            isBot={false}
          />
        )}

        {/* Remote participants */}
        {remoteParticipants.map((participant) => {
          const isBot = participant.user_name?.includes('AI Co-Pilot') || 
                       participant.user_name?.includes('Bot');
          return (
            <VideoTile
              key={participant.session_id}
              participant={participant}
              isLocal={false}
              isBot={isBot}
            />
          );
        })}
      </div>

      {/* Bottom controls bar */}
      <div className="flex-shrink-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Bot state indicator */}
          <div className="flex-shrink-0">
            <BotStateIndicator />
          </div>

          {/* PTT button (center) */}
          <div className="flex-shrink-0">
            <PTTButton />
          </div>

          {/* Spacer for balance */}
          <div className="w-48" />
        </div>
      </div>

      {/* Hand-raise approval modal (overlay) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          <ApproveHandButton />
        </div>
      </div>
    </div>
  );
}
