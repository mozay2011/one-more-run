import React, { useState, useEffect } from 'react';
import { audio } from '../game/audio';
import { Download, Smartphone, CheckCircle, ExternalLink, X, HelpCircle, Share, MoreVertical } from 'lucide-react';

interface InstallModalProps {
  onClose: () => void;
  deferredPrompt: any;
  isStandalone: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  onClose,
  deferredPrompt,
  isStandalone,
}) => {
  const [installed, setInstalled] = useState(isStandalone);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }
  }, []);

  const handleInstallClick = async () => {
    audio.playButtonClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
      }
    } else if (isIframe) {
      // If inside iframe, open standalone preview URL
      window.open(window.location.href, '_blank');
    }
  };

  const handleOpenStandalone = () => {
    audio.playButtonClick();
    window.open(window.location.href, '_blank');
  };

  return (
    <div id="install-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans safe-pt safe-pb safe-px">
      <div className="relative w-full max-w-md max-h-[92dvh] bg-slate-900 border border-slate-750 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono">INSTALL APP</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Android & Mobile PWA Installation</p>
            </div>
          </div>
          <button
            id="btn-close-install"
            onClick={() => {
              audio.playButtonClick();
              onClose();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {installed ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white font-mono uppercase">App Already Installed</div>
              <div className="text-xs text-emerald-300/80 mt-1">
                You are playing ONE MORE RUN in full standalone mobile mode!
              </div>
            </div>
          ) : (
            <>
              {/* Primary Direct Install Button if prompt available */}
              {deferredPrompt && (
                <button
                  id="btn-trigger-install-prompt"
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider font-mono shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-5 h-5 fill-slate-950" />
                  <span>INSTALL ON ANDROID (1-TAP)</span>
                </button>
              )}

              {/* If preview iframe */}
              {isIframe && (
                <button
                  id="btn-open-new-tab"
                  onClick={handleOpenStandalone}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <span>Open in Full Browser Window</span>
                </button>
              )}

              {/* Step by Step Manual Guide for Android Chrome */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>How to install on Android:</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-black font-mono text-[11px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      Open this game in <strong className="text-white">Google Chrome</strong> or your mobile browser.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-black font-mono text-[11px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="flex items-center flex-wrap gap-1">
                      Tap the menu <MoreVertical className="w-3.5 h-3.5 inline text-slate-400" /> in the top right corner.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-black font-mono text-[11px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      Select <strong className="text-cyan-300">"Install app"</strong> or <strong className="text-cyan-300">"Add to Home screen"</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* iOS / Safari tip */}
              <div className="bg-slate-800/40 border border-slate-750 rounded-2xl p-3.5 text-xs text-slate-400">
                <span className="font-bold text-slate-300 font-mono">For iPhone / Safari:</span> Tap the <Share className="w-3.5 h-3.5 inline text-cyan-400 mx-1" /> Share icon and tap <strong>"Add to Home Screen"</strong>.
              </div>
            </>
          )}

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
              <div className="text-[11px] font-bold text-white font-mono">⚡ 60 FPS Engine</div>
              <div className="text-[10px] text-slate-400">Hardware accelerated</div>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
              <div className="text-[11px] font-bold text-white font-mono">📴 Offline Ready</div>
              <div className="text-[10px] text-slate-400">Cached via Service Worker</div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            id="btn-dismiss-install"
            onClick={() => {
              audio.playButtonClick();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono uppercase tracking-wide cursor-pointer transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
