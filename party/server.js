// party/server.js — PartyKit 24/7 multiplayer room.
import LootServer from './loot.mjs';
import Progression from './progression.mjs';

const players = new Map();

function broadcastPlayers(room, without = []) {
  const list = [...players.values()];
  room.broadcast(JSON.stringify({ type: 'players', players: list }), without);
}

async function getPity(room) {
  try { return (await room.storage.get('pity')) || {}; } catch { return {}; }
}

async function setPity(room, counters) {
  try { await room.storage.put('pity', counters); } catch {}
}

export default {
  onConnect(connection, room) {
    players.set(connection.id, {
      id: connection.id,
      x: 0,
      y: 0,
      dir: 'down',
      moving: false,
      attacking: 0,
      hp: 100,
      maxHp: 100,
      pvp: false,
      honor: 0,
      name: 'Player',
      color: '#6f9',
      profile: null,
      profileLoaded: false,
    });

    connection.send(JSON.stringify({ type: 'id', id: connection.id }));
    broadcastPlayers(room);
  },

  async onMessage(message, connection, room) {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'state') {
        const data = msg.payload || {};
        const p = players.get(connection.id);
        if (p) {
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

          if (!p.profileLoaded && p.name && p.name !== 'Player') {
            p.profileLoaded = true;
            p.profile = await Progression.load(room, p.name);
            connection.send(JSON.stringify({ type: 'profile', profile: p.profile }));
          }
        }
        broadcastPlayers(room);
        return;
      }

      if (msg.type === 'chat') {
        const p = players.get(connection.id);
        const from = p ? p.name : 'Player';
        room.broadcast(JSON.stringify({ type: 'chat', from, text: String(msg.text || '').slice(0, 120) }));
        return;
      }

      if (msg.type === 'pvpHit') {
        const p = players.get(connection.id);
        const from = p ? p.name : 'Player';
        room.broadcast(JSON.stringify({
          type: 'pvpHit',
          from,
          targetId: msg.targetId,
          damage: msg.damage,
        }), [connection.id]);
        return;
      }

      if (msg.type === 'enemyDefeated') {
        const { type, x, y } = msg;
        const reward = LootServer.getCombatReward(type);
        const drops = LootServer.getBossDrops(type, x, y);
        const isBoss = drops.length > 0;
        connection.send(JSON.stringify({
          type: 'reward',
          gold: reward.gold,
          xp: reward.xp,
          isBoss,
          bossType: isBoss ? type : null,
          x,
          y,
        }));
        for (const drop of drops) {
          connection.send(JSON.stringify({ type: 'drop', ...drop }));
        }
        if (isBoss) {
          connection.send(JSON.stringify({ type: 'bossEvent', bossType: type, x, y }));
        }

        const p = players.get(connection.id);
        if (p && p.profile) {
          const unlocked = Progression.recordKill(p.profile, type);
          for (const id of unlocked) {
            const ach = Progression.getAchievement(id);
            connection.send(JSON.stringify({
              type: 'achievement',
              id,
              title: ach.title,
              desc: ach.desc,
              rewardGold: ach.rewardGold,
              rewardXp: ach.rewardXp,
            }));
          }
          await Progression.save(room, p.name, p.profile);
        }
        return;
      }

      if (msg.type === 'openChest') {
        const counters = await getPity(room);
        const countersForId = counters[connection.id] || {};
        const res = LootServer.openChest(msg.chestKind, countersForId);
        counters[connection.id] = countersForId;
        await setPity(room, counters);
        connection.send(JSON.stringify({
          type: 'chestResult',
          chestKind: msg.chestKind,
          ok: res.ok,
          reason: res.reason,
          roll: res.roll,
        }));
        return;
      }

      if (msg.type === 'pvpKill') {
        const p = players.get(connection.id);
        if (p && p.profile) {
          const unlocked = Progression.recordPvPKill(p.profile);
          for (const id of unlocked) {
            const ach = Progression.getAchievement(id);
            connection.send(JSON.stringify({
              type: 'achievement',
              id,
              title: ach.title,
              desc: ach.desc,
              rewardGold: ach.rewardGold,
              rewardXp: ach.rewardXp,
            }));
          }
          await Progression.save(room, p.name, p.profile);
        }
        return;
      }

      if (msg.type === 'regionEnter') {
        const p = players.get(connection.id);
        if (p && p.profile) {
          const res = Progression.discoverRegion(p.profile, msg.region);
          if (res) {
            connection.send(JSON.stringify({ type: 'regionUnlocked', ...res }));
            await Progression.save(room, p.name, p.profile);
          }
        }
        return;
      }

      if (msg.type === 'stashList') {
        const p = players.get(connection.id);
        connection.send(JSON.stringify({ type: 'profile', profile: p?.profile || {} }));
        return;
      }

      if (msg.type === 'stashDeposit') {
        const p = players.get(connection.id);
        if (p && p.profile) {
          const res = Progression.depositStash(p.profile, msg.kind, msg.count || 1);
          if (res.ok) await Progression.save(room, p.name, p.profile);
          connection.send(JSON.stringify({
            type: 'stashResult',
            action: 'deposit',
            ok: res.ok,
            reason: res.reason,
            stash: res.stash || p.profile.stash,
          }));
        }
        return;
      }

      if (msg.type === 'stashWithdraw') {
        const p = players.get(connection.id);
        if (p && p.profile) {
          const res = Progression.withdrawStash(p.profile, msg.kind, msg.count || 1);
          if (res.ok) await Progression.save(room, p.name, p.profile);
          connection.send(JSON.stringify({
            type: 'stashResult',
            action: 'withdraw',
            ok: res.ok,
            reason: res.reason,
            kind: res.kind,
            count: res.count,
            stash: res.stash || p.profile.stash,
          }));
        }
        return;
      }
    } catch (e) {
      console.error('[partykit] invalid message', e.message);
    }
  },

  onClose(connection, room) {
    players.delete(connection.id);
    broadcastPlayers(room);
  },
};
