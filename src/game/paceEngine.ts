import { PacePhase } from './types';
import { PACE_CONFIG } from './constants';
import { audio } from './audio';

export class PaceEngine {
  public currentPace: PacePhase = 'CALM';
  public timeInCurrentPace: number = 0;
  public paceDuration: number = 18;
  public totalPaceTransitions: number = 0;
  public highestPaceInRun: PacePhase = 'CALM';

  // Dynamic sequence generator
  private paceSequence: PacePhase[] = [];
  private sequenceIndex: number = 0;
  private onPaceChangeCallback?: (newPace: PacePhase, prevPace: PacePhase) => void;

  constructor() {
    this.reset();
  }

  public reset() {
    this.currentPace = 'CALM';
    this.timeInCurrentPace = 0;
    this.paceDuration = PACE_CONFIG.CALM.duration;
    this.totalPaceTransitions = 0;
    this.highestPaceInRun = 'CALM';
    this.sequenceIndex = 0;
    this.generateNewPaceCycle(true);
  }

  public setOnPaceChange(cb: (newPace: PacePhase, prevPace: PacePhase) => void) {
    this.onPaceChangeCallback = cb;
  }

  public update(delta: number): { paceChanged: boolean; newPace: PacePhase; prevPace: PacePhase } {
    this.timeInCurrentPace += delta;

    if (this.timeInCurrentPace >= this.paceDuration) {
      const prevPace = this.currentPace;
      this.sequenceIndex++;

      if (this.sequenceIndex >= this.paceSequence.length) {
        this.generateNewPaceCycle(false);
        this.sequenceIndex = 0;
      }

      this.currentPace = this.paceSequence[this.sequenceIndex];
      this.timeInCurrentPace = 0;
      this.paceDuration = PACE_CONFIG[this.currentPace].duration;
      this.totalPaceTransitions++;

      this.updateHighestPace(this.currentPace);

      audio.updatePace(this.currentPace);
      audio.playPaceChange();

      if (this.onPaceChangeCallback) {
        this.onPaceChangeCallback(this.currentPace, prevPace);
      }

      return { paceChanged: true, newPace: this.currentPace, prevPace };
    }

    return { paceChanged: false, newPace: this.currentPace, prevPace: this.currentPace };
  }

  private updateHighestPace(pace: PacePhase) {
    const ranks: Record<PacePhase, number> = {
      CALM: 1,
      BREATHER: 2,
      BUILD: 3,
      RUSH: 4,
      CHAOS: 5,
    };
    if (ranks[pace] > ranks[this.highestPaceInRun]) {
      this.highestPaceInRun = pace;
    }
  }

  private generateNewPaceCycle(isInitial: boolean) {
    if (isInitial) {
      // First cycle is predictable and welcoming
      this.paceSequence = ['CALM', 'BUILD', 'RUSH', 'BREATHER', 'CHAOS'];
    } else {
      // Varied dynamic endless combinations
      const variations: PacePhase[][] = [
        ['BREATHER', 'BUILD', 'RUSH', 'BREATHER', 'CHAOS'],
        ['BUILD', 'RUSH', 'CHAOS', 'BREATHER', 'RUSH'],
        ['BREATHER', 'CHAOS', 'BUILD', 'RUSH', 'BREATHER'],
        ['BUILD', 'BREATHER', 'RUSH', 'CHAOS', 'BREATHER'],
        ['RUSH', 'BREATHER', 'BUILD', 'CHAOS', 'RUSH'],
      ];
      const pick = variations[Math.floor(Math.random() * variations.length)];
      this.paceSequence = pick;
    }
  }

  public getDistanceSpeedMultiplier(distance: number): number {
    if (distance <= 300) {
      return 1.0 + (distance / 300) * 0.15; // 1.0 -> 1.15
    } else if (distance <= 700) {
      return 1.15 + ((distance - 300) / 400) * 0.20; // 1.15 -> 1.35
    } else if (distance <= 1200) {
      return 1.35 + ((distance - 700) / 500) * 0.25; // 1.35 -> 1.60
    } else if (distance <= 2000) {
      return 1.60 + ((distance - 1200) / 800) * 0.35; // 1.60 -> 1.95
    } else {
      // 2000m+: Continues scaling infinitely!
      return 1.95 + ((distance - 2000) / 500) * 0.15;
    }
  }

  public getTargetSpeed(distance: number = 0): number {
    const basePaceSpeed = PACE_CONFIG[this.currentPace].speed;
    const distMultiplier = this.getDistanceSpeedMultiplier(distance);
    // Intra-phase ramp: speed increases by up to +8% as the current phase reaches its climax
    const intraPhaseRamp = 1.0 + (this.timeInCurrentPace / Math.max(1, this.paceDuration)) * 0.08;
    return basePaceSpeed * distMultiplier * intraPhaseRamp;
  }

  public getProgressFraction(): number {
    return Math.min(1, this.timeInCurrentPace / this.paceDuration);
  }

  public getTimeRemaining(): number {
    return Math.max(0, this.paceDuration - this.timeInCurrentPace);
  }
}
