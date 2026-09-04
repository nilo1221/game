// config/item-effects.js — what happens when the player picks up, equips,
// or unequips an item, and what happens when a boss falls.
//
// Each table is keyed by item `kind` (or boss `type`) and holds the toast
// text / screen-flash / state changes for that case. core/combat.js walks
// these tables instead of a long if/else chain; anything not listed here
// falls back to a small generic default so unlisted item kinds still work.
//
// `ctx` objects are built fresh by core/combat.js for each call and expose
// only what a given effect needs (player, inventory, particles, toast(), etc).

const ITEM_PICKUP_EFFECTS = {
  sword: {
    apply: (ctx) => {
      const alreadyHasOne = ctx.inventory.items.sword > 0 || ctx.player.hasSword;
      ctx.inventory.add('sword', 1);
      if (alreadyHasOne) return;
      ctx.player.hasSword = true;
      ctx.advanceQuestTo(2);
    },
    toast: 'Hai trovato la Spada di Ferro! Attacco aumentato.',
    flash: { color: '232,201,60', alpha: 0.35 },
  },
  // Coins are gold directly — they never enter the backpack.
  coin: {
    apply: (ctx) => {
      ctx.player.gold += ctx.item.value;
      ctx.particles.floatText(ctx.item.x, ctx.item.y - 6, '+' + ctx.item.value + 'g', '#e8c93c');
    },
  },
  armor: {
    apply: (ctx) => ctx.inventory.add('armor', 1),
    toast: 'Raccolta Armatura di Ferro!',
  },
  helmet: {
    apply: (ctx) => ctx.inventory.add('helmet', 1),
    toast: "Raccolto l'Elmo del Diavolo!",
  },
  armorJungle: {
    apply: (ctx) => ctx.inventory.add('armorJungle', 1),
    toast: 'Raccolta Armatura della Giungla!',
  },
  boots: {
    apply: (ctx) => { ctx.inventory.add('boots', 1); ctx.player.speed = BOOTS_SPEED; },
    toast: 'Raccolti Stivali da Corsa! Velocità di movimento aumentata.',
  },
  swordLegendary: {
    apply: (ctx) => {
      ctx.inventory.add('swordLegendary', 1);
      ctx.player.hasSword = true;
      ctx.player.hasLegendarySword = true;
      ctx.player.hasEpicSword = false;
      ctx.player.hasCursedSword = false;
      ctx.player.hasMoltenSword = false;
    },
    toast: 'Equipaggiata la Spada Leggendaria! Attacco enormemente aumentato.',
    flash: { color: '63,212,168', alpha: 0.4 },
  },
  shieldBone: {
    apply: (ctx) => ctx.inventory.add('shieldBone', 1),
    toast: 'Raccolto Scudo d\'Osso!',
  },
  crownSkeleton: {
    apply: (ctx) => ctx.inventory.add('crownSkeleton', 1),
    toast: 'Raccolta Corona dello Scheletro!',
  },
  potionBlue: {
    apply: (ctx) => ctx.inventory.add('potionBlue', 1),
    toast: 'Raccolta una Pozione Blu! (bevi per ripristinare il mana)',
  },
  armorObsidian: {
    apply: (ctx) => ctx.inventory.add('armorObsidian', 1),
    toast: 'Raccolta Armatura di Ossidiana!',
  },
  swordMolten: {
    apply: (ctx) => {
      ctx.inventory.add('swordMolten', 1);
      ctx.player.hasSword = true;
      ctx.player.hasLegendarySword = false;
      ctx.player.hasEpicSword = false;
      ctx.player.hasCursedSword = false;
      ctx.player.hasMoltenSword = true;
    },
    toast: 'Hai trovato la Lama Ignea! Attacco massivamente aumentato.',
    flash: { color: '255,110,40', alpha: 0.45 },
  },
  bootsFireproof: {
    apply: (ctx) => { ctx.inventory.add('bootsFireproof', 1); ctx.player.speed = BOOTS_SPEED; ctx.player.fireproof = true; },
    toast: 'Raccolti Stivali Antifuoco! La lava non ti brucia più.',
    flash: { color: '255,140,40', alpha: 0.35 },
  },
};
// Fallback for any world item kind with no entry above (matches the
// original's generic `else` branch — this also covers the world's loose
// potionRed pickup, which never had its own toast in the original either).
const DEFAULT_PICKUP_EFFECT = {
  apply: (ctx) => ctx.inventory.add(ctx.item.kind, 1),
  toast: 'Raccolto un oggetto',
};

// Backpack potions are "used" (consumed for an effect), not equipped.
const USABLE_POTIONS = {
  potionRed: {
    use: (ctx) => ctx.inventory.usePotionRed(ctx.player),
    onUsed: (ctx) => {
      ctx.particles.floatText(ctx.player.centerX, ctx.player.y - 10, 'Curato!', '#f09595');
      ctx.toast('Bevuta una Pozione di Cura — PS ripristinati!');
    },
  },
  potionBlue: {
    use: (ctx) => ctx.inventory.usePotionBlue(ctx.player),
    onUsed: (ctx) => {
      ctx.particles.floatText(ctx.player.centerX, ctx.player.y - 10, 'Mana ripristorato!', '#a878e0');
      ctx.toast('Bevuta una Pozione Blu — Mana completamente ripristinato!');
    },
  },
};

const ITEM_USE_EFFECTS = {
  chestCommon:    { use: (ctx) => LootRoller.openChest('chestCommon', ctx.player, ctx.inventory, ctx.multiplayer) },
  chestUncommon:  { use: (ctx) => LootRoller.openChest('chestUncommon', ctx.player, ctx.inventory, ctx.multiplayer) },
  chestRare:      { use: (ctx) => LootRoller.openChest('chestRare', ctx.player, ctx.inventory, ctx.multiplayer) },
  chestEpic:      { use: (ctx) => LootRoller.openChest('chestEpic', ctx.player, ctx.inventory, ctx.multiplayer) },
  chestLegendary: { use: (ctx) => LootRoller.openChest('chestLegendary', ctx.player, ctx.inventory, ctx.multiplayer) },
  chestCursed:    { use: (ctx) => LootRoller.openChest('chestCursed', ctx.player, ctx.inventory, ctx.multiplayer) },
};

function _weaponBonusFromAffix(player, inventory, kind) {
  const full = getItemStats(kind, inventory.getAffixes(kind));
  const base = getItemStats(kind);
  return (full.atk || 0) - (base.atk || 0);
}

function _bootSpeedWithAffix(inventory, kind, baseSpeed) {
  const full = getItemStats(kind, inventory.getAffixes(kind));
  const base = getItemStats(kind);
  const affixSpd = (full.spd || 0) - (base.spd || 0);
  return baseSpeed + affixSpd;
}

const ITEM_EQUIP_EFFECTS = {
  sword: {
    apply: (ctx) => {
      ctx.inventory.equip('sword');
      ctx.player.hasSword = true;
      ctx.player.hasEpicSword = false;
      ctx.player.hasCursedSword = false;
      ctx.player.hasLegendarySword = false;
      ctx.player.hasMoltenSword = false;
      ctx.player.weaponBonus = _weaponBonusFromAffix(ctx.player, ctx.inventory, 'sword');
    },
    toast: 'Spada di Ferro equipaggiata!',
  },
  swordEpic: {
    apply: (ctx) => {
      ctx.inventory.equip('swordEpic');
      ctx.player.hasSword = true;
      ctx.player.hasEpicSword = true;
      ctx.player.hasCursedSword = false;
      ctx.player.hasLegendarySword = false;
      ctx.player.hasMoltenSword = false;
      ctx.player.weaponBonus = _weaponBonusFromAffix(ctx.player, ctx.inventory, 'swordEpic');
    },
    toast: 'Spada Epica equipaggiata!',
  },
  swordCursed: {
    apply: (ctx) => {
      ctx.inventory.equip('swordCursed');
      ctx.player.hasSword = true;
      ctx.player.hasCursedSword = true;
      ctx.player.hasEpicSword = false;
      ctx.player.hasLegendarySword = false;
      ctx.player.hasMoltenSword = false;
      ctx.player.weaponBonus = _weaponBonusFromAffix(ctx.player, ctx.inventory, 'swordCursed');
    },
    toast: 'Spada Maledetta equipaggiata...',
  },
  swordLegendary: {
    apply: (ctx) => {
      ctx.inventory.equip('swordLegendary');
      ctx.player.hasSword = true;
      ctx.player.hasLegendarySword = true;
      ctx.player.hasEpicSword = false;
      ctx.player.hasCursedSword = false;
      ctx.player.hasMoltenSword = false;
      ctx.player.weaponBonus = _weaponBonusFromAffix(ctx.player, ctx.inventory, 'swordLegendary');
    },
    toast: 'Spada Leggendaria equipaggiata!',
  },
  swordMolten: {
    apply: (ctx) => {
      ctx.inventory.equip('swordMolten');
      ctx.player.hasSword = true;
      ctx.player.hasMoltenSword = true;
      ctx.player.hasEpicSword = false;
      ctx.player.hasCursedSword = false;
      ctx.player.hasLegendarySword = false;
      ctx.player.weaponBonus = _weaponBonusFromAffix(ctx.player, ctx.inventory, 'swordMolten');
    },
    toast: 'Lama Ignea equipaggiata!',
  },
  armor: { apply: (ctx) => ctx.inventory.equip('armor'), toast: 'Armatura di Ferro equipaggiata!' },
  armorEpic: { apply: (ctx) => ctx.inventory.equip('armorEpic'), toast: 'Armatura Epica equipaggiata!' },
  armorCursed: { apply: (ctx) => ctx.inventory.equip('armorCursed'), toast: 'Armatura Maledetta equipaggiata...' },
  helmet: { apply: (ctx) => ctx.inventory.equip('helmet'), toast: "Elmo del Diavolo equipaggiato!" },
  helmetEpic: { apply: (ctx) => ctx.inventory.equip('helmetEpic'), toast: 'Elmo Epico equipaggiato!' },
  armorJungle: { apply: (ctx) => ctx.inventory.equip('armorJungle'), toast: 'Armatura della Giungla equipaggiata!' },
  armorObsidian: { apply: (ctx) => ctx.inventory.equip('armorObsidian'), toast: 'Armatura di Ossidiana equipaggiata!' },
  boots: {
    apply: (ctx) => { ctx.inventory.equip('boots'); ctx.player.speed = _bootSpeedWithAffix(ctx.inventory, 'boots', BOOTS_SPEED); ctx.player.fireproof = false; },
    toast: 'Stivali da Corsa equipaggiati!',
  },
  bootsEpic: {
    apply: (ctx) => { ctx.inventory.equip('bootsEpic'); ctx.player.speed = _bootSpeedWithAffix(ctx.inventory, 'bootsEpic', BOOTS_EPIC_SPEED); ctx.player.fireproof = false; },
    toast: 'Stivali Epici equipaggiati!',
  },
  bootsCursed: {
    apply: (ctx) => { ctx.inventory.equip('bootsCursed'); ctx.player.speed = _bootSpeedWithAffix(ctx.inventory, 'bootsCursed', BOOTS_CURSED_SPEED); ctx.player.fireproof = false; },
    toast: 'Stivali Maledetti equipaggiati...',
  },
  bootsFireproof: {
    apply: (ctx) => { ctx.inventory.equip('bootsFireproof'); ctx.player.speed = _bootSpeedWithAffix(ctx.inventory, 'bootsFireproof', BOOTS_SPEED); ctx.player.fireproof = true; },
    toast: 'Stivali Antifuoco equipaggiati!',
  },
  shieldBone: { apply: (ctx) => ctx.inventory.equip('shieldBone'), toast: 'Scudo d\'Osso equipaggiato!' },
  shieldCursed: { apply: (ctx) => ctx.inventory.equip('shieldCursed'), toast: 'Scudo Maledetto equipaggiato...' },
  crownSkeleton: { apply: (ctx) => ctx.inventory.equip('crownSkeleton'), toast: 'Corona dello Scheletro equipaggiata!' },
};

const ITEM_UNEQUIP_EFFECTS = {
  weapon: (ctx) => {
    ctx.inventory.unequip('weapon');
    ctx.player.hasSword = false;
    ctx.player.hasEpicSword = false;
    ctx.player.hasCursedSword = false;
    ctx.player.hasLegendarySword = false;
    ctx.player.hasMoltenSword = false;
    ctx.player.weaponBonus = 0;
  },
  armor: (ctx) => ctx.inventory.unequip('armor'),
  helmet: (ctx) => ctx.inventory.unequip('helmet'),
  boots: (ctx) => {
    ctx.inventory.unequip('boots');
    ctx.player.speed = PLAYER_BASE_STATS.speed;
    ctx.player.fireproof = false;
  },
  shield: (ctx) => ctx.inventory.unequip('shield'),
};

// Gates that unlock automatically once their guardian enemies are all dead
// (as opposed to BOSS_DEFEAT_EVENTS below, which fire once for a specific
// boss's own death). Checked every frame by Combat.checkGateConditions.
const GATE_UNLOCK_CONDITIONS = [
  {
    isOpenFlag: 'isGateOpen',
    stillGuarded: (enemies) => enemies.some((e) => (e.type === 'slimeGreen' || e.type === 'slimeBlue') && e.alive),
    open: (map) => map.openGate(),
    toast: 'Il cancello del re goblin si è aperto!',
    flash: { color: '200,200,200', alpha: 0.3 },
  },
  {
    isOpenFlag: 'isSkeletonGateOpen',
    stillGuarded: (enemies) => enemies.some((e) => (e.type === 'orcBoss' || e.type === 'witchBoss') && e.alive),
    open: (map) => map.openSkeletonGate(),
    toast: 'I due boss della Giungla sono caduti — il Cancello degli Scheletri si spalanca a sud!',
    flash: { color: '232,151,90', alpha: 0.4 },
  },
];

// What happens when each boss falls: drops (positioned relative to the
// boss's own death location via ctx.dropItem(dx, dy, kind)), quest/gate
// progression, and the little "System" dialogue cutscene.
const BOSS_DEFEAT_EVENTS = {
  goblinBoss: (ctx) => {
    ctx.dropItem(10, 6, 'armor');
    ctx.advanceQuestTo(3);
    ctx.map.openWorldTwoGate();
    ctx.toast('Il Re Goblin ha lasciato Armatura di Ferro!');
    ctx.setScreenFlash({ color: '232,201,60', alpha: 0.5 });
    ctx.openSystemDialogue([
      'Il Boss Goblin è stato sconfitto!',
      'Il cancello a Est si è aperto. Benvenuto nell\'Oasi di Sabbia!',
    ]);
  },
  orcBoss: (ctx) => {
    ctx.dropItem(10, 6, 'armorJungle');
    ctx.toast('Il Signore della Guerra Orco ha lasciato Armatura della Giungla!');
    ctx.setScreenFlash({ color: '72,140,74', alpha: 0.5 });
  },
  witchBoss: (ctx) => {
    ctx.dropItem(10, 6, 'boots');
    ctx.toast('La Strega della Giungla ha lasciato Stivali da Corsa!');
    ctx.setScreenFlash({ color: '63,212,168', alpha: 0.5 });
  },
  skeletonKing: (ctx) => {
    ctx.dropItem(14, 10, 'shieldBone');
    ctx.dropItem(-10, 10, 'crownSkeleton');
    ctx.dropItem(2, -8, 'potionBlue');
    ctx.toast('Il Re degli Scheletri è caduto! Ha lasciato uno Scudo d\'Osso, una Corona dello Scheletro e una Pozione Blu!');
    ctx.setScreenFlash({ color: '232,226,208', alpha: 0.6 });
    ctx.map.openLavaGate();
    ctx.openSystemDialogue([
      "Il trono del Re degli Scheletri si riduce in polvere!",
      'Il Dungeon degli Scheletri tace finalmente.',
      'Ma il pavimento sotto di esso si spacca — un Cancello di Lava si è aperto a sud, nelle Profondità Ignee.',
    ]);
  },
  devilBoss: (ctx) => {
    ctx.dropItem(10, 6, 'helmet');
    ctx.dropItem(-6, 6, 'swordLegendary');
    ctx.map.openJungleGate();
    ctx.toast('Il Diavolo ha lasciato un Elmo e una lama leggendaria!');
    ctx.setScreenFlash({ color: '244,212,60', alpha: 0.55 });
    ctx.openSystemDialogue([
      'Il Diavolo dell\'Oasi di Sabbia è stato sconfitto!',
      'Il suo oscuro dominio sulle dune è finalmente spezzato.',
      'Un Cancello della Giungla si è spalancato a sud — ma qualcosa di antico si muove al suo interno.',
    ]);
  },
  trollChieftain: (ctx) => {
    ctx.dropItem(10, 8, 'armorObsidian');
    ctx.map.openPitGate();
    ctx.toast('Il Capitano Troll ha lasciato Armatura di Ossidiana!');
    ctx.setScreenFlash({ color: '143,174,90', alpha: 0.5 });
    ctx.openSystemDialogue([
      'Il Capitano Troll si schianta sulla roccia ignea!',
      'Più in fondo nel baratro, il Cancello del Pozzo si apre con uno stridore — qualcosa di molto peggio attende sotto.',
    ]);
  },
  pitDevil: (ctx) => {
    ctx.dropItem(10, 8, 'swordMolten');
    ctx.dropItem(-10, 8, 'bootsFireproof');
    ctx.toast('Il Diavolo del Pozzo è caduto! Ha lasciato la Lama Ignea e gli Stivali Antifuoco!');
    ctx.setScreenFlash({ color: '255,106,30', alpha: 0.65 });
    ctx.setVictory();
    ctx.openSystemDialogue([
      'Il Diavolo del Pozzo emette un ultimo ruggito che scuote la terra prima di crollare in cenere.',
      'Le Profondità Ignee si acquietano. Ogni angolo della Shattered Vale è finalmente in pace.',
      'Hai conquistato la Shattered Vale.',
    ]);
  },
};
