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
    const pack = this.PACKS[packId] || this.PACKS.small;

    // TODO: send packId to a backend, open a real Stripe/PayPal checkout,
    // and call onSuccess only after the payment is verified server-side.
    // For now this is a client-side mock to keep the UI testable.
    // Do not pass the amount through the callback — the caller already knows
    // what it asked to buy; any real verification must come from the server.
    if (typeof onSuccess === 'function') onSuccess();
  },
};
