// js/monetization/RewardNpcMerchant.js — mercante che sblocca cassa demoniaca con frammenti.

function RewardNpcMerchant(adManager) {
  this.adManager = adManager;
  this.demonicShards = 0;
  try {
    this.demonicShards = parseInt(localStorage.getItem('sv_demonic_shards') || '0', 10);
  } catch (e) {
    this.demonicShards = 0;
  }
}

RewardNpcMerchant.prototype.watchAdForShard = function () {
  const required = AD_REWARDS_CONFIG.PLACEMENTS.MERCHANT_CHESTS.demonic.requiredShards;
  if (!this.adManager) return;

  this.adManager.requestRewardedAd(
    () => {
      this.demonicShards += 1;
      this._save();
      console.log(`[ADV] Frammento ottenuto: ${this.demonicShards}/${required}`);
      if (this.demonicShards >= required) {
        this.openDemonicChest();
        this.demonicShards = 0;
        this._save();
      }
    },
    () => {
      console.warn('[ADV] Video annullato o non disponibile. Nessun frammento.');
    }
  );
};

RewardNpcMerchant.prototype.openDemonicChest = function () {
  const roll = Math.random();
  let cumulative = 0;
  let reward = null;
  for (const r of AD_REWARDS_CONFIG.DEMONIC_DROP_RATES) {
    cumulative += r.rate;
    if (roll <= cumulative) {
      reward = r;
      break;
    }
  }
  if (reward) {
    console.log(`[ADV] Cassa Demoniaca: trovi ${reward.item}!`);
    // In futuro: inventory.add(reward.item);
  }
};

RewardNpcMerchant.prototype._save = function () {
  try {
    localStorage.setItem('sv_demonic_shards', this.demonicShards);
  } catch (e) { /* ignore */ }
};
