# Instrument samples: sources, licences and how to use them

Notes from November 2026 on getting real-sounding instruments into Fifths without paying for them. Covers what we use now, free sources that need no credit, how Crown of Shadow (`~/code/games/crown-of-shadow`) built its orchestra, and where Fifths could use samples next.

## What we use now

| Where | Sound | Source | Licence | Credit needed? |
|---|---|---|---|---|
| Free tools (site) | Piano | Steinway B grand, VCSL (close mics, middle velocity layer, every whole tone C2–C7), self-hosted in `site/audio/piano/` | CC0 | No |
| Free tools (site) | Steel-string guitar | University of Iowa MIS (every minor third E2–D5), self-hosted in `site/audio/guitar/` | No restrictions | No |
| App | Piano (the default voice) | Salamander, hotlinked from `tonejs.github.io` | CC BY 3.0 | **Yes, and the app doesn't credit it yet** |
| App | Guitar, bass, violin, cello voices | `nbrosowsky/tonejs-instruments`, hotlinked from GitHub Pages | Mixed (see below) | Depends on the instrument |

The free tools need no credits. `site/audio/SOURCES.txt` records where the samples came from. We first used Salamander for the tools' piano, then switched to the VCSL Steinway so no credit is needed. A nylon guitar from Freesound (quartertone, CC BY 4.0) was also tried and dropped for the same reason.

`scripts/build-samples.sh` rebuilds the site's sample folders: it trims the silence before each note, makes the files mono, cuts them to a few seconds with a fade and re-encodes them at 96 kbps. `site/tools/_shared/samples.js` plays them, with a `Tone.Sampler` for the Tone-based tools and a plain Web Audio player for the vocal range test.

`nbrosowsky/tonejs-instruments` labels its samples "CC-by 3.0", but its `sample-source-info.txt` lists the real sources. The comment in `src/audioEngine.ts` that calls them "public domain" is wrong:

- guitar-acoustic: University of Iowa (no restrictions).
- guitar-nylon: Freesound, quartertone (CC BY 4.0).
- guitar-electric and bass: Karoryfer (licence not checked).
- cello: Freesound, flcellogrl (licence not checked).
- piano, violin and most orchestral instruments: VSCO 2 Community Edition.

### To-do: the app (`src/audioEngine.ts`)

- [ ] **Piano licence.** The app's default piano is Salamander (CC BY 3.0), and the app doesn't credit it. Either switch it to the VCSL Steinway the tools use (no credit; the processed files are already in `site/audio/piano/`), or add a credit line, for example in Settings.
- [ ] **Self-host the app's samples.** It hotlinks `tonejs.github.io` and `nbrosowsky.github.io`. If either goes down or moves, the app falls back to its synth. Copy processed files into `public/audio/` with the same script approach.
- [ ] **Check the other voices' licences** before keeping them: bass and electric guitar (Karoryfer), cello (Freesound, flcellogrl), violin (VSCO 2 CE). Replace any that need credit with Iowa, VCSL or Philharmonia equivalents. Fix the "public domain" comment in `audioEngine.ts`.
- [ ] **Drone:** a sampled cello or low-strings drone, looped through the steady middle (see "Where Fifths could use samples next").
- [ ] **Rhythm lessons:** real woodblock, claves or rim sounds from VCSL (CC0) instead of `MembraneSynth`.
- [ ] **Trim the leading silence** of whatever the app keeps (as `build-samples.sh` does), so sounds answer taps without lag.

## Free sources that need no credit

| Source | What's in it | Terms | Notes |
|---|---|---|---|
| [University of Iowa MIS](https://theremin.music.uiowa.edu/MIS.html) | Piano (Steinway), guitar, orchestral strings, winds and brass, some percussion. One file per note, several dynamics | "Freely available ... may be downloaded and used for any projects, without restrictions." | Recorded dry, in an anechoic chamber. Add a little reverb. The source files are long AIFFs, so trim them and convert to MP3 |
| [VCSL, Versilian Community Sample Library](https://github.com/sgossner/VCSL) | Grand pianos (Steinway B, Kawai), upright pianos, harpsichords, harps, lots of percussion (idiophones and membranophones), some winds | CC0 (public domain) | No guitar. A good candidate for a no-credit piano and for rhythm sounds |
| [Philharmonia Orchestra samples](https://philharmonia.co.uk/resources/sound-samples/) | Every standard orchestral instrument at several lengths and dynamics, plus guitar, mandolin, banjo and a large percussion section. MP3s in zips by section | Free, including commercial use. Credit not required. **Only restriction: you can't sell or make the samples available "as is"** (as samples or as a sampler instrument) | What Crown of Shadow uses. No piano |

Avoid the General MIDI soundfont folders (`gleitz/midi-js-soundfonts`, FluidR3 / MusyngKite). Their files are about 16 KB each and sound low quality next to the sets above.

About Philharmonia's "as is" rule: using the samples to play our own music or exercises is fine. Serving the original files unchanged from a public folder is closer to making them available as is. Crown of Shadow copies them unchanged into `audio/orchestra/`. Processing them, as `build-samples.sh` does, is safer, and we shouldn't offer them as a download.

## How Crown of Shadow got good orchestral samples

Files to read in `~/code/games/crown-of-shadow`:

- `tools/audio/build-orchestra.py`: chooses and checks the samples.
- `src/data/orchestra.js`: its generated output.
- `src/music.js`: loading and playing them (`loadRecorded`, `speakTime`, `slice`, and the player around line 1360).
- The README's audio section.

### Choosing the recordings (`build-orchestra.py`)

1. Download Philharmonia's section zips (Strings, Brass, Woodwind, Percussion), unzip them into one folder, and run the script on it. It needs numpy and ffmpeg.
2. Each instrument set says which source folders cover which MIDI range, and which recordings ("takes") it wants. A take is a length (`15`, `1`, `05`, `025` seconds) plus a dynamic (`forte`, `mezzo-piano` …) and an articulation (`arco-normal`, `pizz-normal`). For example, "strings, soft" is double bass, then cello, then viola, then violin up the range, sustained and soft.
3. **Every recording is pitch-checked.** For each semitone, the script runs an FFT over the loud part of each candidate and finds how many cents it is from the note its name claims (it checks harmonics 1–3, so vibrato averages out):
   - Within 5 cents, it's used as recorded.
   - Up to 20 cents off, it's used and the game nudges it into tune.
   - Further off, or mislabelled, it's left out and reported.
4. It measures each file:
   - where the note starts (2% of the peak),
   - the steady middle (above 70% of the loudest point),
   - where it has died away (−60 dB),
   - the loudness of the steady middle, and the peak.
5. It copies the chosen originals unchanged into `audio/orchestra/<set>/` and writes all the measurements to `src/data/orchestra.js`: `[midi, take, file, onset, a, b, end, loudness, peak, cents]`.

That's 16 sets (strings, short strings, horn, trumpet, flute, pizzicato, drums, cymbals, gongs …) in 7.6 MB.

### Playing them (`src/music.js`)

- Fetch and decode in the background, eight at a time. Until a set is ready, and if it fails (offline, or opened from a file), the game keeps its synthesized instrument.
- Find the real start in the decoded audio and cut everything before it. Different browsers' MP3 decoders add different amounts of silence, so the stored onset isn't trusted.
- Bring every note to the same loudness. Sustained notes are scaled so their steady middle sits at −18 dB; hits are scaled by their peak. Notes recorded at different levels then sound even.
- Start notes early by their "speak time": the time to reach half the attack's loudness, measured once per file and capped at 0.25 s. A bowed string or flute takes about 0.1 s to speak, so it's triggered that much early and lands on the beat.
- Hold long notes by cross-fading through the steady middle (`a`–`b`), so a 1-second recording can sustain for as long as the music needs.
- Tune the few notes that were up to 20 cents off with `playbackRate`, and borrow the nearest note when a semitone has no good recording.
- Blend several takes of the same note into a small section, then send each instrument group to a shared reverb at its own level.

## Where Fifths could use samples next

| Sound | Now | Suggestion |
|---|---|---|
| Drone (app) | Sine wave, `droneSynth` | A sustained cello or low strings drone (Philharmonia or Iowa), looped through its steady middle the way Crown of Shadow does. Ear-training apps commonly use a cello or tanpura drone, and it makes the tonal centre feel musical |
| Rhythm lessons (app) | `Tone.MembraneSynth`, `getPercSynth` | Real woodblock, claves, rim or snare from VCSL (CC0) or Philharmonia percussion. Short hits are easy: no looping, normalise by peak |
| App instruments | Hotlinked samplers | Self-host them (see the to-do above). Optionally add Philharmonia strings and winds as extra voices, and mandolin or banjo as an extra plucked voice |
| Free tools | Piano and steel guitar samples | Done, with no credit needed |

Keep these as synths on purpose:

- **Foundations "acoustic" drills** (`playAcoustic`: same or different, higher or lower, by a few cents): a pure sine makes small pitch differences unambiguous.
- **Answer feedback blips** (`getFeedbackSynth`): these are UI sounds, not music.
- **The range test's sweep**: a glide between pitches can't be played from single-note recordings.

## Practical rules

- Space samples a minor third apart (or closer). Pitch-shifting a sample more than about a semitone or two makes it sound wrong.
- Trim the silence before the note, or re-detect the start after decoding. Leftover silence is felt as lag on every tap.
- Keep files mono, about 96 kbps and a few seconds long for the web. Load them on the first user gesture, and play a synth until they're ready.
- Self-host, and keep a `CREDITS.txt` next to any files whose licence needs credit.
- Note each source's licence in the build script that fetches it.
