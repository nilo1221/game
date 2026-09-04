# Mobile UI Roadmap — Shattered Vale

## Obiettivo

Rendere il gioco usabile e piacevole su telefono: canvas che si adatta, controlli touch grandi, HUD leggibile, inventario/shop facili da toccare.

## Criteri

- Touch target >= 48x48 px, meglio 64x64.
- Nessun framework pesante; vanilla JS/HTML/CSS.
- Mobile-first: progettare prima per 360-420 px di larghezza, poi desktop.
- Riutilizzare la logica esistente, cambiare solo rendering/input.

## Stato attuale

- `index.html`: canvas 960x600 fisso, `#gameWrap` max-width 1100.
- `js/input.js`: joystick e tasti touch esistenti ma incompleti (mancano salto, dash, inventario).
- `js/ui/inventory-renderer.js`: inventario desktop a 3 colonne.

---

## Fase 1 — Canvas responsive e DPR-aware

### Problema

Il canvas fisso esce fuori dallo schermo su telefono.

### Soluzione

Adattare il boilerplate di `xem/responsiveTouchGameFramework`.

#### index.html

```html

<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
...
<div id="gameWrap">
  <canvas id="game"></canvas>
</div>
```

#### CSS

```css

html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
}
#gameWrap {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0b0a;
}
#gameWrap canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
```

#### JS — inizializzazione canvas

```js

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const gameW = 960;
const gameH = 600;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  const ratio = gameW / gameH;
  const w = window.innerWidth;
  const h = window.innerHeight;
  let cw = w;
  let ch = w / ratio;
  if (ch > h) {
    ch = h;
    cw = h * ratio;
  }
  canvas.style.width = Math.floor(cw) + 'px';
  canvas.style.height = Math.floor(ch) + 'px';
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
```

### Coordinate input

`js/input.js` deve convertire coordinate CSS in coordinate logiche del gioco:

```js

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = gameW / rect.width;
  const scaleY = gameH / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
```

---

## Fase 2 — Controlli touch completi

### Joystick con pointer events

`xem/responsiveTouchGameFramework` fornisce coordinate unificate mouse/touch:

```js

const pointer = {
  down: false,
  x: 0, y: 0,
  startX: 0, startY: 0,
};

canvas.addEventListener('pointerdown', e => {
  pointer.down = true;
  const p = getCanvasPoint(e);
  pointer.startX = pointer.x = p.x;
  pointer.startY = pointer.y = p.y;
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  const p = getCanvasPoint(e);
  pointer.x = p.x;
  pointer.y = p.y;
  e.preventDefault();
});
canvas.addEventListener('pointerup', e => {
  pointer.down = false;
  e.preventDefault();
});
```

### Web component joystick

`dondido/virtual-joystick` è un custom element leggero:

```html

<virtual-joystick data-mode="dynamic"></virtual-joystick>
<script src="https://dondido.github.io/virtual-joystick/virtual-joystick.js"></script>
<script>
  const joy = document.querySelector('virtual-joystick');
  joy.addEventListener('joystickmove', e => {
    const { x, y } = e.detail; // x,y in [-1,1]
    touchKeys['w'] = y < -0.2;
    touchKeys['s'] = y > 0.2;
    touchKeys['a'] = x < -0.2;
    touchKeys['d'] = x > 0.2;
  });
</script>
```

### Pulsanti azione a destra

HTML:

```html

<div id="touch-actions">
  <button class="touch-btn" data-key=" " data-hold>⚔️</button>
  <button class="touch-btn" data-key="f">🔥</button>
  <button class="touch-btn" data-key="Shift">💨</button>
  <button class="touch-btn" data-key=" ">⬆️</button> <!-- salto -->
  <button class="touch-btn" data-key="e">👋</button>
  <button class="touch-btn" data-key="i">🎒</button>
</div>
```

CSS:

```css

#touch-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: grid;
  grid-template-columns: repeat(3, 64px);
  gap: 10px;
}
.touch-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: 2px solid #e8c93c;
  color: #fff;
  font-size: 24px;
  touch-action: manipulation;
}
.touch-btn:active,
.touch-btn.active {
  background: rgba(232,201,60,0.3);
}
```

### Input mapping in `js/input.js`

```js

wrap.querySelectorAll('[data-key]').forEach(el => {
  const code = el.dataset.key === 'space' ? ' ' : el.dataset.key;
  const start = e => {
    e.preventDefault();
    if (!touchKeys[code]) touchJust[code] = true;
    touchKeys[code] = true;
    el.classList.add('active');
    merge();
  };
  const end = e => {
    e.preventDefault();
    touchKeys[code] = false;
    el.classList.remove('active');
    merge();
  };
  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('touchend', end, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
});
```

---

## Fase 3 — Schermata iniziale mobile-first

Design:
- Titolo grande, font `Cinzel`.
- Input e bottoni a tutta larghezza, altezza 48 px.
- Separazione tra "Gioca offline" e "Accedi online".
- Tasto menu (Impostazioni, Crediti, Audio).

CSS:

```css

#start-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1a1510 0%, #0d0b0a 100%);
  padding: 16px;
}
.start-card {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(232,201,60,0.33);
  text-align: center;
}
.start-card input,
.start-card button {
  width: 100%;
  height: 48px;
  margin: 8px 0;
  border-radius: 8px;
  font-size: 16px;
}
```

---

## Fase 4 — HUD e notifiche

- HUD in alto ridotto: barre sottili, numeri grandi.
- Toast in basso centrato, piccolo e temporizzato.
- Dialoghi in basso, non al centro dello schermo.

```css

#toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90vw;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(0,0,0,0.7);
  color: #f1efe8;
  font-size: 13px;
  text-align: center;
}
```

---

## Fase 5 — Inventario / Negozio mobile

Approccio: **bottom sheet full-screen a tab**.

### Mobile branch in `js/ui/inventory-renderer.js`

```js

if (window.innerWidth < 760) {
  const panelW = 920;
  const panelH = 540;
  const panelX = 20;
  const panelY = 20;
  // tab corrente: 'equip' | 'backpack' | 'detail'
  // - Equip: 2 colonne di slot 100x100
  // - Zaino: griglia 4xN con frecce di scroll
  // - Dettaglio: card che occupa metà destra o schermo intero
}
```

### HTML bottom sheet alternativo

Se preferisci DOM overlay:

```html

<div id="mobile-inventory" class="bottom-sheet" hidden>
  <nav class="inv-tabs">
    <button data-tab="equip" class="active">Equip</button>
    <button data-tab="backpack">Zaino</button>
    <button data-tab="detail">Dettaglio</button>
  </nav>
  <div id="inv-content"></div>
</div>
```

```css

.bottom-sheet {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100vw;
  height: 85vh;
  background: rgba(13,11,10,0.96);
  border-top: 2px solid #e8c93c;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
}
.inv-tabs {
  display: flex;
  justify-content: space-around;
  padding: 8px;
}
.inv-tabs button {
  flex: 1;
  padding: 12px;
  background: none;
  color: #e8e4d8;
  border: none;
  border-bottom: 2px solid transparent;
}
.inv-tabs button.active {
  border-bottom-color: #e8c93c;
}
```

### Generazione slot JS

```js

function renderBackpack(items) {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '8px';
  grid.style.padding = '12px';

  items.forEach(({ kind, count }) => {
    const cell = document.createElement('div');
    cell.className = 'inv-cell';
    cell.style.aspectRatio = '1';
    cell.style.border = '2px solid rgba(232,228,216,0.2)';
    cell.style.borderRadius = '10px';
    // aggiungi icona, contatore, rarità
    grid.appendChild(cell);
  });

  return grid;
}
```

---

## Fase 6 — Dialoghi e menu

- Spostare il dialogo in basso.
- Barra titolo con nome NPC e pulsante skip.
- Menu laterale (hamburger) per Impostazioni/Crediti.

```css

#dialogue {
  position: fixed;
  bottom: 80px;
  left: 12px;
  right: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(232,201,60,0.33);
  font-size: 15px;
  line-height: 1.4;
  color: #f1efe8;
}
```

---

## Fase 7 — Ottimizzazioni finali

- `touch-action: none` su canvas e controlli per evitare scroll/zoom.
- `aria-label` sui pulsanti touch.
- Ridurre animazioni con `prefers-reduced-motion`.
- Testare su Chrome DevTools e su un device reale.
- Haptic feedback: `navigator.vibrate(15)` su pressione tasti.

```js

function haptic() {
  if (navigator.vibrate) navigator.vibrate(15);
}
```

---

## Ordine di implementazione consigliato

1. **Fase 1** — Canvas responsive (base per tutto).
2. **Fase 2** — Controlli touch completi (joystick + 6 pulsanti).
3. **Fase 3** — Schermata iniziale mobile-first.
4. **Fase 4** — HUD + notifiche compatte.
5. **Fase 5** — Inventario / shop mobile.
6. **Fase 6** — Dialoghi / menu in basso.
7. **Fase 7** — Polish e accessibilità.

---

## Repositori GitHub utili

- `xem/responsiveTouchGameFramework` — canvas responsive + pointer events unificati.
- `cptx032/virtual-joystick` — joystick HTML5 semplice.
- `dondido/virtual-joystick` — web component joystick.
- `lrusso/VirtualJoystick` — joystick canvas-based.
- `alfredang/spaceship-shooter-game` — mobile buttons e UI overlay.
- `viktor-wilhelm/loco-app` — OOP canvas game con touch.
- `horatio-sans-serif/canvas_ui` — toolkit UI su canvas.
- `beyons/CanvasFramework` / `ecjep2/CanvasFramework` — bottom sheet, drawer, app bar.

---

## Note

- Per mobile, considera di passare l’inventario/shop a un **DOM overlay** invece che canvas: è più accessibile, scalabile e facile da stilizzare.
- Mantieni `js/systems/inventory.js` come sorgente di verità; cambia solo il renderer/UI.
- Tutte le librerie citate sono vanilla JS o UMD, compatibili con il progetto senza build step.