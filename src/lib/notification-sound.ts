let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Browsers block audio until a user gesture; call once on first interaction. */
export function unlockNotificationSound() {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}

/** Plays a short two-tone notification chime using WebAudio (no asset needed). */
export function playNotificationSound() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.0001;
  master.connect(c.destination);

  const tone = (freq: number, start: number, dur: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(g).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  };

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
  master.gain.setValueAtTime(0.9, now + 0.45);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  // Two-tone chime: high → higher
  tone(880, 0, 0.22);
  tone(1318, 0.16, 0.28);
}