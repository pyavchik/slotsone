/**
 * Programmatic SVG Roulette Wheel Generator
 *
 * Uses polar math to generate a perfect American roulette wheel.
 * Run: npx tsx frontend/src/american-roulette/generate-wheel-svg.ts > wheel.svg
 *
 * This is the technique used by iGaming asset pipelines — polar coordinate
 * math to place segments, numbers, and decorative rings in under 5 seconds.
 */

const WHEEL_ORDER = [
  '0',
  '28',
  '9',
  '26',
  '30',
  '11',
  '7',
  '20',
  '32',
  '17',
  '5',
  '22',
  '34',
  '15',
  '3',
  '24',
  '36',
  '13',
  '1',
  '00',
  '27',
  '10',
  '25',
  '29',
  '12',
  '8',
  '19',
  '31',
  '18',
  '6',
  '21',
  '33',
  '16',
  '4',
  '23',
  '35',
  '14',
  '2',
];

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getColor(label: string): 'red' | 'black' | 'green' {
  if (label === '0' || label === '00') return 'green';
  return REDS.has(Number(label)) ? 'red' : 'black';
}

const COLORS = { red: '#b21f2d', black: '#141118', green: '#1f8a5b' };

const N = WHEEL_ORDER.length; // 38
const CX = 500;
const CY = 500;
const R_OUTER = 460; // outer edge of colored segments
const R_INNER = 180; // inner edge (donut hole)
const R_TEXT = 340; // where numbers sit
const R_RIM_OUTER = 480; // decorative gold rim
const R_DIVOT = 490; // outer chrome ring
const SEG_ANGLE = (2 * Math.PI) / N;

function polarToCart(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  inner = false
): string {
  const end = polarToCart(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const sweep = inner ? 0 : 1;
  return `A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

function generateSVG(): string {
  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">`
  );
  lines.push(`<defs>`);

  // Gold gradient for rim
  lines.push(`  <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="1">`);
  lines.push(`    <stop offset="0%" stop-color="#e8d48b"/>`);
  lines.push(`    <stop offset="50%" stop-color="#d7b46a"/>`);
  lines.push(`    <stop offset="100%" stop-color="#a57c2a"/>`);
  lines.push(`  </linearGradient>`);

  // Radial shadow on hub
  lines.push(`  <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">`);
  lines.push(`    <stop offset="0%" stop-color="#1a1820"/>`);
  lines.push(`    <stop offset="80%" stop-color="#0e0d12"/>`);
  lines.push(`    <stop offset="100%" stop-color="#070608"/>`);
  lines.push(`  </radialGradient>`);

  // Drop shadow filter
  lines.push(`  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">`);
  lines.push(
    `    <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#000" flood-opacity="0.6"/>`
  );
  lines.push(`  </filter>`);

  lines.push(`</defs>`);

  // Background circle (chrome outer ring)
  lines.push(`<circle cx="${CX}" cy="${CY}" r="${R_DIVOT}" fill="#2a2830" filter="url(#shadow)"/>`);

  // Gold rim ring
  lines.push(`<circle cx="${CX}" cy="${CY}" r="${R_RIM_OUTER}" fill="url(#goldRim)"/>`);

  // Segments group — offset by -90deg so 0 is at top
  lines.push(`<g transform="rotate(-90 ${CX} ${CY})">`);

  for (let i = 0; i < N; i++) {
    const label = WHEEL_ORDER[i];
    const color = getColor(label);
    const startAngle = i * SEG_ANGLE;
    const endAngle = (i + 1) * SEG_ANGLE;

    // Build donut-segment path: outer arc → line → inner arc (reverse) → close
    const outerStart = polarToCart(CX, CY, R_OUTER, startAngle);
    const innerStart = polarToCart(CX, CY, R_INNER, endAngle);

    const d = [
      `M ${outerStart.x} ${outerStart.y}`,
      describeArc(CX, CY, R_OUTER, startAngle, endAngle),
      `L ${innerStart.x} ${innerStart.y}`,
      describeArc(CX, CY, R_INNER, endAngle, startAngle, true),
      'Z',
    ].join(' ');

    lines.push(
      `  <path d="${d}" fill="${COLORS[color]}" stroke="rgba(215,180,106,0.45)" stroke-width="1.2"/>`
    );
  }

  // Numbers (rendered inside the rotated group, then counter-rotated for readability)
  for (let i = 0; i < N; i++) {
    const label = WHEEL_ORDER[i];
    const midAngle = (i + 0.5) * SEG_ANGLE;
    const pos = polarToCart(CX, CY, R_TEXT, midAngle);

    // Rotate text to be radial (pointing outward) + 90deg because group is rotated
    const textRotation = (midAngle * 180) / Math.PI + 90;

    lines.push(
      `  <text x="${pos.x.toFixed(2)}" y="${pos.y.toFixed(2)}" ` +
        `fill="#f3efe6" font-family="Manrope, Arial, sans-serif" font-weight="700" ` +
        `font-size="26" text-anchor="middle" dominant-baseline="central" ` +
        `transform="rotate(${textRotation.toFixed(2)} ${pos.x.toFixed(2)} ${pos.y.toFixed(2)})"` +
        `>${label}</text>`
    );
  }

  lines.push(`</g>`);

  // Divider ticks (thin gold lines between segments)
  lines.push(
    `<g transform="rotate(-90 ${CX} ${CY})" stroke="rgba(215,180,106,0.7)" stroke-width="1.5">`
  );
  for (let i = 0; i < N; i++) {
    const angle = i * SEG_ANGLE;
    const outer = polarToCart(CX, CY, R_OUTER, angle);
    const inner = polarToCart(CX, CY, R_INNER, angle);
    lines.push(
      `  <line x1="${outer.x.toFixed(2)}" y1="${outer.y.toFixed(2)}" x2="${inner.x.toFixed(2)}" y2="${inner.y.toFixed(2)}"/>`
    );
  }
  lines.push(`</g>`);

  // Inner hub
  lines.push(`<circle cx="${CX}" cy="${CY}" r="${R_INNER}" fill="url(#hubGrad)"/>`);
  lines.push(
    `<circle cx="${CX}" cy="${CY}" r="${R_INNER}" fill="none" stroke="url(#goldRim)" stroke-width="4"/>`
  );

  // Hub decorative spokes (8 radial lines)
  lines.push(`<g stroke="rgba(215,180,106,0.2)" stroke-width="1">`);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const inner = polarToCart(CX, CY, 40, angle);
    const outer = polarToCart(CX, CY, R_INNER - 10, angle);
    lines.push(
      `  <line x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"/>`
    );
  }
  lines.push(`</g>`);

  // Center jewel
  lines.push(
    `<circle cx="${CX}" cy="${CY}" r="36" fill="#0e0d12" stroke="url(#goldRim)" stroke-width="3"/>`
  );

  // Ball track (subtle ring between rim and segments)
  lines.push(
    `<circle cx="${CX}" cy="${CY}" r="${R_OUTER + 5}" fill="none" stroke="rgba(215,180,106,0.15)" stroke-width="2"/>`
  );

  // Pointer / ball marker at top
  const pointerTip = CY - R_RIM_OUTER - 14;
  const pointerBase = CY - R_OUTER + 8;
  lines.push(
    `<polygon points="${CX},${pointerTip} ${CX - 14},${pointerBase} ${CX + 14},${pointerBase}" ` +
      `fill="url(#goldRim)" stroke="#a57c2a" stroke-width="1"/>`
  );

  // Ball indicator dot
  lines.push(`<circle cx="${CX}" cy="${CY - R_TEXT}" r="8" fill="#f3efe6" opacity="0.9"/>`);

  lines.push(`</svg>`);
  return lines.join('\n');
}

// CLI: output SVG to stdout
if (typeof process !== 'undefined' && process.argv[1]?.includes('generate-wheel-svg')) {
  console.log(generateSVG());
}

export { generateSVG, WHEEL_ORDER, getColor, COLORS, polarToCart };
