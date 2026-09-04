// core/game.js — boots the game and runs the main loop. This is the one
// file that's still allowed to know about "everything"; it wires together
// the systems (camera/particles/dialogue/inventory), the world (map,
// entities), and the logic modules (Combat/Hud/Screens/WorldFactory)
// without containing much game-specific logic of its own.

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_W = canvas.width, VIEW_H = canvas.height;

  // --- DOM HUD ---
  const dom = {
    hpBar: document.getElementById('hpBarInner'),
    hpText: document.getElementById('hpText'),
    xpBar: document.getElementById('xpBarInner'),
    // NOTE: the original game read/wrote `xpText` in its DOM-sync step but
    // never actually looked it up via getElementById, which threw a
    // ReferenceError the moment that code ran. Fixed here; if your
    // index.html uses a different id for the XP label, update this line.
    xpText: document.getElementById('xpText'),
    lvlText: document.getElementById('lvlText'),
    goldText: document.getElementById('goldText'),
    premiumText: document.getElementById('premiumText'),
    honorText: document.getElementById('honorText'),
    manaBar: document.getElementById('manaBarInner'),
    manaText: document.getElementById('manaText'),
    hungerBar: document.getElementById('hungerBarInner'),
    hungerText: document.getElementById('hungerText'),
    thirstBar: document.getElementById('thirstBarInner'),
    thirstText: document.getElementById('thirstText'),
    chatLog: document.getElementById('chat-log'),
    chatInput: document.getElementById('chat-input'),
    nameInput: document.getElementById('player-name'),
    backgroundInput: document.getElementById('character-background'),
    backstoryIntro: document.getElementById('backstory-intro'),
    backstoryDetail: document.getElementById('backstory-detail'),
  };
  const hud = Hud.bindDom(dom);
  hud.setVisible(false); // hidden until Play is pressed

  // --- Input ---
  const input = createInputState();
  const { keys, justPressed } = input;

  // --- Sprites & world ---
  initSprites();

  // Map is 109 cols x 236 rows: World 1 (village/forest) + World 2 (beach
  // oasis) side by side, then the Jungle band, the Skeleton Dungeon band,
  // and now the Molten Depths band beneath that (see world/tilemap.js for
  // the exact row breakdown).
  const map = new TileMap(109, 236);
  const camera = new Camera(VIEW_W, VIEW_H);
  const particles = new ParticleSystem();
  const dialogue = new DialogueSystem();
  const inventory = new Inventory();
  const shop = new Shop();
  const player = new Player(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  Story.applyBackground(player, SaveGame.getBackground());
  Story.populateStartScreen(dom.backstoryIntro, dom.backgroundInput, dom.backstoryDetail);
  const multiplayer = new Multiplayer();

  const { npcs, elder, merchant, weaponMaster, premiumVendor } = WorldFactory.createNpcs();
  if (elder) elder.dialogue = Story.getElderDialogue(0);
  if (merchant) merchant.shop = new Merchant('Mercante Vagabondo', WANDERING_MERCHANT_STOCK, WANDERING_MERCHANT_CURRENCY);
  if (weaponMaster) weaponMaster.shop = new Merchant('Maestro d\'Armi', WEAPON_MASTER_STOCK, WEAPON_MASTER_CURRENCY);
  if (premiumVendor) premiumVendor.shop = new Merchant('Mercante di Casse', PREMIUM_CHEST_STOCK, 'premium');
  const worldItems = WorldFactory.createWorldItems();

  // Shared game state, passed explicitly into Combat/Hud/Screens so none of
  // those modules need to close over this file's local variables (they
  // can't anyway — each lives in its own <script> file).
  const state = {
    map, camera, particles, dialogue, inventory, shop, player,
    npcs, elder, merchant, weaponMaster, premiumVendor, worldItems, multiplayer,
    enemies: WorldFactory.createEnemies(),
    merchantGaveGift: false,
    questStage: 0, // 0 = not talked, 1 = quest given, 2 = sword found, 3 = boss defeated
    lastQuestStage: -1,
    gameState: 'lobby', // 'lobby' | 'start' | 'howtoplay' | 'playing' | 'gameover'
    lobbyTriedConnect: false,
    hasStarted: false, // true once Play has been pressed at least once — flips the start-menu button to "Continue"
    screenFlash: null, // {color, alpha}
    toastMsg: null,
    toastTimer: 0,
    restartButton: null,
    continueButton: null,
    startButtons: {},
    howToBackButton: null,
    regionsSent: new Set(),
    profile: null,
  };

  SaveGame.load(player, inventory, state);

  function restartGame() {
    // Preserve persistent currencies and name across restarts — this keeps
    // gold/premium/honor safe when playing in online/cloud mode.
    const persist = {
      gold: player.gold,
      premium: player.premium,
      honor: player.honor,
      name: SaveGame.getName(),
    };

    player.x = PLAYER_SPAWN.x;
    player.y = PLAYER_SPAWN.y;

    player.maxHp = PLAYER_BASE_STATS.maxHp;
    player.hp = PLAYER_BASE_STATS.hp;
    player.xp = PLAYER_BASE_STATS.xp;
    player.xpNext = PLAYER_BASE_STATS.xpNext;
    player.lvl = PLAYER_BASE_STATS.lvl;
    player.gold = persist.gold;
    player.premium = persist.premium;
    player.honor = persist.honor;
    player.atk = PLAYER_BASE_STATS.atk;
    player.hasSword = false;
    player.hasEpicSword = false;
    player.hasCursedSword = false;
    player.hasLegendarySword = false;
    player.hasMoltenSword = false;
    player.weaponBonus = 0;
    player.fireproof = false;
    player.defense = 0;
    player.speed = PLAYER_BASE_STATS.speed;
    player.attacking = 0;
    player.attackCooldown = 0;
    player.attackCount = 0;
    player.invuln = 0;
    player.hunger = PLAYER_BASE_STATS.hunger;
    player.thirst = PLAYER_BASE_STATS.thirst;
    player.maxMana = PLAYER_BASE_STATS.maxMana;
    player.mana = PLAYER_BASE_STATS.mana;
    Story.applyBackground(player, SaveGame.getBackground());
    // (fireball cooldown intentionally carries over — matches the
    // original restart behavior.)

    inventory.reset();
    if (shop) shop.close();
    SaveGame.setName(persist.name);

    state.questStage = 0;
    state.gameState = 'playing';
    state.hasStarted = true;
    state.lobbyTriedConnect = false;
    state.merchantGaveGift = false;
    state.regionsSent = new Set();
    const worldItems = WorldFactory.createWorldItems();
    state.enemies = WorldFactory.createEnemies();

    state.toastMsg = null;
    state.toastTimer = 0;
    state.restartButton = null;
    state.continueButton = null;

    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.style.display = 'none';
    hud.setVisible(true);
    SaveGame.save(player, inventory, state);
  }

  function checkRegionDiscovery() {
    if (!multiplayer.connected) return;
    const tx = Math.floor(player.centerX / TILE);
    const ty = Math.floor(player.centerY / TILE);
    const send = (region) => {
      if (state.regionsSent.has(region)) return;
      state.regionsSent.add(region);
      multiplayer.sendRegionEnter(region);
    };
    if (ty <= map.oasisSouthEdge) {
      if (map.isWorldTwoGateOpen && tx >= 28) send('oasis');
      else if (tx < 28) send('vale');
    } else if (ty <= map.jungleSouthEdge) {
      if (map.isJungleGateOpen) send('jungle');
    } else if (ty <= map.dungeonSouthEdge) {
      if (map.isSkeletonGateOpen) send('crypt');
    } else {
      if (map.isLavaGateOpen) send('molten');
    }
  }

  function update() {
    if (state.gameState === 'start' || state.gameState === 'howtoplay') {
      input.clearJustPressed();
      return;
    }

    if (dom.chatInput && document.activeElement === dom.chatInput) {
      input.clearJustPressed();
      return;
    }

    input.pollGamepad();
    dialogue.update();

    if (state.elder && state.questStage !== state.lastQuestStage) {
      state.elder.dialogue = Story.getElderDialogue(state.questStage);
      state.lastQuestStage = state.questStage;
    }

    if (state.gameState === 'lobby') {
      if (!multiplayer.ws && !state.lobbyTriedConnect) {
        state.lobbyTriedConnect = true;
        const lobbyName = (dom.nameInput?.value || SaveGame.getName() || 'Nilo1221').trim().slice(0, 16);
        multiplayer.name = lobbyName;
        multiplayer.connect(lobbyName);
      }
      particles.update();
      camera.follow(player.centerX, player.centerY, player.dir, map.cols * TILE, map.rows * TILE);
      multiplayer.send(player);
      multiplayer.tick();
      if (state.screenFlash) {
        state.screenFlash.alpha -= 0.02;
        if (state.screenFlash.alpha <= 0) state.screenFlash = null;
      }
      if (state.toastTimer > 0) state.toastTimer--;
      else state.toastMsg = null;
      input.clearJustPressed();
      return;
    }

    if (state.gameState !== 'playing') return;

    checkRegionDiscovery();

    if (dialogue.isOpen()) {
      if (justPressed[' '] || justPressed['e']) dialogue.advance();
    } else if (shop.open) {
      if (justPressed['escape']) shop.close();
    } else if (inventory.open) {
      if (justPressed['i'] || justPressed['escape']) inventory.toggle();
    } else if (justPressed['escape']) {
      state.gameState = 'lobby';
      state.lobbyTriedConnect = false;
      hud.setVisible(false);
      const overlay = document.getElementById('start-overlay');
      if (overlay) overlay.style.display = 'flex';
    } else {
      player.update(input, map, particles);
      player.fireballs.forEach((f) => f.update(state.enemies, particles));
      player.fireballs = player.fireballs.filter((f) => f.life > 0);

      if (justPressed['e']) Combat.checkInteract(state);
      if (keys[' ']) Combat.handleAttack(state);
      if (justPressed['f']) {
        if (player.castFireball()) {
          Combat.toast(state, `Palla di fuoco! -${FIREBALL_STATS.manaCost} Mana`);
        } else {
          Combat.toast(state, 'Mana insufficiente!');
        }
      }
      if (justPressed['i']) inventory.toggle();
      if (justPressed['c']) {
        const mode = camera.cycle();
        Combat.toast(state, `Telecamera: ${mode} persona`);
      }

      npcs.forEach((n) => n.update());
      state.enemies.forEach((en) => en.update(player, map, particles));

      Combat.checkGateConditions(state);
      Combat.checkHazards(state);
      Combat.processWorldItemPickups(state);
      player.tickSurvival();
      multiplayer.send(player);
      multiplayer.tick();

      if (player.hp <= 0) state.gameState = 'gameover';
    }

    particles.update();
    camera.follow(player.centerX, player.centerY, player.dir, map.cols * TILE, map.rows * TILE);

    if (state.screenFlash) {
      state.screenFlash.alpha -= 0.02;
      if (state.screenFlash.alpha <= 0) state.screenFlash = null;
    }
    if (state.toastTimer > 0) state.toastTimer--;
    else state.toastMsg = null;

    input.clearJustPressed();
  }

  function draw() {
    if (state.gameState !== 'playing' && state.gameState !== 'lobby') {
      Screens.drawStart(ctx, state, VIEW_W, VIEW_H);
      return;
    }
    if (state.gameState === 'howtoplay') {
      Screens.drawStart(ctx, state, VIEW_W, VIEW_H);
      Screens.drawHowToPlay(ctx, state, VIEW_W, VIEW_H);
      return;
    }

    const t = Date.now();
    const off = camera.getOffset();
    const camX = Math.round(off.x), camY = Math.round(off.y);

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    map.drawGround(ctx, camX, camY, VIEW_W, VIEW_H);
    map.drawAnimated(ctx, camX, camY, VIEW_W, VIEW_H, t);

    // Depth-sorted draw: items, NPCs, enemies, player, and fireballs all
    // sorted by y (feet position) so nearer things draw over farther ones.
    const drawables = [];
    worldItems.forEach((it) => {
      if (!it.taken) drawables.push({ y: it.y + it.h, draw: () => it.draw(ctx, camX, camY) });
    });
    npcs.forEach((n) => drawables.push({ y: n.y + n.h, draw: () => n.draw(ctx, camX, camY) }));
    state.enemies.forEach((en) => drawables.push({ y: en.y + en.h, draw: () => en.draw(ctx, camX, camY) }));
    if (camera.mode !== 'first') {
      drawables.push({ y: player.y + player.h, draw: () => player.draw(ctx, camX, camY) });
    }
    player.fireballs.forEach((f) => drawables.push({ y: f.y + f.h, draw: () => f.draw(ctx, camX, camY) }));
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach((d) => d.draw());
    multiplayer.draw(ctx, camX, camY);

    particles.draw(ctx, camX, camY);

    if (camera.mode === 'first') {
      ctx.save();
      ctx.strokeStyle = 'rgba(241,239,232,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(VIEW_W / 2, VIEW_H / 2, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    Hud.drawVignette(ctx, VIEW_W, VIEW_H);

    if (state.screenFlash) {
      ctx.fillStyle = `rgba(${state.screenFlash.color},${Math.max(0, state.screenFlash.alpha)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (state.gameState !== 'lobby') Hud.draw(ctx, state, VIEW_W, VIEW_H);
    dialogue.draw(ctx, VIEW_W, VIEW_H);
    inventory.draw(ctx, VIEW_W, VIEW_H, player);
    if (shop.open) shop.draw(ctx, state, VIEW_W, VIEW_H);

    if (state.gameState === 'gameover' || state.gameState === 'victory') Screens.drawEnd(ctx, state, VIEW_W, VIEW_H);
  }

  let domTick = 0;
  function loop() {
    update();
    draw();
    domTick++;
    if (domTick % 4 === 0) hud.sync(player);
    if (domTick % 120 === 0) SaveGame.save(player, inventory, state);
    requestAnimationFrame(loop);
  }

  // --- Mouse input ---
  canvas.tabIndex = 0;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (state.gameState === 'playing' && inventory.open) {
      inventory.updateHover(mx, my, VIEW_W, VIEW_H);
      canvas.style.cursor = 'default';
      return;
    }

    if (state.gameState === 'playing' && shop.open) {
      shop.updateHover(mx, my, VIEW_W, VIEW_H);
      canvas.style.cursor = shop.hovered ? 'pointer' : 'default';
      return;
    }

    if (state.gameState !== 'start' && state.gameState !== 'howtoplay' && state.gameState !== 'gameover' && state.gameState !== 'victory') {
      canvas.style.cursor = 'default';
      return;
    }
    let over = false;
    if (state.gameState === 'start') {
      over = Screens.pointInBtn(mx, my, state.startButtons.play) ||
        Screens.pointInBtn(mx, my, state.startButtons.howto) ||
        Screens.pointInBtn(mx, my, state.startButtons.restart) ||
        Screens.pointInBtn(mx, my, state.startButtons.author);
    } else if (state.gameState === 'howtoplay') {
      over = Screens.pointInBtn(mx, my, state.howToBackButton);
    } else {
      over = Screens.pointInBtn(mx, my, state.restartButton) || Screens.pointInBtn(mx, my, state.continueButton);
    }
    canvas.style.cursor = over ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    canvas.focus();

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (state.gameState === 'playing' && inventory.open) {
      const hit = inventory.clickAt(mx, my, VIEW_W, VIEW_H);
      if (hit) Combat.handleInventoryClick(state, hit);
      return;
    }

    if (state.gameState === 'playing' && shop.open) {
      const hit = shop.clickAt(mx, my, VIEW_W, VIEW_H);
      if (hit) {
        if (hit.action === 'close') {
          shop.close();
        } else if (hit.action === 'buyCurrency') {
          Payments.purchase('small', () => {
            const gems = Payments.PACKS.small.gems;
            player.premium += gems;
            Combat.toast(state, `+${gems} Gemme acquistate`);
            AudioManager.play('buy');
          });
        } else if (hit.action === 'buy') {
          const result = shop.merchant.buy(hit.kind, player, inventory);
          if (result.ok) {
            Combat.toast(state, `Acquistato: ${getItemStats(hit.kind).name}`);
            AudioManager.play('buy');
          } else {
            Combat.toast(state, result.reason === 'insufficiente' ? `${shop.merchant.currencyName} insufficienti` : 'Oggetto esaurito');
          }
        } else if (hit.action === 'sell') {
          const result = shop.merchant.sell(hit.kind, player, inventory);
          if (result.ok) {
            Combat.toast(state, `Venduto ${getItemStats(hit.kind).name}: +${result.price} ${shop.merchant.currencyName}`);
            AudioManager.play('buy');
          } else {
            Combat.toast(state, result.reason === 'non possiedi' ? 'Non possiedi questo oggetto' : 'Non acquistabile');
          }
        } else if (hit.action === 'ad') {
          if (hit.ad) {
            AdManager.openAd(hit.ad, 'premiumShop');
            AudioManager.play('ui');
          }
        } else if (hit.action === 'affiliate') {
          const aff = AFFILIATES.find((a) => a.id === hit.id);
          if (aff) {
            window.open(aff.url, '_blank', 'noopener,noreferrer');
            AudioManager.play('ui');
          }
        }
      }
      return;
    }

    if (state.gameState === 'start') {
      if (Screens.pointInBtn(mx, my, state.startButtons.play)) {
        state.gameState = 'playing';
        state.hasStarted = true;
        hud.setVisible(true);
        AudioManager.resume();
        AudioManager.play('ui');
      } else if (Screens.pointInBtn(mx, my, state.startButtons.howto)) {
        state.gameState = 'howtoplay';
      } else if (Screens.pointInBtn(mx, my, state.startButtons.restart)) {
        restartGame();
        hud.setVisible(true);
      } else if (Screens.pointInBtn(mx, my, state.startButtons.author)) {
        window.open(AUTHOR_URL, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (state.gameState === 'howtoplay') {
      if (Screens.pointInBtn(mx, my, state.howToBackButton)) {
        state.gameState = 'start';
      }
      return;
    }

    if ((state.gameState !== 'gameover' && state.gameState !== 'victory') || !state.restartButton) return;
    if (Screens.pointInBtn(mx, my, state.continueButton)) {
      // Dismiss the victory screen and keep playing in the current world —
      // nothing resets, unlike Play Again. Not offered on the gameover
      // screen (state.continueButton is null there), since there's nothing
      // to resume from after the player has died.
      state.gameState = 'playing';
      state.continueButton = null;
      state.restartButton = null;
      return;
    }
    if (Screens.pointInBtn(mx, my, state.restartButton)) restartGame();
  });

  // Helper used by the start-card login flow to inject Appwrite cloud data
  // into the local player object before the game begins.
  window.applyCloudData = (data) => {
    if (!data) return;
    SaveGame.applyData(player, data, inventory, state);
    Story.applyBackground(player, SaveGame.getBackground());
    if (data.name && dom.nameInput) dom.nameInput.value = data.name;
  };

  // Small debug hook (harmless in normal play) — lets you inspect live state
  // from the browser console with `__gameDebug.state`, or force a restart
  // with `__gameDebug.restartGame()`.
  window.startGame = (name, online) => {
    name = String(name).trim().slice(0, 16);
    const savedName = SaveGame.getName();
    if (savedName && name !== savedName) {
      if (player.gold >= RENAME_COST) {
        player.gold -= RENAME_COST;
        SaveGame.setName(name);
        SaveGame.save(player, inventory, state);
        Combat.toast(state, `Nome cambiato per ${RENAME_COST} oro`);
      } else {
        Combat.toast(state, `Cambio nome: ${RENAME_COST} oro richiesti`);
        if (dom.nameInput) dom.nameInput.value = savedName;
        name = savedName;
      }
    } else if (!savedName) {
      SaveGame.setName(name);
    }

    const bg = (dom.backgroundInput ? dom.backgroundInput.value : '') || 'exile';
    SaveGame.setBackground(bg);
    player.maxHp = PLAYER_BASE_STATS.maxHp;
    player.hp = PLAYER_BASE_STATS.hp;
    player.maxMana = PLAYER_BASE_STATS.maxMana;
    player.mana = PLAYER_BASE_STATS.mana;
    player.atk = PLAYER_BASE_STATS.atk;
    player.speed = PLAYER_BASE_STATS.speed;
    Story.applyBackground(player, bg);
    SaveGame.save(player, inventory, state);

    // If already connected with a different mode/name, reset.
    if (multiplayer.ws) multiplayer.disconnect();
    if (online) multiplayer.connect(name);

    multiplayer.name = name;
    state.gameState = 'playing';
    state.hasStarted = true;
    state.lobbyTriedConnect = false;
    state.regionsSent = new Set();
    hud.setVisible(true);
    AudioManager.resume();
    AudioManager.play('ui');
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  multiplayer.onPvpHit = (from, damage) => {
    player.takeDamage(damage, state.particles, true);
  };

  multiplayer.onPvpKill = () => {
    player.honor += HONOR_PER_KILL;
    Combat.toast(state, `+${HONOR_PER_KILL} onore`);
  };

  multiplayer.onError = () => {
    if (state.gameState === 'lobby') return;
    Combat.toast(state, 'Server multiplayer non raggiungibile');
  };

  multiplayer.onChat = (from, text) => {
    if (!dom.chatLog) return;
    const line = document.createElement('div');
    line.textContent = `${from}: ${text}`;
    dom.chatLog.appendChild(line);
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
  };

  multiplayer.onReward = (reward) => Combat.applyServerReward(state, reward);
  multiplayer.onDrop = (drop) => Combat.spawnServerDrop(state, drop);
  multiplayer.onBossEvent = (ev) => Combat.applyServerBossEvent(state, ev.bossType, ev.x, ev.y);
  multiplayer.onChestResult = (data) => Combat.applyServerChestResult(state, data);

  multiplayer.onProfile = (profile) => { state.profile = profile; };
  multiplayer.onAchievement = (msg) => {
    player.gold += msg.rewardGold || 0;
    player.gainXP(msg.rewardXp || 0, state.particles);
    Combat.toast(state, `Achievement sbloccato: ${msg.title}`);
  };
  multiplayer.onRegionUnlocked = (msg) => {
    player.gold += msg.rewardGold || 0;
    player.gainXP(msg.rewardXp || 0, state.particles);
    Combat.toast(state, `Regione scoperta: ${msg.title} (+${msg.rewardGold}g, +${msg.rewardXp}xp)`);
  };
  multiplayer.onStashResult = (data) => {
    if (!data.ok) {
      Combat.toast(state, data.reason || 'Errore stash');
      return;
    }
    if (data.action === 'withdraw' && data.kind) {
      inventory.add(data.kind, data.count || 1);
      Combat.toast(state, `Ritirato dallo stash: ${data.kind} x${data.count || 1}`);
    } else if (data.action === 'deposit') {
      Combat.toast(state, 'Deposito nello stash completato');
    }
  };

  window.sendChat = (text) => {
    text = String(text).trim();
    if (!text) return;

    if (text.toLowerCase().startsWith('/stash')) {
      const parts = text.split(/\s+/);
      const cmd = parts[1] ? parts[1].toLowerCase() : '';
      if (cmd === 'deposit' && parts[2]) {
        const kind = parts[2];
        const count = parseInt(parts[3], 10) || 1;
        if (!inventory.has(kind) || (inventory.items[kind] || 0) < count) {
          Combat.toast(state, 'Non hai abbastanza oggetti');
          return;
        }
        inventory.remove(kind, count);
        multiplayer.sendStashDeposit(kind, count);
      } else if (cmd === 'withdraw' && parts[2]) {
        const kind = parts[2];
        const count = parseInt(parts[3], 10) || 1;
        multiplayer.sendStashWithdraw(kind, count);
      } else if (cmd === 'list') {
        multiplayer.sendStashList();
        Combat.toast(state, 'Lista stash richiesta');
      } else {
        Combat.toast(state, 'Comandi: /stash deposit <kind> [count], /stash withdraw <kind> [count], /stash list');
      }
      return;
    }

    if (!multiplayer.connected) return;
    multiplayer.sendChat(text);
    if (dom.chatLog) {
      const line = document.createElement('div');
      line.textContent = `${multiplayer.name}: ${text}`;
      line.className = 'chat-self';
      dom.chatLog.appendChild(line);
      dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
    }
  };

  window.__gameDebug = { state, restartGame };

  canvas.focus();
  loop();
})();