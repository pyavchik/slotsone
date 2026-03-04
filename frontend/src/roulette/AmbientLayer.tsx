import { useEffect, useRef, useState } from 'react';
import './ambientLayer.css';

const PARTICLE_COUNT = 18;
const BOKEH_COUNT = 5;

interface Particle {
  id: number;
  left: number;
  duration: number;
  delay: number;
  opacity: number;
  sway: number;
  size: number;
}

interface BokehOrb {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  dx: number;
  dy: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    duration: 15 + Math.random() * 15,
    delay: Math.random() * 20,
    opacity: 0.15 + Math.random() * 0.2,
    sway: (Math.random() - 0.5) * 60,
    size: 2 + Math.random() * 2,
  }));
}

function generateBokeh(): BokehOrb[] {
  return Array.from({ length: BOKEH_COUNT }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 80,
    size: 150 + Math.random() * 150,
    duration: 18 + Math.random() * 12,
    delay: Math.random() * 10,
    opacity: 0.04 + Math.random() * 0.05,
    dx: (Math.random() - 0.5) * 40,
    dy: (Math.random() - 0.5) * 30,
  }));
}

export default function AmbientLayer() {
  const [particles] = useState(generateParticles);
  const [bokeh] = useState(generateBokeh);
  const layerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  /* Mouse parallax (desktop only) */
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = parallaxRef.current;
      if (!el) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) * 0.015;
      const dy = (e.clientY - cy) * 0.015;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="al-layer" ref={layerRef}>
      <div className="al-vignette" />
      <div className="al-spotlight" />
      <div className="al-particles" ref={parallaxRef}>
        {particles.map((p) => (
          <div
            key={p.id}
            className="al-particle"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--al-max-opacity': p.opacity,
                '--al-sway': `${p.sway}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      {bokeh.map((b) => (
        <div
          key={`bokeh-${b.id}`}
          className="al-bokeh"
          style={
            {
              left: `${b.left}%`,
              top: `${b.top}%`,
              width: b.size,
              height: b.size,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              '--al-bokeh-opacity': b.opacity,
              '--al-bokeh-dx': `${b.dx}px`,
              '--al-bokeh-dy': `${b.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
