import React from 'react';
import { audio } from '../game/audio';
import { Play, RotateCcw, Home, Settings as SettingsIcon } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div id="pause-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <h2 className="text-3xl font-black text-white font-mono tracking-wider mb-1">
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-6">Take a breath, runner</p>

        <div className="space-y-3">
          {/* RESUME */}
          <button
            id="btn-pause-resume"
            onClick={() => {
              audio.playButtonClick();
              onResume();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-base uppercase tracking-wider font-mono shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>RESUME</span>
          </button>

          {/* RESTART */}
          <button
            id="btn-pause-restart"
            onClick={() => {
              audio.playButtonClick();
              onRestart();
            }}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART RUN</span>
          </button>

          {/* SETTINGS */}
          <button
            id="btn-pause-settings"
            onClick={() => {
              audio.playButtonClick();
              onOpenSettings();
            }}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>SETTINGS</span>
          </button>

          {/* MAIN MENU */}
          <button
            id="btn-pause-menu"
            onClick={() => {
              audio.playButtonClick();
              onMainMenu();
            }}
            className="w-full py-3 px-6 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
