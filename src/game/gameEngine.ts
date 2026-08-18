import * as THREE from 'three';
import { PlayerCharacter } from './character';
import { TrackManager } from './track';
import { PaceEngine } from './paceEngine';
import { CameraFxManager, ParticleManager } from './cameraFx';
import { audio } from './audio';
import {
  CharacterConfig,
  GameSettings,
  GameStats,
  PacePhase,
  PowerUpType,
} from './types';
import { LANE_WIDTH, LANE_X, UPGRADES } from './constants';

export class GameEngine {
  // Three.js Core
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Subsystems
  public character: PlayerCharacter;
  public track: TrackManager;
  public paceEngine: PaceEngine;
  public cameraFx: CameraFxManager;
  public particles: ParticleManager;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private fog: THREE.FogExp2;

  // Player State
  public currentLane: number = 0; // -1 = Left, 0 = Center, 1 = Right
  public targetX: number = 0;
  public playerX: number = 0;
  public playerY: number = 0;
  public playerZ: number = 0;
  public velocityY: number = 0;
  public isJumping: boolean = false;
  public isSliding: boolean = false;
  public slideTimer: number = 0;
  public invulnerabilityTimer: number = 0;
  public isGameOver: boolean = false;
  public isPaused: boolean = false;

  // Game Stats
  public score: number = 0;
  public coinsCollected: number = 0;
  public distance: number = 0;
  public combo: number = 1;
  public maxCombo: number = 1;
  public comboDecayTimer: number = 0;
  public dodgesCount: number = 0;
  public closeCallsCount: number = 0;
  public powerUpsUsedCount: number = 0;
  public activePowerUps: Record<PowerUpType, number> = {
    MAGNET: 0,
    SHIELD: 0,
    SCORE_BOOST: 0,
    SPEED_BOOST: 0,
    TIME_SLOW: 0,
  };
  public shieldCharges: number = 0;

  // Configuration & Settings
  public activeCharacter: CharacterConfig;
  public settings: GameSettings;
  public upgradeLevels: Record<PowerUpType, number>;
  public isDebugHitboxActive: boolean = false;

  // Visual Hitbox Debugger Helpers
  private debugGroup: THREE.Group = new THREE.Group();
  private debugPlayerBox: THREE.LineSegments | null = null;
  private debugObstacleBoxes: THREE.LineSegments[] = [];

  // Callbacks to UI
  public onStatsUpdate?: (stats: GameStats) => void;
  public onPaceTransition?: (newPace: PacePhase, prevPace: PacePhase) => void;
  public onFloatingText?: (text: string, color: string) => void;
  public onGameOver?: (stats: GameStats) => void;

  // UI Throttle & Performance Tracking
  private hudUpdateTimer: number = 0;
  private readonly HUD_UPDATE_INTERVAL: number = 0.05; // 20 FPS UI dispatch for silky smooth rendering

  // Touch handling
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private containerElement: HTMLElement | null = null;
  private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onTouchStartHandler: ((e: TouchEvent) => void) | null = null;
  private onTouchEndHandler: ((e: TouchEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    characterConfig: CharacterConfig,
    settings: GameSettings,
    upgradeLevels: Record<PowerUpType, number>
  ) {
    this.activeCharacter = characterConfig;
    this.settings = settings;
    this.upgradeLevels = upgradeLevels;
    this.isDebugHitboxActive = !!settings.debugHitboxes;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x1e293b, 0.015);
    this.scene.fog = this.fog;

    const width = container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
    const height = container.clientHeight > 0 ? container.clientHeight : window.innerHeight;
    const aspect = width / (height || 1);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 260);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.graphicsQuality === 'high',
      powerPreference: 'high-performance',
      alpha: false,
      precision: 'mediump',
    });
    this.renderer.setSize(width, height);

    // Pixel ratio tuning
    const maxDPR = settings.graphicsQuality === 'high' ? 1.75 : settings.graphicsQuality === 'medium' ? 1.25 : 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));

    this.renderer.shadowMap.enabled = settings.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = settings.graphicsQuality === 'high' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Lighting (Tightly bounded for maximum shadow efficiency)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(10, 22, 10);
    this.dirLight.castShadow = settings.graphicsQuality !== 'low';
    const shadowRes = settings.graphicsQuality === 'high' ? 1024 : 512;
    this.dirLight.shadow.mapSize.width = shadowRes;
    this.dirLight.shadow.mapSize.height = shadowRes;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -12;
    this.dirLight.shadow.camera.right = 12;
    this.dirLight.shadow.camera.top = 18;
    this.dirLight.shadow.camera.bottom = -12;
    this.scene.add(this.dirLight);

    // 4. Subsystems Initialization
    this.character = new PlayerCharacter(characterConfig);
    this.scene.add(this.character.group);

    this.track = new TrackManager(this.scene);
    this.track.setQuality(settings.graphicsQuality);

    this.paceEngine = new PaceEngine();
    this.cameraFx = new CameraFxManager(this.camera);

    this.particles = new ParticleManager(this.scene, settings.graphicsQuality === 'high' ? 75 : 45);
    this.particles.setQuality(settings.graphicsQuality);

    this.paceEngine.setOnPaceChange((newPace, prevPace) => {
      if (this.onPaceTransition) {
        this.onPaceTransition(newPace, prevPace);
      }
      this.dispatchStatsNow();
    });

    // Debug Group
    this.debugGroup.visible = this.isDebugHitboxActive;
    this.scene.add(this.debugGroup);
    this.setupDebugWireframes();

    // 5. Bind Inputs
    this.bindControls(container);
  }

  private setupDebugWireframes() {
    // Wireframe for player
    const playerGeo = new THREE.BoxGeometry(0.56, 1.33, 0.44);
    const edges = new THREE.EdgesGeometry(playerGeo);
    this.debugPlayerBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 })
    );
    this.debugGroup.add(this.debugPlayerBox);

    // Pre-allocated pool of obstacle debug boxes
    for (let i = 0; i < 15; i++) {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const boxEdges = new THREE.EdgesGeometry(boxGeo);
      const line = new THREE.LineSegments(
        boxEdges,
        new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
      );
      line.visible = false;
      this.debugObstacleBoxes.push(line);
      this.debugGroup.add(line);
    }
  }

  public setCharacter(config: CharacterConfig) {
    this.activeCharacter = config;
    this.character.updateCharacterConfig(config);
  }

  public setUpgradeLevels(levels: Record<PowerUpType, number>) {
    this.upgradeLevels = levels;
  }

  public setSettings(settings: GameSettings) {
    this.settings = settings;
    this.isDebugHitboxActive = !!settings.debugHitboxes;
    this.debugGroup.visible = this.isDebugHitboxActive;

    audio.setVolumes(settings.musicVolume, settings.sfxVolume);

    this.track.setQuality(settings.graphicsQuality);
    this.particles.setQuality(settings.graphicsQuality);

    const maxDPR = settings.graphicsQuality === 'high' ? 1.75 : settings.graphicsQuality === 'medium' ? 1.25 : 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    this.renderer.shadowMap.enabled = settings.graphicsQuality !== 'low';
    this.dirLight.castShadow = settings.graphicsQuality !== 'low';
  }

  public toggleDebugHitboxes() {
    this.isDebugHitboxActive = !this.isDebugHitboxActive;
    this.debugGroup.visible = this.isDebugHitboxActive;
    if (this.onFloatingText) {
      this.onFloatingText(
        this.isDebugHitboxActive ? 'DEBUG HITBOXES: ON' : 'DEBUG HITBOXES: OFF',
        this.isDebugHitboxActive ? '#22c55e' : '#94a3b8'
      );
    }
  }

  public start() {
    this.resetState();
    this.track.init();
    this.paceEngine.reset();
    audio.startMusic(this.paceEngine.currentPace);

    this.lastTime = performance.now();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public resetState() {
    this.currentLane = 0;
    this.targetX = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.invulnerabilityTimer = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.hudUpdateTimer = 0;

    this.score = 0;
    this.coinsCollected = 0;
    this.distance = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboDecayTimer = 0;
    this.dodgesCount = 0;
    this.closeCallsCount = 0;
    this.powerUpsUsedCount = 0;
    this.shieldCharges = 0;

    this.activePowerUps = {
      MAGNET: 0,
      SHIELD: 0,
      SCORE_BOOST: 0,
      SPEED_BOOST: 0,
      TIME_SLOW: 0,
    };

    this.character.group.position.set(0, 0, 0);
    this.particles.clear();
  }

  public pause() {
    this.isPaused = true;
    audio.stopMusic();
    this.dispatchStatsNow();
  }

  public resume() {
    this.isPaused = false;
    audio.startMusic(this.paceEngine.currentPace);
    this.lastTime = performance.now();
    this.dispatchStatsNow();
  }

  // ================= INPUT SYSTEM =================
  private bindControls(container: HTMLElement) {
    this.containerElement = container;

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      // Toggle Hitbox Debugger with H
      if (e.code === 'KeyH') {
        this.toggleDebugHitboxes();
        return;
      }

      if (this.isGameOver) return;
      if (e.code === 'Escape') {
        this.isPaused = !this.isPaused;
        if (this.isPaused) this.pause();
        else this.resume();
        return;
      }

      if (this.isPaused) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.slide();
          break;
      }
    };

    window.addEventListener('keydown', this.onKeyDownHandler);

    // Touch / Swipe Gestures
    this.onTouchStartHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    };

    this.onTouchEndHandler = (e: TouchEvent) => {
      if (this.isGameOver || this.isPaused || e.changedTouches.length === 0) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 22) {
        if (absDx > absDy) {
          if (dx > 0) this.moveRight();
          else this.moveLeft();
        } else {
          if (dy > 0) this.slide();
          else this.jump();
        }
      }
    };

    container.addEventListener('touchstart', this.onTouchStartHandler, { passive: true });
    container.addEventListener('touchend', this.onTouchEndHandler, { passive: true });
  }

  public moveLeft() {
    if (this.currentLane > -1) {
      this.currentLane -= 1;
      this.targetX = this.currentLane === -1 ? LANE_X.LEFT : this.currentLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
      this.character.laneChangeRoll = 1;
      audio.playLaneChange();
    }
  }

  public moveRight() {
    if (this.currentLane < 1) {
      this.currentLane += 1;
      this.targetX = this.currentLane === -1 ? LANE_X.LEFT : this.currentLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
      this.character.laneChangeRoll = -1;
      audio.playLaneChange();
    }
  }

  public jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      const floatBonus = this.activeCharacter.perk.jumpFloat || 1.0;
      // High lofty jump clearing up to 2.25m with clean visual parabola
      this.velocityY = 12.0 * Math.sqrt(floatBonus);
      audio.playJump();
    }
  }

  public slide() {
    if (this.isJumping) {
      this.velocityY = -18;
    }
    this.isSliding = true;
    this.slideTimer = 0.75;
    audio.playSlide();
  }

  // ================= GAME LOOP =================
  private loop(now: number) {
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isPaused && !this.isGameOver) {
      this.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private update(delta: number) {
    // 1. Update Pace Engine with continuous distance progression
    this.paceEngine.update(delta);
    const pace = this.paceEngine.currentPace;
    let baseSpeed = this.paceEngine.getTargetSpeed(this.distance);

    // 2. Power-Ups Timers & Modifiers
    let isSpeedBoost = false;
    let hasMagnet = false;
    const hasShield = this.shieldCharges > 0;
    let scoreMultiplier = 1.0;

    (Object.keys(this.activePowerUps) as PowerUpType[]).forEach(type => {
      if (this.activePowerUps[type] > 0) {
        this.activePowerUps[type] = Math.max(0, this.activePowerUps[type] - delta);

        if (type === 'SPEED_BOOST' && this.activePowerUps[type] > 0) {
          isSpeedBoost = true;
          baseSpeed *= 1.6;
          hasMagnet = true;
        }
        if (type === 'TIME_SLOW' && this.activePowerUps[type] > 0) {
          baseSpeed *= 0.6;
        }
        if (type === 'MAGNET' && this.activePowerUps[type] > 0) {
          hasMagnet = true;
        }
        if (type === 'SCORE_BOOST' && this.activePowerUps[type] > 0) {
          scoreMultiplier *= 2.5;
        }
      }
    });

    if (this.activeCharacter.perk.scoreBonus) {
      scoreMultiplier *= this.activeCharacter.perk.scoreBonus;
    }

    // 3. Movement along Z
    this.playerZ += baseSpeed * delta;
    this.distance = Math.floor(this.playerZ);

    // Score accumulation
    this.score += Math.floor(baseSpeed * delta * 12 * this.combo * scoreMultiplier);

    // 4. Lateral X position lerp (dynamically scales with velocity for razor-sharp high-speed lane changes)
    const laneLerpSpeed = 16.0 + Math.min(10.0, (baseSpeed / 18.0) * 3.5);
    this.playerX = THREE.MathUtils.lerp(this.playerX, this.targetX, delta * laneLerpSpeed);
    this.character.laneChangeRoll = THREE.MathUtils.lerp(this.character.laneChangeRoll, 0, delta * 8);

    // 5. Jump & Slide Physics
    if (this.isJumping) {
      const gravity = 32;
      this.velocityY -= gravity * delta;
      this.playerY += this.velocityY * delta;

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.velocityY = 0;
        this.isJumping = false;
      }
    }

    if (this.isSliding) {
      this.slideTimer -= delta;
      this.particles.spawnSlideSparks(this.playerX, this.playerY, this.playerZ);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 6. Character position & animation
    this.character.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.character.updateAnimation(delta, baseSpeed, this.isJumping, this.isSliding, this.isGameOver);
    this.character.setPowerUpVisuals(hasShield, hasMagnet, isSpeedBoost);

    // 7. Update Track, Obstacles, Collectibles
    const magnetLvl = this.upgradeLevels.MAGNET || 1;
    const baseRadius = UPGRADES.MAGNET.levels[magnetLvl - 1]?.potency || 6;
    const perkRadius = (this.activeCharacter.perk.magnetBonus || 1.0) * baseRadius;

    this.track.update(this.playerZ, delta, pace, baseSpeed, this.playerX, this.playerY, hasMagnet, perkRadius);

    // 8. Separated 3D Bounding Box Collision & Near-Miss Detection
    this.checkObstacleCollisions(isSpeedBoost, delta);
    this.checkCollectiblePickups();

    // Update Debug Hitbox Visualizers (if active)
    if (this.isDebugHitboxActive) {
      this.updateDebugVisuals();
    }

    // 9. Combo Decay Timer
    if (this.combo > 1) {
      this.comboDecayTimer -= delta;
      if (this.comboDecayTimer <= 0) {
        this.combo = Math.max(1, this.combo - 1);
        this.comboDecayTimer = 3.5;
      }
    }

    // 10. Update Camera & Particles
    this.cameraFx.update(
      delta,
      this.playerX,
      this.playerY,
      this.playerZ,
      pace,
      baseSpeed,
      isSpeedBoost,
      this.settings.screenShake
    );
    this.particles.update(delta);

    // 11. Directional Light tracking player
    this.dirLight.position.set(this.playerX + 10, 22, this.playerZ + 10);
    this.dirLight.target.position.set(this.playerX, 0, this.playerZ + 15);
    this.dirLight.target.updateMatrixWorld();

    // 12. Throttled UI State Updates
    this.hudUpdateTimer += delta;
    if (this.hudUpdateTimer >= this.HUD_UPDATE_INTERVAL) {
      this.hudUpdateTimer = 0;
      this.dispatchStatsNow();
    }
  }

  public dispatchStatsNow() {
    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        score: this.score,
        coinsCollected: this.coinsCollected,
        distance: this.distance,
        combo: this.combo,
        maxCombo: this.maxCombo,
        pace: this.paceEngine.currentPace,
        paceTimeRemaining: this.paceEngine.getTimeRemaining(),
        dodgesCount: this.dodgesCount,
        closeCallsCount: this.closeCallsCount,
        activePowerUps: { ...this.activePowerUps },
        speed: Math.round(this.paceEngine.getTargetSpeed()),
        multiplier: this.combo,
        isGameOver: this.isGameOver,
        isPaused: this.isPaused,
        highestPaceInRun: this.paceEngine.highestPaceInRun,
      });
    }
  }

  // ================= ACCURATE 3D BOUNDING HITBOX COLLISION LOGIC =================
  private checkObstacleCollisions(isSpeedBoost: boolean, delta: number) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
      return;
    }

    const pX = this.playerX;
    const pY = this.playerY;
    const pZ = this.playerZ;

    // SEPARATE PLAYER COLLISION HITBOX:
    // Slightly smaller than visible model (0.56m width, 0.44m depth) for reasonable forgiveness margin.
    // Vertical collision bounds strictly depend on jump/slide state!
    const pMinX = pX - 0.28;
    const pMaxX = pX + 0.28;

    let pMinY: number;
    let pMaxY: number;

    if (this.isSliding) {
      // Flat low-profile slide under overhead barriers (0.50m total height)
      pMinY = pY + 0.05;
      pMaxY = pY + 0.50;
    } else if (this.isJumping) {
      // Jumping with knees and feet tucked up (28cm forgiveness off character origin)
      pMinY = pY + 0.28;
      pMaxY = pY + 1.45;
    } else {
      // Normal upright running: feet at 0.12m off floor, head at 1.45m
      pMinY = pY + 0.12;
      pMaxY = pY + 1.45;
    }

    const pMinZ = pZ - 0.22;
    const pMaxZ = pZ + 0.22;

    const obstacles = this.track.activeObstacles;
    const len = obstacles.length;

    for (let i = 0; i < len; i++) {
      const obs = obstacles[i];
      if (obs.cleared) continue;

      // Fast Z distance rejection
      const dz = obs.z - pZ;
      if (dz < -3.0 || dz > (obs.isMoving ? 14.0 : 4.5)) continue;

      const obsLaneX = obs.lane === -1 ? LANE_X.LEFT : obs.lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
      const oMinX = obsLaneX - obs.width / 2;
      const oMaxX = obsLaneX + obs.width / 2;
      const oMinY = obs.baseY;
      const oMaxY = obs.baseY + obs.height;
      const oMinZ = obs.z - obs.depth / 2;
      const oMaxZ = obs.z + obs.depth / 2;

      // ACCURATE 3D AABB OVERLAP CHECK:
      // Player ONLY collides if X, Y, and Z axes ALL strictly overlap.
      // If player jumps above obstacle (pMinY >= oMaxY), overlapY is FALSE -> ZERO COLLISION!
      // If player slides under barrier (pMaxY <= oMinY), overlapY is FALSE -> ZERO COLLISION!
      const overlapX = pMinX < oMaxX && pMaxX > oMinX;
      const overlapY = pMinY < oMaxY && pMaxY > oMinY;
      const overlapZ = pMinZ < oMaxZ && pMaxZ > oMinZ;

      if (overlapX && overlapY && overlapZ) {
        // Sonic Dash destroys obstacles safely
        if (isSpeedBoost) {
          obs.cleared = true;
          this.particles.spawnImpactBurst(obsLaneX, 1.2, obs.z);
          this.dodgesCount++;
          continue;
        }

        // Energy Shield absorption
        if (this.shieldCharges > 0) {
          this.shieldCharges--;
          this.invulnerabilityTimer = 1.5;
          obs.cleared = true;
          audio.playShieldBreak();
          this.cameraFx.triggerShake(0.8);
          this.particles.spawnImpactBurst(pX, 1.2, pZ);
          if (this.onFloatingText) {
            this.onFloatingText('SHIELD SAVED!', '#38bdf8');
          }
          continue;
        }

        // CRASH / RUN OVER
        this.triggerGameOver();
        return;
      }

      // Check Near-Miss / Close-Call Dodges
      if (!obs.nearMissAwarded && obs.z < pZ - 0.8) {
        obs.cleared = true;
        this.dodgesCount++;

        const distToPlayer = Math.abs(pX - obsLaneX);
        if (distToPlayer < 2.0 && Math.abs(obs.z - (pZ - 0.8)) < 2.2) {
          obs.nearMissAwarded = true;
          this.closeCallsCount++;
          this.combo = Math.min(10, this.combo + 1);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.comboDecayTimer = 5.0;

          audio.playNearMiss();
          this.cameraFx.triggerShake(0.3);
          if (this.onFloatingText) {
            this.onFloatingText(`CLOSE CALL! x${this.combo}`, '#f59e0b');
          }
        }
      }
    }
  }

  // ================= DEBUG HITBOX VISUALS =================
  private updateDebugVisuals() {
    if (!this.debugPlayerBox) return;

    const pY = this.playerY;
    let height = 1.33;
    let centerY = pY + 0.78;

    if (this.isSliding) {
      height = 0.45;
      centerY = pY + 0.275;
    } else if (this.isJumping) {
      height = 1.17;
      centerY = pY + 0.865;
    }

    this.debugPlayerBox.position.set(this.playerX, centerY, this.playerZ);
    this.debugPlayerBox.scale.set(0.56, height / 1.33, 0.44);

    // Update active obstacle debug boxes
    const obstacles = this.track.activeObstacles;
    const pZ = this.playerZ;
    let boxIdx = 0;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (Math.abs(obs.z - pZ) > 40 || boxIdx >= this.debugObstacleBoxes.length) continue;

      const line = this.debugObstacleBoxes[boxIdx++];
      const obsLaneX = obs.lane === -1 ? LANE_X.LEFT : obs.lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
      const centerY = obs.baseY + obs.height / 2;

      line.position.set(obsLaneX, centerY, obs.z);
      line.scale.set(obs.width, obs.height, obs.depth);
      line.visible = true;
    }

    for (let i = boxIdx; i < this.debugObstacleBoxes.length; i++) {
      this.debugObstacleBoxes[i].visible = false;
    }
  }

  // ================= SPATIAL OPTIMIZED COLLECTIBLE LOGIC =================
  private checkCollectiblePickups() {
    const pX = this.playerX;
    const pY = this.playerY + 0.9;
    const pZ = this.playerZ;

    const collectibles = this.track.activeCollectibles;
    const len = collectibles.length;

    for (let i = 0; i < len; i++) {
      const col = collectibles[i];
      if (col.collected) continue;

      // Fast Z distance rejection
      const dz = Math.abs(pZ - col.z);
      if (dz > 3.5) continue;

      const dx = pX - col.x;
      const dy = pY - col.y;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Pickup radius ~ 1.35m (1.82 sq)
      if (distSq < 1.82) {
        col.collected = true;
        this.particles.spawnCoinBurst(col.x, col.y, col.z);

        if (col.type === 'COIN') {
          const coinVal = Math.round(1 * (this.activeCharacter.perk.coinBonus || 1.0));
          this.coinsCollected += coinVal;
          this.score += 50 * this.combo;
          audio.playCoin();
        } else if (col.type === 'SUPER_COIN') {
          const superVal = Math.round(10 * (this.activeCharacter.perk.coinBonus || 1.0));
          this.coinsCollected += superVal;
          this.score += 500 * this.combo;
          this.combo = Math.min(10, this.combo + 1);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.comboDecayTimer = 6.0;
          audio.playCoin();
          if (this.onFloatingText) {
            this.onFloatingText('+10 SUPER COINS!', '#f43f5e');
          }
        } else if (col.type === 'POWERUP' && col.powerUpType) {
          this.activatePowerUp(col.powerUpType);
        }
      }
    }
  }

  private activatePowerUp(type: PowerUpType) {
    this.powerUpsUsedCount++;
    const lvl = this.upgradeLevels[type] || 1;
    const config = UPGRADES[type]?.levels[lvl - 1];
    const duration = config?.duration || 10;

    this.activePowerUps[type] = duration;

    if (type === 'SHIELD') {
      this.shieldCharges = Math.max(this.shieldCharges, lvl >= 3 ? 2 : 1);
    }

    const hexColors: Record<PowerUpType, number> = {
      MAGNET: 0xc084fc,
      SHIELD: 0x38bdf8,
      SCORE_BOOST: 0xf59e0b,
      SPEED_BOOST: 0xef4444,
      TIME_SLOW: 0x10b981,
    };

    audio.playPowerUp();
    this.cameraFx.triggerShake(0.35);
    this.cameraFx.triggerPowerUpKick(type === 'SPEED_BOOST' ? 9.0 : 6.5);
    this.particles.spawnPowerUpBurst(this.playerX, 1.2, this.playerZ, hexColors[type] || 0xc084fc);

    if (this.onFloatingText) {
      const names: Record<PowerUpType, string> = {
        MAGNET: 'COIN MAGNET!',
        SHIELD: 'ENERGY SHIELD!',
        SCORE_BOOST: 'SCORE BOOST x2.5!',
        SPEED_BOOST: 'SONIC DASH!',
        TIME_SLOW: 'TIME SLOW-MO!',
      };
      const colors: Record<PowerUpType, string> = {
        MAGNET: '#c084fc',
        SHIELD: '#38bdf8',
        SCORE_BOOST: '#f59e0b',
        SPEED_BOOST: '#ef4444',
        TIME_SLOW: '#10b981',
      };
      this.onFloatingText(names[type], colors[type]);
    }

    this.dispatchStatsNow();
  }

  private triggerGameOver() {
    this.isGameOver = true;
    audio.stopMusic();
    audio.playCrash();
    this.cameraFx.triggerShake(1.2);
    this.particles.spawnImpactBurst(this.playerX, 1.0, this.playerZ);

    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        coinsCollected: this.coinsCollected,
        distance: this.distance,
        combo: this.combo,
        maxCombo: this.maxCombo,
        pace: this.paceEngine.currentPace,
        paceTimeRemaining: 0,
        dodgesCount: this.dodgesCount,
        closeCallsCount: this.closeCallsCount,
        activePowerUps: { ...this.activePowerUps },
        speed: 0,
        multiplier: 1,
        isGameOver: true,
        isPaused: false,
        highestPaceInRun: this.paceEngine.highestPaceInRun,
      });
    }
  }

  public handleResize(width: number, height: number) {
    if (this.renderer && this.camera) {
      this.camera.aspect = width / (height || 1);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    audio.stopMusic();

    if (this.onKeyDownHandler) {
      window.removeEventListener('keydown', this.onKeyDownHandler);
      this.onKeyDownHandler = null;
    }

    if (this.containerElement) {
      if (this.onTouchStartHandler) {
        this.containerElement.removeEventListener('touchstart', this.onTouchStartHandler);
        this.onTouchStartHandler = null;
      }
      if (this.onTouchEndHandler) {
        this.containerElement.removeEventListener('touchend', this.onTouchEndHandler);
        this.onTouchEndHandler = null;
      }
    }

    this.track.destroy();
    this.particles.destroy();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
