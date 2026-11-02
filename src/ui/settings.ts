/** The settings sheet (cog, top right in camp): currency, install as app, save backup, reset, credits. */
import { MADE_BY } from '../config';
import { setCurrency } from '../math/problems';
import { VERSION_LABEL, canOfferInstall, updateReady } from '../pwa';
import { exportSaveCode, importSaveCode, persist, resetSave, save } from '../state/save';
import { openSheet, pushKeys, toast } from './dom';
import { gi } from './icons';
import { openInstallSheet } from './install';
import { showIntro } from './camp';

export function openSettings(done: () => void = () => {}) {
  const sheet = openSheet(`<h2>Settings</h2>
    <label class="row-between setting">Currency in money problems <select id="cur">${['€', '$', '£', 'kr '].map(c => `<option value="${c}" ${c === save.currency ? 'selected' : ''}>${c.trim()}</option>`).join('')}</select></label>
    ${canOfferInstall() ? `<button class="btn" id="install">${gi('smartphone')} Add to home screen</button>` : ''}
    <button class="btn" id="how">How to play</button>
    <button class="btn" id="backup">${gi('save')} Backup save</button>
    <button class="btn ghost" id="reset" style="color:var(--bad)">Reset all progress</button>
    <div class="made-by"><span class="label">Made by</span><b>${MADE_BY.name}</b><a href="${MADE_BY.github}" target="_blank" rel="noopener">${MADE_BY.github.replace('https://', '')} ↗</a></div>
    <p class="note small">Your progress is saved only on this device (no account, no tracking). Credits: hero sprite by <a href="https://xzany.itch.io/top-down-adventurer-character" target="_blank" rel="noopener">Mattz Art</a> · icons by Lorc, Delapouite and contributors at <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>)</p>
    <p class="note small center">Version ${VERSION_LABEL}${updateReady() ? ' · <b class="ok">a newer version is ready, see camp</b>' : ''}</p>
    <button class="btn primary" id="close">Done</button>`);
  const close = () => { release(); sheet.remove(); done(); };
  sheet.querySelector<HTMLSelectElement>('#cur')!.addEventListener('change', e => { save.currency = (e.target as HTMLSelectElement).value; setCurrency(save.currency); persist(); });
  sheet.querySelector('#close')!.addEventListener('click', close);
  sheet.querySelector('#install')?.addEventListener('click', () => openInstallSheet());
  sheet.querySelector('#backup')!.addEventListener('click', openBackup);
  sheet.querySelector('#how')!.addEventListener('click', () => showIntro());
  sheet.querySelector('#reset')!.addEventListener('click', () => {
    const c = openSheet(`<h2>Reset everything?</h2><p class="note center">Gold, gear, skills, loadouts and all your answer history on this device will be deleted.</p>
      <div class="row2"><button class="btn" id="no">Keep it</button><button class="btn" id="yes" style="color:var(--bad);border-color:var(--bad)">Reset</button></div>`);
    c.querySelector('#no')!.addEventListener('click', () => c.remove());
    c.querySelector('#yes')!.addEventListener('click', () => { resetSave(); location.reload(); });
  });
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

/**
 * Backup: copy your save as a text code, or paste a code to load it here.
 * That's how progress moves between phones (or from Safari to the home-screen app on older iPhones).
 */
function openBackup() {
  const s = openSheet(`<h2>${gi('save')}Backup save</h2>
    <p class="note center">Copy this code and keep it somewhere safe (notes, a message to yourself). Paste it on another device to continue there.</p>
    <textarea class="save-code" id="code" readonly rows="4">Making your code…</textarea>
    <button class="btn primary" id="copy" disabled>Copy code</button>
    <details class="load-code"><summary class="note">Load a code instead</summary>
      <textarea class="save-code" id="paste" rows="4" placeholder="Paste a code that starts with SQ1-"></textarea>
      <button class="btn danger" id="load">Replace this save</button></details>
    <button class="btn ghost" id="back">Back</button>`);
  const out = s.querySelector<HTMLTextAreaElement>('#code')!, copy = s.querySelector<HTMLButtonElement>('#copy')!;
  persist();
  exportSaveCode().then(code => { out.value = code; copy.disabled = false; }).catch(() => { out.value = 'This browser can’t make backup codes.'; });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(out.value); toast('Code copied'); }
    catch { out.select(); toast('Select the code and copy it'); }
  });
  s.querySelector('#load')!.addEventListener('click', async () => {
    const code = s.querySelector<HTMLTextAreaElement>('#paste')!.value;
    try { await importSaveCode(code); location.reload(); }
    catch { toast('That code didn’t work. Check you copied all of it.'); }
  });
  s.querySelector('#back')!.addEventListener('click', () => s.remove());
}
