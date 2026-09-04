// server/rooms/game-room.mjs — authoritative shared world room.
import { Room } from '@colyseus/core';
import { GameState, PlayerSchema } from '../schema/game-state.mjs';

export class GameRoom extends Room {
  maxClients = 64;

  onCreate(options) {
    this.setState(new GameState());

    this.onMessage('state', (client, data) => this._updatePlayer(client, data));

    this.onMessage('chat', (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      this.broadcast('chat', { from: p.name, text: String(data.text || '').slice(0, 120) });
    });

    this.onMessage('pvpHit', (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      this.broadcast('pvpHit', {
        from: p.name,
        targetId: data.targetId,
        damage: data.damage,
      });
    });
  }

  onJoin(client, options) {
    const p = new PlayerSchema();
    p.name = String(options?.name || 'Player').slice(0, 16);
    p.color = options?.color || '#6f9';
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
  }

  _updatePlayer(client, data) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.x = data.x ?? p.x;
    p.y = data.y ?? p.y;
    p.dir = data.dir ?? p.dir;
    p.moving = data.moving ?? p.moving;
    p.attacking = data.attacking ?? p.attacking;
    p.hp = data.hp ?? p.hp;
    p.maxHp = data.maxHp ?? p.maxHp;
    p.pvp = data.pvp ?? p.pvp;
    p.honor = data.honor ?? p.honor;
    p.name = data.name ? String(data.name).slice(0, 16) : p.name;
    p.color = data.color || p.color;
  }
}
