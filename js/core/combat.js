// core/combat.js — everything that happens as a *result* of player action:
// talking to an NPC, landing a hit, picking up a dropped item, or clicking
// something in the inventory panel. Reads its data from config/balance.js
// (numbers) and config/item-effects.js (what-happens-when tables) rather
// than hardcoding any of it here.
//
// Every function takes the shared game `state` object (see core/game.js)
// so this file never needs to close over game.js's internals.

const Combat = {
  toast(state, msg) {
    state.toastMsg = msg;
    state.toastTimer = 150;
  },

  // Talk to whichever NPC is within reach, if any.
  checkInteract(state) {
    const { player, npcs, dialogue } = state;
    const reach = { x: player.x - 10, y: player.y - 10, w: player.w + 20, h: player.h + 20 };

    for (const npc of npcs) {
      if (!rectsOverlap(reach, npc)) continue;

      // Weapon master: talks once, toggles PvP, then opens his honor shop.
      if (npc.id === 'weaponMaster' && npc.shop) {
        dialogue.open(npc, () => {
          player.pvp = !player.pvp;
          this.toast(state, player.pvp ? 'PvP attivato' : 'PvP disattivato');
          state.shop.openFor(npc.shop);
          AudioManager.play('openShop');
        });
        return;
      }

      if (npc.shop) {
        state.shop.openFor(npc.shop);
        AudioManager.play('openShop');
        return;
      }

      dialogue.open(npc, () => {
        npc.talked = true; // hide the "Talk with me" bubble after first completed talk

        if (npc === state.elder && state.questStage === 0) {
          state.questStage = 1;
          state.elder.hasQuest = false;
        }
        if (npc === state.merchant && !state.merchantGaveGift) {
          state.merchantGaveGift = true;
          state.inventory.add('potionRed', 1);
          this.toast(state, 'Ricevuto: Pozione di Cura');
        }
      });
      return;
    }
  },

  // Player's melee swing: damages every living enemy caught in the attack
  // hitbox, then resolves rewards/drops for any that died from it. Every
  // KNOCKBACK_EVERY_NTH_ATTACK-th swing also knocks back anything it hits
  // and doesn't kill.
  handleAttack(state) {
    const { player, enemies, particles, camera, multiplayer } = state;
    if (!player.startAttack()) return;
    AudioManager.play('attack');

    const isKnockbackSwing = player.attackCount % KNOCKBACK_EVERY_NTH_ATTACK === 0;
    const hb = player.attackHitbox();
    let didShake = false;
    enemies.forEach((en) => {
      if (!en.alive || !rectsOverlap(hb, en)) return;
      en.takeDamage(player.attackDamage, particles);
      if (!didShake) {
        camera.shake(isKnockbackSwing ? 4 : 2, isKnockbackSwing ? 6 : 4);
        didShake = true;
      }
      if (!en.alive) {
        this._onEnemyDefeated(state, en);
        return;
      }
      if (isKnockbackSwing) en.applyKnockback(player.centerX, player.centerY);
    });

    // PvP hits against online players with PvP enabled.
    if (multiplayer && player.pvp) {
      multiplayer.players.forEach((rp) => {
        if (!rp.pvp || rp.dead || !rectsOverlap(hb, rp)) return;
        multiplayer.sendPvpHit(rp.id, player.attackDamage);
        if (!didShake) {
          camera.shake(2, 4);
          didShake = true;
        }
      });
    }
  },

  _onEnemyDefeated(state, en) {
    if (state.multiplayer && state.multiplayer.connected) {
      state.multiplayer.sendEnemyDefeated(en.type, en.x, en.y);
      return;
    }

    const reward = getCombatReward(en.type);
    this._applyReward(state, reward);

    const bossEvent = BOSS_DEFEAT_EVENTS[en.type];
    if (bossEvent) bossEvent(this._bossEventCtx(state, en));
  },

  _applyReward(state, reward) {
    const { player, particles } = state;
    player.gold += reward.gold || 0;
    AudioManager.play('coin');

    const leveled = player.gainXP(reward.xp || 0, particles);
    if (leveled) {
      AudioManager.play('levelup');
      this.toast(state, 'Salito di livello! Ora livello ' + player.lvl);
      state.screenFlash = { color: '255,255,255', alpha: 0.3 };
    }
  },

  applyServerReward(state, reward) {
    this._applyReward(state, reward);
    if (reward.isBoss) {
      this.applyServerBossEvent(state, reward.bossType, reward.x, reward.y);
    }
  },

  spawnServerDrop(state, drop) {
    state.worldItems.push(new WorldItem(drop.x, drop.y, drop.kind));
  },

  applyServerBossEvent(state, type, x, y) {
    const bossEvent = BOSS_DEFEAT_EVENTS[type];
    if (!bossEvent) return;
    const en = { type, x, y };
    bossEvent(this._bossEventCtx(state, en));
  },

  // Small facade passed into config/item-effects.js's BOSS_DEFEAT_EVENTS
  // callbacks so they can drop loot, flash the screen, advance the quest,
  // open a gate, or queue a "System" cutscene without touching game.js state
  // directly.
  _bossEventCtx(state, en) {
    return {
      map: state.map,
      dropItem: (dx, dy, kind) => {
        if (state.multiplayer && state.multiplayer.connected) return;
        state.worldItems.push(new WorldItem(en.x + dx, en.y + dy, kind));
      },
      advanceQuestTo: (stage) => { state.questStage = Math.max(state.questStage, stage); },
      toast: (msg) => this.toast(state, msg),
      setScreenFlash: (flash) => { state.screenFlash = flash; },
      setVictory: () => { state.gameState = 'victory'; },
      openSystemDialogue: (lines) => {
        const systemNPC = new NPC(state.player.x, state.player.y, 'System', null, lines);
        state.dialogue.open(systemNPC, () => {});
      },
    };
  },

  // Gates that open once their guardian enemies are all dead (checked every
  // frame — see GATE_UNLOCK_CONDITIONS in config/item-effects.js).
  checkGateConditions(state) {
    const { enemies, map } = state;
    GATE_UNLOCK_CONDITIONS.forEach((gate) => {
      if (map[gate.isOpenFlag] || gate.stillGuarded(enemies)) return;
      gate.open(map);
      this.toast(state, gate.toast);
      state.screenFlash = gate.flash;
    });
  },

  // Standing on lava (Molten Depths) burns the player unless Fireproof
  // Boots are equipped. Reuses player.invuln as the damage cooldown — the
  // same brief flicker of immunity a melee hit grants — so this is one
  // tick roughly every 45 frames, not every single frame.
  checkHazards(state) {
    const { player, map, particles } = state;
    if (player.fireproof) return;
    const tileX = Math.floor(player.centerX / TILE);
    const tileY = Math.floor(player.centerY / TILE);
    if (map.get(tileX, tileY) === TileType.LAVA) {
      player.takeDamage(LAVA_DAMAGE_PER_TICK, particles);
    }
  },

  // Walking over an un-taken world item picks it up.
  processWorldItemPickups(state) {
    const { player, worldItems, inventory, particles } = state;
    worldItems.forEach((item) => {
      item.update();
      if (item.taken || !rectsOverlap(player, item)) return;
      item.taken = true;
      AudioManager.play('pickup');

      const effect = ITEM_PICKUP_EFFECTS[item.kind] || DEFAULT_PICKUP_EFFECT;
      effect.apply({
        player,
        inventory,
        particles,
        item,
        advanceQuestTo: (stage) => { state.questStage = Math.max(state.questStage, stage); },
      });
      if (effect.toast) this.toast(state, effect.toast);
      if (effect.flash) state.screenFlash = effect.flash;
    });
  },

  // A click inside the open inventory panel: using a potion, opening a chest,
  // equipping a backpack item, or unequipping whatever's worn in a gear slot.
  // `hit` is whatever Inventory.clickAt(...) returned.
  handleInventoryClick(state, hit) {
    const { player, inventory, particles } = state;

    if (hit.region === 'backpack') {
      const chest = ITEM_USE_EFFECTS[hit.kind];
      if (chest) {
        const res = chest.use({ player, inventory, multiplayer: state.multiplayer });
        if (res && res.ok) {
          const rarityLabel = RARITY_TIERS[res.rarity] ? RARITY_TIERS[res.rarity].label : res.rarity;
          const color = RARITY_TIERS[res.rarity] ? RARITY_TIERS[res.rarity].color : '#f1efe8';
          const rgb = color.replace('#', '').match(/.{2}/g).map(v => parseInt(v, 16)).join(',');
          this.toast(state, `Hai ottenuto [${rarityLabel}] ${res.name}`);
          state.screenFlash = { color: rgb, alpha: 0.4 };
          AudioManager.play('buy');
        } else {
          this.toast(state, (res && res.reason) || 'Impossibile aprire la cassa');
        }
        return;
      }
      const potion = USABLE_POTIONS[hit.kind];
      if (potion) {
        const used = potion.use({ inventory, player });
        if (used) potion.onUsed({ player, particles, toast: (msg) => this.toast(state, msg) });
        return;
      }
      const effect = ITEM_EQUIP_EFFECTS[hit.kind];
      if (effect) {
        effect.apply({ inventory, player });
        if (effect.toast) this.toast(state, effect.toast);
        this.recomputeDefense(state);
      }
    } else if (hit.region === 'equip') {
      const unequip = ITEM_UNEQUIP_EFFECTS[hit.slotId];
      if (unequip) {
        unequip({ inventory, player });
        this.recomputeDefense(state);
      }
    }
  },

  // Sums the defense value (see ARMOR_DEFENSE in config/item-stats.js) plus
  // any affixes of everything currently in inventory.equipped and stores the
  // total on player.defense. Recomputed from scratch rather than incrementally
  // adjusted, so slot-swaps (equipping over an already-occupied slot) can
  // never drift out of sync with what's actually worn.
  recomputeDefense(state) {
    const { player, inventory } = state;
    let total = 0;
    for (const slotId in inventory.equipped) {
      const kind = inventory.equipped[slotId];
      const affixes = kind && inventory.getAffixes(kind);
      const stats = kind && getItemStats(kind, affixes);
      if (stats && stats.def != null) total += stats.def;
    }
    player.defense = total;
  },

  applyServerChestResult(state, data) {
    if (!data || !data.ok) {
      this.toast(state, (data && data.reason) || 'Impossibile aprire la cassa');
      return;
    }
    const { player, inventory } = state;
    const roll = data.roll;
    if (roll.kind === 'coin') {
      player.gold += roll.value || 10;
    } else {
      inventory.add(roll.kind, 1, roll.affixes);
    }
    const name = getItemDisplayName(roll.kind, roll.affixes);
    const rarityLabel = RARITY_TIERS[roll.rarity] ? RARITY_TIERS[roll.rarity].label : roll.rarity;
    const color = RARITY_TIERS[roll.rarity] ? RARITY_TIERS[roll.rarity].color : '#f1efe8';
    const rgb = color.replace('#', '').match(/.{2}/g).map(v => parseInt(v, 16)).join(',');
    this.toast(state, `Hai ottenuto [${rarityLabel}] ${name}`);
    state.screenFlash = { color: rgb, alpha: 0.4 };
    AudioManager.play('buy');
  },
};
