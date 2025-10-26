import { X, Info, Users, MessageSquare, Target, History } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useDailyCall } from './DailyCallProvider';

interface CallContextSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    buyerName?: string;
    sellerName?: string;
    targetName?: string;
    consultantName?: string;
    callTopic?: string;
    questions?: string[];
  };
}

export function CallContextSidebar({ isOpen, onClose, context }: CallContextSidebarProps) {
  const { conversationHistory, totalUtterances } = useDailyCall();
  
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-700">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">AI Context</h2>
                <p className="text-gray-400 text-xs">Live conversation tracking</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {/* Conversation History - First! */}
            {conversationHistory && conversationHistory.length > 0 && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <History className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">Live Conversation</h3>
                    <p className="text-gray-400 text-xs">{totalUtterances} messages tracked</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                  {conversationHistory.map((msg, index) => {
                    const role = (msg.speaker_role || '').toLowerCase();
                    const text = msg.text || '';
                    const isBot = msg.is_bot || false;
                    const isQuestion = msg.is_question || false;
                    const conversationState = msg.conversation_state || '';
                    
                    // Determine color scheme and emoji based on JSON metadata (no text parsing!)
                    let roleColor = 'border-purple-500/50 bg-purple-500/5'; // default: user
                    let roleEmoji = '👤';
                    
                    if (role === 'consultant' || role === 'target') {
                      // Consultant utterance
                      roleColor = 'border-green-500/50 bg-green-500/5';
                      roleEmoji = '👨‍🏫';
                    } else if (isBot) {
                      // Bot utterance - check if passive listening or active response
                      if (conversationState === 'passive_listening') {
                        // Passive analysis - distinguish question vs summary
                        if (isQuestion) {
                          roleColor = 'border-pink-500/50 bg-pink-500/5';
                          roleEmoji = '❓';
                        } else {
                          roleColor = 'border-orange-500/50 bg-orange-500/5';
                          roleEmoji = '🧠';
                        }
                      } else {
                        // Active response (PTT reply)
                        roleColor = 'border-blue-500/50 bg-blue-500/5';
                        roleEmoji = '🤖';
                      }
                    } else {
                      // User utterance (buyer/broker)
                      roleColor = 'border-purple-500/50 bg-purple-500/5';
                      roleEmoji = '👤';
                    }
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border-l-2 ${roleColor}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-xs font-semibold">
                            {roleEmoji} {msg.speaker_name}
                          </span>
                          <span className="text-gray-500 text-xs uppercase">
                            {msg.speaker_role}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Call Topic */}
            {context.callTopic && (
              <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm mb-1">Call Topic</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{context.callTopic}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">Participants</h3>
                  <p className="text-gray-400 text-xs">Known to the AI</p>
                </div>
              </div>
              
              <div className="space-y-2 mt-3">
                {context.buyerName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs">Buyer</p>
                      <p className="text-white text-sm font-medium">{context.buyerName}</p>
                    </div>
                  </div>
                )}
                
                {context.sellerName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs">Seller</p>
                      <p className="text-white text-sm font-medium">{context.sellerName}</p>
                    </div>
                  </div>
                )}
                
                {context.targetName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs">Consultant</p>
                      <p className="text-white text-sm font-medium">{context.targetName}</p>
                    </div>
                  </div>
                )}

                {context.consultantName && context.consultantName !== context.targetName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs">Broker</p>
                      <p className="text-white text-sm font-medium">{context.consultantName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Questions */}
            {context.questions && context.questions.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">Prepared Questions</h3>
                    <p className="text-gray-400 text-xs">For the AI to address</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3">
                  {context.questions.filter(q => q && q.trim()).map((question, index) => (
                    <div key={index} className="p-3 rounded-lg bg-gray-700/30 border-l-2 border-purple-500/50">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400 font-semibold text-xs mt-0.5">Q{index + 1}</span>
                        <p className="text-gray-300 text-sm leading-relaxed flex-1">{question}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info footer */}
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <p className="text-blue-300 text-xs leading-relaxed">
                💡 The AI Co-Pilot uses this information to provide relevant guidance and moderate the conversation effectively.
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

