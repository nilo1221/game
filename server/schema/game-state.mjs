// server/schema/game-state.mjs — Colyseus state for the shared world.
import { Schema, MapSchema, defineTypes } from '@colyseus/schema';

class PlayerSchema extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.dir = 'down';
    this.moving = false;
    this.attacking = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.pvp = false;
    this.honor = 0;
    this.name = 'Player';
    this.color = '#6f9';
  }
}

defineTypes(PlayerSchema, {
  x: 'number',
  y: 'number',
  dir: 'string',
  moving: 'boolean',
  attacking: 'number',
  hp: 'number',
  maxHp: 'number',
  pvp: 'boolean',
  honor: 'number',
  name: 'string',
  color: 'string',
});

class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}

defineTypes(GameState, {
  players: { map: PlayerSchema },
});

export { PlayerSchema, GameState };
