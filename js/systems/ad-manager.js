// systems/ad-manager.js — wrapper for direct ads and real ad networks.
// No third-party scripts are loaded until the user accepts cookies.

const AdManager = (function () {
  const KEY = 'shattered-vale-ads-v1';
  let data = null;
  let seen = new Set();
  let network = null;
  let ready = false;
  let sdkLoaded = false;

  // --- local tracking for direct ads ---

  function _load() {
    if (data) return;
    try {
      data = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      data = {};
    }
  }

  function _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  function _key(adId, slot) { return `${slot}:${adId}`; }

  function _ensure(adId, slot) {
    _load();
    const k = _key(adId, slot);
    if (!data[k]) data[k] = { impressions: 0, clicks: 0 };
    return k;
  }

  function trackImpression(adId, slot) {
    const k = _ensure(adId, slot);
    if (seen.has(k)) return;
    seen.add(k);
    data[k].impressions += 1;
    _save();
    console.log('[ADV] impression', slot, adId);
  }

  function trackClick(adId, slot) {
    const k = _ensure(adId, slot);
    data[k].clicks += 1;
    _save();
    console.log('[ADV] click', slot, adId);
  }

  // --- network helpers ---

  function hasConsent() { return localStorage.getItem('cookieConsent') === 'true'; }

  function loadScript(src, attrs = {}) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
      const s = document.createElement('script');
      s.async = true;
      s.src = src;
      Object.keys(attrs).forEach(key => s.setAttribute(key, attrs[key]));
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function initAdSense() {
    const cfg = (network && network.adsense) || {};
    if (!cfg.client || cfg.client.indexOf('XXXX') !== -1) {
      console.warn('[ADV] AdSense client non configurato.');
      return;
    }
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.client}`;
    if (cfg.test) s.dataset.adbreakTest = 'on';
    document.head.appendChild(s);
    ready = true;
    console.log('[ADV] AdSense H5 initialized');
  }

  function initAdsterra() {
    ready = true;
    console.log('[ADV] Adsterra ready (banner/direct-link)');
  }

  function initGameMonetize() {
    const cfg = (network && network.gamemonetize) || {};
    if (!cfg.gameId || cfg.gameId.indexOf('YOUR') !== -1) {
      console.warn('[ADV] GameMonetize gameId non configurato.');
      return;
    }
    window.SDK_OPTIONS = {
      gameId: cfg.gameId,
      onEvent: function (a) {
        if (a.name === 'SDK_READY') ready = true;
      },
    };
    loadScript('https://api.gamemonetize.com/sdk.js').then((ok) => { ready = ok; });
  }

  function initPoki() {
    const cfg = (network && network.poki) || {};
    if (!cfg.gameId || cfg.gameId.indexOf('YOUR') !== -1) {
      console.warn('[ADV] Poki gameId non configurato.');
      return;
    }
    loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js').then((ok) => {
      if (!ok || !window.PokiSDK) { ready = false; return; }
      window.PokiSDK.init().then(() => { ready = true; });
    });
  }

  function initCrazyGames() {
    loadScript('https://sdk.crazygames.com/crazygames-sdk-v2.js').then((ok) => {
      ready = ok;
      if (ok) window.CrazyGames = window.CrazyGames || {};
    });
  }

  function init() {
    if (sdkLoaded) return;
    if (!hasConsent()) return;
    network = (typeof window !== 'undefined' && window.AD_NETWORK) ? window.AD_NETWORK : { provider: 'none' };
    sdkLoaded = true;
    const provider = network.provider || 'none';
    console.log('[ADV] provider:', provider);
    switch (provider) {
      case 'adsense': initAdSense(); break;
      case 'adsterra': initAdsterra(); break;
      case 'gamemonetize': initGameMonetize(); break;
      case 'poki': initPoki(); break;
      case 'crazygames': initCrazyGames(); break;
      default:
        console.log('[ADV] nessun provider pubblicitario attivo.');
        ready = false;
    }
  }

  // --- public ad calls ---

  function isReady() { return ready; }

  function complete(cb) { if (typeof cb === 'function') cb(); }

  function showInterstitial(onComplete) {
    if (!isReady()) { complete(onComplete); return; }
    const provider = network.provider;
    switch (provider) {
      case 'adsense':
        if (window.adBreak) {
          window.adBreak({
            type: 'start',
            name: 'game-interstitial',
            adBreakDone: onComplete,
          });
        } else complete(onComplete);
        break;
      case 'adsterra':
        complete(onComplete);
        break;
      case 'gamemonetize':
        if (typeof window.sdk !== 'undefined' && window.sdk.showBanner) window.sdk.showBanner();
        complete(onComplete);
        break;
      case 'poki':
        if (window.PokiSDK) window.PokiSDK.commercialBreak().then(() => complete(onComplete));
        else complete(onComplete);
        break;
      case 'crazygames':
        if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
          window.CrazyGames.SDK.ad.requestAd('midgame', {
            adFinished: () => complete(onComplete),
            adError: () => complete(onComplete),
            adStarted: () => {},
          });
        } else complete(onComplete);
        break;
      default:
        complete(onComplete);
    }
  }

  function showRewarded(onReward) {
    function reward(success) { if (typeof onReward === 'function') onReward(success); }
    if (!isReady()) { reward(false); return; }
    const provider = network.provider;
    switch (provider) {
      case 'adsense':
        if (window.adBreak) {
          window.adBreak({
            type: 'rewarded',
            beforeBreak: () => {},
            beforeReward: (show) => { show(); },
            adBreakDone: () => reward(true),
          });
        } else reward(false);
        break;
      case 'poki':
        if (window.PokiSDK) window.PokiSDK.rewardedBreak().then((success) => reward(!!success));
        else reward(false);
        break;
      case 'crazygames':
        if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
          window.CrazyGames.SDK.ad.requestAd('rewarded', {
            adFinished: () => reward(true),
            adError: () => reward(false),
            adStarted: () => {},
          });
        } else reward(false);
        break;
      default:
        reward(false);
    }
  }

  function showBanner(containerId) {
    if (!isReady()) return;
    const provider = network.provider;
    if (provider === 'adsterra' && network.adsterra && network.adsterra.bannerScript) {
      const c = document.getElementById(containerId);
      if (c) c.innerHTML = network.adsterra.bannerScript;
      return;
    }
    if (provider === 'gamemonetize' && typeof window.sdk !== 'undefined' && window.sdk.showBanner) {
      window.sdk.showBanner();
    }
  }

  function getAdForSlot(slot) { return (window.AD_SLOTS && window.AD_SLOTS[slot]) || null; }

  function openAd(ad, slot) {
    if (!ad || !ad.url) return;
    trackClick(ad.id, slot);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  }

  return {
    init,
    isReady,
    showInterstitial,
    showRewarded,
    showBanner,
    getAdForSlot,
    openAd,
    trackImpression,
    trackClick,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('cookieConsent') === 'true') AdManager.init();
});
