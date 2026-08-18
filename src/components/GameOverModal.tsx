import React, { useEffect } from 'react';
import { GameStats, Mission, PlayerProgress } from '../game/types';
import { calculateLevel } from '../game/storage';
import { RotateCcw, Home, Trophy, Coins, Navigation, Flame, Award, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  stats: GameStats;
  progress: PlayerProgress;
  isNewHighScore: boolean;
  xpGained: number;
  newlyCompletedMissions: Mission[];
  onOneMoreRun: () => void;
  onMainMenu: () => void;
  onClaimMission: (missionId: string) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  progress,
  isNewHighScore,
  xpGained,
  newlyCompletedMissions,
  onOneMoreRun,
  onMainMenu,
  onClaimMission,
}) => {
  const levelInfo = calculateLevel(progress.xp);

  useEffect(() => {
    if (isNewHighScore) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#a855f7'],
      });
    }

    // Hotkey listener for instant "One More Run"
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onOneMoreRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewHighScore, onOneMoreRun]);

  return (
    <div id="game-over-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-xs uppercase font-black tracking-widest text-slate-400 font-mono mb-1">
            End of Run
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
            RUN OVER
          </h2>
          {isNewHighScore && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono animate-bounce">
              <Trophy className="w-3.5 h-3.5" /> NEW HIGH SCORE RECORD!
            </div>
          )}
        </div>

        {/* Primary Run Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {/* Distance */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" /> Distance
            </div>
            <div className="text-xl font-black text-white font-mono">
              {stats.distance.toLocaleString()}<span className="text-xs text-slate-400 font-normal">m</span>
            </div>
          </div>

          {/* Score */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Score
            </div>
            <div className="text-xl font-black text-amber-300 font-mono">
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Coins */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> Coins
            </div>
            <div className="text-xl font-black text-yellow-300 font-mono">
              +{stats.coinsCollected}
            </div>
          </div>

          {/* Max Combo */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Max Combo
            </div>
            <div className="text-lg font-black text-orange-400 font-mono">
              x{stats.maxCombo}
            </div>
          </div>

          {/* Highest Pace */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Peak Pace
            </div>
            <div className="text-sm sm:text-base font-black text-purple-300 font-mono uppercase">
              {stats.highestPaceInRun}
            </div>
          </div>

          {/* XP Gained */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-medium mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" /> XP Earned
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono">
              +{xpGained}
            </div>
          </div>
        </div>

        {/* Level Progression Bar */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-3.5 mb-5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-300">Player Level {levelInfo.level}</span>
            <span className="text-slate-400 font-mono">
              {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Completed Missions Notification */}
        {newlyCompletedMissions.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Mission Completed!
            </div>
            {newlyCompletedMissions.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs"
              >
                <div>
                  <div className="font-bold text-emerald-200">{m.title}</div>
                  <div className="text-slate-400">+{m.rewardCoins} Coins • +{m.rewardXp} XP</div>
                </div>
                {!m.claimed && (
                  <button
                    onClick={() => onClaimMission(m.id)}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow transition-colors cursor-pointer"
                  >
                    Claim
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="space-y-3">
          {/* HUGE "ONE MORE RUN" BUTTON */}
          <button
            id="btn-one-more-run"
            onClick={onOneMoreRun}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-lg sm:text-xl tracking-wider uppercase shadow-xl hover:shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-mono cursor-pointer"
          >
            <RotateCcw className="w-6 h-6 stroke-[2.5]" />
            <span>ONE MORE RUN</span>
            <span className="hidden sm:inline text-xs font-normal opacity-75 ml-2">[SPACE]</span>
          </button>

          {/* Main Menu Button */}
          <button
            id="btn-main-menu"
            onClick={onMainMenu}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
