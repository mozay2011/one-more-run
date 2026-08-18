import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import {
  CharacterConfig,
  GameSettings,
  GameStats,
  PacePhase,
  PlayerProgress,
  PowerUpType,
  Mission,
} from './game/types';
import { CHARACTERS, UPGRADES, PACE_CONFIG } from './game/constants';
import {
  loadPlayerProgress,
  savePlayerProgress,
  loadSettings,
  saveSettings,
  calculateLevel,
  updateMissionsOnRunComplete,
  checkDailyReward,
} from './game/storage';
import { audio } from './game/audio';

// UI Components
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { GameOverModal } from './components/GameOverModal';
import { CharactersModal } from './components/CharactersModal';
import { UpgradesModal } from './components/UpgradesModal';
import { MissionsModal } from './components/MissionsModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';

type AppState = 'MENU' | 'PLAYING' | 'GAMEOVER';

export default function App() {
  const [appState, setAppState] = useState<AppState>('MENU');
  const [progress, setProgress] = useState<PlayerProgress>(loadPlayerProgress);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  // Modals state
  const [showCharacters, setShowCharacters] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Run Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    coinsCollected: 0,
    distance: 0,
    combo: 1,
    maxCombo: 1,
    pace: 'CALM',
    paceTimeRemaining: 18,
    dodgesCount: 0,
    closeCallsCount: 0,
    activePowerUps: { MAGNET: 0, SHIELD: 0, SCORE_BOOST: 0, SPEED_BOOST: 0, TIME_SLOW: 0 },
    speed: 18,
    multiplier: 1,
    isGameOver: false,
    isPaused: false,
    highestPaceInRun: 'CALM',
  });

  // End of run rewards
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [xpGainedInRun, setXpGainedInRun] = useState(0);
  const [newlyCompletedMissions, setNewlyCompletedMissions] = useState<Mission[]>([]);

  // Banners & Floating FX
  const [paceBanner, setPaceBanner] = useState<{ text: string; subtext: string; color: string } | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<{ id: string; text: string; color: string }[]>([]);

  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Initialize audio settings on startup
  useEffect(() => {
    audio.setVolumes(settings.musicVolume, settings.sfxVolume);
  }, [settings.musicVolume, settings.sfxVolume]);

  // Persist progress changes
  useEffect(() => {
    savePlayerProgress(progress);
  }, [progress]);

  // Persist settings changes
  useEffect(() => {
    saveSettings(settings);
    if (engineRef.current) {
      engineRef.current.setSettings(settings);
    }
  }, [settings]);

  // Daily Reward Check
  const dailyCheck = checkDailyReward(progress);
  const unclaimedMissionsCount = progress.missions.filter(m => m.completed && !m.claimed).length;

  // Selected Character Config
  const selectedChar = CHARACTERS.find(c => c.id === progress.selectedCharacterId) || CHARACTERS[0];

  // ================= GAME ENGINE LIFECYCLE =================
  const startNewRun = useCallback(() => {
    setAppState('PLAYING');
    setIsPaused(false);
    setIsNewHighScore(false);
    setNewlyCompletedMissions([]);
    setFloatingTexts([]);
    setPaceBanner(null);

    const container = gameContainerRef.current;
    if (!container) return;

    // Dispose old engine if any
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    const engine = new GameEngine(container, selectedChar, settings, progress.upgradeLevels);

    // Callbacks
    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
      setIsPaused(newStats.isPaused);
    };

    engine.onPaceTransition = (newPace) => {
      const cfg = PACE_CONFIG[newPace];
      setPaceBanner({
        text: newPace === 'RUSH' ? '⚡ RUSH MODE ⚡' : newPace === 'CHAOS' ? '💀 CHAOS MODE 💀' : `${cfg.name}`,
        subtext: cfg.description,
        color: cfg.color,
      });

      setTimeout(() => {
        setPaceBanner(null);
      }, 2400);
    };

    engine.onFloatingText = (text, color) => {
      const id = `${Date.now()}_${Math.random()}`;
      setFloatingTexts(prev => [...prev.slice(-3), { id, text, color }]);
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(item => item.id !== id));
      }, 1200);
    };

    engine.onGameOver = (finalStats) => {
      handleGameOver(finalStats);
    };

    engineRef.current = engine;
    engine.start();
  }, [selectedChar, settings, progress.upgradeLevels]);

  const handleGameOver = useCallback((finalStats: GameStats) => {
    setAppState('GAMEOVER');

    // Calculate XP gained: distance / 4 + coins * 2 + combo * 10
    const earnedXp = Math.floor(finalStats.distance / 3 + finalStats.coinsCollected * 2 + finalStats.maxCombo * 20);
    setXpGainedInRun(earnedXp);

    const isHigh = finalStats.score > progress.highScore;
    setIsNewHighScore(isHigh);

    // Update Progress in Storage
    setProgress(prev => {
      const nextXp = prev.xp + earnedXp;
      const nextLevelInfo = calculateLevel(nextXp);

      const runUpdate = updateMissionsOnRunComplete(prev, {
        distance: finalStats.distance,
        coins: finalStats.coinsCollected,
        maxCombo: finalStats.maxCombo,
        highestPace: finalStats.highestPaceInRun,
        dodges: finalStats.dodgesCount,
        closeCalls: finalStats.closeCallsCount,
        powerUpsUsed: finalStats.activePowerUps ? 1 : 0,
      });

      setNewlyCompletedMissions(runUpdate.newlyCompletedMissions);

      return {
        ...runUpdate.updatedProgress,
        coins: prev.coins + finalStats.coinsCollected,
        xp: nextXp,
        level: nextLevelInfo.level,
        highScore: Math.max(prev.highScore, finalStats.score),
        bestDistance: Math.max(prev.bestDistance, finalStats.distance),
        totalRuns: prev.totalRuns + 1,
        totalCoinsCollected: prev.totalCoinsCollected + finalStats.coinsCollected,
        totalDistanceRun: prev.totalDistanceRun + finalStats.distance,
      };
    });
  }, [progress.highScore]);

  // Window Resize Observer for Game Engine
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && gameContainerRef.current) {
        engineRef.current.handleResize(
          gameContainerRef.current.clientWidth,
          gameContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // ================= USER ACTIONS =================
  const handleSelectCharacter = (id: string) => {
    setProgress(prev => ({ ...prev, selectedCharacterId: id }));
    const newChar = CHARACTERS.find(c => c.id === id);
    if (newChar && engineRef.current) {
      engineRef.current.setCharacter(newChar);
    }
  };

  const handleUnlockCharacter = (char: CharacterConfig) => {
    if (progress.coins >= char.price) {
      setProgress(prev => ({
        ...prev,
        coins: prev.coins - char.price,
        unlockedCharacters: [...prev.unlockedCharacters, char.id],
        selectedCharacterId: char.id,
      }));
    }
  };

  const handleUpgradePowerUp = (type: PowerUpType) => {
    const config = UPGRADES[type];
    const currentLvl = progress.upgradeLevels[type] || 1;
    if (currentLvl >= config.maxLevel) return;

    const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLvl - 1));
    if (progress.coins >= cost) {
      const nextLevels = {
        ...progress.upgradeLevels,
        [type]: currentLvl + 1,
      };
      setProgress(prev => ({
        ...prev,
        coins: prev.coins - cost,
        upgradeLevels: nextLevels,
      }));
      if (engineRef.current) {
        engineRef.current.setUpgradeLevels(nextLevels);
      }
    }
  };

  const handleClaimMission = (missionId: string) => {
    const mission = progress.missions.find(m => m.id === missionId);
    if (!mission || mission.claimed) return;

    setProgress(prev => {
      const nextXp = prev.xp + mission.rewardXp;
      const nextLvl = calculateLevel(nextXp);
      return {
        ...prev,
        coins: prev.coins + mission.rewardCoins,
        xp: nextXp,
        level: nextLvl.level,
        missions: prev.missions.map(m => (m.id === missionId ? { ...m, claimed: true } : m)),
      };
    });

    setNewlyCompletedMissions(prev => prev.filter(m => m.id !== missionId));
  };

  const handleClaimDailyReward = () => {
    const check = checkDailyReward(progress);
    if (!check.available) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setProgress(prev => {
      const nextXp = prev.xp + check.rewardToday.xp;
      const nextLvl = calculateLevel(nextXp);
      return {
        ...prev,
        coins: prev.coins + check.rewardToday.coins,
        xp: nextXp,
        level: nextLvl.level,
        dailyRewardStreak: check.currentStreak,
        lastDailyRewardDate: todayStr,
      };
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* 3D Game Canvas Container */}
      <div
        ref={gameContainerRef}
        className={`absolute inset-0 w-full h-full ${appState === 'MENU' ? 'invisible' : 'visible'}`}
      />

      {/* Main Menu */}
      {appState === 'MENU' && (
        <MainMenu
          progress={progress}
          onPlay={startNewRun}
          onOpenCharacters={() => setShowCharacters(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenMissions={() => setShowMissions(true)}
          onOpenDailyRewards={() => setShowDailyRewards(true)}
          onOpenSettings={() => setShowSettings(true)}
          dailyRewardAvailable={dailyCheck.available}
          unclaimedMissionsCount={unclaimedMissionsCount}
        />
      )}

      {/* HUD during Active Gameplay */}
      {appState === 'PLAYING' && (
        <HUD
          stats={stats}
          paceBanner={paceBanner}
          floatingTexts={floatingTexts}
          onPause={() => {
            if (engineRef.current) {
              engineRef.current.pause();
              setIsPaused(true);
            }
          }}
          onMoveLeft={() => engineRef.current?.moveLeft()}
          onMoveRight={() => engineRef.current?.moveRight()}
          onJump={() => engineRef.current?.jump()}
          onSlide={() => engineRef.current?.slide()}
          showTouchControls={settings.showTouchControls}
        />
      )}

      {/* Pause Modal */}
      {appState === 'PLAYING' && isPaused && (
        <PauseModal
          onResume={() => {
            if (engineRef.current) {
              engineRef.current.resume();
              setIsPaused(false);
            }
          }}
          onRestart={startNewRun}
          onOpenSettings={() => setShowSettings(true)}
          onMainMenu={() => {
            if (engineRef.current) {
              engineRef.current.destroy();
              engineRef.current = null;
            }
            setAppState('MENU');
          }}
        />
      )}

      {/* Run Over / ONE MORE RUN Modal */}
      {appState === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          progress={progress}
          isNewHighScore={isNewHighScore}
          xpGained={xpGainedInRun}
          newlyCompletedMissions={newlyCompletedMissions}
          onOneMoreRun={startNewRun}
          onMainMenu={() => {
            if (engineRef.current) {
              engineRef.current.destroy();
              engineRef.current = null;
            }
            setAppState('MENU');
          }}
          onClaimMission={handleClaimMission}
        />
      )}

      {/* Characters Screen */}
      {showCharacters && (
        <CharactersModal
          progress={progress}
          onSelectCharacter={handleSelectCharacter}
          onUnlockCharacter={handleUnlockCharacter}
          onClose={() => setShowCharacters(false)}
        />
      )}

      {/* Upgrades Screen */}
      {showUpgrades && (
        <UpgradesModal
          progress={progress}
          onUpgradePowerUp={handleUpgradePowerUp}
          onClose={() => setShowUpgrades(false)}
        />
      )}

      {/* Missions Screen */}
      {showMissions && (
        <MissionsModal
          missions={progress.missions}
          onClaimMission={handleClaimMission}
          onClose={() => setShowMissions(false)}
        />
      )}

      {/* Daily Rewards Screen */}
      {showDailyRewards && (
        <DailyRewardsModal
          currentStreak={dailyCheck.currentStreak}
          available={dailyCheck.available}
          onClaimDailyReward={handleClaimDailyReward}
          onClose={() => setShowDailyRewards(false)}
        />
      )}

      {/* Settings Screen */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
