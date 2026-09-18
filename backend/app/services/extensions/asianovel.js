// Based on QuickNovel AsianNovelProvider (WordPress/Fictioneer theme)
var _ASN = 'https://www.asianovel.net';

function _asnSanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function _asnParseCards(doc) {
  var results = [];
  doc.querySelectorAll('div.c-tabs-item > div.row.c-tabs-item__content').forEach(function(h) {
    var a = h.querySelector('h3.h4 > a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var title = a.textContent.trim();
    var img = h.querySelector('div.c-image-hover > a > img');
    var cover = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : null;
    var slug = href.replace(_ASN, '').replace(/^\/manga\//, '').replace(/^\//, '').replace(/\/$/, '');
    if (!slug) return;
    results.push({ id: href.replace(_ASN, '').replace(/^\//, '').replace(/\/$/, ''), title: title, cover_url: cover, provider: 'asianovel', url: href, status: null });
  });
  return results;
}

var extension = {
  async search(query, page) {
    var url = _ASN + '/?post_type=wp-manga&s=' + encodeURIComponent(query.trim()).replace('%20', '+');
    var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
    var doc = new DOMParser().parseFromString(data.html, 'text/html');
    return _asnParseCards(doc);
  },

  async getMangaDetail(novelId) {
    var url = novelId.startsWith('http') ? novelId : _ASN + '/' + novelId;
    var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
    var doc = new DOMParser().parseFromString(data.html, 'text/html');

    var titleEl = doc.querySelector('div.post-title > h1');
    var title = titleEl ? titleEl.textContent.trim() : novelId;

    var img = doc.querySelector('div.summary_image > a > img.img-responsive');
    var cover = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : null;

    var descEl = doc.querySelector('div.summary__content');
    var desc = descEl ? descEl.textContent.trim() : null;

    var authors = [];
    var authorEl = doc.querySelector('div.author-content > a');
    if (authorEl) authors = [authorEl.textContent.trim()];

    var genres = [];
    var tagsEl = doc.querySelector('div.tags-content');
    if (tagsEl) genres = tagsEl.textContent.trim().split(',').map(function(g) { return g.trim(); }).filter(Boolean);

    var status = null;
    var statusEl = doc.querySelector('div.summary-content');
    if (statusEl) status = statusEl.textContent.trim();

    var chapters = [];
    var chList = doc.querySelectorAll('ul.main.version-chap > li.wp-manga-chapter.free-chap > a');
    Array.from(chList).reverse().forEach(function(a) {
      var href = a.getAttribute('href') || '';
      var chSlug = href.replace(_ASN, '').replace(/^\//, '').replace(/\/$/, '');
      var chTitle = a.textContent.trim();
      var numMatch = chTitle.match(/chapter\s+([\d.]+)/i) || chSlug.match(/chapter-([\d]+)/i);
      var num = numMatch ? parseFloat(numMatch[1]) : (chapters.length + 1);
      chapters.push({ id: chSlug, title: chTitle, number: num, published_at: null });
    });

    return { id: novelId, title: title, cover_url: cover, description: desc, status: status, genres: genres, authors: authors, provider: 'asianovel', url: url, chapters: chapters };
  },

  async getChapterText(chapterId) {
    var url = chapterId.startsWith('http') ? chapterId : _ASN + '/' + chapterId;
    var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
    var doc = new DOMParser().parseFromString(data.html, 'text/html');
    var contentEl = doc.querySelector('section#chapter-content, div.text-left, div.reading-content');
    if (contentEl) {
      contentEl.querySelectorAll('script, style, .ads, .chapter-warning').forEach(function(el) { el.remove(); });
    }
    var content = contentEl ? contentEl.innerHTML : '<p>Chapter content not found.</p>';
    return { content: _asnSanitize(content), format: 'html' };
  },

  async getPopular(page) {
    var url = _ASN + '/?s&post_type=wp-manga&m_orderby=views&page=' + (page || 1);
    var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
    var doc = new DOMParser().parseFromString(data.html, 'text/html');
    return _asnParseCards(doc);
  },

  async getLatest(page) {
    var url = _ASN + '/?s&post_type=wp-manga&m_orderby=latest&page=' + (page || 1);
    var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
    var doc = new DOMParser().parseFromString(data.html, 'text/html');
    return _asnParseCards(doc);
  },
};
