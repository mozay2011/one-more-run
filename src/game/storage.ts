import { PlayerProgress, GameSettings, Mission, PacePhase } from './types';
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, INITIAL_MISSIONS, DAILY_REWARDS } from './constants';

const PROGRESS_KEY = 'one_more_run_progress_v1';
const SETTINGS_KEY = 'one_more_run_settings_v1';

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    
    // Ensure all required fields exist even if updated in newer version
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      upgradeLevels: {
        ...DEFAULT_PROGRESS.upgradeLevels,
        ...(parsed.upgradeLevels || {}),
      },
      missions: mergeMissions(INITIAL_MISSIONS, parsed.missions || []),
    };
  } catch (err) {
    console.error('Failed to load progress from localStorage:', err);
    return { ...DEFAULT_PROGRESS };
  }
}

export function savePlayerProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress to localStorage:', err);
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progressPercent: number } {
  // Level formula: Level 1 = 0, Level 2 = 250, Level 3 = 600, Level 4 = 1100, etc.
  let level = 1;
  let needed = 250;
  let remainingXp = xp;

  while (remainingXp >= needed) {
    remainingXp -= needed;
    level++;
    needed = Math.floor(needed * 1.35 + 50);
  }

  const progressPercent = Math.min(100, Math.max(0, (remainingXp / needed) * 100));
  return {
    level,
    currentXp: remainingXp,
    nextLevelXp: needed,
    progressPercent,
  };
}

function mergeMissions(defaults: Mission[], saved: Mission[]): Mission[] {
  const savedMap = new Map(saved.map(m => [m.id, m]));
  return defaults.map(def => {
    const s = savedMap.get(def.id);
    if (!s) return def;
    return {
      ...def,
      progress: s.progress,
      completed: s.completed,
      claimed: s.claimed,
    };
  });
}

export function updateMissionsOnRunComplete(
  progress: PlayerProgress,
  runStats: {
    distance: number;
    coins: number;
    maxCombo: number;
    highestPace: PacePhase;
    dodges: number;
    closeCalls: number;
    powerUpsUsed: number;
  }
): { updatedProgress: PlayerProgress; newlyCompletedMissions: Mission[] } {
  const next = { ...progress };
  const newlyCompleted: Mission[] = [];

  const paceOrder: Record<PacePhase, number> = {
    CALM: 1,
    BUILD: 2,
    BREATHER: 3,
    RUSH: 4,
    CHAOS: 5,
  };

  next.missions = next.missions.map(mission => {
    if (mission.completed) return mission;
    let newProgress = mission.progress;

    switch (mission.type) {
      case 'DISTANCE_SINGLE':
        newProgress = Math.max(newProgress, Math.floor(runStats.distance));
        break;
      case 'DISTANCE_TOTAL':
        newProgress += Math.floor(runStats.distance);
        break;
      case 'COINS_SINGLE':
        newProgress = Math.max(newProgress, runStats.coins);
        break;
      case 'COINS_TOTAL':
        newProgress += runStats.coins;
        break;
      case 'COMBO_MAX':
        newProgress = Math.max(newProgress, runStats.maxCombo);
        break;
      case 'REACH_PACE': {
        const targetPace = mission.targetValue as PacePhase;
        const reachedRank = paceOrder[runStats.highestPace] || 0;
        const targetRank = paceOrder[targetPace] || 99;
        if (reachedRank >= targetRank) {
          newProgress = 1;
        }
        break;
      }
      case 'DODGE_OBSTACLES':
        newProgress += runStats.dodges;
        break;
      case 'CLOSE_CALLS':
        newProgress += runStats.closeCalls;
        break;
      case 'USE_POWERUPS':
        newProgress += runStats.powerUpsUsed;
        break;
      case 'TOTAL_RUNS':
        newProgress += 1;
        break;
    }

    const isCompleted = newProgress >= mission.goal;
    if (isCompleted && !mission.completed) {
      newlyCompleted.push({
        ...mission,
        progress: Math.min(newProgress, mission.goal),
        completed: true,
      });
    }

    return {
      ...mission,
      progress: Math.min(newProgress, mission.goal),
      completed: isCompleted,
    };
  });

  return { updatedProgress: next, newlyCompletedMissions: newlyCompleted };
}

export function checkDailyReward(progress: PlayerProgress): {
  available: boolean;
  currentStreak: number;
  rewardToday: typeof DAILY_REWARDS[0];
} {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastDate = progress.lastDailyRewardDate;

  let streak = progress.dailyRewardStreak || 0;
  let available = false;

  if (!lastDate) {
    available = true;
    streak = 1;
  } else if (lastDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day!
      streak = (streak % 7) + 1;
    } else {
      // Missed a day -> reset to day 1
      streak = 1;
    }
    available = true;
  }

  const rewardIndex = Math.min(DAILY_REWARDS.length - 1, Math.max(0, streak - 1));
  return {
    available,
    currentStreak: streak,
    rewardToday: DAILY_REWARDS[rewardIndex],
  };
}
