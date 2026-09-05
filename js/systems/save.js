// systems/save.js — persistence for gold/premium/honor and player name.
// Supports localStorage as a fast fallback and Appwrite Cloud when configured.

const SaveGame = {
  KEY: 'shattered-vale-save-v1',

  // Build the plain save object from a player instance.
  getData(player, inventory, state) {
    const data = {
      gold: player.gold,
      premium: player.premium,
      honor: player.honor,
      name: this.getName(),
      background: this.getBackground(),
      savedAt: Date.now(),
    };
    if (player) {
      data.x = player.x;
      data.y = player.y;
      // progressione personaggio: senza questi il reload riparte da livello 1
      data.lvl = player.lvl;
      data.xp = player.xp;
      data.xpNext = player.xpNext;
      data.hp = player.hp;
      data.maxHp = player.maxHp;
      data.atk = player.atk;
      data.mana = player.mana;
      data.maxMana = player.maxMana;
      data.hunger = player.hunger;
      data.thirst = player.thirst;
      data.speed = player.speed;
    }
    if (inventory) {
      data.inventory = {
        items: { ...inventory.items },
        equipped: { ...inventory.equipped },
        affixes: JSON.parse(JSON.stringify(inventory.affixes)),
      };
    }
    if (state) {
      data.questStage = state.questStage;
      data.map = {
        isGateOpen: state.map.isGateOpen,
        isWorldTwoGateOpen: state.map.isWorldTwoGateOpen,
        isJungleGateOpen: state.map.isJungleGateOpen,
        isSkeletonGateOpen: state.map.isSkeletonGateOpen,
        isLavaGateOpen: state.map.isLavaGateOpen,
        isPitGateOpen: state.map.isPitGateOpen,
      };
    }
    return data;
  },

  // Apply a saved data object to a player instance.
  applyData(player, data, inventory, state) {
    if (!data) return;
    if (typeof data.gold === 'number') player.gold = data.gold;
    if (typeof data.premium === 'number') player.premium = data.premium;
    if (typeof data.honor === 'number') player.honor = data.honor;
    if (typeof data.name === 'string' && data.name) this.setName(data.name);
    if (typeof data.background === 'string' && data.background) this.setBackground(data.background);
    if (typeof data.x === 'number') player.x = data.x;
    if (typeof data.y === 'number') player.y = data.y;
    if (typeof data.lvl === 'number') player.lvl = data.lvl;
    if (typeof data.xp === 'number') player.xp = data.xp;
    if (typeof data.xpNext === 'number') player.xpNext = data.xpNext;
    if (typeof data.hp === 'number') player.hp = data.hp;
    if (typeof data.maxHp === 'number') player.maxHp = data.maxHp;
    if (typeof data.atk === 'number') player.atk = data.atk;
    if (typeof data.mana === 'number') player.mana = data.mana;
    if (typeof data.maxMana === 'number') player.maxMana = data.maxMana;
    if (typeof data.hunger === 'number') player.hunger = data.hunger;
    if (typeof data.thirst === 'number') player.thirst = data.thirst;
    if (typeof data.speed === 'number') player.speed = data.speed;
    if (inventory && data.inventory) {
      Object.assign(inventory.items, data.inventory.items || {});
      Object.assign(inventory.equipped, data.inventory.equipped || {});
      Object.assign(inventory.affixes, data.inventory.affixes || {});
      this._recomputeEquipment(player, inventory);
    }
    if (state) {
      if (typeof data.questStage === 'number') state.questStage = data.questStage;
      if (data.map) {
        const map = state.map;
        if (data.map.isGateOpen) map.openGate();
        if (data.map.isWorldTwoGateOpen) map.openWorldTwoGate();
        if (data.map.isJungleGateOpen) map.openJungleGate();
        if (data.map.isSkeletonGateOpen) map.openSkeletonGate();
        if (data.map.isLavaGateOpen) map.openLavaGate();
        if (data.map.isPitGateOpen) map.openPitGate();
      }
    }
  },

  // Re-derives everything the equipped gear implies (weapon flags, weapon
  // affix bonus, boot speed, fireproof, defense) so a loaded save behaves
  // exactly as if the items had just been equipped.
  _recomputeEquipment(player, inventory) {
    const eq = inventory.equipped || {};

    const weapon = eq.weapon || null;
    player.hasSword = !!weapon;
    player.hasEpicSword = weapon === 'swordEpic';
    player.hasCursedSword = weapon === 'swordCursed';
    player.hasLegendarySword = weapon === 'swordLegendary';
    player.hasMoltenSword = weapon === 'swordMolten';
    player.weaponBonus = (weapon && typeof _weaponBonusFromAffix === 'function')
      ? _weaponBonusFromAffix(player, inventory, weapon)
      : 0;

    const boots = eq.boots || null;
    player.fireproof = boots === 'bootsFireproof';
    if (boots && typeof _bootSpeedWithAffix === 'function') {
      const base = boots === 'bootsEpic' ? BOOTS_EPIC_SPEED
        : boots === 'bootsCursed' ? BOOTS_CURSED_SPEED
        : BOOTS_SPEED;
      player.speed = _bootSpeedWithAffix(inventory, boots, base);
    }

    if (typeof getItemStats === 'function') {
      let def = 0;
      for (const slotId in eq) {
        const kind = eq[slotId];
        const stats = kind && getItemStats(kind, inventory.getAffixes(kind));
        if (stats && stats.def != null) def += stats.def;
      }
      player.defense = def;
    }
  },

  // True only if a real run was saved before (savedAt is written by
  // save()/addPremium, not by setName/setBackground stubs).
  hasSave() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && (typeof data.savedAt === 'number' || typeof data.lvl === 'number' || data.inventory));
    } catch (e) {
      return false;
    }
  },

  load(player, inventory, state) {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.applyData(player, data, inventory, state);
    } catch (e) {
      console.warn('SaveGame load failed:', e);
    }
  },

  save(player, inventory, state, opts = {}) {
    try {
      const data = this.getData(player, inventory, state);
      localStorage.setItem(this.KEY, JSON.stringify(data));

      if (opts.cloud !== false && typeof CloudSave !== 'undefined' && CloudSave.enabled && CloudSave.loggedIn) {
        CloudSave.save(data);
      }
    } catch (e) {
      console.warn('SaveGame save failed:', e);
    }
  },

  getName() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return '';
      const data = JSON.parse(raw);
      return typeof data.name === 'string' ? data.name : '';
    } catch (e) {
      return '';
    }
  },

  setName(name) {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.name = String(name).trim().slice(0, 16);
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('SaveGame setName failed:', e);
    }
  },

  getBackground() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return '';
      const data = JSON.parse(raw);
      return typeof data.background === 'string' ? data.background : '';
    } catch (e) {
      return '';
    }
  },

  setBackground(background) {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.background = String(background).trim();
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('SaveGame setBackground failed:', e);
    }
  },

  addPremium(amount) {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.premium = (data.premium || 0) + amount;
      data.savedAt = Date.now();
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('SaveGame addPremium failed:', e);
    }
  },

  reset() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) {
      console.warn('SaveGame reset failed:', e);
    }
  },
};
