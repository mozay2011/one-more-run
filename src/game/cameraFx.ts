import * as THREE from 'three';
import { PacePhase } from './types';

export class CameraFxManager {
  public camera: THREE.PerspectiveCamera;
  private targetFOV: number = 62;
  private baseFOV: number = 62;
  private currentShake: number = 0;
  private shakeDecay: number = 5.0;
  private fovKick: number = 0;

  // Smooth position tracker
  private currentCamPos = new THREE.Vector3(0, 3.2, -5.8);
  private currentLookTarget = new THREE.Vector3(0, 1.4, 6.0);

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
  }

  public update(
    delta: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    pace: PacePhase,
    speed: number,
    isSpeedBoost: boolean,
    screenShakeEnabled: boolean
  ) {
    // 1. Determine Dynamic FOV based on speed, pace, and powerup kicks
    if (isSpeedBoost) {
      this.baseFOV = 84;
    } else if (pace === 'CHAOS') {
      this.baseFOV = 76;
    } else if (pace === 'RUSH') {
      this.baseFOV = 72;
    } else if (pace === 'BUILD') {
      this.baseFOV = 66;
    } else if (pace === 'BREATHER') {
      this.baseFOV = 60;
    } else {
      this.baseFOV = 62;
    }

    if (this.fovKick > 0.01) {
      this.fovKick = Math.max(0, this.fovKick - delta * 24.0);
    }

    this.targetFOV = this.baseFOV + this.fovKick;

    if (Math.abs(this.camera.fov - this.targetFOV) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFOV, delta * 4.5);
      this.camera.updateProjectionMatrix();
    }

    // 2. Camera target position (smoothly trailing behind player)
    const desiredX = playerX * 0.65;
    const desiredY = Math.max(2.8, playerY + 3.2);
    const desiredZ = playerZ - (isSpeedBoost ? 6.5 : 5.8);

    this.currentCamPos.x = THREE.MathUtils.lerp(this.currentCamPos.x, desiredX, delta * 8.0);
    this.currentCamPos.y = THREE.MathUtils.lerp(this.currentCamPos.y, desiredY, delta * 6.0);
    this.currentCamPos.z = desiredZ;

    // Apply Screen Shake if active
    if (this.currentShake > 0.001 && screenShakeEnabled) {
      const shakeAmt = this.currentShake * 0.35;
      this.currentCamPos.x += (Math.random() - 0.5) * shakeAmt;
      this.currentCamPos.y += (Math.random() - 0.5) * shakeAmt;
      this.currentShake = Math.max(0, this.currentShake - this.shakeDecay * delta);
    }

    this.camera.position.copy(this.currentCamPos);

    // Look target
    const targetLookX = playerX * 0.5;
    const targetLookY = playerY + 1.4;
    const targetLookZ = playerZ + 12.0;

    this.currentLookTarget.x = THREE.MathUtils.lerp(this.currentLookTarget.x, targetLookX, delta * 10.0);
    this.currentLookTarget.y = THREE.MathUtils.lerp(this.currentLookTarget.y, targetLookY, delta * 8.0);
    this.currentLookTarget.z = targetLookZ;

    this.camera.lookAt(this.currentLookTarget);
  }

  public triggerShake(intensity: number = 0.5) {
    this.currentShake = Math.max(this.currentShake, intensity);
  }

  public triggerPowerUpKick(amount: number = 7.0) {
    this.fovKick = Math.max(this.fovKick, amount);
  }
}

// Particle System for 3D In-Game Effects with Full Object Pooling
interface PooledParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticleManager {
  public scene: THREE.Scene;
  private pool: PooledParticle[] = [];
  private maxActiveParticles: number = 60;

  private sharedSparkGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  private coinParticleMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private redSparkMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private powerUpMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

  constructor(scene: THREE.Scene, maxPoolSize: number = 80) {
    this.scene = scene;
    this.maxActiveParticles = maxPoolSize;

    // Pre-allocate particle pool
    for (let i = 0; i < maxPoolSize; i++) {
      const mesh = new THREE.Mesh(this.sharedSparkGeo, this.coinParticleMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.pool.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  public setQuality(quality: 'low' | 'medium' | 'high') {
    if (quality === 'low') this.maxActiveParticles = 20;
    else if (quality === 'medium') this.maxActiveParticles = 45;
    else this.maxActiveParticles = 75;
  }

  private getInactiveParticle(): PooledParticle | null {
    let activeCount = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) activeCount++;
    }
    if (activeCount >= this.maxActiveParticles) return null;

    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  public spawnCoinBurst(x: number, y: number, z: number, count: number = 6) {
    const actualCount = Math.min(count, this.maxActiveParticles > 30 ? 6 : 3);
    for (let i = 0; i < actualCount; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      p.mesh.material = this.coinParticleMat;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 3.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = 2.5 + Math.random() * 3.5;
      p.vz = Math.sin(angle) * speed;
      p.life = 0.35 + Math.random() * 0.2;
      p.maxLife = p.life;
      p.active = true;
    }
  }

  public spawnPowerUpBurst(x: number, y: number, z: number, colorHex: number = 0xc084fc) {
    this.powerUpMat.color.setHex(colorHex);
    const count = this.maxActiveParticles > 30 ? 10 : 5;
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      p.mesh.material = this.powerUpMat;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1.4);
      p.mesh.visible = true;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 4.0 + Math.random() * 2.0;
      p.vx = Math.cos(angle) * speed;
      p.vy = 2.0 + Math.random() * 3.0;
      p.vz = Math.sin(angle) * speed;
      p.life = 0.4 + Math.random() * 0.2;
      p.maxLife = p.life;
      p.active = true;
    }
  }

  public spawnSlideSparks(x: number, y: number, z: number) {
    const p = this.getInactiveParticle();
    if (!p) return;

    p.mesh.material = this.sparkMat;
    p.mesh.position.set(x + (Math.random() - 0.5) * 0.25, y + 0.1, z);
    p.mesh.scale.setScalar(1);
    p.mesh.visible = true;

    p.vx = (Math.random() - 0.5) * 2.5;
    p.vy = 1.2 + Math.random() * 1.5;
    p.vz = -3.5 - Math.random() * 3;
    p.life = 0.2;
    p.maxLife = 0.2;
    p.active = true;
  }

  public spawnImpactBurst(x: number, y: number, z: number) {
    const burstCount = this.maxActiveParticles > 30 ? 12 : 6;
    for (let i = 0; i < burstCount; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      p.mesh.material = this.redSparkMat;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1.2);
      p.mesh.visible = true;

      p.vx = (Math.random() - 0.5) * 8;
      p.vy = Math.random() * 6;
      p.vz = (Math.random() - 0.5) * 8;
      p.life = 0.45 + Math.random() * 0.25;
      p.maxLife = p.life;
      p.active = true;
    }
  }

  public update(delta: number) {
    const gravity = 14 * delta;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Physics & Scale Down
      p.vy -= gravity;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;

      const scale = p.life / p.maxLife;
      p.mesh.scale.setScalar(scale);
    }
  }

  public clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
      this.pool[i].mesh.visible = false;
    }
  }

  public destroy() {
    this.clear();
    for (let i = 0; i < this.pool.length; i++) {
      this.scene.remove(this.pool[i].mesh);
    }
    this.pool = [];
  }
}

