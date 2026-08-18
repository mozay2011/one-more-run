import * as THREE from 'three';
import { CharacterConfig } from './types';

export class PlayerCharacter {
  public group: THREE.Group;
  
  // Hierarchy parts
  private rootBone: THREE.Group;
  private hips: THREE.Group;
  private torso: THREE.Group;
  private head: THREE.Group;
  private hair: THREE.Mesh;
  private visor: THREE.Mesh;
  private backpack: THREE.Mesh;
  
  private leftUpperArm: THREE.Group;
  private leftLowerArm: THREE.Group;
  private rightUpperArm: THREE.Group;
  private rightLowerArm: THREE.Group;
  
  private leftUpperLeg: THREE.Group;
  private leftLowerLeg: THREE.Group;
  private rightUpperLeg: THREE.Group;
  private rightLowerLeg: THREE.Group;
  
  private leftShoeGlow: THREE.Mesh;
  private rightShoeGlow: THREE.Mesh;

  // Effects attached to player
  private shieldMesh: THREE.Mesh;
  private magnetAura: THREE.Group;
  private speedTrail: THREE.Group;

  // Materials to recolor
  private hoodieMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private shoesMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private glowMat: THREE.MeshBasicMaterial;
  private shieldMat: THREE.MeshBasicMaterial;

  // Animation states
  public currentAction: 'run' | 'jump' | 'slide' | 'fall' | 'idle' = 'run';
  public laneChangeRoll: number = 0;
  private animTimer: number = 0;

  constructor(character: CharacterConfig) {
    this.group = new THREE.Group();
    this.group.name = 'player';

    // Materials setup
    this.hoodieMat = new THREE.MeshStandardMaterial({
      color: character.colorScheme.hoodie,
      roughness: 0.6,
      metalness: 0.1,
    });
    this.pantsMat = new THREE.MeshStandardMaterial({
      color: character.colorScheme.pants,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.shoesMat = new THREE.MeshStandardMaterial({
      color: character.colorScheme.shoes,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.hairMat = new THREE.MeshStandardMaterial({
      color: character.colorScheme.hair,
      roughness: 0.5,
      metalness: 0.1,
    });
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0b5,
      roughness: 0.8,
      metalness: 0.05,
    });
    this.glowMat = new THREE.MeshBasicMaterial({
      color: character.colorScheme.primary,
    });
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });

    // Rigging Skeleton
    this.rootBone = new THREE.Group();
    this.group.add(this.rootBone);

    this.hips = new THREE.Group();
    this.hips.position.y = 0.9;
    this.rootBone.add(this.hips);

    // Torso (Hoodie / Jacket)
    this.torso = new THREE.Group();
    this.hips.add(this.torso);

    const torsoGeo = new THREE.BoxGeometry(0.52, 0.65, 0.32);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.hoodieMat);
    torsoMesh.position.y = 0.32;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torso.add(torsoMesh);

    // Hoodie collar / drawstrings
    const collarGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8);
    const collarMesh = new THREE.Mesh(collarGeo, this.hoodieMat);
    collarMesh.position.y = 0.66;
    this.torso.add(collarMesh);

    // Backpack / Sling Bag
    const packGeo = new THREE.BoxGeometry(0.38, 0.46, 0.18);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    this.backpack = new THREE.Mesh(packGeo, packMat);
    this.backpack.position.set(0, 0.32, -0.22);
    this.backpack.castShadow = true;
    this.torso.add(this.backpack);

    // Head
    this.head = new THREE.Group();
    this.head.position.y = 0.75;
    this.torso.add(this.head);

    const headGeo = new THREE.BoxGeometry(0.32, 0.34, 0.3);
    const headMesh = new THREE.Mesh(headGeo, this.skinMat);
    headMesh.position.y = 0.17;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Eyes / Visor
    const visorGeo = new THREE.BoxGeometry(0.28, 0.08, 0.06);
    this.visor = new THREE.Mesh(visorGeo, this.glowMat);
    this.visor.position.set(0, 0.18, 0.16);
    this.head.add(this.visor);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.36, 0.18, 0.34);
    this.hair = new THREE.Mesh(hairGeo, this.hairMat);
    this.hair.position.set(0, 0.34, -0.02);
    this.head.add(this.hair);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.34, 0.14);
    const forearmGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
    const handGeo = new THREE.BoxGeometry(0.1, 0.12, 0.1);

    // Left Arm
    this.leftUpperArm = new THREE.Group();
    this.leftUpperArm.position.set(-0.34, 0.58, 0);
    this.torso.add(this.leftUpperArm);

    const leftBicep = new THREE.Mesh(armGeo, this.hoodieMat);
    leftBicep.position.y = -0.17;
    leftBicep.castShadow = true;
    this.leftUpperArm.add(leftBicep);

    this.leftLowerArm = new THREE.Group();
    this.leftLowerArm.position.y = -0.34;
    this.leftUpperArm.add(this.leftLowerArm);

    const leftForearm = new THREE.Mesh(forearmGeo, this.skinMat);
    leftForearm.position.y = -0.16;
    leftForearm.castShadow = true;
    this.leftLowerArm.add(leftForearm);

    const leftHand = new THREE.Mesh(handGeo, this.pantsMat);
    leftHand.position.y = -0.34;
    this.leftLowerArm.add(leftHand);

    // Right Arm
    this.rightUpperArm = new THREE.Group();
    this.rightUpperArm.position.set(0.34, 0.58, 0);
    this.torso.add(this.rightUpperArm);

    const rightBicep = new THREE.Mesh(armGeo, this.hoodieMat);
    rightBicep.position.y = -0.17;
    rightBicep.castShadow = true;
    this.rightUpperArm.add(rightBicep);

    this.rightLowerArm = new THREE.Group();
    this.rightLowerArm.position.y = -0.34;
    this.rightUpperArm.add(this.rightLowerArm);

    const rightForearm = new THREE.Mesh(forearmGeo, this.skinMat);
    rightForearm.position.y = -0.16;
    rightForearm.castShadow = true;
    this.rightLowerArm.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, this.pantsMat);
    rightHand.position.y = -0.34;
    this.rightLowerArm.add(rightHand);

    // Legs
    const thighGeo = new THREE.BoxGeometry(0.18, 0.42, 0.18);
    const shinGeo = new THREE.BoxGeometry(0.16, 0.44, 0.16);
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.16, 0.36);
    const soleGeo = new THREE.BoxGeometry(0.19, 0.04, 0.37);

    // Left Leg
    this.leftUpperLeg = new THREE.Group();
    this.leftUpperLeg.position.set(-0.16, 0, 0);
    this.hips.add(this.leftUpperLeg);

    const leftThigh = new THREE.Mesh(thighGeo, this.pantsMat);
    leftThigh.position.y = -0.21;
    leftThigh.castShadow = true;
    this.leftUpperLeg.add(leftThigh);

    this.leftLowerLeg = new THREE.Group();
    this.leftLowerLeg.position.y = -0.42;
    this.leftUpperLeg.add(this.leftLowerLeg);

    const leftShin = new THREE.Mesh(shinGeo, this.pantsMat);
    leftShin.position.y = -0.22;
    leftShin.castShadow = true;
    this.leftLowerLeg.add(leftShin);

    const leftShoe = new THREE.Mesh(shoeGeo, this.shoesMat);
    leftShoe.position.set(0, -0.48, 0.06);
    leftShoe.castShadow = true;
    this.leftLowerLeg.add(leftShoe);

    this.leftShoeGlow = new THREE.Mesh(soleGeo, this.glowMat);
    this.leftShoeGlow.position.set(0, -0.55, 0.06);
    this.leftLowerLeg.add(this.leftShoeGlow);

    // Right Leg
    this.rightUpperLeg = new THREE.Group();
    this.rightUpperLeg.position.set(0.16, 0, 0);
    this.hips.add(this.rightUpperLeg);

    const rightThigh = new THREE.Mesh(thighGeo, this.pantsMat);
    rightThigh.position.y = -0.21;
    rightThigh.castShadow = true;
    this.rightUpperLeg.add(rightThigh);

    this.rightLowerLeg = new THREE.Group();
    this.rightLowerLeg.position.y = -0.42;
    this.rightUpperLeg.add(this.rightLowerLeg);

    const rightShin = new THREE.Mesh(shinGeo, this.pantsMat);
    rightShin.position.y = -0.22;
    rightShin.castShadow = true;
    this.rightLowerLeg.add(rightShin);

    const rightShoe = new THREE.Mesh(shoeGeo, this.shoesMat);
    rightShoe.position.set(0, -0.48, 0.06);
    rightShoe.castShadow = true;
    this.rightLowerLeg.add(rightShoe);

    this.rightShoeGlow = new THREE.Mesh(soleGeo, this.glowMat);
    this.rightShoeGlow.position.set(0, -0.55, 0.06);
    this.rightLowerLeg.add(this.rightShoeGlow);

    // Shield Energy Bubble
    const shieldGeo = new THREE.SphereGeometry(1.25, 16, 12);
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.y = 1.0;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // Magnet Aura Swirl
    this.magnetAura = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.85, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.7 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    this.magnetAura.add(ring1);
    this.magnetAura.position.y = 0.9;
    this.magnetAura.visible = false;
    this.group.add(this.magnetAura);

    // Speed Trail / Boost Flames
    this.speedTrail = new THREE.Group();
    const flameGeo = new THREE.ConeGeometry(0.12, 0.5, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.16, 0.1, -0.2);
    leftFlame.rotation.x = -Math.PI / 2;
    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.16, 0.1, -0.2);
    rightFlame.rotation.x = -Math.PI / 2;
    this.speedTrail.add(leftFlame);
    this.speedTrail.add(rightFlame);
    this.speedTrail.visible = false;
    this.group.add(this.speedTrail);
  }

  public updateCharacterConfig(character: CharacterConfig) {
    this.hoodieMat.color.set(character.colorScheme.hoodie);
    this.pantsMat.color.set(character.colorScheme.pants);
    this.shoesMat.color.set(character.colorScheme.shoes);
    this.hairMat.color.set(character.colorScheme.hair);
    this.glowMat.color.set(character.colorScheme.primary);
  }

  public setPowerUpVisuals(hasShield: boolean, hasMagnet: boolean, hasSpeedBoost: boolean) {
    this.shieldMesh.visible = hasShield;
    this.magnetAura.visible = hasMagnet;
    this.speedTrail.visible = hasSpeedBoost;

    if (hasShield) {
      this.shieldMesh.rotation.y += 0.03;
      this.shieldMesh.rotation.x += 0.015;
    }
    if (hasMagnet) {
      this.magnetAura.rotation.y += 0.08;
    }
  }

  public updateAnimation(delta: number, speed: number, isJumping: boolean, isSliding: boolean, isHit: boolean) {
    this.animTimer += delta * (speed * 0.4 + 4);

    if (isHit) {
      this.currentAction = 'fall';
      this.rootBone.position.y = 0.3;
      this.rootBone.rotation.x = -Math.PI * 0.45;
      this.rootBone.rotation.z = Math.PI * 0.15;
      this.hips.rotation.y = 0.5;
      this.leftUpperArm.rotation.x = -1.2;
      this.rightUpperArm.rotation.x = -1.5;
      this.leftUpperLeg.rotation.x = 0.6;
      this.rightUpperLeg.rotation.x = -0.4;
      return;
    }

    if (isSliding) {
      this.currentAction = 'slide';
      // Low slide posture: tilted back, one leg straight forward, arms low
      this.rootBone.position.y = -0.38;
      this.rootBone.rotation.x = -0.55;
      this.torso.rotation.x = 0.2;
      this.hips.position.y = 0.5;

      this.leftUpperLeg.rotation.x = -1.3;
      this.leftLowerLeg.rotation.x = 0.2;
      this.rightUpperLeg.rotation.x = -0.6;
      this.rightLowerLeg.rotation.x = 0.9;

      this.leftUpperArm.rotation.x = 0.8;
      this.rightUpperArm.rotation.x = 0.9;
      this.leftLowerArm.rotation.x = 0.4;
      this.rightLowerArm.rotation.x = 0.4;
      return;
    }

    if (isJumping) {
      this.currentAction = 'jump';
      // Dynamic mid-air tuck/float
      this.rootBone.position.y = 0.1;
      this.rootBone.rotation.x = 0.15;
      this.torso.rotation.x = 0.1;

      this.leftUpperLeg.rotation.x = -0.8;
      this.leftLowerLeg.rotation.x = 1.1;
      this.rightUpperLeg.rotation.x = -0.4;
      this.rightLowerLeg.rotation.x = 0.7;

      this.leftUpperArm.rotation.x = -1.4;
      this.leftLowerArm.rotation.x = -0.6;
      this.rightUpperArm.rotation.x = -1.2;
      this.rightLowerArm.rotation.x = -0.5;
      return;
    }

    // Normal Running Cycle
    this.currentAction = 'run';
    const cycle = this.animTimer * 1.5;
    const sinCycle = Math.sin(cycle);
    const cosCycle = Math.cos(cycle);

    // Natural running bounce and spine tilt
    this.rootBone.position.y = Math.abs(Math.sin(cycle)) * 0.12;
    this.rootBone.rotation.x = 0.12; // Athletic forward lean
    this.torso.rotation.y = sinCycle * 0.14; // Torso counter-twist
    this.head.rotation.y = -sinCycle * 0.08;

    // Legs swing
    this.leftUpperLeg.rotation.x = sinCycle * 0.85;
    this.leftLowerLeg.rotation.x = Math.max(0, -sinCycle * 1.2);

    this.rightUpperLeg.rotation.x = -sinCycle * 0.85;
    this.rightLowerLeg.rotation.x = Math.max(0, sinCycle * 1.2);

    // Arms swing
    this.leftUpperArm.rotation.x = -sinCycle * 0.9;
    this.leftLowerArm.rotation.x = -0.6 + Math.min(0, sinCycle * 0.4);

    this.rightUpperArm.rotation.x = sinCycle * 0.9;
    this.rightLowerArm.rotation.x = -0.6 + Math.min(0, -sinCycle * 0.4);

    // Apply lane change banking roll
    this.rootBone.rotation.z = THREE.MathUtils.lerp(this.rootBone.rotation.z, this.laneChangeRoll * 0.35, 0.2);
  }

  public playMenuIdle(time: number) {
    this.rootBone.position.y = 0;
    this.rootBone.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);

    const breathe = Math.sin(time * 2) * 0.04;
    this.torso.position.y = breathe;
    this.head.rotation.y = Math.sin(time * 0.8) * 0.2;
    this.head.rotation.x = Math.sin(time * 1.2) * 0.06;

    this.leftUpperArm.rotation.x = 0.1 + breathe;
    this.leftUpperArm.rotation.z = 0.2;
    this.leftLowerArm.rotation.x = -0.3;

    this.rightUpperArm.rotation.x = 0.1 + breathe;
    this.rightUpperArm.rotation.z = -0.2;
    this.rightLowerArm.rotation.x = -0.3;

    this.leftUpperLeg.rotation.set(0, 0, 0.08);
    this.leftLowerLeg.rotation.set(0, 0, 0);
    this.rightUpperLeg.rotation.set(0, 0, -0.08);
    this.rightLowerLeg.rotation.set(0, 0, 0);
  }
}
