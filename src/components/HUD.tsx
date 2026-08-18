import React, { useEffect, useRef } from 'react';
import { GameStats, PacePhase, PowerUpType } from '../game/types';
import { PACE_CONFIG } from '../game/constants';
import { Zap, Shield, Magnet, FastForward, Clock, Pause, Flame, Coins, Navigation } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  paceBanner: { text: string; subtext: string; color: string } | null;
  floatingTexts: { id: string; text: string; color: string }[];
  onPause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  showTouchControls: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  paceBanner,
  floatingTexts,
  onPause,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  showTouchControls,
}) => {
  const speedLinesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paceCfg = PACE_CONFIG[stats.pace];

  // Draw Speed Lines on high-speed / RUSH / CHAOS
  useEffect(() => {
    const canvas = speedLinesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const isHighSpeed = stats.distance >= 1200 || stats.pace === 'RUSH' || stats.pace === 'CHAOS' || stats.activePowerUps.SPEED_BOOST > 0;

    if (!isHighSpeed || stats.isPaused || stats.isGameOver) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const renderLines = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const numLines = stats.pace === 'CHAOS' || stats.activePowerUps.SPEED_BOOST > 0 ? 28 : 16;

      ctx.lineWidth = stats.activePowerUps.SPEED_BOOST > 0 ? 2.5 : 1.75;

      for (let i = 0; i < numLines; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distInner = 120 + Math.random() * 80;
        const distOuter = Math.max(canvas.width, canvas.height);

        const grad = ctx.createLinearGradient(
          cx + Math.cos(angle) * distInner,
          cy + Math.sin(angle) * distInner,
          cx + Math.cos(angle) * distOuter,
          cy + Math.sin(angle) * distOuter
        );

        if (stats.activePowerUps.SPEED_BOOST > 0) {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
          grad.addColorStop(0.3, 'rgba(239, 68, 68, 0.6)');
          grad.addColorStop(1, 'rgba(254, 202, 202, 0.85)');
        } else if (stats.pace === 'CHAOS') {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.0)');
          grad.addColorStop(0.4, 'rgba(236, 72, 153, 0.45)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
        } else {
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
          grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
        }

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * distInner, cy + Math.sin(angle) * distInner);
        ctx.lineTo(cx + Math.cos(angle) * distOuter, cy + Math.sin(angle) * distOuter);
        ctx.stroke();
      }

      animId = requestAnimationFrame(renderLines);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    renderLines();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [stats.pace, stats.activePowerUps.SPEED_BOOST, stats.isPaused, stats.isGameOver]);

  const powerUpIcons: Record<PowerUpType, React.ReactNode> = {
    MAGNET: <Magnet className="w-4 h-4 text-purple-400" />,
    SHIELD: <Shield className="w-4 h-4 text-sky-400" />,
    SCORE_BOOST: <Zap className="w-4 h-4 text-amber-400" />,
    SPEED_BOOST: <FastForward className="w-4 h-4 text-red-400" />,
    TIME_SLOW: <Clock className="w-4 h-4 text-emerald-400" />,
  };

  const powerUpColors: Record<PowerUpType, string> = {
    MAGNET: 'border-purple-500/50 bg-purple-950/40 text-purple-200',
    SHIELD: 'border-sky-500/50 bg-sky-950/40 text-sky-200',
    SCORE_BOOST: 'border-amber-500/50 bg-amber-950/40 text-amber-200',
    SPEED_BOOST: 'border-red-500/50 bg-red-950/40 text-red-200',
    TIME_SLOW: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200',
  };

  // Determine dominant power-up for edge glow aura
  let dominantPowerUp: PowerUpType | null = null;
  let maxTimeLeft = 0;
  for (const key of Object.keys(stats.activePowerUps) as PowerUpType[]) {
    const timeLeft = stats.activePowerUps[key];
    if (timeLeft > maxTimeLeft) {
      maxTimeLeft = timeLeft;
      dominantPowerUp = key;
    }
  }

  const auraShadows: Record<PowerUpType, string> = {
    MAGNET: 'inset 0 0 45px rgba(168, 85, 247, 0.35)',
    SHIELD: 'inset 0 0 45px rgba(56, 189, 248, 0.35)',
    SCORE_BOOST: 'inset 0 0 45px rgba(245, 158, 11, 0.35)',
    SPEED_BOOST: 'inset 0 0 60px rgba(239, 68, 68, 0.45)',
    TIME_SLOW: 'inset 0 0 45px rgba(16, 185, 129, 0.35)',
  };

  return (
    <div id="game-hud-overlay" className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* Power-up Screen Edge Aura Vignette */}
      {dominantPowerUp && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-300 animate-pulse"
          style={{ boxShadow: auraShadows[dominantPowerUp] }}
        />
      )}

      {/* Speed Lines Canvas */}
      <canvas ref={speedLinesCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top HUD Bar */}
      <div className="relative z-10 w-full px-4 pt-4 sm:px-6 flex items-center justify-between pointer-events-auto">
        {/* Left: Distance & Coins */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-lg">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="text-sm sm:text-base font-black tracking-wider text-slate-100 font-mono">
              {stats.distance.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-0.5">m</span>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 rounded-xl px-3.5 py-1.5 shadow-lg">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm sm:text-base font-black tracking-wider text-amber-300 font-mono">
              {stats.coinsCollected.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Center: Dynamic Pace Badge */}
        <div className="flex flex-col items-center">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300"
            style={{
              borderColor: paceCfg.color,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              boxShadow: `0 0 16px ${paceCfg.color}40`,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: paceCfg.color }}
            />
            <span className="text-xs sm:text-sm font-black tracking-widest uppercase font-mono" style={{ color: paceCfg.color }}>
              {paceCfg.name}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {Math.ceil(stats.paceTimeRemaining)}s
            </span>
          </div>
        </div>

        {/* Right: Score & Pause */}
        <div className="flex items-center gap-3">
          {/* Combo Multiplier Flame */}
          {stats.combo > 1 && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 border border-orange-400 rounded-xl px-3 py-1.5 text-white font-black text-xs sm:text-sm shadow-lg animate-pulse font-mono">
              <Flame className="w-4 h-4 fill-white" />
              <span>x{stats.combo}</span>
            </div>
          )}

          {/* Score Counter */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-1.5 shadow-lg text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score</div>
            <div className="text-sm sm:text-lg font-black text-white font-mono tracking-wide">
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Pause Button */}
          <button
            id="btn-hud-pause"
            onClick={onPause}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-200 hover:text-white shadow-lg transition-colors cursor-pointer"
            title="Pause Game (ESC)"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Power-Ups Tray */}
      <div className="relative z-10 w-full px-4 sm:px-6 mt-3 flex items-center justify-start gap-2">
        {(Object.keys(stats.activePowerUps) as PowerUpType[]).map(type => {
          const timeLeft = stats.activePowerUps[type];
          if (timeLeft <= 0) return null;
          return (
            <div
              key={type}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-md text-xs font-bold font-mono shadow-md animate-fade-in ${powerUpColors[type]}`}
            >
              {powerUpIcons[type]}
              <span>{Math.ceil(timeLeft)}s</span>
            </div>
          );
        })}
      </div>

      {/* Floating Action Popups */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        {floatingTexts.map(item => (
          <div
            key={item.id}
            className="text-lg sm:text-2xl font-black italic tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-bounce"
            style={{ color: item.color }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Dynamic Pace Transition Banner */}
      {paceBanner && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 px-4">
          <div
            className="text-center px-8 py-4 rounded-2xl backdrop-blur-xl border-2 shadow-2xl animate-scale-up"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderColor: paceBanner.color,
              boxShadow: `0 0 40px ${paceBanner.color}60`,
            }}
          >
            <div
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-widest font-mono uppercase"
              style={{ color: paceBanner.color }}
            >
              {paceBanner.text}
            </div>
            <div className="text-xs sm:text-base text-slate-200 mt-1 font-semibold tracking-wide">
              {paceBanner.subtext}
            </div>
          </div>
        </div>
      )}

      {/* Mobile / On-Screen Touch Controls (if enabled) */}
      {showTouchControls && (
        <div className="absolute bottom-6 inset-x-0 px-6 flex items-end justify-between pointer-events-auto z-20">
          {/* Left / Right Lateral D-Pad */}
          <div className="flex items-center gap-3">
            <button
              id="touch-btn-left"
              onClick={onMoveLeft}
              className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-cyan-600 border border-slate-700 text-white font-black text-xl flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              ◀
            </button>
            <button
              id="touch-btn-right"
              onClick={onMoveRight}
              className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-cyan-600 border border-slate-700 text-white font-black text-xl flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              ▶
            </button>
          </div>

          {/* Jump & Slide Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="touch-btn-slide"
              onClick={onSlide}
              className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-amber-600 border border-slate-700 text-amber-300 font-black text-xs uppercase flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              <span className="text-lg">▼</span>
              <span>Slide</span>
            </button>
            <button
              id="touch-btn-jump"
              onClick={onJump}
              className="w-16 h-16 rounded-2xl bg-cyan-600 active:bg-cyan-500 border border-cyan-400 text-white font-black text-xs uppercase flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              <span className="text-lg">▲</span>
              <span>Jump</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
