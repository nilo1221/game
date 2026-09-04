// js/monetization/RewardGameOverModal.js — opzione "Second Chance" (resurrezione ADV).

function RewardGameOverModal(game, adManager) {
  this.game = game;
  this.adManager = adManager;
  this.hasRevived = false;
}

RewardGameOverModal.prototype.onReviveClick = function () {
  if (this.hasRevived) {
    console.log('[ADV] Resurrezione già usata in questa partita.');
    return;
  }
  if (!this.adManager) return;

  this.adManager.requestRewardedAd(
    () => {
      this.hasRevived = true;
      if (this.game && this.game.player) {
        this.game.player.hp = this.game.player.maxHp;
      }
      if (this.game && this.game.resumeFromGameOver) {
        this.game.resumeFromGameOver();
      } else if (window.__gameDebug && window.__gameDebug.restartGame) {
        // Fallback: restart minimale se resume non esiste
        window.__gameDebug.restartGame();
      }
      console.log('[ADV] Resurrezione completata.');
    },
    () => {
      console.warn('[ADV] Resurrezione annullata.');
    }
  );
};
