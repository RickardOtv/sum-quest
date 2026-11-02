/** The settings sheet (cog, top right in camp): currency, reset, credits. */
import { setCurrency } from '../math/problems';
import { persist, resetSave, save } from '../state/save';
import { openSheet, pushKeys } from './dom';

export function openSettings(done: () => void = () => {}) {
  const sheet = openSheet(`<h2>Settings</h2>
    <label class="row-between setting">Currency in money problems <select id="cur">${['€', '$', '£', 'kr '].map(c => `<option value="${c}" ${c === save.currency ? 'selected' : ''}>${c.trim()}</option>`).join('')}</select></label>
    <button class="btn ghost" id="reset" style="color:var(--bad)">Reset all progress</button>
    <p class="note small">Credits: hero sprite by <a href="https://xzany.itch.io/top-down-adventurer-character" target="_blank" rel="noopener">Mattz Art</a> · icons by Lorc, Delapouite and contributors at <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>)</p>
    <button class="btn primary" id="close">Done</button>`);
  const close = () => { release(); sheet.remove(); done(); };
  sheet.querySelector<HTMLSelectElement>('#cur')!.addEventListener('change', e => { save.currency = (e.target as HTMLSelectElement).value; setCurrency(save.currency); persist(); });
  sheet.querySelector('#close')!.addEventListener('click', close);
  sheet.querySelector('#reset')!.addEventListener('click', () => {
    const c = openSheet(`<h2>Reset everything?</h2><p class="note center">Gold, gear, skills, loadouts and all your answer history on this device will be deleted.</p>
      <div class="row2"><button class="btn" id="no">Keep it</button><button class="btn" id="yes" style="color:var(--bad);border-color:var(--bad)">Reset</button></div>`);
    c.querySelector('#no')!.addEventListener('click', () => c.remove());
    c.querySelector('#yes')!.addEventListener('click', () => { resetSave(); location.reload(); });
  });
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}
