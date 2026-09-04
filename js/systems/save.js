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
    if (inventory && data.inventory) {
      Object.assign(inventory.items, data.inventory.items || {});
      Object.assign(inventory.equipped, data.inventory.equipped || {});
      Object.assign(inventory.affixes, data.inventory.affixes || {});
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
