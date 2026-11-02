/**
 * Every gear STYLE the sprite can wear: which body regions it recolours and
 * which pieces it attaches (see paperdoll.ts for the format). Items pick a
 * style and supply colours (main / accent), so one style serves many items.
 *
 * Pieces are drawn for down / up / right; left is mirrored automatically.
 * Letters: M m L main (mid/dark/light) · A a accent (mid/dark) · G glow · O outline · S skin shade · . empty
 */
import type { Piece, StyleDef } from './paperdoll';

const P = (part: Piece['part'], anchor: Piece['anchor'], dx: number, dy: number, rows: string[], under = false): Piece => ({ part, anchor, dx, dy, rows, under });

/* ---------- shared pieces ---------- */
const pauldronL = (dy = -1) => P('torso', 'topLeft', -2, dy, ['OLLO', 'LMMm', '.mmO']);
const pauldronR = (dy = -1) => P('torso', 'topRight', -1, dy, ['OLLO', 'mMML', 'Omm.']);
const cuff = (part: Piece['part']) => P(part, 'top', -1, -1, ['aAa']);
const bootTrim = (part: Piece['part']) => P(part, 'top', -1, 0, ['aGa']);

export const STYLES: Record<string, StyleDef> = {
  /* ---- armor ---- */
  tunic: { recolour: { tunic: 'main', strap: 'accent' } },
  jerkin: { recolour: { tunic: 'main', strap: 'accent', collar: 'accent' } },
  chain: { recolour: { tunic: 'main', strap: 'accent' }, pattern: 'chain', pieces: { down: [pauldronL(), pauldronR()], up: [pauldronL(), pauldronR()], right: [pauldronR()] } },
  plate: { recolour: { tunic: 'main', strap: 'accent', collar: 'main' }, pattern: 'plate', pieces: { down: [pauldronL(), pauldronR()], up: [pauldronL(), pauldronR()], right: [pauldronR(), P('torso', 'topLeft', -1, 0, ['Lm', 'mO'])] } },
  robe: { recolour: { tunic: 'main', strap: 'accent', collar: 'accent' }, pieces: {
    down: [P('torso', 'bottom', -6, 0, ['MMMMMMMMMMMMM', 'mMMMMaMMMMMMm', 'mMMMMaMMMMMMm', '.mMMMaMMMMMm.', '.mmmmammmmmm.'], true)],
    up: [P('torso', 'bottom', -6, 0, ['MMMMMMMMMMMMM', 'mMMMMMMMMMMMm', 'mMMMMMMMMMMMm', '.mMMMMMMMMMm.', '.mmmmmmmmmmm.'], true)],
    right: [P('torso', 'bottom', -4, 0, ['MMMMMMMMM', 'mMMMMMaMm', 'mMMMMMaMm', '.mMMMMaM.', '.mmmmmam.'], true)] } },
  /* ---- pants ---- */
  trousers: { recolour: { trousers: 'main' } },
  chainlegs: { recolour: { trousers: 'main' }, pattern: 'chain' },
  skirt: { recolour: { trousers: 'main' }, pieces: { down: [P('torso', 'bottom', -5, 0, ['MMMMMMMMMMM', 'mMMMMMMMMMm', 'aaaaaaaaaaa'], true)], up: [P('torso', 'bottom', -5, 0, ['MMMMMMMMMMM', 'mMMMMMMMMMm', 'aaaaaaaaaaa'], true)], right: [P('torso', 'bottom', -3, 0, ['MMMMMMM', 'mMMMMMm', 'aaaaaaa'], true)] } },
  /* ---- boots ---- */
  sandals: { recolour: { shoes: 'main' } },
  boots: { recolour: { shoes: 'main' }, pieces: { down: [bootTrim('footL'), bootTrim('footR')], up: [bootTrim('footL'), bootTrim('footR')], right: [bootTrim('footL'), bootTrim('footR')] } },
  greaves: { recolour: { shoes: 'main' }, pattern: 'plate', pieces: { down: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])], up: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])], right: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])] } },
  pointy: { recolour: { shoes: 'main' }, pieces: { down: [P('footL', 'bottomLeft', -2, 0, ['Mm']), P('footR', 'bottomRight', 1, 0, ['mM'])], up: [P('footL', 'bottomLeft', -2, 0, ['Mm']), P('footR', 'bottomRight', 1, 0, ['mM'])], right: [P('footR', 'bottomRight', 1, -1, ['.M', 'mM']), P('footL', 'bottomRight', 1, -1, ['.M', 'mM'])] } },
  /* ---- gloves ---- */
  wraps: { recolour: { hands: 'main' } },
  gloves: { recolour: { hands: 'main' }, pieces: { down: [cuff('handL'), cuff('handR')], up: [cuff('handL'), cuff('handR')], right: [cuff('handL'), cuff('handR')] } },
  gauntlets: { recolour: { hands: 'main' }, pattern: 'plate', pieces: { down: [cuff('handL'), cuff('handR')], up: [cuff('handL'), cuff('handR')], right: [cuff('handL'), cuff('handR')] } },
  claws: { recolour: { hands: 'main' }, pieces: { down: [P('handL', 'bottom', -1, 1, ['A.A']), P('handR', 'bottom', -1, 1, ['A.A'])], up: [], right: [P('handR', 'bottom', -1, 1, ['A.A'])] } },
  /* ---- helmets ---- */
  cap: { recolour: { hair: 'main' }, hairRows: 5, pieces: { down: [P('head', 'top', -5, 5, ['aAAAAAAAAAa'])], up: [P('head', 'top', -5, 5, ['aAAAAAAAAAa'])], right: [P('head', 'top', -3, 5, ['aAAAAAAAa'])] } },
  helm: { recolour: { hair: 'main' }, pattern: 'plate', pieces: { down: [P('head', 'top', -4, 9, ['mAmmmmAm'])], up: [], right: [P('head', 'top', 1, 9, ['mAAm'])] } },
  horned: { recolour: { hair: 'main' }, pattern: 'plate', pieces: {
    down: [P('head', 'topLeft', -2, 1, ['A..', 'A..', '.A.']), P('head', 'topRight', 0, 1, ['..A', '..A', '.A.']), P('head', 'top', -4, 9, ['mAmmmmAm'])],
    up: [P('head', 'topLeft', -2, 1, ['A..', 'A..', '.A.']), P('head', 'topRight', 0, 1, ['..A', '..A', '.A.'])],
    right: [P('head', 'top', -2, -1, ['A......', 'A......', '.A.....']), P('head', 'top', 1, 9, ['mAAm'])] } },
  witchhat: { recolour: { hair: 'main' }, hairRows: 3, pieces: {
    down: [P('head', 'top', -9, 3, ['OMMMMMMMMMMMMMMMMMO', '.mmmmmmmmmmmmmmmmm.']), P('head', 'top', -3, -6, ['.....M.', '....MM.', '...MMM.', '..MMMM.', '.MMMMM.', 'MMMMMMM']), P('head', 'top', -4, 2, ['aAAAAAAAa'])],
    up: [P('head', 'top', -9, 3, ['OMMMMMMMMMMMMMMMMMO', '.mmmmmmmmmmmmmmmmm.']), P('head', 'top', -3, -6, ['.....M.', '....MM.', '...MMM.', '..MMMM.', '.MMMMM.', 'MMMMMMM'])],
    right: [P('head', 'top', -8, 3, ['OMMMMMMMMMMMMMMMMO', '.mmmmmmmmmmmmmmmm.']), P('head', 'top', -5, -6, ['M......', 'MM.....', '.MMM...', '.MMMM..', '..MMMM.', '.MMMMMM']), P('head', 'top', -3, 2, ['aAAAAAAa'])] } },
  /* ---- special items ---- */
  scarf: { pieces: { down: [P('head', 'bottom', -3, 0, ['MMMMMM', 'aaaaaa']), P('head', 'bottomLeft', -3, 1, ['.M', 'M.', 'a.'])], up: [P('head', 'bottom', -3, 0, ['MMMMMM', 'aaaaaa']), P('head', 'bottomLeft', -3, 1, ['.M', 'M.', 'a.'])], right: [P('head', 'bottom', -2, 0, ['MMMMM', 'aaaaa']), P('head', 'bottomLeft', -3, 1, ['.M', 'M.', 'a.'])] } },
  // a plain travelling cloak: side strips in front, a shaped cape with folds from behind (same cut as the Warden's, no glow)
  cloak: { pieces: {
    down: [P('torso', 'topLeft', -2, 2, ['AA', 'Mm', 'Mm', 'Mm', 'Ma', 'Mm', 'Mm', 'Mm', 'Ma', 'Mm', 'Mm', 'Mm', 'Mm', 'aa'], true),
           P('torso', 'topRight', 1, 2, ['AA', 'mM', 'mM', 'mM', 'aM', 'mM', 'mM', 'mM', 'aM', 'mM', 'mM', 'mM', 'mM', 'aa'], true)],
    up: [P('torso', 'top', -6, 1, [
      '.OAAAAAAAAAO.',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      '.OMMmMMMmMMO.',
      '.OMMmMMMmMMO.',
      '.OmmmmmmmmmO.',
      '..OOOOOOOOO..'])],
    right: [P('torso', 'topLeft', -3, 1, ['AAA', 'MMm', 'MMm', 'MMm', 'MaM', 'MMm', 'MMm', 'MMm', 'MaM', 'MMm', 'MMm', 'MMm', 'MMm', 'aaa'], true)] } },
  tiara: { pieces: { down: [P('head', 'top', -3, 3, ['.LMAML.', '...G...'])], up: [P('head', 'top', -3, 3, ['.LMMML.'])], right: [P('head', 'top', -1, 3, ['LMAML', '..G..'])] } },
  underpants: { recolour: { trousers: 'accent' }, pieces: { down: [P('torso', 'bottom', -3, 0, ['MMMMMMM', 'aGaaaGa'])], up: [P('torso', 'bottom', -3, 0, ['MMMMMMM', 'aaaaaaa'])], right: [P('torso', 'bottom', -2, 0, ['MMMMM', 'aGaGa'])] } },

  /* ---- the Thornwood Warden set: steel plate, moss-green cloth, a green glow in the slits and runes ---- */
  warden_helm: { clearHair: true, pieces: {
    // sits inside the hair's volume: dome from row 2, visor slit over the eyes (row 10), cheek guards below
    down: [P('head', 'top', -5, 2, [
      '...OOOOO...',
      '..OLLLMMO..',
      '.OLLMMMMmO.',
      '.OLMMMMMmO.',
      '.OMMMMMMmO.',
      '.OMMMMMMmO.',
      '.OmmmmmmmO.',
      '.OmGGmmGGO.',
      '.OmGGmmGGO.',
      '.Om.....mO.',
      '..O.....O..']), P('head', 'top', -1, -1, ['.A.', '.A.', 'AGA'])],
    up: [P('head', 'top', -5, 2, [
      '...OOOOO...',
      '..OLLMmMO..',
      '.OLLMMmMmO.',
      '.OLMMMmMmO.',
      '.OMMMMmMmO.',
      '.OMMMMmMmO.',
      '.OMMMMmMmO.',
      '.OmMMMmMmO.',
      '.OmmmmmmmO.',
      '..OmmmmmO..',
      '...OOOOO...']), P('head', 'top', -1, -1, ['.A.', '.A.', 'AGA'])],
    right: [P('head', 'top', -5, 2, [
      '...OOOOOO..',
      '..OLLLMMMO.',
      '.OLLMMMMMmO',
      '.OLMMMMMMmO',
      '.OMMMMMMMmO',
      '.OMMMMMMMmO',
      '.OmmmmmmmmO',
      '.OmmmmmGGmO',
      '.OmmmmmGGmO',
      '.Omm....mO.',
      '..OO....O..']), P('head', 'top', -3, -1, ['..A.', '.AA.', 'AGA.'])] } },
  warden_plate: { recolour: { tunic: 'main', strap: 'accent', collar: 'main' }, pattern: 'plate', pieces: {
    down: [P('torso', 'topLeft', -1, 3, ['OLLL', 'OLMm', '.Omm']), P('torso', 'topRight', -2, 3, ['LLLO', 'mMLO', 'mmO.']),
      P('torso', 'center', -2, -3, ['.LLL.', 'LMGML', 'LGAGL', 'LMGML', '.mmm.']), P('torso', 'bottom', -4, -2, ['aAAGAAAa', '.aaaaaa.'])],
    up: [P('torso', 'topLeft', -1, 3, ['OLLL', 'OLMm', '.Omm']), P('torso', 'topRight', -2, 3, ['LLLO', 'mMLO', 'mmO.']),
      P('torso', 'center', -3, -3, ['L.....L', '.L...L.', '..mAm..', '...G...', '..mAm..', '.L...L.'])],
    right: [P('torso', 'topRight', -3, 3, ['LLLO', 'mMLO', 'mmO.']), P('torso', 'topLeft', 0, 4, ['Lm', 'Om']), P('torso', 'center', 0, -2, ['LL', 'GA', 'LL']), P('torso', 'bottom', -3, -2, ['aAGAa', '.aaa.'])] } },
  warden_gauntlets: { recolour: { hands: 'main' }, pieces: {
    down: [P('handL', 'top', -1, -1, ['OaGaO', '.LMm.'].map(r => r.slice(1, 4))), P('handR', 'top', -1, -1, ['aGa', 'mML'])],
    up: [P('handL', 'top', -1, -1, ['aGa', 'LMm']), P('handR', 'top', -1, -1, ['aGa', 'mML'])],
    right: [P('handL', 'top', -1, -1, ['aGa', 'LMm']), P('handR', 'top', -1, -1, ['aGa', 'mML'])] } },
  warden_legs: { recolour: { trousers: 'main' }, pieces: {
    down: [P('torso', 'bottom', -2, -1, ['OAAAO', 'OAGAO', 'OAAAO', 'OaAaO', '.OaO.']), P('legL', 'center', -1, -1, ['LL', 'Lm']), P('legR', 'center', 0, -1, ['LL', 'mL'])],
    up: [P('torso', 'bottom', -2, -1, ['OAAAO', 'OAAAO', 'OAAAO', 'OaAaO', '.OaO.'])],
    right: [P('torso', 'bottom', 1, -1, ['OAAO', 'OAGO', 'OAAO', 'OaaO']), P('legR', 'center', 0, -1, ['L', 'L'])] } },
  warden_boots: { recolour: { shoes: 'main' }, pieces: {
    down: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])],
    up: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])],
    right: [P('footL', 'top', -1, -1, ['LLL', 'aGa']), P('footR', 'top', -1, -1, ['LLL', 'aGa'])] } },
  warden_cloak: { pieces: {
    down: [P('torso', 'topLeft', -2, 3, ['AG', 'Mm', 'Mm', 'Mm', 'Ma', 'Mm', 'Mm', 'Mm', 'Ma', 'Mm', 'Mm', 'Mm', 'aa'], true),
           P('torso', 'topRight', 1, 3, ['GA', 'mM', 'mM', 'mM', 'aM', 'mM', 'mM', 'mM', 'aM', 'mM', 'mM', 'mM', 'aa'], true)],
    up: [P('torso', 'top', -6, 2, [
      '.OAAAAGAAAAO.',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      '.OMMmMMMmMMO.',
      '.OMMmMMMmMMO.',
      '.OaAaaAaaAaO.',
      '..OOOOOOOOO..'])],
    right: [P('torso', 'topLeft', -3, 2, ['AAG', 'MMm', 'MMm', 'MMm', 'MaM', 'MMm', 'MMm', 'MMm', 'MaM', 'MMm', 'MMm', 'MMm', 'aAa'], true)] } },
  /* ---- the Ashen Reaver set: blackened iron, ember glow, horns and spikes ---- */
  reaver_helm: { clearHair: true, pieces: {
    down: [P('head', 'top', -6, 1, [
      '.A.........A.',
      '.AA.......AA.',
      '..AOOOOOOOA..',
      '..OLLLMMMMO..',
      '.OLLMMMMMMmO.',
      '.OLMMMMMMMmO.',
      '.OMMMMMMMMmO.',
      '.OMmmmmmmmmO.',
      '.OmGGmmmGGmO.',
      '.OmGGmOmGGmO.',
      '.Om..mOm..mO.',
      '..O..OOO..O..'])],
    up: [P('head', 'top', -6, 1, [
      '.A.........A.',
      '.AA.......AA.',
      '..AOOOOOOOA..',
      '..OLLLAMMMO..',
      '.OLLMMAMMMmO.',
      '.OLMMMAMMMmO.',
      '.OMMMMAMMMmO.',
      '.OMMMMAMMMmO.',
      '.OMMMMAMMMmO.',
      '.OmmmmammmmO.',
      '..OmmmmmmmO..',
      '...OOOOOOO...'])],
    right: [P('head', 'top', -6, 1, [
      '.A........A..',
      '.AA......AA..',
      '..AOOOOOOA...',
      '..OLLLMMMMO..',
      '.OLLMMMMMMMO.',
      '.OLMMMMMMMMmO',
      '.OMMMMMMMMMmO',
      '.OMmmmmmmmmmO',
      '.OmmmmmmGGmmO',
      '.OmmmmmmGGmmO',
      '.Ommm....mmO.',
      '..OOO....OO..'])] } },
  reaver_plate: { recolour: { tunic: 'main', strap: 'accent', collar: 'main' }, pattern: 'plate', pieces: {
    down: [P('torso', 'topLeft', -2, 1, ['A...', 'OLLO', 'LMMm', '.mmO']), P('torso', 'topRight', -1, 1, ['...A', 'OLLO', 'mMML', 'Omm.']),
      P('torso', 'center', -2, -3, ['.LLL.', 'LmGmL', 'LmGmL', '.mGm.', '..m..']), P('torso', 'bottom', -4, -2, ['aAAGAAAa', '.aaaaaa.'])],
    up: [P('torso', 'topLeft', -2, 1, ['A...', 'OLLO', 'LMMm', '.mmO']), P('torso', 'topRight', -1, 1, ['...A', 'OLLO', 'mMML', 'Omm.']),
      P('torso', 'center', -1, -4, ['.A.', 'AMA', '.m.', '.A.', 'AMA', '.m.', '.A.', 'AMA'])],
    right: [P('torso', 'topRight', -3, 1, ['...A', 'OLLO', 'mMML', 'Omm.']), P('torso', 'topLeft', 0, 3, ['Lm', 'Om']), P('torso', 'center', 0, -2, ['LL', 'Gm', 'LL']), P('torso', 'bottom', -3, -2, ['aAGAa', '.aaa.'])] } },
  reaver_claws: { recolour: { hands: 'main' }, pieces: {
    down: [P('handL', 'top', -1, -1, ['AaA', 'mMm']), P('handR', 'top', -1, -1, ['AaA', 'mMm']), P('handL', 'bottom', -1, 1, ['A.A']), P('handR', 'bottom', -1, 1, ['A.A'])],
    up: [P('handL', 'top', -1, -1, ['AaA', 'mMm']), P('handR', 'top', -1, -1, ['AaA', 'mMm'])],
    right: [P('handL', 'top', -1, -1, ['AaA', 'mMm']), P('handR', 'top', -1, -1, ['AaA', 'mMm']), P('handR', 'bottom', -1, 1, ['A.A'])] } },
  reaver_legs: { recolour: { trousers: 'main' }, pattern: 'plate', pieces: {
    down: [P('torso', 'bottom', -2, -1, ['OAAAO', 'OAGAO', 'OaAaO', '.OaO.', '.A.A.']), P('legL', 'center', -1, -1, ['A.', 'LL']), P('legR', 'center', 0, -1, ['.A', 'LL'])],
    up: [P('torso', 'bottom', -2, -1, ['OAAAO', 'OAAAO', 'OaAaO', '.OaO.'])],
    right: [P('torso', 'bottom', 1, -1, ['OAAO', 'OAGO', 'OaaO', '.A..']), P('legR', 'center', 0, -1, ['A', 'L'])] } },
  reaver_boots: { recolour: { shoes: 'main' }, pieces: {
    down: [P('footL', 'top', -1, -1, ['A..', 'aaa']), P('footR', 'top', -1, -1, ['..A', 'aaa'])],
    up: [P('footL', 'top', -1, -1, ['A..', 'aaa']), P('footR', 'top', -1, -1, ['..A', 'aaa'])],
    right: [P('footL', 'top', -1, -1, ['A..', 'aaa']), P('footR', 'top', -1, -1, ['A..', 'aaa'])] } },
  reaver_cloak: { pieces: {
    down: [P('torso', 'topLeft', -2, 3, ['AA', 'Mm', 'Mm', 'Mm', 'Ma', 'Mm', 'Mm', 'Gm', 'Ma', 'Mm', 'M.', 'a.'], true),
           P('torso', 'topRight', 1, 3, ['AA', 'mM', 'mM', 'GM', 'aM', 'mM', 'mM', 'mM', 'aM', 'mM', '.M', '.a'], true)],
    up: [P('torso', 'top', -6, 2, [
      '.OAAAAAAAAAO.',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMGmMMMmMMMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMGMO',
      'OMMMmMMMmMMMO',
      'OMMMmMMMmMMMO',
      '.OMMmMMMmMMO.',
      '.OmMmOMmOmMO.',
      '.O.mO.mO.mO..',
      '....O..O..O..'])],
    right: [P('torso', 'topLeft', -3, 2, ['AAA', 'MMm', 'MGm', 'MMm', 'MaM', 'MMm', 'MMm', 'GMm', 'MaM', 'MMm', 'M.m', 'a.a'], true)] } },

  /* ---- the Starseer set: midnight cloth, silver trim, stars (G) ---- */
  seer_hood: { clearHair: true, pieces: {
    down: [P('head', 'top', -6, 0, [
      '......O......',
      '.....OMO.....',
      '...OOMMMOO...',
      '..OMMLMMMMO..',
      '.OMMMMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMMMMMMMGMO.',
      '.OMmmmmmmmmO.',
      '.OMm.....mMO.',
      '.OMm.....mMO.',
      '.OMm.....mMO.',
      '.OMA.....AMO.',
      '..OA.....AO..'])],
    up: [P('head', 'top', -6, 0, [
      '......O......',
      '.....OMO.....',
      '...OOMMMOO...',
      '..OMMLMMMMO..',
      '.OMMMMMMMMMO.',
      '.OMMMGMMMMMO.',
      '.OMMMMMMMGMO.',
      '.OMMMMMMMMMO.',
      '.OMMGMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMMMMMGMMMO.',
      '.OmAAAAAAAmO.',
      '..OOOOOOOOO..'])],
    right: [P('head', 'top', -6, 0, [
      '....O........',
      '...OMO.......',
      '..OMMMOOO....',
      '.OMMMLMMMMO..',
      '.OMMMMMMMMMO.',
      '.OMMGMMMMMMO.',
      '.OMMMMMMGMMO.',
      '.OMMmmmmmmmO.',
      '.OMMMm.....O.',
      '.OMMMm.....O.',
      '.OMMMm.....O.',
      '.OMMMA.....O.',
      '..OOOA.......'])] } },
  seer_robe: { recolour: { tunic: 'main', strap: 'accent', collar: 'accent' }, pieces: {
    down: [P('handL', 'top', -2, -3, ['.MMM.', 'MMMMM', 'mMMMm']), P('handR', 'top', -2, -3, ['.MMM.', 'MMMMM', 'mMMMm']),
      P('torso', 'center', -3, -3, ['.....A.', '....A..', '...A...', '..A..G.', '.A.....']),
      P('torso', 'bottom', -6, 0, ['MMMMMMMMMMMMM', 'mMMMMMMMMMMMm', 'mMMGMMMMMMMMm', '.aAaAaAaAaAa.'], true)],
    up: [P('handL', 'top', -2, -3, ['.MMM.', 'MMMMM', 'mMMMm']), P('handR', 'top', -2, -3, ['.MMM.', 'MMMMM', 'mMMMm']),
      P('torso', 'center', -3, -3, ['.......', '......G', '.......', '.......', '.G.....']),
      P('torso', 'bottom', -6, 0, ['MMMMMMMMMMMMM', 'mMMMMMMMMMMMm', 'mMMMMMMMMMGMm', '.aAaAaAaAaAa.'], true)],
    right: [P('handL', 'top', -2, -3, ['.MMM.', 'MMMMM', 'mMMMm']),
      P('torso', 'center', -1, -3, ['..A', '.A.', 'A..', '..G']),
      P('torso', 'bottom', -4, 0, ['MMMMMMMMM', 'mMMMGMMMm', 'mMMMMMMMm', '.aAaAaAa.'], true)] } },
  seer_gloves: { recolour: { hands: 'main' }, pieces: {
    down: [P('handL', 'top', -1, -1, ['aGa']), P('handR', 'top', -1, -1, ['aGa'])],
    up: [P('handL', 'top', -1, -1, ['aGa']), P('handR', 'top', -1, -1, ['aGa'])],
    right: [P('handL', 'top', -1, -1, ['aGa']), P('handR', 'top', -1, -1, ['aGa'])] } },
  seer_skirt: { recolour: { trousers: 'main' }, pieces: {
    down: [P('torso', 'bottom', -7, -2, ['MMMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMM', 'MMMGMMMMMMMMMMM', 'mMMMMMMMMMMMMMm', 'mMMMMMMMMMGMMMm', '.mMMMMMMMMMMMm.', '.aAaAaAaAaAaAa.'])],
    up: [P('torso', 'bottom', -7, -2, ['MMMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMM', 'MMMMMMMMMMGMMMM', 'mMMMMMMMMMMMMMm', 'mMMMGMMMMMMMMMm', '.mMMMMMMMMMMMm.', '.aAaAaAaAaAaAa.'])],
    right: [P('torso', 'bottom', -4, -2, ['MMMMMMMMM', 'MMMMMMMMM', 'MMGMMMMMM', 'mMMMMMMMm', 'mMMMMMGMm', '.mMMMMMm.', '.aAaAaAa.'])] } },
  seer_slippers: { recolour: { shoes: 'main' }, pieces: {
    down: [P('footL', 'top', -1, 0, ['aGa']), P('footR', 'top', -1, 0, ['aGa'])],
    up: [P('footL', 'top', -1, 0, ['aGa']), P('footR', 'top', -1, 0, ['aGa'])],
    right: [P('footL', 'top', -1, 0, ['aGa']), P('footR', 'top', -1, 0, ['aGa'])] } },
  seer_mantle: { pieces: {
    down: [P('torso', 'topLeft', -2, 2, ['AA', 'Mm', 'MG', 'Mm', 'Mm', 'aa'], true), P('torso', 'topRight', 1, 2, ['AA', 'mM', 'mM', 'GM', 'mM', 'aa'], true)],
    up: [P('torso', 'top', -6, 1, [
      '.OAAAAAAAAAO.',
      'OMMMMMMMMMMMO',
      'OMMGMMMMMMMMO',
      'OMMMMMMMGMMMO',
      'OMMMMMMMMMMMO',
      'OMGMMMMMMMMMO',
      '.OaAaAaAaAaO.',
      '..OOOOOOOOO..'])],
    right: [P('torso', 'topLeft', -3, 1, ['AAA', 'MMm', 'MGm', 'MMm', 'MMm', 'aAa'], true)] } },

  /* ---- the Wild Hunt set: forest leather, fur (accent) and a feather ---- */
  hunt_hood: { clearHair: true, pieces: {
    down: [P('head', 'top', -6, 1, [
      '..........L..',
      '...OOOOO.LA..',
      '..OMMMMMOLA..',
      '.OMMMMMMMALO.',
      '.OMMMMMMMMMO.',
      '.OMmmmmmmmmO.',
      '.OMm.....mMO.',
      '.OMm.....mMO.',
      '.OMm.....mMO.',
      '.OMa.....aMO.',
      '..Oa.....aO..',
      '...O.....O...'])],
    up: [P('head', 'top', -6, 1, [
      '..L..........',
      '..AL.OOOOO...',
      '..ALOMMMMMO..',
      '.OLAMMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMMMMMMMMMO.',
      '.OMmmmmmmmMO.',
      '.OmaaaaaaamO.',
      '..OOOOOOOOO..',
      '.............'])],
    right: [P('head', 'top', -6, 1, [
      '....L........',
      '...LA.OOOO...',
      '..OLAMMMMMO..',
      '.OMALMMMMMMO.',
      '.OMMMMMMMMMMO',
      '.OMMMmmmmmmmO',
      '.OMMMm......O',
      '.OMMMm.......',
      '.OMMMm.......',
      '.OMMMa.......',
      '..OOOa.......',
      '.............'])] } },
  hunt_jerkin: { recolour: { tunic: 'main', strap: 'accent', collar: 'accent' }, pieces: {
    down: [P('torso', 'top', -4, 0, ['AAAAAAAAA', '.A.....A.']), P('torso', 'center', -3, -2, ['....a..', '...a...', '..a....', '.a.....']), P('torso', 'bottom', -4, -2, ['aAAAAAAa', '.aMMa...']),
      P('torso', 'bottomRight', -4, -4, ['mmm', 'mAm', 'mmm'])],
    up: [P('torso', 'top', -4, 0, ['AAAAAAAAA', '.A.....A.']), P('torso', 'center', -3, -3, ['a......', '.a.....', '..a....', '...a...', '....a..']), P('torso', 'bottom', -4, -2, ['aAAAAAAa'])],
    right: [P('torso', 'top', -3, 0, ['AAAAAAA', '.A...A.']), P('torso', 'bottom', -3, -2, ['aAAAAa', '.mAm..']), P('torso', 'bottomRight', -3, -4, ['mm', 'mA', 'mm'])] } },
  hunt_bracers: { recolour: { hands: 'main' }, pieces: {
    down: [P('handL', 'top', -1, -2, ['aAa', 'MMM']), P('handR', 'top', -1, -2, ['aAa', 'MMM'])],
    up: [P('handL', 'top', -1, -2, ['aAa', 'MMM']), P('handR', 'top', -1, -2, ['aAa', 'MMM'])],
    right: [P('handL', 'top', -1, -2, ['aAa', 'MMM']), P('handR', 'top', -1, -2, ['aAa', 'MMM'])] } },
  hunt_breeches: { recolour: { trousers: 'main' }, pieces: {
    down: [P('legL', 'center', -1, 0, ['aa']), P('legR', 'center', 0, 0, ['aa'])],
    up: [P('legL', 'center', -1, 0, ['aa']), P('legR', 'center', 0, 0, ['aa'])],
    right: [P('legR', 'center', 0, 0, ['aa'])] } },
  hunt_boots: { recolour: { shoes: 'main' }, pieces: {
    down: [P('footL', 'top', -1, -1, ['AAA', 'aAa']), P('footR', 'top', -1, -1, ['AAA', 'aAa'])],
    up: [P('footL', 'top', -1, -1, ['AAA', 'aAa']), P('footR', 'top', -1, -1, ['AAA', 'aAa'])],
    right: [P('footL', 'top', -1, -1, ['AAA', 'aAa']), P('footR', 'top', -1, -1, ['AAA', 'aAa'])] } },
  hunt_quiver: { pieces: {
    // strap across the chest from the front; the quiver itself on the back, arrows peeking over the right shoulder
    down: [P('torso', 'center', -4, -5, ['.......a', '......a.', '.....a..', '....a...', '...a....', '..a.....', '.a......']), P('torso', 'topRight', -2, -3, ['.AA', 'AmA'], true)],
    up: [P('torso', 'top', 0, -2, ['....AAA', '....AmA', '...MMM.', '...MmM.', '..MMM..', '..MmM..', '.MMM...', '.mmm...'])],
    right: [P('torso', 'topLeft', -3, -3, ['AA.', 'mA.', 'MM.', 'MM.', 'MM.', 'mm.'], true)] } },
};
