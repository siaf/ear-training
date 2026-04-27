# 🎵 Ear Training Application

A progressive ear training application designed to develop musical listening skills through intelligent, context-aware practice.

**🌐 Live Demo**: [https://siaf.github.io/ear-training/](https://siaf.github.io/ear-training/)

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

### 🎹 Sound Options
- **Piano**: High-quality Salamander Grand Piano samples (default)
- **Sine Wave**: Pure tone for focused listening
- **Sawtooth**: Bright, buzzy tone for variety

### 🎵 Tonality Reference
- **C Major Scale**: Play the full major scale to establish tonality
- **C Major Chord**: Play the tonic triad (I-III-V) for harmonic context
- Available during every question to help orient your ear

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

### Deploy to GitHub Pages

The app is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

**First-time setup:**
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Push your code to the `main` branch

The GitHub Actions workflow will automatically:
- Install dependencies
- Build the app
- Deploy to GitHub Pages

Your site will be live at: `https://siaf.github.io/ear-training/`

**Manual deployment:**
You can also trigger a deployment manually from the **Actions** tab in your GitHub repository.

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
- **Tone.js**: Professional-grade Web Audio synthesis and sampling
- **Salamander Grand Piano**: Free, high-quality piano samples
- **Tailwind CSS**: Beautiful, responsive styling
- **Vite**: Lightning-fast development and builds

## Using Your Own Samples

The app currently uses the free Salamander Grand Piano samples hosted on the Tone.js CDN. To use your own samples:

1. Place your audio files (mp3, wav, or ogg) in the `public` folder
2. Update the `createSynth` method in `src/audioEngine.ts`:
   ```typescript
   urls: {
     C4: "your-sample-C4.mp3",
     // ... add more notes
   },
   baseUrl: "/", // or your CDN URL
   ```
3. The Sampler will automatically pitch-shift to fill in missing notes

## Project Structure

```
src/
├── App.tsx                # Top-level shell: route + session orchestration
├── audioEngine.ts         # Tone.js audio (unchanged)
├── curriculum.ts          # Levels + segments (unchanged)
├── analytics.ts           # In-session stats
├── scaleContext.ts        # Diatonic filtering (unchanged)
├── types.ts               # TypeScript types
├── tokens.css             # Design tokens (playful v2)
├── components/            # Primitives + overlays (Bean, ColorPill, MasteryOverlay, …)
├── lib/                   # segmentColors, calibration, sessionStore, native glue
├── routes/                # One file per surface (Landing, Onboarding, Path, Practice, Results, Stats, Settings, Paywall)
└── main.tsx               # Entry + initNative()
```

## Mobile (iOS + Android)

The app ships to iOS and Android as a Capacitor-wrapped WebView. All the React code runs unchanged inside the native shell.

### Prerequisites
- **iOS**: macOS + [Xcode](https://apps.apple.com/app/xcode/id497799835) (free) + CocoaPods (`brew install cocoapods`).
- **Android**: [Android Studio](https://developer.android.com/studio) (free, any OS).

### Dev workflow
```bash
npm install
npm run ios        # builds web assets, syncs, opens Xcode
npm run android    # builds web assets, syncs, opens Android Studio
```

Alternatively run straight to a connected device/simulator:
```bash
npm run ios:run
npm run android:run
```

### Known issues
- **CocoaPods `Encoding::CompatibilityError`** under Ruby 3.4+: if `npx cap add ios` or `cap sync ios` fails with a unicode-normalize error, re-run with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`. The npm scripts above already work on an already-added platform.

### Store submission (later — not needed for local testing)
- **iOS**: Apple Developer Program ($99/yr). Configure bundle id in `capacitor.config.ts` (`io.fifths.app`) and in Xcode signing. Archive → upload to App Store Connect → TestFlight.
- **Android**: Google Play Console ($25 one-time). Generate a signing key, build a signed AAB in Android Studio (`Build → Generate Signed App Bundle`), upload to Play Console.

### Native glue
`src/lib/native.ts` hides the status bar, splash, and wires up a one-time gesture listener to unlock iOS AudioContext. It's a no-op on web.

## License

MIT
