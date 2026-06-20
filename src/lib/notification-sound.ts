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
  // Ask for OS notification permission on the same gesture.
  try {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch { /* ignore */ }
}

/** Plays a louder, longer alert chime using WebAudio (no asset needed). */
export function playNotificationSound() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.0001;
  // Add a soft compressor so peaks stay loud without clipping.
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 8;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp).connect(c.destination);

  const tone = (freq: number, start: number, dur: number, type: OscillatorType = "triangle", peak = 0.9) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(peak, now + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(g).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  };

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1.0, now + 0.01);
  master.gain.setValueAtTime(1.0, now + 1.2);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

  // Louder, more attention-grabbing 3-beep alert with a sine sweetener.
  const beep = (start: number) => {
    tone(880, start, 0.18, "square", 0.55);
    tone(1320, start, 0.18, "triangle", 0.9);
    tone(1760, start + 0.02, 0.16, "sine", 0.45);
  };
  beep(0);
  beep(0.32);
  beep(0.64);

  // Try to vibrate on mobile for extra alert.
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate?.([180, 90, 180, 90, 180]);
    }
  } catch { /* ignore */ }
}

/** Show an OS-level notification (notification bar) if permission granted.
 *  Uses the service worker when available — this lets the notification persist
 *  in the system tray (Instagram-style) even when the screen is off or the
 *  tab is in background, as long as the page is still open. */
export async function showSystemNotification(title: string, body?: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const opts: NotificationOptions = {
      body: body ?? "",
      icon: "/app-icon.png",
      badge: "/app-icon.png",
      tag: "visitflow-" + Date.now(),
      // Persistent until user dismisses, like Instagram.
      requireInteraction: true,
      vibrate: [200, 100, 200],
    } as NotificationOptions;
    // Prefer the SW registration so notifications keep showing when the tab
    // is hidden / device screen is off.
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, opts);
        return;
      }
    }
    const n = new Notification(title, opts);
    n.onclick = () => { try { window.focus(); n.close(); } catch { /* ignore */ } };
  } catch { /* ignore */ }
}

/** Explicitly prompt for notification permission (button-triggered). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied";
  }
}