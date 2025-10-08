import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [myJob, setMyJob] = useState(null); // Store user's job permanently
  const [gameState, setGameState] = useState({
    level: null,
    currentNode: null,
    targetNode: null,
    choices: [],
    hearts: 3,
    stepsTaken: 0,
    score: 1000,
    gameStatus: 'select-start', // 'select-start', 'select-target', 'playing', 'won', 'lost'
    optimalPathLength: 0
  });

  const [correctChoice, setCorrectChoice] = useState(null);
  const [showFeedback, setShowFeedback] = useState(null); // 'correct' or 'wrong'
  const [availableJobs, setAvailableJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [wrongChoice, setWrongChoice] = useState(null); // Track which choice was wrong
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isProcessingJob, setIsProcessingJob] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [completePath, setCompletePath] = useState([]); // Store the complete path taken

  // Fetch all available jobs on mount
  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  // Fetch all available jobs
  const fetchAvailableJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs/all`);
      setAvailableJobs(response.data.jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  // User selects their job (only once)
  const selectMyJob = (job) => {
    setMyJob(job);
    setSearchQuery(''); // Reset search
    setGameState(prev => ({
      ...prev,
      gameStatus: 'select-target'
    }));
  };

  // Change my job
  const changeMyJob = () => {
    setMyJob(null);
    setSearchQuery('');
    setGameState(prev => ({
      ...prev,
      gameStatus: 'select-start'
    }));
  };

  // User selects target job and starts game
  const selectTargetJob = async (job) => {
    try {
      // Calculate optimal path
      const pathResponse = await axios.post(`${API_URL}/level/calculate-path`, {
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
        optimalPathLength: pathResponse.data.pathLength
      });

      // Initialize path with starting job
      setCompletePath([myJob]);

      // Get first set of choices
      fetchChoices(myJob.id, job.id);
      setSearchQuery(''); // Reset search
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  // Play again with different target
  const playAgain = () => {
    setSearchQuery('');
    setGameState(prev => ({
      ...prev,
      gameStatus: 'select-target'
    }));
  };

  // Fetch choices for current node
  const fetchChoices = async (currentNodeId, targetNodeId) => {
    try {
      const response = await axios.post(`${API_URL}/level/choices`, {
        currentNodeId,
        targetNodeId
      });

      const data = response.data;

      if (data.reachedTarget) {
        // Won!
        setGameState(prev => ({ ...prev, gameStatus: 'won' }));
        return;
      }

      setGameState(prev => ({ ...prev, choices: data.choices }));
      setCorrectChoice(data.correct);
    } catch (error) {
      console.error('Error fetching choices:', error);
    }
  };

  // Handle choice selection
  const handleChoice = async (chosenNode) => {
    // Validate choice
    const isCorrect = chosenNode.id === correctChoice;

    if (isCorrect) {
      // Correct choice!
      setShowFeedback('correct');
      setWrongChoice(null);
      setShowCorrectAnswer(false);

      setTimeout(() => {
        setShowFeedback(null);

        // Add to path
        setCompletePath(prev => [...prev, chosenNode]);

        // Check if reached target
        if (chosenNode.id === gameState.targetNode.id) {
          setGameState(prev => ({ ...prev, gameStatus: 'won' }));
          return;
        }

        // Move to next node
        setGameState(prev => ({
          ...prev,
          currentNode: chosenNode,
          stepsTaken: prev.stepsTaken + 1,
          score: prev.score + 50
        }));

        // Fetch new choices
        fetchChoices(chosenNode.id, gameState.targetNode.id);
      }, 1000);

    } else {
      // Wrong choice!
      setShowFeedback('wrong');
      setWrongChoice(chosenNode.id);
      setShowCorrectAnswer(true);

      const newHearts = gameState.hearts - 1;

      // Don't auto-advance, wait for user to click "Try Again"
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

  // Try again after wrong choice
  const tryAgain = () => {
    setShowFeedback(null);
    setWrongChoice(null);
    setShowCorrectAnswer(false);
  };

  // Add custom job
  const handleAddJob = async () => {
    if (!newJobTitle.trim()) return;

    setIsProcessingJob(true);
    setProcessingProgress(0);

    try {
      // Start job processing
      const response = await axios.post(`${API_URL}/jobs/add`, {
        jobTitle: newJobTitle
      });

      const { jobId, job } = response.data;

      // If job already exists, select it
      if (job) {
        setShowAddJobModal(false);
        setNewJobTitle('');
        setIsProcessingJob(false);
        selectMyJob(job);
        return;
      }

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_URL}/jobs/status/${jobId}`);
          const { progress, status, job: completedJob, error } = statusResponse.data;

          setProcessingProgress(progress);

          if (error) {
            clearInterval(pollInterval);
            alert(`Error: ${status}`);
            setIsProcessingJob(false);
            setProcessingProgress(0);
          } else if (progress === 100 && completedJob) {
            clearInterval(pollInterval);

            // Reload jobs list
            await fetchAvailableJobs();

            // Select the newly added job
            setShowAddJobModal(false);
            setNewJobTitle('');
            setIsProcessingJob(false);
            setProcessingProgress(0);
            selectMyJob(completedJob);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 1000); // Poll every second

    } catch (error) {
      console.error('Error adding job:', error);
      alert('Failed to add job. Please try again.');
      setIsProcessingJob(false);
      setProcessingProgress(0);
    }
  };

  return (
    <div className="app">
      {/* How to Play Button - Fixed position */}
      <button
        className="how-to-play-btn"
        onClick={() => setShowHowToPlay(true)}
        title="How to Play"
      >
        ❓
      </button>

      {gameState.gameStatus === 'select-start' && (
        <>
          <JobSelectionScreen
            title="What's your job?"
            subtitle="Search and select your profession"
            jobs={availableJobs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelect={selectMyJob}
            onAddJob={() => setShowAddJobModal(true)}
          />
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
        </>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {gameState.gameStatus === 'select-target' && (
        <JobSelectionScreen
          title="Who do you want to connect with?"
          subtitle="Choose a profession to network towards"
          jobs={availableJobs}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelect={selectTargetJob}
          currentJob={myJob}
          onChangeJob={changeMyJob}
        />
      )}

      {gameState.gameStatus === 'playing' && (
        <GameScreen
          gameState={gameState}
          onChoice={handleChoice}
          showFeedback={showFeedback}
          myJob={myJob}
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
function JobSelectionScreen({ title, subtitle, jobs, searchQuery, setSearchQuery, onSelect, currentJob, onChangeJob, onAddJob }) {
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  // Group jobs hierarchically: sector -> industry -> jobs
  const groupedJobs = jobs.reduce((acc, job) => {
    if (!acc[job.sector]) {
      acc[job.sector] = {};
    }
    if (!acc[job.sector][job.industry]) {
      acc[job.sector][job.industry] = [];
    }
    acc[job.sector][job.industry].push(job);
    return acc;
  }, {});

  // Filter by search query
  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      job.title.toLowerCase().includes(query) ||
      job.industry.toLowerCase().includes(query) ||
      job.sector.toLowerCase().includes(query)
    );
  });

  // Get filtered sectors/industries based on search
  const getFilteredSectors = () => {
    const sectors = new Set(filteredJobs.map(j => j.sector));
    return Array.from(sectors).sort();
  };

  const getFilteredIndustries = (sector) => {
    const industries = new Set(
      filteredJobs.filter(j => j.sector === sector).map(j => j.industry)
    );
    return Array.from(industries).sort();
  };

  const getJobsForIndustry = (sector, industry) => {
    return filteredJobs
      .filter(j => j.sector === sector && j.industry === industry)
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const resetNavigation = () => {
    setSelectedSector(null);
    setSelectedIndustry(null);
  };

  // Reset navigation when search changes
  useEffect(() => {
    resetNavigation();
  }, [searchQuery]);

  return (
    <motion.div
      className="screen job-selection-screen"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="selection-title">{title}</h2>
      <p className="selection-subtitle">{subtitle}</p>

      {currentJob && (
        <div className="selected-job-display">
          <span className="selected-label">Starting from:</span>
          <span className="selected-job">{currentJob.title}</span>
        </div>
      )}

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by job title, industry, or sector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Breadcrumb navigation */}
      {(selectedSector || selectedIndustry) && (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={resetNavigation}>
            All Sectors
          </button>
          {selectedSector && (
            <>
              <span className="breadcrumb-separator">→</span>
              <button
                className="breadcrumb-item"
                onClick={() => setSelectedIndustry(null)}
              >
                {selectedSector}
              </button>
            </>
          )}
          {selectedIndustry && (
            <>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-item active">{selectedIndustry}</span>
            </>
          )}
        </div>
      )}

      <div className="jobs-list">
        {/* Show sectors when nothing is selected */}
        {!selectedSector && getFilteredSectors().map((sector) => (
          <motion.button
            key={sector}
            className="hierarchy-card sector-card"
            onClick={() => setSelectedSector(sector)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="hierarchy-icon">📂</div>
            <div className="hierarchy-content">
              <div className="hierarchy-title">{sector}</div>
              <div className="hierarchy-count">
                {getFilteredIndustries(sector).length} industries
              </div>
            </div>
          </motion.button>
        ))}

        {/* Show industries when sector is selected */}
        {selectedSector && !selectedIndustry && getFilteredIndustries(selectedSector).map((industry) => (
          <motion.button
            key={industry}
            className="hierarchy-card industry-card"
            onClick={() => setSelectedIndustry(industry)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="hierarchy-icon">🏢</div>
            <div className="hierarchy-content">
              <div className="hierarchy-title">{industry}</div>
              <div className="hierarchy-count">
                {getJobsForIndustry(selectedSector, industry).length} jobs
              </div>
            </div>
          </motion.button>
        ))}

        {/* Show jobs when industry is selected */}
        {selectedSector && selectedIndustry && getJobsForIndustry(selectedSector, selectedIndustry).map((job) => (
          <motion.button
            key={job.id}
            className="hierarchy-card job-card"
            onClick={() => onSelect(job)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="hierarchy-icon">👤</div>
            <div className="hierarchy-content">
              <div className="hierarchy-title">{job.title}</div>
            </div>
          </motion.button>
        ))}

        {filteredJobs.length === 0 && (
          <p className="no-results">No jobs found. Try a different search.</p>
        )}
      </div>

      <div className="selection-footer">
        {currentJob && onChangeJob && (
          <button className="btn btn-secondary" onClick={onChangeJob}>
            Change My Job
          </button>
        )}
        {onAddJob && (
          <button className="btn btn-link" onClick={onAddJob}>
            Can't find your job? Add it here
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Add Job Modal Component
function AddJobModal({ newJobTitle, setNewJobTitle, onAdd, onCancel, isProcessing, progress }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <motion.div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h2 className="modal-title">Add Your Job</h2>
        <p className="modal-subtitle">
          We'll automatically classify it and add it to our database
        </p>

        <input
          type="text"
          className="modal-input"
          placeholder="Enter your job title (e.g., Math Researcher)"
          value={newJobTitle}
          onChange={(e) => setNewJobTitle(e.target.value)}
          disabled={isProcessing}
          autoFocus
        />

        {isProcessing && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="progress-text">{progress}% - Processing your job...</p>
          </div>
        )}

        <div className="modal-buttons">
          <button
            className="btn btn-primary"
            onClick={onAdd}
            disabled={isProcessing || !newJobTitle.trim()}
          >
            {isProcessing ? 'Processing...' : 'Add Job'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Game Screen Component
function GameScreen({ gameState, onChoice, showFeedback, correctChoice, wrongChoice, showCorrectAnswer, onTryAgain }) {
  // Find the correct choice node from the choices
  const correctChoiceNode = gameState.choices.find(choice => choice.id === correctChoice);

  return (
    <div className="screen game-screen">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="hearts">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`heart ${i < gameState.hearts ? 'active' : 'inactive'}`}>
              ❤️
            </span>
          ))}
        </div>

        <div className="progress">
          Step {gameState.stepsTaken} / ~{gameState.optimalPathLength}
        </div>

        <div className="score">
          Score: {gameState.score}
        </div>
      </div>

      {/* Connection Goal Display */}
      <div className="target-display">
        <span className="target-label">Connecting to:</span>
        <span className="target-job">{gameState.targetNode?.title}</span>
      </div>

      {/* Current Node */}
      <motion.div
        className="current-node"
        key={gameState.currentNode?.id}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="node-title">{gameState.currentNode?.title}</div>
        <div className="node-industry">{gameState.currentNode?.industry}</div>
      </motion.div>

      {/* Choices */}
      <div className="choices-container">
        <p className="choices-label">Choose your next step:</p>

        <AnimatePresence mode="wait">
          <motion.div
            className="choices"
            key={gameState.currentNode?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {gameState.choices.map((choice, index) => {
              const isCorrect = choice.id === correctChoice;
              const isWrong = choice.id === wrongChoice;

              return (
                <motion.button
                  key={choice.id}
                  className={`choice-btn ${isCorrect && showCorrectAnswer ? 'correct-highlight' : ''} ${isWrong ? 'wrong' : ''}`}
                  onClick={() => onChoice(choice)}
                  disabled={showFeedback !== null}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: showFeedback ? 1 : 1.05 }}
                  whileTap={{ scale: showFeedback ? 1 : 0.95 }}
                >
                  <div className="choice-title">{choice.title}</div>
                  <div className="choice-industry">{choice.industry}</div>
                  {isCorrect && showCorrectAnswer && (
                    <div className="correct-badge">✓ Correct Answer</div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            className={`feedback ${showFeedback}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {showFeedback === 'correct' ? '✓ Correct!' : '✗ Wrong choice!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Try Again Button */}
      {showCorrectAnswer && gameState.hearts > 0 && (
        <motion.div
          className="try-again-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="btn btn-primary try-again-btn" onClick={onTryAgain}>
            Try Again
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Win Screen Component
function WinScreen({ gameState, completePath, onPlayAgain, onChangeJob }) {
  const stars = gameState.stepsTaken === gameState.optimalPathLength && gameState.hearts === 3 ? 3
    : gameState.stepsTaken <= gameState.optimalPathLength + 2 ? 2 : 1;

  return (
    <motion.div
      className="screen result-screen win-screen"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h1 className="result-title">🎉 You Won!</h1>

      <div className="stars">
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            className={`star ${i < stars ? 'active' : 'inactive'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.2 }}
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <div className="result-stats">
        <div className="stat">
          <span className="stat-label">Steps Taken:</span>
          <span className="stat-value">{gameState.stepsTaken}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Optimal:</span>
          <span className="stat-value">{gameState.optimalPathLength}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Final Score:</span>
          <span className="stat-value">{gameState.score}</span>
        </div>
      </div>

      {/* Path Visualization */}
      <div className="path-visualization">
        <h3 className="path-title">Your Journey:</h3>
        <div className="path-container">
          {completePath.map((job, index) => (
            <motion.div
              key={index}
              className="path-node"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="path-step-number">{index + 1}</div>
              <div className="path-job-info">
                <div className="path-job-title">{job.title}</div>
                <div className="path-job-industry">{job.industry}</div>
              </div>
              {index < completePath.length - 1 && (
                <div className="path-arrow">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="result-buttons">
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Try Another Path
        </button>
        <button className="btn btn-secondary" onClick={onChangeJob}>
          Change My Job
        </button>
      </div>
    </motion.div>
  );
}

// Lose Screen Component
function LoseScreen({ gameState, onPlayAgain, onChangeJob }) {
  return (
    <motion.div
      className="screen result-screen lose-screen"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h1 className="result-title">💔 Out of Hearts!</h1>

      <p className="result-message">
        You were trying to connect with:<br />
        <strong>{gameState.targetNode?.title}</strong>
      </p>

      <div className="result-stats">
        <div className="stat">
          <span className="stat-label">Steps Taken:</span>
          <span className="stat-value">{gameState.stepsTaken}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Final Score:</span>
          <span className="stat-value">{gameState.score}</span>
        </div>
      </div>

      <div className="result-buttons">
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Try Another Path
        </button>
        <button className="btn btn-secondary" onClick={onChangeJob}>
          Change My Job
        </button>
      </div>
    </motion.div>
  );
}

// How to Play Modal Component
function HowToPlayModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content how-to-play-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2 className="modal-title">🎮 How to Play</h2>

        <div className="how-to-play-content">
          <div className="game-description">
            <h3>📖 About the Game</h3>
            <p>
              <strong>6 Degrees of Jobs</strong> is a networking path-finding game inspired by "Six Degrees of Separation."
              Navigate through career connections to reach your goal profession in the fewest steps possible!
            </p>
          </div>

          <div className="instructions">
            <h3>🎯 How to Play</h3>
            <ol>
              <li><strong>Choose Your Starting Job:</strong> Select your current profession</li>
              <li><strong>Pick Your Connection Goal:</strong> Choose who you want to connect with</li>
              <li><strong>Navigate the Network:</strong> Each turn, pick from 3 related jobs to move closer to your goal</li>
              <li><strong>Watch Your Hearts:</strong> You have 3 hearts - pick the optimal path or try again if you make a mistake</li>
              <li><strong>Reach Your Goal:</strong> Connect to your target profession in the shortest path!</li>
            </ol>
          </div>

          <div className="scoring">
            <h3>⭐ Scoring</h3>
            <ul>
              <li>🥇 <strong>3 Stars:</strong> Complete in optimal steps with all hearts</li>
              <li>🥈 <strong>2 Stars:</strong> Complete within 2 extra steps</li>
              <li>🥉 <strong>1 Star:</strong> Complete the path</li>
            </ul>
          </div>

          <div className="tips">
            <h3>💡 Tips</h3>
            <ul>
              <li>Jobs are connected by industry similarity and skill overlap</li>
              <li>Look for jobs in related sectors to bridge the gap</li>
              <li>Don't find your job? Add it to the network!</li>
            </ul>
          </div>
        </div>

        <button className="btn btn-primary how-to-play-close" onClick={onClose}>
          Got it!
        </button>
      </motion.div>
    </div>
  );
}

export default App;
