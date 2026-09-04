# Shattered Vale — Roadmap meccaniche future (top 10)

Piano d'azione per introdurre gradualmente le 10 meccaniche più richieste, rispettando il vincolo di budget (free tier, self-hosted, niente abbonamenti).

## Principi guida

- Implementare un passo alla volta; non stravolgere il codice esistente.
- Prima funziona in single-player, poi si aggancia al multiplayer PartyKit.
- Usare solo strumenti gratuiti (Vercel, PartyKit free, Appwrite free, Supabase/Turso free).
- Ogni fase finisce con una build su Vercel giocabile prima di passare alla successiva.
- Di base il progetto è vanilla JS + HTML5 Canvas, quindi le soluzioni devono essere importabili via `<script>` o `esm` senza bundler pesanti.

## Fase 1 — Movimento aereo e fisica soddisfacente

Obiettivo: dare al giocatore controllo aereo e feedback fisico piacevole.

Meccaniche:
- **Dash** con cooldown e breve invulnerabilità.
- **Doppio salto** (e triple jump opzionale su item).
- **Wall slide / wall jump** lungo i muri.
- **Coyote time** e **jump buffer** per migliorare la risposta.
- Piccoli rimbalzi/impatti visivi quando si atterra o si colpisce un nemico.

Spunti GitHub:
- [Noah-Erz/Ultimate-Platformer-Controller-2D](https://github.com/Noah-Erz/Ultimate-Platformer-Controller-2D)
- [elvismd/2d_platformer_controller](https://github.com/elvismd/2d_platformer_controller)
- [rixraxx/Universal2DPlayerController](https://github.com/rixraxx/Universal2DPlayerController)

## Fase 2 — Combat souls-lite

Obiettivo: aggiungere ritmo, letalità e leggibilità ai combattimenti.

Meccaniche:
- **Stamina** per attacchi, parate, dash e corse.
- **Parry** con finestra temporale (Sekiro-style: difesa → parry automatico se ben tempata).
- **Blocco** che consuma stamina fino al guard break.
- **Colpi pesanti e leggeri** con trade-off velocità/danno.
- **Boss con pattern telegrafati** e barra della postura.
- **Posture break** e **riposte** sui boss.

Spunti GitHub:
- [odaznara99/SoulsOfTheHollowVale](https://github.com/odaznara99/SoulsOfTheHollowVale)
- [SenZmaKi/gyattsouls](https://github.com/SenZmaKi/gyattsouls)
- [GauthamThomas/orc-and-prejudice](https://github.com/GauthamThomas/orc-and-prejudice)

## Fase 3 — Progressione in piccoli loop (roguelite)

Obiettivo: ogni run è breve, ma porta qualcosa di persistente.

Meccaniche:
- **Run-based loop**: si entra in una zona, si uccidono nemici, si raccoglie un premio, si esce o si muore.
- **Meta-progressione**: oro/onore permanenti sbloccano piccoli buff tra una run e l'altra.
- **Punti checkpoint / bivacchi** dove riposare e salvare.
- **Run state vs meta state** chiaramente separati.

Spunti GitHub:
- [CanTATARDev/UltimateRoguelikeFramework](https://github.com/CanTATARDev/UltimateRoguelikeFramework)
- [Roo-Roo-Roo/survivors-roguelike-kit](https://github.com/Roo-Roo-Roo/survivors-roguelike-kit)
- [statico/godot-roguelike-example](https://github.com/statico/godot-roguelike-example)

## Fase 4 — Generazione procedurale di zone

Obiettivo: creare aree infinite/varianti senza dover disegnare ogni mappa a mano.

Meccaniche:
- **Dungeon generator** basato su BSP o cellular automata.
- **Seed condivisibile** per PartyKit (stessa mappa per tutti).
- **Stanze speciali** (boss, tesoro, shop) posizionate proceduralmente.
- **Difficoltà che scala** con la profondità.

Spunti GitHub:
- [dankcellar/better-dungeons](https://github.com/dankcellar/better-dungeons)
- [obsfx/dungrain](https://github.com/obsfx/dungrain)
- [khrome/procedural-layouts](https://github.com/khrome/procedural-layouts)
- [domasx2/dungeon-generator](https://github.com/domasx2/dungeon-generator)

## Fase 5 — Metroidvania e backtracking

Obiettivo: il mondo si apre via nuove abilità che sbloccano aree precedenti.

Meccaniche:
- **Abilità sbloccabili**: dash, wall jump, doppio salto, gancio, planata.
- **Porte/ostacoli** che richiedono abilità specifiche.
- **Mapa con segni** per ricordare dove tornare.
- **Collezionabili nascosti** dietro abilità sbloccabili.

Spunti GitHub:
- [kwarc87/lost-days-of-spring](https://github.com/kwarc87/lost-days-of-spring)
- [tmptrash/gra](https://github.com/tmptrash/gra)
- [attilahorvath/gib](https://github.com/attilahorvath/gib)

## Fase 6 — Crafting e gestione risorse leggera

Obiettivo: raccogliere, combinare e trasformare materiali senza UI opprimente.

Meccaniche:
- **Materiali base**: erbe, minerali, pelli, legno.
- **Ricette semplici** (2-3 ingredienti) per pozioni, bombe, affilatura.
- **Crafting al bivacco / mercante** per non appesantire l'HUD.
- **Stash condivisa** (già iniziata con PartyKit).

Spunti GitHub:
- [benev-gg/mule](https://github.com/benev-gg/mule)
- [wyzuk/yourcraft](https://github.com/wyzuk/yourcraft)
- [QuantumTekSupport/QuantumInventory](https://github.com/QuantumTekSupport/QuantumInventory)

## Fase 7 — Scelte morali e conseguenze narrative

Obiettivo: le decisioni del giocatore cambiano NPC, mondo e finale.

Meccaniche:
- **Sistema di karma/reputazione** nascosto o leggibile.
- **Scelte a tre vie** (negativa / neutra / positiva) su quest importanti.
- **Conseguenze concrete**: NPC che cambiano atteggiamento, negozi chiudono/riaprono, gate sbloccati diversi.
- **Finali multipli** legati alla reputazione.

Spunti GitHub:
- [SuperInstance/ternary-story](https://github.com/SuperInstance/ternary-story)
- [gpytak/Morality-System](https://github.com/gpytak/Morality-System)
- [inkle/ink](https://github.com/inkle/ink) (motore di narrativa ramificata)

## Fase 8 — Co-op locale e online semplice

Obiettivo: giocare con amici sullo stesso schermo o da remoto.

Meccaniche:
- **Co-op locale** 2 giocatori su tastiera/gamepad sullo stesso device.
- **Online** tramite PartyKit condividendo la stessa stanza.
- **Vita/punti condivisi opzionali** per aumentare la collaborazione.
- **Resurrezione del compagno** (alza il compagno caduto).

Spunti GitHub:
- [fernforge-arcade/abyss-survivors](https://github.com/fernforge-arcade/abyss-survivors)
- [InnerBushido/katana-kitties](https://github.com/InnerBushido/katana-kitties)
- [CurtisSlone/DriftDelve-Vibe-Engineered-Browser-Game](https://github.com/CurtisSlone/DriftDelve-Vibe-Engineered-Browser-Game)

## Fase 9 — Fisici soddisfacenti / emergenza caotica

Obiettivo: oggetti, esplosioni e corpi che reagiscono in modo visibile e divertente.

Meccaniche:
- **Knockback**, esplosioni e proiettili che spostano nemici.
- **Barili/casse** che esplodono e fanno danno ad area.
- **Collisioni leggere** tra entità per combattimenti caotici.
- Eventi ambientali (lava, trappole) che interagiscono con i nemici.

Spunti GitHub:
- [schteppe/p2.js](https://github.com/schteppe/p2.js)
- [CAPRIOARA-MAGIKA/physis](https://github.com/CAPRIOARA-MAGIKA/physis)
- [codeagent/rb-phys2d](https://github.com/codeagent/rb-phys2d)

## Fase 10 — Personalizzazione estetica visibile

Obiettivo: il giocatore vede il proprio equipaggiamento e i cosmetici sul personaggio.

Meccaniche:
- **Equip visibile**: armatura, elmo, spada, mantello cambiano l'aspetto dello sprite.
- **Skin/cosmetici** sbloccabili.
- **Colori/varianti** per armature.
- **Anteprima del personaggio** nella UI di inventario.

Spunti GitHub:
- [ochowei/lpc-toolkit-2026-1](https://github.com/ochowei/lpc-toolkit-2026-1)
- [OmegaCreations/CharaKit](https://github.com/OmegaCreations/CharaKit)
- [peterT23/character-customization-reactjs](https://github.com/peterT23/character-customization-reactjs)

## Ordine consigliato di implementazione

1. Fase 1 — Movimento aereo + fisica
2. Fase 2 — Combat souls-lite (stamina, parry)
3. Fase 9 — Fisico caotico (knockback, esplosioni)
4. Fase 4 — Procedural zone (espande il mondo)
5. Fase 5 — Metroidvania (abilità che aprono la mappa)
6. Fase 3 — Progressione in loop (roguelite)
7. Fase 6 — Crafting e risorse
8. Fase 10 — Personalizzazione estetica
9. Fase 7 — Scelte morali
10. Fase 8 — Co-op locale e online

## Note su budget e architettura

- Tutte le fasi devono restare compatibili con PartyKit free (già attivo su `party/server.js`).
- Per il co-op online basta espandere i messaggi esistenti; non serve backend a pagamento.
- Procedural generation e fisica possono girare lato client e sincronizzare solo lo stato essenziale.
- Salva/Cloud con Appwrite free tier; se si superano i limiti, si passa a localStorage + export/import save.

## Prossimo passo

Partire dalla **Fase 1 (Movimento aereo)** perché cambia la sensazione di gioco senza toccare loot, negozi e persistenza già implementati.
