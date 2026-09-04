// systems/ad-manager.js — simple direct-ad tracker.
// Stores impression/click counters in localStorage. No third-party scripts
// are loaded unless the user explicitly clicks and visits the advertiser.

const AdManager = {
  KEY: 'shattered-vale-ads-v1',
  _data: null,
  _seen: new Set(),

  _init() {
    if (this._data) return;
    try {
      const raw = localStorage.getItem(this.KEY);
      this._data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this._data = {};
    }
  },

  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._data));
    } catch (e) { /* ignore */ }
  },

  _key(adId, slot) { return `${slot}:${adId}`; },
  _ensure(adId, slot) {
    this._init();
    const k = this._key(adId, slot);
    if (!this._data[k]) this._data[k] = { impressions: 0, clicks: 0 };
    return k;
  },

  trackImpression(adId, slot) {
    const k = this._ensure(adId, slot);
    if (this._seen.has(k)) return;
    this._seen.add(k);
    this._data[k].impressions += 1;
    this._save();
    console.log('[ADV] impression', slot, adId);
  },

  trackClick(adId, slot) {
    const k = this._ensure(adId, slot);
    this._data[k].clicks += 1;
    this._save();
    console.log('[ADV] click', slot, adId);
  },

  getAdForSlot(slot) { return AD_SLOTS[slot] || null; },

  openAd(ad, slot) {
    if (!ad || !ad.url) return;
    this.trackClick(ad.id, slot);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  },
};
