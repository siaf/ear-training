import { useState, useEffect, useCallback } from 'react';
import { Volume2, BarChart3, Trophy, Play } from 'lucide-react';
import { audioEngine, INTERVALS, TRIADS, SEVENTH_CHORDS, MODES, SynthType } from './audioEngine';
import { CURRICULUM, getCurrentLevel, canUnlockNextLevel, getDisplayName } from './curriculum';
import { AnalyticsEngine } from './analytics';
import { Question, Answer } from './types';
import { filterDiatonicItems } from './scaleContext';

const MAX_QUESTIONS = 24;
const QUESTIONS_PER_KEY = 8;

function App() {
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [analytics] = useState(() => new AnalyticsEngine());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [synthType, setSynthType] = useState<SynthType>('piano');
  const [currentScaleRoot, setCurrentScaleRoot] = useState<string>('C');
  const [scaleRoots, setScaleRoots] = useState<string[]>([]);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  const [droneEnabled, setDroneEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const currentLevel = selectedLevelId 
    ? CURRICULUM.find(l => l.id === selectedLevelId) || getCurrentLevel(completedLevels)
    : getCurrentLevel(completedLevels);
  const stats = analytics.getSessionStats();

  // Define generateQuestion first so it can be used in useEffects
  const generateQuestion = useCallback(async () => {
    // Get diatonic items within the current scale
    const diatonicItems = filterDiatonicItems(
      currentLevel.items,
      currentLevel.type,
      currentScaleRoot,
      currentLevel.scaleDegrees
    );
    
    // Pick a random diatonic item
    const randomDiatonic = diatonicItems[Math.floor(Math.random() * diatonicItems.length)];
    const rootNote = randomDiatonic.root;
    const itemType = randomDiatonic.type;
    
    let playedNotes: string[] = [];
    
    // Play the sound based on question type
    try {
      switch (currentLevel.type) {
        case 'interval':
          playedNotes = await audioEngine.playInterval(rootNote, itemType as keyof typeof INTERVALS);
          break;
        case 'triad':
          playedNotes = await audioEngine.playTriad(rootNote, itemType as keyof typeof TRIADS);
          break;
        case 'seventh_chord':
          playedNotes = await audioEngine.playSeventhChord(rootNote, itemType as keyof typeof SEVENTH_CHORDS);
          break;
        case 'mode':
          playedNotes = await audioEngine.playMode(rootNote, itemType as keyof typeof MODES);
          break;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }

    const question: Question = {
      id: `q_${Date.now()}`,
      type: currentLevel.type,
      correctAnswer: itemType,
      rootNote,
      playedNotes,
      timestamp: Date.now(),
    };

    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuestionStartTime(Date.now());
  }, [currentLevel, currentScaleRoot]);

  useEffect(() => {
    const handleQuestionGeneration = async () => {
      if (sessionStarted && !currentQuestion && stats.totalQuestions < MAX_QUESTIONS && scaleRoots.length > 0 && !isPlayingScale) {
        // Check if we need to switch keys
        const questionInBlock = stats.totalQuestions % QUESTIONS_PER_KEY;
        if (questionInBlock === 0 && stats.totalQuestions > 0) {
          // New key block - switch scale
          const blockIndex = Math.floor(stats.totalQuestions / QUESTIONS_PER_KEY);
          if (blockIndex < scaleRoots.length) {
            const newRoot = scaleRoots[blockIndex];
            setCurrentScaleRoot(newRoot);
            setIsPlayingScale(true);
            // Play scale reference automatically and wait for it to finish
            const { duration } = await audioEngine.playMajorScaleReference(newRoot, 4);
            // Wait for scale to finish, then generate question
            await new Promise(resolve => setTimeout(resolve, duration * 1000 + 500));
            setIsPlayingScale(false);
          }
        }
        generateQuestion();
      } else if (sessionStarted && stats.totalQuestions >= MAX_QUESTIONS) {
        handleEndSession();
      }
    };
    
    handleQuestionGeneration();
  }, [sessionStarted, currentQuestion, stats.totalQuestions, scaleRoots, generateQuestion, isPlayingScale]);

  // Initialize scale roots when session starts
  useEffect(() => {
    const initializeSession = async () => {
      if (sessionStarted && scaleRoots.length === 0) {
        setIsPlayingScale(true);
        // Generate 3 random keys for the session
        const roots = [];
        for (let i = 0; i < 3; i++) {
          roots.push(audioEngine.getRandomRootNote());
        }
        setScaleRoots(roots);
        setCurrentScaleRoot(roots[0]);
        // Play initial scale reference and wait before first question
        const { duration } = await audioEngine.playMajorScaleReference(roots[0], 4);
        await new Promise(resolve => setTimeout(resolve, duration * 1000 + 500));
        setIsPlayingScale(false);
        // First question will be generated by the other useEffect
      }
    };
    
    initializeSession();
  }, [sessionStarted]);

  useEffect(() => {
    audioEngine.setSynthType(synthType);
  }, [synthType]);

  // Update drone when scale root changes
  useEffect(() => {
    if (droneEnabled && sessionStarted) {
      audioEngine.switchDroneNote(currentScaleRoot);
    }
  }, [currentScaleRoot, droneEnabled, sessionStarted]);

  const replaySound = async () => {
    if (!currentQuestion) return;

    try {
      switch (currentQuestion.type) {
        case 'interval':
          await audioEngine.playInterval(
            currentQuestion.rootNote,
            currentQuestion.correctAnswer as keyof typeof INTERVALS
          );
          break;
        case 'triad':
          await audioEngine.playTriad(
            currentQuestion.rootNote,
            currentQuestion.correctAnswer as keyof typeof TRIADS
          );
          break;
        case 'seventh_chord':
          await audioEngine.playSeventhChord(
            currentQuestion.rootNote,
            currentQuestion.correctAnswer as keyof typeof SEVENTH_CHORDS
          );
          break;
        case 'mode':
          await audioEngine.playMode(
            currentQuestion.rootNote,
            currentQuestion.correctAnswer as keyof typeof MODES
          );
          break;
      }
    } catch (error) {
      console.error('Error replaying audio:', error);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion || showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    const responseTime = Date.now() - questionStartTime;

    // Create full description with root note and type
    const fullDescription = `${currentQuestion.rootNote} ${getDisplayName(currentQuestion.correctAnswer)}`;

    const answerRecord: Answer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      fullDescription,
      isCorrect,
      timestamp: Date.now(),
      responseTime,
    };

    analytics.addAnswer(answerRecord);
  };

  const handleNext = () => {
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleEndSession = () => {
    const finalStats = analytics.getSessionStats();
    
    // Check if user can unlock next level
    if (canUnlockNextLevel(currentLevel.id, finalStats.accuracy)) {
      if (!completedLevels.includes(currentLevel.id)) {
        setCompletedLevels([...completedLevels, currentLevel.id]);
      }
    }
    
    setShowStats(true);
  };

  const handleStartNewSession = () => {
    analytics.reset();
    setSessionStarted(false);
    setShowStats(false);
    setCurrentQuestion(null);
    setScaleRoots([]);
    setCurrentScaleRoot('C');
    setIsPlayingScale(false);
  };

  const getAnswerOptions = (): string[] => {
    return currentLevel.items;
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🎵 Ear Training</h1>
            <p className="text-gray-300">Progressive musical ear development</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Choose a Level:</h3>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {CURRICULUM.map((level, index) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevelId(level.id)}
                  className={`text-left p-4 rounded-lg transition-all ${
                    currentLevel.id === level.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">
                      {index + 1}. {level.name}
                    </span>
                    {completedLevels.includes(level.id) && (
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-sm opacity-80">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-700 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{currentLevel.name}</h2>
            <p className="text-gray-300 mb-4">{currentLevel.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Level {CURRICULUM.findIndex(l => l.id === currentLevel.id) + 1} of {CURRICULUM.length}
              </span>
              <span>•</span>
              <span>Target: {currentLevel.unlockRequirement}% accuracy</span>
            </div>
            
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-3 mb-4">
              <p className="text-purple-200 text-sm">
                <strong>{MAX_QUESTIONS} questions</strong> across <strong>3 random keys</strong>
              </p>
              <p className="text-purple-300 text-xs mt-1">
                {QUESTIONS_PER_KEY} questions per key • All content is diatonic (in-scale)
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-2">Sound:</h3>
              <div className="flex gap-2">
                {(['piano', 'sine', 'sawtooth'] as SynthType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setSynthType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      synthType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">You'll practice:</h3>
              <div className="flex flex-wrap gap-2">
                {currentLevel.items.map(item => (
                  <span
                    key={item}
                    className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
                  >
                    {getDisplayName(item)}
                  </span>
                ))}
              </div>
              {currentLevel.scaleDegrees && (
                <p className="text-purple-300 text-xs mt-2">
                  Focus: {currentLevel.scaleDegrees.map(d => {
                    const degreeNames = ['I (Root)', 'ii', 'iii', 'IV', 'V (Dominant)', 'vi', 'vii°'];
                    return degreeNames[d];
                  }).join(', ')}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setSessionStarted(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6" />
            Start Training Session
          </button>

          {completedLevels.length > 0 && (
            <div className="mt-6 text-center text-gray-400 text-sm">
              Completed levels: {completedLevels.length}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showStats) {
    const insights = analytics.getInsights();
    const canProgress = canUnlockNextLevel(currentLevel.id, stats.accuracy);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <BarChart3 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
          </div>

          <div className="bg-gray-700 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{stats.totalQuestions}</div>
                <div className="text-sm text-gray-400">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{stats.correctAnswers}</div>
                <div className="text-sm text-gray-400">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{stats.accuracy.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </div>
            </div>

            {canProgress && (
              <div className="bg-green-900 border border-green-600 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-300 font-semibold">
                  <Trophy className="w-5 h-5" />
                  Level Unlocked!
                </div>
                <p className="text-green-200 text-sm mt-1">
                  You've mastered this level and can move to the next one!
                </p>
              </div>
            )}

            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="text-gray-300 text-sm bg-gray-600 rounded-lg p-3">
                  {insight}
                </div>
              ))}
            </div>
          </div>

          {stats.weaknesses.length > 0 && (
            <div className="bg-gray-700 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown by Note</h3>
              <p className="text-gray-400 text-sm mb-4">
                See exactly which notes/keys you got right or wrong
              </p>
              <div className="space-y-2">
                {stats.weaknesses.map(weakness => (
                  <div key={weakness.item} className="flex items-center justify-between bg-gray-600 rounded-lg p-3">
                    <span className="text-white font-medium">
                      {weakness.item}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {weakness.correct}/{weakness.attempts}
                      </span>
                      <span className={`font-semibold min-w-[45px] text-right ${
                        weakness.accuracy >= 80 ? 'text-green-400' :
                        weakness.accuracy >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {weakness.accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStartNewSession}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">{currentLevel.name}</h2>
            <p className="text-gray-400 text-sm">Question {stats.totalQuestions + 1} of {MAX_QUESTIONS}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{stats.accuracy.toFixed(0)}%</div>
            <div className="text-sm text-gray-400">{stats.correctAnswers}/{stats.totalQuestions}</div>
          </div>
        </div>

        <div className="bg-purple-900 bg-opacity-50 rounded-lg p-3 mb-6 text-center">
          <p className="text-purple-200 text-sm font-medium">
            Current Key: <span className="text-white font-bold text-lg">{currentScaleRoot} Major</span>
          </p>
          <p className="text-purple-300 text-xs mt-1">
            Questions {Math.floor(stats.totalQuestions / QUESTIONS_PER_KEY) * QUESTIONS_PER_KEY + 1}-{Math.min((Math.floor(stats.totalQuestions / QUESTIONS_PER_KEY) + 1) * QUESTIONS_PER_KEY, MAX_QUESTIONS)} in this key
          </p>
        </div>

        <div className="bg-gray-700 rounded-xl p-8 mb-6 text-center">
          <h3 className="text-xl text-white mb-6">
            What do you hear?
          </h3>
          
          <button
            onClick={replaySound}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-6 transition-all transform hover:scale-105 mb-4"
          >
            <Volume2 className="w-12 h-12" />
          </button>
          
          <p className="text-gray-400 text-sm mb-4">Click to replay</p>

          <div className="mt-6 pt-6 border-t border-gray-600">
            <div className="flex gap-2 justify-center mb-3">
              <button
                onClick={() => audioEngine.playMajorScaleReference(currentScaleRoot, 4)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-all"
                title={`Play ${currentScaleRoot} major scale (up and down)`}
              >
                🎹 {currentScaleRoot} Scale
              </button>
              <button
                onClick={() => audioEngine.playTonicTriadReference(currentScaleRoot)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-all"
                title={`Play ${currentScaleRoot} major I-V-I progression`}
              >
                🎵 I-V-I
              </button>
              <button
                onClick={() => {
                  const newState = !droneEnabled;
                  setDroneEnabled(newState);
                  audioEngine.toggleDrone(currentScaleRoot, newState);
                }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  droneEnabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
                title="Toggle drone (continuous root note)"
              >
                🎶 Drone {droneEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <span className="text-gray-400 text-xs">Speed:</span>
              <button
                onClick={() => {
                  const newSpeed = Math.max(0.5, playbackSpeed - 0.25);
                  setPlaybackSpeed(newSpeed);
                  audioEngine.setPlaybackSpeed(newSpeed);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
              >
                − Slower
              </button>
              <span className="text-white text-sm font-mono min-w-[45px] text-center">
                {playbackSpeed.toFixed(2)}x
              </span>
              <button
                onClick={() => {
                  const newSpeed = Math.min(2, playbackSpeed + 0.25);
                  setPlaybackSpeed(newSpeed);
                  audioEngine.setPlaybackSpeed(newSpeed);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
              >
                + Faster
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {getAnswerOptions().map(option => {
            const isSelected = selectedAnswer === option;
            const isCorrect = currentQuestion?.correctAnswer === option;
            const showCorrect = showFeedback && isCorrect;
            const showWrong = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={showFeedback}
                className={`p-4 rounded-xl font-semibold transition-all ${
                  showCorrect
                    ? 'bg-green-600 text-white'
                    : showWrong
                    ? 'bg-red-600 text-white'
                    : isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {getDisplayName(option)}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="flex gap-3">
            <button
              onClick={handleNext}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-all"
            >
              Next Question
            </button>
            <button
              onClick={handleEndSession}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all"
            >
              End Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
