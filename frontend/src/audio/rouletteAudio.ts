import { Howl, Howler } from 'howler';

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

const SAMPLE_RATE = 44100;

function synthToneDataUri(
  frequency: number,
  durationSec: number,
  waveType: WaveType,
  volume = 0.2,
  frequencyTo?: number
): string {
  const sampleCount = Math.max(1, Math.floor(SAMPLE_RATE * durationSec));
  const pcm = new Int16Array(sampleCount);

  const twoPi = Math.PI * 2;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / (sampleCount - 1 || 1);
    const freq = frequencyTo == null ? frequency : frequency + (frequencyTo - frequency) * progress;
    const phase = twoPi * freq * t;

    let value = 0;
    if (waveType === 'sine') {
      value = Math.sin(phase);
    } else if (waveType === 'square') {
      value = Math.sign(Math.sin(phase));
    } else if (waveType === 'triangle') {
      value = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else {
      value = 2 * (phase / twoPi - Math.floor(phase / twoPi + 0.5));
    }

    const attack = Math.min(1, i / (sampleCount * 0.04 || 1));
    const release = Math.min(1, (sampleCount - i) / (sampleCount * 0.18 || 1));
    const env = Math.min(attack, release);
    pcm[i] = Math.max(-32767, Math.min(32767, Math.round(value * env * volume * 32767)));
  }

  const dataBytes = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  let offset = 0;

  function writeString(value: string): void {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset++, value.charCodeAt(i));
    }
  }

  writeString('RIFF');
  view.setUint32(offset, 36 + dataBytes, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true); // PCM
  offset += 2;
  view.setUint16(offset, 1, true); // mono
  offset += 2;
  view.setUint32(offset, SAMPLE_RATE, true);
  offset += 4;
  view.setUint32(offset, SAMPLE_RATE * 2, true); // byteRate
  offset += 4;
  view.setUint16(offset, 2, true); // blockAlign
  offset += 2;
  view.setUint16(offset, 16, true); // bitsPerSample
  offset += 2;
  writeString('data');
  view.setUint32(offset, dataBytes, true);
  offset += 4;

  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(offset, pcm[i]!, true);
    offset += 2;
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

interface RouletteSfx {
  chipPlace: Howl;
  chipRemove: Howl;
  spinStart: Howl;
  ballRollLoop: Howl;
  ballBounce: Howl;
  ballSettle: Howl;
  winSmall: Howl;
  winBig: Howl;
  loss: Howl;
}

let sfx: RouletteSfx | null = null;
let rollingSoundId: number | null = null;

function ensureSfx(): RouletteSfx | null {
  if (typeof window === 'undefined') return null;
  if (sfx) return sfx;

  sfx = {
    chipPlace: new Howl({
      src: [synthToneDataUri(860, 0.055, 'square', 0.15)],
      volume: 1,
    }),
    chipRemove: new Howl({
      src: [synthToneDataUri(620, 0.055, 'square', 0.12)],
      volume: 1,
    }),
    spinStart: new Howl({
      src: [synthToneDataUri(210, 0.34, 'sawtooth', 0.17, 690)],
      volume: 1,
    }),
    ballRollLoop: new Howl({
      src: [synthToneDataUri(260, 1.5, 'triangle', 0.08, 320)],
      loop: true,
      volume: 1,
    }),
    ballBounce: new Howl({
      src: [synthToneDataUri(1260, 0.09, 'sine', 0.16)],
      volume: 1,
    }),
    ballSettle: new Howl({
      src: [synthToneDataUri(760, 0.21, 'sine', 0.16, 360)],
      volume: 1,
    }),
    winSmall: new Howl({
      src: [synthToneDataUri(540, 0.35, 'sine', 0.2, 700)],
      volume: 1,
    }),
    winBig: new Howl({
      src: [synthToneDataUri(480, 0.62, 'sine', 0.22, 920)],
      volume: 1,
    }),
    loss: new Howl({
      src: [synthToneDataUri(230, 0.26, 'triangle', 0.12, 170)],
      volume: 1,
    }),
  };

  return sfx;
}

function playCue(cue: keyof RouletteSfx): void {
  const bank = ensureSfx();
  if (!bank) return;
  void bank[cue].play();
}

export function playChipPlace(): void {
  playCue('chipPlace');
}

export function playChipRemove(): void {
  playCue('chipRemove');
}

export function playSpinStart(): void {
  playCue('spinStart');
}

export function startBallRolling(): void {
  const bank = ensureSfx();
  if (!bank) return;
  if (rollingSoundId != null) return;
  rollingSoundId = bank.ballRollLoop.play();
}

export function stopBallRolling(): void {
  const bank = ensureSfx();
  if (!bank || rollingSoundId == null) return;
  bank.ballRollLoop.stop(rollingSoundId);
  rollingSoundId = null;
}

export function playBallBounce(): void {
  playCue('ballBounce');
}

export function playBallSettle(): void {
  playCue('ballSettle');
}

export function playWinSmall(): void {
  playCue('winSmall');
}

export function playWinBig(): void {
  playCue('winBig');
}

export function playLoss(): void {
  playCue('loss');
}

// ---------------------------------------------------------------------------
// Mute toggle — persisted to localStorage
// ---------------------------------------------------------------------------

const MUTE_KEY = 'roulette_muted';

function loadMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

// Apply on load
if (typeof window !== 'undefined') {
  const m = loadMuted();
  Howler.mute(m);
}

export function isMuted(): boolean {
  return loadMuted();
}

export function toggleMute(): void {
  const next = !loadMuted();
  localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  Howler.mute(next);
}
