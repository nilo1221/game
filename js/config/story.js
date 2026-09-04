// js/config/story.js — lore, character backstories and quest dialogues.
const Story = {
  title: 'Shattered Vale',

  intro: `Un tempo la Valle Spezzata era un regno unico, custode del Sigillo del Crepuscolo. Quando il re goblin Grimtooth lo spezzò, il mondo si frantumò in terre selvagge popolate di mostri e memorie antiche. Ora gli esiliati arrivano qui per riscattare il loro passato: trovare i frammenti del Sigillo, sconfiggere Grimtooth e decidere se usare il potere per redimersi o per dominare.`,

  backgrounds: [
    {
      id: 'exile',
      name: 'Esiliato delle Terre Spezzate',
      lore: 'Cacciato dal tuo regno per un crimine che non hai commesso. Sei sopravvissuto ai confini della Valle e hai imparato a resistere.',
      bonus: { maxHp: 25, hp: 25, atk: 0, speed: 0, mana: 0 },
    },
    {
      id: 'hunter',
      name: 'Cacciatore delle Tenebre',
      lore: 'Cresciuto tra le rovine, hai imparato a colpire prima che la preda ti veda. La tua punteria è letale, ma la tua costituzione è scarsa.',
      bonus: { maxHp: -10, hp: -10, atk: 2, speed: 0.1, mana: 0 },
    },
    {
      id: 'wanderer',
      name: 'Vagabondo Maledetto',
      lore: 'Un antico male ti perseguita e ti ha donato una scintilla di magia oscura. Sei debole di corpo, ma la tua mente brucia di potere.',
      bonus: { maxHp: -15, hp: -15, atk: 0, speed: 0, mana: 30 },
    },
  ],

  elderDialogues: [
    [
      'Viaggiatore, ringrazia le stelle che sei arrivato.',
      'La Valle Spezzata è il luogo dove i regni dimenticano i loro peccati.',
      'Grimtooth ha conquistato il castello del nord e tiene il primo frammento del Sigillo.',
      'Senza una lama affidabile non sopravvivrai nemmeno ai confini della foresta.',
      'Cerca la spada di ferro nascosta a ovest, poi trova il Re Goblin.',
    ],
    [
      'La spada è tua. Ora il tuo nome inizia a circolare tra i sussurri della Valle.',
      'Grimtooth ha mandato i suoi goblin a pattugliare il passo orientale.',
      'Sconfiggi i suoi luogotenenti: gli Slime Blu e Verdi custodiscono le chiavi del castello.',
      'Ricorda: ogni caduto lascia un eco. Scegli tu se quell\'eco sarà paura o speranza.',
    ],
    [
      'Hai aperto il cancello. Il castello attende.',
      'Grimtooth non è solo un re. È colui che ha spezzato il Sigillo, e il potere gli ha mangiato l\'anima.',
      'Se lo sconfiggi, il primo frammento del Sigillo sarà tuo.',
      'Ma attento: il potere offre una scelta, e ogni scelta ha una conseguenza.',
    ],
    [
      'Grimtooth è caduto. Il frammento del Sigillo pulsa nelle tue mani.',
      'La Valle ti ha riconosciuto, ma il tuo viaggio è appena iniziato.',
      'Altri frammenti giacciono nelle terre più lontane: la Spiaggia, la Giungla e le Profondità Ardenti.',
      'Torna quando sarai pronto. Il destino della Valle dipenderà da te.',
    ],
  ],

  getBackground(id) {
    return this.backgrounds.find((b) => b.id === id) || this.backgrounds[0];
  },

  getElderDialogue(stage) {
    const list = this.elderDialogues[Math.min(stage, this.elderDialogues.length - 1)];
    return list || this.elderDialogues[0];
  },

  applyBackground(player, id) {
    const bg = this.getBackground(id);
    if (!bg) return;
    const b = bg.bonus;
    if (b.maxHp) {
      player.maxHp += b.maxHp;
      player.hp += b.hp || 0;
      player.hp = Math.min(player.hp, player.maxHp);
    }
    if (b.atk) player.atk += b.atk;
    if (b.speed) player.speed += b.speed;
    if (b.mana) {
      player.maxMana += b.mana;
      player.mana += b.mana;
    }
  },

  populateStartScreen(introEl, selectEl, detailEl) {
    if (introEl) introEl.textContent = this.intro;
    if (!selectEl) return;

    const saved = (typeof SaveGame !== 'undefined' && SaveGame.getBackground) ? SaveGame.getBackground() : '';
    selectEl.innerHTML = '';
    for (const bg of this.backgrounds) {
      const opt = document.createElement('option');
      opt.value = bg.id;
      opt.textContent = bg.name;
      selectEl.appendChild(opt);
    }
    if (saved) selectEl.value = saved;

    const updateDetail = () => {
      const bg = this.getBackground(selectEl.value);
      if (detailEl) detailEl.textContent = bg ? bg.lore : '';
    };
    selectEl.addEventListener('change', updateDetail);
    updateDetail();
  },
};
