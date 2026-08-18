import { CharacterConfig, UpgradeConfig, Mission, PlayerProgress, GameSettings, PacePhase } from './types';

export const LANE_WIDTH = 2.8;
export const LANE_X = {
  LEFT: LANE_WIDTH,
  CENTER: 0,
  RIGHT: -LANE_WIDTH,
};

export const PACE_CONFIG: Record<PacePhase, {
  name: string;
  speed: number;
  duration: number; // in seconds
  description: string;
  color: string;
  bgTint: string;
  fogColor: number;
  obstacleDensity: number;
  movingObstacleChance: number;
  coinMultiplier: number;
  bpm: number;
}> = {
  CALM: {
    name: 'CALM',
    speed: 18,
    duration: 18,
    description: 'Find your rhythm',
    color: '#38bdf8', // sky blue
    bgTint: 'rgba(56, 189, 248, 0.15)',
    fogColor: 0x1e293b,
    obstacleDensity: 0.5,
    movingObstacleChance: 0.0,
    coinMultiplier: 1.0,
    bpm: 110,
  },
  BUILD: {
    name: 'BUILD',
    speed: 24,
    duration: 22,
    description: 'Pace increasing!',
    color: '#f59e0b', // amber
    bgTint: 'rgba(245, 158, 11, 0.2)',
    fogColor: 0x27272a,
    obstacleDensity: 0.8,
    movingObstacleChance: 0.25,
    coinMultiplier: 1.5,
    bpm: 128,
  },
  RUSH: {
    name: 'RUSH',
    speed: 32,
    duration: 18,
    description: 'MAX VELOCITY - STAY SHARP!',
    color: '#ef4444', // red
    bgTint: 'rgba(239, 68, 68, 0.25)',
    fogColor: 0x3f1212,
    obstacleDensity: 1.2,
    movingObstacleChance: 0.6,
    coinMultiplier: 2.0,
    bpm: 144,
  },
  BREATHER: {
    name: 'BREATHER',
    speed: 20,
    duration: 15,
    description: 'Catch your breath & hoard coins!',
    color: '#10b981', // emerald
    bgTint: 'rgba(16, 185, 129, 0.2)',
    fogColor: 0x064e3b,
    obstacleDensity: 0.4,
    movingObstacleChance: 0.0,
    coinMultiplier: 2.5,
    bpm: 112,
  },
  CHAOS: {
    name: 'CHAOS',
    speed: 36,
    duration: 20,
    description: 'UNPREDICTABLE HAZARDS - SURVIVE!',
    color: '#a855f7', // purple / violet
    bgTint: 'rgba(168, 85, 247, 0.3)',
    fogColor: 0x2e1065,
    obstacleDensity: 1.4,
    movingObstacleChance: 0.8,
    coinMultiplier: 3.0,
    bpm: 156,
  },
};

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'kai',
    name: 'Kai',
    title: 'The Street Runner',
    description: 'Agile and determined runner with quick reflexes and balanced urban parkour skills.',
    price: 0,
    unlockedByDefault: true,
    colorScheme: {
      primary: '#06b6d4',   // cyan
      secondary: '#f97316', // orange
      accent: '#ffffff',
      hoodie: '#0891b2',
      pants: '#1e293b',
      shoes: '#f97316',
      hair: '#1e293b',
    },
    perk: {
      name: 'Street Instinct',
      description: 'Standard agility with fast lane-change recovery.',
      scoreBonus: 1.0,
      coinBonus: 1.0,
    },
  },
  {
    id: 'nova',
    name: 'Nova',
    title: 'Cyber Specialist',
    description: 'Equipped with custom electromagnetic gear that pulls coins from wider distances.',
    price: 1500,
    colorScheme: {
      primary: '#c084fc',   // purple
      secondary: '#ec4899', // pink
      accent: '#22d3ee',    // cyan glow
      hoodie: '#581c87',
      pants: '#0f172a',
      shoes: '#a855f7',
      hair: '#ec4899',
    },
    perk: {
      name: 'Magnetic Resonance',
      description: '+40% Magnet duration and +50% magnetic pull radius.',
      magnetBonus: 1.4,
      scoreBonus: 1.1,
    },
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    title: 'Parkour Ace',
    description: 'Aerodynamic free-runner capable of prolonged aerial float and stylish dodges.',
    price: 3500,
    colorScheme: {
      primary: '#10b981',   // emerald
      secondary: '#14b8a6', // teal
      accent: '#facc15',    // yellow
      hoodie: '#047857',
      pants: '#334155',
      shoes: '#10b981',
      hair: '#0f172a',
    },
    perk: {
      name: 'Air Hangtime',
      description: '+25% Jump float duration and 2x combo points from close-call dodges.',
      jumpFloat: 1.25,
      scoreBonus: 1.2,
    },
  },
  {
    id: 'maya',
    name: 'Maya',
    title: 'Neon Courier',
    description: 'High-speed district courier who earns extra bounty coins and extra score multipliers.',
    price: 6000,
    colorScheme: {
      primary: '#eab308',   // gold / yellow
      secondary: '#f43f5e', // rose
      accent: '#fb923c',    // orange
      hoodie: '#18181b',
      pants: '#27272a',
      shoes: '#eab308',
      hair: '#f59e0b',
    },
    perk: {
      name: 'Bounty Rush',
      description: '+30% bonus coins collected and +50% Score Boost duration.',
      coinBonus: 1.3,
      scoreBonus: 1.25,
    },
  },
];

export const UPGRADES: Record<string, UpgradeConfig> = {
  MAGNET: {
    id: 'MAGNET',
    name: 'Coin Magnet',
    description: 'Attracts all nearby coins towards your runner.',
    icon: 'Magnet',
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 2.2,
    levels: [
      { duration: 8, potency: 6, description: 'Base 8s duration, 6m radius' },
      { duration: 11, potency: 8, description: '11s duration, 8m radius' },
      { duration: 14, potency: 10, description: '14s duration, 10m radius' },
      { duration: 18, potency: 12, description: '18s duration, 12m radius' },
      { duration: 24, potency: 16, description: 'MAX: 24s duration, super vortex radius' },
    ],
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Energy Shield',
    description: 'Protects you from crashing into obstacles.',
    icon: 'Shield',
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 2.5,
    levels: [
      { duration: 12, potency: 1, description: 'Protects against 1 obstacle collision' },
      { duration: 16, potency: 1, description: '16s protection or 1 collision + 1.5s invulnerability' },
      { duration: 20, potency: 2, description: 'Protects against up to 2 collisions' },
      { duration: 25, potency: 2, description: '25s protection with 2 collision charges' },
      { duration: 30, potency: 3, description: 'MAX: 3 collision charges + destroys hit obstacles' },
    ],
  },
  SCORE_BOOST: {
    id: 'SCORE_BOOST',
    name: 'Score Multiplier',
    description: 'Supercharges your score generation while running.',
    icon: 'Zap',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 2.3,
    levels: [
      { duration: 10, potency: 2, description: '2x Score Multiplier for 10s' },
      { duration: 14, potency: 2.5, description: '2.5x Score Multiplier for 14s' },
      { duration: 18, potency: 3, description: '3x Score Multiplier for 18s' },
      { duration: 22, potency: 4, description: '4x Score Multiplier for 22s' },
      { duration: 28, potency: 5, description: 'MAX: 5x Mega Score Multiplier for 28s' },
    ],
  },
  SPEED_BOOST: {
    id: 'SPEED_BOOST',
    name: 'Sonic Dash',
    description: 'Launches forward at hyperspeed while automatically collecting coins.',
    icon: 'FastForward',
    maxLevel: 5,
    baseCost: 400,
    costMultiplier: 2.6,
    levels: [
      { duration: 6, potency: 1.4, description: '6s high-speed invulnerable dash' },
      { duration: 8, potency: 1.5, description: '8s dash + auto coin pull' },
      { duration: 10, potency: 1.6, description: '10s supersonic dash' },
      { duration: 13, potency: 1.7, description: '13s hyper-dash with speed lines' },
      { duration: 16, potency: 1.85, description: 'MAX: 16s warp dash with huge coin magnet' },
    ],
  },
  TIME_SLOW: {
    id: 'TIME_SLOW',
    name: 'Reflex Slow-Mo',
    description: 'Slows down obstacles and world speed while keeping your reflexes sharp.',
    icon: 'Clock',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 2.2,
    levels: [
      { duration: 8, potency: 0.65, description: 'Slows world by 35% for 8s' },
      { duration: 11, potency: 0.55, description: 'Slows world by 45% for 11s' },
      { duration: 14, potency: 0.5, description: 'Slows world by 50% for 14s' },
      { duration: 17, potency: 0.45, description: 'Slows world by 55% for 17s' },
      { duration: 22, potency: 0.35, description: 'MAX: Bullet-time matrix slow-mo for 22s' },
    ],
  },
};

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'm_dist_500',
    title: 'First Strides',
    description: 'Run 500 meters in a single run',
    rewardCoins: 150,
    rewardXp: 100,
    goal: 500,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'DISTANCE_SINGLE',
  },
  {
    id: 'm_coins_50',
    title: 'Coin Collector',
    description: 'Collect 50 coins in a single run',
    rewardCoins: 200,
    rewardXp: 120,
    goal: 50,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'COINS_SINGLE',
  },
  {
    id: 'm_pace_rush',
    title: 'Feel The Rush',
    description: 'Survive until reaching the RUSH pace phase',
    rewardCoins: 350,
    rewardXp: 200,
    goal: 1,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'REACH_PACE',
    targetValue: 'RUSH',
  },
  {
    id: 'm_combo_5',
    title: 'Rhythm Master',
    description: 'Reach a Combo multiplier of x5',
    rewardCoins: 250,
    rewardXp: 150,
    goal: 5,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'COMBO_MAX',
  },
  {
    id: 'm_dodge_25',
    title: 'Slick Moves',
    description: 'Dodge or clear 25 obstacles in total',
    rewardCoins: 300,
    rewardXp: 180,
    goal: 25,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'DODGE_OBSTACLES',
  },
  {
    id: 'm_close_5',
    title: 'Living on the Edge',
    description: 'Perform 5 Close Call near-miss dodges',
    rewardCoins: 400,
    rewardXp: 250,
    goal: 5,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'CLOSE_CALLS',
  },
  {
    id: 'm_dist_2000',
    title: 'Marathon Runner',
    description: 'Run 2,000 meters in a single run',
    rewardCoins: 600,
    rewardXp: 400,
    goal: 2000,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'DISTANCE_SINGLE',
  },
  {
    id: 'm_pace_chaos',
    title: 'Chaos Survivor',
    description: 'Survive the treacherous CHAOS pace phase',
    rewardCoins: 800,
    rewardXp: 500,
    goal: 1,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'REACH_PACE',
    targetValue: 'CHAOS',
  },
  {
    id: 'm_powerup_10',
    title: 'Charged Up',
    description: 'Collect and use 10 power-ups in total',
    rewardCoins: 450,
    rewardXp: 300,
    goal: 10,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'USE_POWERUPS',
  },
  {
    id: 'm_runs_5',
    title: 'One More Time',
    description: 'Complete 5 total runs',
    rewardCoins: 350,
    rewardXp: 200,
    goal: 5,
    progress: 0,
    completed: false,
    claimed: false,
    type: 'TOTAL_RUNS',
  },
];

export const DAILY_REWARDS = [
  { day: 1, coins: 200, xp: 100, label: 'Day 1 Bonus' },
  { day: 2, coins: 350, xp: 150, label: 'Day 2 Bonus' },
  { day: 3, coins: 500, xp: 200, label: 'Day 3 Bonus' },
  { day: 4, coins: 750, xp: 300, label: 'Day 4 Bonus' },
  { day: 5, coins: 1000, xp: 450, label: 'Day 5 Bonus' },
  { day: 6, coins: 1500, xp: 600, label: 'Day 6 Mega Bonus' },
  { day: 7, coins: 2500, xp: 1000, label: 'Day 7 Legendary Mystery Chest' },
];

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  graphicsQuality: 'medium',
  screenShake: true,
  speedLines: true,
  showTouchControls: false,
  debugHitboxes: false,
};

export const DEFAULT_PROGRESS: PlayerProgress = {
  coins: 200,
  xp: 0,
  level: 1,
  highScore: 0,
  bestDistance: 0,
  highestPaceReached: 'CALM',
  totalRuns: 0,
  totalCoinsCollected: 0,
  totalDistanceRun: 0,
  selectedCharacterId: 'kai',
  unlockedCharacters: ['kai'],
  upgradeLevels: {
    MAGNET: 1,
    SHIELD: 1,
    SCORE_BOOST: 1,
    SPEED_BOOST: 1,
    TIME_SLOW: 1,
  },
  missions: INITIAL_MISSIONS,
  lastDailyRewardDate: null,
  dailyRewardStreak: 0,
};
