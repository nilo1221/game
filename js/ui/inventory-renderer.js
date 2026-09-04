// js/ui/inventory-renderer.js — Destiny + Elden Ring inspired inventory UI.
// Overrides the canvas-based Inventory methods with a darker, more cinematic
// bottom-sheet layout: large equipped slots on the left, backpack grid in the
// center and a tall detail card on the right.

(function () {
  'use strict';

  if (typeof Inventory === 'undefined') {
    console.warn('[inventory-renderer] Inventory class not found');
    return;
  }

  const SLOTS = [
    { id: 'helmet', label: 'Elmo' },
    { id: 'weapon', label: 'Arma' },
    { id: 'armor',  label: 'Armatura' },
    { id: 'shield', label: 'Scudo' },
    { id: 'boots',  label: 'Stivali' },
  ];

  function rarityColor(kind) {
    if (typeof getRarityColor === 'function') return getRarityColor(kind);
    return '#b0b0b0';
  }

  function rarityLabelFor(kind) {
    if (typeof getItemRarity === 'function' && typeof RARITY_TIERS === 'object' && RARITY_TIERS) {
      const r = getItemRarity(kind);
      if (RARITY_TIERS[r]) return RARITY_TIERS[r].label;
    }
    return '';
  }

  function lighten(hex, amount) {
    // Simple helper to add a light rim to a rarity border.
    return hex;
  }

  // -------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------
  Inventory.prototype._layout = function (canvasW, canvasH) {
    const panelW = 900;
    const panelH = 460;
    const panelX = (canvasW - panelW) / 2;
    const panelY = (canvasH - panelH) / 2;

    // balanced three-column layout with equal margins
    const margin = 48;
    const colGap = 40;
    const startY = panelY + 83; // vertically center the whole block

    const equipSize = 64;
    const equipGap = 6;
    const equipX = panelX + margin;
    const equipY = startY;

    const equipSlots = SLOTS.map((s, i) => ({
      id: s.id,
      label: s.label,
      ix: equipX,
      iy: equipY + i * (equipSize + equipGap),
      size: equipSize,
    }));

    const cell = 56;
    const cellGap = 8;
    const cols = 7;
    const rows = 5;
    const bpX = equipX + equipSize + colGap;
    const bpY = startY;
    const kinds = Object.keys(this.items);

    const backpackItems = [];
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      backpackItems.push({
        kind: kinds[i] || null,
        ix: bpX + col * (cell + cellGap),
        iy: bpY + row * (cell + cellGap),
        size: cell,
      });
    }

    const bpWidth = cols * cell + (cols - 1) * cellGap;
    const detailW = 220;
    const detailX = bpX + bpWidth + colGap;
    const detailY = startY;

    return {
      panelX, panelY, panelW, panelH,
      equipSlots, backpackItems,
      detailX, detailY, detailW,
    };
  };

  // -------------------------------------------------------------------
  // Hit testing
  // -------------------------------------------------------------------
  Inventory.prototype.updateHover = function (mx, my, canvasW, canvasH) {
    this.hoveredKind = null;
    this.hoveredSlot = null;
    if (!this.open) return;

    const layout = this._layout(canvasW, canvasH);

    for (const slot of layout.equipSlots) {
      if (mx >= slot.ix && mx <= slot.ix + slot.size && my >= slot.iy && my <= slot.iy + slot.size) {
        this.hoveredSlot = slot.id;
        return;
      }
    }

    for (const item of layout.backpackItems) {
      if (mx >= item.ix && mx <= item.ix + item.size && my >= item.iy && my <= item.iy + item.size) {
        this.hoveredKind = item.kind;
        return;
      }
    }
  };

  Inventory.prototype.clickAt = function (mx, my, canvasW, canvasH) {
    if (!this.open) return null;
    const layout = this._layout(canvasW, canvasH);

    for (const slot of layout.equipSlots) {
      if (mx >= slot.ix && mx <= slot.ix + slot.size && my >= slot.iy && my <= slot.iy + slot.size) {
        return { region: 'equip', slotId: slot.id };
      }
    }

    for (const item of layout.backpackItems) {
      if (mx >= item.ix && mx <= item.ix + item.size && my >= item.iy && my <= item.iy + item.size) {
        if (!item.kind) return null;
        return { region: 'backpack', kind: item.kind };
      }
    }

    return null;
  };

  // -------------------------------------------------------------------
  // Drawing helpers
  // -------------------------------------------------------------------
  function drawSlotBase(ctx, x, y, size, kind, hovered) {
    const color = kind ? rarityColor(kind) : 'rgba(232,228,216,0.20)';

    // slot background
    ctx.fillStyle = hovered ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y, size, size, 8);
    ctx.fill();

    // rarity glow for non-empty slots
    if (kind) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = hovered ? 2.5 : 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = hovered ? 18 : 10;
      roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 7);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = hovered ? 'rgba(232,201,60,0.85)' : color;
      ctx.lineWidth = hovered ? 2 : 1;
      roundRect(ctx, x, y, size, size, 8);
      ctx.stroke();
    }
  }

  function drawItemIcon(ctx, kind, x, y, size) {
    const icon = Sprites.icons[kind];
    if (!icon) return;
    const pad = size * 0.18;
    const iconSize = size - pad * 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon, x + pad, y + pad, iconSize, iconSize);
    ctx.restore();
  }

  // -------------------------------------------------------------------
  // Main draw
  // -------------------------------------------------------------------
  Inventory.prototype.draw = function (ctx, canvasW, canvasH, player) {
    if (!this.open) return;

    const layout = this._layout(canvasW, canvasH);
    const { panelX, panelY, panelW, panelH } = layout;

    ctx.save();

    // dim the game world (Elden Ring bottom-sheet feel)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // panel background gradient
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, 'rgba(28,23,18,0.97)');
    grad.addColorStop(1, 'rgba(13,11,8,0.98)');
    ctx.fillStyle = grad;
    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    // outer golden rim
    ctx.strokeStyle = 'rgba(232,201,60,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    // top separator line
    ctx.strokeStyle = 'rgba(232,228,216,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 24, panelY + 54);
    ctx.lineTo(panelX + panelW - 24, panelY + 54);
    ctx.stroke();

    // header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8c93c';
    ctx.font = 'bold 20px Cinzel, serif';
    ctx.fillText('INVENTARIO', panelX + panelW / 2, panelY + 32);

    ctx.fillStyle = 'rgba(232,228,216,0.55)';
    ctx.font = '11px sans-serif';
    ctx.fillText('[i / Esc per chiudere] · Clicca un oggetto per equipaggiarlo o usarlo', panelX + panelW / 2, panelY + 50);
    ctx.textAlign = 'left';

    // section titles
    ctx.fillStyle = 'rgba(232,228,216,0.70)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('EQUIPAGGIAMENTO', layout.equipSlots[0].ix, layout.equipSlots[0].iy - 18);
    ctx.fillText('ZAINO', layout.backpackItems[0].ix, layout.backpackItems[0].iy - 18);
    ctx.fillText('DETTAGLIO', layout.detailX, layout.detailY - 18);

    // equipped gear
    for (const slot of layout.equipSlots) {
      const kind = this.equipped[slot.id];
      const hovered = this.hoveredSlot === slot.id;

      // slot label above
      ctx.fillStyle = 'rgba(232,228,216,0.45)';
      ctx.font = '9px sans-serif';
      ctx.fillText(slot.label.toUpperCase(), slot.ix, slot.iy - 6);

      drawSlotBase(ctx, slot.ix, slot.iy, slot.size, kind, hovered);

      if (kind) {
        drawItemIcon(ctx, kind, slot.ix, slot.iy, slot.size);
      } else {
        ctx.fillStyle = 'rgba(232,228,216,0.25)';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('—', slot.ix + slot.size / 2, slot.iy + slot.size / 2 + 5);
        ctx.textAlign = 'left';
      }
    }

    // backpack grid
    for (const item of layout.backpackItems) {
      const hovered = item.kind && this.hoveredKind === item.kind;

      drawSlotBase(ctx, item.ix, item.iy, item.size, item.kind, hovered);

      if (item.kind) {
        drawItemIcon(ctx, item.kind, item.ix, item.iy, item.size);

        const count = this.items[item.kind];
        if (count > 1) {
          ctx.fillStyle = '#f1efe8';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('x' + count, item.ix + item.size - 4, item.iy + item.size - 4);
          ctx.textAlign = 'left';
        }
      }
    }

    // detail card
    this._drawDetailCard(ctx, layout, player);

    ctx.restore();
  };

  // -------------------------------------------------------------------
  // Detail card
  // -------------------------------------------------------------------
  Inventory.prototype._drawDetailCard = function (ctx, layout, player) {
    const { detailX, detailY, detailW } = layout;

    // card background
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, detailX, detailY, detailW, 340, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,228,216,0.10)';
    ctx.lineWidth = 1;
    roundRect(ctx, detailX, detailY, detailW, 340, 10);
    ctx.stroke();

    const kind = this.hoveredKind || (this.hoveredSlot ? this.equipped[this.hoveredSlot] : null);

    if (!kind) {
      ctx.fillStyle = 'rgba(232,228,216,0.40)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Passa il mouse su un oggetto', detailX + detailW / 2, detailY + 40);
      ctx.fillText('per vedere i dettagli.', detailX + detailW / 2, detailY + 56);
      ctx.textAlign = 'left';
      return;
    }

    const affixes = this.getAffixes(kind);
    const stats = getItemStats(kind, affixes);
    const color = rarityColor(kind);
    const rarityLabel = rarityLabelFor(kind);

    // large icon
    const icon = Sprites.icons[kind];
    if (icon) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, detailX + (detailW - 80) / 2, detailY + 20, 80, 80);
      ctx.restore();
    }

    // rarity label
    if (rarityLabel) {
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rarityLabel.toUpperCase(), detailX + detailW / 2, detailY + 118);
      ctx.textAlign = 'left';
    }

    // item name
    ctx.fillStyle = color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    const nameLines = wrapPlainText(ctx, stats.name, detailW - 20);
    let ty = detailY + 140;
    nameLines.forEach((line) => {
      ctx.fillText(line, detailX + detailW / 2, ty);
      ty += 17;
    });
    ctx.textAlign = 'left';

    // stats
    ty += 10;
    ctx.font = '12px sans-serif';

    function statLine(label, value, sign, c) {
      if (value == null) return;
      ctx.fillStyle = 'rgba(232,228,216,0.55)';
      ctx.fillText(label, detailX + 16, ty);
      ctx.fillStyle = c || '#e8e4d8';
      ctx.textAlign = 'right';
      ctx.fillText((sign || '') + value, detailX + detailW - 16, ty);
      ctx.textAlign = 'left';
      ty += 18;
    }

    statLine('ATT', stats.atk, stats.atk >= 0 ? '+' : '', '#e8c93c');
    statLine('DIF', stats.def, stats.def >= 0 ? '+' : '', '#85b7eb');
    statLine('VEL', stats.spd ? stats.spd.toFixed(1) : null, stats.spd >= 0 ? '+' : '', '#78e0a8');

    if (stats.extra) {
      ty += 8;
      ctx.fillStyle = 'rgba(232,228,216,0.75)';
      ctx.font = 'italic 11px sans-serif';
      const lines = wrapPlainText(ctx, stats.extra, detailW - 28);
      lines.forEach((line) => {
        ctx.fillText(line, detailX + 14, ty);
        ty += 15;
      });
    }
  };
})();
