// systems/save.js — persistence for gold/premium/honor and player name.
// Supports localStorage as a fast fallback and Appwrite Cloud when configured.

const SaveGame = {
  KEY: 'shattered-vale-save-v1',

  // Build the plain save object from a player instance.
  getData(player) {
    return {
      gold: player.gold,
      premium: player.premium,
      honor: player.honor,
      name: this.getName(),
      savedAt: Date.now(),
    };
  },

  // Apply a saved data object to a player instance.
  applyData(player, data) {
    if (!data) return;
    if (typeof data.gold === 'number') player.gold = data.gold;
    if (typeof data.premium === 'number') player.premium = data.premium;
    if (typeof data.honor === 'number') player.honor = data.honor;
    if (typeof data.name === 'string' && data.name) this.setName(data.name);
  },

  load(player) {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.applyData(player, data);
    } catch (e) {
      console.warn('SaveGame load failed:', e);
    }
  },

  save(player, opts = {}) {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.gold = player.gold;
      data.premium = player.premium;
      data.honor = player.honor;
      data.savedAt = Date.now();
      localStorage.setItem(this.KEY, JSON.stringify(data));

      if (opts.cloud !== false && typeof CloudSave !== 'undefined' && CloudSave.enabled && CloudSave.loggedIn) {
        CloudSave.save(this.getData(player));
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

  reset() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) {
      console.warn('SaveGame reset failed:', e);
    }
  },
};
