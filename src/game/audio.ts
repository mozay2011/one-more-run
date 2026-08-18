import { PacePhase } from './types';

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private musicVolume: number = 0.7;
  private sfxVolume: number = 0.8;

  private isMusicPlaying: boolean = false;
  private currentPace: PacePhase = 'CALM';
  private timerId: number | null = null;
  private stepIndex: number = 0;
  private bpm: number = 110;

  private coinStreakCount: number = 0;
  private coinStreakResetTimer: number | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio not supported or failed to initialize', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(music: number, sfx: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
  }

  // ================= DYNAMIC PROCEDURAL SYNTH SOUNDTRACK =================
  public startMusic(pace: PacePhase = 'CALM') {
    this.init();
    this.resume();
    this.currentPace = pace;
    this.isMusicPlaying = true;
    this.updatePaceBpm(pace);
    this.stepIndex = 0;

    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }

    this.scheduleNextBeat();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public updatePace(pace: PacePhase) {
    this.currentPace = pace;
    this.updatePaceBpm(pace);
  }

  private updatePaceBpm(pace: PacePhase) {
    switch (pace) {
      case 'CALM':
        this.bpm = 112;
        break;
      case 'BUILD':
        this.bpm = 128;
        break;
      case 'RUSH':
        this.bpm = 144;
        break;
      case 'BREATHER':
        this.bpm = 114;
        break;
      case 'CHAOS':
        this.bpm = 154;
        break;
    }
  }

  private scheduleNextBeat() {
    if (!this.isMusicPlaying || !this.ctx) return;

    const intervalMs = (60 / this.bpm / 4) * 1000; // 16th note interval

    this.timerId = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx) return;
      this.playStep(this.stepIndex);
      this.stepIndex = (this.stepIndex + 1) % 32;
    }, intervalMs);
  }

  private playStep(step: number) {
    if (!this.ctx || !this.musicGain || this.musicVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const isQuarter = step % 4 === 0;
    const isOffbeat = step % 4 === 2;
    const isEighth = step % 2 === 0;

    // 1. Kick Drum
    if (isQuarter) {
      if (this.currentPace !== 'BREATHER' || (step % 8 === 0)) {
        this.playSynthKick(now, this.currentPace === 'RUSH' || this.currentPace === 'CHAOS');
      }
    }

    // 2. Hi-Hats
    if (this.currentPace === 'RUSH' || this.currentPace === 'CHAOS') {
      this.playSynthHiHat(now, step % 2 === 0 ? 0.04 : 0.02, step % 2 === 0 ? 8000 : 10000);
    } else if (this.currentPace === 'BUILD') {
      if (isEighth) this.playSynthHiHat(now, 0.03, 7500);
    } else if (isOffbeat) {
      this.playSynthHiHat(now, 0.02, 6000);
    }

    // 3. Snare / Clap
    if (step % 8 === 4) {
      if (this.currentPace !== 'CALM') {
        this.playSynthSnare(now);
      }
    }

    // 4. Bassline
    if (isEighth) {
      this.playSynthBass(now, step);
    }

    // 5. Arpeggio / Melody (on RUSH, BUILD, CHAOS)
    if (this.currentPace === 'RUSH' || this.currentPace === 'CHAOS' || this.currentPace === 'BUILD') {
      if (step % 2 === 1) {
        this.playSynthArp(now, step);
      }
    }
  }

  private playSynthKick(time: number, punchy: boolean) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(punchy ? 150 : 120, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + (punchy ? 0.25 : 0.2));

    gain.gain.setValueAtTime(punchy ? 0.5 : 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (punchy ? 0.25 : 0.2));

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSynthSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.12);
  }

  private playSynthHiHat(time: number, vol: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = freq;

    filter.type = 'highpass';
    filter.frequency.value = 6000;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playSynthBass(time: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Notes: C2 (65.4), Eb2 (77.8), F2 (87.3), G2 (98.0), Bb2 (116.5)
    const scale = [65.4, 65.4, 77.8, 87.3, 65.4, 98.0, 116.5, 87.3];
    const note = scale[(Math.floor(step / 4)) % scale.length];

    osc.type = this.currentPace === 'CHAOS' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(note, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.currentPace === 'RUSH' ? 1200 : 600, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.18);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playSynthArp(time: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High notes in C Minor Pentatonic: C4 (261.6), Eb4 (311.1), F4 (349.2), G4 (392.0), Bb4 (466.2), C5 (523.3)
    const notes = [261.6, 311.1, 349.2, 392.0, 466.2, 523.3, 622.2, 784.0];
    const note = notes[(step * 3) % notes.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  // ================= SOUND EFFECTS =================
  public playJump() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playSlide() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  public playLaneChange() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playCoin() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    if (this.coinStreakResetTimer) {
      window.clearTimeout(this.coinStreakResetTimer);
    }
    this.coinStreakCount = (this.coinStreakCount + 1) % 8;
    this.coinStreakResetTimer = window.setTimeout(() => {
      this.coinStreakCount = 0;
    }, 1200);

    // Pentatonic scale chime
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.6, 1318.5];
    const freq = baseFreqs[this.coinStreakCount];

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  public playPowerUp() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playShieldBreak() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playNearMiss() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playPaceChange() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playCrash() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playButtonClick() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audio = new AudioManager();
