import { useState, useEffect } from 'react';
import { Volume2, BarChart3, Trophy, Play } from 'lucide-react';
import { audioEngine, INTERVALS, TRIADS, SEVENTH_CHORDS, MODES } from './audioEngine';
import { CURRICULUM, getCurrentLevel, canUnlockNextLevel, getDisplayName } from './curriculum';
import { AnalyticsEngine } from './analytics';
import { Question, Answer, QuestionType } from './types';

function App() {
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [analytics] = useState(() => new AnalyticsEngine());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const currentLevel = getCurrentLevel(completedLevels);
  const stats = analytics.getSessionStats();

  useEffect(() => {
    if (sessionStarted && !currentQuestion) {
      generateQuestion();
    }
  }, [sessionStarted, currentQuestion]);

  const generateQuestion = async () => {
    const randomItem = currentLevel.items[Math.floor(Math.random() * currentLevel.items.length)];
    const rootNote = audioEngine.getRandomRootNote();
    
    let playedNotes: string[] = [];
    
    // Play the sound based on question type
    try {
      switch (currentLevel.type) {
        case 'interval':
          playedNotes = await audioEngine.playInterval(rootNote, randomItem as keyof typeof INTERVALS);
          break;
        case 'triad':
          playedNotes = await audioEngine.playTriad(rootNote, randomItem as keyof typeof TRIADS);
          break;
        case 'seventh_chord':
          playedNotes = await audioEngine.playSeventhChord(rootNote, randomItem as keyof typeof SEVENTH_CHORDS);
          break;
        case 'mode':
          playedNotes = await audioEngine.playMode(rootNote, randomItem as keyof typeof MODES);
          break;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }

    const question: Question = {
      id: `q_${Date.now()}`,
      type: currentLevel.type,
      correctAnswer: randomItem,
      rootNote,
      playedNotes,
      timestamp: Date.now(),
    };

    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuestionStartTime(Date.now());
  };

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

    const answerRecord: Answer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
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

          <div className="bg-gray-700 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{currentLevel.name}</h2>
            <p className="text-gray-300 mb-4">{currentLevel.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Level {CURRICULUM.findIndex(l => l.id === currentLevel.id) + 1} of {CURRICULUM.length}
              </span>
              <span>•</span>
              <span>Target: {currentLevel.unlockRequirement}% accuracy</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">You'll practice:</h3>
            <div className="flex flex-wrap gap-2">
              {currentLevel.items.map(item => (
                <span
                  key={item}
                  className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
                >
                  {getDisplayName(item, currentLevel.type)}
                </span>
              ))}
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
              <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
              <div className="space-y-2">
                {stats.weaknesses.map(weakness => (
                  <div key={weakness.item} className="flex items-center justify-between bg-gray-600 rounded-lg p-3">
                    <span className="text-white font-medium">
                      {getDisplayName(weakness.item, currentLevel.type)}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {weakness.correct}/{weakness.attempts}
                      </span>
                      <span className={`font-semibold ${
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
            <p className="text-gray-400 text-sm">Question {stats.totalQuestions + 1}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{stats.accuracy.toFixed(0)}%</div>
            <div className="text-sm text-gray-400">{stats.correctAnswers}/{stats.totalQuestions}</div>
          </div>
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
          
          <p className="text-gray-400 text-sm">Click to replay</p>
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
                {getDisplayName(option, currentLevel.type)}
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
