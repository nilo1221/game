// systems/loot.js — weighted loot rolling, rarity tiers, pity timer and affixes.
// Rolls are seeded only by Math.random() for now; the pity counter is persisted
// in localStorage so a player's bad-luck streak survives reloads.

const LootRoller = {
  KEY: 'shattered-vale-pity-v1',

  _counters: {},

  init() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this._counters = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this._counters = {};
    }
  },

  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._counters));
    } catch (e) {
      // ignore storage errors
    }
  },

  _pickWeighted(entries) {
    const total = entries.reduce((s, e) => s + (e.weight || 1), 0);
    if (total <= 0) return entries[0] || null;
    let roll = Math.random() * total;
    for (const e of entries) {
      roll -= (e.weight || 1);
      if (roll <= 0) return e;
    }
    return entries[entries.length - 1];
  },

  _getSlot(kind) {
    return ITEM_SLOTS[kind] || null;
  },

  _rollAffixes(rarity, kind) {
    const slot = this._getSlot(kind);
    if (!slot) return { prefix: null, suffix: null };

    const affixes = { prefix: null, suffix: null };
    let count = 0;
    if (rarity === 'uncommon' || rarity === 'rare') count = 1;
    else if (rarity === 'epic' || rarity === 'legendary') count = 2;
    else if (rarity === 'cursed') count = -1; // one negative

    if (count === 0) return affixes;

    const allowedPositive = AFFIXES.positive.filter(a => a.slots.includes(slot) && a.rarities.includes(rarity));
    const allowedNegative = AFFIXES.negative.filter(a => a.slots.includes(slot) && a.rarities.includes(rarity));

    if (count === -1) {
      if (allowedNegative.length) {
        affixes.prefix = this._pickWeighted(allowedNegative);
      } else if (allowedPositive.length) {
        // fallback to a weak positive if no negative fits
        affixes.prefix = this._pickWeighted(allowedPositive.filter(a => a.stat === 'def' || a.stat === 'atk'));
      }
      return affixes;
    }

    if (count >= 1 && allowedPositive.length) {
      const first = this._pickWeighted(allowedPositive);
      if (Math.random() < 0.5) affixes.prefix = first;
      else affixes.suffix = first;
    }
    if (count >= 2 && allowedPositive.length) {
      const second = this._pickWeighted(allowedPositive);
      if (affixes.prefix) affixes.suffix = second;
      else affixes.prefix = second;
    }
    return affixes;
  },

  rollRarity(tableId) {
    this.init();
    const defaultConfig = { rarities: RARITY_ORDER, target: 'rare', threshold: 10 };
    const config = CHEST_RARITY_CONFIG[tableId] || defaultConfig;
    const counters = this._counters[tableId] || { rolls: 0 };

    let rarity;
    const allowed = config.rarities.map(r => ({ id: r, weight: RARITY_TIERS[r].weight }));
    if (counters.rolls >= config.threshold) {
      // pity: force target or higher
      const pityAllowed = allowed.filter(r => RARITY_VALUE[r.id] >= RARITY_VALUE[config.target]);
      rarity = this._pickWeighted(pityAllowed).id;
      counters.rolls = 0;
    } else {
      rarity = this._pickWeighted(allowed).id;
      if (RARITY_VALUE[rarity] >= RARITY_VALUE[config.target]) {
        counters.rolls = 0;
      } else {
        counters.rolls += 1;
      }
    }

    this._counters[tableId] = counters;
    this._save();
    return rarity;
  },

  rollItem(tableId) {
    const table = LOOT_TABLES[tableId];
    if (!table) return null;

    const rarity = this.rollRarity(tableId);
    const pool = table.entries.filter(e => e.rarity === rarity);
    if (!pool.length) {
      // fallback to first available rarity lower than rolled
      const idx = RARITY_ORDER.indexOf(rarity);
      for (let i = idx - 1; i >= 0; i--) {
        const fallback = table.entries.filter(e => e.rarity === RARITY_ORDER[i]);
        if (fallback.length) { pool.push(...fallback); break; }
      }
    }
    if (!pool.length) return null;

    const entry = this._pickWeighted(pool);
    const affixes = this._rollAffixes(rarity, entry.kind);
    return {
      kind: entry.kind,
      rarity,
      value: entry.value || 0,
      affixes,
    };
  },

  openChest(chestKind, player, inventory, multiplayer) {
    if (!inventory.has(chestKind)) return { ok: false, reason: 'nessuna cassa' };

    const tableId = CHEST_TABLE_MAP[chestKind];
    if (!tableId) return { ok: false, reason: 'cassa sconosciuta' };

    if (multiplayer && multiplayer.connected) {
      multiplayer.sendOpenChest(chestKind);
      return { ok: false, reason: 'Apertura al server...' };
    }

    inventory.remove(chestKind, 1);
    const roll = this.rollItem(tableId);
    if (!roll) return { ok: false, reason: 'tabella vuota' };

    if (roll.kind === 'coin') {
      player.gold += roll.value || 10;
    } else if (roll.kind === 'gem') {
      player.premium += roll.value || 1;
    } else {
      inventory.add(roll.kind, 1, roll.affixes);
    }

    const name = getItemDisplayName(roll.kind, roll.affixes);
    return {
      ok: true,
      kind: roll.kind,
      rarity: roll.rarity,
      name,
      affixes: roll.affixes,
    };
  },
};

// Auto-init on script load so old pity data is read before the first roll.
LootRoller.init();
