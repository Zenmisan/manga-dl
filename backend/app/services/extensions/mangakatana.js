var _MK = 'https://mangakatana.com';

async function _fetchDoc(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return new DOMParser().parseFromString(data.html, 'text/html');
}

async function _fetchHtml(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return data.html;
}

var extension = {
  async search(query, page) {
    var pageStr = (page || 1) > 1 ? ('/page/' + page) : '';
    var doc = await _fetchDoc(_MK + pageStr + '?search=' + encodeURIComponent(query) + '&search_by=m_name');
    var results = [];
    var seen = {};
    doc.querySelectorAll('#book_list .item, .manga_list-sbs .item, .item').forEach(function(item) {
      var a = item.querySelector('h3.title a, .text h3 a, .title a, a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href.includes('/manga/')) return;
      var slug = href.replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('.media .wrap_img img, img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: href,
        status: null,
      });
    });
    return results;
  },

  async getMangaDetail(mangaId) {
    var doc = await _fetchDoc(_MK + '/manga/' + mangaId);
    var title = (doc.querySelector('h1.heading') || {textContent:mangaId}).textContent.trim();
    var coverEl = doc.querySelector('.cover img');
    var cover = coverEl ? (coverEl.getAttribute('src') || coverEl.getAttribute('data-src') || coverEl.getAttribute('data-lazy-src')) : null;
    var desc = null;
    var descEl = doc.querySelector('.summary p') || doc.querySelector('.summary');
    if (descEl) desc = descEl.textContent.trim();
    var genres = [];
    doc.querySelectorAll('.genres a').forEach(function(a) { genres.push(a.textContent.trim()); });
    var authors = [];
    doc.querySelectorAll('.author a').forEach(function(a) { authors.push(a.textContent.trim()); });

    var chapters = [];
    doc.querySelectorAll('.chapters tr').forEach(function(row) {
      var a = row.querySelector('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop();
      var numMatch = slug.match(/([\d.]+)/);
      var num = numMatch ? parseFloat(numMatch[1]) : 0;
      var dateEl = row.querySelector('.update_time, time, td:last-child');
      chapters.push({
        id: mangaId + '/' + slug,
        title: a.textContent.trim() || ('Chapter ' + num),
        number: num,
        published_at: dateEl ? dateEl.textContent.trim() : null,
      });
    });

    return {
      id: mangaId, title: title,
      cover_url: cover, description: desc,
      status: null, genres: genres, authors: authors,
      provider: 'mangakatana',
      url: _MK + '/manga/' + mangaId,
      chapters: chapters,
    };
  },

  async getPages(chapterId) {
    var html = await _fetchHtml(_MK + '/manga/' + chapterId);
    var best = [];
    var re = /var\s+\w+\s*=\s*(\['[^']*'(?:,'[^']*')*,?\])\s*;/g;
    var m;
    while ((m = re.exec(html)) !== null) {
      try {
        var str = m[1].replace(/'/g, '"').replace(/,\s*\]/, ']');
        if (!str.endsWith(']')) str += ']';
        var arr = JSON.parse(str);
        if (Array.isArray(arr) && arr.length > best.length && typeof arr[0] === 'string' && arr[0].startsWith('http')) {
          best = arr;
        }
      } catch(e) {}
    }
    if (best.length) return best;

    var doc = new DOMParser().parseFromString(html, 'text/html');
    var pages = [];
    doc.querySelectorAll('.wrap_warpper img[data-src], #img_list img').forEach(function(img) {
      var src = img.getAttribute('data-src') || img.getAttribute('src');
      if (src) pages.push(src);
    });
    return pages;
  },

  async getPopular(page) {
    var doc = await _fetchDoc(_MK + '/manga/page/' + (page || 1));
    var results = [];
    var seen = {};
    doc.querySelectorAll('#book_list .item, .manga_list-sbs .item, .item').forEach(function(item) {
      var a = item.querySelector('h3.title a, .text h3 a, .title a, a');
      if (!a || !a.getAttribute('href').includes('/manga/')) return;
      var slug = a.getAttribute('href').replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('.media .wrap_img img, img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: a.getAttribute('href'),
        status: null,
      });
    });
    return results;
  },

  async getLatest(page) {
    var doc = await _fetchDoc(_MK + '/manga/page/' + (page || 1) + '?filter=latest');
    var results = [];
    var seen = {};
    doc.querySelectorAll('#book_list .item, .manga_list-sbs .item, .item').forEach(function(item) {
      var a = item.querySelector('h3.title a, .text h3 a, .title a, a');
      if (!a || !a.getAttribute('href').includes('/manga/')) return;
      var slug = a.getAttribute('href').replace(/\/$/, '').split('/').pop();
      if (!slug || seen[slug]) return;
      seen[slug] = true;
      var img = item.querySelector('.media .wrap_img img, img');
      results.push({
        id: slug,
        title: a.textContent.trim(),
        cover_url: img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null,
        provider: 'mangakatana',
        url: a.getAttribute('href'),
        status: null,
      });
    });
    return results;
  },
};
