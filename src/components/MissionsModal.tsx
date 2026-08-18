import React from 'react';
import { Mission } from '../game/types';
import { audio } from '../game/audio';
import { X, Award, CheckCircle2, Coins } from 'lucide-react';

interface MissionsModalProps {
  missions: Mission[];
  onClaimMission: (id: string) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  onClaimMission,
  onClose,
}) => {
  return (
    <div id="missions-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono">MISSIONS & BOUNTIES</h2>
            <p className="text-xs sm:text-sm text-slate-400">Complete challenges to earn coins and level up your runner</p>
          </div>
          <button
            id="btn-close-missions"
            onClick={() => {
              audio.playButtonClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missions List */}
        <div className="flex-1 overflow-y-auto py-6 space-y-3 pr-1">
          {missions.map(m => {
            const percent = Math.min(100, Math.round((m.progress / m.goal) * 100));

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  m.claimed
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : m.completed
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className={`w-4 h-4 ${m.completed ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <h3 className="text-sm font-bold text-white font-mono">{m.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{m.description}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.completed ? 'bg-emerald-400' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {m.progress} / {m.goal}
                    </span>
                  </div>
                </div>

                {/* Rewards & Action */}
                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-300 font-mono">
                      <span>+{m.rewardCoins}</span>
                      <Coins className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono font-medium">+{m.rewardXp} XP</div>
                  </div>

                  {m.claimed ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500 font-mono">
                      <CheckCircle2 className="w-4 h-4" /> Claimed
                    </div>
                  ) : m.completed ? (
                    <button
                      id={`btn-claim-${m.id}`}
                      onClick={() => {
                        audio.playButtonClick();
                        onClaimMission(m.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider font-mono shadow-lg active:scale-95 transition-all cursor-pointer animate-pulse"
                    >
                      Claim
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-mono">
                      In Progress
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
