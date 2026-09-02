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

const ITEM_STATS = {
  sword:          { name: 'Spada di Ferro', atk: WEAPON_ATTACK_BONUS.sword },
  swordLegendary: { name: 'Spada Leggendaria', atk: WEAPON_ATTACK_BONUS.swordLegendary },
  swordMolten:    { name: 'Lama Ignea', atk: WEAPON_ATTACK_BONUS.swordMolten },

  armor:          { name: 'Armatura di Ferro', def: ARMOR_DEFENSE.armor },
  armorJungle:    { name: 'Armatura della Giungla', def: ARMOR_DEFENSE.armorJungle },
  armorObsidian:  { name: 'Armatura di Ossidiana', def: ARMOR_DEFENSE.armorObsidian },
  helmet:         { name: "Elmo del Diavolo", def: ARMOR_DEFENSE.helmet },
  crownSkeleton:  { name: 'Corona dello Scheletro', def: ARMOR_DEFENSE.crownSkeleton },
  shield:         { name: 'Scudo', def: ARMOR_DEFENSE.shield },
  shieldBone:     { name: "Scudo d'Osso", def: ARMOR_DEFENSE.shieldBone },

  boots:          { name: 'Stivali da Corsa', spd: BOOTS_SPEED_BONUS },
  bootsFireproof: { name: 'Stivali Antifuoco', spd: BOOTS_SPEED_BONUS, extra: 'Immuni alla lava' },

  potionRed:      { name: 'Pozione di Cura', extra: 'Ripristina i PS completamente' },
  potionBlue:     { name: 'Pozione di Mana', extra: 'Ripristina il Mana completamente' },
  coin:           { name: "Moneta d'Oro" },
  key:            { name: 'Chiave' },
};
const DEFAULT_ITEM_STATS = { name: 'Oggetto' };

function getItemStats(kind) {
  return ITEM_STATS[kind] || DEFAULT_ITEM_STATS;
}
