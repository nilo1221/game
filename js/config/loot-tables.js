// config/loot-tables.js — rarity tiers, weighted loot tables, affixes and premium chest market.
// Designed so systems/loot.js can roll items for chests, enemy drops and bosses.

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

// Pity and rarity range per loot table. `rarities` limits what the chest can roll;
// `target` is the guaranteed rarity after `threshold` bad rolls.
const CHEST_RARITY_CONFIG = {
  commonChest:    { rarities: ['common','uncommon','rare'], target: 'rare', threshold: 10 },
  uncommonChest:  { rarities: ['uncommon','rare','epic'], target: 'rare', threshold: 6 },
  rareChest:      { rarities: ['rare','epic','legendary'], target: 'epic', threshold: 10 },
  epicChest:      { rarities: ['epic','legendary'], target: 'legendary', threshold: 8 },
  legendaryChest: { rarities: ['legendary'], target: 'legendary', threshold: 4 },
  cursedChest:    { rarities: ['cursed'], target: 'cursed', threshold: 3 },
};

// Chest kind -> table used when opened.
const CHEST_TABLE_MAP = {
  chestCommon:    'commonChest',
  chestUncommon:  'uncommonChest',
  chestRare:      'rareChest',
  chestEpic:      'epicChest',
  chestLegendary: 'legendaryChest',
  chestCursed:    'cursedChest',
};

// Each table lists what a chest of that tier can drop.
// Items can appear multiple times with different rarities; weight is relative inside the rarity group.
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

// Flavor affixes applied to rolled gear. Positive affixes can appear on any rarity;
// cursed items carry one negative affix as a guarantee.
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

// Static mapping for item rarities (used by the shop to color item names).
const ITEM_RARITY = {
  // chests
  chestCommon: 'common',
  chestUncommon: 'uncommon',
  chestRare: 'rare',
  chestEpic: 'epic',
  chestLegendary: 'legendary',
  chestCursed: 'cursed',
  // premium/cursed gear
  swordEpic: 'epic',
  swordCursed: 'cursed',
  armorEpic: 'epic',
  armorCursed: 'cursed',
  helmetEpic: 'epic',
  shieldCursed: 'cursed',
  bootsEpic: 'epic',
  bootsCursed: 'cursed',
};

function getItemRarity(kind) { return ITEM_RARITY[kind] || 'common'; }
function getRarityColor(kind) { return RARITY_TIERS[getItemRarity(kind)].color; }

// Slot mapping used by affix rolling to decide which affixes fit each item.
const ITEM_SLOTS = {
  sword: 'weapon', swordEpic: 'weapon', swordCursed: 'weapon', swordLegendary: 'weapon', swordMolten: 'weapon',
  armor: 'armor', armorEpic: 'armor', armorCursed: 'armor', armorJungle: 'armor', armorObsidian: 'armor',
  helmet: 'helmet', helmetEpic: 'helmet', crownSkeleton: 'helmet',
  shield: 'shield', shieldBone: 'shield', shieldCursed: 'shield',
  boots: 'boots', bootsEpic: 'boots', bootsCursed: 'boots', bootsFireproof: 'boots',
};

// Premium chest market sold by the in-game chest merchant (currency: premium/gems).
const PREMIUM_CHEST_STOCK = [
  { kind: 'chestCommon',    price: 8,  qty: 99 },
  { kind: 'chestUncommon',  price: 20, qty: 99 },
  { kind: 'chestRare',      price: 50, qty: 99 },
  { kind: 'chestEpic',      price: 120, qty: 99 },
  { kind: 'chestLegendary', price: 280, qty: 99 },
  { kind: 'chestCursed',    price: 35, qty: 99 },
];

const SELL_RATE = 0.5;
