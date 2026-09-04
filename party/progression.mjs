// party/progression.mjs — persistent achievements, discovered regions and stash per player.
const ACHIEVEMENTS = {
  firstBlood:     { title: 'Prima vittima',        desc: 'Uccidi il tuo primo nemico',                  rewardGold: 10,   rewardXp: 10 },
  goblinSlayer:   { title: 'Cacciatore di Goblin', desc: 'Sconfiggi il Re Goblin Grimtooth',           rewardGold: 200,  rewardXp: 500 },
  orcSlayer:      { title: 'Macellaio di Orco',    desc: 'Sconfiggi il Signore della Guerra Orco',     rewardGold: 250,  rewardXp: 600 },
  witchSlayer:    { title: 'Stregone della Valle', desc: 'Sconfiggi la Strega della Giungla',          rewardGold: 250,  rewardXp: 600 },
  skeletonKing:   { title: 'Re senza Trono',       desc: 'Sconfiggi il Re degli Scheletri',            rewardGold: 300,  rewardXp: 800 },
  devilBoss:      { title: 'Spezza-Inferno',       desc: 'Sconfiggi il Diavolo dell\'Oasi di Sabbia',   rewardGold: 350,  rewardXp: 900 },
  trollChieftain: { title: 'Gigante Caduto',       desc: 'Sconfiggi il Capitano Troll',                rewardGold: 400,  rewardXp: 1000 },
  pitDevil:       { title: 'Purificatore delle Profondità', desc: 'Sconfiggi il Diavolo del Pozzo',    rewardGold: 1000, rewardXp: 3500 },
  pvpKiller:      { title: 'Cacciatore di Esondati', desc: 'Uccidi un altro giocatore in PvP',          rewardGold: 50,   rewardXp: 100 },
};

const BOSS_ACHIEVEMENTS = {
  goblinBoss: 'goblinSlayer',
  orcBoss: 'orcSlayer',
  witchBoss: 'witchSlayer',
  skeletonKing: 'skeletonKing',
  devilBoss: 'devilBoss',
  trollChieftain: 'trollChieftain',
  pitDevil: 'pitDevil',
};

const REGIONS = {
  vale:   { title: 'Valle Iniziale',      rewardGold: 0,   rewardXp: 0 },
  oasis:  { title: 'Oasi di Sabbia',        rewardGold: 100, rewardXp: 200 },
  jungle: { title: 'Giungla Maledetta',     rewardGold: 200, rewardXp: 400 },
  crypt:  { title: 'Cripta degli Scheletri', rewardGold: 300, rewardXp: 600 },
  molten: { title: 'Profondità Ignee',      rewardGold: 500, rewardXp: 1000 },
};

function defaultProfile() {
  return {
    achievements: [],
    regions: [],
    stash: {},
  };
}

function has(profile, list, id) {
  return profile[list].includes(id);
}

function unlock(profile, list, id) {
  if (!has(profile, list, id)) profile[list].push(id);
}

function cloneProfile(profile) {
  return {
    achievements: [...profile.achievements],
    regions: [...profile.regions],
    stash: { ...profile.stash },
  };
}

export default {
  async load(room, name) {
    try {
      const data = await room.storage.get(`profile:${name}`);
      if (data) return data;
    } catch {}
    return defaultProfile();
  },

  async save(room, name, profile) {
    try {
      await room.storage.put(`profile:${name}`, cloneProfile(profile));
    } catch {}
  },

  recordKill(profile, type) {
    const unlocked = [];
    if (!has(profile, 'achievements', 'firstBlood')) {
      unlock(profile, 'achievements', 'firstBlood');
      unlocked.push('firstBlood');
    }
    const bossAch = BOSS_ACHIEVEMENTS[type];
    if (bossAch && !has(profile, 'achievements', bossAch)) {
      unlock(profile, 'achievements', bossAch);
      unlocked.push(bossAch);
    }
    return unlocked;
  },

  recordPvPKill(profile) {
    if (!has(profile, 'achievements', 'pvpKiller')) {
      unlock(profile, 'achievements', 'pvpKiller');
      return ['pvpKiller'];
    }
    return [];
  },

  discoverRegion(profile, regionId) {
    if (has(profile, 'regions', regionId)) return null;
    const region = REGIONS[regionId];
    if (!region) return null;
    unlock(profile, 'regions', regionId);
    return {
      unlocked: true,
      region: regionId,
      title: region.title,
      rewardGold: region.rewardGold,
      rewardXp: region.rewardXp,
    };
  },

  depositStash(profile, kind, count = 1) {
    if (!kind || count <= 0) return { ok: false, reason: 'Deposito non valido' };
    profile.stash[kind] = (profile.stash[kind] || 0) + count;
    return { ok: true, stash: cloneProfile(profile).stash };
  },

  withdrawStash(profile, kind, count = 1) {
    if (!kind || count <= 0) return { ok: false, reason: 'Quantità non valida' };
    if (!profile.stash[kind] || profile.stash[kind] < count) {
      return { ok: false, reason: 'Oggetto non disponibile nello stash' };
    }
    profile.stash[kind] -= count;
    if (profile.stash[kind] <= 0) delete profile.stash[kind];
    return { ok: true, kind, count, stash: cloneProfile(profile).stash };
  },

  getAchievement(id) {
    return ACHIEVEMENTS[id] || null;
  },

  getRegion(id) {
    return REGIONS[id] || null;
  },
};
