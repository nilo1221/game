# Roadmap Generazione Procedurale — Shattered Vale

## Obiettivo

Trasformare il mondo statico in un'esperienza semi-procedurale e potenzialmente infinita: zone uniche generate da seed, biomi, mini-boss/affissi e classi/perk per run diverse.

## Criteri

- Seed deterministico per riproducibilità.
- Nessun framework pesante; vanilla JS.
- Riutilizzare `WorldFactory` e `ENEMY_PLACEMENTS` come base.
- Salvarsi solo il seed e i modificatori, non l'intera mappa.
- Generare a pezzi (chunk) per non bloccare il frame.

---

## Fase 1 — Seed e RNG deterministico

Un RNG deterministico è la base di ogni generazione procedurale.

```js
function xmur3(str) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  }
  h = h << 13 | h >>> 19;
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = 'shattered-vale-' + (new URLSearchParams(location.search).get('seed') || Date.now());
const rng = mulberry32(xmur3(seed)());
```

Repo di riferimento: `bryc/code` (seeded RNG snippets).

---

## Fase 2 — Tilemap con Perlin/Simplex noise e biomi

La topologia attuale è statica. Usiamo noise per generare altezza/umidità e mapparli a biomi.

```js
// esempio con noise-map (ogus/noise-map)
const NoiseMap = window.NoiseMap; // carica noise-map.min.js
const generator = new NoiseMap.MapGenerator();
const heightmap = generator.createMap(64, 64, { type: 'perlin' });

function biomeAt(x, y) {
  const v = heightmap.getValue(x, y); // [0,1]
  if (v < 0.35) return 'water';
  if (v < 0.45) return 'sand';
  if (v < 0.70) return 'grass';
  if (v < 0.85) return 'forest';
  return 'mountain';
}
```

Repo utili:

- `yantra-core/Labyrinthos.js` — mazes, terrains, biomes, tileset.
- `N8python/terrainzjs` — biomi colorati con Perlin.
- `ogus/noise-map` — Perlin/Simplex heightmap.

---

## Fase 3 — Chunk e streaming infinito

Il mondo diventa infinito se generato a chunk. Ogni chunk è `CHUNK_SIZE × CHUNK_SIZE` tile e viene generato/scrollato in base alla posizione del player.

```js
const CHUNK = 32; // tiles
const chunks = new Map(); // key: 'cx,cy'

function chunkKey(cx, cy) { return `${cx},${cy}`; }

function ensureChunk(cx, cy, seed) {
  const k = chunkKey(cx, cy);
  if (chunks.has(k)) return chunks.get(k);
  const chunk = generateChunk(cx, cy, seed); // noise + post-processing
  chunks.set(k, chunk);
  return chunk;
}

function updateChunks(px, py) {
  const pcx = Math.floor(px / (CHUNK * TILE));
  const pcy = Math.floor(py / (CHUNK * TILE));
  for (let y = pcy - 1; y <= pcy + 1; y++) {
    for (let x = pcx - 1; x <= pcx + 1; x++) {
      ensureChunk(x, y, worldSeed);
    }
  }
}
```

Repo: `blixxurd/phaser-map-gen` — dynamic chunk loading, Simplex noise, infinite world.

---

## Fase 4 — BSP/Room-based dungeon

Per dungeon più strutturati (cave, rovine) si può passare da noise a BSP o a stanze con corridoi.

```js
// BSP semplificato ispirato a Mahnoor-Zaffar/The-Tactical-Rogue-Lite-Engine
function splitRect(rect, depth) {
  if (depth === 0) return [rect];
  const horizontal = Math.random() > 0.5;
  const minSize = 6;
  let cut;
  if (horizontal) {
    cut = Math.floor(rect.y + minSize + Math.random() * (rect.h - 2 * minSize));
    return [
      ...splitRect({ x: rect.x, y: rect.y, w: rect.w, h: cut - rect.y }, depth - 1),
      ...splitRect({ x: rect.x, y: cut, w: rect.w, h: rect.h - (cut - rect.y) }, depth - 1)
    ];
  } else {
    cut = Math.floor(rect.x + minSize + Math.random() * (rect.w - 2 * minSize));
    return [
      ...splitRect({ x: rect.x, y: rect.y, w: cut - rect.x, h: rect.h }, depth - 1),
      ...splitRect({ x: cut, y: rect.y, w: rect.w - (cut - rect.x), h: rect.h }, depth - 1)
    ];
  }
}
```

Repo utili:

- `Mahnoor-Zaffar/The-Tactical-Rogue-Lite-Engine` — BSP, A*, fog of war.
- `khrome/procedural-layouts` — Rogue, Metroidvania, Adventure generators.
- `ericmaddox/html-dungeon-crawl` — recursive backtracking maze.

---

## Fase 5 — Spawn di mostri, risorse e POI

Dopo la tilemap, si popola. La `ENEMY_PLACEMENTS` diventa un template: per ogni bioma si sceglie quanti nemici, di quali tipi e dove.

```js
const SPAWN_TABLES = {
  forest: { goblin: 4, wolf: 2, 'chest-wooden': 1 },
  mountain: { orc: 3, scorpion: 2, 'chest-iron': 1 },
};

function spawnForChunk(chunk, biome, rng) {
  const spawns = [];
  const table = SPAWN_TABLES[biome];
  for (const [type, count] of Object.entries(table)) {
    for (let i = 0; i < count; i++) {
      const tx = Math.floor(rng() * CHUNK);
      const ty = Math.floor(rng() * CHUNK);
      if (chunk.isWalkable(tx, ty)) spawns.push({ type, x: tx, y: ty });
    }
  }
  return spawns;
}
```

---

## Fase 6 — Elite/mini-boss con affissi casuali

I mini-boss prendono un affisso casuale che cambia meccanica e ricompensa.

```js
const AFFIXES = [
  { id: 'burning',  name: 'Rovente',   mod: { fireAura: true, hpMul: 1.2 } },
  { id: 'cursed',   name: 'Maledetto', mod: { lifeDrain: 0.05, hpMul: 1.5 } },
  { id: 'swift',    name: 'Rapido',    mod: { speedMul: 1.4 } },
];

function rollElite(baseType, rng) {
  const affix = AFFIXES[Math.floor(rng() * AFFIXES.length)];
  return {
    type: baseType,
    elite: true,
    affix: affix.id,
    hp: ENEMY_DEFS[baseType].hp * affix.mod.hpMul,
    speed: (ENEMY_DEFS[baseType].speed || 1) * (affix.mod.speedMul || 1),
    ...affix.mod,
  };
}
```

---

## Fase 7 — Sistema classi e perk

Dopo la generazione del mondo, danno varietà alla progressione.

```js
const CLASSES = {
  warrior: { baseHp: 120, baseAtk: 12, perks: ['berserk', 'shield_wall'] },
  mage:    { baseHp: 80,  baseAtk: 8,  perks: ['mana_shield', 'fire_mastery'] },
  ranger:  { baseHp: 100, baseAtk: 10, perks: ['critical_eye', 'swift_shot'] },
};

const PERKS = {
  berserk: { lvl: 1, apply: (p) => { p.atkMul = (p.atkMul || 1) + 0.1; } },
  // ...
};

function applyClass(player, classKey) {
  const c = CLASSES[classKey];
  Object.assign(player, { class: classKey, maxHp: c.baseHp, atk: c.baseAtk });
  player.perks = [];
}
```

---

## Fase 8 — Persistenza del seed e dello stato

Con il mondo procedurale, non serve salvare ogni tile. Basta seed + chunk visitati + entità modificate.

```js
function saveProcedural() {
  return {
    seed: worldSeed,
    visitedChunks: Array.from(visited),
    destroyed: Array.from(destroyedEntities),
    player: { x, y, class, perks, lvl }
  };
}
```

---

## Fase 9 — Integrazione nel game loop attuale

Punti di intervento:

- `WorldFactory.createWorld(seed)` diventa la factory principale.
- `Game.tick()` chiama `updateChunks()` e renderizza solo chunk visibili.
- `Combat.recomputeDefense` e `player.takeDamage` rimangono invariati.
- `ENEMY_DEFS` e `ENEMY_PLACEMENTS` diventano tabelle di partenza per `spawnForChunk`.

---

## Fase 10 — Polish e balance

- Profiling del generatore: chunk on-demand, mai più di 2 ms a frame.
- Parametri per bioma in `config/balance.js`.
- Rarità loot scalata con profondità/bioma.
- Regolazione affissi con playtesting.
- Opzione “Nuova run con seed casuale” nello start screen.

---

## Ordine di implementazione consigliato

1. **Fase 1** — Seed + RNG.
2. **Fase 2** — Tilemap con noise e biomi.
3. **Fase 3** — Chunk/loading infinito.
4. **Fase 4** — BSP o room-based per dungeon.
5. **Fase 5** — Spawn nemici/POI.
6. **Fase 6** — Elite/affissi.
7. **Fase 7** — Classi e perk.
8. **Fase 8** — Persistenza seed.
9. **Fase 9** — Integrazione.
10. **Fase 10** — Polish.

---

## Repositori GitHub utili

- `yantra-core/Labyrinthos.js` — noise, biomi, maze, tilemap.
- `ogus/noise-map` — Perlin/Simplex heightmap.
- `blixxurd/phaser-map-gen` — chunk loading + mondo infinito.
- `Mahnoor-Zaffar/The-Tactical-Rogue-Lite-Engine` — BSP dungeon, A*, FoW.
- `khrome/procedural-layouts` — Rogue/Metroidvania generators.
- `tfraczak/dungeon_crawler` — infinite room graph.
- `ericmaddox/html-dungeon-crawl` — recursive backtracking maze.
- `EdwardAThomson/Roguelike` — dungeon, classi, loot.

---

## Note

- Inizia con una sola mappa 128×128 tile test con seed visibile. Non passare subito all’infinito.
- Tieni i vecchi livelli statici come “Zona Tutorial” o “Villaggio” per non perdere la storia.
- La transizione a procedural non deve distruggere il multiplayer: PartyKit deve ricevere solo seed + posizioni, non ogni tile.
