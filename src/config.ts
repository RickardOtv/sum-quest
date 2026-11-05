/**
 * Every balance number lives here, so tuning the game never means
 * hunting through gameplay code. Times are in seconds, distances in
 * world pixels (the world is 360 px wide; sprites are drawn at 2× scale).
 */
export const CONFIG = {
  world: { wallTop: 118, wallSide: 14, wallBottom: 16 }, // the world is always 360 px wide (see main.ts)

  // HP, damage, crit chance etc. come from gear (see game/items.ts → heroStats)
  hero: { speed: 140, radius: 8, invulnerableAfterHit: 0.6, shotsPerSecond: 1.9, slashSpeed: 430 },

  /** Attack pacing, so gear + perks can't stack into a slash storm.
   *  maxShotsPerSecond caps every rate bonus (gear, dagger, Quick Hands) combined.
   *  plantDelay: after you stop moving, wait this long before the first swing (no free stutter-step kiting).
   *  rapidPerStack: Quick Hands bonus per level. Twin Slash extras fan out wider and hit for extraSlashDamage. */
  attack: { maxShotsPerSecond: 3.6, plantDelay: 0.12, rapidPerStack: 0.15, extraSlashSpread: 0.38, extraSlashDamage: 0.6 },

  /** Swing feel. The sword sheet is 8 frames at 20 fps (0.4 s); the blade connects on frame 3, so the slash
   *  leaves `windup` s into the swing. Faster attack rates play the swing faster so it always fits.
   *  Moving during the windup cancels the swing. Hits push small enemies back (`knockback` px/s, fades fast)
   *  (~8 px total) and pause them for `hitStop` s; kept small so feedback never becomes crowd control. Bosses and charging enemies only flash. */
  swing: { duration: 0.4, windup: 0.1, knockback: 60, hitStop: 0.04, critHitStop: 0.18 },

  /** Random crit: time freezes while you pick 1 of 3 answers. Few but big: at least 13 s apart, ×5.5 damage.
   *  A super crit (rarer) instead slows time, wipes enemy bullets, stops enemies attacking, and hits much harder.
   *  Base chance (14%) and answer window (6.5 s) come from heroStats so gear can raise them. */
  crit: { cooldown: 13, damageMult: 5.5, superChance: 0.25, superDamageMult: 8, superTimeScale: 0.18, superWindowMult: 1.3 },

  /** Special skills (see game/skills.ts): every equipped skill has its own meter (0..100) that fills in its own
   *  `recharge` seconds of combat, plus a little per hit. A skill is ready when its meter is full. */
  special: { chargePerHit: 0.5, startCharge: 25, missKeeps: 40 },

  /** Speed bonus on typed answers, relative to the tier's target time (× targetMult for specials, since you also fight). */
  speed: { lightningMult: 1.5, quickMult: 1.2, slowMult: 0.8, targetMult: 1.3 },

  enemies: {
    slime: { hp: 28, speed: 64, contactDamage: 11, radius: 11, cost: 1, gold: 3 },
    spore: { hp: 36, contactDamage: 8, radius: 11, cost: 1.5, gold: 4, fireEvery: 1.8, bulletSpeed: 145, bulletDamage: 10 },
    wisp: { hp: 30, speed: 46, contactDamage: 8, radius: 11, cost: 2, gold: 5, fireEvery: 2.9, ringCount: 8, bulletSpeed: 110, bulletDamage: 9 },
    /** Thornback boar: wanders, then lowers its head (telegraph) and charges in a straight line. */
    boar: { hp: 44, speed: 40, contactDamage: 14, radius: 12, cost: 2, gold: 5, chargeEvery: 2.6, windup: 0.6, chargeSpeed: 360, chargeTime: 0.55, stun: 0.6 },
    /** Old Tusk, the mini boss in room 5: a huge boar that charges twice in a row and sprays thorns when it hits a wall. */
    tusk: { hp: 420, contactDamage: 16, radius: 22, gold: 30, speed: 42, chargeEvery: 2.2, windup: 0.7, chargeSpeed: 370, chargeTime: 0.7, stun: 0.8, thorns: 12, bulletSpeed: 120, bulletDamage: 10 },
    /** Emberfall: ember imps float and throw a spread of three fireballs. */
    imp: { hp: 34, speed: 52, contactDamage: 9, radius: 10, cost: 1.5, gold: 5, fireEvery: 2.2, spread: 0.32, bulletSpeed: 135, bulletDamage: 11 },
    /** Cinder hounds: like boars, but faster and quicker to charge. */
    hound: { hp: 40, speed: 58, contactDamage: 14, radius: 11, cost: 2, gold: 6, chargeEvery: 2.2, windup: 0.45, chargeSpeed: 420, chargeTime: 0.5, stun: 0.5 },
    /** Cinderjaw, Emberfall's mini boss: a giant hound that charges twice and leaves fire along its path. */
    cinderjaw: { hp: 650, contactDamage: 18, radius: 22, gold: 45, speed: 50, chargeEvery: 2.0, windup: 0.65, chargeSpeed: 400, chargeTime: 0.7, stun: 0.7, trailEvery: 0.09, trailDelay: 0.55, trailRadius: 16, trailDamage: 12 },
    /** The Cinder Golem, Emberfall's boss: fire rings, aimed fire, eruptions under you, and imps. */
    golem: { hp: 1900, contactDamage: 18, radius: 28, gold: 100, bulletSpeed: 125, bulletDamage: 14, cadence: 1.9, cadenceEnraged: 1.4, slamEvery: 8, slamWarn: 1.0, slamRadius: 32, slamDamage: 22, slamSpots: 5 },
    /** Old Rootback, the boss in room 10. Every `slamEvery` s it marks the ground under you and roots burst up a moment later. */
    boss: { hp: 1100, contactDamage: 14, radius: 26, gold: 60, bulletSpeed: 120, bulletDamage: 12, cadence: 2.1, cadenceEnraged: 1.5, slamEvery: 9, slamWarn: 1.1, slamRadius: 30, slamDamage: 18, slamSpots: 4 },
    hpGrowthPerRoom: 0.07,
    hpByDifficulty: [0, 1, 1.35, 1.8],
  },

  run: {
    roomsBeforeBoss: 9,      // rooms 1–9, the boss is room 10
    miniBossRoom: 4,         // 0-based: room 5 is Old Tusk
    budgetBase: 4,
    budgetPerRoom: 0.55,
    budgetPerDifficulty: 2,
    healBetweenRooms: 0,     // no free healing between rooms: heals are a reward you choose
    goldReward: [0, 20, 35, 55],
    chestByDifficulty: ['wood', 'wood', 'wood', 'iron'] as const,
    healReward: [0, 0.15, 0.2, 0.3],
    healDoorWeight: 0.05,     // chance weight of a heal door (vs gold 0.3, power 0.28…)
    healDoorWeightHurt: 0.18, // …when below half HP
    miniBossHeal: 0.4,        // reward choice after a mini boss: heal 40% or open an iron chest
    miniBossKillHeal: 0.15,   // …plus this heal, always, the moment it falls
    zoneHeal: 0.3,            // walking out of a zone after its boss heals 30%
    clearBonus: 60,
  },

  forge: {
    // gold + scrap cost per item lives in game/items.ts (forgeCost)
    // success chance by forging-problem tier (1–4), minus a penalty for bigger upgrades (+1/+2/+3)
    chanceByTier: [0, 0.6, 0.75, 0.88, 0.97],
    penaltyBySize: [0, 0, 0.15, 0.3],
    refundOnFail: 0.5,
  },

  training: { problemsPerLesson: 4, problemsInRun: 2, goldPerCorrect: 8, dailyBonusGold: 20 },

  /** Sprint: a fixed-time round; the score is comparable from day to day. */
  sprint: { seconds: 60, goldPerCorrect: 2 },

  /** Crits: how much longer you get and how much harder they hit per problem tier (index = tier). */
  critByTier: { windowMult: [0, 1, 1.3, 1.7, 2.1], damageMult: [0, 1, 1.3, 1.6, 2] },

  /** Daily practice goal, counted in seconds spent actually solving problems. */
  dailyGoalSec: 180,
} as const;

export const forgeChance = (tier: number, size: number) =>
  Math.max(0.05, CONFIG.forge.chanceByTier[tier] - CONFIG.forge.penaltyBySize[size]);

/** Who made the game: shown in Settings and at the bottom of How to play. */
export const MADE_BY = { name: 'RickardOtv', github: 'https://github.com/RickardOtv' };
