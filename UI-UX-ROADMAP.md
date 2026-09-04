# UI/UX Roadmap — Shattered Vale

Piano graduale per migliorare l'interfaccia su desktop e mobile senza stravolgere il codice esistente, rispettando il vincolo di budget (free tier / self-hosted).

## Principi guida

- **Mobile-first**: qualsiasi cambiamento deve funzionare prima su telefono, poi su desktop.
- **Vanilla JS + Canvas**: niente framework pesanti né build step; solo `<script>`, CSS e HTML.
- **Piccoli passi**: una fase alla volta, verificare su Vercel/Preview prima di passare alla successiva.
- **Design system unico**: palette, font e spazi definiti con variabili CSS.
- **Touch target minimo 44×44 px**; controlli touch grandi e ben distanziati.
- **Niente asset a pagamento**: icone con emoji o procedurali, font di sistema o Google Fonts free.

## Stato attuale e problemi noti

- **HUD troppo pieno**: in `index.html` ci sono 8 `.stat-group` (HP, Mana, XP, Oro, Gemme, Onore, Fame, Sete) che su mobile si accavallano.
- **Canvas fisso**: `canvas` è `width="960" height="600"`; su schermi piccoli esce fuori.
- **Touch controls incompleti**: solo attacco, interazione e fireball; mancano salto, dash, inventario/menu.
- **Inventario/shop testuali**: difficile da usare, specialmente su telefono.
- **Schermata iniziale minimale**: funzionale ma senza identità visiva.
- **Dialoghi**: pannello centrale che copre il gioco.

---

## Fase 1 — HUD compatto e leggibile

**Obiettivo**: ridurre l'ingombro in alto e rendere i dati più leggibili.

**Cosa fare:**
- Raggruppare HP/Mana in barre sottili affiancate.
- Oro, Gemme, Onore come **icone + numero**, senza barre.
- Fame e Sete: nasconderle in un pannello personaggio (`i`) o mostrarle solo sotto il 30%.
- XP: solo livello + sottile barra sotto l'oro.
- Sostituire gli `style="width: ..."` inline con classi CSS.
- Aggiungere `--gold`, `--bg-dark`, `--panel`, `--border` come variabili CSS.

**Spunti GitHub:**
- [basementuniverse/layout](https://github.com/basementuniverse/layout) — layout flessibile per Canvas UI.
- [Warblock-Top-Down-Shooter](https://github.com/ashfaaqrifath/Warblock-Top-Down-Shooter) — HUD semplice con livello, crediti, vita e munizioni.
- [search-strike-extract](https://github.com/zzusp/search-strike-extract) — HUD mobile con safe-area e controlli puliti.

---

## Fase 2 — Canvas responsive e DPR-aware

**Obiettivo**: il gioco si adatta a qualsiasi schermo, anche HiDPI.

**Cosa fare:**
- Rimuovere `width`/`height` fissi dal `<canvas>` e calcolarli da JS in base alla viewport.
- Usare `devicePixelRatio` per rendering nitido su Retina/mobile (capped a 2 per performance).
- Mantenere un aspect ratio logico (es. 16:9) con `object-fit: contain` o letterboxing.
- CSS:
  ```css
  #gameWrap { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
  canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
  ```
- Aggiornare `camera` e input coordinate con lo scale factor.

**Spunti GitHub:**
- [xem/responsiveTouchGameFramework](https://github.com/xem/responsiveTouchGameFramework) — canvas responsive e input unificato mouse/touch.
- [thebraingamelab/BetterGameTemplate](https://github.com/thebraingamelab/BetterGameTemplate) — libreria di resizing per canvas.
- [tknight-dev/gaming-canvas](https://github.com/tknight-dev/gaming-canvas) — scaling con `transform: scale(x)` e gestione orientamento.

---

## Fase 3 — Controlli touch completi

**Obiettivo**: giocare comodamente su smartphone.

**Cosa fare:**
- Joystick a sinistra, più grande (min 120 px), con opacità bassa a riposo.
- Pulsanti azione a destra: attacco, dash, salto, fireball, interazione (min 72 px).
- Aggiungere un tasto **inventario/menu** in alto a destra.
- Feedback visivo: pulsanti si illuminano quando premuti (`.active`).
- Prevenire conflitti tra joystick e pulsanti (zone di attivazione distinte).
- Supportare la rotazione del dispositivo.

**Spunti GitHub:**
- [cptx032/virtual-joystick](https://github.com/cptx032/virtual-joystick) — joystick HTML5 leggero.
- [dondido/virtual-joystick](https://github.com/dondido/virtual-joystick) — web component, facile da includere.
- [eekelof/Joystikk](https://github.com/eekelof/Joystikk) — joystick zero dipendenze, molto configurabile.
- [lrusso/VirtualJoystick](https://github.com/lrusso/VirtualJoystick) — fork con miglioramenti per mobile.

---

## Fase 4 — Schermata iniziale e menu

**Obiettivo**: dare identità e chiarezza alla prima impressione.

**Cosa fare:**
- Sfondo scuro/gradiente o un'immagine placeholder generata proceduralmente.
- Titolo grande e centrato, input e bottone più evidenti.
- Separare **Gioca offline** da un piccolo link **Accedi online** (espande email/password).
- Aggiungere menu **Impostazioni** (audio, sensibilità joystick, lingua) e **Crediti**.
- Su mobile: pulsanti a tutta larghezza, testo più grande.

**Spunti GitHub:**
- [search-strike-extract](https://github.com/zzusp/search-strike-extract) — menu intro, hub, impostazioni e loadout.
- [Serkanbyx/flappy-bird](https://github.com/Serkanbyx/flappy-bird) — overlay start/gameover con Tailwind.
- [IvanDeus/Mobile-Breakout-Classic](https://github.com/IvanDeus/Mobile-Breakout-Classic) — schermate mobile-first e glassmorphism.

---

## Fase 5 — Inventario e negozio a icone

**Obiettivo**: gestire oggetti senza leggere muri di testo.

**Cosa fare:**
- Inventario a **griglia di icone** (slot 48–64 px) con tooltip al passaggio del mouse / long-press su mobile.
- Slot equipaggiati con bordo dorato; oggetti consumabili con contatore.
- Pannello negozio a griglia con prezzo e pulsanti **Compra / Vendi**.
- Su mobile: **bottom sheet** che scorre dal basso.
- Mantenere `inventory.js` come sorgente di verità, separare rendering in `ui/shop.js` e `ui/inventory.js`.

**Spunti GitHub:**
- [Oen44/CanvasInventory](https://github.com/Oen44/CanvasInventory) — drag & drop + tooltip su Canvas.
- [DimiTech/inventory-system](https://github.com/DimiTech/inventory-system) — inventory HTML5 Canvas con slot.
- [benev-gg/mule](https://github.com/benev-gg/mule) — web component per inventario, framework-agnostic.
- [EdwardAThomson/Roguelike](https://github.com/EdwardAThomson/Roguelike) — inventory, equipment e help screen modulari.

---

## Fase 6 — Dialoghi e notifiche

**Obiettivo**: meno invasivo, più chiaro.

**Cosa fare:**
- Spostare il dialogo in **basso** con un pannello trasparente, non al centro.
- Mostrare nome NPC e piccola icona/avatar.
- Indicatore "continua..." per clic/spazio/Invio.
- Toast più piccoli e con durata breve.
- Notifiche per loot raro con effetto visivo (colore per rarità).

**Spunti GitHub:**
- [search-strike-extract](https://github.com/zzusp/search-strike-extract) — UI di raid e notifiche.
- [Mobile-Breakout-Classic](https://github.com/IvanDeus/Mobile-Breakout-Classic) — pannelli overlay e feedback visivi.

---

## Fase 7 — Accessibilità e rifinitura

**Obiettivo**: il gioco è usabile da più persone possibile.

**Cosa fare:**
- Contrasto testo/background sufficiente.
- Focus visibili su input e bottoni.
- `aria-label` sui controlli touch e gli elementi canvas.
- Supportare `prefers-reduced-motion`.
- Testare almeno su Chrome DevTools mobile e un dispositivo reale.
- Font leggibile, dimensioni in `rem`/`clamp()`.

---

## Ordine consigliato di implementazione

1. **Fase 1 — HUD compatto** (impatto immediato, poco codice).
2. **Fase 2 — Canvas responsive** (risolve il problema mobile più grande).
3. **Fase 3 — Controlli touch completi** (obbligatorio per giocare su telefono).
4. **Fase 4 — Schermata iniziale/menu** (migliora la prima impressione).
5. **Fase 5 — Inventario e negozio a icone** (riduce attrito nelle meccaniche già esistenti).
6. **Fase 6 — Dialoghi e notifiche** (più pulizia generale).
7. **Fase 7 — Accessibilità** (ultima, ma non opzionale).

## Note budget / architettura

- Tutto implementabile con CSS/JS vanilla; nessun tool a pagamento.
- Se si usano librerie di terzi, preferire quelle con UMD globale o `<script>` per evitare bundler.
- Testare ogni fase su Vercel preview prima di procedere.
- Mantenere PartyKit/Appwrite come sono; la UI non li tocca.

## Prossimo passo

Partire dalla **Fase 1 (HUD compatto)** e dalla **Fase 2 (canvas responsive)** insieme: sono i due interventi che fanno sembrare il gioco subito più professionale su mobile, con il minor sforzo.
