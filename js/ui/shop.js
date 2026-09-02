// ui/shop.js — canvas-drawn merchant shop overlay.
// Similar to the inventory panel: it is an object owned by game.js, toggled
// when the player talks to a merchant, and consumes mouse/keyboard input.

class Shop {
  constructor() {
    this.open = false;
    this.merchant = null;
    this.hovered = null;
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
    this.itemButtons = [];
  }

  openFor(merchant) {
    this.open = true;
    this.merchant = merchant;
    this.hovered = null;
    this.itemButtons = [];
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
  }

  close() {
    this.open = false;
    this.merchant = null;
    this.hovered = null;
    this.itemButtons = [];
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
  }

  _layout(viewW, viewH) {
    const panelW = 480;
    const panelH = 380;
    const px = (viewW - panelW) / 2;
    const py = (viewH - panelH) / 2;
    this.itemButtons = [];

    const startY = py + 70;
    const rowH = 42;
    const listX = px + 20;
    const listW = panelW - 40;
    const buyW = 70;
    const buyH = 28;

    if (this.merchant) {
      this.merchant.getStock().forEach((item, i) => {
        const y = startY + i * rowH;
        const buyX = listX + listW - buyW;
        this.itemButtons.push({
          kind: item.kind,
          x: buyX,
          y,
          w: buyW,
          h: buyH,
          itemX: listX,
          itemY: y,
          item,
        });
      });
    }

    this.exitBtn = { x: px + panelW - 80, y: py + 14, w: 60, h: 26 };
    this.buyCurrencyBtn = { x: px + panelW - 170, y: py + 14, w: 100, h: 26 };
    return { px, py, panelW, panelH };
  }

  updateHover(mx, my, viewW, viewH) {
    this._layout(viewW, viewH);
    this.hovered = null;
    if (this._pointIn(mx, my, this.exitBtn)) this.hovered = 'exit';
    if (this.merchant && this.merchant.currency === 'premium' && this._pointIn(mx, my, this.buyCurrencyBtn)) this.hovered = 'buyCurrency';
    for (const btn of this.itemButtons) {
      if (this._pointIn(mx, my, btn)) { this.hovered = btn.kind; break; }
    }
  }

  clickAt(mx, my, viewW, viewH) {
    this._layout(viewW, viewH);
    if (this._pointIn(mx, my, this.exitBtn)) return { action: 'close' };
    if (this.merchant && this.merchant.currency === 'premium' && this._pointIn(mx, my, this.buyCurrencyBtn)) return { action: 'buyCurrency' };
    for (const btn of this.itemButtons) {
      if (this._pointIn(mx, my, btn)) return { action: 'buy', kind: btn.kind };
    }
    return null;
  }

  _pointIn(mx, my, rect) {
    return rect && mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
  }

  draw(ctx, state, viewW, viewH) {
    const { px, py, panelW, panelH } = this._layout(viewW, viewH);

    // backdrop
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,5,0.92)';
    ctx.fillRect(0, 0, viewW, viewH);

    // panel
    ctx.fillStyle = 'rgba(20,22,16,0.98)';
    roundRect(ctx, px, py, panelW, panelH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,228,216,0.35)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, px, py, panelW, panelH, 10);
    ctx.stroke();

    // title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8c93c';
    ctx.font = 'bold 18px sans-serif';
    const title = this.merchant ? this.merchant.name : 'Mercante';
    ctx.fillText(title, viewW / 2, py + 36);

    // exit button
    this._drawBtn(ctx, this.exitBtn, 'Esci', this.hovered === 'exit');

    // currency
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '14px sans-serif';
    const cName = this.merchant ? this.merchant.currencyName : 'Oro';
    const cAmount = this.merchant ? state.player[this.merchant.currency] : 0;
    ctx.fillText(`${cName}: ${cAmount}`, px + 20, py + 32);

    if (this.merchant && this.merchant.currency === 'premium') {
      this._drawBtn(ctx, this.buyCurrencyBtn, 'Compra Gemme', this.hovered === 'buyCurrency');
    }

    if (!this.merchant) {
      ctx.restore();
      return;
    }

    // items
    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    for (const btn of this.itemButtons) {
      const item = btn.item;
      const stats = getItemStats(item.kind);
      const y = btn.itemY;

      // icon
      const icon = Sprites.icons[item.kind];
      if (icon) {
        ctx.shadowColor = 'rgba(232,201,60,0.3)';
        ctx.shadowBlur = 4;
        ctx.drawImage(icon, btn.itemX, y - 2, 28, 28);
        ctx.shadowBlur = 0;
      }

      // name + price/qty
      ctx.fillStyle = '#e8e4d8';
      const text = `${stats.name}  —  ${item.price} ${cName}  (x${item.qty})`;
      ctx.fillText(text, btn.itemX + 36, y + 17);

      this._drawBtn(ctx, { x: btn.x, y: y, w: btn.w, h: btn.h }, 'Compra', this.hovered === btn.kind);
    }

    ctx.restore();
  }

  _drawBtn(ctx, rect, label, active) {
    ctx.fillStyle = active ? '#3a6b3d' : '#2a3b2a';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = active ? '#5aa65c' : '#3a4a3a';
    ctx.lineWidth = 1;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.stroke();
    ctx.fillStyle = '#f1efe8';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
    ctx.textAlign = 'left';
  }
}
