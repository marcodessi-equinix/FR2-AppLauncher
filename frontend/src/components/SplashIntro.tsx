import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface SplashIntroProps {
  onExitStart?: () => void;
  onComplete: () => void;
}

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
  pulse: 180,
  reveal: 520,
  hold: 2400,
  dissolve: 2760,
  done: 3340,
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

const SPLASH_LOADING_STEPS = [
  'Initializing workspace shell',
  'Loading application registry',
  'Resolving shortcuts and links',
  'Syncing widgets and layouts',
  'Securing session context',
  'Finalizing launch sequence',
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
      const velocity = speed * (0.4 + Math.random() * 0.6);
      particles.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        r: Math.random() * 2 + 0.5,
        life: 1,
        decay: 1 / (60 * (0.6 + Math.random() * 0.8)),
        hue: 195 + Math.random() * 95,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) {
      return;
    }

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const ambientTimer = setInterval(() => {
      if (particles.current.length < 54) {
        spawn(Math.random() * width, Math.random() * height, 1, 0.34);
      }
    }, 180);

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const currentParticles = particles.current;
      let alive = 0;

      for (let index = 0; index < currentParticles.length; index++) {
        const particle = currentParticles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= particle.decay;

        if (particle.life <= 0) {
          continue;
        }

        currentParticles[alive++] = particle;
        context.globalAlpha = particle.life * 0.72;
        context.fillStyle = `hsl(${particle.hue}, 88%, 72%)`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.fill();
      }

      currentParticles.length = alive;
      context.globalAlpha = 1;
      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      clearInterval(ambientTimer);
      window.removeEventListener('resize', resize);
    };
  }, [active, canvasRef, spawn]);

  useEffect(() => {
    if (!burst || !canvasRef.current) {
      return;
    }

    spawn(window.innerWidth / 2, window.innerHeight / 2, 40, 3.4);
  }, [burst, canvasRef, spawn]);
};

export const SplashIntro: React.FC<SplashIntroProps> = ({ onExitStart, onComplete }) => {
  type Phase = 'dark' | 'pulse' | 'reveal' | 'hold' | 'dissolve' | 'done';

  const [phase, setPhase] = useState<Phase>('dark');
  const [activeLoadingStep, setActiveLoadingStep] = useState(0);
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
      setTimeout(() => {
        setPhase('done');
        onComplete();
      }, SPLASH_TIMINGS.done),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, onExitStart]);

  useEffect(() => {
    if (phase === 'dark' || phase === 'done' || phase === 'dissolve') {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveLoadingStep((current) => Math.min(current + 1, SPLASH_LOADING_STEPS.length - 1));
    }, 320);

    return () => window.clearInterval(interval);
  }, [phase]);

  if (phase === 'done') {
    return null;
  }

  const afterPulse = phase !== 'dark';
  const afterReveal = phase === 'reveal' || phase === 'hold' || phase === 'dissolve';
  const afterHold = phase === 'hold' || phase === 'dissolve';
  const displayedLoadingStep = phase === 'dissolve'
    ? SPLASH_LOADING_STEPS.length - 1
    : activeLoadingStep;
  const loadingProgress = String(Math.round(((displayedLoadingStep + 1) / SPLASH_LOADING_STEPS.length) * 100)).padStart(2, '0');
  const currentLoadingStep = SPLASH_LOADING_STEPS[displayedLoadingStep];

  return (
    <div
      className={cn(
        'splash-shell fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#020816] select-none',
        phase === 'dissolve' && 'splash-dissolve',
      )}
    >
      <div className="absolute inset-0 splash-aurora" />
      <div className="absolute inset-0 splash-grid" />
      <div className="absolute inset-0 splash-light-shafts" />
      <div className="absolute inset-0 splash-noise opacity-35" />

      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 pointer-events-none splash-canvas', !particlesEnabled && 'hidden')}
      />

      <div
        className={cn(
          'splash-radial-glow absolute h-[760px] w-[760px] rounded-full splash-transition-slow md:h-[980px] md:w-[980px] xl:h-[1120px] xl:w-[1120px]',
          phase === 'dark' && 'scale-0 opacity-0',
          phase === 'pulse' && 'scale-75 opacity-100 splash-glow-breathe',
          afterReveal && 'scale-100 opacity-100 splash-glow-breathe',
        )}
      />
      <div
        className={cn(
          'splash-radial-glow-secondary absolute h-[500px] w-[92vw] max-w-[1220px] rounded-full splash-transition-slow',
          phase === 'dark' && 'scale-75 opacity-0',
          phase === 'pulse' && 'scale-95 opacity-70',
          afterReveal && 'scale-100 opacity-100 splash-secondary-breathe',
        )}
      />
      <div
        className={cn(
          'splash-horizon-glow absolute bottom-[10%] h-[220px] w-[96vw] max-w-[1320px] rounded-full splash-transition-slow',
          !afterPulse && 'scale-90 opacity-0',
          afterPulse && 'scale-100 opacity-100',
        )}
      />

      <svg
        className={cn(
          'absolute h-[620px] w-[620px] splash-transition-medium md:h-[820px] md:w-[820px] xl:h-[940px] xl:w-[940px]',
          phase === 'dark' && 'scale-50 opacity-0',
          phase === 'pulse' && 'scale-90 opacity-60',
          afterReveal && 'scale-100 opacity-100',
        )}
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(194, 92%, 72%)" stopOpacity="0.95" />
            <stop offset="50%" stopColor="hsl(222, 92%, 67%)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(284, 88%, 70%)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="0.95"
          strokeDasharray="140 500"
          className="splash-spin"
        />
        <circle
          cx="100"
          cy="100"
          r="81"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="0.55"
          strokeDasharray="84 420"
          className="splash-spin-reverse"
          opacity="0.6"
        />
        <circle
          cx="100"
          cy="100"
          r="69"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="0.3"
          strokeDasharray="52 300"
          className="splash-spin"
          opacity="0.35"
        />
      </svg>

      <div className="absolute inset-x-0 top-[14%] h-px splash-top-line" />

      <div className="relative z-10 flex max-w-[1440px] flex-col items-center px-5 md:px-8">
        <div
          className={cn(
            'splash-logo-stage splash-transition-medium splash-ease-premium relative',
            phase === 'dark' && 'scale-50 opacity-0 blur-xl',
            phase === 'pulse' && 'scale-110 opacity-100 blur-0 splash-logo-pulse',
            afterReveal && 'scale-100 opacity-100 blur-0',
          )}
        >
          <div className="splash-logo-backplate absolute inset-[-12%] rounded-[40%]" />
          <div className="splash-logo-frame absolute inset-[-6%] rounded-[34%]" />
          <div className="splash-logo-sheen absolute inset-[8%] rounded-[30%]" />

          <img
            src="/FR2%20App%20Launcher%20logo%20preview.png"
            alt="AppLauncher"
            className="relative z-10 h-[420px] w-auto object-contain drop-shadow-[0_0_96px_hsla(195,95%,72%,0.58)] md:h-[620px] lg:h-[760px]"
          />

          {phase === 'reveal' && (
            <div className="absolute inset-0 rounded-full bg-white/25 blur-3xl splash-flash" />
          )}

          <div className="splash-logo-reflection absolute left-1/2 top-[95%] h-20 w-[72%] -translate-x-1/2 rounded-full md:h-24" />
        </div>

        <h1
          className={cn(
            'splash-title splash-transition-fast splash-ease-premium mt-8 text-center text-[2.1rem] font-black tracking-[0.2em] md:mt-10 md:text-6xl xl:text-7xl',
            !afterReveal && 'translate-y-8 opacity-0 blur-md',
            afterReveal && 'translate-y-0 opacity-100 blur-0',
          )}
        >
          <span className="splash-title-text relative">
            APPLAUNCHER
            <span
              className="splash-title-glow pointer-events-none absolute inset-0 text-[2.1rem] font-black tracking-[0.2em] select-none md:text-6xl xl:text-7xl"
              aria-hidden="true"
            >
              APPLAUNCHER
            </span>
          </span>
        </h1>

        <p
          className={cn(
            'splash-subtitle splash-transition-fast mt-4 max-w-[900px] text-center text-[10px] font-semibold uppercase tracking-[0.42em] md:text-xs',
            !afterReveal && 'opacity-0 tracking-[1em]',
            afterReveal && 'opacity-70 tracking-[0.42em]',
          )}
        >
          Workspace launch sequence initialized
        </p>

        <div
          className={cn(
            'mt-7 flex flex-wrap items-center justify-center gap-4 transition-all duration-500 delay-500 md:gap-6',
            !afterHold && 'scale-90 opacity-0',
            afterHold && 'scale-100 opacity-100',
          )}
        >
          {SPLASH_STATUS_ITEMS.map(({ label, delayClass, dotClass }) => (
            <div key={label} className={cn('splash-status-item flex items-center gap-1.5', delayClass)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          className={cn(
            'splash-loader-shell splash-transition-fast mt-8 w-[min(92vw,560px)]',
            !afterReveal && 'translate-y-6 opacity-0 blur-md',
            afterReveal && 'translate-y-0 opacity-100 blur-0',
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="splash-loader-label text-[10px] font-bold uppercase tracking-[0.34em] md:text-[11px]">
                Launch Status
              </div>
              <div className="splash-loader-current mt-2 truncate text-[11px] font-semibold tracking-[0.08em] md:text-[12px]">
                {currentLoadingStep}
              </div>
            </div>
            <div className="splash-loader-percent shrink-0 text-[10px] font-bold uppercase tracking-[0.3em] md:text-[11px]">
              {loadingProgress}%
            </div>
          </div>

          <div className="mt-4 h-[8px] overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={cn(
                'splash-loading-fill relative h-full rounded-full',
                phase === 'dark' && 'w-0',
                phase === 'pulse' && 'w-1/4',
                phase === 'reveal' && 'w-2/3',
                phase === 'hold' && 'w-[92%]',
                phase === 'dissolve' && 'w-full',
              )}
            >
              <span className="splash-loading-scan absolute inset-y-[-6px] right-0 w-16 rounded-full" />
              <span className="splash-loading-core absolute inset-y-0 right-0 w-12 rounded-full" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {SPLASH_LOADING_STEPS.map((step, index) => (
              <span
                key={step}
                className={cn(
                  'splash-loader-segment h-[3px] flex-1 rounded-full',
                  index < displayedLoadingStep && 'is-complete',
                  index === displayedLoadingStep && 'is-active',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="splash-vignette absolute inset-0 pointer-events-none" />
    </div>
  );
};
