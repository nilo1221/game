// party/loot.mjs — authoritative loot, reward and drop logic for the PartyKit server.
// Mirrors js/systems/loot.js and js/config/loot-tables.js/balance.js.

const RARITY_TIERS = {
  common:    { label: 'Comune',     color: '#b0b0b0', weight: 58 },
  uncommon:  { label: 'Non Comune', color: '#2ecc71', weight: 25 },
  rare:      { label: 'Raro',       color: '#3a8dff', weight: 11 },
  epic:      { label: 'Epico',      color: '#a43aff', weight: 4 },
  legendary: { label: 'Leggendario', color: '#e8c93c', weight: 1.5 },
  cursed:    { label: 'Maledetto',  color: '#c92222', weight: 0.5 },
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed'];
const RARITY_VALUE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, cursed: 5 };

const CHEST_RARITY_CONFIG = {
  commonChest:    { rarities: ['common','uncommon','rare'], target: 'rare', threshold: 10 },
  uncommonChest:  { rarities: ['uncommon','rare','epic'], target: 'rare', threshold: 6 },
  rareChest:      { rarities: ['rare','epic','legendary'], target: 'epic', threshold: 10 },
  epicChest:      { rarities: ['epic','legendary'], target: 'legendary', threshold: 8 },
  legendaryChest: { rarities: ['legendary'], target: 'legendary', threshold: 4 },
  cursedChest:    { rarities: ['cursed'], target: 'cursed', threshold: 3 },
};

const CHEST_TABLE_MAP = {
  chestCommon:    'commonChest',
  chestUncommon:  'uncommonChest',
  chestRare:      'rareChest',
  chestEpic:      'epicChest',
  chestLegendary: 'legendaryChest',
  chestCursed:    'cursedChest',
};

const LOOT_TABLES = {
  commonChest: {
    entries: [
      { kind: 'potionRed', rarity: 'common', weight: 4 },
      { kind: 'potionBlue', rarity: 'common', weight: 2 },
      { kind: 'coin', rarity: 'common', weight: 5, value: 10 },
      { kind: 'sword', rarity: 'uncommon', weight: 1 },
      { kind: 'armor', rarity: 'uncommon', weight: 1 },
      { kind: 'helmet', rarity: 'uncommon', weight: 1 },
      { kind: 'shield', rarity: 'uncommon', weight: 1 },
      { kind: 'boots', rarity: 'uncommon', weight: 1 },
    ],
  },
  uncommonChest: {
    entries: [
      { kind: 'potionRed', rarity: 'uncommon', weight: 3 },
      { kind: 'potionBlue', rarity: 'uncommon', weight: 2 },
      { kind: 'coin', rarity: 'uncommon', weight: 3, value: 25 },
      { kind: 'sword', rarity: 'uncommon', weight: 2 },
      { kind: 'armor', rarity: 'uncommon', weight: 2 },
      { kind: 'helmet', rarity: 'uncommon', weight: 2 },
      { kind: 'shield', rarity: 'uncommon', weight: 2 },
      { kind: 'boots', rarity: 'uncommon', weight: 2 },
      { kind: 'swordEpic', rarity: 'rare', weight: 1 },
      { kind: 'armorEpic', rarity: 'rare', weight: 1 },
    ],
  },
  rareChest: {
    entries: [
      { kind: 'potionBlue', rarity: 'rare', weight: 3 },
      { kind: 'coin', rarity: 'rare', weight: 3, value: 60 },
      { kind: 'swordEpic', rarity: 'rare', weight: 3 },
      { kind: 'armorEpic', rarity: 'rare', weight: 3 },
      { kind: 'helmetEpic', rarity: 'rare', weight: 2 },
      { kind: 'shieldCursed', rarity: 'rare', weight: 1 },
      { kind: 'swordLegendary', rarity: 'epic', weight: 1 },
    ],
  },
  epicChest: {
    entries: [
      { kind: 'coin', rarity: 'epic', weight: 3, value: 150 },
      { kind: 'swordEpic', rarity: 'epic', weight: 4 },
      { kind: 'armorEpic', rarity: 'epic', weight: 4 },
      { kind: 'helmetEpic', rarity: 'epic', weight: 3 },
      { kind: 'bootsEpic', rarity: 'epic', weight: 3 },
      { kind: 'swordLegendary', rarity: 'legendary', weight: 2 },
      { kind: 'swordMolten', rarity: 'legendary', weight: 1 },
    ],
  },
  legendaryChest: {
    entries: [
      { kind: 'coin', rarity: 'legendary', weight: 2, value: 400 },
      { kind: 'swordMolten', rarity: 'legendary', weight: 3 },
      { kind: 'armorObsidian', rarity: 'legendary', weight: 2 },
      { kind: 'bootsFireproof', rarity: 'legendary', weight: 2 },
      { kind: 'swordLegendary', rarity: 'legendary', weight: 3 },
    ],
  },
  cursedChest: {
    entries: [
      { kind: 'swordCursed', rarity: 'cursed', weight: 3 },
      { kind: 'armorCursed', rarity: 'cursed', weight: 3 },
      { kind: 'shieldCursed', rarity: 'cursed', weight: 2 },
      { kind: 'bootsCursed', rarity: 'cursed', weight: 2 },
      { kind: 'coin', rarity: 'cursed', weight: 3, value: 30 },
    ],
  },
};

const AFFIXES = {
  positive: [
    { name: 'della Tempesta', stat: 'atk', value: 2, rarities: ['rare','epic','legendary'], slots: ['weapon'] },
    { name: 'del Forte', stat: 'def', value: 2, rarities: ['uncommon','rare','epic','legendary'], slots: ['armor','helmet','shield'] },
    { name: 'dello Zephyr', stat: 'spd', value: 0.1, rarities: ['uncommon','rare','epic','legendary'], slots: ['boots'] },
    { name: 'del Guaritore', stat: 'hp', value: 10, rarities: ['rare','epic','legendary'], slots: ['armor','helmet'] },
    { name: 'del Saggio', stat: 'mana', value: 10, rarities: ['rare','epic','legendary'], slots: ['helmet','armor'] },
  ],
  negative: [
    { name: 'Maledetta', stat: 'atk', value: -2, rarities: ['cursed','common'], slots: ['weapon'] },
    { name: 'Pesante', stat: 'spd', value: -0.2, rarities: ['cursed','common'], slots: ['boots'] },
    { name: 'Rovinata', stat: 'def', value: -2, rarities: ['cursed','common'], slots: ['armor','helmet','shield'] },
    { name: 'Infranta', stat: 'def', value: -1, rarities: ['cursed','common'], slots: ['shield'] },
  ],
};

const ITEM_SLOTS = {
  sword: 'weapon', swordEpic: 'weapon', swordCursed: 'weapon', swordLegendary: 'weapon', swordMolten: 'weapon',
  armor: 'armor', armorEpic: 'armor', armorCursed: 'armor', armorJungle: 'armor', armorObsidian: 'armor',
  helmet: 'helmet', helmetEpic: 'helmet', crownSkeleton: 'helmet',
  shield: 'shield', shieldBone: 'shield', shieldCursed: 'shield',
  boots: 'boots', bootsEpic: 'boots', bootsCursed: 'boots', bootsFireproof: 'boots',
};

const COMBAT_REWARDS = {
  pitDevil:       { xp: 3500, gold: 3000 },
  skeletonKing:   { xp: 2200, gold: 1800 },
  trollChieftain: { xp: 1400, gold: 1200 },
  devilBoss:      { xp: 900, gold: 700 },
  goblinBoss:     { xp: 500, gold: 400 },
  orcBoss:        { xp: 550, gold: 450 },
  witchBoss:      { xp: 600, gold: 500 },

  troll:          { xp: 120, gold: [25, 40] },
  orcRaider:      { xp: 90, gold: [18, 30] },
  devilLesser:    { xp: 90, gold: [18, 30] },

  sandScorpion:   { xp: 80, gold: [12, 20] },
  skeleton:       { xp: 55, gold: [8, 15] },
  spider:         { xp: 40, gold: [6, 12] },
  slimeRed:       { xp: 50, gold: 20 },
  slimeGreen:     { xp: 25, gold: [3, 6] },
  slimeBlue:      { xp: 30, gold: [4, 8] },
};

const BOSS_DROPS = {
  goblinBoss:     [{ kind: 'armor', dx: 10, dy: 6 }],
  orcBoss:        [{ kind: 'armorJungle', dx: 10, dy: 6 }],
  witchBoss:      [{ kind: 'boots', dx: 10, dy: 6 }],
  skeletonKing:   [
    { kind: 'shieldBone', dx: 14, dy: 10 },
    { kind: 'crownSkeleton', dx: -10, dy: 10 },
    { kind: 'potionBlue', dx: 2, dy: -8 },
  ],
  devilBoss:      [
    { kind: 'helmet', dx: 10, dy: 6 },
    { kind: 'swordLegendary', dx: -6, dy: 6 },
  ],
  trollChieftain: [{ kind: 'armorObsidian', dx: 10, dy: 8 }],
  pitDevil:       [
    { kind: 'swordMolten', dx: 10, dy: 8 },
    { kind: 'bootsFireproof', dx: -10, dy: 8 },
  ],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + (e.weight || 1), 0);
  if (total <= 0) return entries[0] || null;
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= (e.weight || 1);
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}

function getSlot(kind) {
  return ITEM_SLOTS[kind] || null;
}

function rollAffixes(rarity, kind) {
  const slot = getSlot(kind);
  if (!slot) return { prefix: null, suffix: null };

  const affixes = { prefix: null, suffix: null };
  let count = 0;
  if (rarity === 'uncommon' || rarity === 'rare') count = 1;
  else if (rarity === 'epic' || rarity === 'legendary') count = 2;
  else if (rarity === 'cursed') count = -1;

  if (count === 0) return affixes;

  const allowedPositive = AFFIXES.positive.filter(a => a.slots.includes(slot) && a.rarities.includes(rarity));
  const allowedNegative = AFFIXES.negative.filter(a => a.slots.includes(slot) && a.rarities.includes(rarity));

  if (count === -1) {
    if (allowedNegative.length) {
      affixes.prefix = pickWeighted(allowedNegative);
    } else if (allowedPositive.length) {
      affixes.prefix = pickWeighted(allowedPositive.filter(a => a.stat === 'def' || a.stat === 'atk'));
    }
    return affixes;
  }

  if (count >= 1 && allowedPositive.length) {
    const first = pickWeighted(allowedPositive);
    if (Math.random() < 0.5) affixes.prefix = first;
    else affixes.suffix = first;
  }
  if (count >= 2 && allowedPositive.length) {
    const second = pickWeighted(allowedPositive);
    if (affixes.prefix) affixes.suffix = second;
    else affixes.prefix = second;
  }
  return affixes;
}

function rollRarity(tableId, counters) {
  const config = CHEST_RARITY_CONFIG[tableId] || { rarities: RARITY_ORDER, target: 'rare', threshold: 10 };
  const c = counters[tableId] || { rolls: 0 };

  const allowed = config.rarities.map(r => ({ id: r, weight: RARITY_TIERS[r].weight }));
  let rarity;
  if (c.rolls >= config.threshold) {
    const pityAllowed = allowed.filter(r => RARITY_VALUE[r.id] >= RARITY_VALUE[config.target]);
    rarity = pickWeighted(pityAllowed).id;
    c.rolls = 0;
  } else {
    rarity = pickWeighted(allowed).id;
    if (RARITY_VALUE[rarity] >= RARITY_VALUE[config.target]) {
      c.rolls = 0;
    } else {
      c.rolls += 1;
    }
  }

  counters[tableId] = c;
  return rarity;
}

function rollItem(tableId, counters) {
  const table = LOOT_TABLES[tableId];
  if (!table) return null;

  const rarity = rollRarity(tableId, counters);
  let pool = table.entries.filter(e => e.rarity === rarity);
  if (!pool.length) {
    const idx = RARITY_ORDER.indexOf(rarity);
    for (let i = idx - 1; i >= 0; i--) {
      const fallback = table.entries.filter(e => e.rarity === RARITY_ORDER[i]);
      if (fallback.length) { pool.push(...fallback); break; }
    }
  }
  if (!pool.length) return null;

  const entry = pickWeighted(pool);
  const affixes = rollAffixes(rarity, entry.kind);
  return {
    kind: entry.kind,
    rarity,
    value: entry.value || 0,
    affixes,
  };
}

export default {
  getCombatReward(type) {
    const r = COMBAT_REWARDS[type];
    if (!r) return { xp: 5, gold: 0 };
    if (Array.isArray(r.gold)) {
      return { xp: r.xp, gold: r.gold[0] + Math.floor(Math.random() * (r.gold[1] - r.gold[0] + 1)) };
    }
    return { xp: r.xp, gold: r.gold };
  },

  getBossDrops(type, x, y) {
    const list = BOSS_DROPS[type];
    if (!list) return [];
    return list.map(d => ({ kind: d.kind, x: x + d.dx, y: y + d.dy }));
  },

  openChest(chestKind, counters) {
    const tableId = CHEST_TABLE_MAP[chestKind];
    if (!tableId) return { ok: false, reason: 'cassa sconosciuta', roll: null };

    const roll = rollItem(tableId, counters);
    if (!roll) return { ok: false, reason: 'tabella vuota', roll: null };

    return { ok: true, roll };
  },
};
