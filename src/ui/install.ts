/**
 * "Put Sum Quest on your home screen": the small hint card in camp and the
 * sheet with the steps. On iPhone the player has to do it through Safari's
 * Share menu (Apple has no install button); on Android/desktop Chrome we can
 * open the browser's own install dialog.
 */
import { isIos, promptInstall, snoozeInstallHint, wantsInstallHint } from '../pwa';
import { gi } from './icons';
import { html, openSheet, toast } from './dom';

/** The steps sheet. On Android/Chrome it opens the real install dialog instead. */
export async function openInstallSheet(done: () => void = () => {}) {
  if (!isIos() && await promptInstall()) { done(); return; }
  const sheet = openSheet(`<h2>${gi('smartphone')}Play it like an app</h2>
    <p class="note center">Add Sum Quest to your home screen: it opens full screen, starts instantly, works without internet and keeps your progress safe.</p>
    ${isIos() ? `<ol class="install-steps">
      <li>In <b>Safari</b>, tap <b>•••</b> next to the address bar, then <b>Share</b> <span class="note small">(older iPhones: the Share button <span class="share-ic">⬆︎</span> at the bottom)</span>.</li>
      <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
      <li>Keep <b>Open as Web App</b> switched on and tap <b>Add</b>.</li>
      <li>Start Sum Quest from its new icon.</li></ol>`
    : `<p class="note center">Open your browser's menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>`}
    <p class="note small center">Your progress moves with it automatically. To move it to another phone, use <b>Settings → Backup save</b>.</p>
    <button class="btn primary" id="ok">Got it</button>`);
  const close = () => { sheet.remove(); done(); };
  sheet.querySelector('#ok')!.addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
}

/** The dismissible hint card shown in camp (only when installing makes sense). */
export function installHint(): HTMLElement | null {
  if (!wantsInstallHint()) return null;
  const el = html(`<div class="install-hint">
    <button class="ih-main">${gi('smartphone')}<span><b>Add Sum Quest to your home screen</b><span class="note small">Full screen, offline, progress kept safe</span></span></button>
    <button class="ih-x" aria-label="Hide">✕</button></div>`);
  el.querySelector('.ih-main')!.addEventListener('click', () => openInstallSheet());
  el.querySelector('.ih-x')!.addEventListener('click', () => {
    el.remove();
    const s = openSheet(`<h2>Hide the tip?</h2><p class="note center">You can always find it again under Settings.</p>
      <div class="row2"><button class="btn" id="later">Remind me later</button><button class="btn" id="never">Don't show again</button></div>`);
    s.querySelector('#later')!.addEventListener('click', () => { snoozeInstallHint(); s.remove(); });
    s.querySelector('#never')!.addEventListener('click', () => { snoozeInstallHint(true); s.remove(); toast('Tip hidden'); });
  });
  return el;
}
