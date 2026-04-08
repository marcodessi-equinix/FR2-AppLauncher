import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

interface SplashIntroProps {
  onExitStart?: () => void;
  onComplete: () => void;
}

/* ─── Lightweight particle canvas (no shadowBlur) ─── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  decay: number;
  hue: number;
}

const SPLASH_TIMINGS = {
  pulse: 120,
  reveal: 360,
  hold: 760,
  dissolve: 980,
  done: 1520,
} as const;

const SPLASH_STATUS_ITEMS = [
  {
    label: 'Connected',
    delayClass: 'splash-status-delay-1',
    dotClass: 'splash-status-dot-connected',
  },
  {
    label: 'Secure',
    delayClass: 'splash-status-delay-2',
    dotClass: 'splash-status-dot-secure',
  },
  {
    label: 'Ready',
    delayClass: 'splash-status-delay-3',
    dotClass: 'splash-status-dot-ready',
  },
] as const;

const useParticleCanvas = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  active: boolean,
  burst: boolean,
) => {
  const particles = useRef<Particle[]>([]);
  const raf = useRef(0);

  const spawn = useCallback((cx: number, cy: number, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      particles.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        r: Math.random() * 2 + 0.5,
        life: 1,
        decay: 1 / (60 * (0.6 + Math.random() * 0.8)),
        hue: 210 + Math.random() * 80,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Ambient particles — low rate, soft cap
    const ambientTimer = setInterval(() => {
      if (particles.current.length < 36) {
        spawn(Math.random() * w, Math.random() * h, 1, 0.3);
      }
    }, 240);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const ps = particles.current;
      let alive = 0;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) continue;
        ps[alive++] = p;
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillStyle = `hsl(${p.hue},80%,70%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ps.length = alive;
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      clearInterval(ambientTimer);
      window.removeEventListener('resize', resize);
    };
  }, [active, canvasRef, spawn]);

  // Burst on demand
  useEffect(() => {
    if (!burst || !canvasRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    spawn(w / 2, h / 2, 24, 3);
  }, [burst, canvasRef, spawn]);
};

/* ─── Main Component ─── */
export const SplashIntro: React.FC<SplashIntroProps> = ({ onExitStart, onComplete }) => {
  type Phase = 'dark' | 'pulse' | 'reveal' | 'hold' | 'dissolve' | 'done';
  const [phase, setPhase] = useState<Phase>('dark');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particlesEnabled] = useState(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
    const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
    const deviceMemory = navigatorWithMemory.deviceMemory ?? 4;
    return !media.matches && hardwareConcurrency >= 4 && deviceMemory >= 4;
  });

  useParticleCanvas(canvasRef, particlesEnabled && phase !== 'done', particlesEnabled && phase === 'reveal');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('pulse'), SPLASH_TIMINGS.pulse),
      setTimeout(() => setPhase('reveal'), SPLASH_TIMINGS.reveal),
      setTimeout(() => setPhase('hold'), SPLASH_TIMINGS.hold),
      setTimeout(() => {
        setPhase('dissolve');
        onExitStart?.();
      }, SPLASH_TIMINGS.dissolve),
      setTimeout(() => { setPhase('done'); onComplete(); }, SPLASH_TIMINGS.done),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, onExitStart]);

  if (phase === 'done') return null;

  const afterReveal = phase === 'reveal' || phase === 'hold' || phase === 'dissolve';
  const afterHold = phase === 'hold' || phase === 'dissolve';

  return (
    <div
      className={cn(
        'splash-shell fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030712] select-none',
        phase === 'dissolve' && 'splash-dissolve',
      )}
    >
      {/* ── Background: gradient aurora ── */}
      <div className="absolute inset-0 splash-aurora" />

      {/* ── Particle canvas (GPU layer) ── */}
      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 pointer-events-none splash-canvas', !particlesEnabled && 'hidden')}
      />

      {/* ── Radial glow behind logo ── */}
      <div
        className={cn(
          'splash-radial-glow absolute h-[620px] w-[620px] rounded-full splash-transition-slow md:h-[760px] md:w-[760px]',
          phase === 'dark' && 'scale-0 opacity-0',
          phase === 'pulse' && 'scale-75 opacity-100 splash-glow-breathe',
          afterReveal && 'scale-100 opacity-100 splash-glow-breathe',
        )}
      />

      {/* ── Spinning ring ── */}
      <svg
        className={cn(
          'absolute h-[360px] w-[360px] splash-transition-medium md:h-[460px] md:w-[460px]',
          phase === 'dark' && 'scale-50 opacity-0',
          phase === 'pulse' && 'scale-90 opacity-60',
          afterReveal && 'scale-100 opacity-100',
        )}
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(220,90%,65%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(270,80%,65%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(220,90%,65%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="100" cy="100" r="90"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="0.8"
          strokeDasharray="120 450"
          className="splash-spin"
        />
        <circle
          cx="100" cy="100" r="80"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="0.5"
          strokeDasharray="80 420"
          className="splash-spin-reverse"
          opacity="0.5"
        />
      </svg>

      {/* ── Center composition ── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo mark */}
        <div
          className={cn(
            'splash-transition-medium splash-ease-premium relative',
            phase === 'dark' && 'scale-50 opacity-0 blur-xl',
            phase === 'pulse' && 'scale-110 opacity-100 blur-0 splash-logo-pulse',
            afterReveal && 'scale-100 opacity-100 blur-0',
          )}
        >
          <img
            src="/logo.png"
            alt="AppLauncher"
            className="h-[220px] w-auto object-contain drop-shadow-[0_0_52px_hsla(220,90%,60%,0.42)] md:h-[280px] lg:h-[320px]"
          />

          {/* Flash on reveal */}
          {phase === 'reveal' && (
            <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl splash-flash" />
          )}
        </div>

        {/* Title */}
        <h1
          className={cn(
            'splash-transition-fast splash-ease-premium mt-10 text-4xl font-black tracking-[0.25em] text-white md:mt-12 md:text-6xl',
            !afterReveal && 'opacity-0 translate-y-8 blur-md',
            afterReveal && 'opacity-100 translate-y-0 blur-0',
          )}
        >
          <span className="relative">
            APPLAUNCHER
            {/* Glow layer */}
            <span
              className="absolute inset-0 text-4xl md:text-6xl font-black tracking-[0.25em] text-blue-400 blur-2xl opacity-40 pointer-events-none select-none"
              aria-hidden="true"
            >
              APPLAUNCHER
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className={cn(
            'splash-subtitle splash-transition-fast mt-3 text-[10px] font-semibold uppercase tracking-[0.5em] delay-200 md:text-xs',
            !afterReveal && 'opacity-0 tracking-[1em]',
            afterReveal && 'opacity-60 tracking-[0.5em]',
          )}
        >
          Your apps. One place.
        </p>

        {/* Status dots */}
        <div
          className={cn(
            'mt-6 flex items-center gap-6 transition-all duration-500 delay-500',
            !afterHold && 'opacity-0 scale-90',
            afterHold && 'opacity-100 scale-100',
          )}
        >
          {SPLASH_STATUS_ITEMS.map(({ label, delayClass, dotClass }) => (
            <div key={label} className={cn('flex items-center gap-1.5 splash-status-item', delayClass)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Loading bar */}
        <div className="mt-6 w-44 h-[2px] rounded-full overflow-hidden bg-white/[0.06]">
          <div
            className={cn(
              'splash-loading-fill h-full rounded-full',
              phase === 'dark' && 'w-0',
              phase === 'pulse' && 'w-1/4',
              phase === 'reveal' && 'w-2/3',
              phase === 'hold' && 'w-[92%]',
              phase === 'dissolve' && 'w-full',
            )}
          />
        </div>
      </div>

      {/* ── Vignette ── */}
      <div className="splash-vignette absolute inset-0 pointer-events-none" />
    </div>
  );
};
