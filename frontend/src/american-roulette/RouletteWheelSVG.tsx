/**
 * Monte Carlo Noir — Photorealistic SVG Roulette Wheel
 *
 * Multi-layer construction mimicking real casino wheel anatomy:
 * 1. Mahogany bowl (outer ring with wood-grain gradient)
 * 2. Ball track (polished chrome groove)
 * 3. Deflector diamonds (brass)
 * 4. Rotor with pocket separators (frets)
 * 5. Colored pockets with 3D depth
 * 6. Number ring
 * 7. Cone / hub with decorative inlay
 *
 * All geometry from polar math. Zero bitmaps.
 */
import { forwardRef, useMemo } from 'react';
import { AMERICAN_WHEEL_ORDER, getOutcomeColor } from './constants';
import type { RouletteOutcome } from './types';

interface Props {
  rotation: number;
  winner: RouletteOutcome | null;
  showHighlight: boolean;
  /** Ball absolute angle in radians (SVG coordinate space) */
  ballAngle: number;
  /** Ball distance from center (animates from track to pocket) */
  ballRadius: number;
  /** Whether the ball is visible (hidden before first spin) */
  ballVisible: boolean;
  className?: string;
}

const N = AMERICAN_WHEEL_ORDER.length;
const CX = 500;
const CY = 500;
const SEG = (2 * Math.PI) / N;

// Wheel anatomy radii (outside → inside)
const R_BOWL = 490; // mahogany bowl outer edge
const R_BOWL_INNER = 455; // bowl inner lip
const R_TRACK = 448; // ball track
const R_TRACK_INNER = 430; // track inner edge
const R_FRET_OUTER = 420; // fret (pocket wall) tips
const R_POCKET = 418; // pocket colored area
const R_POCKET_INNER = 310; // pocket bottom
const R_NUMBER = 365; // number placement radius
const R_CONE = 300; // cone outer edge
const R_CONE_MID = 200; // cone mid ring
const R_HUB = 90; // hub decorative center
const R_JEWEL = 32; // center jewel

const COLORS = {
  red: '#c41e2a',
  redDark: '#8b1520',
  black: '#1a1a22',
  blackDark: '#0d0d14',
  green: '#00784a',
  greenDark: '#004d30',
};

function p(r: number, a: number) {
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function arc(r: number, a0: number, a1: number, sweep = 1) {
  const e = p(r, a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `A ${r} ${r} 0 ${large} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function pocketPath(i: number): string {
  const a0 = i * SEG;
  const a1 = (i + 1) * SEG;
  const o0 = p(R_POCKET, a0);
  const i1 = p(R_POCKET_INNER, a1);
  return [
    `M ${o0.x.toFixed(2)} ${o0.y.toFixed(2)}`,
    arc(R_POCKET, a0, a1),
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    arc(R_POCKET_INNER, a1, a0, 0),
    'Z',
  ].join(' ');
}

function fretPath(i: number): string {
  const a = i * SEG;
  const inset = SEG * 0.04;
  const outer1 = p(R_FRET_OUTER, a - inset);
  const outer2 = p(R_FRET_OUTER, a + inset);
  const inner1 = p(R_POCKET_INNER + 2, a - inset * 0.3);
  const inner2 = p(R_POCKET_INNER + 2, a + inset * 0.3);
  return [
    `M ${outer1.x.toFixed(2)} ${outer1.y.toFixed(2)}`,
    `L ${outer2.x.toFixed(2)} ${outer2.y.toFixed(2)}`,
    `L ${inner2.x.toFixed(2)} ${inner2.y.toFixed(2)}`,
    `L ${inner1.x.toFixed(2)} ${inner1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// Pre-computed geometry
const SEGMENTS = AMERICAN_WHEEL_ORDER.map((outcome, i) => {
  const color = getOutcomeColor(outcome);
  const mid = (i + 0.5) * SEG;
  const pos = p(R_NUMBER, mid);
  const textRot = (mid * 180) / Math.PI + 90;
  return { outcome, color, path: pocketPath(i), fret: fretPath(i), pos, textRot };
});

const DEFLECTORS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const tip = p(R_TRACK_INNER + 2, a);
  const base1 = p(R_TRACK_INNER - 10, a - 0.04);
  const base2 = p(R_TRACK_INNER - 10, a + 0.04);
  return `M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${base1.x.toFixed(2)} ${base1.y.toFixed(2)} L ${base2.x.toFixed(2)} ${base2.y.toFixed(2)} Z`;
});

const CONE_RIBS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8;
  const o = p(R_CONE - 4, a);
  const inner = p(R_HUB + 8, a);
  return { x1: o.x, y1: o.y, x2: inner.x, y2: inner.y };
});

const RouletteWheelSVG = forwardRef<SVGSVGElement, Props>(
  ({ rotation, winner, showHighlight, ballAngle, ballRadius, ballVisible, className }, ref) => {
    const rotDeg = (rotation * 180) / Math.PI - 90;

    const winnerIndex = useMemo(() => {
      if (winner == null) return -1;
      return AMERICAN_WHEEL_ORDER.findIndex((v) => v === winner);
    }, [winner]);

    return (
      <svg
        ref={ref}
        viewBox="0 0 1000 1000"
        className={className}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          {/* Mahogany bowl */}
          <radialGradient id="wr-bowl" cx="50%" cy="45%" r="52%">
            <stop offset="0%" stopColor="#5c3a1e" />
            <stop offset="40%" stopColor="#4a2e16" />
            <stop offset="70%" stopColor="#3d2510" />
            <stop offset="100%" stopColor="#2a1a0a" />
          </radialGradient>

          {/* Bowl highlight — top-down spotlight */}
          <radialGradient id="wr-bowl-light" cx="42%" cy="28%" r="55%">
            <stop offset="0%" stopColor="rgba(255,240,200,0.28)" />
            <stop offset="50%" stopColor="rgba(255,220,160,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Chrome ball track */}
          <radialGradient id="wr-track" cx="45%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#c8c8c8" />
            <stop offset="40%" stopColor="#8a8a8a" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </radialGradient>

          {/* Brass accents */}
          <linearGradient id="wr-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dfc87a" />
            <stop offset="35%" stopColor="#c9a84c" />
            <stop offset="65%" stopColor="#b8922e" />
            <stop offset="100%" stopColor="#9a7a20" />
          </linearGradient>

          {/* Cone gradient */}
          <radialGradient id="wr-cone" cx="48%" cy="42%" r="50%">
            <stop offset="0%" stopColor="#3a3040" />
            <stop offset="50%" stopColor="#221c28" />
            <stop offset="100%" stopColor="#141018" />
          </radialGradient>

          {/* Hub */}
          <radialGradient id="wr-hub" cx="45%" cy="38%" r="50%">
            <stop offset="0%" stopColor="#c9a84c" />
            <stop offset="45%" stopColor="#9a7a20" />
            <stop offset="100%" stopColor="#6b5510" />
          </radialGradient>

          {/* Pocket depth shadow */}
          <radialGradient id="wr-pocket-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>

          {/* Winner glow — bright white outer glow */}
          <filter id="wr-win-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Outer shadow */}
          <filter id="wr-outer-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="18" floodColor="#000" floodOpacity="0.7" />
          </filter>

          {/* Inner shadow for pocket depth */}
          <filter id="wr-inner-depth" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* ══════ STATIC LAYERS (bowl, track) ══════ */}

        {/* Drop shadow behind entire wheel */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BOWL + 6}
          fill="rgba(0,0,0,0.5)"
          filter="url(#wr-outer-shadow)"
        />

        {/* Mahogany bowl */}
        <circle cx={CX} cy={CY} r={R_BOWL} fill="url(#wr-bowl)" />

        {/* Wood grain texture (subtle arcs) */}
        {[0.92, 0.86, 0.8, 0.74].map((f, i) => (
          <circle
            key={`grain-${i}`}
            cx={CX}
            cy={CY}
            r={R_BOWL * f}
            fill="none"
            stroke={i % 2 === 0 ? 'rgba(90,55,25,0.3)' : 'rgba(40,25,10,0.25)'}
            strokeWidth={0.8}
          />
        ))}

        {/* Bowl spotlight overlay */}
        <circle cx={CX} cy={CY} r={R_BOWL} fill="url(#wr-bowl-light)" />

        {/* Bowl inner lip (brass ring) */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BOWL_INNER + 4}
          fill="none"
          stroke="url(#wr-brass)"
          strokeWidth={3}
        />

        {/* Chrome ball track */}
        <circle cx={CX} cy={CY} r={R_TRACK} fill="url(#wr-track)" />
        <circle cx={CX} cy={CY} r={R_TRACK_INNER} fill="#1a1a22" />

        {/* Track groove highlights */}
        <circle
          cx={CX}
          cy={CY}
          r={R_TRACK}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_TRACK - 4}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_TRACK_INNER + 1}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={1.5}
        />

        {/* Deflector diamonds (brass, static on bowl) */}
        {DEFLECTORS.map((d, i) => (
          <path
            key={`defl-${i}`}
            d={d}
            fill="url(#wr-brass)"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={0.5}
          />
        ))}

        {/* ══════ SPINNING GROUP (rotor) ══════ */}
        <g transform={`rotate(${rotDeg.toFixed(3)} ${CX} ${CY})`}>
          {/* Rotor base ring */}
          <circle cx={CX} cy={CY} r={R_FRET_OUTER + 2} fill="#1c1c24" />
          <circle
            cx={CX}
            cy={CY}
            r={R_FRET_OUTER + 2}
            fill="none"
            stroke="url(#wr-brass)"
            strokeWidth={2}
          />

          {/* Colored pockets */}
          {SEGMENTS.map((seg) => {
            const c = seg.color;
            const fill = c === 'green' ? COLORS.green : c === 'red' ? COLORS.red : COLORS.black;
            return (
              <path
                key={String(seg.outcome)}
                d={seg.path}
                fill={fill}
                filter="url(#wr-inner-depth)"
              />
            );
          })}

          {/* Pocket depth overlay */}
          {SEGMENTS.map((seg) => (
            <path
              key={`depth-${String(seg.outcome)}`}
              d={seg.path}
              fill="url(#wr-pocket-shadow)"
              opacity={0.5}
            />
          ))}

          {/* Frets (pocket dividers — brass) */}
          {SEGMENTS.map((seg, i) => (
            <path
              key={`fret-${i}`}
              d={seg.fret}
              fill="url(#wr-brass)"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.3}
            />
          ))}

          {/* Winner highlight — white glow + bright stroke outline */}
          {showHighlight && winnerIndex >= 0 && (
            <g className="wr-winner-pulse">
              {/* Bright fill that lightens any pocket color */}
              <path d={SEGMENTS[winnerIndex].path} fill="rgba(255,255,255,0.35)" />
              {/* Glowing white border */}
              <path
                d={SEGMENTS[winnerIndex].path}
                fill="none"
                stroke="#fff"
                strokeWidth={4}
                filter="url(#wr-win-glow)"
              />
            </g>
          )}

          {/* Numbers */}
          {SEGMENTS.map((seg) => (
            <text
              key={`t-${String(seg.outcome)}`}
              x={seg.pos.x.toFixed(2)}
              y={seg.pos.y.toFixed(2)}
              fill="#f0ece2"
              fontFamily="'Playfair Display', 'Georgia', serif"
              fontWeight={700}
              fontSize={22}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${seg.textRot.toFixed(2)} ${seg.pos.x.toFixed(2)} ${seg.pos.y.toFixed(2)})`}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >
              {String(seg.outcome)}
            </text>
          ))}

          {/* Cone (inner slope between pockets and hub) */}
          <circle cx={CX} cy={CY} r={R_CONE} fill="url(#wr-cone)" />
          <circle
            cx={CX}
            cy={CY}
            r={R_CONE}
            fill="none"
            stroke="url(#wr-brass)"
            strokeWidth={2.5}
          />

          {/* Cone ribs (decorative radial lines) */}
          {CONE_RIBS.map((rib, i) => (
            <line
              key={`rib-${i}`}
              x1={rib.x1}
              y1={rib.y1}
              x2={rib.x2}
              y2={rib.y2}
              stroke="rgba(200,170,80,0.12)"
              strokeWidth={1}
            />
          ))}

          {/* Mid cone ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R_CONE_MID}
            fill="none"
            stroke="rgba(200,170,80,0.15)"
            strokeWidth={1}
          />

          {/* Hub — polished brass */}
          <circle cx={CX} cy={CY} r={R_HUB} fill="url(#wr-hub)" />
          <circle
            cx={CX}
            cy={CY}
            r={R_HUB}
            fill="none"
            stroke="rgba(255,240,180,0.3)"
            strokeWidth={1.5}
          />

          {/* Hub concentric rings */}
          <circle
            cx={CX}
            cy={CY}
            r={R_HUB - 12}
            fill="none"
            stroke="rgba(60,45,15,0.6)"
            strokeWidth={1}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_HUB - 24}
            fill="none"
            stroke="rgba(60,45,15,0.4)"
            strokeWidth={0.8}
          />

          {/* Center jewel */}
          <circle cx={CX} cy={CY} r={R_JEWEL} fill="#1a1520" />
          <circle
            cx={CX}
            cy={CY}
            r={R_JEWEL}
            fill="none"
            stroke="url(#wr-brass)"
            strokeWidth={2.5}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_JEWEL - 8}
            fill="none"
            stroke="rgba(200,170,80,0.25)"
            strokeWidth={1}
          />

          {/* Jewel highlight dot */}
          <circle cx={CX - 8} cy={CY - 10} r={6} fill="rgba(255,240,200,0.12)" />
        </g>

        {/* ══════ ANIMATED BALL ══════ */}
        {ballVisible &&
          (() => {
            const bx = CX + ballRadius * Math.cos(ballAngle);
            const by = CY + ballRadius * Math.sin(ballAngle);
            return (
              <g>
                {/* Ball shadow */}
                <circle cx={bx + 2} cy={by + 3} r={10} fill="rgba(0,0,0,0.35)" />
                {/* Ball body — ivory */}
                <circle cx={bx} cy={by} r={9} fill="#e8e4da" />
                {/* Specular highlight */}
                <circle cx={bx - 2.5} cy={by - 3} r={3.5} fill="rgba(255,255,255,0.55)" />
                {/* Edge definition */}
                <circle
                  cx={bx}
                  cy={by}
                  r={9}
                  fill="none"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth={0.8}
                />
              </g>
            );
          })()}
      </svg>
    );
  }
);

RouletteWheelSVG.displayName = 'RouletteWheelSVG';

export default RouletteWheelSVG;
