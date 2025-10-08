import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Heart, HelpCircle, ChevronRight, RefreshCw, Home, ArrowLeft, Plus, Star, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = '/api/connector';

interface Job {
  id: number;
  title: string;
  industry: string;
  sector: string;
}

interface JobDetails {
  id: number;
  title: string;
  industry: string;
  sector: string;
  description: string;
  keySkills: string;
  responsibilities: string;
}

interface GameState {
  level: null;
  currentNode: Job | null;
  targetNode: Job | null;
  choices: Job[];
  hearts: number;
  stepsTaken: number;
  score: number;
  gameStatus: 'select-start' | 'select-target' | 'playing' | 'won' | 'lost';
  optimalPathLength: number;
}

export function ConnectorGame() {
  const { toast } = useToast();
  const [myJob, setMyJob] = useState<Job | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    level: null,
    currentNode: null,
    targetNode: null,
    choices: [],
    hearts: 3,
    stepsTaken: 0,
    score: 1000,
    gameStatus: 'select-start',
    optimalPathLength: 0
  });

  const [correctChoice, setCorrectChoice] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsLoadError, setJobsLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isProcessingJob, setIsProcessingJob] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [completePath, setCompletePath] = useState<Job[]>([]);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobDetails | null>(null);
  const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);

  // Fetch all available jobs on mount
  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  const fetchAvailableJobs = async () => {
    setIsLoadingJobs(true);
    setJobsLoadError(null);
    try {
      const response = await apiGet(`${API_BASE}/jobs/all`);
      setAvailableJobs(response.jobs || []);
      setJobsLoadError(null);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      const errorMsg = error?.message || 'Failed to load jobs from server';
      setJobsLoadError(errorMsg);
      toast({
        title: "Error",
        description: "Failed to load jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const fetchJobDetails = async (jobId: number) => {
    setIsLoadingJobDetails(true);
    setShowJobDetails(true);
    try {
      const details = await apiGet(`${API_BASE}/jobs/${jobId}`);
      setSelectedJobDetails(details);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast({
        title: "Error",
        description: "Failed to load job details.",
        variant: "destructive"
      });
      setShowJobDetails(false);
    } finally {
      setIsLoadingJobDetails(false);
    }
  };

  const selectMyJob = (job: Job) => {
    setMyJob(job);
    setSearchQuery('');
    setGameState(prev => ({ ...prev, gameStatus: 'select-target' }));
  };

  const changeMyJob = () => {
    setMyJob(null);
    setSearchQuery('');
    setGameState(prev => ({ ...prev, gameStatus: 'select-start' }));
  };

  const selectTargetJob = async (job: Job) => {
    if (!myJob) return;

    try {
      const pathResponse = await apiPost(`${API_BASE}/level/calculate-path`, {
        startId: myJob.id,
        targetId: job.id
      });

      setGameState({
        level: null,
        currentNode: myJob,
        targetNode: job,
        choices: [],
        hearts: 3,
        stepsTaken: 0,
        score: 1000,
        gameStatus: 'playing',
        optimalPathLength: pathResponse.pathLength
      });

      setCompletePath([myJob]);
      fetchChoices(myJob.id, job.id);
      setSearchQuery('');
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive"
      });
    }
  };

  const playAgain = () => {
    setSearchQuery('');
    setCompletePath([]);
    setGameState(prev => ({ ...prev, gameStatus: 'select-target' }));
  };

  const fetchChoices = async (currentNodeId: number, targetNodeId: number) => {
    try {
      const response = await apiPost(`${API_BASE}/level/choices`, {
        currentNodeId,
        targetNodeId
      });

      if (response.reachedTarget) {
        setGameState(prev => ({ ...prev, gameStatus: 'won' }));
        return;
      }

      setGameState(prev => ({ ...prev, choices: response.choices }));
      setCorrectChoice(response.correct);
    } catch (error) {
      console.error('Error fetching choices:', error);
    }
  };

  const handleChoice = async (chosenNode: Job) => {
    const isCorrect = chosenNode.id === correctChoice;

    if (isCorrect) {
      setShowFeedback('correct');
      setWrongChoice(null);
      setShowCorrectAnswer(false);

      setTimeout(() => {
        setShowFeedback(null);
        setCompletePath(prev => [...prev, chosenNode]);

        if (chosenNode.id === gameState.targetNode?.id) {
          setGameState(prev => ({ ...prev, gameStatus: 'won' }));
          return;
        }

        setGameState(prev => ({
          ...prev,
          currentNode: chosenNode,
          stepsTaken: prev.stepsTaken + 1,
          score: prev.score + 50
        }));

        if (gameState.targetNode) {
          fetchChoices(chosenNode.id, gameState.targetNode.id);
        }
      }, 1000);
    } else {
      setShowFeedback('wrong');
      setWrongChoice(chosenNode.id);
      setShowCorrectAnswer(true);

      const newHearts = gameState.hearts - 1;

      if (newHearts === 0) {
        setTimeout(() => {
          setGameState(prev => ({ ...prev, hearts: 0, gameStatus: 'lost' }));
        }, 1500);
      } else {
        setGameState(prev => ({
          ...prev,
          hearts: newHearts,
          score: Math.max(0, prev.score - 100)
        }));
      }
    }
  };

  const tryAgain = () => {
    setShowFeedback(null);
    setWrongChoice(null);
    setShowCorrectAnswer(false);
  };

  const handleAddJob = async () => {
    if (!newJobTitle.trim()) return;

    setIsProcessingJob(true);
    setProcessingProgress(0);

    try {
      const response = await apiPost(`${API_BASE}/jobs/add`, {
        jobTitle: newJobTitle
      });

      const { jobId, job } = response;

      if (job) {
        setShowAddJobModal(false);
        setNewJobTitle('');
        setIsProcessingJob(false);
        selectMyJob(job);
        return;
      }

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiGet(`${API_BASE}/jobs/status/${jobId}`);
          const { progress, status, job: completedJob, error } = statusResponse;

          setProcessingProgress(progress);

          if (error) {
            clearInterval(pollInterval);
            toast({
              title: "Error",
              description: status,
              variant: "destructive"
            });
            setIsProcessingJob(false);
            setProcessingProgress(0);
          } else if (progress === 100 && completedJob) {
            clearInterval(pollInterval);
            await fetchAvailableJobs();
            setShowAddJobModal(false);
            setNewJobTitle('');
            setIsProcessingJob(false);
            setProcessingProgress(0);
            selectMyJob(completedJob);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error adding job:', error);
      toast({
        title: "Error",
        description: "Failed to add job. Please try again.",
        variant: "destructive"
      });
      setIsProcessingJob(false);
      setProcessingProgress(0);
    }
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

      {gameState.gameStatus === 'select-start' && (
        <JobSelectionScreen
          title="What's your job?"
          subtitle="Search and select your profession"
          jobs={availableJobs}
          isLoading={isLoadingJobs}
          loadError={jobsLoadError}
          onRetry={fetchAvailableJobs}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelect={selectMyJob}
          onAddJob={() => setShowAddJobModal(true)}
          onViewDetails={fetchJobDetails}
        />
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {showJobDetails && (
        <JobDetailsModal
          jobDetails={selectedJobDetails}
          isLoading={isLoadingJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJobDetails(null);
          }}
        />
      )}

      {showAddJobModal && (
        <AddJobModal
          newJobTitle={newJobTitle}
          setNewJobTitle={setNewJobTitle}
          onAdd={handleAddJob}
          onCancel={() => {
            setShowAddJobModal(false);
            setNewJobTitle('');
          }}
          isProcessing={isProcessingJob}
          progress={processingProgress}
        />
      )}

      {gameState.gameStatus === 'select-target' && myJob && (
        <JobSelectionScreen
          title="Who do you want to connect with?"
          subtitle="Choose a profession to network towards"
          jobs={availableJobs}
          isLoading={isLoadingJobs}
          loadError={jobsLoadError}
          onRetry={fetchAvailableJobs}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelect={selectTargetJob}
          currentJob={myJob}
          onChangeJob={changeMyJob}
          onViewDetails={fetchJobDetails}
        />
      )}

      {gameState.gameStatus === 'playing' && (
        <GameScreen
          gameState={gameState}
          onChoice={handleChoice}
          showFeedback={showFeedback}
          correctChoice={correctChoice}
          wrongChoice={wrongChoice}
          showCorrectAnswer={showCorrectAnswer}
          onTryAgain={tryAgain}
        />
      )}

      {gameState.gameStatus === 'won' && (
        <WinScreen
          gameState={gameState}
          completePath={completePath}
          onPlayAgain={playAgain}
          onChangeJob={changeMyJob}
        />
      )}

      {gameState.gameStatus === 'lost' && (
        <LoseScreen
          gameState={gameState}
          onPlayAgain={playAgain}
          onChangeJob={changeMyJob}
        />
      )}
    </div>
  );
}

// Job Selection Screen Component
function JobSelectionScreen({
  title,
  subtitle,
  jobs,
  isLoading,
  loadError,
  onRetry,
  searchQuery,
  setSearchQuery,
  onSelect,
  currentJob,
  onChangeJob,
  onAddJob,
  onViewDetails
}: any) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredJobs = jobs.filter((job: Job) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      job.title.toLowerCase().includes(query) ||
      job.industry.toLowerCase().includes(query) ||
      job.sector.toLowerCase().includes(query)
    );
  });

  // Get search results for dropdown (limit to 10)
  const searchResults = searchQuery.trim()
    ? filteredJobs.slice(0, 10)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilteredSectors = () => {
    const sectors = new Set(filteredJobs.map((j: Job) => j.sector));
    return Array.from(sectors).sort();
  };

  const getFilteredIndustries = (sector: string) => {
    const industries = new Set(
      filteredJobs.filter((j: Job) => j.sector === sector).map((j: Job) => j.industry)
    );
    return Array.from(industries).sort();
  };

  const getJobsForIndustry = (sector: string, industry: string) => {
    return filteredJobs
      .filter((j: Job) => j.sector === sector && j.industry === industry)
      .sort((a: Job, b: Job) => a.title.localeCompare(b.title));
  };

  const resetNavigation = () => {
    setSelectedSector(null);
    setSelectedIndustry(null);
  };

  useEffect(() => {
    resetNavigation();
  }, [searchQuery]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          {title}
        </h2>
        <p className="text-center text-muted-foreground">{subtitle}</p>

        {currentJob && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center">
            <span className="text-sm text-muted-foreground mr-2">Starting from:</span>
            <span className="font-semibold text-primary">{currentJob.title}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative" ref={dropdownRef}>
          <Input
            type="text"
            placeholder="Search by job title, industry, or sector..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full"
          />

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.map((job: Job) => (
                <div key={job.id} className="flex items-center border-b last:border-b-0">
                  <button
                    className="flex-1 text-left px-4 py-3 hover:bg-muted transition-colors"
                    onClick={() => {
                      onSelect(job);
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="font-semibold text-sm">{job.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.industry} • {job.sector}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(job.id);
                      setShowSearchDropdown(false);
                    }}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(selectedSector || selectedIndustry) && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Button variant="link" size="sm" onClick={resetNavigation} className="p-0 h-auto">
              All Sectors
            </Button>
            {selectedSector && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedIndustry(null)}
                  className="p-0 h-auto"
                >
                  {selectedSector}
                </Button>
              </>
            )}
            {selectedIndustry && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{selectedIndustry}</span>
              </>
            )}
          </div>
        )}

        <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto space-y-2 pr-2">
          {isLoading && (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="text-center py-12 space-y-4">
              <div className="text-destructive text-lg font-semibold">⚠️ Failed to Load Jobs</div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{loadError}</p>
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !loadError && (
            <>
              {!selectedSector && getFilteredSectors().map((sector) => (
                <Button
                  key={sector}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4 cursor-pointer"
                  onClick={() => setSelectedSector(sector)}
                >
                  <div className="flex items-center gap-3 w-full pointer-events-none">
                    <div className="text-2xl">📂</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{sector}</div>
                      <div className="text-xs text-muted-foreground">
                        {getFilteredIndustries(sector).length} industries
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                </Button>
              ))}

              {selectedSector && !selectedIndustry && getFilteredIndustries(selectedSector).map((industry) => (
                <Button
                  key={industry}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4 cursor-pointer"
                  onClick={() => setSelectedIndustry(industry)}
                >
                  <div className="flex items-center gap-3 w-full pointer-events-none">
                    <div className="text-2xl">🏢</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{industry}</div>
                      <div className="text-xs text-muted-foreground">
                        {getJobsForIndustry(selectedSector, industry).length} jobs
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                </Button>
              ))}

              {selectedSector && selectedIndustry && getJobsForIndustry(selectedSector, selectedIndustry).map((job: Job) => (
                <div key={job.id} className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left h-auto py-3"
                    onClick={() => onSelect(job)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl">👤</div>
                      <div className="font-medium">{job.title}</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(job.id);
                    }}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {filteredJobs.length === 0 && jobs.length > 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No jobs found. Try a different search.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t">
          {currentJob && onChangeJob && (
            <Button variant="secondary" onClick={onChangeJob} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change My Job
            </Button>
          )}
          {onAddJob && (
            <Button variant="link" onClick={onAddJob} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Can't find your job? Add it here
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add Job Modal Component
function AddJobModal({ newJobTitle, setNewJobTitle, onAdd, onCancel, isProcessing, progress }: any) {
  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Your Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll automatically classify it and add it to our database
          </p>

          <Input
            type="text"
            placeholder="Enter your job title (e.g., Math Researcher)"
            value={newJobTitle}
            onChange={(e) => setNewJobTitle(e.target.value)}
            disabled={isProcessing}
            autoFocus
          />

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress}% - Processing your job...
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={onAdd} disabled={isProcessing || !newJobTitle.trim()}>
              {isProcessing ? 'Processing...' : 'Add Job'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Game Screen Component
function GameScreen({ gameState, onChoice, showFeedback, correctChoice, wrongChoice, showCorrectAnswer, onTryAgain }: any) {
  const correctChoiceNode = gameState.choices.find((choice: Job) => choice.id === correctChoice);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 ${
                  i < gameState.hearts ? 'fill-red-500 text-red-500' : 'text-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">
              Step {gameState.stepsTaken} / ~{gameState.optimalPathLength}
            </Badge>
            <Badge variant="outline">Score: {gameState.score}</Badge>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg text-center border border-primary/20">
          <span className="text-sm text-muted-foreground mr-2">Connecting to:</span>
          <span className="font-bold text-lg text-primary">{gameState.targetNode?.title}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <motion.div
          key={gameState.currentNode?.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border-2 border-green-500/30 text-center"
        >
          <h3 className="text-xl md:text-2xl font-bold mb-1">{gameState.currentNode?.title}</h3>
          <p className="text-sm text-muted-foreground">{gameState.currentNode?.industry}</p>
        </motion.div>

        <div className="space-y-3">
          <p className="text-center font-semibold text-sm uppercase tracking-wide">
            Choose your next step:
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.currentNode?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              {gameState.choices.map((choice: Job, index: number) => {
                const isCorrect = choice.id === correctChoice;
                const isWrong = choice.id === wrongChoice;

                return (
                  <motion.div
                    key={choice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left h-auto py-4 transition-all ${
                        isCorrect && showCorrectAnswer
                          ? 'bg-green-500/20 border-green-500 hover:bg-green-500/30'
                          : isWrong
                          ? 'bg-destructive/20 border-destructive animate-shake'
                          : 'hover:border-primary'
                      }`}
                      onClick={() => onChoice(choice)}
                      disabled={showFeedback !== null}
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{choice.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{choice.industry}</div>
                        {isCorrect && showCorrectAnswer && (
                          <Badge className="mt-2 bg-green-500">✓ Correct Answer</Badge>
                        )}
                      </div>
                    </Button>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}
            >
              <div
                className={`px-8 py-6 rounded-2xl text-2xl font-bold shadow-2xl ${
                  showFeedback === 'correct'
                    ? 'bg-green-500 text-white'
                    : 'bg-destructive text-white'
                }`}
              >
                {showFeedback === 'correct' ? '✓ Correct!' : '✗ Wrong choice!'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Try Again Button - Fixed at bottom */}
        {showCorrectAnswer && gameState.hearts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
          >
            <Button onClick={onTryAgain} size="lg" className="w-full shadow-lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// Win Screen Component
function WinScreen({ gameState, completePath, onPlayAgain, onChangeJob }: any) {
  const stars =
    gameState.stepsTaken === gameState.optimalPathLength && gameState.hearts === 3
      ? 3
      : gameState.stepsTaken <= gameState.optimalPathLength + 2
      ? 2
      : 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card>
        <CardHeader>
          <h2 className="text-3xl md:text-4xl font-bold text-center">🎉 You Won!</h2>

          <div className="flex justify-center gap-2 my-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.2 }}
              >
                <Star
                  className={`w-12 h-12 ${
                    i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </motion.div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Steps Taken</p>
              <p className="text-2xl font-bold text-primary">{gameState.stepsTaken}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Optimal</p>
              <p className="text-2xl font-bold text-primary">{gameState.optimalPathLength}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Score</p>
              <p className="text-2xl font-bold text-primary">{gameState.score}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-center">Your Journey:</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {completePath.map((job: Job, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    index === 0
                      ? 'bg-primary/10 border-primary/30'
                      : index === completePath.length - 1
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{job.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{job.industry}</div>
                  </div>
                  {index < completePath.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={onPlayAgain} size="lg" className="w-full">
              Try Another Path
            </Button>
            <Button onClick={onChangeJob} variant="secondary" size="lg" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Change My Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Lose Screen Component
function LoseScreen({ gameState, onPlayAgain, onChangeJob }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card>
        <CardHeader>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-destructive">
            💔 Out of Hearts!
          </h2>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-muted rounded-lg">
            <p className="text-muted-foreground mb-2">You were trying to connect with:</p>
            <p className="text-xl font-bold text-primary">{gameState.targetNode?.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Steps Taken</p>
              <p className="text-2xl font-bold">{gameState.stepsTaken}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Final Score</p>
              <p className="text-2xl font-bold">{gameState.score}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={onPlayAgain} size="lg" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another Path
            </Button>
            <Button onClick={onChangeJob} variant="secondary" size="lg" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Change My Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Job Details Modal Component
function JobDetailsModal({
  jobDetails,
  isLoading,
  onClose
}: {
  jobDetails: JobDetails | null;
  isLoading: boolean;
  onClose: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            Job Details
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading job details...</p>
          </div>
        )}

        {!isLoading && jobDetails && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">{jobDetails.title}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{jobDetails.industry}</Badge>
                <Badge variant="outline">{jobDetails.sector}</Badge>
              </div>
            </div>

            {jobDetails.description && (
              <div>
                <h4 className="font-semibold text-md mb-2">📋 Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {jobDetails.description}
                </p>
              </div>
            )}

            {jobDetails.keySkills && (
              <div>
                <h4 className="font-semibold text-md mb-2">💡 Key Skills</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {jobDetails.keySkills}
                </p>
              </div>
            )}

            {jobDetails.responsibilities && (
              <div>
                <h4 className="font-semibold text-md mb-2">✅ Responsibilities</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {jobDetails.responsibilities}
                </p>
              </div>
            )}

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// How to Play Modal Component
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">🎮 How to Play Connector</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-lg mb-2">📖 About the Game</h3>
            <p className="text-muted-foreground">
              <strong>Connector</strong> is a networking path-finding game inspired by "Six Degrees
              of Separation." Navigate through career connections to reach your goal profession in
              the fewest steps possible!
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 How to Play</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Choose Your Starting Job:</strong> Select your current profession
              </li>
              <li>
                <strong>Pick Your Connection Goal:</strong> Choose who you want to connect with
              </li>
              <li>
                <strong>Navigate the Network:</strong> Each turn, pick from 3 related jobs to move
                closer to your goal
              </li>
              <li>
                <strong>Watch Your Hearts:</strong> You have 3 hearts - pick the optimal path or
                try again if you make a mistake
              </li>
              <li>
                <strong>Reach Your Goal:</strong> Connect to your target profession in the shortest
                path!
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">⭐ Scoring</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>🥇 <strong>3 Stars:</strong> Complete in optimal steps with all hearts</li>
              <li>🥈 <strong>2 Stars:</strong> Complete within 2 extra steps</li>
              <li>🥉 <strong>1 Star:</strong> Complete the path</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">💡 Tips</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Jobs are connected by industry similarity and skill overlap</li>
              <li>Look for jobs in related sectors to bridge the gap</li>
              <li>Don't find your job? Add it to the network!</li>
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
