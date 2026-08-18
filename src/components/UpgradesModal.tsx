import React from 'react';
import { PlayerProgress, PowerUpType, UpgradeConfig } from '../game/types';
import { UPGRADES } from '../game/constants';
import { audio } from '../game/audio';
import { X, Coins, Zap, Shield, Magnet, FastForward, Clock, ChevronUp } from 'lucide-react';

interface UpgradesModalProps {
  progress: PlayerProgress;
  onUpgradePowerUp: (type: PowerUpType) => void;
  onClose: () => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  progress,
  onUpgradePowerUp,
  onClose,
}) => {
  const iconMap: Record<PowerUpType, React.ReactNode> = {
    MAGNET: <Magnet className="w-5 h-5 text-purple-400" />,
    SHIELD: <Shield className="w-5 h-5 text-sky-400" />,
    SCORE_BOOST: <Zap className="w-5 h-5 text-amber-400" />,
    SPEED_BOOST: <FastForward className="w-5 h-5 text-red-400" />,
    TIME_SLOW: <Clock className="w-5 h-5 text-emerald-400" />,
  };

  const getUpgradeCost = (config: UpgradeConfig, currentLvl: number) => {
    if (currentLvl >= config.maxLevel) return null;
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLvl - 1));
  };

  return (
    <div id="upgrades-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono">POWER-UP UPGRADES</h2>
            <p className="text-xs sm:text-sm text-slate-400">Increase durations, radii, and multipliers using collected coins</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-amber-500/40 rounded-xl px-3.5 py-1.5 shadow">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-amber-300 font-mono">
                {progress.coins.toLocaleString()}
              </span>
            </div>
            <button
              id="btn-close-upgrades"
              onClick={() => {
                audio.playButtonClick();
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upgrades List */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
          {(Object.keys(UPGRADES) as PowerUpType[]).map(type => {
            const config = UPGRADES[type];
            const currentLvl = progress.upgradeLevels[type] || 1;
            const cost = getUpgradeCost(config, currentLvl);
            const isMax = currentLvl >= config.maxLevel;
            const canAfford = cost !== null && progress.coins >= cost;
            const currentDesc = config.levels[currentLvl - 1]?.description || '';
            const nextDesc = !isMax ? config.levels[currentLvl]?.description : null;

            return (
              <div
                key={type}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Info & Level Pips */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
                    {iconMap[type]}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-black text-white font-mono">{config.name}</h3>
                      {/* Level Stars/Pips */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: config.maxLevel }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full ${
                              i < currentLvl ? 'bg-amber-400 shadow-sm shadow-amber-500/50' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 font-medium">{currentDesc}</div>
                    {nextDesc && (
                      <div className="text-[11px] text-amber-400/90 mt-0.5 flex items-center gap-1">
                        <ChevronUp className="w-3.5 h-3.5" /> Next: {nextDesc}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upgrade Button */}
                <div className="w-full sm:w-auto shrink-0">
                  {isMax ? (
                    <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-mono font-bold text-xs text-center uppercase tracking-wider">
                      MAX LEVEL
                    </div>
                  ) : (
                    <button
                      id={`btn-upgrade-${type}`}
                      disabled={!canAfford}
                      onClick={() => {
                        audio.playButtonClick();
                        onUpgradePowerUp(type);
                      }}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ChevronUp className="w-4 h-4 stroke-[3]" />
                      <span>Upgrade ({cost?.toLocaleString()})</span>
                      <Coins className="w-3.5 h-3.5 fill-current" />
                    </button>
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
