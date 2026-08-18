import * as THREE from 'three';
import { ObstacleType, PowerUpType, EnvironmentTheme, PacePhase } from './types';
import { LANE_WIDTH, LANE_X, PACE_CONFIG } from './constants';

export interface ActiveObstacle {
  id: string;
  mesh: THREE.Group;
  type: ObstacleType;
  lane: number; // -1 = Left, 0 = Center, 1 = Right
  z: number;
  width: number;
  height: number;
  depth: number;
  baseY: number;
  isMoving: boolean;
  moveSpeed: number;
  cleared: boolean;
  nearMissAwarded: boolean;
  // Solvability properties
  isJumpable: boolean;
  isSlideable: boolean;
}

export interface ActiveCollectible {
  id: string;
  mesh: THREE.Group;
  type: 'COIN' | 'SUPER_COIN' | 'POWERUP';
  powerUpType?: PowerUpType;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  isMagnetized: boolean;
}

export interface TrackChunk {
  group: THREE.Group;
  roadMesh: THREE.Mesh;
  startZ: number;
  length: number;
  theme: EnvironmentTheme;
}

// Action required to survive a lane
export type LaneActionType = 'OPEN' | 'JUMP' | 'SLIDE' | 'BLOCKED';

export interface LanePlan {
  lane: number; // -1, 0, 1
  action: LaneActionType;
  obstacleType?: ObstacleType;
  isMoving?: boolean;
}

export interface ObstacleSetPlan {
  zPos: number;
  lanes: LanePlan[]; // Always 3 lanes: [-1, 0, 1]
}

export class TrackManager {
  public scene: THREE.Scene;
  public activeChunks: TrackChunk[] = [];
  public activeObstacles: ActiveObstacle[] = [];
  public activeCollectibles: ActiveCollectible[] = [];

  private nextChunkZ: number = 0;
  private chunkLength: number = 60;
  private lookAheadDistance: number = 180;
  private currentTheme: EnvironmentTheme = 'DOWNTOWN';
  private obstacleIdCounter: number = 0;
  private collectibleIdCounter: number = 0;
  private graphicsQuality: 'low' | 'medium' | 'high' = 'medium';

  // Generator State & Solvability Tracker
  private lastObstacleZ: number = 0;
  private lastSurvivingLanes: number[] = [-1, 0, 1]; // Initially all lanes are safe

  // ================= OBJECT POOLS =================
  private chunkPool: TrackChunk[] = [];
  private coinPool: THREE.Group[] = [];
  private superCoinPool: THREE.Group[] = [];
  private powerUpPools: Map<PowerUpType, THREE.Group[]> = new Map();
  private obstaclePools: Map<ObstacleType, THREE.Group[]> = new Map();

  // Shared Geometries (Singletons - Zero GPU reallocation)
  private roadGeo = new THREE.PlaneGeometry(12, 60);
  private sidewalkGeo = new THREE.BoxGeometry(2.5, 0.4, 60);
  private dividerGeo = new THREE.BoxGeometry(0.12, 0.02, 3);
  private coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
  private superCoinGeo = new THREE.OctahedronGeometry(0.48);
  private powerUpBoxGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
  private powerUpRingGeo = new THREE.TorusGeometry(0.7, 0.04, 6, 12);

  // Obstacle Geometries (Strictly calibrated to visually match their collision bounds)
  private barLowGeo = new THREE.BoxGeometry(2.0, 0.65, 0.35);
  private barStripeGeo = new THREE.BoxGeometry(2.05, 0.12, 0.38);
  private barHighTopGeo = new THREE.BoxGeometry(2.0, 0.55, 0.35);
  private barPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8);
  private barLaserGlowGeo = new THREE.BoxGeometry(1.9, 0.08, 0.38);
  private roadBlockGeo = new THREE.BoxGeometry(2.0, 1.9, 0.8);
  private roadBlockBorderGeo = new THREE.BoxGeometry(2.05, 0.15, 0.85);
  private trainBodyGeo = new THREE.BoxGeometry(2.1, 2.6, 5.5);
  private trainMovingBodyGeo = new THREE.BoxGeometry(2.1, 2.6, 6.0);
  private trainHeadlightGeo = new THREE.SphereGeometry(0.18, 6, 6);
  private carBodyGeo = new THREE.BoxGeometry(1.9, 1.3, 3.5);
  private carGlowGeo = new THREE.BoxGeometry(1.95, 0.12, 0.2);
  private laserFrameGeo = new THREE.BoxGeometry(2.0, 0.2, 0.3);
  private laserBeamGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6);

  // Scenery Geometries (Lightweight environmental variety)
  private buildingGeo = new THREE.BoxGeometry(6, 24, 12);
  private tallBuildingGeo = new THREE.BoxGeometry(8, 38, 14);
  private steppedBuildingBottomGeo = new THREE.BoxGeometry(9, 18, 12);
  private steppedBuildingTopGeo = new THREE.BoxGeometry(5.5, 20, 9);
  private antennaGeo = new THREE.CylinderGeometry(0.06, 0.1, 8, 4);
  private antennaBeaconGeo = new THREE.SphereGeometry(0.2, 4, 4);
  private streetLampPoleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.5, 6);
  private streetLampHeadGeo = new THREE.BoxGeometry(0.3, 0.12, 0.6);
  private streetLampGlowGeo = new THREE.BoxGeometry(0.24, 0.05, 0.45);
  private gantryBeamGeo = new THREE.BoxGeometry(14, 0.35, 0.35);
  private gantryPillarGeo = new THREE.CylinderGeometry(0.1, 0.12, 5.5, 6);
  private gantrySignGeo = new THREE.BoxGeometry(8.5, 1.2, 0.1);
  private signGeo = new THREE.PlaneGeometry(3.5, 2.5);

  // Shared Materials
  private roadMatDowntown = new THREE.MeshStandardMaterial({ color: 0x1e222d, roughness: 0.8 });
  private roadMatUnderground = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.9 });
  private roadMatNeon = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  private roadMatIndustrial = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });

  private sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  private laneLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private coinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
  private superCoinMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.9, roughness: 0.1 });

  private obstacleMatYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  private obstacleMatDark = new THREE.MeshBasicMaterial({ color: 0x18181b });
  private obstacleMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  private obstacleMatPole = new THREE.MeshStandardMaterial({ color: 0x475569 });
  private obstacleMatLaser = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  private obstacleMatBlock = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  private obstacleMatCyanGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private obstacleMatTrainStatic = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.4, roughness: 0.5 });
  private obstacleMatTrainMoving = new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.4, roughness: 0.5 });
  private obstacleMatHeadlight = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private obstacleMatCar = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
  private obstacleMatLaserFrame = new THREE.MeshStandardMaterial({ color: 0x581c87 });
  private obstacleMatPurpleGlow = new THREE.MeshBasicMaterial({ color: 0xc084fc });

  // Environmental Props Materials
  private metalDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
  private lampCyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private beaconRedGlowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private gantrySignMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });

  private bldgMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 }),
  ];

  private neonMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }),
  ];

  // Power-up materials
  private powerUpMaterials: Record<PowerUpType, THREE.MeshStandardMaterial> = {
    MAGNET: new THREE.MeshStandardMaterial({ color: 0xc084fc, metalness: 0.5, roughness: 0.2 }),
    SHIELD: new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5, roughness: 0.2 }),
    SCORE_BOOST: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.2 }),
    SPEED_BOOST: new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, roughness: 0.2 }),
    TIME_SLOW: new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.5, roughness: 0.2 }),
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.coinGeo.rotateX(Math.PI / 2);
    this.laserBeamGeo.rotateZ(Math.PI / 2);
    this.powerUpRingGeo.rotateX(Math.PI / 2);

    // Initialize map pools
    const pTypes: PowerUpType[] = ['MAGNET', 'SHIELD', 'SCORE_BOOST', 'SPEED_BOOST', 'TIME_SLOW'];
    pTypes.forEach(t => this.powerUpPools.set(t, []));

    const obsTypes: ObstacleType[] = [
      'BARRIER_LOW',
      'BARRIER_HIGH',
      'ROAD_BLOCK',
      'TRAIN_STATIC',
      'TRAIN_MOVING',
      'CAR_MOVING',
      'LASER_GATE',
    ];
    obsTypes.forEach(t => this.obstaclePools.set(t, []));
  }

  public setQuality(quality: 'low' | 'medium' | 'high') {
    this.graphicsQuality = quality;
  }

  public init() {
    this.clear();
    this.nextChunkZ = 0;
    this.lastObstacleZ = 0;
    this.lastSurvivingLanes = [-1, 0, 1];

    // Spawn 4 initial chunks (first chunk is safe tutorial start)
    for (let i = 0; i < 4; i++) {
      this.spawnChunk('CALM', 18, i === 0);
    }
  }

  public clear() {
    for (const chunk of this.activeChunks) {
      chunk.group.visible = false;
      this.chunkPool.push(chunk);
    }
    this.activeChunks = [];

    for (const obs of this.activeObstacles) {
      obs.mesh.visible = false;
      const pool = this.obstaclePools.get(obs.type);
      if (pool) pool.push(obs.mesh);
    }
    this.activeObstacles = [];

    for (const col of this.activeCollectibles) {
      col.mesh.visible = false;
      if (col.type === 'COIN') {
        this.coinPool.push(col.mesh);
      } else if (col.type === 'SUPER_COIN') {
        this.superCoinPool.push(col.mesh);
      } else if (col.type === 'POWERUP' && col.powerUpType) {
        const pool = this.powerUpPools.get(col.powerUpType);
        if (pool) pool.push(col.mesh);
      }
    }
    this.activeCollectibles = [];
  }

  // ================= FRAME UPDATE & RECYCLER =================
  public update(
    playerZ: number,
    delta: number,
    currentPace: PacePhase,
    currentSpeed: number,
    playerX: number,
    playerY: number,
    hasMagnet: boolean,
    magnetRadius: number
  ) {
    // 1. Spawn new chunks ahead of player
    while (this.nextChunkZ < playerZ + this.lookAheadDistance) {
      this.spawnChunk(currentPace, currentSpeed, false);
    }

    // 2. Recycle chunks far behind the player (beyond 25m behind)
    const despawnZ = playerZ - 25;

    for (let i = this.activeChunks.length - 1; i >= 0; i--) {
      const chunk = this.activeChunks[i];
      if (chunk.startZ + chunk.length < despawnZ) {
        chunk.group.visible = false;
        this.chunkPool.push(chunk);
        this.activeChunks.splice(i, 1);
      }
    }

    // 3. Update & recycle active obstacles
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];

      if (obs.z < despawnZ) {
        obs.mesh.visible = false;
        const pool = this.obstaclePools.get(obs.type);
        if (pool) pool.push(obs.mesh);
        this.activeObstacles.splice(i, 1);
        continue;
      }

      if (obs.isMoving) {
        // Only update moving obstacles if within 120m of player
        if (Math.abs(obs.z - playerZ) < 120) {
          obs.z -= obs.moveSpeed * delta;
          obs.mesh.position.z = obs.z;
        }
      }
    }

    // 4. Update & recycle active collectibles
    for (let i = this.activeCollectibles.length - 1; i >= 0; i--) {
      const col = this.activeCollectibles[i];

      if (col.collected || col.z < despawnZ) {
        col.mesh.visible = false;
        if (col.type === 'COIN') {
          this.coinPool.push(col.mesh);
        } else if (col.type === 'SUPER_COIN') {
          this.superCoinPool.push(col.mesh);
        } else if (col.type === 'POWERUP' && col.powerUpType) {
          const pool = this.powerUpPools.get(col.powerUpType);
          if (pool) pool.push(col.mesh);
        }
        this.activeCollectibles.splice(i, 1);
        continue;
      }

      // LOD: Only rotate & calculate magnet pull for collectibles near player (within 35m)
      const distZ = col.z - playerZ;
      if (distZ > -10 && distZ < 35) {
        col.mesh.rotation.y += delta * 3;

        if (hasMagnet && !col.collected) {
          const dx = playerX - col.x;
          const dy = playerY + 0.9 - col.y;
          const dz = playerZ - col.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < magnetRadius * magnetRadius) {
            const dist = Math.sqrt(distSq);
            col.isMagnetized = true;
            const pullSpeed = 24 * delta;
            col.x += (dx / (dist || 1)) * pullSpeed;
            col.y += (dy / (dist || 1)) * pullSpeed;
            col.z += (dz / (dist || 1)) * pullSpeed;
            col.mesh.position.set(col.x, col.y, col.z);
          }
        }
      }
    }
  }

  // ================= CHUNK GENERATION & RECYCLING =================
  private spawnChunk(pace: PacePhase, currentSpeed: number, isSafeStart: boolean) {
    const startZ = this.nextChunkZ;

    // Cycle themes every 360m
    const themeCycle: EnvironmentTheme[] = [
      'DOWNTOWN',
      'TRAIN_STATION',
      'NEON_DISTRICT',
      'UNDERGROUND',
      'HIGHWAY',
      'INDUSTRIAL',
    ];
    const themeIndex = Math.floor(startZ / 360) % themeCycle.length;
    this.currentTheme = themeCycle[themeIndex];

    let chunk: TrackChunk;

    if (this.chunkPool.length > 0) {
      // Reuse pooled chunk
      chunk = this.chunkPool.pop()!;
      chunk.startZ = startZ;
      chunk.theme = this.currentTheme;
      chunk.group.position.z = startZ;
      chunk.group.visible = true;

      // Update road material for theme
      let roadMat = this.roadMatDowntown;
      if (this.currentTheme === 'UNDERGROUND') roadMat = this.roadMatUnderground;
      else if (this.currentTheme === 'NEON_DISTRICT') roadMat = this.roadMatNeon;
      else if (this.currentTheme === 'INDUSTRIAL') roadMat = this.roadMatIndustrial;
      chunk.roadMesh.material = roadMat;
    } else {
      // Create new pooled chunk group
      const chunkGroup = new THREE.Group();
      chunkGroup.position.z = startZ;

      let roadMat = this.roadMatDowntown;
      if (this.currentTheme === 'UNDERGROUND') roadMat = this.roadMatUnderground;
      else if (this.currentTheme === 'NEON_DISTRICT') roadMat = this.roadMatNeon;
      else if (this.currentTheme === 'INDUSTRIAL') roadMat = this.roadMatIndustrial;

      const roadMesh = new THREE.Mesh(this.roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(0, 0, this.chunkLength / 2);
      roadMesh.receiveShadow = true;
      chunkGroup.add(roadMesh);

      // Sidewalks
      const leftSidewalk = new THREE.Mesh(this.sidewalkGeo, this.sidewalkMat);
      leftSidewalk.position.set(6, 0.2, this.chunkLength / 2);
      leftSidewalk.receiveShadow = true;
      chunkGroup.add(leftSidewalk);

      const rightSidewalk = new THREE.Mesh(this.sidewalkGeo, this.sidewalkMat);
      rightSidewalk.position.set(-6, 0.2, this.chunkLength / 2);
      rightSidewalk.receiveShadow = true;
      chunkGroup.add(rightSidewalk);

      // Lane divider luminous dashes
      for (let zOffset = 3; zOffset < this.chunkLength; zOffset += 6) {
        const leftDiv = new THREE.Mesh(this.dividerGeo, this.laneLineMat);
        leftDiv.position.set(LANE_WIDTH / 2, 0.02, zOffset);
        chunkGroup.add(leftDiv);

        const rightDiv = new THREE.Mesh(this.dividerGeo, this.laneLineMat);
        rightDiv.position.set(-LANE_WIDTH / 2, 0.02, zOffset);
        chunkGroup.add(rightDiv);
      }

      // Add low-poly city scenery & environmental variety
      this.buildChunkScenery(chunkGroup);

      this.scene.add(chunkGroup);
      chunk = {
        group: chunkGroup,
        roadMesh,
        startZ,
        length: this.chunkLength,
        theme: this.currentTheme,
      };
    }

    this.activeChunks.push(chunk);

    // Spawn hazards & loot if not tutorial safe chunk
    if (!isSafeStart) {
      this.populateChunkPatternsAndLoot(startZ, pace, currentSpeed);
    } else {
      this.lastObstacleZ = startZ + this.chunkLength;
      this.lastSurvivingLanes = [-1, 0, 1];
    }

    this.nextChunkZ += this.chunkLength;
  }

  private buildChunkScenery(chunkGroup: THREE.Group) {
    // 1. Varied Building Silhouettes along both sides
    const countPerSide = this.graphicsQuality === 'low' ? 2 : 3;
    const stepZ = this.chunkLength / countPerSide;

    for (const side of [-1, 1]) {
      for (let i = 0; i < countPerSide; i++) {
        const z = 8 + i * stepZ;
        const bldgMat = this.bldgMaterials[(i + (side > 0 ? 1 : 0)) % this.bldgMaterials.length];
        const bldgType = (i + (side > 0 ? 2 : 0)) % 3;

        if (bldgType === 0) {
          // Standard skyscraper
          const bldg = new THREE.Mesh(this.buildingGeo, bldgMat);
          bldg.position.set(side * 12, 12, z);
          chunkGroup.add(bldg);
        } else if (bldgType === 1) {
          // Tall skyscraper with rooftop communications antenna
          const bldg = new THREE.Mesh(this.tallBuildingGeo, bldgMat);
          bldg.position.set(side * 14, 19, z);
          chunkGroup.add(bldg);

          if (this.graphicsQuality !== 'low') {
            const ant = new THREE.Mesh(this.antennaGeo, this.metalDarkMat);
            ant.position.set(side * 13, 38 + 4, z);
            chunkGroup.add(ant);

            const beacon = new THREE.Mesh(this.antennaBeaconGeo, this.beaconRedGlowMat);
            beacon.position.set(side * 13, 38 + 8, z);
            chunkGroup.add(beacon);
          }
        } else {
          // Stepped / Tiered Cyberpunk Building
          const base = new THREE.Mesh(this.steppedBuildingBottomGeo, bldgMat);
          base.position.set(side * 13.5, 9, z);
          chunkGroup.add(base);

          const top = new THREE.Mesh(this.steppedBuildingTopGeo, bldgMat);
          top.position.set(side * 13.5, 18 + 10, z);
          chunkGroup.add(top);
        }

        // Neon Signboards along buildings (medium & high quality)
        if (i === 1 && this.graphicsQuality !== 'low') {
          const signMat = this.neonMaterials[(i + (side > 0 ? 2 : 0)) % this.neonMaterials.length];
          const sign = new THREE.Mesh(this.signGeo, signMat);
          sign.position.set(side * 6.9, 6.0, z);
          sign.rotation.y = (side * Math.PI) / 2;
          chunkGroup.add(sign);
        }
      }

      // 2. Sidewalk Street Lamps (Every ~20m)
      if (this.graphicsQuality !== 'low') {
        for (let lz = 10; lz < this.chunkLength; lz += 20) {
          const lampPole = new THREE.Mesh(this.streetLampPoleGeo, this.metalDarkMat);
          lampPole.position.set(side * 4.9, 2.25, lz);
          chunkGroup.add(lampPole);

          const lampHead = new THREE.Mesh(this.streetLampHeadGeo, this.metalDarkMat);
          lampHead.position.set(side * 4.5, 4.4, lz);
          chunkGroup.add(lampHead);

          const lampGlow = new THREE.Mesh(this.streetLampGlowGeo, this.lampCyanGlowMat);
          lampGlow.position.set(side * 4.5, 4.3, lz);
          chunkGroup.add(lampGlow);
        }
      }
    }

    // 3. Overhead Highway/District Gantry spanning road (at mid chunk)
    if (this.graphicsQuality !== 'low') {
      const gantryZ = 30;
      // Left and Right Support Pillars
      const leftPillar = new THREE.Mesh(this.gantryPillarGeo, this.metalDarkMat);
      leftPillar.position.set(5.5, 2.75, gantryZ);
      chunkGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(this.gantryPillarGeo, this.metalDarkMat);
      rightPillar.position.set(-5.5, 2.75, gantryZ);
      chunkGroup.add(rightPillar);

      // Overhead Crossbar Beam
      const crossBeam = new THREE.Mesh(this.gantryBeamGeo, this.metalDarkMat);
      crossBeam.position.set(0, 5.4, gantryZ);
      chunkGroup.add(crossBeam);

      // Overhead Illuminated Signboard
      const signBoard = new THREE.Mesh(this.gantrySignGeo, this.gantrySignMat);
      signBoard.position.set(0, 5.4, gantryZ - 0.2);
      chunkGroup.add(signBoard);
    }
  }

  // ================= RICH PROCEDURAL PATTERN GENERATION & SOLVABILITY =================
  private populateChunkPatternsAndLoot(chunkStartZ: number, pace: PacePhase, currentSpeed: number) {
    const distance = Math.max(0, chunkStartZ);

    // Dynamic difficulty metrics scaled by distance survived
    const metrics = this.getDifficultyMetrics(distance, pace);

    // Speed-scaled pattern spacing guaranteeing fair reaction buffer while eliminating deadzones
    const baseSpacing = Math.max(metrics.minSpacing, Math.round(currentSpeed * metrics.reactionTime));

    let currentZ = Math.max(chunkStartZ + 5, this.lastObstacleZ + baseSpacing);

    while (currentZ <= chunkStartZ + this.chunkLength - 8) {
      // Select pattern archetype matched to distance tier and current pace
      const patternChoice = this.selectPatternArchetype(distance, pace);

      // Execute pattern with guaranteed physical solvability and guiding coin ribbons
      const patternLength = this.spawnPatternArchetype(
        patternChoice,
        currentZ,
        distance,
        pace,
        metrics.movingHazardChance
      );

      this.lastObstacleZ = currentZ + patternLength;
      currentZ += patternLength + baseSpacing;
    }
  }

  /**
   * Computes reaction buffer, minimum spacing, and hazard frequency based on total distance and pace.
   */
  private getDifficultyMetrics(
    distance: number,
    pace: PacePhase
  ): { reactionTime: number; minSpacing: number; movingHazardChance: number } {
    let baseReaction: number;
    let minSpacing: number;
    let movingHazardChance: number;

    if (distance < 300) {
      // Tier 1: 0-300m (Intro / Warm-up)
      baseReaction = 1.70;
      minSpacing = 28;
      movingHazardChance = 0.0;
    } else if (distance < 700) {
      // Tier 2: 300-700m (Escalation)
      baseReaction = 1.38;
      minSpacing = 20;
      movingHazardChance = 0.35;
    } else if (distance < 1200) {
      // Tier 3: 700-1200m (Hard / Intense)
      baseReaction = 1.12;
      minSpacing = 16;
      movingHazardChance = 0.60;
    } else if (distance < 2000) {
      // Tier 4: 1200-2000m (Very Hard / High Stakes)
      baseReaction = 0.92;
      minSpacing = 13;
      movingHazardChance = 0.78;
    } else {
      // Tier 5: 2000m+ (EXTREME / Overdrive - Infinite scaling)
      const extra = Math.min(0.20, (distance - 2000) / 4000);
      baseReaction = Math.max(0.72, 0.80 - extra);
      minSpacing = Math.max(9, 11 - extra * 8);
      movingHazardChance = Math.min(0.95, 0.85 + extra);
    }

    // Pace modifiers on top of distance tier
    if (pace === 'BREATHER') {
      baseReaction += 0.25;
      minSpacing += 8;
      movingHazardChance = 0.0;
    } else if (pace === 'CHAOS') {
      baseReaction -= 0.08;
      movingHazardChance = Math.min(0.95, movingHazardChance + 0.15);
    } else if (pace === 'RUSH') {
      baseReaction -= 0.05;
      movingHazardChance = Math.min(0.90, movingHazardChance + 0.10);
    }

    return {
      reactionTime: Math.max(0.70, baseReaction),
      minSpacing,
      movingHazardChance,
    };
  }

  /**
   * Selects structured pattern archetypes based on distance tier and current pace.
   */
  private selectPatternArchetype(
    distance: number,
    pace: PacePhase
  ): string {
    if (pace === 'BREATHER') {
      return Math.random() < 0.75 ? 'BREATHER_RIVER' : 'SPLIT_CHOICE';
    }

    // TIER 1: 0 - 300m (Warm-up & mechanics introduction)
    if (distance < 300) {
      const roll = Math.random();
      if (roll < 0.30) return 'SINGLE_HAZARD';
      if (roll < 0.55) return 'SIMPLE_HURDLE';
      if (roll < 0.80) return 'GENTLE_SLALOM';
      return 'SIMPLE_SLIDE';
    }

    // TIER 2: 300 - 700m (Escalation)
    if (distance < 700) {
      const roll = Math.random();
      if (roll < 0.25) return 'SLALOM_WEAVE';
      if (roll < 0.45) return 'PINCH_GATE';
      if (roll < 0.65) return 'HURDLE_SERIES';
      if (roll < 0.80) return 'SLIDE_TUNNEL';
      if (roll < 0.90) return 'SPLIT_CHOICE';
      return 'SLOW_CAR_APPROACH';
    }

    // TIER 3: 700 - 1200m (Hard / Intense)
    if (distance < 1200) {
      const roll = Math.random();
      if (roll < 0.20) return 'RAPID_SLALOM';
      if (roll < 0.40) return 'JUMP_TO_SLIDE';
      if (roll < 0.60) return 'FAST_TRAIN_PINCH';
      if (roll < 0.75) return 'MULTI_PINCH_ZIGZAG';
      if (roll < 0.90) return 'TRIPLE_ACTION';
      return 'LASER_CORRIDOR';
    }

    // TIER 4: 1200 - 2000m (Very Hard / High Velocity)
    if (distance < 2000) {
      const roll = Math.random();
      if (roll < 0.25) return 'GAUNTLET_RUN';
      if (roll < 0.45) return 'DOUBLE_MOVING_PINCH';
      if (roll < 0.65) return 'EXPRESS_INTERCEPT';
      if (roll < 0.85) return 'ZIGZAG_GAUNTLET';
      return 'SPLIT_SECOND_DECISION';
    }

    // TIER 5: 2000m+ (EXTREME / Overdrive - Infinite Scaling)
    const roll = Math.random();
    if (roll < 0.30) return 'OVERDRIVE_CHALLENGE';
    if (roll < 0.55) return 'DUAL_MOVING_SWAP';
    if (roll < 0.75) return 'HIGH_SPEED_PINCH_CHAIN';
    if (roll < 0.90) return 'CHAOS_MATRIX';
    return 'GAUNTLET_RUN';
  }

  /**
   * Spawns structured, rhythmic multi-hazard patterns with guaranteed safe paths and rich coin ribbons.
   * Returns the total Z length consumed by this pattern.
   */
  private spawnPatternArchetype(
    pattern: string,
    startZ: number,
    distance: number,
    pace: PacePhase,
    movingChance: number
  ): number {
    switch (pattern) {
      // ----------------- TIER 1 PATTERNS (0 - 300m) -----------------
      case 'SINGLE_HAZARD': {
        // 1 single obstacle in 1 lane. 2 whole lanes completely open with generous coin lines.
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const isHurdle = Math.random() < 0.5;
        this.spawnObstacle(isHurdle ? 'BARRIER_LOW' : 'ROAD_BLOCK', lane, startZ, false);

        // Populate open lanes with clear coin paths
        for (const safeLane of [-1, 0, 1]) {
          if (safeLane !== lane) {
            const lx = safeLane === -1 ? LANE_X.LEFT : safeLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
            for (let c = 0; c < 4; c++) {
              this.spawnCoin('COIN', lx, safeLane, 0.9, startZ - 2 + c * 2.2);
            }
          }
        }
        return 6;
      }

      case 'SIMPLE_HURDLE': {
        // 1 low barrier with a clear high arching coin curve encouraging a jump
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const lx = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        this.spawnObstacle('BARRIER_LOW', lane, startZ, false);

        // Jump arc coins
        for (let s = -2; s <= 2; s++) {
          const norm = s / 2;
          const coinY = 1.0 + (1 - norm * norm) * 1.8;
          this.spawnCoin('COIN', lx, lane, coinY, startZ + s * 2.0);
        }

        // Side lane has a power-up crate or coin row
        const sideLane: number = lane === 0 ? 1 : 0;
        const sideX = sideLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        if (Math.random() < 0.3) {
          this.spawnPowerUp(this.getRandomPowerUpType(), sideX, sideLane, startZ);
        } else {
          for (let c = 0; c < 3; c++) {
            this.spawnCoin('COIN', sideX, sideLane, 0.9, startZ - 2 + c * 2);
          }
        }
        return 6;
      }

      case 'SIMPLE_SLIDE': {
        // 1 high overhead barrier in 1 lane with slide coins below
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const lx = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        this.spawnObstacle('BARRIER_HIGH', lane, startZ, false);

        // Low slide coins underneath
        for (let c = -2; c <= 2; c++) {
          this.spawnCoin('COIN', lx, lane, 0.45, startZ + c * 1.8);
        }

        // Open lanes have normal coins
        const otherLane = lane === 0 ? -1 : 0;
        const ox = otherLane === -1 ? LANE_X.LEFT : otherLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        for (let c = 0; c < 3; c++) {
          this.spawnCoin('COIN', ox, otherLane, 0.9, startZ - 2 + c * 2);
        }
        return 6;
      }

      case 'GENTLE_SLALOM': {
        // 2 gentle obstacles spaced far apart (18m apart)
        const lane1 = Math.random() < 0.5 ? -1 : 1;
        const lane2 = -lane1;
        const stepDist = 18;

        this.spawnObstacle('BARRIER_LOW', lane1, startZ, false);
        this.spawnObstacle('ROAD_BLOCK', lane2, startZ + stepDist, false);

        // Center lane has an unbroken guiding coin ribbon
        for (let c = 0; c < 8; c++) {
          this.spawnCoin('COIN', LANE_X.CENTER, 0, 0.9, startZ + c * 2.5);
        }
        return stepDist + 4;
      }

      // ----------------- TIER 2 PATTERNS (300 - 700m) -----------------
      case 'SLALOM_WEAVE': {
        // 3 alternating obstacles (Left -> Right -> Left) with guiding coin trail
        const steps = 3;
        const stepDist = 13;
        const initialLane = Math.random() < 0.5 ? -1 : 1;

        for (let i = 0; i < steps; i++) {
          const obsLane = i % 2 === 0 ? initialLane : -initialLane;
          const z = startZ + i * stepDist;
          const isLow = Math.random() < 0.5;
          this.spawnObstacle(isLow ? 'BARRIER_LOW' : 'ROAD_BLOCK', obsLane, z, false);

          const safeLane = -obsLane;
          const safeX = safeLane === -1 ? LANE_X.LEFT : safeLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
          for (let c = 0; c < 3; c++) {
            this.spawnCoin('COIN', safeX, safeLane, 0.9, z - 3 + c * 2);
          }
        }
        return (steps - 1) * stepDist + 2;
      }

      case 'HURDLE_SERIES': {
        // 2 jumpable hurdles in succession with coin jump arcs
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const laneX = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        const dist = 15;

        for (let i = 0; i < 2; i++) {
          const z = startZ + i * dist;
          this.spawnObstacle('BARRIER_LOW', lane, z, false);

          for (let s = -2; s <= 2; s++) {
            const norm = s / 2;
            const coinY = 1.0 + (1 - norm * norm) * 1.8;
            this.spawnCoin('COIN', laneX, lane, coinY, z + s * 1.8);
          }
        }

        const otherLane: number = lane === 0 ? 1 : 0;
        const otherX = otherLane === -1 ? LANE_X.LEFT : otherLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        if (Math.random() < 0.25) {
          this.spawnPowerUp(this.getRandomPowerUpType(), otherX, otherLane, startZ + 7);
        } else {
          this.spawnCoin('SUPER_COIN', otherX, otherLane, 1.2, startZ + 7);
        }
        return dist + 4;
      }

      case 'SLIDE_TUNNEL': {
        // High barrier spanning 1 or 2 lanes, with slide coins underneath
        const blockedLanes = Math.random() < 0.5 ? [0] : [-1, 0];
        const isLaser = pace === 'RUSH' || pace === 'CHAOS' || distance > 600;
        const obsType: ObstacleType = isLaser ? 'LASER_GATE' : 'BARRIER_HIGH';

        for (const lane of blockedLanes) {
          const laneX = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
          this.spawnObstacle(obsType, lane, startZ, false);

          for (let c = -2; c <= 2; c++) {
            this.spawnCoin('COIN', laneX, lane, 0.45, startZ + c * 1.8);
          }
        }

        const openLane = blockedLanes.includes(1) ? (blockedLanes.includes(-1) ? 0 : -1) : 1;
        const openX = openLane === -1 ? LANE_X.LEFT : openLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        for (let c = 0; c < 3; c++) {
          this.spawnCoin('COIN', openX, openLane, 0.9, startZ - 2 + c * 2);
        }
        return 6;
      }

      case 'SPLIT_CHOICE': {
        // Risk / Reward Choice: Center lane has Low Barrier + Super Coin above it.
        this.spawnObstacle('BARRIER_LOW', 0, startZ, false);
        this.spawnCoin('SUPER_COIN', LANE_X.CENTER, 0, 3.2, startZ);

        for (const lane of [-1, 1]) {
          const lx = lane === -1 ? LANE_X.LEFT : LANE_X.RIGHT;
          for (let c = 0; c < 3; c++) {
            this.spawnCoin('COIN', lx, lane, 0.9, startZ - 2 + c * 2);
          }
        }
        return 4;
      }

      case 'PINCH_GATE': {
        // 2 blocked lanes with 1 guaranteed open lane with bright coin beacons
        const openLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const openX = openLane === -1 ? LANE_X.LEFT : openLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;

        for (const lane of [-1, 0, 1]) {
          if (lane !== openLane) {
            const isMoving = Math.random() < movingChance;
            const obsType: ObstacleType = isMoving
              ? 'CAR_MOVING'
              : Math.random() < 0.5
              ? 'ROAD_BLOCK'
              : 'TRAIN_STATIC';
            this.spawnObstacle(obsType, lane, startZ, isMoving);
          }
        }

        if (Math.random() < 0.3) {
          this.spawnPowerUp(this.getRandomPowerUpType(), openX, openLane, startZ);
        } else {
          for (let c = 0; c < 4; c++) {
            this.spawnCoin('COIN', openX, openLane, 0.9, startZ - 3 + c * 2);
          }
        }
        return 6;
      }

      case 'SLOW_CAR_APPROACH': {
        // 1 oncoming hover car in 1 lane moving at moderate speed, other 2 lanes clear
        const carLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        this.spawnObstacle('CAR_MOVING', carLane, startZ, true);

        for (const lane of [-1, 0, 1]) {
          if (lane !== carLane) {
            const lx = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
            for (let c = 0; c < 3; c++) {
              this.spawnCoin('COIN', lx, lane, 0.9, startZ - 2 + c * 2);
            }
          }
        }
        return 8;
      }

      // ----------------- TIER 3 PATTERNS (700 - 1200m) -----------------
      case 'RAPID_SLALOM': {
        // 3-4 obstacles staggered closely (10m apart) requiring continuous rhythmic lane switching
        const steps = 4;
        const stepDist = 10;
        const lanesSeq = [-1, 0, 1, 0];

        for (let i = 0; i < steps; i++) {
          const obsLane = lanesSeq[i];
          const z = startZ + i * stepDist;
          const isHurdle = i % 2 === 0;
          this.spawnObstacle(isHurdle ? 'BARRIER_LOW' : 'ROAD_BLOCK', obsLane, z, false);

          const safeLane: number = obsLane === 0 ? 1 : 0;
          const safeX = safeLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
          this.spawnCoin('COIN', safeX, safeLane, 0.9, z);
        }
        return (steps - 1) * stepDist + 4;
      }

      case 'JUMP_TO_SLIDE': {
        // Low hurdle in Lane A, followed 9m later by a High Laser Gate in Lane B
        const laneA: number = Math.random() < 0.5 ? -1 : 0;
        const laneB: number = laneA === -1 ? 0 : 1;
        const distBetween = 9;

        // Jump hurdle
        this.spawnObstacle('BARRIER_LOW', laneA, startZ, false);
        const ax = laneA === -1 ? LANE_X.LEFT : laneA === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        for (let s = -2; s <= 2; s++) {
          const norm = s / 2;
          this.spawnCoin('COIN', ax, laneA, 1.0 + (1 - norm * norm) * 1.8, startZ + s * 1.8);
        }

        // Slide laser
        this.spawnObstacle('LASER_GATE', laneB, startZ + distBetween, false);
        const bx = laneB === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
        for (let c = -2; c <= 2; c++) {
          this.spawnCoin('COIN', bx, laneB, 0.45, startZ + distBetween + c * 1.8);
        }

        return distBetween + 4;
      }

      case 'FAST_TRAIN_PINCH': {
        // 1 oncoming train in Lane A + 1 static road block in Lane B -> 1 narrow escape lane
        const openLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const openX = openLane === -1 ? LANE_X.LEFT : openLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;

        let trainSpawned = false;
        for (const lane of [-1, 0, 1]) {
          if (lane !== openLane) {
            if (!trainSpawned) {
              this.spawnObstacle('TRAIN_MOVING', lane, startZ, true);
              trainSpawned = true;
            } else {
              this.spawnObstacle('ROAD_BLOCK', lane, startZ, false);
            }
          }
        }

        for (let c = 0; c < 5; c++) {
          this.spawnCoin('COIN', openX, openLane, 0.9, startZ - 3 + c * 2);
        }
        return 8;
      }

      case 'MULTI_PINCH_ZIGZAG': {
        // Lanes -1 & 0 blocked at startZ -> 10m later, Lanes 0 & 1 blocked!
        // Step 1: Open is Right (Lane 1)
        this.spawnObstacle('ROAD_BLOCK', -1, startZ, false);
        this.spawnObstacle('BARRIER_LOW', 0, startZ, false);
        this.spawnCoin('COIN', LANE_X.RIGHT, 1, 0.9, startZ);

        // Step 2: 10m down, open is Left (Lane -1)
        const stepDist = 10;
        this.spawnObstacle('ROAD_BLOCK', 1, startZ + stepDist, false);
        this.spawnObstacle('BARRIER_LOW', 0, startZ + stepDist, false);
        this.spawnCoin('COIN', LANE_X.LEFT, -1, 0.9, startZ + stepDist);

        return stepDist + 4;
      }

      case 'TRIPLE_ACTION': {
        // All 3 lanes have obstacles at same Z, but 100% solvable via jump or slide
        for (const lane of [-1, 0, 1]) {
          const isJump = Math.random() < 0.6;
          const obsType: ObstacleType = isJump ? 'BARRIER_LOW' : 'LASER_GATE';
          this.spawnObstacle(obsType, lane, startZ, false);

          const lx = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
          if (isJump) {
            this.spawnCoin('COIN', lx, lane, 2.5, startZ);
          } else {
            this.spawnCoin('COIN', lx, lane, 0.45, startZ);
          }
        }
        return 4;
      }

      case 'LASER_CORRIDOR': {
        // 2 high laser gates in succession requiring slide timing, side lane has a low hurdle with Super Coin
        const laserLane = Math.random() < 0.5 ? -1 : 0;
        const sideLane = laserLane === -1 ? 1 : -1;
        const sideX = sideLane === -1 ? LANE_X.LEFT : LANE_X.RIGHT;

        this.spawnObstacle('LASER_GATE', laserLane, startZ, false);
        this.spawnObstacle('LASER_GATE', laserLane, startZ + 8, false);

        this.spawnObstacle('BARRIER_LOW', sideLane, startZ + 4, false);
        this.spawnCoin('SUPER_COIN', sideX, sideLane, 3.2, startZ + 4);

        return 12;
      }

      // ----------------- TIER 4 PATTERNS (1200 - 2000m) -----------------
      case 'GAUNTLET_RUN': {
        // High Laser (slide) -> Low Hurdle (jump) in alternating lanes with minimal recovery gap
        const lane1 = Math.random() < 0.5 ? -1 : 0;
        const lane2 = lane1 === -1 ? 1 : -1;
        const lane3 = 0;
        const stepDist = 8;

        this.spawnObstacle('LASER_GATE', lane1, startZ, false);
        this.spawnObstacle('BARRIER_LOW', lane2, startZ + stepDist, false);
        this.spawnObstacle('CAR_MOVING', lane3, startZ + stepDist * 2, true);

        // Guiding coin stream
        this.spawnCoin('COIN', lane1 === -1 ? LANE_X.LEFT : LANE_X.CENTER, lane1, 0.45, startZ);
        this.spawnCoin('COIN', lane2 === -1 ? LANE_X.LEFT : LANE_X.RIGHT, lane2, 2.5, startZ + stepDist);

        return stepDist * 2 + 4;
      }

      case 'DOUBLE_MOVING_PINCH': {
        // 1 oncoming train in Lane -1, 1 speeding hovercar in Lane 1, Center lane is clear with a low hurdle 8m down
        this.spawnObstacle('TRAIN_MOVING', -1, startZ, true);
        this.spawnObstacle('CAR_MOVING', 1, startZ, true);

        // Center lane has a jump hurdle + high Super Coin
        this.spawnObstacle('BARRIER_LOW', 0, startZ + 8, false);
        this.spawnCoin('SUPER_COIN', LANE_X.CENTER, 0, 3.2, startZ + 8);

        return 12;
      }

      case 'EXPRESS_INTERCEPT': {
        // 2 moving vehicles arriving in staggered lanes
        this.spawnObstacle('TRAIN_MOVING', 0, startZ, true);
        this.spawnObstacle('CAR_MOVING', 1, startZ + 10, true);

        // Left lane is the safe haven with coin ribbon
        for (let c = 0; c < 6; c++) {
          this.spawnCoin('COIN', LANE_X.LEFT, -1, 0.9, startZ + c * 2.2);
        }
        return 14;
      }

      case 'ZIGZAG_GAUNTLET': {
        // 4 rapid staggered barricades and oncoming vehicles (7-8m apart)
        const stepDist = 8;
        const lanes = [-1, 1, 0, -1];

        for (let i = 0; i < 4; i++) {
          const obsLane = lanes[i];
          const z = startZ + i * stepDist;
          if (i === 2) {
            this.spawnObstacle('CAR_MOVING', obsLane, z, true);
          } else if (i % 2 === 0) {
            this.spawnObstacle('BARRIER_LOW', obsLane, z, false);
          } else {
            this.spawnObstacle('ROAD_BLOCK', obsLane, z, false);
          }
        }
        return stepDist * 3 + 4;
      }

      case 'SPLIT_SECOND_DECISION': {
        // 2 lanes blocked with tall subway trains, 1 lane has a laser gate requiring instant slide
        const slideLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const slideX = slideLane === -1 ? LANE_X.LEFT : slideLane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;

        for (const lane of [-1, 0, 1]) {
          if (lane === slideLane) {
            this.spawnObstacle('LASER_GATE', lane, startZ, false);
            for (let c = -2; c <= 2; c++) {
              this.spawnCoin('COIN', slideX, slideLane, 0.45, startZ + c * 1.8);
            }
          } else {
            this.spawnObstacle('TRAIN_STATIC', lane, startZ, false);
          }
        }
        return 8;
      }

      // ----------------- TIER 5 PATTERNS (2000m+ EXTREME / OVERDRIVE) -----------------
      case 'OVERDRIVE_CHALLENGE': {
        // 5-step rapid continuous sequence: Slide -> Jump -> Oncoming Train dodge -> Slide -> Quick dodge
        const stepDist = 7.5;
        this.spawnObstacle('LASER_GATE', 0, startZ, false);
        this.spawnObstacle('BARRIER_LOW', -1, startZ + stepDist, false);
        this.spawnObstacle('TRAIN_MOVING', 1, startZ + stepDist * 2, true);
        this.spawnObstacle('LASER_GATE', -1, startZ + stepDist * 3, false);
        this.spawnObstacle('BARRIER_LOW', 0, startZ + stepDist * 4, false);

        // Guiding coin markers
        this.spawnCoin('COIN', LANE_X.CENTER, 0, 0.45, startZ);
        this.spawnCoin('SUPER_COIN', LANE_X.LEFT, -1, 3.0, startZ + stepDist);

        return stepDist * 4 + 4;
      }

      case 'DUAL_MOVING_SWAP': {
        // Left and Right lanes have oncoming trains; Center lane has a low hurdle with high jump coin arc
        this.spawnObstacle('TRAIN_MOVING', -1, startZ, true);
        this.spawnObstacle('TRAIN_MOVING', 1, startZ + 4, true);

        this.spawnObstacle('BARRIER_LOW', 0, startZ + 6, false);
        for (let s = -2; s <= 2; s++) {
          const norm = s / 2;
          this.spawnCoin('COIN', LANE_X.CENTER, 0, 1.0 + (1 - norm * norm) * 2.0, startZ + 6 + s * 1.8);
        }
        return 12;
      }

      case 'HIGH_SPEED_PINCH_CHAIN': {
        // Rapid sequence of 2-lane pinches with only 7m between them
        const stepDist = 7.5;
        // Step 1: Open Left
        this.spawnObstacle('ROAD_BLOCK', 0, startZ, false);
        this.spawnObstacle('ROAD_BLOCK', 1, startZ, false);
        this.spawnCoin('COIN', LANE_X.LEFT, -1, 0.9, startZ);

        // Step 2: Open Right
        this.spawnObstacle('ROAD_BLOCK', -1, startZ + stepDist, false);
        this.spawnObstacle('ROAD_BLOCK', 0, startZ + stepDist, false);
        this.spawnCoin('COIN', LANE_X.RIGHT, 1, 0.9, startZ + stepDist);

        // Step 3: Open Center
        this.spawnObstacle('ROAD_BLOCK', -1, startZ + stepDist * 2, false);
        this.spawnObstacle('ROAD_BLOCK', 1, startZ + stepDist * 2, false);
        this.spawnCoin('SUPER_COIN', LANE_X.CENTER, 0, 1.2, startZ + stepDist * 2);

        return stepDist * 2 + 4;
      }

      case 'CHAOS_MATRIX': {
        // Oncoming express train + overhead laser gate + low hurdles in non-stop sequence
        this.spawnObstacle('TRAIN_MOVING', 0, startZ, true);
        this.spawnObstacle('LASER_GATE', -1, startZ + 6, false);
        this.spawnObstacle('BARRIER_LOW', 1, startZ + 6, false);
        this.spawnObstacle('CAR_MOVING', -1, startZ + 13, true);

        // High Super Coin in right lane
        this.spawnCoin('SUPER_COIN', LANE_X.RIGHT, 1, 3.2, startZ + 6);
        return 16;
      }

      case 'BREATHER_RIVER':
      default: {
        // Lush ribbons of coins across all 3 lanes with a guaranteed power-up
        for (const lane of [-1, 0, 1]) {
          const lx = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
          for (let c = 0; c < 5; c++) {
            this.spawnCoin('COIN', lx, lane, 0.9, startZ + c * 2.2);
          }
        }

        // Guaranteed power-up crate in center lane
        this.spawnPowerUp(this.getRandomPowerUpType(), LANE_X.CENTER, 0, startZ + 6);
        return 12;
      }
    }
  }

  private getRandomPowerUpType(): PowerUpType {
    const types: PowerUpType[] = ['MAGNET', 'SHIELD', 'SCORE_BOOST', 'SPEED_BOOST', 'TIME_SLOW'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // ================= POOLED OBSTACLE SPAWNER =================
  private spawnObstacle(type: ObstacleType, lane: number, z: number, isMoving: boolean) {
    const laneX = lane === -1 ? LANE_X.LEFT : lane === 0 ? LANE_X.CENTER : LANE_X.RIGHT;
    let width = 2.0;
    let height = 1.0;
    let depth = 0.8;
    let baseY = 0;
    let moveSpeed = 0;
    let isJumpable = false;
    let isSlideable = false;

    let group: THREE.Group | null = null;
    const pool = this.obstaclePools.get(type);
    if (pool && pool.length > 0) {
      group = pool.pop()!;
      group.position.set(laneX, 0, z);
      group.visible = true;
    } else {
      group = this.createObstacleGroup(type);
      group.position.set(laneX, 0, z);
      this.scene.add(group);
    }

    // Dynamic distance speed scaling for moving obstacles
    const distSpeedBonus = Math.min(12, (z / 500) * 2.2);

    switch (type) {
      case 'BARRIER_LOW':
        // JUMPABLE LOW HURDLE
        width = 1.9;
        height = 0.65;
        depth = 0.35;
        baseY = 0;
        isJumpable = true;
        break;

      case 'BARRIER_HIGH':
        // SLIDEABLE OVERHEAD BARRIER
        width = 1.9;
        height = 1.55;
        depth = 0.35;
        baseY = 0.85;
        isSlideable = true;
        break;

      case 'ROAD_BLOCK':
        // SOLID CONCRETE BARRICADE (Requires lane change)
        width = 2.0;
        height = 1.9;
        depth = 0.8;
        baseY = 0;
        break;

      case 'TRAIN_STATIC':
        // PARKED SUBWAY TRAIN
        width = 2.1;
        height = 2.6;
        depth = 5.5;
        baseY = 0;
        moveSpeed = 0;
        break;

      case 'TRAIN_MOVING':
        // INCOMING RED EXPRESS TRAIN (Speed scales with distance)
        width = 2.1;
        height = 2.6;
        depth = 6.0;
        baseY = 0;
        moveSpeed = 10 + distSpeedBonus;
        break;

      case 'CAR_MOVING':
        // SPEEDING HOVER CAR (Speed scales with distance)
        width = 1.9;
        height = 1.3;
        depth = 3.5;
        baseY = 0;
        moveSpeed = 12 + distSpeedBonus * 1.15;
        break;

      case 'LASER_GATE':
        // PULSING OVERHEAD LASER (Slideable)
        width = 1.9;
        height = 1.40;
        depth = 0.3;
        baseY = 0.80;
        isSlideable = true;
        break;
    }

    this.activeObstacles.push({
      id: `obs_${this.obstacleIdCounter++}`,
      mesh: group,
      type,
      lane,
      z,
      width,
      height,
      depth,
      baseY,
      isMoving,
      moveSpeed,
      cleared: false,
      nearMissAwarded: false,
      isJumpable,
      isSlideable,
    });
  }

  private createObstacleGroup(type: ObstacleType): THREE.Group {
    const group = new THREE.Group();

    switch (type) {
      case 'BARRIER_LOW': {
        const barMesh = new THREE.Mesh(this.barLowGeo, this.obstacleMatYellow);
        barMesh.position.y = 0.65 / 2;
        barMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(barMesh);

        const stripe = new THREE.Mesh(this.barStripeGeo, this.obstacleMatDark);
        stripe.position.y = 0.65 / 2;
        group.add(stripe);
        break;
      }
      case 'BARRIER_HIGH': {
        const topMesh = new THREE.Mesh(this.barHighTopGeo, this.obstacleMatRed);
        topMesh.position.y = 0.85 + 0.55 / 2;
        topMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(topMesh);

        const leftPole = new THREE.Mesh(this.barPoleGeo, this.obstacleMatPole);
        leftPole.position.set(-0.95, 2.3 / 2, 0);
        const rightPole = new THREE.Mesh(this.barPoleGeo, this.obstacleMatPole);
        rightPole.position.set(0.95, 2.3 / 2, 0);
        group.add(leftPole);
        group.add(rightPole);

        const laser = new THREE.Mesh(this.barLaserGlowGeo, this.obstacleMatLaser);
        laser.position.y = 0.88;
        group.add(laser);
        break;
      }
      case 'ROAD_BLOCK': {
        const blockMesh = new THREE.Mesh(this.roadBlockGeo, this.obstacleMatBlock);
        blockMesh.position.y = 1.9 / 2;
        blockMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(blockMesh);

        const border = new THREE.Mesh(this.roadBlockBorderGeo, this.obstacleMatCyanGlow);
        border.position.y = 1.9;
        group.add(border);
        break;
      }
      case 'TRAIN_STATIC': {
        const trainMesh = new THREE.Mesh(this.trainBodyGeo, this.obstacleMatTrainStatic);
        trainMesh.position.y = 2.6 / 2;
        trainMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(trainMesh);

        const hl1 = new THREE.Mesh(this.trainHeadlightGeo, this.obstacleMatHeadlight);
        hl1.position.set(-0.7, 0.9, -2.8);
        const hl2 = new THREE.Mesh(this.trainHeadlightGeo, this.obstacleMatHeadlight);
        hl2.position.set(0.7, 0.9, -2.8);
        group.add(hl1);
        group.add(hl2);
        break;
      }
      case 'TRAIN_MOVING': {
        const trainMesh = new THREE.Mesh(this.trainMovingBodyGeo, this.obstacleMatTrainMoving);
        trainMesh.position.y = 2.6 / 2;
        trainMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(trainMesh);

        const hl1 = new THREE.Mesh(this.trainHeadlightGeo, this.obstacleMatHeadlight);
        hl1.position.set(-0.7, 0.9, -3.05);
        const hl2 = new THREE.Mesh(this.trainHeadlightGeo, this.obstacleMatHeadlight);
        hl2.position.set(0.7, 0.9, -3.05);
        group.add(hl1);
        group.add(hl2);
        break;
      }
      case 'CAR_MOVING': {
        const carMesh = new THREE.Mesh(this.carBodyGeo, this.obstacleMatCar);
        carMesh.position.y = 1.3 / 2;
        carMesh.castShadow = this.graphicsQuality !== 'low';
        group.add(carMesh);

        const carGlow = new THREE.Mesh(this.carGlowGeo, this.obstacleMatCyanGlow);
        carGlow.position.set(0, 0.7, -1.75);
        group.add(carGlow);
        break;
      }
      case 'LASER_GATE': {
        const frame = new THREE.Mesh(this.laserFrameGeo, this.obstacleMatLaserFrame);
        frame.position.y = 2.0;
        group.add(frame);

        const beam = new THREE.Mesh(this.laserBeamGeo, this.obstacleMatPurpleGlow);
        beam.position.y = 1.0;
        group.add(beam);
        break;
      }
    }

    return group;
  }

  // ================= POOLED COLLECTIBLES SPAWNER =================
  private spawnCoin(type: 'COIN' | 'SUPER_COIN', x: number, lane: number, y: number, z: number) {
    const isSuper = type === 'SUPER_COIN';
    let group: THREE.Group | null = null;

    if (isSuper) {
      if (this.superCoinPool.length > 0) {
        group = this.superCoinPool.pop()!;
        group.position.set(x, y, z);
        group.visible = true;
      } else {
        group = new THREE.Group();
        const mesh = new THREE.Mesh(this.superCoinGeo, this.superCoinMat);
        group.add(mesh);
        group.position.set(x, y, z);
        this.scene.add(group);
      }
    } else {
      if (this.coinPool.length > 0) {
        group = this.coinPool.pop()!;
        group.position.set(x, y, z);
        group.visible = true;
      } else {
        group = new THREE.Group();
        const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
        group.add(mesh);
        group.position.set(x, y, z);
        this.scene.add(group);
      }
    }

    this.activeCollectibles.push({
      id: `col_${this.collectibleIdCounter++}`,
      mesh: group,
      type,
      lane,
      x,
      y,
      z,
      collected: false,
      isMagnetized: false,
    });
  }

  private spawnPowerUp(powerUpType: PowerUpType, x: number, lane: number, z: number) {
    let group: THREE.Group | null = null;
    const pool = this.powerUpPools.get(powerUpType);

    if (pool && pool.length > 0) {
      group = pool.pop()!;
      group.position.set(x, 1.2, z);
      group.visible = true;
    } else {
      group = new THREE.Group();
      const box = new THREE.Mesh(this.powerUpBoxGeo, this.powerUpMaterials[powerUpType]);
      box.rotation.y = Math.PI / 4;
      box.rotation.x = Math.PI / 6;
      group.add(box);

      const ringMat = new THREE.MeshBasicMaterial({ color: this.powerUpMaterials[powerUpType].color });
      const ring = new THREE.Mesh(this.powerUpRingGeo, ringMat);
      group.add(ring);

      group.position.set(x, 1.2, z);
      this.scene.add(group);
    }

    this.activeCollectibles.push({
      id: `col_${this.collectibleIdCounter++}`,
      mesh: group,
      type: 'POWERUP',
      powerUpType,
      lane,
      x,
      y: 1.2,
      z,
      collected: false,
      isMagnetized: false,
    });
  }

  public destroy() {
    this.clear();
    for (const chunk of this.chunkPool) {
      this.scene.remove(chunk.group);
    }
    this.chunkPool = [];

    for (const coin of this.coinPool) {
      this.scene.remove(coin);
    }
    this.coinPool = [];

    for (const sc of this.superCoinPool) {
      this.scene.remove(sc);
    }
    this.superCoinPool = [];

    this.powerUpPools.forEach(pool => {
      pool.forEach(p => this.scene.remove(p));
      pool.length = 0;
    });

    this.obstaclePools.forEach(pool => {
      pool.forEach(obs => this.scene.remove(obs));
      pool.length = 0;
    });
  }
}
