// config/ads.js — direct ad inventory sold to indie partners/ADV networks.
// Each ad is a plain outbound link. Impressions and clicks are tracked by
// js/systems/ad-manager.js and stored locally (or sent to Supabase later).

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
