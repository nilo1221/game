# Sistema Reward ADV (minimo)

Cartella `js/monetization/` — gestione pubblicità e ricompense.

## File

- `adRewardsConfig.js` — parametri cooldown, ricompense, drop table.
- `RewardAdManager.js` — wrapper rewarded, pausa audio, dev-mode fallback.
- `RewardNpcMerchant.js` — mercante casse demoniache con frammenti.
- `RewardCampBanner.js` — quest giornaliera del cartellone.
- `RewardGameOverModal.js` — opzione resurrezione a video.

## Note

- Nessun `import/export`: usa oggetti globali come il resto del gioco.
- `RewardAdManager` si appoggia a `AdManager` di `js/systems/ad-manager.js` se presente.
- Ricompense attuali stampano in console; da collegare a `player.gold`, `inventory` e `Combat.toast` in futuro.
