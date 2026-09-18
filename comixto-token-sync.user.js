// ==UserScript==
// @name         Comixto Token Sync
// @namespace    manga-dl
// @version      1.0
// @description  Captures comixto API token and syncs to local manga-dl backend
// @match        https://comix.to/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  const BACKEND = 'http://localhost:8000/api/sources/comixto/token';
  let lastToken = null;
  let lastSync = 0;
  const SYNC_COOLDOWN = 30000; // only resync every 30 seconds

  function syncToken(token) {
    if (token === lastToken && Date.now() - lastSync < SYNC_COOLDOWN) return;
    lastToken = token;
    lastSync = Date.now();
    GM_xmlhttpRequest({
      method: 'POST',
      url: BACKEND,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ token }),
      onload: (r) => console.log('[comixto-sync] token synced, len=' + token.length, r.status),
      onerror: (e) => console.warn('[comixto-sync] backend unreachable:', e),
    });
  }

  // Hook XMLHttpRequest to capture tokens from API calls
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/api/v1/') && url.includes('_=')) {
      const m = url.match(/[?&]_=([^&]+)/);
      if (m) syncToken(decodeURIComponent(m[1]));
    }
    return origOpen.call(this, method, url, ...rest);
  };

  // Hook fetch too
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && url.includes('/api/v1/') && url.includes('_=')) {
      const m = url.match(/[?&]_=([^&]+)/);
      if (m) syncToken(decodeURIComponent(m[1]));
    }
    return origFetch.apply(this, arguments);
  };

  // Also intercept axios requests via the cfg approach:
  // Wait for axios to be initialized and hook its request interceptors output
  // by patching XMLHttpRequestAdapter (axios uses XHR under the hood)
  // Our XHR hook above covers that case already.

  console.log('[comixto-sync] Token sync userscript active');
})();
