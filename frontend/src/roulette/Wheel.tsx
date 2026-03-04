import { useEffect, useMemo, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { gsap } from 'gsap';
import type { RouletteOutcome } from '@/api';
import {
  playBallBounce,
  playBallSettle,
  startBallRolling,
  stopBallRolling,
} from '@/audio/rouletteAudio';
import { RED_NUMBERS, SEGMENT_ANGLE } from './constants';
import type { WinTier } from './types';
import './wheel.css';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Track (outer rim) where ball orbits at speed — just inside gold rim */
function trackRadius(size: number): number {
  // PNG radius ~983 → 983/2048 ≈ 0.48
  return size * 0.48;
}

/** Inner pocket radius where ball rests after settling — pocket floor center */
function pocketRadius(size: number): number {
  // PNG pocket floor center ~810 → 810/2048 ≈ 0.395
  return size * 0.395;
}

/** Deflector rim — the ring of diamond-shaped bumps between track and pockets */
function deflectorRadius(size: number): number {
  // PNG deflector radius ~735 → 735/2048 ≈ 0.359
  return size * 0.359;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  spinning: boolean;
  spinOutcome?: RouletteOutcome | null;
  spinToken?: string | null;
  resultNumber?: number | null;
  winTier?: WinTier;
  onBallDropStart?: () => void;
  onSpinComplete?: () => void;
  size?: number;
}

interface WheelScene {
  app: Application;
  root: Container;
  ambientGlow: Graphics;
  wheelLayer: Container;
  shadow: Graphics;
  ball: Sprite;
  particleLayer: Container;
  particleTextures: Texture[];
  /** Ball angle in degrees (world-space, 0 = right, CCW positive) */
  ballAngleDeg: number;
  /** Ball distance from center */
  ballRadius: number;
  size: number;
  /** Whether ball is currently parented to the wheel (rotating with it) */
  ballInWheel: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function winColor(number: number | null | undefined): 'red' | 'black' | 'green' | null {
  if (number == null) return null;
  if (number === 0) return 'green';
  return RED_NUMBERS.has(number) ? 'red' : 'black';
}

/** Position ball in world-space (when parented to root) */
function setBallPosition(scene: WheelScene): void {
  const rad = scene.ballAngleDeg * DEG_TO_RAD;
  scene.ball.x = Math.cos(rad) * scene.ballRadius;
  scene.ball.y = Math.sin(rad) * scene.ballRadius;
}

/** Move ball from root into wheelLayer so it rotates with the wheel */
function reparentBallToWheel(scene: WheelScene): void {
  if (scene.ballInWheel) return;
  // Convert ball world position to wheelLayer local space
  const worldX = scene.ball.x;
  const worldY = scene.ball.y;
  const wheelRot = scene.wheelLayer.rotation;
  const cos = Math.cos(-wheelRot);
  const sin = Math.sin(-wheelRot);
  const wheelScale = scene.wheelLayer.scale.x;
  const localX = (worldX * cos - worldY * sin) / wheelScale;
  const localY = (worldX * sin + worldY * cos) / wheelScale;

  scene.root.removeChild(scene.ball);
  scene.wheelLayer.addChild(scene.ball);
  scene.ball.x = localX;
  scene.ball.y = localY;
  scene.ball.width = (scene.size * 0.04) / wheelScale;
  scene.ball.height = (scene.size * 0.04) / wheelScale;
  scene.ballInWheel = true;
}

/** Move ball back from wheelLayer to root (world-space) */
function reparentBallToRoot(scene: WheelScene): void {
  if (!scene.ballInWheel) return;
  const wheelScale = scene.wheelLayer.scale.x;
  const localX = scene.ball.x;
  const localY = scene.ball.y;
  const wheelRot = scene.wheelLayer.rotation;
  const cos = Math.cos(wheelRot);
  const sin = Math.sin(wheelRot);
  const worldX = (localX * cos - localY * sin) * wheelScale;
  const worldY = (localX * sin + localY * cos) * wheelScale;

  scene.wheelLayer.removeChild(scene.ball);
  scene.root.addChild(scene.ball);
  scene.ball.x = worldX;
  scene.ball.y = worldY;
  scene.ball.width = scene.size * 0.04;
  scene.ball.height = scene.size * 0.04;
  scene.ballInWheel = false;

  // Recover angle/radius from position
  scene.ballAngleDeg = Math.atan2(worldY, worldX) * RAD_TO_DEG;
  scene.ballRadius = Math.sqrt(worldX * worldX + worldY * worldY);
}

function resizeScene(scene: WheelScene, size: number): void {
  scene.size = size;
  scene.app.renderer.resize(size, size);
  scene.root.x = size / 2;
  scene.root.y = size / 2;

  scene.ambientGlow.clear();
  scene.ambientGlow.circle(0, 0, size * 0.48).fill({ color: 0xc8a04e, alpha: 0.15 });

  scene.shadow.clear();
  scene.shadow.circle(0, 0, size * 0.47).fill({ color: 0x000000, alpha: 0.26 });
  scene.shadow.y = size * 0.012;

  scene.wheelLayer.scale.set(size / 2048);

  if (!scene.ballInWheel) {
    scene.ball.width = size * 0.04;
    scene.ball.height = size * 0.04;
  } else {
    const wheelScale = scene.wheelLayer.scale.x;
    scene.ball.width = (size * 0.04) / wheelScale;
    scene.ball.height = (size * 0.04) / wheelScale;
  }
}

function clearParticles(scene: WheelScene): void {
  const children = [...scene.particleLayer.children];
  scene.particleLayer.removeChildren();
  for (const child of children) {
    child.destroy();
  }
}

function burstParticles(scene: WheelScene, tier: WinTier): void {
  clearParticles(scene);

  const tierConfig = {
    none: { count: 0, colors: [] as number[] },
    small: { count: 12, colors: [0xf6be57] },
    medium: { count: 24, colors: [0xf6be57, 0xffffff] },
    big: { count: 36, colors: [0xf6be57, 0xffffff, 0x22c55e] },
    mega: { count: 48, colors: [0xf6be57, 0xffffff, 0x22c55e, 0xff6b35, 0xffd700] },
  };

  const config = tierConfig[tier];
  if (config.count === 0) return;

  for (let i = 0; i < config.count; i++) {
    const texture =
      scene.particleTextures[Math.floor(Math.random() * scene.particleTextures.length)]!;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.alpha = 0.95;
    sprite.x = (Math.random() - 0.5) * scene.size * 0.06;
    sprite.y = (Math.random() - 0.5) * scene.size * 0.06;
    sprite.scale.set(0.45 + Math.random() * 0.8);
    sprite.tint = config.colors[Math.floor(Math.random() * config.colors.length)]!;
    scene.particleLayer.addChild(sprite);

    const angle = Math.random() * Math.PI * 2;
    const distance = scene.size * (0.16 + Math.random() * 0.18);
    const duration = tier === 'mega' ? 1.0 + Math.random() * 1.0 : 0.75 + Math.random() * 0.55;

    gsap.to(sprite, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      alpha: 0,
      rotation: (Math.random() - 0.5) * 2.8,
      duration,
      ease: 'power2.out',
      delay: tier === 'mega' ? Math.random() * 0.5 : 0,
      onComplete: () => sprite.destroy(),
    });
  }
}

function getResultTier(outcome: RouletteOutcome): WinTier {
  if (outcome.win.amount <= 0) return 'none';
  const m = outcome.win.amount / outcome.total_bet;
  if (m >= 200) return 'mega';
  if (m >= 50) return 'big';
  if (m >= 10) return 'medium';
  if (m >= 1) return 'small';
  return 'none';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RouletteWheel({
  spinning,
  spinOutcome,
  spinToken,
  resultNumber,
  winTier: _winTier = 'none', // eslint-disable-line @typescript-eslint/no-unused-vars
  onBallDropStart,
  onSpinComplete,
  size = 360,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<WheelScene | null>(null);
  const waitingTweensRef = useRef<gsap.core.Tween[]>([]);
  const idleTweenRef = useRef<gsap.core.Tween | null>(null);
  const glowTweenRef = useRef<gsap.core.Tween | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const modeRef = useRef<'idle' | 'waiting' | 'resolving'>('idle');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [shaking, setShaking] = useState(false);
  const resolvedTokenRef = useRef<string | null>(null);

  const resultColor = useMemo(() => winColor(resultNumber), [resultNumber]);

  /* ---- Animation control ---- */

  const stopAnimation = (): void => {
    for (const tween of waitingTweensRef.current) tween.kill();
    waitingTweensRef.current = [];
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    stopBallRolling();
  };

  const stopIdle = (): void => {
    if (idleTweenRef.current) {
      idleTweenRef.current.kill();
      idleTweenRef.current = null;
    }
  };

  const startIdleRotation = (scene: WheelScene): void => {
    stopIdle();
    idleTweenRef.current = gsap.to(scene.wheelLayer, {
      rotation: `+=${Math.PI * 2}`,
      duration: 12,
      ease: 'none',
      repeat: -1,
    });
  };

  const startGlowPulse = (scene: WheelScene): void => {
    if (glowTweenRef.current) return;
    glowTweenRef.current = gsap.to(scene.ambientGlow, {
      alpha: 0.25,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  };

  /* ---- Waiting spin (before result arrives) ---- */

  const startWaitingSpin = (scene: WheelScene): void => {
    stopAnimation();
    stopIdle();

    // Ensure ball is in world-space and visible
    reparentBallToRoot(scene);
    scene.ball.visible = true;
    scene.ballRadius = trackRadius(scene.size);
    setBallPosition(scene);
    startBallRolling();

    // Smoothly accelerate from idle speed (12s/rev) to waiting speed (1.15s/rev)
    const IDLE_DURATION = 12;
    const WAIT_WHEEL_DURATION = 1.15;
    const WAIT_BALL_DURATION = 1.45;
    const initialTimeScale = WAIT_WHEEL_DURATION / IDLE_DURATION; // ~0.096

    const wheelTween = gsap.to(scene.wheelLayer, {
      rotation: `+=${Math.PI * 2}`,
      duration: WAIT_WHEEL_DURATION,
      ease: 'none',
      repeat: -1,
    });
    wheelTween.timeScale(initialTimeScale);

    const wheelRamp = gsap.to(wheelTween, {
      timeScale: 1,
      duration: 2.0,
      ease: 'power2.in',
    });

    const orbitState = { angle: scene.ballAngleDeg };
    const ballTween = gsap.to(orbitState, {
      angle: `-=${1440}`,
      duration: WAIT_BALL_DURATION,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        scene.ballAngleDeg = orbitState.angle;
        scene.ballRadius = trackRadius(scene.size);
        setBallPosition(scene);
      },
    });
    ballTween.timeScale(initialTimeScale);

    const ballRamp = gsap.to(ballTween, {
      timeScale: 1,
      duration: 2.0,
      ease: 'power2.in',
    });

    waitingTweensRef.current = [wheelTween, ballTween, wheelRamp, ballRamp];
    modeRef.current = 'waiting';
  };

  /* ---- Result animation — realistic 9-second physics ---- */

  const playResultTimeline = (scene: WheelScene, outcome: RouletteOutcome): void => {
    stopAnimation();
    stopIdle();

    // Ensure ball starts in world-space
    reparentBallToRoot(scene);

    const sz = scene.size;
    const tR = trackRadius(sz);
    const dR = deflectorRadius(sz);
    const pR = pocketRadius(sz);

    /*
     * WHEEL: spins 6-8 full turns over 9s, decelerating with power3.out
     * (a heavy brass wheel coasting to a stop with bearing friction)
     */
    const currentWheelDeg = scene.wheelLayer.rotation * RAD_TO_DEG;
    const targetSegmentDeg = -(outcome.wheel_position * SEGMENT_ANGLE);
    const wheelTurns = 6 + Math.floor(Math.random() * 3); // 6-8 turns
    const minTarget = currentWheelDeg + 360 * wheelTurns;
    const turns = Math.ceil((minTarget - targetSegmentDeg) / 360);
    const wheelTargetDeg = targetSegmentDeg + turns * 360;

    /*
     * BALL: orbits counter-clockwise at high speed, gradually spiraling inward.
     * Phase 1 (0-5.5s): Fast orbit on track, radius slowly shrinks from track → deflector
     * Phase 2 (5.5-7s): Ball crosses deflectors — dramatic radius drop + angle jitter
     * Phase 3 (7-8.5s): Ball bounces across pockets (6 bounces, decreasing amplitude)
     * Phase 4 (8.5-9s): Ball settles into final pocket, re-parent to wheel
     */
    const ballStartAngle = scene.ballAngleDeg;
    // Ball makes ~8-10 full CCW orbits during phases 1-2
    const ballOrbits = -(8 + Math.random() * 2) * 360;
    // Phase 1-2 target: ball arrives roughly near the pocket's world position
    // at CROSS_END. Exact angle doesn't matter — we snap to pocket at Phase 3.
    const phase2EndAngle = -90 + (Math.random() * 6 - 3);
    let angleDelta = phase2EndAngle - ballStartAngle + ballOrbits;
    while (angleDelta > -2000) angleDelta -= 360;

    const orbit = {
      angle: ballStartAngle,
      radius: tR,
      // Wobble state — subtle radial oscillation during fast orbit
      wobblePhase: 0,
    };

    modeRef.current = 'resolving';

    const TOTAL_DURATION = 9.0;
    const SPIRAL_END = 5.5; // Ball leaves track
    const CROSS_END = 7.0; // Ball crosses deflectors
    const BOUNCE_END = 8.5; // Bouncing done

    // Pocket center in wheel-local coordinates (PNG frame)
    // In the PNG, pocket i center is at angle -90 + i * SEGMENT_ANGLE
    const pocketLocalDeg = -90 + outcome.wheel_position * SEGMENT_ANGLE;

    const timeline = gsap.timeline({
      defaults: { overwrite: true },
      onComplete: () => {
        // Snap ball to exact pocket center using wheel's final rotation
        const finalWheelDeg = scene.wheelLayer.rotation * RAD_TO_DEG;
        scene.ballAngleDeg = pocketLocalDeg + finalWheelDeg;
        scene.ballRadius = pR;
        setBallPosition(scene);

        stopBallRolling();
        playBallSettle();

        // Re-parent ball into wheel so it rotates with pockets
        reparentBallToWheel(scene);

        // Particles
        const tier = getResultTier(outcome);
        if (tier !== 'none') burstParticles(scene, tier);
        else clearParticles(scene);

        if (tier === 'big' || tier === 'mega') {
          setShaking(true);
          setTimeout(() => setShaking(false), 600);
        }

        modeRef.current = 'idle';
        startIdleRotation(scene);
        onSpinComplete?.();
      },
    });

    /* Wheel deceleration — smooth 9s coast */
    timeline.to(
      scene.wheelLayer,
      {
        rotation: wheelTargetDeg * DEG_TO_RAD,
        duration: TOTAL_DURATION,
        ease: 'power3.out',
      },
      0
    );

    /* Phase 1: Fast orbit on track with gradual spiral inward (0 → 5.5s) */
    timeline.to(
      orbit,
      {
        angle: ballStartAngle + angleDelta * (SPIRAL_END / TOTAL_DURATION),
        radius: dR + (tR - dR) * 0.15, // Spiral to just above deflectors
        wobblePhase: Math.PI * 14, // ~7 wobble cycles
        duration: SPIRAL_END,
        ease: 'power2.out',
        onUpdate: () => {
          // Add subtle radial wobble (ball rattling on track)
          const wobbleAmp = sz * 0.006 * (1 - orbit.wobblePhase / (Math.PI * 14));
          const wobble = Math.sin(orbit.wobblePhase) * wobbleAmp;
          scene.ballAngleDeg = orbit.angle;
          scene.ballRadius = orbit.radius + wobble;
          setBallPosition(scene);
        },
      },
      0
    );

    /* Phase 2: Cross deflectors — dramatic drop (5.5 → 7s) */
    timeline.call(() => onBallDropStart?.(), [], SPIRAL_END);
    timeline.to(
      orbit,
      {
        angle: ballStartAngle + angleDelta * (CROSS_END / TOTAL_DURATION),
        radius: pR + (dR - pR) * 0.3, // Drop through deflectors to near-pocket level
        duration: CROSS_END - SPIRAL_END,
        ease: 'power2.in',
        onUpdate: () => {
          scene.ballAngleDeg = orbit.angle;
          scene.ballRadius = orbit.radius;
          setBallPosition(scene);
        },
      },
      SPIRAL_END
    );

    /*
     * Phase 3-4: Bouncing & settling (7 → 9s)
     *
     * KEY FIX: Instead of animating ball angle independently (which diverges
     * from the wheel due to different easing), we track the winning pocket's
     * actual world-space angle each frame. This guarantees the ball always
     * bounces in the correct pocket.
     *
     * The pocket's local angle in the wheel PNG:
     *   pocketLocalDeg = -90 + wheel_position * SEGMENT_ANGLE
     * Its world angle at time t:
     *   pocketWorldDeg = pocketLocalDeg + wheelLayer.rotation * RAD_TO_DEG
     */

    // Bounce radii — 6 bounces with decreasing amplitude
    const bounceCount = 6;
    const bounceDuration = (BOUNCE_END - CROSS_END) / bounceCount;

    /** Helper: set ball to pocket world angle + radial bounce */
    const updateBallAtPocket = (): void => {
      const wheelDeg = scene.wheelLayer.rotation * RAD_TO_DEG;
      scene.ballAngleDeg = pocketLocalDeg + wheelDeg;
      scene.ballRadius = orbit.radius;
      setBallPosition(scene);
    };

    for (let i = 0; i < bounceCount; i++) {
      const t = CROSS_END + i * bounceDuration;
      const amp = (dR - pR) * 0.35 * Math.pow(0.55, i);
      const bounceUp = pR + amp;

      // Bounce up
      timeline.to(
        orbit,
        {
          radius: bounceUp,
          duration: bounceDuration * 0.4,
          ease: 'power1.out',
          onUpdate: updateBallAtPocket,
        },
        t
      );
      // Bounce down
      timeline.to(
        orbit,
        {
          radius: pR,
          duration: bounceDuration * 0.6,
          ease: 'bounce.out',
          onUpdate: updateBallAtPocket,
        },
        t + bounceDuration * 0.4
      );

      if (i < 4) {
        timeline.call(() => playBallBounce(), [], t + 0.02);
      }
    }

    /* Final settle (8.5 → 9s) — gentle ease to exact pocket floor */
    timeline.to(
      orbit,
      {
        radius: pR,
        duration: TOTAL_DURATION - BOUNCE_END,
        ease: 'sine.inOut',
        onUpdate: updateBallAtPocket,
      },
      BOUNCE_END
    );

    /* Stop rolling sound when bouncing starts */
    timeline.call(() => stopBallRolling(), [], CROSS_END);

    timelineRef.current = timeline;
  };

  /* ---- Bootstrap PixiJS ---- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      const app = new Application();
      await app.init({
        canvas,
        width: size,
        height: size,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
        preserveDrawingBuffer: true,
      });

      const [wheelTexture, trackTexture, ballTexture, p1, p2, p3, p4] = (await Promise.all([
        Assets.load('/assets/roulette/pro/wheel-topdown-2048.png'),
        Assets.load('/assets/roulette/pro/ball-track-ring-2048.png'),
        Assets.load('/assets/roulette/pro/ball-64.png'),
        Assets.load('/assets/roulette/pro/particle-1.png'),
        Assets.load('/assets/roulette/pro/particle-2.png'),
        Assets.load('/assets/roulette/pro/particle-3.png'),
        Assets.load('/assets/roulette/pro/particle-4.png'),
      ])) as Texture[];

      if (cancelled) {
        app.destroy(undefined, { children: true });
        return;
      }

      const root = new Container();
      root.x = size / 2;
      root.y = size / 2;
      app.stage.addChild(root);

      const ambientGlow = new Graphics();
      ambientGlow.circle(0, 0, size * 0.48).fill({ color: 0xc8a04e, alpha: 0.15 });
      root.addChild(ambientGlow);

      const shadow = new Graphics();
      root.addChild(shadow);

      const wheelLayer = new Container();
      const wheel = new Sprite(wheelTexture);
      const track = new Sprite(trackTexture);
      wheel.anchor.set(0.5);
      track.anchor.set(0.5);
      wheelLayer.addChild(wheel, track);
      root.addChild(wheelLayer);

      const ball = new Sprite(ballTexture);
      ball.anchor.set(0.5);
      root.addChild(ball);

      const particleLayer = new Container();
      root.addChild(particleLayer);

      // Ball starts hidden — it only appears when the first spin begins
      ball.visible = false;

      const scene: WheelScene = {
        app,
        root,
        ambientGlow,
        wheelLayer,
        shadow,
        ball,
        particleLayer,
        particleTextures: [p1, p2, p3, p4],
        ballAngleDeg: -90,
        ballRadius: trackRadius(size),
        size,
        ballInWheel: false,
      };

      resizeScene(scene, size);
      sceneRef.current = scene;
      setAssetsLoaded(true);

      startIdleRotation(scene);
      startGlowPulse(scene);
    };

    void bootstrap().catch((err) => {
      console.error('Wheel bootstrap failed:', err);
    });

    return () => {
      cancelled = true;
      stopAnimation();
      stopIdle();
      if (glowTweenRef.current) {
        glowTweenRef.current.kill();
        glowTweenRef.current = null;
      }
      const scene = sceneRef.current;
      if (scene) {
        scene.app.destroy(undefined, { children: true });
        sceneRef.current = null;
      }
      modeRef.current = 'idle';
      resolvedTokenRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Resize */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    resizeScene(scene, size);

    if (modeRef.current === 'idle' && !scene.ballInWheel) {
      scene.ballRadius = trackRadius(size);
      setBallPosition(scene);
    }
  }, [size]);

  /* Spin state machine */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (!spinning) {
      stopAnimation();
      modeRef.current = 'idle';
      if (!idleTweenRef.current) {
        startIdleRotation(scene);
      }
      return;
    }

    if (!spinOutcome) {
      if (modeRef.current !== 'waiting') {
        clearParticles(scene);
        // If ball was in the wheel from previous result, bring it back to world space
        reparentBallToRoot(scene);
        startWaitingSpin(scene);
      }
      return;
    }

    const token = spinToken ?? `${spinOutcome.wheel_position}-${spinOutcome.winning_number}`;
    if (resolvedTokenRef.current === token) return;
    resolvedTokenRef.current = token;
    playResultTimeline(scene, spinOutcome);
  }, [spinning, spinOutcome, spinToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`wh-shell ${shaking ? 'wh-shake' : ''}`}
      aria-live="polite"
      style={{ width: size }}
    >
      {!assetsLoaded && (
        <div className="wh-loading" style={{ width: size, height: size }}>
          <div className="wh-loader" />
          Loading wheel...
        </div>
      )}
      <canvas ref={canvasRef} className="wh-canvas" style={{ width: size, height: size }} />
      {resultNumber != null && !spinning && resultColor && (
        <div className="wh-result">
          <span className={`wh-pill wh-pill--${resultColor}`}>{resultNumber}</span>
          <span style={{ color: '#c8a04e', textTransform: 'uppercase' }}>{resultColor}</span>
        </div>
      )}
    </div>
  );
}

export default RouletteWheel;
