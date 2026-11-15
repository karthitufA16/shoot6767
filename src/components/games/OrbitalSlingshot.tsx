import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Star,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { GameState, OrbitalSectorRecord } from '../../types/games';
import { soundEngine } from '../../utils/sound';

interface Body {
  x: number;
  y: number;
  radius: number;
  mass: number; // Positive = gravity attractor, Negative = repulsor
  color: string;
  ringColor: string;
  label: string;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

interface StarTarget {
  x: number;
  y: number;
  collected: boolean;
}

interface SectorConfig {
  id: number;
  name: string;
  subtitle: string;
  parLaunches: number;
  launch: { x: number; y: number };
  target: { x: number; y: number; radius: number };
  bodies: Body[];
  obstacles: Obstacle[];
  stars: Array<{ x: number; y: number }>;
  defaultAngleDeg: number;
  defaultPower: number;
}

interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: Array<{ x: number; y: number }>;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface OrbitalSlingshotProps {
  records: Record<number, OrbitalSectorRecord>;
  onRecordUpdate: (sectorId: number, stars: number, launches: number) => void;
  onBackToHub: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
}

const LOGICAL_WIDTH = 900;
const LOGICAL_HEIGHT = 520;
const GRAVITY_CONSTANT = 1.35;
const MAX_SPEED = 11.5;
const MIN_SPEED = 2.6;

const HANDCRAFTED_SECTORS: SectorConfig[] = [
  {
    id: 1,
    name: "Kepler's Curve",
    subtitle: 'Use planetary gravity to bend your probe around the horizon into the warp gate.',
    parLaunches: 2,
    launch: { x: 115, y: 400 },
    target: { x: 775, y: 150, radius: 24 },
    bodies: [
      {
        x: 450,
        y: 270,
        radius: 44,
        mass: 3600,
        color: '#2563eb',
        ringColor: 'rgba(56, 189, 248, 0.25)',
        label: 'Attractor',
      },
    ],
    obstacles: [],
    stars: [
      { x: 315, y: 185 },
      { x: 470, y: 145 },
      { x: 635, y: 140 },
    ],
    defaultAngleDeg: -42,
    defaultPower: 64,
  },
  {
    id: 2,
    name: 'Binary Waltz',
    subtitle: 'Thread an S-curve between twin gravitational wells to gather all three beacons.',
    parLaunches: 3,
    launch: { x: 100, y: 260 },
    target: { x: 790, y: 260, radius: 24 },
    bodies: [
      {
        x: 345,
        y: 175,
        radius: 34,
        mass: 2800,
        color: '#0284c7',
        ringColor: 'rgba(14, 165, 233, 0.25)',
        label: 'North Well',
      },
      {
        x: 555,
        y: 345,
        radius: 34,
        mass: 2800,
        color: '#0284c7',
        ringColor: 'rgba(14, 165, 233, 0.25)',
        label: 'South Well',
      },
    ],
    obstacles: [],
    stars: [
      { x: 345, y: 275 },
      { x: 450, y: 260 },
      { x: 555, y: 245 },
    ],
    defaultAngleDeg: 18,
    defaultPower: 60,
  },
  {
    id: 3,
    name: 'Asteroid Slingshot',
    subtitle: 'A dense asteroid ridge blocks direct flight. Whip tightly around the dense core.',
    parLaunches: 3,
    launch: { x: 110, y: 420 },
    target: { x: 760, y: 400, radius: 24 },
    bodies: [
      {
        x: 450,
        y: 235,
        radius: 40,
        mass: 4400,
        color: '#1d4ed8',
        ringColor: 'rgba(96, 165, 250, 0.25)',
        label: 'Dense Core',
      },
    ],
    obstacles: [
      { x: 450, y: 385, radius: 24 },
      { x: 450, y: 455, radius: 22 },
      { x: 450, y: 318, radius: 18 },
    ],
    stars: [
      { x: 280, y: 220 },
      { x: 450, y: 115 },
      { x: 635, y: 225 },
    ],
    defaultAngleDeg: -56,
    defaultPower: 72,
  },
  {
    id: 4,
    name: 'Repulsor Anomaly',
    subtitle: 'Amber repulsor cores push probes away. Ricochet off its field toward the high gate.',
    parLaunches: 3,
    launch: { x: 110, y: 390 },
    target: { x: 775, y: 120, radius: 24 },
    bodies: [
      {
        x: 380,
        y: 325,
        radius: 34,
        mass: -2900,
        color: '#d97706',
        ringColor: 'rgba(245, 158, 11, 0.28)',
        label: 'Repulsor',
      },
      {
        x: 615,
        y: 255,
        radius: 36,
        mass: 3200,
        color: '#0284c7',
        ringColor: 'rgba(56, 189, 248, 0.25)',
        label: 'Attractor',
      },
    ],
    obstacles: [{ x: 260, y: 205, radius: 20 }],
    stars: [
      { x: 295, y: 380 },
      { x: 485, y: 220 },
      { x: 655, y: 140 },
    ],
    defaultAngleDeg: -12,
    defaultPower: 68,
  },
  {
    id: 5,
    name: 'The Meridian Shield',
    subtitle: 'Thread the narrow corridor between twin barriers and curve back into the gate.',
    parLaunches: 4,
    launch: { x: 120, y: 130 },
    target: { x: 765, y: 390, radius: 24 },
    bodies: [
      {
        x: 470,
        y: 260,
        radius: 42,
        mass: 4100,
        color: '#0369a1',
        ringColor: 'rgba(56, 189, 248, 0.25)',
        label: 'Meridian Mass',
      },
    ],
    obstacles: [
      { x: 320, y: 150, radius: 22 },
      { x: 320, y: 370, radius: 22 },
      { x: 615, y: 160, radius: 20 },
    ],
    stars: [
      { x: 245, y: 245 },
      { x: 470, y: 395 },
      { x: 635, y: 320 },
    ],
    defaultAngleDeg: 32,
    defaultPower: 66,
  },
  {
    id: 6,
    name: 'Grand Resonance',
    subtitle: 'Master three interacting fields in a single continuous gravitational slingshot.',
    parLaunches: 4,
    launch: { x: 100, y: 260 },
    target: { x: 795, y: 260, radius: 24 },
    bodies: [
      {
        x: 310,
        y: 155,
        radius: 30,
        mass: 2600,
        color: '#0284c7',
        ringColor: 'rgba(56, 189, 248, 0.24)',
        label: 'Alpha',
      },
      {
        x: 475,
        y: 350,
        radius: 32,
        mass: -2700,
        color: '#d97706',
        ringColor: 'rgba(245, 158, 11, 0.26)',
        label: 'Repulsor',
      },
      {
        x: 640,
        y: 165,
        radius: 32,
        mass: 3100,
        color: '#1d4ed8',
        ringColor: 'rgba(96, 165, 250, 0.25)',
        label: 'Omega',
      },
    ],
    obstacles: [{ x: 475, y: 195, radius: 18 }],
    stars: [
      { x: 310, y: 270 },
      { x: 475, y: 270 },
      { x: 645, y: 270 },
    ],
    defaultAngleDeg: -22,
    defaultPower: 65,
  },
];

function createProceduralSector(seedNumber: number): SectorConfig {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const launchY = rand(140, 380);
  const targetY = rand(120, 400);

  const bodyCount = 2 + Math.floor(Math.random() * 2);
  const bodies: Body[] = [];
  for (let i = 0; i < bodyCount; i++) {
    const isRepulsor = i === 1 && Math.random() > 0.45;
    const x = 280 + i * 165 + rand(-35, 35);
    const y = rand(130, 390);
    bodies.push({
      x,
      y,
      radius: rand(28, 38),
      mass: isRepulsor ? -rand(2200, 3000) : rand(2600, 3800),
      color: isRepulsor ? '#d97706' : '#0284c7',
      ringColor: isRepulsor ? 'rgba(245, 158, 11, 0.26)' : 'rgba(56, 189, 248, 0.24)',
      label: isRepulsor ? 'Repulsor' : `Well ${i + 1}`,
    });
  }

  const stars = [
    { x: rand(240, 360), y: rand(110, 410) },
    { x: rand(410, 530), y: rand(110, 410) },
    { x: rand(590, 700), y: rand(110, 410) },
  ];

  return {
    id: 100 + seedNumber,
    name: `Procedural Sector #${seedNumber}`,
    subtitle: 'Randomized gravitational anomaly field. Plot a clean trajectory to the warp gate.',
    parLaunches: 3,
    launch: { x: 105, y: launchY },
    target: { x: 785, y: targetY, radius: 24 },
    bodies,
    obstacles: [
      {
        x: rand(350, 560),
        y: rand(100, 420),
        radius: 18,
      },
    ],
    stars,
    defaultAngleDeg: 0,
    defaultPower: 65,
  };
}

function stepPhysics(
  x: number,
  y: number,
  vx: number,
  vy: number,
  bodies: Body[]
): { x: number; y: number; vx: number; vy: number } {
  let ax = 0;
  let ay = 0;

  for (const body of bodies) {
    const dx = body.x - x;
    const dy = body.y - y;
    const distSq = dx * dx + dy * dy;
    const clampedDistSq = Math.max(distSq, body.radius * body.radius * 0.75);
    const dist = Math.sqrt(clampedDistSq);
    const force = (GRAVITY_CONSTANT * body.mass) / clampedDistSq;
    ax += (force * dx) / dist;
    ay += (force * dy) / dist;
  }

  const nextVx = vx + ax * 0.16;
  const nextVy = vy + ay * 0.16;
  return {
    x: x + nextVx,
    y: y + nextVy,
    vx: nextVx,
    vy: nextVy,
  };
}

export function OrbitalSlingshot({
  records,
  onRecordUpdate,
  onBackToHub,
  soundMuted,
  onToggleMute,
}: OrbitalSlingshotProps) {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [sectorIndex, setSectorIndex] = useState(0);
  const [customSector, setCustomSector] = useState<SectorConfig | null>(null);
  const [proceduralSeed, setProceduralSeed] = useState(1);

  const sector = customSector ?? HANDCRAFTED_SECTORS[sectorIndex];

  const [angleDeg, setAngleDeg] = useState(sector.defaultAngleDeg);
  const [power, setPower] = useState(sector.defaultPower);
  const [launches, setLaunches] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Aim trajectory and launch probe.');
  const [probeSpeed, setProbeSpeed] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<'won' | 'crashed' | null>(null);
  const [earnedStars, setEarnedStars] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const probeRef = useRef<Probe>({
    x: sector.launch.x,
    y: sector.launch.y,
    vx: 0,
    vy: 0,
    active: false,
    trail: [],
    speed: 0,
  });
  const starsRef = useRef<StarTarget[]>(
    sector.stars.map((s) => ({ x: s.x, y: s.y, collected: false }))
  );
  const particlesRef = useRef<Particle[]>([]);
  const isDraggingRef = useRef(false);
  const animTimeRef = useRef(0);

  const starfield = useMemo(() => {
    const pts: Array<{ x: number; y: number; r: number; alpha: number }> = [];
    for (let i = 0; i < 85; i++) {
      pts.push({
        x: ((i * 197 + 41) % 890) + 5,
        y: ((i * 313 + 73) % 510) + 5,
        r: (i % 3) * 0.55 + 0.6,
        alpha: 0.25 + ((i * 29) % 55) / 100,
      });
    }
    return pts;
  }, []);

  const resetSectorState = useCallback((targetSector: SectorConfig) => {
    probeRef.current = {
      x: targetSector.launch.x,
      y: targetSector.launch.y,
      vx: 0,
      vy: 0,
      active: false,
      trail: [],
      speed: 0,
    };
    starsRef.current = targetSector.stars.map((s) => ({ x: s.x, y: s.y, collected: false }));
    particlesRef.current = [];
    setAngleDeg(targetSector.defaultAngleDeg);
    setPower(targetSector.defaultPower);
    setLaunches(0);
    setCollectedCount(0);
    setProbeSpeed(0);
    setIsFlying(false);
    setLastOutcome(null);
    setEarnedStars(0);
    setStatusMessage('Aim trajectory and launch probe.');
  }, []);

  const recallProbe = useCallback(() => {
    probeRef.current = {
      x: sector.launch.x,
      y: sector.launch.y,
      vx: 0,
      vy: 0,
      active: false,
      trail: [],
      speed: 0,
    };
    starsRef.current = sector.stars.map((s) => ({ x: s.x, y: s.y, collected: false }));
    setCollectedCount(0);
    setProbeSpeed(0);
    setIsFlying(false);
    setStatusMessage('Probe recalled. Adjust angle or power and launch.');
  }, [sector]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 1.2 + Math.random() * 3.2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0,
        maxLife: 24 + Math.floor(Math.random() * 18),
        color,
        size: 1.8 + Math.random() * 2.4,
      });
    }
  }, []);

  const launchProbe = useCallback(() => {
    if (gameState !== 'PLAYING' || probeRef.current.active) return;

    const rad = (angleDeg * Math.PI) / 180;
    const speed = MIN_SPEED + ((power - 10) / 90) * (MAX_SPEED - MIN_SPEED);
    probeRef.current = {
      x: sector.launch.x,
      y: sector.launch.y,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      active: true,
      trail: [{ x: sector.launch.x, y: sector.launch.y }],
      speed,
    };
    starsRef.current = sector.stars.map((s) => ({ x: s.x, y: s.y, collected: false }));
    setCollectedCount(0);
    setLaunches((prev) => prev + 1);
    setIsFlying(true);
    setLastOutcome(null);
    setStatusMessage('Probe in flight — navigating gravity fields.');
    soundEngine.playLaunch();
  }, [angleDeg, gameState, power, sector]);

  const selectHandcraftedSector = useCallback(
    (idx: number) => {
      const target = HANDCRAFTED_SECTORS[idx];
      setCustomSector(null);
      setSectorIndex(idx);
      resetSectorState(target);
      setGameState('PLAYING');
    },
    [resetSectorState]
  );

  const launchProcedural = useCallback(() => {
    const nextSeed = proceduralSeed + 1;
    const proc = createProceduralSector(nextSeed);
    setProceduralSeed(nextSeed);
    setCustomSector(proc);
    resetSectorState(proc);
    setGameState('PLAYING');
  }, [proceduralSeed, resetSectorState]);

  // Keyboard shortcuts during active play
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          launchProbe();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        recallProbe();
      } else if (e.key === 'Escape') {
        setGameState('PAUSED');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, launchProbe, recallProbe]);

  // Main simulation & canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let frameTick = 0;

    const renderFrame = () => {
      animTimeRef.current += 0.03;
      frameTick += 1;

      const dpr = window.devicePixelRatio || 1;
      const targetW = LOGICAL_WIDTH * dpr;
      const targetH = LOGICAL_HEIGHT * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Update physics when playing and probe is active
      const probe = probeRef.current;
      if (gameState === 'PLAYING' && probe.active) {
        const next = stepPhysics(probe.x, probe.y, probe.vx, probe.vy, sector.bodies);
        probe.x = next.x;
        probe.y = next.y;
        probe.vx = next.vx;
        probe.vy = next.vy;
        probe.speed = Math.hypot(probe.vx, probe.vy);
        probe.trail.push({ x: probe.x, y: probe.y });
        if (probe.trail.length > 90) probe.trail.shift();
        if (frameTick % 6 === 0) {
          setProbeSpeed(Number(probe.speed.toFixed(1)));
        }

        // Check star collection
        starsRef.current.forEach((star, idx) => {
          if (!star.collected) {
            const dist = Math.hypot(probe.x - star.x, probe.y - star.y);
            if (dist < 20) {
              star.collected = true;
              const total = starsRef.current.filter((s) => s.collected).length;
              setCollectedCount(total);
              spawnParticles(star.x, star.y, '#fbbf24', 12);
              soundEngine.playStarCollect(idx);
            }
          }
        });

        // Check warp gate arrival
        const distToGate = Math.hypot(probe.x - sector.target.x, probe.y - sector.target.y);
        if (distToGate <= sector.target.radius + 7) {
          probe.active = false;
          setIsFlying(false);
          const starsEarned = Math.max(1, starsRef.current.filter((s) => s.collected).length);
          setEarnedStars(starsEarned);
          setLastOutcome('won');
          setStatusMessage('Warp gate reached. Trajectory locked.');
          spawnParticles(sector.target.x, sector.target.y, '#34d399', 26);
          soundEngine.playSuccess();
          if (!customSector) {
            onRecordUpdate(sector.id, starsEarned, launches);
          }
          setGameState('ROUND_SUMMARY');
        }

        // Check body collisions
        for (const body of sector.bodies) {
          if (Math.hypot(probe.x - body.x, probe.y - body.y) <= body.radius + 6) {
            probe.active = false;
            setIsFlying(false);
            setLastOutcome('crashed');
            setStatusMessage(`Collision with ${body.label}. Adjust angle and relaunch.`);
            spawnParticles(probe.x, probe.y, '#f87171', 18);
            soundEngine.playFailure();
            break;
          }
        }

        // Check obstacle collisions
        if (probe.active) {
          for (const obs of sector.obstacles) {
            if (Math.hypot(probe.x - obs.x, probe.y - obs.y) <= obs.radius + 6) {
              probe.active = false;
              setIsFlying(false);
              setLastOutcome('crashed');
              setStatusMessage('Probe struck an asteroid barrier. Try a wider arc.');
              spawnParticles(probe.x, probe.y, '#f87171', 18);
              soundEngine.playFailure();
              break;
            }
          }
        }

        // Check boundary exit
        if (
          probe.active &&
          (probe.x < -30 ||
            probe.x > LOGICAL_WIDTH + 30 ||
            probe.y < -30 ||
            probe.y > LOGICAL_HEIGHT + 30)
        ) {
          probe.active = false;
          setIsFlying(false);
          setLastOutcome('crashed');
          setStatusMessage('Probe drifted outside sector telemetry range.');
          soundEngine.playFailure();
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life += 1;
        return p.life < p.maxLife;
      });

      // --- DRAW STAGE ---
      // Deep space gradient backdrop
      const bgGrad = ctx.createRadialGradient(450, 260, 40, 450, 260, 560);
      bgGrad.addColorStop(0, '#132038');
      bgGrad.addColorStop(1, '#09111f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Subtle coordinate grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1;
      for (let gx = 60; gx < LOGICAL_WIDTH; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let gy = 60; gy < LOGICAL_HEIGHT; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(LOGICAL_WIDTH, gy);
        ctx.stroke();
      }

      // Starfield
      for (const s of starfield) {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gravity contour rings and planetary bodies
      for (const body of sector.bodies) {
        for (let ring = 1; ring <= 3; ring++) {
          ctx.strokeStyle = body.ringColor;
          ctx.lineWidth = 1;
          ctx.setLineDash(body.mass < 0 ? [5, 5] : []);
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius + ring * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        const bodyGrad = ctx.createRadialGradient(
          body.x - body.radius * 0.3,
          body.y - body.radius * 0.3,
          body.radius * 0.15,
          body.x,
          body.y,
          body.radius
        );
        if (body.mass < 0) {
          bodyGrad.addColorStop(0, '#fbbf24');
          bodyGrad.addColorStop(1, '#b45309');
        } else {
          bodyGrad.addColorStop(0, '#38bdf8');
          bodyGrad.addColorStop(1, body.color);
        }

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fill();

        // Body polarity indicator
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(body.mass < 0 ? 'REPULSE' : 'GRAV', body.x, body.y + body.radius + 16);
      }

      // Asteroid obstacles
      for (const obs of sector.obstacles) {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Resonance stars
      starsRef.current.forEach((star) => {
        if (star.collected) return;
        const pulse = 1 + Math.sin(animTimeRef.current * 2.2) * 0.12;
        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? 10 : 4.2;
          const a = (i * Math.PI) / 4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Target Warp Gate
      const gatePulse = 1 + Math.sin(animTimeRef.current * 1.8) * 0.08;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sector.target.x, sector.target.y, sector.target.radius * gatePulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(sector.target.x, sector.target.y, sector.target.radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GATE', sector.target.x, sector.target.y + sector.target.radius + 16);

      // Predictive Trajectory Arc when probe is ready on launch pad
      if (!probe.active) {
        const rad = (angleDeg * Math.PI) / 180;
        const speed = MIN_SPEED + ((power - 10) / 90) * (MAX_SPEED - MIN_SPEED);
        let simX = sector.launch.x;
        let simY = sector.launch.y;
        let simVx = Math.cos(rad) * speed;
        let simVy = Math.sin(rad) * speed;

        for (let step = 0; step < 60; step++) {
          const next = stepPhysics(simX, simY, simVx, simVy, sector.bodies);
          simX = next.x;
          simY = next.y;
          simVx = next.vx;
          simVy = next.vy;

          const hitBody = sector.bodies.some(
            (b) => Math.hypot(simX - b.x, simY - b.y) <= b.radius + 4
          );
          const hitObs = sector.obstacles.some(
            (o) => Math.hypot(simX - o.x, simY - o.y) <= o.radius + 4
          );
          if (hitBody || hitObs || simX < 0 || simX > LOGICAL_WIDTH || simY < 0 || simY > LOGICAL_HEIGHT) {
            break;
          }

          if (step % 2 === 0) {
            const alpha = Math.max(0.12, 0.85 - step / 70);
            ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.beginPath();
            ctx.arc(simX, simY, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Launch Pad anchor
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sector.launch.x, sector.launch.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Probe trail
      if (probe.trail.length > 1) {
        for (let i = 1; i < probe.trail.length; i++) {
          const prev = probe.trail[i - 1];
          const curr = probe.trail[i];
          const alpha = (i / probe.trail.length) * 0.75;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
      }

      // Probe sprite
      const px = probe.active ? probe.x : sector.launch.x;
      const py = probe.active ? probe.y : sector.launch.y;
      const heading = probe.active
        ? Math.atan2(probe.vy, probe.vx)
        : (angleDeg * Math.PI) / 180;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(heading);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Particles
      for (const p of particlesRef.current) {
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    angleDeg,
    customSector,
    gameState,
    launches,
    onRecordUpdate,
    power,
    sector,
    spawnParticles,
    starfield,
  ]);

  // Pointer aim interaction on canvas
  const updateAimFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || probeRef.current.active || gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    const dx = x - sector.launch.x;
    const dy = y - sector.launch.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return;

    const deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const computedPower = Math.round(Math.min(100, Math.max(10, (dist / 360) * 100)));
    setAngleDeg(deg);
    setPower(computedPower);
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      {/* Sub-header & Game Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Games
            </button>
            <span aria-hidden="true">·</span>
            <span>Entertain</span>
            <span aria-hidden="true">·</span>
            <span>Newtonian Gravity Puzzle</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Orbital Slingshot
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {soundMuted ? 'Sound Off' : 'Sound On'}
          </button>

          {gameState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setGameState('PAUSED')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              type="button"
              onClick={() => setGameState('PLAYING')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}

          <button
            type="button"
            onClick={launchProcedural}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Random Sector
          </button>
        </div>
      </div>

      {/* TITLE MENU STATE */}
      {gameState === 'TITLE_MENU' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-sky-700">
                Physics Arcade · 6 Handcrafted Sectors + Procedural Mode
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
                Plot gravity-assisted arcs across deep space.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Direct paths rarely reach the warp gate. Click and drag directly on the starfield—or
                dial in exact vector angles—to curve your probe around blue attractors and amber
                repulsor anomalies while collecting resonance stars.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => selectHandcraftedSector(0)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Start Game
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={launchProcedural}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Play Procedural Sector
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="text-xs font-semibold text-slate-500 mb-3">Select Sector</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HANDCRAFTED_SECTORS.map((s, idx) => {
                  const rec = records[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectHandcraftedSector(idx)}
                      className="flex flex-col items-start justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-left hover:border-sky-500 hover:bg-white transition-colors cursor-pointer"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-xs text-slate-500">0{s.id}</span>
                        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-amber-600">
                          {rec ? `${rec.stars}/3 Stars` : 'Unplayed'}
                        </span>
                      </div>
                      <span className="mt-1 font-display text-sm font-semibold text-slate-900">
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PLAY / PAUSED / SUMMARY VIEW */}
      {gameState !== 'TITLE_MENU' && (
        <div className="space-y-4">
          {/* Tidy HUD Bar above Stage */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div>
              <div className="text-xs text-slate-500">Sector</div>
              <div className="font-display text-sm font-semibold text-slate-900 truncate">
                {sector.name}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Stars Collected</div>
              <div className="font-mono text-sm font-semibold text-amber-600 tabular-nums">
                {collectedCount} / {sector.stars.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Launches</div>
              <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {launches} <span className="text-xs font-normal text-slate-500">(Par {sector.parLaunches})</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Velocity</div>
              <div className="font-mono text-sm font-semibold text-sky-700 tabular-nums">
                {probeSpeed.toFixed(1)} km/s
              </div>
            </div>
          </div>

          {/* Main Interactive Starfield Canvas */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                updateAimFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (isDraggingRef.current) {
                  updateAimFromPointer(e.clientX, e.clientY);
                }
              }}
              onPointerUp={() => {
                isDraggingRef.current = false;
              }}
              onPointerLeave={() => {
                isDraggingRef.current = false;
              }}
              className="block w-full aspect-[900/520] cursor-crosshair touch-none"
            />

            {/* Pause Overlay */}
            {gameState === 'PAUSED' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-6">
                <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-center text-white">
                  <h3 className="font-display text-xl font-bold">Simulation Paused</h3>
                  <p className="mt-2 text-sm text-slate-300">{sector.subtitle}</p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGameState('PLAYING')}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameState('TITLE_MENU')}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      Sector Menu
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Round Summary Overlay */}
            {gameState === 'ROUND_SUMMARY' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
                <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-white">
                  <div className="text-xs font-medium text-emerald-400">
                    Warp Gate Cleared · {sector.name}
                  </div>
                  <h3 className="mt-1 font-display text-2xl font-bold">Trajectory Locked</h3>

                  <div className="mt-4 flex items-center gap-2">
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        className={`h-6 w-6 ${
                          n <= earnedStars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-mono text-sm text-slate-300">
                      {earnedStars} / 3 Stars · {launches} {launches === 1 ? 'Launch' : 'Launches'}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {!customSector && sectorIndex < HANDCRAFTED_SECTORS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => selectHandcraftedSector(sectorIndex + 1)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                      >
                        Next Sector
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={launchProcedural}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                      >
                        New Random Sector
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        resetSectorState(sector);
                        setGameState('PLAYING');
                      }}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Precision Launch Control Deck */}
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <label htmlFor="orbital-angle">Launch Angle</label>
                <span className="font-mono text-slate-900 tabular-nums">{angleDeg}°</span>
              </div>
              <input
                id="orbital-angle"
                type="range"
                min={-180}
                max={180}
                value={angleDeg}
                onChange={(e) => setAngleDeg(Number(e.target.value))}
                className="atelier-slider w-full"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <label htmlFor="orbital-power">Thruster Power</label>
                <span className="font-mono text-slate-900 tabular-nums">{power}%</span>
              </div>
              <input
                id="orbital-power"
                type="range"
                min={10}
                max={100}
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="atelier-slider w-full"
              />
            </div>

            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={recallProbe}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Shot
              </button>
              <button
                type="button"
                onClick={launchProbe}
                disabled={isFlying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                Launch Probe
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
            <span>
              Status:{' '}
              <strong
                className={
                  lastOutcome === 'crashed'
                    ? 'text-red-600'
                    : lastOutcome === 'won'
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }
              >
                {statusMessage}
              </strong>
            </span>
            <span>Drag anywhere on the starfield to aim · Press Space to launch · R to reset</span>
          </div>
        </div>
      )}
    </section>
  );
}
