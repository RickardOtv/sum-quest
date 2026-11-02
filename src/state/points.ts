/** Skill points: where they come from and how they're spent. */
import { STARTER_SKILLS, TREE, maxLevelOf, requirementOf, type NodeId } from '../game/skills';
import { toast } from '../ui/dom';
import { persist, save } from './save';

export const STREAK_MILESTONES = [3, 7, 14, 30];

/** Grant a one-time point if `key` hasn't paid out before. */
export function earnPoint(key: string, reason: string): boolean {
  if (save.pointsEarned.includes(key)) return false;
  save.pointsEarned.push(key); save.skillPoints++; persist();
  toast(`+1 skill point · ${reason}`);
  return true;
}
/** Repeatable sources (boss kills). */
export function earnPointAlways(reason: string) { save.skillPoints++; persist(); toast(`+1 skill point · ${reason}`); }

export function checkStreakMilestones(streak: number) {
  for (const m of STREAK_MILESTONES) if (streak >= m) earnPoint(`streak-${m}`, `${m}-day streak`);
}

export const levelOf = (id: NodeId) => save.tree[id] ?? 0;
export const isUnlocked = (id: NodeId) => levelOf(id) > 0;
export function canBuy(id: NodeId): { ok: boolean; why?: string } {
  if (save.skillPoints < 1) return { ok: false, why: 'No skill points left' };
  if (levelOf(id) >= maxLevelOf(id)) return { ok: false, why: 'Max level' };
  const req = requirementOf(id);
  if (req && !isUnlocked(req)) return { ok: false, why: 'Unlock the node above first' };
  return { ok: true };
}
export function buy(id: NodeId) {
  if (!canBuy(id).ok) return false;
  save.tree[id] = levelOf(id) + 1; save.skillPoints--; persist();
  return true;
}
export const branchOf = (id: NodeId) => TREE.find(b => b.nodes.includes(id))!;

/* ---------- respec (unlocked after the first boss kill) ---------- */
export const respecUnlocked = () => save.clears > 0;
export const respecCost = () => 150 * (save.respecs + 1);
/** Points spent beyond the two starter skills at Lv 1. */
export const refundablePoints = () =>
  Object.entries(save.tree).reduce((a, [id, lv]) => a + (lv ?? 0) - (STARTER_SKILLS.includes(id as never) ? 1 : 0), 0);
export function respec(): boolean {
  if (!respecUnlocked() || save.gold < respecCost()) return false;
  save.gold -= respecCost();
  save.skillPoints += refundablePoints();
  save.tree = Object.fromEntries(STARTER_SKILLS.map(s => [s, 1]));
  save.equippedSkills = save.equippedSkills.map(s => (s && STARTER_SKILLS.includes(s) ? s : null));
  save.respecs++; persist();
  return true;
}
