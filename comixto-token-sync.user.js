// ==UserScript==
// @name         Comixto Token Sync
// @namespace    manga-dl
// @version      1.4
// @description  Captures comixto API responses (post-decrypt) and syncs to local manga-dl backend
// @match        https://comix.to/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  const BACKEND_TOKEN = 'http://localhost:8000/api/sources/comixto/token';
  const BACKEND_CACHE = 'http://localhost:8000/api/sources/comixto/cache';

  // Queue of {cleanUrl} waiting for JSON.parse to fire with decrypted data
  const _pendingDecrypt = [];

  // ── JSON.parse hook on the PAGE's JSON (not the sandbox copy) ───────────
  // With @grant GM_xmlhttpRequest, Tampermonkey runs in a sandbox.
  // Replacing JSON.parse in this scope has NO effect on the page's scripts.
  // unsafeWindow gives access to the actual page global so the hook fires
  // when comixto's secure bundle calls JSON.parse on the decrypted string.
  const origJSONparse = unsafeWindow.JSON.parse.bind(unsafeWindow.JSON);

  unsafeWindow.JSON.parse = function (text, reviver) {
    const result = origJSONparse(text, reviver);
    // Fire when we have a pending decrypt AND result looks like chapters/pages data
    if (_pendingDecrypt.length > 0 && result && typeof result === 'object' && !Array.isArray(result) && !result.e) {
      if (_isComixtoChapterData(result)) {
        const pending = _pendingDecrypt.shift();
        if (pending) _submitToCache(pending.cleanUrl, result);
      }
    }
    return result;
  };

  function _isComixtoChapterData(obj) {
    if (!obj || obj.e) return false;
    // Chapter list: {items: [{chap, id, hid, ...}]}
    if (Array.isArray(obj.items) && obj.items.length > 0) {
      const f = obj.items[0];
      if (f && (f.chap !== undefined || f.hid !== undefined)) return true;
    }
    // Chapter pages: {chapter: {...}, pages: {items: [{url, ...}]}}
    if (obj.pages !== undefined && (obj.chapter !== undefined || Array.isArray(obj.pages?.items))) return true;
    return false;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  let _lastToken = null, _lastTokenSync = 0;
  const SYNC_COOLDOWN = 30000;

  function _syncToken(token) {
    if (token === _lastToken && Date.now() - _lastTokenSync < SYNC_COOLDOWN) return;
    _lastToken = token; _lastTokenSync = Date.now();
    GM_xmlhttpRequest({
      method: 'POST', url: BACKEND_TOKEN,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ token }),
      onload: (r) => console.log('[comixto-sync] token synced, len=' + token.length, r.status),
      onerror: (e) => console.warn('[comixto-sync] backend unreachable:', e),
    });
  }

  function _cleanUrl(rawUrl) {
    return rawUrl
      .replace(/([?&])_=[^&]*/g, '$1')
      .replace(/[?&]$/, '')
      .replace(/\?&/, '?');
  }

  function _submitToCache(cleanUrl, data) {
    GM_xmlhttpRequest({
      method: 'POST', url: BACKEND_CACHE,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ url: cleanUrl, data }),
      onload: (r) => console.log('[comixto-sync] cached', cleanUrl.split('?')[0], r.status),
      onerror: (e) => console.warn('[comixto-sync] cache error:', e),
    });
  }

  function _isChapterUrl(url) {
    return (url.includes('/api/v1/chapters/') || (url.includes('/api/v1/manga/') && url.includes('/chapters')))
      && !url.includes('/user/');
  }

  // ── XHR hook ─────────────────────────────────────────────────────────────
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/api/v1/')) {
      this._comixtoUrl = url;
      if (url.includes('_=')) {
        const m = url.match(/[?&]_=([^&]+)/);
        if (m) _syncToken(decodeURIComponent(m[1]));
      }
    }
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._comixtoUrl) {
      const xhrUrl = this._comixtoUrl;
      this.addEventListener('load', function () {
        if (this.status === 200 && this.responseText && _isChapterUrl(xhrUrl)) {
          try {
            const raw = origJSONparse(this.responseText);
            if (raw && typeof raw.e === 'string') {
              // Encrypted — queue URL for JSON.parse hook to pick up decrypted data
              _pendingDecrypt.push({ cleanUrl: _cleanUrl(xhrUrl) });
            } else if (raw && !raw.e && _isComixtoChapterData(raw)) {
              // Unencrypted response (fallback for future changes)
              _submitToCache(_cleanUrl(xhrUrl), raw);
            }
          } catch (e) {}
        }
      });
    }
    return origSend.apply(this, args);
  };

  // ── Fetch hook (for any fetch-based API calls) ───────────────────────────
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && url.includes('/api/v1/')) {
      if (url.includes('_=')) {
        const m = url.match(/[?&]_=([^&]+)/);
        if (m) _syncToken(decodeURIComponent(m[1]));
      }
      if (_isChapterUrl(url)) {
        const cleanUrl = _cleanUrl(url);
        const promise = origFetch.apply(this, arguments);
        promise.then(resp => {
          if (resp.ok) {
            resp.clone().json().then(raw => {
              if (raw && typeof raw.e === 'string') {
                _pendingDecrypt.push({ cleanUrl });
              } else if (raw && _isComixtoChapterData(raw)) {
                _submitToCache(cleanUrl, raw);
              }
            }).catch(() => {});
          }
        }).catch(() => {});
        return promise;
      }
    }
    return origFetch.apply(this, arguments);
  };

  console.log('[comixto-sync] v1.4 — unsafeWindow.JSON.parse decrypt hook active');
})();
