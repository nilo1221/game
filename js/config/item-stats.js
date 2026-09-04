// config/item-stats.js — what to SHOW the player about each item: its
// attack/defense/speed bonus and a one-line description. Separate from
// config/item-effects.js (which defines what actually happens on pickup/
// equip) so the inventory UI has one clear place to read "what does this
// item do" without wading through callback logic.
//
// ARMOR_DEFENSE is the one new numeric balance value introduced here —
// armor/helmet/shield pieces previously had no mechanical effect at all.
// Player.takeDamage() now subtracts the equipped total (see entities/
// player.js and Combat.recomputeDefense in core/combat.js).

const ARMOR_DEFENSE = {
  helmet: 3,
  crownSkeleton: 6,
  armor: 4,
  armorJungle: 7,
  armorObsidian: 12,
  shield: 5,
  shieldBone: 8,
};

// Speed bonus shown for boots — both boots kinds set the same absolute
// speed (BOOTS_SPEED), so the "bonus" shown is the delta over base speed.
const BOOTS_SPEED_BONUS = Math.round((BOOTS_SPEED - PLAYER_BASE_STATS.speed) * 10) / 10;
const BOOTS_EPIC_SPEED_BONUS = Math.round((BOOTS_EPIC_SPEED - PLAYER_BASE_STATS.speed) * 10) / 10;
const BOOTS_CURSED_SPEED_BONUS = Math.round((BOOTS_CURSED_SPEED - PLAYER_BASE_STATS.speed) * 10) / 10;

const ITEM_STATS = {
  sword:          { name: 'Spada di Ferro', atk: WEAPON_ATTACK_BONUS.sword },
  swordEpic:      { name: 'Spada Epica', atk: WEAPON_ATTACK_BONUS.swordEpic, extra: 'Affisso: Lama della Tempesta' },
  swordCursed:    { name: 'Spada Maledetta', atk: WEAPON_ATTACK_BONUS.swordCursed, extra: 'Affisso: Ruggine' },
  swordLegendary: { name: 'Spada Leggendaria', atk: WEAPON_ATTACK_BONUS.swordLegendary },
  swordMolten:    { name: 'Lama Ignea', atk: WEAPON_ATTACK_BONUS.swordMolten },

  armor:          { name: 'Armatura di Ferro', def: ARMOR_DEFENSE.armor },
  armorEpic:      { name: 'Armatura Epica', def: ARMOR_DEFENSE.armorObsidian + 3, extra: 'Affisso: Piastre Rinforzate' },
  armorCursed:    { name: 'Armatura Maledetta', def: -2, extra: 'Affisso: Lacera' },
  armorJungle:    { name: 'Armatura della Giungla', def: ARMOR_DEFENSE.armorJungle },
  armorObsidian:  { name: 'Armatura di Ossidiana', def: ARMOR_DEFENSE.armorObsidian },
  helmet:         { name: "Elmo del Diavolo", def: ARMOR_DEFENSE.helmet },
  helmetEpic:     { name: 'Elmo Epico', def: ARMOR_DEFENSE.crownSkeleton + 1, extra: 'Affisso: Visione del Falco' },
  crownSkeleton:  { name: 'Corona dello Scheletro', def: ARMOR_DEFENSE.crownSkeleton },
  shield:         { name: 'Scudo', def: ARMOR_DEFENSE.shield },
  shieldBone:     { name: "Scudo d'Osso", def: ARMOR_DEFENSE.shieldBone },
  shieldCursed:   { name: 'Scudo Maledetto', def: -1, extra: 'Affisso: Rovi' },

  boots:          { name: 'Stivali da Corsa', spd: BOOTS_SPEED_BONUS },
  bootsFireproof: { name: 'Stivali Antifuoco', spd: BOOTS_SPEED_BONUS, extra: 'Immuni alla lava' },
  bootsEpic:      { name: 'Stivali Epici', spd: BOOTS_EPIC_SPEED_BONUS, extra: 'Affisso: Soffio di Zephyr' },
  bootsCursed:    { name: 'Stivali Maledetti', spd: BOOTS_CURSED_SPEED_BONUS, extra: 'Affisso: Infangati' },

  potionRed:      { name: 'Pozione di Cura', extra: 'Ripristina i PS completamente' },
  potionBlue:     { name: 'Pozione di Mana', extra: 'Ripristina il Mana completamente' },
  coin:           { name: "Moneta d'Oro" },
  key:            { name: 'Chiave' },

  chestCommon:    { name: 'Cassa Comune', extra: 'Tocca per aprire: oggetto comune/non comune.' },
  chestUncommon:  { name: 'Cassa Non Comune', extra: 'Tocca per aprire: oggetto non comune/raro.' },
  chestRare:      { name: 'Cassa Rara', extra: 'Tocca per aprire: oggetto raro/epico.' },
  chestEpic:      { name: 'Cassa Epica', extra: 'Tocca per aprire: oggetto epico/legendario.' },
  chestLegendary: { name: 'Cassa Leggendaria', extra: 'Tocca per aprire: oggetto leggendario.' },
  chestCursed:    { name: 'Cassa Maledetta', extra: 'Tocca per aprire: oggetto maledetto o epico.' },
};
const DEFAULT_ITEM_STATS = { name: 'Oggetto' };

function getItemStats(kind, affixes) {
  const base = ITEM_STATS[kind] || DEFAULT_ITEM_STATS;
  if (!affixes || (!affixes.prefix && !affixes.suffix)) return base;

  const out = { ...base };
  const extras = [];
  if (base.extra) extras.push(base.extra);

  const apply = (a) => {
    if (!a) return;
    extras.push('Affisso: ' + a.name + ' (' + a.stat.toUpperCase() + (a.value > 0 ? '+' : '') + a.value + ')');
    if (a.stat === 'atk') out.atk = (out.atk || 0) + a.value;
    if (a.stat === 'def') out.def = (out.def || 0) + a.value;
    if (a.stat === 'spd') out.spd = (out.spd || 0) + a.value;
    if (a.stat === 'hp') out.hp = (out.hp || 0) + a.value;
    if (a.stat === 'mana') out.mana = (out.mana || 0) + a.value;
  };
  apply(affixes.prefix);
  apply(affixes.suffix);

  out.extra = extras.join(' | ');
  return out;
}

function getItemDisplayName(kind, affixes) {
  const base = getItemStats(kind).name;
  if (!affixes || (!affixes.prefix && !affixes.suffix)) return base;
  const p = affixes.prefix ? affixes.prefix.name : '';
  const s = affixes.suffix ? affixes.suffix.name : '';
  return [p, base, s].filter(Boolean).join(' ').trim();
}
