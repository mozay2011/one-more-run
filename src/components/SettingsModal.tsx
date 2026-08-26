import React from 'react';
import { GameSettings } from '../game/types';
import { audio } from '../game/audio';
import { X, Volume2, VolumeX, Sparkles, Smartphone, Eye, RotateCcw, Keyboard, Download } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
  onOpenInstall?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenInstall,
}) => {
  const update = (patch: Partial<GameSettings>) => {
    const updated = { ...settings, ...patch };
    onUpdateSettings(updated);
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans safe-pt safe-pb safe-px">
      <div className="relative w-full max-w-xl max-h-[92dvh] bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-mono">SETTINGS</h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Audio, performance, and control preferences</p>
          </div>
          <button
            id="btn-close-settings"
            onClick={() => {
              audio.playButtonClick();
              onClose();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-4 sm:space-y-6 pr-1">
          {/* Audio Controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">Audio Levels</h3>

            {/* Music Volume */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Volume2 className="w-4 h-4 text-slate-400" /> Music Volume
              </div>
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={e => update({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 w-8">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
            </div>

            {/* SFX Volume */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Volume2 className="w-4 h-4 text-slate-400" /> Sound FX Volume
              </div>
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={e => update({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 w-8">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Graphics & Effects */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">Graphics & FX</h3>

            {/* Graphics Quality */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">Graphics Quality</div>
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['low', 'medium', 'high'] as const).map(quality => (
                  <button
                    key={quality}
                    onClick={() => update({ graphicsQuality: quality })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      settings.graphicsQuality === quality
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            {/* Screen Shake */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">Camera Impact Shake</div>
              <button
                onClick={() => update({ screenShake: !settings.screenShake })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.screenShake ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.screenShake ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Speed Lines */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">Rush & Dash Speed Lines</div>
              <button
                onClick={() => update({ speedLines: !settings.speedLines })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.speedLines ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.speedLines ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Touch Controls Overlay */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">On-Screen Action Buttons</div>
              <button
                onClick={() => update({ showTouchControls: !settings.showTouchControls })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.showTouchControls ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.showTouchControls ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Debug Hitboxes */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-200">Debug Hitbox Wireframes</div>
                <div className="text-[11px] text-slate-500">Press 'H' in-game to toggle 3D collision bounds</div>
              </div>
              <button
                onClick={() => update({ debugHitboxes: !settings.debugHitboxes })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.debugHitboxes ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.debugHitboxes ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Android App / PWA Install */}
          {onOpenInstall && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white font-mono">INSTALL ON ANDROID</div>
                  <div className="text-[11px] text-slate-400">Play fullscreen offline with zero lag</div>
                </div>
              </div>
              <button
                id="btn-settings-install-app"
                onClick={() => {
                  audio.playButtonClick();
                  onOpenInstall();
                }}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider font-mono shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5 fill-slate-950" />
                <span>INSTALL</span>
              </button>
            </div>
          )}

          {/* Controls Quick Reference */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-2 font-mono">
              <Keyboard className="w-4 h-4 text-cyan-400" /> Controls Guide
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <div><span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded mr-1">A</span> / <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">◀</span> : Move Left</div>
              <div><span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded mr-1">D</span> / <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">▶</span> : Move Right</div>
              <div><span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded mr-1">W</span> / <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">SPACE</span> : Jump</div>
              <div><span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded mr-1">S</span> / <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">▼</span> : Slide</div>
              <div className="col-span-2 text-cyan-400 font-mono"><span className="text-white bg-slate-800 px-1.5 py-0.5 rounded mr-1">H</span> : Toggle Hitbox Debug Wireframes</div>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Mobile: Swipe Left / Right to change lanes, Swipe Up to Jump, Swipe Down to Slide.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
