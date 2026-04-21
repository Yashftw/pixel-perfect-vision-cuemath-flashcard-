// ─── Comforting click sound via Web Audio API (no file needed) ───────────────
// A soft, warm "pop" — like a gentle bubble. Works in all modern browsers.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Soft bubble pop — used for card flips, button presses */
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
    osc.stop(ac.currentTime + 0.13);
  } catch (_) { /* silently ignore if audio blocked */ }
}

/** Cheerful success chime — used for correct answers / session complete */
export function playSuccess() {
  try {
    const ac = getCtx();
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const freqs = [523, 659, 784]; // C5 E5 G5
      osc.frequency.setValueAtTime(freqs[i], ac.currentTime + delay);
      gain.gain.setValueAtTime(0.14, ac.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.25);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + 0.26);
    });
  } catch (_) { }
}

/** Soft thud — used for wrong / forgot */
export function playWrong() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.19);
  } catch (_) { }
}

/** Card flip whoosh */
export function playFlip() {
  try {
    const ac = getCtx();
    const bufferSize = ac.sampleRate * 0.06;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start();
  } catch (_) { }
}
