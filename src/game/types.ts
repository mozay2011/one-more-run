export type PacePhase = 'CALM' | 'BUILD' | 'RUSH' | 'BREATHER' | 'CHAOS';

export type PowerUpType = 'MAGNET' | 'SHIELD' | 'SCORE_BOOST' | 'SPEED_BOOST' | 'TIME_SLOW';

export type ObstacleType = 
  | 'BARRIER_LOW'       // Jump over
  | 'BARRIER_HIGH'      // Slide under
  | 'ROAD_BLOCK'        // Switch lane
  | 'TRAIN_STATIC'      // Big obstacle (switch lane or climb ramp)
  | 'TRAIN_MOVING'      // Moving towards player
  | 'CAR_MOVING'        // Faster moving car
  | 'LASER_GATE'        // Pulsing laser gate (slide under or time jump)
  | 'GAP'               // Road gap (jump across)
  | 'CONSTRUCTION_SIGN' // Switch lane
  | 'RAMP';             // Run up onto train roof / higher path

export type EnvironmentTheme = 
  | 'DOWNTOWN' 
  | 'TRAIN_STATION' 
  | 'UNDERGROUND' 
  | 'ROOFTOPS' 
  | 'HIGHWAY' 
  | 'NEON_DISTRICT' 
  | 'INDUSTRIAL';

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  unlockedByDefault?: boolean;
  unlocked?: boolean;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    hoodie: string;
    pants: string;
    shoes: string;
    hair: string;
  };
  perk: {
    name: string;
    description: string;
    magnetBonus?: number;
    scoreBonus?: number;
    coinBonus?: number;
    jumpFloat?: number;
  };
}

export interface UpgradeConfig {
  id: PowerUpType;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  levels: {
    duration: number; // seconds
    potency: number;  // multiplier / radius
    description: string;
  }[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  goal: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  type: 
    | 'DISTANCE_SINGLE' 
    | 'DISTANCE_TOTAL' 
    | 'COINS_SINGLE' 
    | 'COINS_TOTAL' 
    | 'COMBO_MAX' 
    | 'REACH_PACE' 
    | 'DODGE_OBSTACLES' 
    | 'USE_POWERUPS' 
    | 'TOTAL_RUNS'
    | 'CLOSE_CALLS';
  targetValue?: string | number;
}

export interface PlayerProgress {
  coins: number;
  xp: number;
  level: number;
  highScore: number;
  bestDistance: number;
  highestPaceReached: PacePhase;
  totalRuns: number;
  totalCoinsCollected: number;
  totalDistanceRun: number;
  selectedCharacterId: string;
  unlockedCharacters: string[];
  upgradeLevels: Record<PowerUpType, number>;
  missions: Mission[];
  lastDailyRewardDate: string | null;
  dailyRewardStreak: number;
}

export interface GameStats {
  score: number;
  coinsCollected: number;
  distance: number;
  combo: number;
  maxCombo: number;
  pace: PacePhase;
  paceTimeRemaining: number;
  dodgesCount: number;
  closeCallsCount: number;
  activePowerUps: Record<PowerUpType, number>; // remaining seconds
  speed: number;
  multiplier: number;
  isGameOver: boolean;
  isPaused: boolean;
  highestPaceInRun: PacePhase;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'high' | 'medium' | 'low';
  screenShake: boolean;
  speedLines: boolean;
  showTouchControls: boolean;
  debugHitboxes?: boolean;
}
