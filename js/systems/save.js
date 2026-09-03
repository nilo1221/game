// systems/save.js — minimal localStorage persistence for gold/premium.
// This is intentionally small: it only stores the two currency values so that
// a page refresh does not wipe the player's funds. Future versions can expand
// to inventory, position, and quest state.

const SaveGame = {
  KEY: 'shattered-vale-save-v1',

  load(player) {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.gold === 'number') player.gold = data.gold;
      if (typeof data.premium === 'number') player.premium = data.premium;
      if (typeof data.honor === 'number') player.honor = data.honor;
    } catch (e) {
      console.warn('SaveGame load failed:', e);
    }
  },

  save(player) {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.gold = player.gold;
      data.premium = player.premium;
      data.honor = player.honor;
      data.savedAt = Date.now();
      localStorage.setItem(this.KEY, JSON.stringify(data));
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

  reset() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) {
      console.warn('SaveGame reset failed:', e);
    }
  },
};
