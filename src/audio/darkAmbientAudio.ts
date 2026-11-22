export class DarkAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;

  public start(): boolean {
    if (this.isPlaying) return true;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }

      const ctx = this.ctx;
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.22, now + 1.1);
      master.connect(ctx.destination);
      this.masterGain = master;

      // Cathedral stone-hall stereo feedback delay network
      const delayL = ctx.createDelay(1.0);
      delayL.delayTime.setValueAtTime(0.37, now);
      const delayR = ctx.createDelay(1.0);
      delayR.delayTime.setValueAtTime(0.53, now);

      const feedbackL = ctx.createGain();
      feedbackL.gain.setValueAtTime(0.38, now);
      const feedbackR = ctx.createGain();
      feedbackR.gain.setValueAtTime(0.36, now);

      const wetFilter = ctx.createBiquadFilter();
      wetFilter.type = 'lowpass';
      wetFilter.frequency.setValueAtTime(420, now);

      const merger = ctx.createChannelMerger(2);

      delayL.connect(feedbackL);
      feedbackL.connect(delayR);
      delayR.connect(feedbackR);
      feedbackR.connect(wetFilter);
      wetFilter.connect(delayL);

      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);
      merger.connect(master);

      // Warm dark low-pass bus for sub & pad voices
      const busFilter = ctx.createBiquadFilter();
      busFilter.type = 'lowpass';
      busFilter.frequency.setValueAtTime(165, now);
      busFilter.Q.setValueAtTime(1.8, now);
      busFilter.connect(master);
      busFilter.connect(delayL);

      // Slow breathing LFO modulating filter cutoff (0.055 Hz ~ 18s cycle)
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.055, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(70, now);
      lfo.connect(lfoGain);
      lfoGain.connect(busFilter.frequency);
      lfo.start(now);

      // Low-frequency gothic drone voices (D1, A1, D2, F2 whisper)
      const voices: Array<{
        freq: number;
        type: OscillatorType;
        gain: number;
        detune: number;
      }> = [
        { freq: 36.71, type: 'sine', gain: 0.45, detune: 0 }, // D1 sub
        { freq: 55.0, type: 'triangle', gain: 0.22, detune: -4 }, // A1 fifth
        { freq: 73.42, type: 'sawtooth', gain: 0.14, detune: 5 }, // D2 octave
        { freq: 73.42, type: 'sawtooth', gain: 0.12, detune: -6 }, // D2 detuned shimmer
        { freq: 87.31, type: 'triangle', gain: 0.09, detune: 3 }, // F2 minor third
      ];

      this.oscillators = [lfo];
      this.nodes = [master, delayL, delayR, feedbackL, feedbackR, wetFilter, merger, busFilter, lfoGain];

      for (const v of voices) {
        const osc = ctx.createOscillator();
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, now);
        osc.detune.setValueAtTime(v.detune, now);

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(v.gain, now);

        osc.connect(voiceGain);
        voiceGain.connect(busFilter);
        osc.start(now);

        this.oscillators.push(osc);
        this.nodes.push(voiceGain);
      }

      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const master = this.masterGain;

    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.55);
    } catch {
      // Ignore gain ramp errors on teardown
    }

    const oscToStop = [...this.oscillators];
    const nodesToDisconnect = [...this.nodes];

    window.setTimeout(() => {
      for (const osc of oscToStop) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore already stopped oscillators
        }
      }
      for (const node of nodesToDisconnect) {
        try {
          node.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }, 600);

    this.oscillators = [];
    this.nodes = [];
    this.masterGain = null;
    this.isPlaying = false;
  }

  public dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
