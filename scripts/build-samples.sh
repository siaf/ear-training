#!/usr/bin/env bash
# Fetch and trim the instrument samples the free tools play, into site/audio/.
# Run once (needs curl + ffmpeg); the output is committed, so deploys don't
# depend on third-party hosts. See site/audio/SOURCES.txt for where they came from.
#
#   piano  — Steinway B grand from the Versilian Community Sample Library
#            (VCSL, CC0 / public domain), close mics, middle velocity layer
#   guitar — steel-string acoustic, University of Iowa Electronic Music Studios
#            (free, no restrictions), via nbrosowsky/tonejs-instruments
# Neither needs a credit. docs/audio-samples.md lists other sources.
#
# Each file: leading silence trimmed (faster response on tap), mono, capped in
# length with a fade-out, 96 kbps MP3.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=site/audio
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

process() { # src dst seconds
  local len=$3
  ffmpeg -v error -y -i "$1" -ac 1 \
    -af "silenceremove=start_periods=1:start_threshold=-55dB,atrim=0:${len},afade=t=out:st=$(echo "$len - 0.6" | bc):d=0.6" \
    -b:a 96k "$2"
}

fetch_set() { # name baseUrl seconds files...
  local name=$1 base=$2 len=$3; shift 3
  mkdir -p "$OUT/$name"
  for f in "$@"; do
    curl -sfL -o "$TMP/$f" "$base$f"
    process "$TMP/$f" "$OUT/$name/$f" "$len"
  done
}

rm -rf "$OUT/piano" "$OUT/nylon"

# Piano: VCSL samples every whole tone; C2–C7 covers every tool (the sampler
# pitch-shifts at most a semitone). Saved as e.g. Fs3.mp3.
mkdir -p "$OUT/piano"
VCSL=https://raw.githubusercontent.com/sgossner/VCSL/master/Chordophones/Zithers/Grand%20Piano,%20Steinway%20B/Sus
for o in 2 3 4 5 6; do
  for n in C D E Fs Gs As; do
    src="JHPiano_Sus_Close_${n/s/%23}${o}_vl3_rr1.wav"
    curl -sfL -o "$TMP/p.wav" "$VCSL/$src"
    process "$TMP/p.wav" "$OUT/piano/${n}${o}.mp3" 3.5
  done
done
curl -sfL -o "$TMP/p.wav" "$VCSL/JHPiano_Sus_Close_C7_vl3_rr1.wav"
process "$TMP/p.wav" "$OUT/piano/C7.mp3" 3.5

# Steel-string guitar: every minor third, E2–E5 (open low E to fret 12 high E).
fetch_set guitar https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/ 3 \
  E2.mp3 G2.mp3 As2.mp3 Cs3.mp3 E3.mp3 G3.mp3 As3.mp3 Cs4.mp3 E4.mp3 G4.mp3 As4.mp3 Cs5.mp3 D5.mp3

du -sh "$OUT"/*
