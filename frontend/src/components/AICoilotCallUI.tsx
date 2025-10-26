import { useState } from 'react';
import { Info } from 'lucide-react';
import { useDailyCall } from './DailyCallProvider';
import { VideoTile } from './VideoTile';
import { PTTButton } from './PTTButton';
import { BotStateIndicator } from './BotStateIndicator';
import { ApproveHandButton } from './ApproveHandButton';
import { CallContextSidebar } from './CallContextSidebar';
import { Button } from './ui/button';

interface AICoilotCallUIProps {
  callContext?: {
    buyerName?: string;
    sellerName?: string;
    targetName?: string;
    consultantName?: string;
    callTopic?: string;
    questions?: string[];
  };
}

export function AICoilotCallUI({ callContext }: AICoilotCallUIProps) {
  const { participants, meetingState } = useDailyCall();
  const [showContextSidebar, setShowContextSidebar] = useState(false);

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

          {/* Context button */}
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContextSidebar(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Info className="w-4 h-4 mr-2" />
              Call Context
            </Button>
          </div>
        </div>
      </div>

      {/* Hand-raise approval modal (overlay) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          <ApproveHandButton />
        </div>
      </div>

      {/* Context sidebar */}
      <CallContextSidebar
        isOpen={showContextSidebar}
        onClose={() => setShowContextSidebar(false)}
        context={callContext || {}}
      />
    </div>
  );
}
