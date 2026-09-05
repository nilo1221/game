// js/monetization/adRewardsConfig.js — parametri ADV e ricompense.
// Struttura minima, espandibile in futuro.

const AD_REWARDS_CONFIG = {
  // Attesa minima tra un video e l'altro (secondi)
  COOLDOWN_BETWEEN_ADS: 30,

  PLACEMENTS: {
    // 1. Cartellone Camp — quest giornaliera (1 video/giorno)
    CAMP_BANNER: {
      cooldown: 86400, // 24 ore
      rewards: { gold: 500, premium: 1 }
    },

    // 2. Resurrezione game over
    REVIVE_AD: {
      maxPerRun: 1
    },

    // 3. Mercante casse
    MERCHANT_CHESTS: {
      normal: { requiredAds: 1, cooldown: 0 },
      epic: { requiredAds: 2, cooldown: 300 },
      demonic: { requiredShards: 5 }
    }
  },

  // Drop table Cassa Demoniaca
  DEMONIC_DROP_RATES: [
    { item: 'Arma_Demoniaca_Leggendaria', rate: 0.05 },
    { item: 'Gemme_Premium_x100', rate: 0.15 },
    { item: 'Oro_x5000', rate: 0.80 }
  ]
};
