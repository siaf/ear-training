import { PitchDetector as PitchyDetector } from 'pitchy';

export interface PitchSample {
  /** Detected fundamental frequency in Hz. */
  frequency: number;
  /** Pitchy confidence in [0,1]. Values above ~0.9 are reliable. */
  clarity: number;
  /** RMS of the analysis window — cheap voicing / noise gate. */
  rms: number;
  /** performance.now() timestamp in ms. */
  t: number;
}

export interface StartOptions {
  /** Analysis window size. Must be a power of two. Default 2048. */
  bufferSize?: number;
  /** Discard samples below this clarity. Default 0. Consumers typically filter later. */
  minClarity?: number;
  /** Discard samples with RMS below this (silence gate). Default 0.01. */
  minRms?: number;
  /** If you already have an unlocked AudioContext (e.g. Tone.context.rawContext), pass it. Otherwise a new one is created. */
  audioContext?: AudioContext;
}

type SampleListener = (s: PitchSample) => void;

class MicPitchDetector {
  private audioContext: AudioContext | null = null;
  private ownsContext = false;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: ReturnType<typeof PitchyDetector.forFloat32Array> | null = null;
  private buffer: Float32Array | null = null;
  private rafHandle: number | null = null;
  private listener: SampleListener | null = null;
  private options: Required<Omit<StartOptions, 'audioContext'>> = {
    bufferSize: 2048,
    minClarity: 0,
    minRms: 0.01,
  };
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Request microphone access and start streaming pitch samples to `onSample`.
   * Must be called from a user gesture on iOS/Safari. Idempotent: calling while running is a no-op.
   */
  async start(onSample: SampleListener, opts: StartOptions = {}): Promise<void> {
    if (this.running) return;

    this.options = {
      bufferSize: opts.bufferSize ?? 2048,
      minClarity: opts.minClarity ?? 0,
      minRms: opts.minRms ?? 0.01,
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    const ctx =
      opts.audioContext ??
      new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.ownsContext = !opts.audioContext;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = this.options.bufferSize;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    const detector = PitchyDetector.forFloat32Array(analyser.fftSize);

    this.audioContext = ctx;
    this.stream = stream;
    this.source = source;
    this.analyser = analyser;
    this.buffer = buffer;
    this.detector = detector;
    this.listener = onSample;
    this.running = true;

    const tick = () => {
      if (!this.running || !this.analyser || !this.buffer || !this.detector || !this.audioContext || !this.listener) {
        return;
      }
      const buf = this.buffer as Float32Array<ArrayBuffer>;
      this.analyser.getFloatTimeDomainData(buf);

      // RMS as a cheap voicing gate
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);

      if (rms >= this.options.minRms) {
        const [frequency, clarity] = this.detector.findPitch(buf, this.audioContext.sampleRate);
        if (clarity >= this.options.minClarity && frequency > 0 && Number.isFinite(frequency)) {
          this.listener({ frequency, clarity, rms, t: performance.now() });
        }
      }
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  /** Stop the detector and release the microphone. Safe to call when not running. */
  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ownsContext) {
      this.audioContext?.close().catch(() => {});
    }
    this.source = null;
    this.analyser = null;
    this.stream = null;
    this.audioContext = null;
    this.detector = null;
    this.buffer = null;
    this.listener = null;
  }
}

export const micPitchDetector = new MicPitchDetector();
