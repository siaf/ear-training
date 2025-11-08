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
  const [debugMode, setDebugMode] = useState(false);

  const currentLevel = selectedLevelId 
    ? CURRICULUM.find(l => l.id === selectedLevelId) || getCurrentLevel(completedLevels)
    : getCurrentLevel(completedLevels);
  const stats = analytics.getSessionStats();

  // Define generateQuestion first so it can be used in useEffects
  const generateQuestion = useCallback(async () => {
    let playedNotes: string[] = [];
    let itemType: string;
    let rootNote: string;

    // Scale degree questions work differently - pick random degree
    if (currentLevel.type === 'scale_degree') {
      const randomDegree = currentLevel.items[Math.floor(Math.random() * currentLevel.items.length)];
      itemType = randomDegree;
      rootNote = currentScaleRoot;
      
      try {
        playedNotes = await audioEngine.playScaleDegree(
          currentScaleRoot,
          parseInt(randomDegree) - 1, // Convert 1-7 to 0-6
          currentLevel.context!
        );
      } catch (error) {
        console.error('Error playing scale degree:', error);
      }
    } else {
      // Get diatonic items within the current scale
      const diatonicItems = filterDiatonicItems(
        currentLevel.items,
        currentLevel.type,
        currentScaleRoot,
        currentLevel.scaleDegrees
      );
      
      // Pick a random diatonic item
      const randomDiatonic = diatonicItems[Math.floor(Math.random() * diatonicItems.length)];
      rootNote = randomDiatonic.root;
      itemType = randomDiatonic.type;
      
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
    }

    const question: Question = {
      id: `q_${Date.now()}`,
      type: currentLevel.type,
      correctAnswer: itemType,
      rootNote,
      playedNotes,
      timestamp: Date.now(),
      context: currentLevel.context,
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

  // Debug mode keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setDebugMode(prev => {
          console.log(`🐛 Debug mode ${!prev ? 'ENABLED' : 'DISABLED'} - All levels unlocked`);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
        case 'scale_degree':
          await audioEngine.playScaleDegree(
            currentQuestion.rootNote,
            parseInt(currentQuestion.correctAnswer) - 1,
            currentQuestion.context!
          );
          break;
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
      console.error('Error replaying sound:', error);
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

    // Calculate scale degree if applicable (for interval/triad/chord questions)
    let scaleDegree: number | undefined;
    if (currentQuestion.type !== 'scale_degree' && currentQuestion.type !== 'mode') {
      // Get the scale degree of the root note of this question
      const rootIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(currentQuestion.rootNote);
      const scaleRootIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(currentScaleRoot);
      const interval = (rootIndex - scaleRootIndex + 12) % 12;
      const majorScale = [0, 2, 4, 5, 7, 9, 11];
      scaleDegree = majorScale.indexOf(interval);
      if (scaleDegree === -1) scaleDegree = undefined; // Not in scale
    }

    const answerRecord: Answer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      fullDescription,
      isCorrect,
      timestamp: Date.now(),
      responseTime,
      // Enhanced tracking
      itemType: currentQuestion.correctAnswer,
      scaleDegree,
      rootNote: currentScaleRoot,
      questionType: currentQuestion.type,
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
    const currentLevelIndex = CURRICULUM.findIndex(l => l.id === currentLevel.id);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">🎵 Ear Training</h1>
            <p className="text-gray-300 text-lg">Master musical intervals through progressive practice</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              {completedLevels.length > 0 && (
                <div className="inline-flex items-center gap-2 bg-yellow-500 bg-opacity-20 px-4 py-2 rounded-full">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold">{completedLevels.length} levels completed</span>
                </div>
              )}
              {debugMode && (
                <div className="inline-flex items-center gap-2 bg-red-500 bg-opacity-20 px-4 py-2 rounded-full border border-red-500 border-opacity-50">
                  <span className="text-red-300 font-semibold">🐛 Debug Mode</span>
                </div>
              )}
            </div>
            {debugMode && (
              <p className="text-xs text-gray-400 mt-2">Press Ctrl/Cmd + K to toggle</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Learning Path */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                Learning Path
              </h2>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {CURRICULUM.map((level, index) => {
                  const isCompleted = completedLevels.includes(level.id);
                  const isCurrent = currentLevel.id === level.id;
                  const isLocked = !debugMode && index > 0 && !completedLevels.includes(CURRICULUM[index - 1].id) && !isCurrent;
                  
                  return (
                    <div key={level.id} className="relative">
                      {/* Connection line */}
                      {index < CURRICULUM.length - 1 && (
                        <div className={`absolute left-6 top-16 w-0.5 h-8 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                      )}
                      
                      <button
                        onClick={() => !isLocked && setSelectedLevelId(level.id)}
                        disabled={isLocked}
                        className={`w-full text-left p-4 rounded-xl transition-all relative ${
                          isCurrent
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                            : isCompleted
                            ? 'bg-green-900 bg-opacity-40 text-white hover:bg-opacity-60'
                            : isLocked
                            ? 'bg-gray-700 bg-opacity-50 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Level indicator */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            isCurrent
                              ? 'bg-white text-purple-600'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : isLocked
                              ? 'bg-gray-600 text-gray-400'
                              : 'bg-purple-500 text-white'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-base">{level.name}</h3>
                              {isLocked && <span className="text-xs">🔒</span>}
                            </div>
                            <p className={`text-sm ${isCurrent ? 'text-purple-100' : 'opacity-80'}`}>
                              {level.description}
                            </p>
                            {!isLocked && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {level.items.slice(0, 3).map(item => (
                                  <span key={item} className={`text-xs px-2 py-0.5 rounded-full ${
                                    isCurrent ? 'bg-white bg-opacity-20' : 'bg-purple-500 bg-opacity-30'
                                  }`}>
                                    {getDisplayName(item)}
                                  </span>
                                ))}
                                {level.items.length > 3 && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    isCurrent ? 'bg-white bg-opacity-20' : 'bg-purple-500 bg-opacity-30'
                                  }`}>
                                    +{level.items.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Level Details */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-3xl font-bold text-white">{currentLevel.name}</h2>
                  <div className="text-sm text-gray-400">
                    Level {currentLevelIndex + 1}/{CURRICULUM.length}
                  </div>
                </div>
                <p className="text-gray-300 text-lg mb-4">{currentLevel.description}</p>
                
                {/* Progress bar */}
                <div className="bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${(completedLevels.length / CURRICULUM.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">
                  {completedLevels.length} of {CURRICULUM.length} levels completed
                </p>
              </div>

              {/* Session Info */}
              <div className="bg-purple-900 bg-opacity-30 rounded-xl p-4 mb-6 border border-purple-500 border-opacity-30">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  📊 Session Format
                </h3>
                <div className="space-y-1 text-sm text-purple-200">
                  <p>• <strong>{MAX_QUESTIONS} questions</strong> per session</p>
                  <p>• <strong>3 random keys</strong> ({QUESTIONS_PER_KEY} questions each)</p>
                  <p>• All content is <strong>diatonic</strong> (in-scale)</p>
                  <p>• Target: <strong>{currentLevel.unlockRequirement}% accuracy</strong> to unlock next level</p>
                </div>
              </div>

              {/* What you'll practice */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">🎯 What You'll Practice</h3>
                {currentLevel.type === 'scale_degree' && currentLevel.context && (
                  <div className="mb-3 text-sm text-purple-300 bg-purple-900 bg-opacity-20 p-3 rounded-lg">
                    <strong>Context:</strong> {
                      currentLevel.context === 'major' ? 'Major Scale (Melodic)' :
                      currentLevel.context === 'natural_minor' ? 'Natural Minor Scale (Melodic)' :
                      currentLevel.context === 'major_triads' ? 'Major Scale Triads (Harmonic)' :
                      currentLevel.context === 'minor_triads' ? 'Minor Scale Triads (Harmonic)' :
                      currentLevel.context === 'major_7ths' ? 'Major Scale 7th Chords (Harmonic)' :
                      'Minor Scale 7th Chords (Harmonic)'
                    }
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {currentLevel.items.map(item => (
                    <span
                      key={item}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium"
                    >
                      {currentLevel.type === 'scale_degree' ? `Scale Degree ${item}` : getDisplayName(item)}
                    </span>
                  ))}
                </div>
                {currentLevel.scaleDegrees && (
                  <div className="mt-3 text-sm text-purple-300 bg-purple-900 bg-opacity-20 p-3 rounded-lg">
                    <strong>Focus:</strong> {currentLevel.scaleDegrees.map(d => {
                      const degreeNames = ['I (Root)', 'ii', 'iii', 'IV', 'V (Dominant)', 'vi', 'vii°'];
                      return degreeNames[d];
                    }).join(', ')}
                  </div>
                )}
              </div>

              {/* Sound Settings */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">🎹 Sound</h3>
                <div className="flex gap-2">
                  {(['piano', 'sine', 'sawtooth'] as SynthType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setSynthType(type)}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        synthType === type
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={async () => {
                  // Initialize audio context on user interaction (required for iOS)
                  await audioEngine.initialize();
                  setSessionStarted(true);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-xl font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Play className="w-7 h-7" />
                Start Training
              </button>
            </div>
          </div>
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

          {/* Confusion Matrix */}
          {stats.confusionMatrix && stats.confusionMatrix.length > 0 && (
            <div className="bg-gray-700 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">⚠️ Common Confusions</h3>
              <p className="text-gray-400 text-sm mb-4">
                What you're mixing up - focus here to improve quickly
              </p>
              <div className="space-y-2">
                {stats.confusionMatrix.slice(0, 5).map((confusion, idx) => (
                  <div key={idx} className="bg-red-900 bg-opacity-30 border border-red-500 border-opacity-30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-red-300 font-semibold">
                        {confusion.count}x confused
                      </span>
                    </div>
                    <div className="text-white">
                      Thought it was <span className="font-bold text-red-400">{getDisplayName(confusion.mistook)}</span>
                      {' '} but it was actually <span className="font-bold text-green-400">{getDisplayName(confusion.actuallyWas)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scale Degree Weaknesses */}
          {stats.scaleDegreeWeaknesses && stats.scaleDegreeWeaknesses.length > 0 && (
            <div className="bg-gray-700 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">📍 Weaknesses by Scale Degree</h3>
              <p className="text-gray-400 text-sm mb-4">
                Which positions in the scale are challenging for you
              </p>
              <div className="space-y-2">
                {stats.scaleDegreeWeaknesses.slice(0, 5).map((weakness, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-600 rounded-lg p-3">
                    <div>
                      <span className="text-white font-medium">
                        {weakness.context}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {weakness.correct}/{weakness.attempts} correct
                      </div>
                    </div>
                    <span className={`font-semibold text-lg min-w-[50px] text-right ${
                      weakness.accuracy >= 80 ? 'text-green-400' :
                      weakness.accuracy >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {weakness.accuracy.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item-level breakdown - grouped by type */}
          {stats.weaknesses.length > 0 && (
            <div className="bg-gray-700 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">🎯 Performance by Item</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your accuracy on each specific sound
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.weaknesses
                  .filter(w => w.attempts >= 1)
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .map(weakness => (
                  <div key={weakness.item} className="flex items-center justify-between bg-gray-600 rounded-lg p-3">
                    <span className="text-white font-medium text-sm">
                      {weakness.item}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">
                        {weakness.correct}/{weakness.attempts}
                      </span>
                      <span className={`font-semibold text-sm min-w-[45px] text-right ${
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
