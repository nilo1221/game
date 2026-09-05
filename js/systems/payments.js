// systems/payments.js — placeholder payment provider.
// Replace the checkout() implementation with a real Stripe/PayPal backend flow
// once the project has a server-side component to validate transactions.

const Payments = {
  PACKS: {
    small:  { gems: 10,  price: '€0.99' },
    medium: { gems: 50,  price: '€3.99' },
    large:  { gems: 120, price: '€7.99' },
  },

  purchase(packId, onSuccess) {
    // Pagamenti reali disabilitati: le gemme si guadagnano in gioco
    // (boss, casse, ricompense affiliato/ADV). Non chiamare onSuccess,
    // altrimenti si regalerebbero gemme gratis.
    console.warn('[Payments] Acquisti disabilitati: le gemme si guadagnano in gioco.');
  },
};
