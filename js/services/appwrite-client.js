// js/services/appwrite-client.js — lightweight Appwrite REST client for the browser.
// Works with vanilla JS (no bundler) using fetch, so there are no SDK version issues.
// Disable cloud save by leaving APPWRITE_PROJECT empty in js/config/appwrite.js.

(function () {
  const ENDPOINT = typeof APPWRITE_ENDPOINT !== 'undefined' ? APPWRITE_ENDPOINT : '';
  const PROJECT = typeof APPWRITE_PROJECT !== 'undefined' ? APPWRITE_PROJECT : '';
  const DATABASE_ID = typeof APPWRITE_DATABASE_ID !== 'undefined' ? APPWRITE_DATABASE_ID : 'default';
  const COLLECTION_ID = typeof APPWRITE_COLLECTION_ID !== 'undefined' ? APPWRITE_COLLECTION_ID : 'players';

  const enabled = !!(ENDPOINT && PROJECT);
  let currentUser = null;
  let saveTimeout = null;
  let pendingData = null;

  function generateId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (_) {}
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'u';
    for (let i = 0; i < 31; i++) {
      id += chars[(Math.random() * chars.length) | 0];
    }
    return id;
  }

  async function api(path, options = {}) {
    const url = `${ENDPOINT}${path}`;
    const headers = {
      'X-Appwrite-Project': PROJECT,
      'X-Appwrite-Response-Format': '1.5.0',
    };

    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
      credentials: 'include',
      mode: 'cors',
    });

    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = (data && (data.message || data.summary)) || `${res.status} ${res.statusText}`;
      const err = new Error(message);
      err.code = res.status;
      throw err;
    }
    return data;
  }

  async function getAccount() {
    if (!enabled) return null;
    try {
      currentUser = await api('/v1/account', { method: 'GET' });
      return currentUser;
    } catch (e) {
      currentUser = null;
      return null;
    }
  }

  async function register(name, email, password) {
    if (!enabled) throw new Error('Cloud save non configurato');
    await api('/v1/account', {
      method: 'POST',
      body: { userId: generateId(), email, password, name },
    });
    return login(email, password);
  }

  async function login(email, password) {
    if (!enabled) throw new Error('Cloud save non configurato');
    await api('/v1/account/sessions/email', {
      method: 'POST',
      body: { email, password },
    });
    return getAccount();
  }

  async function logout() {
    if (!enabled || !currentUser) return;
    try {
      await api('/v1/account/sessions/current', { method: 'DELETE' });
    } catch (_) {}
    currentUser = null;
  }

  function docId() {
    return currentUser ? currentUser.$id : null;
  }

  async function load() {
    if (!enabled || !currentUser) return null;
    const id = docId();
    try {
      const doc = await api(
        `/v1/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents/${id}`,
        { method: 'GET' }
      );
      if (!doc || typeof doc.data !== 'string') return null;
      return JSON.parse(doc.data);
    } catch (e) {
      if (e.code === 404) return null;
      console.warn('[CloudSave] load failed:', e.message);
      return null;
    }
  }

  async function flushSave() {
    saveTimeout = null;
    if (!enabled || !currentUser || pendingData === null) return false;
    const id = docId();
    const payload = { data: JSON.stringify(pendingData) };
    try {
      await api(
        `/v1/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents/${id}`,
        {
          method: 'PATCH',
          body: { data: payload },
        }
      );
      pendingData = null;
      return true;
    } catch (e) {
      if (e.code === 404) {
        try {
          await api(
            `/v1/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`,
            {
              method: 'POST',
              body: { documentId: id, data: payload },
            }
          );
          pendingData = null;
          return true;
        } catch (e2) {
          console.warn('[CloudSave] create failed:', e2.message);
          return false;
        }
      }
      console.warn('[CloudSave] save failed:', e.message);
      return false;
    }
  }

  function queueSave(data, immediate = false) {
    pendingData = data;
    if (immediate) {
      if (saveTimeout) clearTimeout(saveTimeout);
      return flushSave();
    }
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(flushSave, 5000);
  }

  function clearQueue() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = null;
    pendingData = null;
  }

  window.CloudSave = {
    enabled,
    get loggedIn() { return !!currentUser; },
    get user() { return currentUser; },
    login,
    register,
    logout,
    getAccount,
    load,
    save: queueSave,
    flush: flushSave,
    clearQueue,
  };
})();
