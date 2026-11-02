/** Tiny DOM helpers shared by every menu and prompt. */
import { fmt, judge, type Problem } from '../math/problems';
import type { AnswerKind } from '../math/mastery';

export const uiRoot = () => document.getElementById('ui')!;

/** Create an element from an HTML string. */
export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

export const esc = (s: string | number) =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const fmtTime = (sec: number) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function vibrate(ms: number | number[]) { try { navigator.vibrate?.(ms); } catch { /* not supported */ } }

/* ---------- one keyboard handler at a time (the top-most prompt owns it) ---------- */
type KeyFn = (e: KeyboardEvent) => boolean | void; // return true when handled
const keyStack: KeyFn[] = [];
export function pushKeys(fn: KeyFn) { keyStack.push(fn); return () => { const i = keyStack.indexOf(fn); if (i >= 0) keyStack.splice(i, 1); }; }
/** Drop every handler (used when a run ends with a prompt still open). */
export function releaseAllKeys() { keyStack.length = 0; }
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // a focused text field keeps its keys, except Enter/Escape which the sheet may want
  if ((e.target as HTMLElement).matches?.('input, textarea') && e.key !== 'Enter' && e.key !== 'Escape') return;
  // newest handler first; the first one that handles the key wins
  for (let i = keyStack.length - 1; i >= 0; i--) { if (keyStack[i](e)) { e.preventDefault(); return; } }
});

/* ---------- overlays (modal sheets) ---------- */
export function openSheet(markup: string, opts: { bottom?: boolean; dim?: boolean } = {}): HTMLElement {
  const wrap = html(`<div class="overlay ${opts.bottom ? 'bottom' : ''} ${opts.dim === false ? 'clear' : ''}"><div class="sheet">${markup}</div></div>`);
  uiRoot().appendChild(wrap);
  return wrap;
}

export function toast(msg: string) {
  const t = html(`<div class="toast">${esc(msg)}</div>`);
  uiRoot().appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

/* ---------- number pad + typed answer ---------- */
export interface AnswerBox {
  el: HTMLElement;
  destroy(): void;
}

/**
 * On-screen keypad bound to an answer display. Physical keyboard works too:
 * digits, '.', Backspace, Enter.
 */
export function numberPad(display: HTMLElement, prefix: string, suffix: string, onSubmit: (v: string) => void, submitLabel = 'Answer'): AnswerBox {
  let value = '';
  const draw = () => { display.innerHTML = value ? esc(prefix + value + suffix) : '<span class="placeholder">?</span>'; };
  const press = (k: string) => {
    if (k === 'go') { if (value) onSubmit(value); return; }
    if (k === 'del') value = value.slice(0, -1);
    else if (k === '.') { if (!value.includes('.')) value += value ? '.' : '0.'; }
    else if (value.length < 9) value = (value === '0' ? '' : value) + k;
    draw();
  };
  const el = html(`<div class="pad">
    ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => `<button data-k="${n}">${n}</button>`).join('')}
    <button data-k=".">.</button><button data-k="0">0</button><button data-k="del" class="del" aria-label="Delete">⌫</button>
    <button data-k="go" class="go" aria-label="Submit">${submitLabel}</button></div>`);
  el.querySelectorAll<HTMLButtonElement>('button').forEach(b =>
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.k!); }));
  const release = pushKeys(e => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === '.' || e.key === ',') press('.');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('go');
    else return false;
    return true;
  });
  draw();
  return { el, destroy: release };
}

/* ---------- the one "type the answer" sheet used everywhere ---------- */
export interface TypedAsk {
  problem: Problem;
  heading: string;        // left label, e.g. "⛨ Ward" or "Forging · exact = 75%"
  note?: string;          // right label or a line under the heading
  submitLabel: string;    // "Cast!", "Forge!", "Open the chest"…
  bottom?: boolean;       // slide up from the bottom (in-run prompts)
  dim?: boolean;          // darken the page behind (default true)
  speedTarget?: number;   // seconds; shows the speed bar when set
  cancellable?: boolean;  // adds a "Not now" button and Escape
  tier?: number;          // colours the heading by tier
  confidence?: boolean;   // first ask "Sure / Not sure", then show the keypad
}
export interface TypedResult {
  value: string; seconds: number; kind: AnswerKind; credit: number; relError: number;
  confident?: boolean;    // the player's call, when `confidence` was asked
}

/** Roughly one typed prompt in `every` asks for a confidence call first. */
export const confidenceDue = (every = 3) => Math.random() < 1 / every;

/** Shows a problem with the keypad and resolves with the judged answer, or null if cancelled. */
export function askTyped(ask: TypedAsk): Promise<TypedResult | null> {
  const p = ask.problem;
  return new Promise(resolve => {
    const sheet = openSheet(`
      <div class="crit-head"><span class="label ${ask.tier ? `t${ask.tier}c` : ''}">${ask.heading}</span>${ask.note ? `<span class="label">${ask.note}</span>` : ''}</div>
      <div class="q">${esc(p.text)}${p.hint ? ` <small>${esc(p.hint)}</small>` : ''}</div>
      <div class="answer num"></div>
      ${ask.speedTarget ? '<div class="speed"><i></i><em style="left:25%"></em><em style="left:50%"></em></div>' : ''}
      <div class="pad-slot"></div>
      ${ask.cancellable ? '<button class="btn ghost" id="cancel">Not now</button>' : ''}`, { bottom: ask.bottom, dim: ask.dim });
    sheet.classList.add('typed-sheet');
    const t0 = performance.now();
    if (ask.speedTarget) {
      const bar = sheet.querySelector<HTMLElement>('.speed i')!, target = ask.speedTarget;
      const raf = () => { if (!sheet.isConnected) return; bar.style.width = `${Math.min(100, ((performance.now() - t0) / 1000 / (2 * target)) * 100)}%`; requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    let done = false, confident: boolean | undefined;
    let pad: ReturnType<typeof numberPad> | null = null;
    const close = () => { done = true; pad?.destroy(); releaseConf?.(); release(); sheet.remove(); };
    const showPad = () => {
      pad = numberPad(sheet.querySelector('.answer')!, p.prefix ?? '', p.suffix ?? '', value => {
        if (done) return;
        const seconds = (performance.now() - t0) / 1000, j = judge(value, p);
        close();
        resolve({ value, seconds, ...j, confident });
      }, ask.submitLabel);
      sheet.querySelector('.pad-slot')!.replaceWith(pad.el);
    };

    // the confidence check: a quick self-judgement before answering (helps you learn what you really know)
    let releaseConf: (() => void) | null = null;
    if (ask.confidence) {
      const conf = html(`<div class="conf"><span class="label center">Before you answer: do you know this one?</span>
        <div class="row2"><button class="btn" data-c="1">Sure <kbd>S</kbd></button><button class="btn" data-c="0">Not sure <kbd>N</kbd></button></div></div>`);
      sheet.querySelector('.pad-slot')!.replaceWith(conf);
      const answer = sheet.querySelector<HTMLElement>('.answer')!;
      answer.hidden = true;
      const choose = (c: boolean) => { if (done) return; confident = c; releaseConf?.(); releaseConf = null; answer.hidden = false; conf.replaceWith(html('<div class="pad-slot"></div>')); showPad(); };
      conf.querySelectorAll<HTMLButtonElement>('[data-c]').forEach(b => b.addEventListener('click', () => choose(b.dataset.c === '1')));
      releaseConf = pushKeys(e => {
        const k = e.key.toLowerCase();
        if (k === 's' || k === 'enter') { choose(true); return true; }
        if (k === 'n' || k === ' ') { choose(false); return true; }
        return false;
      });
    } else showPad();

    sheet.querySelector('#cancel')?.addEventListener('click', () => { close(); resolve(null); });
    const release = pushKeys(e => { if (ask.cancellable && e.key === 'Escape') { close(); resolve(null); return true; } return false; });
  });
}

/** "€7.60" / "35%" — the answer the way the player would type it. */
export const answerText = (p: Problem) => (p.prefix ?? '') + fmt(p.answer) + (p.suffix ?? '');
