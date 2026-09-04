// multiplayer-party.mjs — PartyKit 24/7 multiplayer client.
import PartySocket from 'https://esm.sh/partysocket';

class RemotePlayer {
  constructor(data, mp) {
    this.id = data.id;
    this.mp = mp;
    this.w = 22;
    this.h = 26;
    this.dead = false;
    this.lastAttackerId = null;
    this.update(data);
    this.anim = new AnimatedSprite(Sprites.player, 32, 34, true);
    this.animSword = new AnimatedSprite(Sprites.playerSword, 32, 34, true);
  }

  update(data) {
    const wasAlive = this.hp == null || this.hp > 0;
    this.tX = data.x;
    this.tY = data.y;
    if (this.x == null) this.x = data.x;
    if (this.y == null) this.y = data.y;
    this.dir = data.dir || 'down';
    this.moving = data.moving || false;
    this.attacking = data.attacking || 0;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;
    this.pvp = data.pvp || false;
    this.honor = data.honor || 0;
    this.name = data.name || 'Player';
    this.color = data.color || '#6f9';

    if (this.mp && wasAlive && this.hp <= 0 && this.lastAttackerId === this.mp.id && !this.dead) {
      this.dead = true;
      this.mp._onPvpKill(this.id);
    } else if (this.hp > 0) {
      this.dead = false;
    }
  }

  tick() {
    if (this.attacking > 0) this.attacking--;
    this.x += (this.tX - this.x) * 0.3;
    this.y += (this.tY - this.y) * 0.3;
    this.anim.update(this.moving);
    if (this.attacking > 0) this.animSword.update(true);
    else this.animSword.frame = 0;
  }

  draw(ctx, camX, camY) {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);
    this.anim.draw(ctx, px, py, this.dir);
    if (this.attacking > 0) this.animSword.draw(ctx, px, py, this.dir);

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(this.name, px + 16, py - 4);
    ctx.restore();
  }
}

class Multiplayer {
  constructor() {
    this.id = null;
    this.players = new Map();
    this.ws = null;
    this.connected = false;
    this.sendTimer = 0;
    this.name = 'Player';
    this.color = this._pickColor();
    this.onPvpHit = null;
    this.onPvpKill = null;
    this.onError = null;
    this.onChat = null;
    this.onReward = null;
    this.onDrop = null;
    this.onBossEvent = null;
    this.onChestResult = null;
    this.onProfile = null;
    this.onAchievement = null;
    this.onRegionUnlocked = null;
    this.onStashResult = null;
  }

  _pickColor() {
    const colors = ['#6f9', '#f96', '#69f', '#f6f', '#ff9', '#9ff', '#f99'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  connect(name = 'Player') {
    if (this.ws) return;
    this.name = name;

    const hasExplicitServer = typeof WS_SERVER !== 'undefined' && WS_SERVER;
    const host = window.location.host;

    if (!hasExplicitServer && /\.vercel\.app$/.test(host)) {
      console.warn('[mp] multiplayer disabled on Vercel: set WS_SERVER in balance.js');
      if (this.onError) this.onError(new Error('Multiplayer non configurato per Vercel'));
      return;
    }

    const serverUrl = hasExplicitServer ? WS_SERVER : 'http://localhost:1999';

    this.ws = new PartySocket({
      host: serverUrl,
      room: 'main',
    });

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onmessage = (e) => this._onMessage(e.data);

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
    };

    this.ws.onerror = (e) => {
      console.warn('[mp] partykit connection error', e);
      if (this.onError) this.onError(e);
      this.connected = false;
    };
  }

  _onMessage(data) {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'id') this.id = msg.id;
      if (msg.type === 'players') this.updatePlayers(msg.players);
      if (msg.type === 'chat') {
        if (this.onChat) this.onChat(msg.from, msg.text);
      }
      if (msg.type === 'pvpHit') this.handleEvent(msg);
      if (msg.type === 'reward' && this.onReward) this.onReward(msg);
      if (msg.type === 'drop' && this.onDrop) this.onDrop(msg);
      if (msg.type === 'bossEvent' && this.onBossEvent) this.onBossEvent(msg);
      if (msg.type === 'chestResult' && this.onChestResult) this.onChestResult(msg);
      if (msg.type === 'profile' && this.onProfile) this.onProfile(msg.profile);
      if (msg.type === 'achievement' && this.onAchievement) this.onAchievement(msg);
      if (msg.type === 'regionUnlocked' && this.onRegionUnlocked) this.onRegionUnlocked(msg);
      if (msg.type === 'stashResult' && this.onStashResult) this.onStashResult(msg);
    } catch (e) {
      console.error('[mp] invalid message', e);
    }
  }

  updatePlayers(list) {
    const ids = new Set();
    for (const p of list) {
      if (p.id === this.id) continue;
      ids.add(p.id);
      const rp = this.players.get(p.id);
      if (!rp) this.players.set(p.id, new RemotePlayer(p, this));
      else rp.update(p);
    }
    for (const id of this.players.keys()) {
      if (!ids.has(id)) this.players.delete(id);
    }
  }

  send(player) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.sendTimer++;
    if (this.sendTimer < 2) return;
    this.sendTimer = 0;
    this.ws.send(JSON.stringify({
      type: 'state',
      payload: {
        x: player.x,
        y: player.y,
        dir: player.dir,
        moving: player.moving,
        attacking: player.attacking,
        hp: player.hp,
        maxHp: player.maxHp,
        pvp: player.pvp,
        honor: player.honor,
        name: this.name,
        color: this.color,
      },
    }));
  }

  sendChat(text) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    text = String(text).trim().slice(0, 120);
    if (!text) return;
    this.ws.send(JSON.stringify({ type: 'chat', text }));
  }

  sendPvpHit(targetId, damage) {
    const rp = this.players.get(targetId);
    if (rp) rp.lastAttackerId = this.id;
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'pvpHit', targetId, damage }));
  }

  sendEnemyDefeated(type, x, y) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'enemyDefeated', type, x, y }));
  }

  sendOpenChest(chestKind) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'openChest', chestKind }));
  }

  sendPvpKill() {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'pvpKill' }));
  }

  sendRegionEnter(region) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'regionEnter', region }));
  }

  sendStashDeposit(kind, count = 1) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'stashDeposit', kind, count }));
  }

  sendStashWithdraw(kind, count = 1) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'stashWithdraw', kind, count }));
  }

  sendStashList() {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'stashList' }));
  }

  handleEvent(msg) {
    if (msg.targetId === this.id && this.onPvpHit) {
      this.onPvpHit(msg.from, msg.damage);
    }
    const rp = this.players.get(msg.targetId);
    if (rp) rp.lastAttackerId = this.id;
  }

  _onPvpKill(targetId) {
    this.sendPvpKill();
    if (this.onPvpKill) this.onPvpKill(this.name);
  }

  tick() {
    this.players.forEach((p) => p.tick());
  }

  draw(ctx, camX, camY) {
    this.players.forEach((p) => p.draw(ctx, camX, camY));
  }

  disconnect() {
    if (this.ws) this.ws.close();
  }
}

window.RemotePlayer = RemotePlayer;
window.Multiplayer = Multiplayer;
