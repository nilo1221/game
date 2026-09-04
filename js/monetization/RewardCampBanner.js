// js/monetization/RewardCampBanner.js — cartellone del camp: quest giornaliera a video singolo.

function RewardCampBanner(adManager) {
  this.adManager = adManager;
  this.lastWatched = 0;
  try {
    this.lastWatched = parseInt(localStorage.getItem('sv_camp_banner') || '0', 10);
  } catch (e) {
    this.lastWatched = 0;
  }
}

RewardCampBanner.prototype.watchDailyAd = function () {
  const now = Date.now();
  const cooldownMs = AD_REWARDS_CONFIG.PLACEMENTS.CAMP_BANNER.cooldown * 1000;

  if (now - this.lastWatched < cooldownMs) {
    console.log('[ADV] Quest cartellone già riscattata oggi.');
    return;
  }

  this.adManager.requestRewardedAd(
    () => {
      this.lastWatched = now;
      this._save();
      const reward = AD_REWARDS_CONFIG.PLACEMENTS.CAMP_BANNER.rewards;
      console.log(`[ADV] Quest completata! +${reward.gold} oro, +${reward.demonicShard} frammento`);
      // In futuro: player.gold += reward.gold; inventory.add('demonicShard', reward.demonicShard);
    },
    () => {
      console.warn('[ADV] Video non completato. Nessuna ricompensa.');
    }
  );
};

RewardCampBanner.prototype._save = function () {
  try {
    localStorage.setItem('sv_camp_banner', this.lastWatched);
  } catch (e) { /* ignore */ }
};
