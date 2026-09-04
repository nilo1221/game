// config/shop-pool.js — merchant stock pools and buy/sell prices.
// This only lists item kinds that already exist in the engine (ITEM_STATS).
// New design items (cursed, epic, legendary) can be appended here and in
// item-stats.js / item-effects.js once their effects are implemented.

const WANDERING_MERCHANT_STOCK = [
  { kind: 'potionRed', price: 10, qty: 5 },
  { kind: 'potionBlue', price: 20, qty: 3 },
  { kind: 'sword',     price: 50, qty: 1 },
  { kind: 'armor',     price: 60, qty: 1 },
  { kind: 'shield',    price: 30, qty: 1 },
  { kind: 'helmet',    price: 25, qty: 1 },
  { kind: 'boots',     price: 35, qty: 1 },
];

// Weapon master / PvP shop. These items can only be bought with honor,
// earned by defeating other players in PvP.
const WEAPON_MASTER_STOCK = [
  { kind: 'swordLegendary', price: 80, qty: 1 },
  { kind: 'armorObsidian', price: 100, qty: 1 },
  { kind: 'shieldBone', price: 60, qty: 1 },
  { kind: 'bootsFireproof', price: 50, qty: 1 },
  { kind: 'potionBlue', price: 15, qty: 3 },
];
const WEAPON_MASTER_CURRENCY = 'honor';

const BLACKSMITH_STOCK = [
  { kind: 'sword',  price: 45, qty: 1 },
  { kind: 'armor',  price: 55, qty: 1 },
  { kind: 'shield', price: 28, qty: 1 },
  { kind: 'helmet', price: 22, qty: 1 },
  { kind: 'boots',  price: 32, qty: 1 },
];

const ALCHEMIST_STOCK = [
  { kind: 'potionRed', price: 8, qty: 10 },
  { kind: 'potionBlue', price: 16, qty: 5 },
];

// Shared tier colors for future UI expansions.
const RARITY_COLORS = {
  common:    '#b0b0b0',
  rare:      '#3a8dff',
  epic:      '#a43aff',
  legendary: '#e8c93c',
  cursed:    '#c92222',
};

const WANDERING_MERCHANT_CURRENCY = 'gold';
const BLACKSMITH_CURRENCY = 'gold';
const ALCHEMIST_CURRENCY = 'gold';
