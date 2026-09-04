# Configurazione pubblicità reali (ADV) — Shattered Vale

## Obiettivo

Integrare pubblicità reali nel gioco: banner, interstitial e rewarded, con il minor attrito possibile e rispettando il consenso cookie.

## Provider supportati

`js/systems/ad-manager.js` supporta questi provider:

- `adsense` — Google AdSense H5 Games Ads (richiede approvazione AdSense).
- `adsterra` — Banner o Direct Link, nessun minimo di traffico.
- `gamemonetize` — SDK per giochi HTML5, richiede pubblicazione sul portale.
- `poki` — SDK Poki per giochi ospitati su Poki.
- `crazygames` — SDK CrazyGames per giochi ospitati su CrazyGames.
- `none` — Nessuna pubblicità (default).

## Configurazione rapida

Modifica `js/config/ads.js`:

```js
const AD_NETWORK = {
  provider: 'none', // cambia in 'adsense' | 'adsterra' | 'gamemonetize' | 'poki' | 'crazygames'

  adsense: {
    client: 'ca-pub-XXXXXXXXXXXXXXXX', // il tuo Publisher ID
    test: false,                      // true solo in sviluppo per annunci falsi
  },

  adsterra: {
    // Banner: incolla qui lo script fornito da Adsterra (opzionale)
    bannerScript: '',
    // Direct link: URL che apre l'offerta in un'altra scheda
    directLink: 'https://...',
  },

  gamemonetize: {
    gameId: 'YOUR_GAME_ID',
  },

  poki: {
    gameId: 'YOUR_GAME_ID',
  },
};
```

Il consenso cookie deve essere `true` affinché gli script di terze parti vengano caricati.

## Come attivare il consenso

La cookie banner in `index.html` chiede già il consenso per Analytics e pubblicità. `AdManager.init()` viene chiamato automaticamente quando l'utente accetta. Se il consenso era già dato, gli script vengono caricati al primo avvio.

## Dove mostrare gli annunci

Nel codice del gioco chiama:

```js
// Interstitial (morto, cambio livello, ritorno al menu)
AdManager.showInterstitial(() => {
  // callback eseguito quando l'annuncio finisce (anche se non viene mostrato)
});

// Rewarded (premio facoltativo: gemme gratis, revive)
AdManager.showRewarded((success) => {
  if (success) {
    // dai la ricompensa
  }
});

// Banner in un contenitore DOM
AdManager.showBanner('ad-banner-container');
```

## Integrazione consigliata nel game loop

In `js/core/game.js`:

```js
// Quando il giocatore muore
if (player.hp <= 0) {
  state.gameState = 'gameover';
}

// Quando clicca "Gioca Ancora" sul game over
if (Screens.pointInBtn(mx, my, state.restartButton)) {
  AdManager.showInterstitial(() => restartGame());
}
```

## Provider specifici

### Google AdSense H5

1. Crea un account AdSense.
2. Aggiungi il sito Vercel e ottieni approvazione.
3. Crea un'unità H5 Games Ads.
4. Inserisci `ca-pub-XXXXXXXX` in `AD_NETWORK.adsense.client`.
5. In sviluppo imposta `test: true` per vedere annunci di test.

### Adsterra

1. Registrati come publisher.
2. Per banner: `Websites → ADD WEBSITE`, scegli formato e dimensione (320x50 mobile, 728x90 desktop).
3. Copia lo script e incollalo in `AD_NETWORK.adsterra.bannerScript`.
4. Per Direct Link: `Smartlinks → CREATE DIRECT LINK`, copia l'URL in `AD_NETWORK.adsterra.directLink`.
5. Se usi Direct Link, l'annuncio si apre quando il giocatore clicca il banner "Sponsor" nel negozio premium.

### GameMonetize

1. Aggiungi il gioco su `gamemonetize.com`.
2. Ottieni il `GameId`.
3. Inseriscilo in `AD_NETWORK.gamemonetize.gameId`.
4. Chiama `sdk.showBanner()` tramite `AdManager.showInterstitial()` o `showBanner()`.

### Poki

1. Pubblica il gioco su Poki e ottieni `gameId`.
2. Imposta `provider: 'poki'` e inserisci l'ID.
3. Usa `AdManager.showInterstitial()` per `PokiSDK.commercialBreak()` e `showRewarded()` per `PokiSDK.rewardedBreak()`.

### CrazyGames

1. Pubblica il gioco su CrazyGames.
2. Imposta `provider: 'crazygames'`.
3. Usa `AdManager.showInterstitial()` per midgame e `showRewarded()` per rewarded.

## Test

- In locale apri `index.html` con un server (es. `npx serve .`).
- Imposta `test: true` per AdSense per non generare traffico reale.
- Apri DevTools → Network e cerca `adsbygoogle`, `poki-sdk`, `crazygames-sdk`, `gamemonetize`.
- Controlla la Console per `[ADV] provider: ...`.

## Note legali

- Non caricare script pubblicitari se l'utente non ha dato il consenso (GDPR/UE).
- Non cliccare mai i tuoi annunci: AdSense banna per invalid clicks.
- I rewarded devono essere sempre facoltativi e dare la ricompensa solo se l'annuncio finisce.
