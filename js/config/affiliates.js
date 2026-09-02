// config/affiliates.js — partner offers shown inside the premium shop.
// Clicking them opens the affiliate URL in a new tab. The user must give
// explicit consent (via the cookie banner) before any third-party tracker
// loads, but these links are plain outbound URLs.

const AFFILIATES = [
  {
    id: 'gearup',
    name: 'GearUP Booster',
    description: 'Riduci ping, packet loss e lag per PC, mobile e console.',
    url: 'https://gearup-khaki.vercel.app/?utm_source=shattered-vale&utm_medium=affiliate&utm_campaign=ingame-shop',
    color: '#3a8dff',
  },
];
