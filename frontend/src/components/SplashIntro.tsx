import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

interface SplashIntroProps {
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
      if (particles.current.length < 80) {
        spawn(Math.random() * w, Math.random() * h, 1, 0.3);
      }
    }, 140);

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
    spawn(w / 2, h / 2, 60, 4);
  }, [burst, canvasRef, spawn]);
};

/* ─── Main Component ─── */
export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
  type Phase = 'dark' | 'pulse' | 'reveal' | 'hold' | 'dissolve' | 'done';
  const [phase, setPhase] = useState<Phase>('dark');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useParticleCanvas(canvasRef, phase !== 'done', phase === 'reveal');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('pulse'), 300),
      setTimeout(() => setPhase('reveal'), 1400),
      setTimeout(() => setPhase('hold'), 2600),
      setTimeout(() => setPhase('dissolve'), 4200),
      setTimeout(() => { setPhase('done'); onComplete(); }, 5400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 'done') return null;

  const afterReveal = phase === 'reveal' || phase === 'hold' || phase === 'dissolve';
  const afterHold = phase === 'hold' || phase === 'dissolve';

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030712] select-none',
        phase === 'dissolve' && 'splash-dissolve',
      )}
    >
      {/* ── Background: gradient aurora ── */}
      <div className="absolute inset-0 splash-aurora" />

      {/* ── Particle canvas (GPU layer) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* ── Radial glow behind logo ── */}
      <div
        className={cn(
          'absolute w-[500px] h-[500px] rounded-full transition-all duration-[1600ms] ease-out',
          phase === 'dark' && 'scale-0 opacity-0',
          phase === 'pulse' && 'scale-75 opacity-100 splash-glow-breathe',
          afterReveal && 'scale-100 opacity-100 splash-glow-breathe',
        )}
        style={{
          background: 'radial-gradient(circle, hsla(220,90%,60%,0.15) 0%, hsla(260,80%,50%,0.08) 40%, transparent 70%)',
        }}
      />

      {/* ── Spinning ring ── */}
      <svg
        className={cn(
          'absolute w-[280px] h-[280px] md:w-[340px] md:h-[340px] transition-all duration-[1200ms]',
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
            'relative transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            phase === 'dark' && 'scale-50 opacity-0 blur-xl',
            phase === 'pulse' && 'scale-110 opacity-100 blur-0 splash-logo-pulse',
            afterReveal && 'scale-100 opacity-100 blur-0',
          )}
        >
          <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-[0_0_40px_hsla(220,90%,60%,0.5)]">
            <defs>
              <linearGradient id="logo-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(220,90%,65%)" />
                <stop offset="100%" stopColor="hsl(270,80%,65%)" />
              </linearGradient>
              <linearGradient id="logo-g2" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <filter id="logo-glow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Arrow body */}
            <path d="M50 8 L90 78 L50 58 L10 78 Z" fill="url(#logo-g1)" filter="url(#logo-glow)" />
            {/* Highlight */}
            <path d="M50 12 L86 76 L50 58 Z" fill="url(#logo-g2)" />
            {/* Spine */}
            <line x1="50" y1="18" x2="50" y2="54" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            {/* Core point */}
            <circle cx="50" cy="36" r="3" fill="white" opacity="0.7">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* Flash on reveal */}
          {phase === 'reveal' && (
            <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl splash-flash" />
          )}
        </div>

        {/* Title */}
        <h1
          className={cn(
            'mt-8 text-4xl md:text-6xl font-black text-white tracking-[0.25em] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
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
            'mt-3 text-[10px] md:text-xs font-semibold uppercase tracking-[0.5em] transition-all duration-[1000ms] delay-200',
            !afterReveal && 'opacity-0 tracking-[1em]',
            afterReveal && 'opacity-60 tracking-[0.5em]',
          )}
          style={{ color: 'hsl(220,80%,75%)' }}
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
          {['Connected', 'Secure', 'Ready'].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5" style={{ transitionDelay: `${600 + i * 150}ms` }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: i === 0 ? '#60a5fa' : i === 1 ? '#34d399' : '#c084fc',
                  boxShadow: `0 0 8px ${i === 0 ? '#60a5fa' : i === 1 ? '#34d399' : '#c084fc'}`,
                }}
              />
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
              'h-full rounded-full transition-all ease-linear',
              phase === 'dark' && 'w-0',
              phase === 'pulse' && 'w-1/4',
              phase === 'reveal' && 'w-2/3',
              phase === 'hold' && 'w-[92%]',
              phase === 'dissolve' && 'w-full',
            )}
            style={{
              background: 'linear-gradient(90deg, hsl(220,90%,60%), hsl(270,80%,65%), hsl(220,90%,60%))',
              backgroundSize: '200% 100%',
              animation: 'splash-bar-shimmer 1.5s linear infinite',
              boxShadow: '0 0 12px hsla(220,90%,60%,0.6)',
              transitionDuration: phase === 'dissolve' ? '800ms' : '1200ms',
            }}
          />
        </div>
      </div>

      {/* ── Vignette ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(3,7,18,0.7) 100%)' }} />
    </div>
  );
};
