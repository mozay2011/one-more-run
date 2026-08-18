import React from 'react';
import { CharacterConfig, PlayerProgress } from '../game/types';
import { CHARACTERS } from '../game/constants';
import { audio } from '../game/audio';
import { X, Check, Lock, Coins, Sparkles, Shield, Zap } from 'lucide-react';

interface CharactersModalProps {
  progress: PlayerProgress;
  onSelectCharacter: (id: string) => void;
  onUnlockCharacter: (character: CharacterConfig) => void;
  onClose: () => void;
}

export const CharactersModal: React.FC<CharactersModalProps> = ({
  progress,
  onSelectCharacter,
  onUnlockCharacter,
  onClose,
}) => {
  return (
    <div id="characters-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono">CHARACTERS</h2>
            <p className="text-xs sm:text-sm text-slate-400">Select your runner or unlock new urban specialists</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-amber-500/40 rounded-xl px-3.5 py-1.5 shadow">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-amber-300 font-mono">
                {progress.coins.toLocaleString()}
              </span>
            </div>
            <button
              id="btn-close-characters"
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

        {/* Character Cards Grid */}
        <div className="flex-1 overflow-y-auto py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1">
          {CHARACTERS.map(char => {
            const isUnlocked = char.unlockedByDefault || progress.unlockedCharacters.includes(char.id);
            const isSelected = progress.selectedCharacterId === char.id;
            const canAfford = progress.coins >= char.price;

            return (
              <div
                key={char.id}
                className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-850 border-cyan-400/80 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Character Tag & Color Silhouette */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-slate-950 text-xl font-mono shadow-md"
                        style={{ backgroundColor: char.colorScheme.primary }}
                      >
                        {char.name[0]}
                      </div>
                      <div>
                        <div className="text-lg font-black text-white font-mono">{char.name}</div>
                        <div className="text-xs text-slate-400 font-medium">{char.title}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> EQUIPPED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">{char.description}</p>

                  {/* Character Unique Perk Card */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> {char.perk.name}
                    </div>
                    <div className="text-xs text-slate-300 leading-snug">{char.perk.description}</div>
                  </div>
                </div>

                {/* Bottom Action / Price */}
                <div>
                  {isUnlocked ? (
                    <button
                      id={`btn-select-char-${char.id}`}
                      disabled={isSelected}
                      onClick={() => {
                        audio.playButtonClick();
                        onSelectCharacter(char.id);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select Runner'}
                    </button>
                  ) : (
                    <button
                      id={`btn-unlock-char-${char.id}`}
                      disabled={!canAfford}
                      onClick={() => {
                        audio.playButtonClick();
                        onUnlockCharacter(char);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Unlock for {char.price.toLocaleString()}</span>
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
