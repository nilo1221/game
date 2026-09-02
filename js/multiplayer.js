// multiplayer.js — basic WebSocket multiplayer: share position and state
// with other players in the same room (same server). All players see each
// other as remote sprites drawn on top of the world.

class RemotePlayer {
  constructor(data) {
    this.id = data.id;
    this.update(data);
    this.anim = new AnimatedSprite(Sprites.player, 32, 34, true);
    this.animSword = new AnimatedSprite(Sprites.playerSword, 32, 34, true);
  }

  update(data) {
    this.tX = data.x;
    this.tY = data.y;
    if (this.x == null) this.x = data.x;
    if (this.y == null) this.y = data.y;
    this.dir = data.dir || 'down';
    this.moving = data.moving || false;
    this.attacking = data.attacking || 0;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;
    this.name = data.name || 'Player';
    this.color = data.color || '#6f9';
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

    // name tag
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
  }

  _pickColor() {
    const colors = ['#6f9', '#f96', '#69f', '#f6f', '#ff9', '#9ff', '#f99'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  connect(name = 'Player') {
    if (this.ws) return;
    this.name = name;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    try {
      this.ws = new WebSocket(`${protocol}//${host}`);
      this.ws.onopen = () => { this.connected = true; };
      this.ws.onmessage = (e) => this._onMessage(e.data);
      this.ws.onclose = () => { this.connected = false; };
      this.ws.onerror = (e) => console.error('[mp] error', e);
    } catch (e) {
      console.error('[mp] connect failed', e);
    }
  }

  _onMessage(data) {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'id') this.id = msg.id;
      if (msg.type === 'players') this.updatePlayers(msg.players);
      if (msg.type === 'event') this.handleEvent(msg);
    } catch (e) {
      console.error('[mp] invalid message', e);
    }
  }

  updatePlayers(list) {
    for (const p of list) {
      if (p.id === this.id) continue;
      const rp = this.players.get(p.id);
      if (!rp) this.players.set(p.id, new RemotePlayer(p));
      else rp.update(p);
    }
    // remove disconnected
    const ids = new Set(list.map((p) => p.id));
    for (const id of this.players.keys()) {
      if (!ids.has(id)) this.players.delete(id);
    }
  }

  send(player) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.sendTimer++;
    if (this.sendTimer < 2) return; // ~30 fps state updates
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
        name: this.name,
        color: this.color,
      },
    }));
  }

  sendEvent(type, payload) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'broadcast', payload: { type, ...payload } }));
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
