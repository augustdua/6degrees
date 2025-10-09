import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPost } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = '/api/connector';

interface PathStep {
  step: number;
  profession: string;
  explanation: string;
}

interface GameState {
  myJob: string;
  myJobDescription: string;
  targetJob: string;
  targetJobDescription: string;
  path: PathStep[];
  isLoading: boolean;
  gameStatus: 'input' | 'result';
}

export function ConnectorGameSimple() {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>({
    myJob: '',
    myJobDescription: '',
    targetJob: '',
    targetJobDescription: '',
    path: [],
    isLoading: false,
    gameStatus: 'input'
  });
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const findPath = async () => {
    if (!gameState.myJob.trim() || !gameState.targetJob.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both your job and target job.",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await apiPost(`${API_BASE}/find-path`, {
        myJob: gameState.myJob.trim(),
        myJobDescription: gameState.myJobDescription.trim() || undefined,
        targetJob: gameState.targetJob.trim(),
        targetJobDescription: gameState.targetJobDescription.trim() || undefined
      });

      setGameState(prev => ({
        ...prev,
        path: response.path,
        isLoading: false,
        gameStatus: 'result'
      }));
    } catch (error: any) {
      console.error('Error finding path:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to find path. Please try again.",
        variant: "destructive"
      });
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const startOver = () => {
    setGameState({
      myJob: '',
      myJobDescription: '',
      targetJob: '',
      targetJobDescription: '',
      path: [],
      isLoading: false,
      gameStatus: 'input'
    });
  };

  return (
    <div className="connector-game-container">
      {/* How to Play Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50 rounded-full w-12 h-12 md:w-14 md:h-14"
        onClick={() => setShowHowToPlay(true)}
      >
        <HelpCircle className="w-6 h-6" />
      </Button>

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {gameState.gameStatus === 'input' && (
        <InputScreen
          gameState={gameState}
          setGameState={setGameState}
          onFindPath={findPath}
        />
      )}

      {gameState.gameStatus === 'result' && (
        <ResultScreen
          gameState={gameState}
          onStartOver={startOver}
        />
      )}
    </div>
  );
}

// Input Screen Component
function InputScreen({ gameState, setGameState, onFindPath }: any) {
  const myJobWordCount = gameState.myJobDescription.trim().split(/\s+/).filter((w: string) => w).length;
  const targetJobWordCount = gameState.targetJobDescription.trim().split(/\s+/).filter((w: string) => w).length;
  const MAX_WORDS = 30;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          🔗 Find Your Connection Path
        </h2>
        <p className="text-center text-muted-foreground">
          Let AI discover the networking path between any two professions
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* My Job Section */}
        <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <Label className="text-lg font-semibold">Your Job</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="my-job" className="text-sm">Job Title *</Label>
            <Textarea
              id="my-job"
              placeholder="e.g., Mathematician"
              value={gameState.myJob}
              onChange={(e) => setGameState((prev: any) => ({ ...prev, myJob: e.target.value }))}
              className="min-h-[60px] resize-none bg-background"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="my-job-desc" className="text-sm">
              What you do <span className="text-muted-foreground">(optional, 1-2 lines)</span>
            </Label>
            <Textarea
              id="my-job-desc"
              placeholder="e.g., Build optimization models for complex systems and analyze algorithmic efficiency"
              value={gameState.myJobDescription}
              onChange={(e) => {
                const words = e.target.value.trim().split(/\s+/).filter(w => w);
                if (words.length <= MAX_WORDS) {
                  setGameState((prev: any) => ({ ...prev, myJobDescription: e.target.value }));
                }
              }}
              className="min-h-[80px] resize-none bg-background"
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              <span className={myJobWordCount > MAX_WORDS ? 'text-destructive' : ''}>
                {myJobWordCount}/{MAX_WORDS} words
              </span>
            </div>
          </div>
        </div>

        {/* Arrow Separator */}
        <div className="flex justify-center">
          <div className="p-3 bg-muted rounded-full">
            <ChevronRight className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Target Job Section */}
        <div className="space-y-3 p-4 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" />
            <Label className="text-lg font-semibold">Person You Want to Connect With</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-job" className="text-sm">Their Job Title *</Label>
            <Textarea
              id="target-job"
              placeholder="e.g., Hotel Owner"
              value={gameState.targetJob}
              onChange={(e) => setGameState((prev: any) => ({ ...prev, targetJob: e.target.value }))}
              className="min-h-[60px] resize-none bg-background"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-job-desc" className="text-sm">
              What they do <span className="text-muted-foreground">(optional, 1-2 lines)</span>
            </Label>
            <Textarea
              id="target-job-desc"
              placeholder="e.g., Manage hotel operations, oversee procurement, and work with suppliers"
              value={gameState.targetJobDescription}
              onChange={(e) => {
                const words = e.target.value.trim().split(/\s+/).filter(w => w);
                if (words.length <= MAX_WORDS) {
                  setGameState((prev: any) => ({ ...prev, targetJobDescription: e.target.value }));
                }
              }}
              className="min-h-[80px] resize-none bg-background"
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              <span className={targetJobWordCount > MAX_WORDS ? 'text-destructive' : ''}>
                {targetJobWordCount}/{MAX_WORDS} words
              </span>
            </div>
          </div>
        </div>

        {/* Find Path Button */}
        <Button
          onClick={onFindPath}
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          disabled={gameState.isLoading || !gameState.myJob.trim() || !gameState.targetJob.trim()}
        >
          {gameState.isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Finding Your Path...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Find Connection Path
            </>
          )}
        </Button>

        {/* Info Footer */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
          💡 Our AI will analyze the professional relationships and find the optimal networking path
        </div>
      </CardContent>
    </Card>
  );
}

// Result Screen Component
function ResultScreen({ gameState, onStartOver }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card>
        <CardHeader>
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            🎯 Your Networking Path
          </h2>
          <p className="text-center text-muted-foreground">
            From <span className="font-semibold text-primary">{gameState.myJob}</span> to{' '}
            <span className="font-semibold text-green-600">{gameState.targetJob}</span>
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Path Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-sm">
                {gameState.path.length} Steps
              </Badge>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {gameState.path.map((step: PathStep, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex gap-4 p-4 rounded-xl border ${
                    index === 0
                      ? 'bg-primary/10 border-primary/30'
                      : index === gameState.path.length - 1
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-muted border-border'
                  }`}
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-primary text-primary-foreground'
                        : index === gameState.path.length - 1
                        ? 'bg-green-600 text-white'
                        : 'bg-muted-foreground/20 text-foreground'
                    }`}>
                      {step.step}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{step.profession}</h3>
                    <p className="text-sm text-muted-foreground">{step.explanation}</p>
                  </div>

                  {/* Arrow */}
                  {index < gameState.path.length - 1 && (
                    <div className="flex-shrink-0 flex items-center">
                      <ChevronRight className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button onClick={onStartOver} size="lg" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another Path
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// How to Play Modal Component
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">🎮 How to Use Connector</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-lg mb-2">📖 About the Tool</h3>
            <p className="text-muted-foreground">
              <strong>Connector</strong> uses AI to discover professional networking paths between any two
              careers. It analyzes how different professions interact and finds the optimal steps to
              connect them.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Enter Your Job:</strong> Add your job title and optionally describe what you do
                (1-2 lines, max 30 words)
              </li>
              <li>
                <strong>Enter Target Person's Job:</strong> Add their job title and optionally what they
                do (1-2 lines, max 30 words)
              </li>
              <li>
                <strong>Click "Find Connection Path":</strong> Our AI will analyze and generate the
                optimal networking path
              </li>
              <li>
                <strong>Review the Path:</strong> See each step with explanations of how professions
                interact
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">💡 Example</h3>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <p className="font-semibold text-sm mb-1">Your Job: Mathematician</p>
                <p className="text-xs text-muted-foreground">
                  Build optimization models for logistics
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Target: Hotel Owner</p>
                <p className="text-xs text-muted-foreground">
                  Oversees procurement and operations
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="font-semibold text-xs mb-2">AI-Generated Path:</p>
                <ol className="text-xs space-y-1 text-muted-foreground">
                  <li>1. Mathematician → 2. Supply Chain Planner → 3. Hotel Procurement Officer → 4. Hotel Owner</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">✨ Tips</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Job descriptions help AI find more accurate paths</li>
              <li>Keep descriptions concise (1-2 lines, max 30 words)</li>
              <li>More context = better networking path suggestions</li>
            </ul>
          </div>

          <Button onClick={onClose} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
