# 🎵 Ear Training Application

A progressive ear training application designed to develop musical listening skills through intelligent, context-aware practice.

## Features

### 🎯 Progressive Curriculum
- **Logical Learning Path**: Start with major/minor thirds, progress through triads, seventh chords, and modes
- **Adaptive Difficulty**: Each level unlocks based on mastery (accuracy thresholds)
- **10 Structured Levels**: From basic intervals to all seven modes of the major scale

### 📊 Intelligent Analytics
- **Detailed Tracking**: Every answer is tracked with specific item identification
- **Weakness Detection**: Automatically identifies which specific intervals, chords, or modes need more practice
- **Personalized Insights**: Get actionable feedback based on your performance patterns
- **No Spoilers**: You won't see the correct answer during practice - we track it behind the scenes for analysis

### 🎼 Musical Content
- **Intervals**: All common intervals from minor 2nd to octave
- **Triads**: Major, minor, diminished, augmented
- **Seventh Chords**: Major 7, minor 7, dominant 7, half-diminished, diminished, and more
- **Modes**: All seven modes of the major scale

### 🔮 Future Enhancements
- **Contextual Learning**: Practice with drum loops, bass lines, and drone notes
- **Multiple Root Notes**: Train across all 12 keys
- **Custom Sessions**: Create your own practice routines
- **Progress Tracking**: Long-term statistics and improvement graphs

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown (typically `http://localhost:5173`)

### Build for Production

```bash
npm run build
npm run preview
```

## How It Works

### The Learning Philosophy

Unlike traditional ear training that throws random sounds at you, this app follows a logical progression:

1. **Foundation**: Learn to distinguish major vs minor thirds (the basis of chord quality)
2. **Application**: Apply that knowledge to full major and minor triads
3. **Expansion**: Add perfect fifths and other intervals
4. **Complexity**: Progress to seventh chords and modes

### The Analytics Advantage

The app tracks every question by the **actual sound played**, not just whether you got it right. This means:

- If you consistently miss A minor but get other minor chords, we'll tell you
- If you confuse major 7ths with minor 7ths, you'll see that pattern
- You get specific, actionable insights instead of generic "practice more"

### Session Flow

1. **Start Session**: Choose your current level
2. **Listen & Answer**: Hear a sound, identify what it is
3. **Immediate Feedback**: See if you're correct (but not what the answer was)
4. **Continue**: Build up a session of 10-20 questions
5. **Review**: See detailed breakdown of your strengths and weaknesses
6. **Progress**: Unlock new levels as you master each one

## Technology Stack

- **React + TypeScript**: Modern, type-safe UI development
- **Tone.js**: Professional-grade Web Audio synthesis
- **Tailwind CSS**: Beautiful, responsive styling
- **Vite**: Lightning-fast development and builds

## Project Structure

```
src/
├── App.tsx              # Main application component
├── audioEngine.ts       # Tone.js audio synthesis
├── curriculum.ts        # Progressive learning levels
├── analytics.ts         # Performance tracking and insights
├── types.ts            # TypeScript type definitions
└── main.tsx            # Application entry point
```

## License

MIT
