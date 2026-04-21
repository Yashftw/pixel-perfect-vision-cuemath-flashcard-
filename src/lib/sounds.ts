// ─── Web Audio click/feedback sounds ─────────────────────────────────────────
// All sounds are synthesised — no external files needed.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Soft "pop" — used for button clicks */
export function playClick() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.12);
  } catch (_) { /* silently ignore if audio not available */ }
}

/** Bright "ding" — correct answer / card flip */
export function playFlip() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ac.currentTime + 0.05);
    gain.gain.setValueAtTime(0.14, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.18);
  } catch (_) {}
}

/** Warm "success" chord — session complete / mastered */
export function playSuccess() {
  try {
    const ac = getCtx();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ac.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (_) {}
}

/** Low "thud" — wrong answer */
export function playWrong() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
  } catch (_) {}
}
