/**
 * Installable web app ("Add to Home Screen") support:
 * - registers the service worker (public build only) so the game opens instantly and works offline
 * - asks the browser to keep our save data (persistent storage)
 * - knows whether we're running as an installed app, and on which kind of phone
 * - keeps Android/Chrome's own install prompt so a button can trigger it
 */

/** True when the game runs from the home screen (no browser bar around it). */
export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone / iPad (iPadOS reports itself as a Mac with touch). */
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);

/** True inside an iframe (like the claude.ai preview link), where installing isn't possible. */
const inFrame = () => { try { return window.self !== window.top; } catch { return true; } };

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }>; }
let deferredPrompt: InstallPromptEvent | null = null;

/** Can we show an install offer at all here? (iOS: steps to follow; Android/desktop Chrome: a real prompt.) */
export const canOfferInstall = () => !isInstalled() && !inFrame() && (isIos() || deferredPrompt !== null);
/** Android/desktop Chrome: show the browser's own install dialog. Returns false if there isn't one (e.g. iOS). */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  deferredPrompt = null;
  return true;
}

export function setupPwa() {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e as InstallPromptEvent; });
  // Saved progress shouldn't be cleared when the phone runs low on space (installed apps usually get this).
  navigator.storage?.persist?.().catch(() => {});
  // The offline copy is only for the public build: not in dev, not in the single-file preview.
  if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator && !inFrame()) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}

/* ---- the "install me" hint in camp: shown until the player installs or turns it off ---- */
const HINT_KEY = 'sumquest-install-hint';
const SNOOZE_DAYS = 3;

export function wantsInstallHint(): boolean {
  if (!canOfferInstall()) return false;
  try {
    const v = localStorage.getItem(HINT_KEY);
    if (v === 'never') return false;
    return !v || Date.now() > Number(v);
  } catch { return true; }
}
export function snoozeInstallHint(forever = false) {
  try { localStorage.setItem(HINT_KEY, forever ? 'never' : String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* ignore */ }
}
