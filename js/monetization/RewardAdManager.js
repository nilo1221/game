// js/monetization/RewardAdManager.js — wrapper minimo per video rewarded.
// Usa AdManager esistente (js/systems/ad-manager.js) se disponibile, altrimenti simula.

function RewardAdManager(game) {
  this.game = game;
  this.isAdRunning = false;
}

RewardAdManager.prototype.requestRewardedAd = function (onSuccess, onFailure) {
  if (this.isAdRunning) return;
  this.isAdRunning = true;
  this._pause();

  const finish = (success, err) => {
    this._resume();
    this.isAdRunning = false;
    if (success && typeof onSuccess === 'function') onSuccess();
    else if (!success && typeof onFailure === 'function') onFailure(err);
  };

  if (typeof AdManager !== 'undefined' && AdManager.showRewarded) {
    AdManager.showRewarded((success) => finish(success, null));
  } else {
    console.log('[DEV MODE] Simulazione rewarded ADV (2 sec)...');
    setTimeout(() => finish(true, null), 2000);
  }
};

RewardAdManager.prototype._pause = function () {
  if (typeof AudioManager !== 'undefined') {
    if (AudioManager.setMuted) AudioManager.setMuted(true);
    else AudioManager.muted = true;
  }
};

RewardAdManager.prototype._resume = function () {
  if (typeof AudioManager !== 'undefined') {
    if (AudioManager.setMuted) AudioManager.setMuted(false);
    else AudioManager.muted = false;
    if (AudioManager.resume) AudioManager.resume();
  }
};
