// ui/shop.js — canvas-drawn merchant shop overlay.
// Similar to the inventory panel: it is an object owned by game.js, toggled
// when the player talks to a merchant, and consumes mouse/keyboard input.

function formatItemStats(kind) {
  const s = getItemStats(kind);
  const parts = [];
  if (s.atk != null) parts.push(`ATT +${s.atk}`);
  if (s.def != null) parts.push(`DEF +${s.def}`);
  if (s.spd != null) parts.push(`VEL +${s.spd}`);
  if (s.extra) parts.push(s.extra);
  return parts.join(' • ');
}

class Shop {
  constructor() {
    this.open = false;
    this.merchant = null;
    this.hovered = null;
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
    this.itemButtons = [];
    this.affiliateButtons = [];
  }

  openFor(merchant) {
    this.open = true;
    this.merchant = merchant;
    this.hovered = null;
    this.itemButtons = [];
    this.affiliateButtons = [];
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
  }

  close() {
    this.open = false;
    this.merchant = null;
    this.hovered = null;
    this.itemButtons = [];
    this.affiliateButtons = [];
    this.exitBtn = null;
    this.buyCurrencyBtn = null;
  }

  _layout(viewW, viewH) {
    const panelW = 560;
    const panelH = 460 + (this.merchant ? AFFILIATES.length * 60 + 40 : 0);
    const px = (viewW - panelW) / 2;
    const py = (viewH - panelH) / 2;
    this.itemButtons = [];
    this.affiliateButtons = [];

    const startY = py + 70;
    const rowH = 52;
    const listX = px + 20;
    const listW = panelW - 40;
    const buyW = 80;
    const buyH = 32;

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

    this.exitBtn = { x: px + panelW - 90, y: py + 12, w: 70, h: 28 };
    this.buyCurrencyBtn = { x: px + panelW - 180, y: py + 12, w: 100, h: 28 };

    if (this.merchant && this.merchant.currency === 'premium' && AFFILIATES.length) {
      const affStartY = startY + this.merchant.getStock().length * rowH + 30;
      AFFILIATES.forEach((aff, i) => {
        const y = affStartY + i * (rowH + 8);
        const visitX = listX + listW - buyW;
        this.affiliateButtons.push({
          id: aff.id,
          x: visitX,
          y,
          w: buyW,
          h: buyH,
          aff,
          affX: listX,
          affY: y,
        });
      });
    }

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
    for (const btn of this.affiliateButtons) {
      if (this._pointIn(mx, my, btn)) { this.hovered = `aff:${btn.id}`; break; }
    }
  }

  clickAt(mx, my, viewW, viewH) {
    this._layout(viewW, viewH);
    if (this._pointIn(mx, my, this.exitBtn)) return { action: 'close' };
    if (this.merchant && this.merchant.currency === 'premium' && this._pointIn(mx, my, this.buyCurrencyBtn)) return { action: 'buyCurrency' };
    for (const btn of this.itemButtons) {
      if (this._pointIn(mx, my, btn)) return { action: 'buy', kind: btn.kind };
    }
    for (const btn of this.affiliateButtons) {
      if (this._pointIn(mx, my, btn)) return { action: 'affiliate', id: btn.id };
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

      const icon = Sprites.icons[item.kind];

      // name
      ctx.fillStyle = '#f1efe8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(stats.name, btn.itemX + 40, y + 16);

      // stats/description
      const extra = formatItemStats(item.kind);
      if (extra) {
        ctx.fillStyle = '#b0b0b0';
        ctx.font = '11px sans-serif';
        ctx.fillText(extra, btn.itemX + 40, y + 32);
      }

      // price / qty
      ctx.fillStyle = '#e8c93c';
      ctx.font = '12px sans-serif';
      const priceText = `${item.price} ${cName} (x${item.qty})`;
      const priceW = ctx.measureText(priceText).width;
      ctx.fillText(priceText, btn.x - priceW - 12, y + 18);

      // icon 32x32 with crisp scaling
      if (icon) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(icon, btn.itemX, y - 2, 32, 32);
        ctx.imageSmoothingEnabled = true;
      }

      this._drawBtn(ctx, { x: btn.x, y: y + 8, w: btn.w, h: btn.h }, 'Compra', this.hovered === btn.kind);
    }

    // affiliate offers
    if (this.affiliateButtons.length) {
      const first = this.affiliateButtons[0];
      const sepY = first.affY - 24;
      ctx.fillStyle = 'rgba(232,228,216,0.2)';
      ctx.fillRect(listX, sepY, listW, 1);

      ctx.fillStyle = '#e8c93c';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Offerte sponsorizzate', listX, sepY + 14);

      for (const btn of this.affiliateButtons) {
        const aff = btn.aff;
        const y = btn.affY;

        ctx.fillStyle = aff.color;
        roundRect(ctx, listX, y - 2, 6, 28, 3);
        ctx.fill();

        ctx.fillStyle = '#f1efe8';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(aff.name, listX + 14, y + 10);
        ctx.fillStyle = '#b0b0b0';
        ctx.font = '11px sans-serif';
        ctx.fillText(aff.description, listX + 14, y + 26);

        this._drawBtn(ctx, { x: btn.x, y: y, w: btn.w, h: btn.h }, 'Visita', this.hovered === `aff:${btn.id}`);
      }
    }

    // item detail preview on hover
    const hoveredBtn = this.hovered
      ? this.itemButtons.find((b) => b.kind === this.hovered)
      : null;
    if (hoveredBtn) {
      const detail = getItemStats(hoveredBtn.item.kind);
      const dx = px + panelW - 230;
      const dy = py + panelH - 120;
      const dw = 210;
      const dh = 100;

      ctx.fillStyle = 'rgba(30, 26, 20, 0.98)';
      roundRect(ctx, dx, dy, dw, dh, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,228,216,0.3)';
      ctx.lineWidth = 1;
      roundRect(ctx, dx, dy, dw, dh, 8);
      ctx.stroke();

      const icon = Sprites.icons[hoveredBtn.item.kind];
      if (icon) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(icon, dx + 12, dy + 14, 48, 48);
        ctx.imageSmoothingEnabled = true;
      }

      ctx.fillStyle = '#f1efe8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(detail.name, dx + 70, dy + 28);

      const desc = formatItemStats(hoveredBtn.item.kind);
      if (desc) {
        ctx.fillStyle = '#b0b0b0';
        ctx.font = '11px sans-serif';
        ctx.fillText(desc, dx + 70, dy + 46, dw - 80);
      }

      ctx.fillStyle = '#e8c93c';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${hoveredBtn.item.price} ${cName}`, dx + 70, dy + 76);
    }

    // hint comandi
    ctx.fillStyle = 'rgba(232,228,216,0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESC per chiudere', viewW / 2, py + panelH - 14);
    ctx.textAlign = 'left';

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
