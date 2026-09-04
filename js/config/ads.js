// config/ads.js — direct ad inventory sold to indie partners/ADV networks.
// Each ad is a plain outbound link. Impressions and clicks are tracked by
// js/systems/ad-manager.js and stored locally (or sent to Supabase later).

// Network configuration for real ads (ADV). Set provider to one of:
// 'none' | 'adsense' | 'adsterra' | 'gamemonetize' | 'poki' | 'crazygames'.
const AD_NETWORK = {
  provider: 'none',

  adsense: {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',
    test: false,
  },

  adsterra: {
    // Paste the Adsterra banner <script> here, or leave empty for direct-link only.
    bannerScript: '',
    // Direct Link URL used for the "Sponsor" button.
    directLink: 'https://example.com?utm_source=shattered-vale',
  },

  gamemonetize: {
    gameId: 'YOUR_GAME_ID',
  },

  poki: {
    gameId: 'YOUR_GAME_ID',
  },
};

const DIRECT_ADS = [
  {
    id: 'indiepartner',
    name: 'Offerta in evidenza',
    description: 'Sostieni Shattered Vale: scopri giochi indie simili.',
    url: 'https://example.com/?utm_source=shattered-vale&utm_medium=ingame-banner&utm_campaign=premium-shop',
    color: '#3a8dff',
    label: 'Sponsor',
  },
];

// Which ad to show in each slot. For now one static slot; rotation can be
// added in AdManager later.
const AD_SLOTS = {
  premiumShop: DIRECT_ADS[0],
};
