var _WC = 'https://weebcentral.com';

async function _fetchDoc(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return new DOMParser().parseFromString(data.html, 'text/html');
}

function _parseCards(doc) {
  var results = [];
  var seen = {};
  doc.querySelectorAll('article a[href*="/series/"]').forEach(function(a) {
    var href = a.getAttribute('href') || '';
    var match = href.match(/\/series\/([A-Za-z0-9]+)/);
    if (!match) return;
    var id = match[1];
    if (seen[id]) return;
    seen[id] = true;

    var container = a.closest('article') || a;
    var img = container.querySelector('img[src*="/cover/"]') || container.querySelector('img') || a.querySelector('img');
    var cover = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null;

    var titleEl = container.querySelector('.text-base, h2, h3, div:not([class]):last-child, p') || a;
    var title = (titleEl ? titleEl.textContent.trim() : '') || a.textContent.trim() || id;
    title = title.replace(/\s+/g, ' ').replace(/^Official\s*/i, '').trim();

    results.push({
      id: id,
      title: title || id,
      cover_url: cover,
      provider: 'weebcentral',
      url: href.startsWith('http') ? href : (_WC + href),
      status: null,
    });
  });
  return results;
}

var extension = {
  async search(query, page) {
    var p = page || 1;
    var offset = (p - 1) * 32;
    var url = _WC + '/search/data?text=' + encodeURIComponent(query) +
      '&limit=32&offset=' + offset + '&display_mode=Full+Display';
    var doc = await _fetchDoc(url);
    return _parseCards(doc);
  },

  async getMangaDetail(mangaId) {
    var id = mangaId.split('/')[0];
    var doc = await _fetchDoc(_WC + '/series/' + id);
    var titleEl = doc.querySelector('h1');
    var title = titleEl ? titleEl.textContent.trim() : id;

    var coverEl = doc.querySelector('img[src*="/cover/"], source[srcset*="/cover/"], .aspect-w-3 img');
    var cover = coverEl ? (coverEl.getAttribute('src') || coverEl.getAttribute('srcset') || '').split(' ')[0] : null;

    var descEl = doc.querySelector('li:has(strong) p, .line-clamp-3, .description');
    var desc = descEl ? descEl.textContent.trim() : null;

    var genres = [];
    doc.querySelectorAll('a[href*="/search?tag="], a[href*="/search?type="]').forEach(function(a) {
      var g = a.textContent.trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    var authors = [];
    doc.querySelectorAll('li:has(strong) a[href*="/search?author="]').forEach(function(a) {
      var auth = a.textContent.trim();
      if (auth && !authors.includes(auth)) authors.push(auth);
    });

    // Fetch full chapter list
    var chapters = [];
    try {
      var chDoc = await _fetchDoc(_WC + '/series/' + id + '/full-chapter-list');
      chDoc.querySelectorAll('a[href*="/chapters/"]').forEach(function(a) {
        var href = a.getAttribute('href') || '';
        var chMatch = href.match(/\/chapters\/([A-Za-z0-9]+)/);
        if (!chMatch) return;
        var chId = chMatch[1];
        var text = a.querySelector('span.flex > span') || a;
        var chTitle = text ? text.textContent.trim() : ('Chapter ' + chId);
        var numMatch = chTitle.match(/([\d.]+)/);
        var num = numMatch ? parseFloat(numMatch[1]) : 0;
        var dateEl = a.querySelector('time[datetime]');
        var date = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;

        chapters.push({
          id: chId,
          title: chTitle,
          number: num,
          published_at: date,
        });
      });
    } catch(e) {}

    return {
      id: id,
      title: title,
      cover_url: cover,
      description: desc,
      status: null,
      genres: genres,
      authors: authors,
      provider: 'weebcentral',
      url: _WC + '/series/' + id,
      chapters: chapters,
    };
  },

  async getPages(chapterId) {
    var id = chapterId.replace(/^\/?chapters\//, '').split('/')[0];
    var url = _WC + '/chapters/' + id + '/images?is_prev=False&reading_style=long_strip';
    var doc = await _fetchDoc(url);
    var pages = [];
    doc.querySelectorAll('section[x-data] img, img[src*="planeptune.us"], img[src*="weebcentral.com"]').forEach(function(img) {
      var src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && src.startsWith('http') && !src.includes('brand') && !src.includes('logo')) {
        pages.push(src);
      }
    });
    return pages;
  },

  async getPopular(page) {
    var p = page || 1;
    var offset = (p - 1) * 32;
    var url = _WC + '/search/data?sort=Popularity&order=Descending&limit=32&offset=' + offset + '&display_mode=Full+Display';
    var doc = await _fetchDoc(url);
    return _parseCards(doc);
  },

  async getLatest(page) {
    var p = page || 1;
    var offset = (p - 1) * 32;
    var url = _WC + '/search/data?sort=Latest+Updates&order=Descending&limit=32&offset=' + offset + '&display_mode=Full+Display';
    var doc = await _fetchDoc(url);
    return _parseCards(doc);
  },
};
