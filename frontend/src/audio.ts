let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.AudioContext === 'undefined') return null;
  if (!audioCtx) audioCtx = new window.AudioContext();
  return audioCtx;
}

function playTone(
  frequency: number,
  durationSeconds: number,
  gainValue: number,
  type: OscillatorType
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
}

export function playSpinSound(): void {
  playTone(140, 0.08, 0.04, 'triangle');
  setTimeout(() => playTone(110, 0.08, 0.03, 'triangle'), 55);
}

export function playWinSound(winMultiplier: number): void {
  const intensity = Math.max(1, Math.min(5, Math.round(winMultiplier)));
  const baseFrequency = 280;
  for (let i = 0; i < intensity; i++) {
    setTimeout(() => {
      playTone(baseFrequency + i * 70, 0.12, 0.03, 'sine');
    }, i * 80);
  }
}
