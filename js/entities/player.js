// entities/player.js — the player character: movement, melee/fireball
// combat, leveling. Starting numbers and growth curve live in
// config/balance.js (PLAYER_BASE_STATS / PLAYER_LEVEL_UP / FIREBALL_STATS)
// so tuning the game doesn't mean hunting through this file.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 26;
    this.drawW = 32;
    this.drawH = 34;

    this.speed = PLAYER_BASE_STATS.speed;
    this.dir = 'down';
    this.moving = false;

    this.hp = PLAYER_BASE_STATS.hp;
    this.maxHp = PLAYER_BASE_STATS.maxHp;
    this.atk = PLAYER_BASE_STATS.atk;
    this.lvl = PLAYER_BASE_STATS.lvl;
    this.xp = PLAYER_BASE_STATS.xp;
    this.xpNext = PLAYER_BASE_STATS.xpNext;
    this.gold = PLAYER_BASE_STATS.gold;
    this.premium = PLAYER_BASE_STATS.premium;
    this.honor = PLAYER_BASE_STATS.honor;
    this.pvp = false;

    this.hasSword = false;
    this.hasEpicSword = false;
    this.hasCursedSword = false;
    this.hasLegendarySword = false;
    this.hasMoltenSword = false;
    this.fireproof = false; // true while Fireproof Boots are equipped — negates lava damage
    this.defense = 0; // sum of equipped armor/helmet/shield (see Combat.recomputeDefense)
    this.weaponBonus = 0; // extra attack from weapon affixes (see Combat.handleInventoryClick)
    this.attacking = 0;
    this.attackCooldown = 0;
    this.attackCount = 0; // total swings landed — every KNOCKBACK_EVERY_NTH_ATTACK triggers a knockback (see Combat.handleAttack)
    this.invuln = 0;

    this.anim = new AnimatedSprite(Sprites.player, 32, 34);
    this.animSword = new AnimatedSprite(Sprites.playerSword, 32, 34);
    this.footstepTimer = 0;
    this.bob = 0;
    this.hitFlash = 0;

    // dash / aerial state
    this.dashActive = 0;
    this.dashCooldown = 0;
    this.dashCharges = DASH_STATS.charges;
    this.dashBuffer = 0;
    this.dashBufferDir = null;
    this.dashDirX = 0;
    this.dashDirY = 0;

    this.mana = PLAYER_BASE_STATS.mana;
    this.maxMana = PLAYER_BASE_STATS.maxMana;
    this.manaRegen = PLAYER_BASE_STATS.manaRegen;
    this.hunger = PLAYER_BASE_STATS.hunger;
    this.maxHunger = PLAYER_BASE_STATS.maxHunger;
    this.thirst = PLAYER_BASE_STATS.thirst;
    this.maxThirst = PLAYER_BASE_STATS.maxThirst;
    this.fireballCooldown = 0;
    this.fireballs = [];
  }

  tickSurvival() {
    this.hunger = Math.max(0, this.hunger - PLAYER_BASE_STATS.hungerDecay);
    this.thirst = Math.max(0, this.thirst - PLAYER_BASE_STATS.thirstDecay);
    if (this.hunger <= 0 && this.hp > 0) this.hp = Math.max(1, this.hp - PLAYER_BASE_STATS.hungerDamage);
    if (this.thirst <= 0 && this.hp > 0) this.hp = Math.max(1, this.hp - PLAYER_BASE_STATS.thirstDamage);
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  // Total melee damage per swing, including the equipped weapon's bonus.
  get attackDamage() {
    let base = WEAPON_ATTACK_BONUS.none;
    if (this.hasMoltenSword) base = WEAPON_ATTACK_BONUS.swordMolten;
    else if (this.hasLegendarySword) base = WEAPON_ATTACK_BONUS.swordLegendary;
    else if (this.hasEpicSword) base = WEAPON_ATTACK_BONUS.swordEpic;
    else if (this.hasCursedSword) base = WEAPON_ATTACK_BONUS.swordCursed;
    else if (this.hasSword) base = WEAPON_ATTACK_BONUS.sword;
    return Math.max(1, this.atk + base + (this.weaponBonus || 0));
  }

  tryMove(dx, dy, map) {
    const oldX = this.x, oldY = this.y;
    if (dx !== 0) {
      const nx = this.x + dx;
      const corners = [
        [nx + 4, this.y + 10],
        [nx + this.w - 4, this.y + 10],
        [nx + 4, this.y + this.h],
        [nx + this.w - 4, this.y + this.h],
      ];
      if (!corners.some(([cx, cy]) => map.isSolid(Math.floor(cx / TILE), Math.floor(cy / TILE)))) {
        this.x = nx;
      }
    }
    if (dy !== 0) {
      const ny = this.y + dy;
      const corners = [
        [this.x + 4, ny + 10],
        [this.x + this.w - 4, ny + 10],
        [this.x + 4, ny + this.h],
        [this.x + this.w - 4, ny + this.h],
      ];
      if (!corners.some(([cx, cy]) => map.isSolid(Math.floor(cx / TILE), Math.floor(cy / TILE)))) {
        this.y = ny;
      }
    }
    return { x: this.x !== oldX, y: this.y !== oldY };
  }

  update(input, map, particles) {
    const keys = input.keys;
    const just = input.justPressed || {};
    const stick = input.axes || { x: 0, y: 0 };

    if (this.dashActive > 0) {
      // dashing — fast movement, i-frames and an afterimage
      this.dashActive--;
      const dashDx = this.dashDirX * DASH_STATS.speed;
      const dashDy = this.dashDirY * DASH_STATS.speed;
      const moved = this.tryMove(dashDx, dashDy, map);
      this.moving = true;
      if ((dashDx !== 0 && !moved.x) || (dashDy !== 0 && !moved.y)) {
        if (particles) particles.burst(this.centerX, this.centerY, DASH_STATS.dust, 4);
      }
    } else {
      // dash resource management
      if (this.dashCooldown > 0) {
        this.dashCooldown--;
        if (this.dashCooldown === 0) this.dashCharges = DASH_STATS.charges;
      }
      if (this.dashBuffer > 0) this.dashBuffer--;
      if (this.dashBuffer > 0 && this.dashCharges > 0 && this.dashBufferDir) {
        this.startDash(this.dashBufferDir.dx, this.dashBufferDir.dy);
        this.dashBuffer = 0;
        this.dashBufferDir = null;
      }

      let dx = 0, dy = 0;
      const useStick = Math.abs(stick.x) > 0.1 || Math.abs(stick.y) > 0.1;
      if (useStick) {
        dx = stick.x * this.speed;
        dy = stick.y * this.speed;
      } else {
        if (keys['w'] || keys['arrowup']) dy = -this.speed;
        else if (keys['s'] || keys['arrowdown']) dy = this.speed;
        if (keys['a'] || keys['arrowleft']) dx = -this.speed;
        else if (keys['d'] || keys['arrowright']) dx = this.speed;
        if (dx !== 0 && dy !== 0) {
          dx *= 0.707;
          dy *= 0.707;
        }
      }

      // dash input (double dash: 2 charges)
      if (just['shift']) {
        const dirX = (dx || (this.dir === 'left' ? -1 : this.dir === 'right' ? 1 : 0));
        const dirY = (dy || (this.dir === 'up' ? -1 : this.dir === 'down' ? 1 : 0));
        if (this.dashCharges > 0) {
          this.startDash(dirX, dirY);
        } else if (this.dashCooldown > 0) {
          this.dashBuffer = DASH_STATS.buffer;
          this.dashBufferDir = { dx: dirX, dy: dirY };
        }
      }

      this.moving = dx !== 0 || dy !== 0;
      if (this.moving && !this.dashActive) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          this.dir = dx >= 0 ? 'right' : 'left';
        } else {
          this.dir = dy >= 0 ? 'down' : 'up';
        }
      }

      const moved = this.tryMove(dx, dy, map);
      if (dx !== 0 && !moved.x) {
        if (particles) particles.burst(this.centerX, this.centerY, DASH_STATS.dust, 3);
      }
      if (dy !== 0 && !moved.y) {
        if (particles) particles.burst(this.centerX, this.centerY, DASH_STATS.dust, 3);
      }
      if (this.moving) {
        this.footstepTimer++;
        if (this.footstepTimer > 14) {
          this.footstepTimer = 0;
          const tile = map.get(Math.floor(this.centerX / TILE), Math.floor((this.y + this.h) / TILE));
          if (tile === TileType.GRASS) particles.sparkle(this.centerX, this.y + this.h, 'rgba(255,255,255,0.5)');
        }
      }
    }

    this.anim.update(this.moving);
    this.animSword.update(this.moving);
    if (this.attacking > 0) this.attacking--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.invuln > 0) this.invuln--;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.fireballCooldown > 0) this.fireballCooldown--;

    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + this.manaRegen);
    }
    this.bob = this.moving ? Math.sin(Date.now() / 90) * 1.5 : 0;
  }

  startDash(dx, dy) {
    if (this.dashActive > 0 || this.dashCharges <= 0) return;
    this.dashCharges--;
    this.dashActive = DASH_STATS.duration;
    this.dashCooldown = DASH_STATS.cooldown;
    this.invuln = DASH_STATS.invuln;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) {
      if (this.dir === 'up') { dx = 0; dy = -1; }
      else if (this.dir === 'down') { dx = 0; dy = 1; }
      else if (this.dir === 'left') { dx = -1; dy = 0; }
      else { dx = 1; dy = 0; }
    } else {
      dx /= len;
      dy /= len;
    }
    this.dashDirX = dx;
    this.dashDirY = dy;
  }

  attackHitbox() {
    const range = 24;
    let ax = this.x, ay = this.y;
    if (this.dir === 'up') ay -= range;
    if (this.dir === 'down') ay += range;
    if (this.dir === 'left') ax -= range;
    if (this.dir === 'right') ax += range;
    return { x: ax, y: ay, w: this.w, h: this.h };
  }

  startAttack() {
    if (this.dashActive > 0) return false;
    if (this.attackCooldown > 0) return false;
    this.attacking = 14;
    this.attackCooldown = 20;
    this.attackCount++;
    return true;
  }

  takeDamage(amount, particles, fromPvp = false) {
    if (this.invuln > 0) return;
    const reduced = Math.max(1, Math.round(amount - this.defense));
    this.hp = clamp(this.hp - reduced, 0, this.maxHp);
    this.invuln = fromPvp ? 25 : 45;
    this.hitFlash = 12;
    particles.burst(this.centerX, this.centerY, '#e24b4a', 8);
    particles.floatText(this.centerX, this.y - 4, '-' + reduced, '#f09595');
  }

  gainXP(amount, particles) {
    this.xp += amount;
    particles.floatText(this.centerX, this.y - 10, '+' + amount + ' XP', '#85b7eb');
    let leveled = false;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.lvl++;
      this.xpNext = Math.floor(this.xpNext * PLAYER_LEVEL_UP.xpNextMultiplier) + PLAYER_LEVEL_UP.xpNextFlatBonus;
      this.maxHp += PLAYER_LEVEL_UP.hpGain;
      this.hp = this.maxHp;
      this.atk += PLAYER_LEVEL_UP.atkGain;
      leveled = true;
    }
    return leveled;
  }

  draw(ctx, camX, camY) {
    const sprite = this.hasSword ? this.animSword : this.anim;
    const drawX = this.x - camX - (this.drawW - this.w) / 2;
    const drawY = this.y - camY - (this.drawH - this.h) + 4 + this.bob;
    const flash = this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0;

    // dash afterimage
    if (this.dashActive > 0) {
      const s = this.hasSword ? this.animSword : this.anim;
      ctx.save();
      ctx.globalAlpha = 0.3;
      s.draw(ctx, drawX - this.dashDirX * 12, drawY - this.dashDirY * 12, this.dir, false);
      ctx.restore();
    }

    ctx.save();
    if (this.invuln > 0) ctx.globalAlpha = 0.55;
    sprite.draw(ctx, drawX, drawY, this.dir, flash);
    ctx.restore();

    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.hitFlash / 12) * 0.55;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#e24b4a';
      ctx.fillRect(drawX, drawY, this.drawW, this.drawH);
      ctx.restore();
    }

    if (this.attacking > 0) {
      const hb = this.attackHitbox();
      ctx.save();
      ctx.globalAlpha = this.attacking / 14 * 0.5;
      ctx.fillStyle = '#f1efe8';
      ctx.beginPath();
      ctx.ellipse(hb.x - camX + hb.w / 2, hb.y - camY + hb.h / 2, 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  castFireball() {
    if (this.mana < FIREBALL_STATS.manaCost) return false;
    if (this.fireballCooldown > 0) return false;

    this.mana -= FIREBALL_STATS.manaCost;
    this.fireballCooldown = FIREBALL_STATS.cooldown;

    let dx = 0, dy = 1;
    if (this.dir === 'up') dy = -1;
    if (this.dir === 'down') dy = 1;
    if (this.dir === 'left') { dx = -1; dy = 0; }
    if (this.dir === 'right') { dx = 1; dy = 0; }

    this.fireballs.push(new Fireball(this.centerX, this.centerY, dx, dy));
    return true;
  }
}
