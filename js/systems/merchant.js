// systems/merchant.js — a simple shop/merchant instance.
// Each merchant owns a stock of item kinds (with prices and quantities) and
// can sell them to the player for a chosen currency.

class Merchant {
  constructor(name, stock, currency = 'gold') {
    this.name = name;
    this.currency = currency;
    this.currencyName = currency === 'premium' ? 'Gemme' : currency === 'honor' ? 'Onore' : 'Oro';
    this.stock = stock.map(entry => ({ ...entry })); // shallow copy so each merchant is independent
  }

  getStock() {
    return this.stock;
  }

  getItem(kind) {
    return this.stock.find(entry => entry.kind === kind);
  }

  canAfford(kind, player) {
    const item = this.getItem(kind);
    return item && item.qty > 0 && player[this.currency] >= item.price;
  }

  buy(kind, player, inventory) {
    const item = this.getItem(kind);
    if (!item || item.qty <= 0) return { ok: false, reason: 'esaurito' };
    if (player[this.currency] < item.price) return { ok: false, reason: 'insufficiente' };

    player[this.currency] -= item.price;
    item.qty -= 1;
    inventory.add(item.kind, 1);
    return { ok: true };
  }

  sell(kind, player, inventory) {
    if (!inventory.items[kind] || inventory.items[kind] <= 0) return { ok: false, reason: 'non possiedi' };
    const item = this.getItem(kind);
    if (!item) return { ok: false, reason: 'non acquistabile' };
    const price = Math.max(1, Math.floor(item.price * SELL_RATE));
    inventory.remove(kind, 1);
    player[this.currency] += price;
    return { ok: true, price };
  }

  getSellPrice(kind) {
    const item = this.getItem(kind);
    if (!item) return 0;
    return Math.max(1, Math.floor(item.price * SELL_RATE));
  }
}
