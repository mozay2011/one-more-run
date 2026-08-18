import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlayerCharacter } from '../game/character';
import { PlayerProgress, CharacterConfig } from '../game/types';
import { CHARACTERS } from '../game/constants';
import { calculateLevel } from '../game/storage';
import { audio } from '../game/audio';
import { Play, Users, Zap, Award, Gift, Settings as SettingsIcon, Trophy, Coins, ChevronRight } from 'lucide-react';

interface MainMenuProps {
  progress: PlayerProgress;
  onPlay: () => void;
  onOpenCharacters: () => void;
  onOpenUpgrades: () => void;
  onOpenMissions: () => void;
  onOpenDailyRewards: () => void;
  onOpenSettings: () => void;
  dailyRewardAvailable: boolean;
  unclaimedMissionsCount: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  onPlay,
  onOpenCharacters,
  onOpenUpgrades,
  onOpenMissions,
  onOpenDailyRewards,
  onOpenSettings,
  dailyRewardAvailable,
  unclaimedMissionsCount,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedChar = CHARACTERS.find(c => c.id === progress.selectedCharacterId) || CHARACTERS[0];
  const levelInfo = calculateLevel(progress.xp);

  // 3D Menu Character Showcase
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.3, 4.2);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(selectedChar.colorScheme.primary, 3.0, 10);
    pointLight.position.set(-2, 1, 2);
    scene.add(pointLight);

    // Platform
    const platformGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.2, 32);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.1;
    platform.receiveShadow = true;
    scene.add(platform);

    const ringGeo = new THREE.TorusGeometry(1.45, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: selectedChar.colorScheme.primary });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.01;
    scene.add(ring);

    // Character
    const character = new PlayerCharacter(selectedChar);
    scene.add(character.group);

    // Mouse drag rotation
    let isDragging = false;
    let prevMouseX = 0;
    let rotationVelocity = 0.005;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      character.group.rotation.y += dx * 0.01;
      prevMouseX = e.clientX;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        character.group.rotation.y += rotationVelocity;
      }
      character.playMenuIdle(elapsed);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedChar]);

  return (
    <div id="main-menu-screen" className="relative w-full h-full flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Background City Glow Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 text-xl font-mono shadow-lg shadow-cyan-500/20">
            R
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400">
              ONE MORE RUN
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Survive the Dynamic City Rush
            </p>
          </div>
        </div>

        {/* Player Stats Pills */}
        <div className="flex items-center gap-3">
          {/* Level Badge */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-1.5 shadow-lg">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-xs font-mono">
              {levelInfo.level}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Level</div>
              <div className="text-xs font-mono text-slate-200">{levelInfo.currentXp} XP</div>
            </div>
          </div>

          {/* Coins Counter */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 rounded-2xl px-4 py-1.5 shadow-lg">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
              {progress.coins.toLocaleString()}
            </span>
          </div>

          {/* Settings Button */}
          <button
            id="btn-menu-settings"
            onClick={() => {
              audio.playButtonClick();
              onOpenSettings();
            }}
            className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white shadow-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Col: High Scores & Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Best Record Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
              <Trophy className="w-4 h-4" /> Personal Best
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">High Score</div>
                <div className="text-2xl font-black text-white font-mono">
                  {progress.highScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Best Distance</div>
                <div className="text-2xl font-black text-cyan-400 font-mono">
                  {progress.bestDistance.toLocaleString()}<span className="text-xs text-slate-400 ml-0.5">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Character Quick Switcher Card */}
          <div
            onClick={() => {
              audio.playButtonClick();
              onOpenCharacters();
            }}
            className="bg-slate-900/80 hover:bg-slate-850 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-3xl p-4 shadow-xl flex items-center justify-between cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-slate-950 text-xl font-mono shadow-md"
                style={{ backgroundColor: selectedChar.colorScheme.primary }}
              >
                {selectedChar.name[0]}
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Runner</div>
                <div className="text-base font-black text-white font-mono group-hover:text-cyan-400 transition-colors">
                  {selectedChar.name}
                </div>
                <div className="text-xs text-cyan-300/90">{selectedChar.perk.name}</div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>

          {/* Pace System Feature Teaser */}
          <div className="hidden sm:block p-4 rounded-3xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400">
            <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Dynamic Pace System
            </div>
            Experience shifting phases from <span className="text-sky-400 font-semibold">CALM</span> to{' '}
            <span className="text-red-400 font-semibold">RUSH</span> and <span className="text-purple-400 font-semibold">CHAOS</span> with built-in recovery breathers!
          </div>
        </div>

        {/* Center: 3D Character Stage */}
        <div className="lg:col-span-4 h-72 sm:h-96 lg:h-[460px] relative flex items-center justify-center">
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          <div className="absolute bottom-2 text-[11px] text-slate-500 font-medium tracking-wide pointer-events-none">
            Drag to inspect runner
          </div>
        </div>

        {/* Right Col: Menu Hub Actions */}
        <div className="lg:col-span-4 space-y-3">
          {/* CHARACTERS */}
          <button
            id="btn-menu-characters"
            onClick={() => {
              audio.playButtonClick();
              onOpenCharacters();
            }}
            className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-cyan-300 font-mono">CHARACTERS</div>
                <div className="text-xs text-slate-400">4 Stylized Runners with unique perks</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* UPGRADES */}
          <button
            id="btn-menu-upgrades"
            onClick={() => {
              audio.playButtonClick();
              onOpenUpgrades();
            }}
            className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-amber-300 font-mono">UPGRADES</div>
                <div className="text-xs text-slate-400">Magnet, Shield, Sonic Dash, Slow-Mo</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </button>

          {/* MISSIONS */}
          <button
            id="btn-menu-missions"
            onClick={() => {
              audio.playButtonClick();
              onOpenMissions();
            }}
            className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-left flex items-center justify-between transition-all group cursor-pointer relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 font-mono">MISSIONS</div>
                <div className="text-xs text-slate-400">Earn extra XP and coin bounties</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unclaimedMissionsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                  {unclaimedMissionsCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </button>

          {/* DAILY REWARD */}
          <button
            id="btn-menu-daily"
            onClick={() => {
              audio.playButtonClick();
              onOpenDailyRewards();
            }}
            className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left flex items-center justify-between transition-all group cursor-pointer relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-purple-300 font-mono">DAILY REWARDS</div>
                <div className="text-xs text-slate-400">7-Day Streak Calendar</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dailyRewardAvailable && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold text-xs animate-bounce">
                  Ready!
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
          </button>
        </div>
      </main>

      {/* Bottom Sticky Play Bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-center">
        <button
          id="btn-menu-play"
          onClick={() => {
            audio.playButtonClick();
            onPlay();
          }}
          className="w-full max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xl sm:text-2xl tracking-wider uppercase font-mono shadow-2xl shadow-cyan-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-7 h-7 fill-slate-950" />
          <span>START RUN</span>
        </button>
      </footer>
    </div>
  );
};
