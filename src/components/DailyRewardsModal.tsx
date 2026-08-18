import React from 'react';
import { DAILY_REWARDS } from '../game/constants';
import { audio } from '../game/audio';
import { X, Gift, Check, Coins, Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyRewardsModalProps {
  currentStreak: number;
  available: boolean;
  onClaimDailyReward: () => void;
  onClose: () => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  currentStreak,
  available,
  onClaimDailyReward,
  onClose,
}) => {
  const handleClaim = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    audio.playButtonClick();
    onClaimDailyReward();
  };

  return (
    <div id="daily-rewards-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white font-mono">DAILY REWARDS</h2>
              <p className="text-xs text-slate-400">Log in daily to build your streak and unlock mega chests</p>
            </div>
          </div>
          <button
            id="btn-close-daily"
            onClick={() => {
              audio.playButtonClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Day Grid */}
        <div className="py-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DAILY_REWARDS.map((reward, index) => {
            const dayNum = reward.day;
            const isClaimed = !available && dayNum <= currentStreak;
            const isToday = available && dayNum === currentStreak;
            const isMegaDay = dayNum === 7;

            return (
              <div
                key={dayNum}
                className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                  isMegaDay ? 'col-span-2 sm:col-span-2 bg-gradient-to-br from-purple-950/40 to-amber-950/40 border-amber-500/50' : ''
                } ${
                  isToday
                    ? 'bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/30 shadow-lg shadow-purple-500/20'
                    : isClaimed
                    ? 'bg-slate-950/50 border-slate-800 opacity-60'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Day {dayNum}</span>
                    {isClaimed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    {isMegaDay && <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />}
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-300 font-mono font-black text-base mb-0.5">
                    <Coins className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>+{reward.coins}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-semibold">
                    <Award className="w-3 h-3" />
                    <span>+{reward.xp} XP</span>
                  </div>
                </div>

                <div className="mt-3">
                  {isClaimed ? (
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">Collected</span>
                  ) : isToday ? (
                    <span className="text-[11px] text-purple-300 font-mono font-bold animate-pulse">Claim Ready!</span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">Upcoming</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {available ? (
            <button
              id="btn-claim-daily-reward"
              onClick={handleClaim}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider font-mono shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Gift className="w-5 h-5" />
              <span>CLAIM DAY {currentStreak} REWARD</span>
            </button>
          ) : (
            <div className="w-full py-3 px-6 rounded-2xl bg-slate-800 text-slate-400 font-medium text-xs text-center font-mono">
              Reward claimed for today! Return tomorrow for Day {(currentStreak % 7) + 1}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
