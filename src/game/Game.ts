import * as THREE from "three";

export type SkinName = "bamboo" | "aurora" | "ember" | "golden" | "samurai" | "festival";

export interface SkinPalette {
  base: number;
  accent: number;
  boot: number;
}

export const SKIN_PALETTE: Record<SkinName, SkinPalette> = {
  bamboo: { base: 0xf4f4f4, accent: 0x1c1c1c, boot: 0x2c2c2c },
  aurora: { base: 0xd6f3ff, accent: 0x1f4c72, boot: 0x23496b },
  ember: { base: 0xffe3d3, accent: 0x6b1d1d, boot: 0x552020 },
  golden: { base: 0xfff1b0, accent: 0xf1a10a, boot: 0xb87305 },
  samurai: { base: 0xf0f0f0, accent: 0x4b1f1f, boot: 0x3a1616 },
  festival: { base: 0xfdf3ff, accent: 0x8e44ad, boot: 0x4e1f6a }
};

export interface ScoreState {
  distance: number;
  total: number;
  combo: number;
  bestCombo: number;
  speed: number;
  comboScore: number;
}

export interface GameCallbacks {
  onScore?: (score: ScoreState) => void;
  onGameOver?: (score: ScoreState) => void;
  onSkinChange?: (skin: SkinName) => void;
}

interface GameOptions {
  canvas: HTMLCanvasElement;
  callbacks?: GameCallbacks;
}

type HazardType = "rock" | "log" | "pit" | "bird";

interface Hazard {
  mesh: THREE.Object3D;
  type: HazardType;
  lane: number;
  passed: boolean;
  active: boolean;
  width: number;
  height: number;
  depth: number;
  meta?: Record<string, number>;
}

class PandaRunner {
  public readonly group: THREE.Group;
  private readonly baseMaterial: THREE.MeshStandardMaterial;
  private readonly accentMaterial: THREE.MeshStandardMaterial;
  private readonly eyeMaterial: THREE.MeshStandardMaterial;
  private readonly noseMaterial: THREE.MeshStandardMaterial;
  private readonly bootMaterial: THREE.MeshStandardMaterial;
  private readonly lanePositions = [-2.6, 0, 2.6];
  private laneIndex = 1;
  private laneTarget = 1;
  private verticalVelocity = 0;
  private readonly gravity = 32;
  private readonly jumpVelocity = 13.5;
  private readonly crouchScale = 0.78;
  private crouching = false;
  private grounded = true;
  private runTimer = 0;
  private readonly boundingBox = new THREE.Box3();

  constructor() {
    this.baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f4f4,
      roughness: 0.5,
      metalness: 0.05
    });
    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1c1c,
      roughness: 0.6,
      metalness: 0.15
    });
    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000
    });
    this.noseMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111
    });
    this.bootMaterial = new THREE.MeshStandardMaterial({
      color: SKIN_PALETTE.bamboo.boot,
      roughness: 0.45,
      metalness: 0.12
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 24), this.baseMaterial);
    body.scale.set(1, 1.1, 1.3);

    const bellyPatch = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 20), new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x151515,
      emissiveIntensity: 0.1,
      roughness: 0.75
    }));
    bellyPatch.scale.set(0.6, 0.8, 0.4);
    bellyPatch.position.set(0, 0.1, 0.7);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 24), this.baseMaterial);
    head.position.set(0, 1.35, 0.35);

    const leftEar = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.1, 12, 24), this.accentMaterial);
    leftEar.position.set(0.45, 1.85, 0);
    leftEar.rotation.z = Math.PI * 0.15;
    const rightEar = leftEar.clone();
    rightEar.position.x *= -1;
    rightEar.rotation.z *= -1;

    const eyeGeometry = new THREE.SphereGeometry(0.09, 16, 16);
    const eyePatchGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const leftEyePatch = new THREE.Mesh(eyePatchGeometry, this.accentMaterial);
    leftEyePatch.position.set(0.26, 1.42, 0.9);
    leftEyePatch.rotation.z = Math.PI * 0.35;
    const rightEyePatch = leftEyePatch.clone();
    rightEyePatch.position.x *= -1;
    rightEyePatch.rotation.z *= -1;

    const leftEye = new THREE.Mesh(eyeGeometry, this.eyeMaterial);
    leftEye.position.set(0.26, 1.41, 1.03);
    const rightEye = leftEye.clone();
    rightEye.position.x *= -1;

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 16), this.noseMaterial);
    nose.position.set(0, 1.27, 1.0);
    nose.rotation.x = Math.PI * 0.5;

    const legGeometry = new THREE.CapsuleGeometry(0.28, 0.7, 8, 16);
    const armGeometry = new THREE.CapsuleGeometry(0.22, 0.6, 8, 16);

    const leftLeg = new THREE.Mesh(legGeometry, this.accentMaterial);
    leftLeg.position.set(0.45, -0.6, 0.4);
    leftLeg.rotation.x = Math.PI * 0.07;
    const rightLeg = leftLeg.clone();
    rightLeg.position.x *= -1;

    const leftArm = new THREE.Mesh(armGeometry, this.accentMaterial);
    leftArm.position.set(0.95, 0.4, 0.0);
    leftArm.rotation.z = Math.PI * 0.08;
    const rightArm = leftArm.clone();
    rightArm.position.x *= -1;
    rightArm.rotation.z *= -1;

    const bootGeometry = new THREE.CylinderGeometry(0.34, 0.3, 0.32, 18);
    const soleGeometry = new THREE.BoxGeometry(0.7, 0.08, 0.95);
    const soleMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3,
      metalness: 0.05
    });

    const leftBoot = new THREE.Mesh(bootGeometry, this.bootMaterial);
    leftBoot.position.copy(leftLeg.position);
    leftBoot.position.y -= 0.52;
    leftBoot.position.z += 0.08;
    leftBoot.castShadow = true;
    leftBoot.receiveShadow = true;

    const leftSole = new THREE.Mesh(soleGeometry, soleMaterial);
    leftSole.position.copy(leftBoot.position);
    leftSole.position.y -= 0.18;
    leftSole.castShadow = true;
    leftSole.receiveShadow = true;

    const rightBoot = new THREE.Mesh(bootGeometry.clone(), this.bootMaterial);
    rightBoot.position.set(-leftBoot.position.x, leftBoot.position.y, leftBoot.position.z);
    rightBoot.castShadow = true;
    rightBoot.receiveShadow = true;

    const rightSole = new THREE.Mesh(soleGeometry.clone(), soleMaterial);
    rightSole.position.set(-leftSole.position.x, leftSole.position.y, leftSole.position.z);
    rightSole.castShadow = true;
    rightSole.receiveShadow = true;

    this.group = new THREE.Group();
    this.group.add(
      body,
      bellyPatch,
      head,
      leftEar,
      rightEar,
      leftEyePatch,
      rightEyePatch,
      leftEye,
      rightEye,
      nose,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      leftBoot,
      rightBoot,
      leftSole,
      rightSole
    );
    this.group.position.set(0, 0, 0);
    this.group.castShadow = true;

    this.updateBoundingBox();
  }

  public startRunCycle(): void {
    this.runTimer = 0;
  }

  public update(delta: number, speed: number): void {
    this.runTimer += delta * speed * 0.25;

    const bobAmplitude = this.crouching ? 0.02 : 0.07;
    const bobbing = Math.sin(this.runTimer * Math.PI * 2) * bobAmplitude;

    const targetX = this.lanePositions[this.laneTarget];
    this.group.position.x = THREE.MathUtils.damp(this.group.position.x, targetX, 8, delta);

    this.verticalVelocity -= this.gravity * delta;
    this.group.position.y += this.verticalVelocity * delta;
    if (this.group.position.y <= 0) {
      this.group.position.y = 0;
      this.verticalVelocity = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    if (this.grounded && !this.crouching) {
      this.group.position.y += bobbing;
    }

    this.updateBoundingBox();
  }

  public moveLane(direction: -1 | 1): void {
    this.laneTarget = THREE.MathUtils.clamp(this.laneTarget + direction, 0, this.lanePositions.length - 1);
    this.laneIndex = this.laneTarget;
  }

  public jump(): void {
    if (!this.grounded || this.crouching) {
      return;
    }
    this.verticalVelocity = this.jumpVelocity;
    this.grounded = false;
  }

  public crouch(state: boolean): void {
    if (this.crouching === state) {
      return;
    }
    this.crouching = state;
    const targetScale = state ? this.crouchScale : 1;
    this.group.scale.y = targetScale;
    this.group.position.y -= state ? 0.15 : -0.15;
  }

  public setSkin(skin: SkinName): void {
    const colors = SKIN_PALETTE[skin];
    this.baseMaterial.color.setHex(colors.base);
    this.accentMaterial.color.setHex(colors.accent);
    this.bootMaterial.color.setHex(colors.boot);
  }

  public getLaneIndex(): number {
    return this.laneIndex;
  }

  public getBoundingBox(): THREE.Box3 {
    return this.boundingBox.clone();
  }

  private updateBoundingBox(): void {
    this.boundingBox.setFromObject(this.group);
  }
}

export class Game {
  private readonly callbacks: GameCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  private readonly panda: PandaRunner;
  private readonly directionalLight: THREE.DirectionalLight;
  private readonly ambientLight: THREE.HemisphereLight;
  private readonly clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private running = false;
  private distance = 0;
  private comboStreak = 0;
  private bestCombo = 0;
  private comboScore = 0;
  private elapsed = 0;
  private speed = 12;
  private readonly baseSpeed = 11;
  private readonly maxSpeed = 36;
  private readonly speedRamp = 0.85;
  private spawnTimer = 0;
  private spawnInterval = 1.4;
  private readonly hazards: Hazard[] = [];
  private readonly groundSegments: THREE.Group[] = [];
  private readonly trees: THREE.Group[] = [];
  private readonly laneWidth = 2.6;
  private readonly segmentLength = 40;
  private readonly maxSegments = 6;
  private readonly hazardBox = new THREE.Box3();
  private readonly fogColor = 0x87c2ff;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();

  constructor(options: GameOptions) {
    const { canvas, callbacks } = options;
    this.callbacks = callbacks ?? {};

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.fogColor);
    this.scene.fog = new THREE.FogExp2(this.fogColor, 0.012);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 4.5, -12);
    this.camera.lookAt(0, 1.4, 15);

    this.panda = new PandaRunner();
    this.scene.add(this.panda.group);

    this.ambientLight = new THREE.HemisphereLight(0xcce5ff, 0x1e391f, 0.65);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.directionalLight.position.set(6, 18, 12);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.near = 1;
    this.directionalLight.shadow.camera.far = 80;
    this.directionalLight.shadow.camera.left = -14;
    this.directionalLight.shadow.camera.right = 14;
    this.directionalLight.shadow.camera.top = 14;
    this.directionalLight.shadow.camera.bottom = -14;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);

    const skyLight = new THREE.PointLight(0xfef2cc, 0.45);
    skyLight.position.set(-16, 22, -8);
    this.scene.add(skyLight);

    this.createGround();
    this.createInitialHazards();

    this.clock = new THREE.Clock(false);

    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    this.initInputListeners();
    this.loop = this.loop.bind(this);
  }

  public applySkin(skin: SkinName): void {
    this.panda.setSkin(skin);
    this.callbacks.onSkinChange?.(skin);
  }

  public start(): void {
    if (this.running) {
      return;
    }
    this.resetState();
    this.running = true;
    this.clock.start();
    if (!this.animationFrameId) {
      this.animationFrameId = window.requestAnimationFrame(this.loop);
    }
  }

  public stop(): void {
    this.running = false;
    this.clock.stop();
  }

  public isRunning(): boolean {
    return this.running;
  }

  public destroy(): void {
    this.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.onResize);
    this.disposeScene();
  }

  private resetState(): void {
    this.distance = 0;
    this.comboStreak = 0;
    this.bestCombo = 0;
    this.comboScore = 0;
    this.elapsed = 0;
    this.speed = this.baseSpeed;
    this.spawnTimer = 0;
    this.spawnInterval = 1.35;
    this.clearHazards();
    this.panda.group.position.set(0, 0, 0);
    this.panda.startRunCycle();
    this.resetGround();
  }

  private loop(): void {
    this.animationFrameId = window.requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();

    if (this.running) {
      this.elapsed += delta;
      this.speed = Math.min(this.maxSpeed, this.baseSpeed + this.elapsed * this.speedRamp);
      this.distance += this.speed * delta;

      this.panda.update(delta, this.speed);
      this.updateCamera(delta);
      this.updateGround(delta);
      this.updateHazards(delta);
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnInterval = THREE.MathUtils.clamp(1.6 - this.elapsed * 0.03, 0.65, 1.6);
        this.spawnHazard();
      }

      this.callbacks.onScore?.(this.currentScore());
    }

    this.renderer.render(this.scene, this.camera);
  }

  private currentScore(): ScoreState {
    const total = Math.floor(this.distance * 1.4 + this.comboScore * 25);
    return {
      distance: this.distance,
      total,
      combo: this.comboStreak,
      bestCombo: this.bestCombo,
      speed: this.speed,
      comboScore: this.comboScore
    };
  }

  private updateCamera(delta: number): void {
    this.cameraTarget.set(
      THREE.MathUtils.damp(this.camera.position.x, this.panda.group.position.x * 0.35, 6, delta),
      THREE.MathUtils.damp(this.camera.position.y, 4.2, 4, delta),
      THREE.MathUtils.damp(this.camera.position.z, this.panda.group.position.z - 11.5, 6, delta)
    );
    this.camera.position.copy(this.cameraTarget);

    this.lookTarget.set(
      this.panda.group.position.x * 0.18,
      1.4,
      this.panda.group.position.z + 16
    );
    this.camera.lookAt(this.lookTarget);
  }

  private createGround(): void {
    for (let i = 0; i < this.maxSegments; i++) {
      const segmentGroup = new THREE.Group();
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x4f8a45,
        roughness: 0.92,
        metalness: 0
      });
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(this.laneWidth * 3.2, 0.3, this.segmentLength),
        groundMaterial
      );
      base.position.y = -0.2;
      base.receiveShadow = true;
      segmentGroup.add(base);

      const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d6f36,
        roughness: 0.85,
        metalness: 0.02
      });
      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(this.laneWidth * 3.2, this.segmentLength),
        pathMaterial
      );
      path.rotation.x = -Math.PI * 0.5;
      path.position.y = 0.015;
      path.receiveShadow = true;
      segmentGroup.add(path);

      const lineMaterial = new THREE.MeshStandardMaterial({
        color: 0xf2f0ba,
        roughness: 0.4,
        metalness: 0
      });
      const dividerPositions = [-this.laneWidth * 0.5, this.laneWidth * 0.5];
      for (const x of dividerPositions) {
        const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.08, this.segmentLength), lineMaterial);
        divider.rotation.x = -Math.PI * 0.5;
        divider.position.set(x, 0.02, 0);
        divider.receiveShadow = false;
        segmentGroup.add(divider);
      }

      const dashMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff3c0,
        roughness: 0.35,
        metalness: 0
      });
      const dashCount = 6;
      for (let d = 0; d < dashCount; d++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, this.segmentLength / (dashCount * 1.7)), dashMaterial);
        dash.rotation.x = -Math.PI * 0.5;
        dash.position.set(0, 0.021, -this.segmentLength * 0.5 + (d + 0.5) * (this.segmentLength / dashCount));
        dash.receiveShadow = false;
        segmentGroup.add(dash);
      }

      segmentGroup.position.set(0, 0, i * this.segmentLength);
      this.scene.add(segmentGroup);
      this.groundSegments.push(segmentGroup);

      const treeLine = this.createTreeLine();
      treeLine.position.z = segmentGroup.position.z + this.segmentLength * 0.5;
      this.scene.add(treeLine);
      this.trees.push(treeLine);
    }
  }

  private resetGround(): void {
    for (let i = 0; i < this.groundSegments.length; i++) {
      const segment = this.groundSegments[i];
      segment.position.z = i * this.segmentLength;
    }
    for (let i = 0; i < this.trees.length; i++) {
      const treeLine = this.trees[i];
      treeLine.position.z = i * this.segmentLength + this.segmentLength * 0.5;
    }
  }

  private updateGround(delta: number): void {
    const scroll = this.speed * delta;
    for (const segment of this.groundSegments) {
      segment.position.z -= scroll;
      if (segment.position.z < -this.segmentLength) {
        segment.position.z += this.maxSegments * this.segmentLength;
      }
    }

    for (const treeLine of this.trees) {
      treeLine.position.z -= scroll;
      if (treeLine.position.z < -this.segmentLength) {
        treeLine.position.z += this.maxSegments * this.segmentLength;
        this.refreshTreeLine(treeLine);
      }
    }
  }

  private createTreeLine(): THREE.Group {
    const group = new THREE.Group();
    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e3b1e,
      roughness: 0.85
    });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x28723a,
      roughness: 0.6
    });
    const bloomMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd966,
      emissive: 0x552200,
      emissiveIntensity: 0.12,
      roughness: 0.4
    });

    const treeCount = 8;
    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const trunkHeight = THREE.MathUtils.randFloat(3, 5);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, trunkHeight, 8), barkMaterial);
      trunk.position.y = trunkHeight * 0.5;

      const foliageLayers = THREE.MathUtils.randInt(2, 3);
      for (let layer = 0; layer < foliageLayers; layer++) {
        const radius = THREE.MathUtils.randFloat(1.1, 1.6) - layer * 0.2;
        const heightOffset = trunkHeight * 0.5 + layer * 0.65;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 1.6, 12), leafMaterial);
        cone.position.set(0, heightOffset, 0);
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      }

      if (Math.random() > 0.7) {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), bloomMaterial);
        bloom.position.set(THREE.MathUtils.randFloat(-0.6, 0.6), trunkHeight * 0.9, THREE.MathUtils.randFloat(-0.6, 0.6));
        bloom.castShadow = true;
        tree.add(bloom);
      }

      trunk.castShadow = true;
      trunk.receiveShadow = true;

      tree.add(trunk);
      const xOffset = THREE.MathUtils.randFloat(4.8, 8.5);
      const side = Math.random() > 0.5 ? 1 : -1;
      tree.position.set(xOffset * side, 0, THREE.MathUtils.randFloatSpread(this.segmentLength));

      group.add(tree);
    }

    return group;
  }

  private refreshTreeLine(treeLine: THREE.Group): void {
    for (const tree of treeLine.children) {
      const offset = THREE.MathUtils.randFloatSpread(this.segmentLength);
      tree.position.z = offset;
      const side = tree.position.x >= 0 ? 1 : -1;
      tree.position.x = THREE.MathUtils.randFloat(4.8, 8.5) * side;
    }
  }

  private updateHazards(delta: number): void {
    const scroll = this.speed * delta;
    const playerZ = this.panda.group.position.z;

    for (const hazard of this.hazards) {
      hazard.mesh.position.z -= scroll;
      if (hazard.type === "bird") {
        const phase = (hazard.meta?.phase ?? 0) + delta * 2.5;
        const amplitude = hazard.meta?.amplitude ?? 1.5;
        const baseX = hazard.meta?.baseX ?? 0;
        const baseY = hazard.meta?.baseY ?? 2.6;
        hazard.mesh.position.y = baseY + Math.sin(phase) * 0.9;
        hazard.mesh.position.x = baseX + Math.sin(phase * 0.7) * amplitude;
        hazard.meta = {
          ...(hazard.meta ?? {}),
          phase,
          baseX,
          baseY
        };
      }

      if (!hazard.passed && hazard.mesh.position.z < playerZ - hazard.depth * 0.6) {
        hazard.passed = true;
        this.comboStreak += 1;
        this.comboScore += this.comboStreak;
        this.bestCombo = Math.max(this.bestCombo, this.comboStreak);
      }
    }

    this.checkCollisions();
    this.cleanupHazards();
  }

  private spawnHazard(): void {
    const hazardType: HazardType = this.pickHazardType();
    const lane = hazardType === "bird" ? THREE.MathUtils.randInt(0, 2) : THREE.MathUtils.randInt(0, 2);
    const spawnZ = this.segmentLength * (this.maxSegments - 1) + 32;

    let hazard: Hazard;
    switch (hazardType) {
      case "rock":
        hazard = this.createRock(lane, spawnZ);
        break;
      case "log":
        hazard = this.createLog(lane, spawnZ);
        break;
      case "pit":
        hazard = this.createPit(lane, spawnZ);
        break;
      case "bird":
      default:
        hazard = this.createBird(lane, spawnZ);
        break;
    }

    this.scene.add(hazard.mesh);
    this.hazards.push(hazard);
  }

  private pickHazardType(): HazardType {
    const roll = Math.random();
    if (roll > 0.78) return "bird";
    if (roll > 0.52) return "log";
    if (roll > 0.30) return "pit";
    return "rock";
  }

  private createRock(lane: number, z: number): Hazard {
    const group = new THREE.Group();
    const palette = [0x5f5b5a, 0x6d6968, 0x494241];
    for (let i = 0; i < 3; i++) {
      const color = palette[i % palette.length];
      const fragment = new THREE.Mesh(
        new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.45, 0.65), 0),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.92,
          metalness: 0.08,
          flatShading: true
        })
      );
      fragment.position.set(
        THREE.MathUtils.randFloatSpread(0.4),
        0.25 + i * 0.18,
        THREE.MathUtils.randFloatSpread(0.35)
      );
      fragment.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      fragment.castShadow = true;
      fragment.receiveShadow = true;
      group.add(fragment);
    }

    group.position.set(this.lanePositionX(lane) + THREE.MathUtils.randFloatSpread(0.35), 0, z);
    group.scale.setScalar(1.1);

    return {
      mesh: group,
      type: "rock",
      lane,
      passed: false,
      active: true,
      width: 1.4,
      height: 1.1,
      depth: 1.3
    };
  }

  private createLog(lane: number, z: number): Hazard {
    const group = new THREE.Group();
    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a5a2b,
      roughness: 0.9,
      metalness: 0.05
    });
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xc48b57,
      roughness: 0.7,
      side: THREE.DoubleSide
    });

    const mainLog = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 2.4, 16, 1, true), barkMaterial);
    mainLog.geometry.rotateZ(Math.PI * 0.5);
    mainLog.castShadow = true;
    mainLog.receiveShadow = true;
    group.add(mainLog);

    const endCapLeft = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), ringMaterial);
    endCapLeft.rotation.y = Math.PI * 0.5;
    endCapLeft.position.x = -1.2;
    endCapLeft.receiveShadow = false;
    group.add(endCapLeft);
    const endCapRight = endCapLeft.clone();
    endCapRight.position.x = 1.2;
    group.add(endCapRight);

    const knot = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 6, 12), barkMaterial);
    knot.rotation.set(Math.PI * 0.35, 0, Math.PI * 0.25);
    knot.position.set(0.1, 0.38, 0.07);
    knot.castShadow = true;
    knot.receiveShadow = true;
    group.add(knot);

    group.position.set(this.lanePositionX(lane), 0.32, z);

    return {
      mesh: group,
      type: "log",
      lane,
      passed: false,
      active: true,
      width: 2.2,
      height: 1.0,
      depth: 2.4
    };
  }

  private createPit(lane: number, z: number): Hazard {
    const group = new THREE.Group();
    const pitColor = new THREE.Color(0x17311a);
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x41713c, roughness: 0.9 });
    const interiorMaterial = new THREE.MeshStandardMaterial({
      color: pitColor,
      emissive: 0x0a1e10,
      emissiveIntensity: 0.25,
      roughness: 0.95,
      side: THREE.DoubleSide
    });

    const interior = new THREE.Mesh(new THREE.PlaneGeometry(this.laneWidth * 0.92, 3.2), interiorMaterial);
    interior.rotation.x = -Math.PI * 0.5;
    interior.position.set(0, -0.16, 0);
    interior.receiveShadow = false;

    const rim = new THREE.Mesh(new THREE.BoxGeometry(this.laneWidth, 0.1, 3.6), rimMaterial);
    rim.position.set(0, -0.05, 0);
    rim.receiveShadow = true;

    group.add(interior, rim);
    group.position.set(this.lanePositionX(lane), 0, z);

    return {
      mesh: group,
      type: "pit",
      lane,
      passed: false,
      active: true,
      width: this.laneWidth * 0.9,
      height: 1.1,
      depth: 3.4
    };
  }

  private createBird(lane: number, z: number): Hazard {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x353535,
      roughness: 0.6,
      metalness: 0.2
    });
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: 0.7
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 8, 16), bodyMaterial);
    body.rotation.z = Math.PI * 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), bodyMaterial);
    head.position.set(0.5, 0.12, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0xffa500 }));
    beak.rotation.z = Math.PI * -0.5;
    beak.position.set(0.66, 0.12, 0);

    const wingGeometry = new THREE.BoxGeometry(0.2, 1.6, 0.7);
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0.5, 0);
    const rightWing = leftWing.clone();
    rightWing.position.y *= -1;

    group.add(body, head, beak, leftWing, rightWing);
    const baseY = THREE.MathUtils.randFloat(2.6, 3.1);
    group.position.set(this.lanePositionX(lane), baseY, z);
    group.castShadow = true;

    return {
      mesh: group,
      type: "bird",
      lane,
      passed: false,
      active: true,
      width: 2.0,
      height: 1.5,
      depth: 2.0,
      meta: {
        amplitude: THREE.MathUtils.randFloat(1.2, 2.2),
        phase: Math.random() * Math.PI * 2,
        baseX: this.lanePositionX(lane),
        baseY
      }
    };
  }

  private lanePositionX(lane: number): number {
    const indices = [-1, 0, 1];
    return indices[lane] * this.laneWidth;
  }

  private createInitialHazards(): void {
    for (let i = 0; i < 3; i++) {
      const lane = THREE.MathUtils.randInt(0, 2);
      const hazard = this.createRock(lane, 30 + i * 15);
      hazard.passed = true;
      this.scene.add(hazard.mesh);
      this.hazards.push(hazard);
    }
  }

  private checkCollisions(): void {
    const pandaBox = this.panda.getBoundingBox();
    const pandaLane = this.panda.getLaneIndex();

    for (const hazard of this.hazards) {
      if (!hazard.active) continue;

      if (hazard.type !== "bird" && hazard.lane !== pandaLane && hazard.type !== "pit") {
        continue;
      }

      this.hazardBox.setFromObject(hazard.mesh);
      if (hazard.type === "pit") {
        const withinPitZ = Math.abs(hazard.mesh.position.z - this.panda.group.position.z) < hazard.depth * 0.4;
        const sameLane = hazard.lane === pandaLane;
        if (withinPitZ && sameLane && this.panda.group.position.y < -0.2) {
          console.log('💥 Fell in pit at y:', this.panda.group.position.y);
          this.triggerGameOver();
          return;
        }
        continue;
      }

      if (hazard.type === "bird") {
        if (this.panda.group.position.y > 0.6 && pandaBox.intersectsBox(this.hazardBox)) {
          console.log('💥 Hit bird at y:', this.panda.group.position.y);
          this.triggerGameOver();
          return;
        }
        continue;
      }

      if (pandaBox.intersectsBox(this.hazardBox) && this.panda.group.position.y < hazard.height + 0.4) {
        console.log('💥 Hit obstacle:', hazard.type, 'at y:', this.panda.group.position.y);
        this.triggerGameOver();
        return;
      }
    }
  }

  private cleanupHazards(): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      if (hazard.mesh.position.z < -30) {
        this.scene.remove(hazard.mesh);
        this.disposeObject(hazard.mesh);
        this.hazards.splice(i, 1);
      }
    }
  }

  private triggerGameOver(): void {
    if (!this.running) return;
    this.running = false;
    this.clock.stop();
    this.comboStreak = 0;
    this.callbacks.onGameOver?.(this.currentScore());
  }

  private clearHazards(): void {
    for (const hazard of this.hazards) {
      this.scene.remove(hazard.mesh);
      this.disposeObject(hazard.mesh);
    }
    this.hazards.length = 0;
  }

  private initInputListeners(): void {
    window.addEventListener("keydown", (event) => {
      if (!this.running) return;
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          this.panda.moveLane(1);
          break;
        case "ArrowRight":
        case "KeyD":
          this.panda.moveLane(-1);
          break;
        case "ArrowUp":
        case "Space":
        case "KeyW":
          this.panda.jump();
          break;
        case "ShiftLeft":
        case "ShiftRight":
        case "ControlLeft":
        case "ArrowDown":
        case "KeyS":
          this.panda.crouch(true);
          break;
        default:
          break;
      }
    });

    window.addEventListener("keyup", (event) => {
      switch (event.code) {
        case "ShiftLeft":
        case "ShiftRight":
        case "ControlLeft":
        case "ArrowDown":
        case "KeyS":
          this.panda.crouch(false);
          break;
        default:
          break;
      }
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private disposeScene(): void {
    this.disposeObject(this.scene);
    this.renderer.dispose();
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          for (const material of child.material) {
            material.dispose();
          }
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }
}
