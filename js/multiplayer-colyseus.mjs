// multiplayer-colyseus.mjs — Colyseus 24/7 multiplayer client.
import { Client } from 'https://esm.sh/colyseus.js@0.16.15';

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
    this.client = null;
    this.room = null;
    this.ws = null;
    this.connected = false;
    this.sendTimer = 0;
    this.name = 'Player';
    this.color = this._pickColor();
    this.onPvpHit = null;
    this.onPvpKill = null;
    this.onError = null;
    this.onChat = null;
  }

  _pickColor() {
    const colors = ['#6f9', '#f96', '#69f', '#f6f', '#ff9', '#9ff', '#f99'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  _dataFromSchema(p, id) {
    return {
      id,
      x: p.x,
      y: p.y,
      dir: p.dir,
      moving: p.moving,
      attacking: p.attacking,
      hp: p.hp,
      maxHp: p.maxHp,
      pvp: p.pvp,
      honor: p.honor,
      name: p.name,
      color: p.color,
    };
  }

  connect(name = 'Player') {
    if (this.client) return;
    this.name = name;

    const hasExplicitServer = typeof WS_SERVER !== 'undefined' && WS_SERVER;
    const host = window.location.host;

    if (!hasExplicitServer && /\.vercel\.app$/.test(host)) {
      console.warn('[mp] multiplayer disabled on Vercel: set WS_SERVER in balance.js');
      if (this.onError) this.onError(new Error('Multiplayer non configurato per Vercel'));
      return;
    }

    let serverUrl;
    if (hasExplicitServer) {
      serverUrl = WS_SERVER;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      serverUrl = `${protocol}//${host}`;
    }

    this.client = new Client(serverUrl);
    this.client.joinOrCreate('game_room', { name, color: this.color })
      .then((room) => {
        this.room = room;
        this.id = room.sessionId;
        this.ws = room.connection;
        this.connected = true;

        room.onStateChange((state) => this._updateFromState(state));

        room.onMessage('chat', (msg) => {
          if (this.onChat) this.onChat(msg.from, msg.text);
        });

        room.onMessage('pvpHit', (msg) => {
          if (msg.targetId === this.id && this.onPvpHit) {
            this.onPvpHit(msg.from, msg.damage);
          }
          const rp = this.players.get(msg.targetId);
          if (rp) rp.lastAttackerId = this.id;
        });

        room.onLeave(() => { this.connected = false; this.ws = null; });
        room.onError((e) => { console.warn('[mp] room error', e); if (this.onError) this.onError(e); });
      })
      .catch((e) => {
        console.warn('[mp] connect failed', e);
        if (this.onError) this.onError(e);
        this.connected = false;
        this.client = null;
      });
  }

  _updateFromState(state) {
    const ids = new Set();
    for (const [id, p] of state.players) {
      if (id === this.id) continue;
      ids.add(id);
      const data = this._dataFromSchema(p, id);
      const rp = this.players.get(id);
      if (!rp) this.players.set(id, new RemotePlayer(data, this));
      else rp.update(data);
    }
    for (const id of this.players.keys()) {
      if (!ids.has(id)) this.players.delete(id);
    }
  }

  send(player) {
    if (!this.connected || !this.room) return;
    this.sendTimer++;
    if (this.sendTimer < 2) return;
    this.sendTimer = 0;
    this.room.send('state', {
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
    });
  }

  sendChat(text) {
    if (!this.connected || !this.room) return;
    text = String(text).trim().slice(0, 120);
    if (!text) return;
    this.room.send('chat', { text });
  }

  sendPvpHit(targetId, damage) {
    const rp = this.players.get(targetId);
    if (rp) rp.lastAttackerId = this.id;
    if (!this.connected || !this.room) return;
    this.room.send('pvpHit', { targetId, damage });
  }

  _onPvpKill(targetId) {
    if (this.onPvpKill) this.onPvpKill(this.name);
  }

  tick() {
    this.players.forEach((p) => p.tick());
  }

  draw(ctx, camX, camY) {
    this.players.forEach((p) => p.draw(ctx, camX, camY));
  }

  disconnect() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.ws = null;
    this.connected = false;
  }
}

window.RemotePlayer = RemotePlayer;
window.Multiplayer = Multiplayer;
