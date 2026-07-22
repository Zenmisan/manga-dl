var _AS = 'https://asurascans.com';

async function _fetchDoc(url) {
  var data = await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(url));
  return new DOMParser().parseFromString(data.html, 'text/html');
}

function _asParseCards(doc) {
  var results = [];
  var seen = {};
  doc.querySelectorAll(".series-card").forEach(function(card) {
    var a = card.querySelector("a[href*='/comics/']");
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var slug = href.split('/comics/').pop().replace(/\/$/, '');
    if (!slug || seen[slug]) return;
    seen[slug] = true;
    var img = card.querySelector('img');
    var titleEl = card.querySelector('h3');
    var statusSpan = card.querySelector("span[class*='bg-[#913FE2]/20']");
    results.push({
      id: slug,
      title: (titleEl && titleEl.textContent.trim()) || slug,
      cover_url: img ? img.getAttribute('src') : null,
      provider: 'asurascans',
      url: _AS + '/comics/' + slug,
      status: statusSpan ? statusSpan.textContent.trim() : null,
    });
  });
  return results;
}

function _asParseChapters(doc, mangaId) {
  var chapters = [];
  var seen = {};
  doc.querySelectorAll("a[href*='/chapter/']").forEach(function(a) {
    if (!a.classList.contains('group')) return;
    var href = a.getAttribute('href') || '';
    var chSlug = href.split('/chapter/').pop().replace(/\/$/, '');
    var fullId = mangaId + '/chapter/' + chSlug;
    if (seen[fullId]) return;
    seen[fullId] = true;
    
    var numMatch = chSlug.match(/([\d.]+)/);
    var num = numMatch ? parseFloat(numMatch[1]) : 0;
    
    var leftDiv = a.querySelector('.min-w-0.flex-1');
    var leftSpans = leftDiv ? leftDiv.querySelectorAll('span') : [];
    var titleParts = [];
    if (leftSpans && leftSpans.length > 0) {
      for (var i = 0; i < leftSpans.length; i++) {
        var t = leftSpans[i].textContent.trim();
        if (t) titleParts.push(t);
      }
    }
    var chTitle = titleParts.join(' - ');
    if (!chTitle) {
      var span = a.querySelector('span, p');
      chTitle = (span && span.textContent.trim()) || ('Chapter ' + num);
    }
    
    var dateEl = a.querySelector('.flex-shrink-0 span') || a.querySelector('.text-right span');
    
    chapters.push({
      id: fullId,
      title: chTitle,
      number: num,
      published_at: dateEl ? dateEl.textContent.trim() : null,
    });
  });
  chapters.sort(function(a, b) { return b.number - a.number; });
  return chapters;
}

var extension = {
  async search(query, page) {
    var doc = await _fetchDoc(_AS + '/browse?page=' + (page || 1) + '&search=' + encodeURIComponent(query));
    return _asParseCards(doc);
  },

  async getMangaDetail(mangaId) {
    var doc = await _fetchDoc(_AS + '/comics/' + mangaId);
    var titleEl = doc.querySelector('h1');
    var title = titleEl ? titleEl.textContent.trim() : mangaId;
    
    var img = doc.querySelector('#mobile-cover-img') || doc.querySelector("img[src*='/asura-images/covers/']");
    var cover = img ? img.getAttribute('src') : null;
    
    var descEl = doc.querySelector('div.prose');
    var desc = descEl ? descEl.textContent.trim() : null;
    
    var genres = [];
    doc.querySelectorAll("a[href*='genres=']").forEach(function(a) {
      var g = a.textContent.trim();
      if (g) genres.push(g);
    });

    var status = null;
    var authors = [];
    doc.querySelectorAll(".bg-\\[\\#1C1924\\]").forEach(function(div) {
      var labelEl = div.querySelector("div");
      if (!labelEl) return;
      var label = labelEl.textContent.trim().toLowerCase();
      var val = div.textContent.replace(labelEl.textContent, "").trim();
      if (label === "status") {
        status = val;
      } else if (label === "author" || label === "artist") {
        if (val && val !== "-") {
          if (!authors.includes(val)) {
            authors.push(val);
          }
        }
      }
    });

    return {
      id: mangaId,
      title: title,
      cover_url: cover,
      description: desc,
      status: status,
      genres: genres,
      authors: authors,
      provider: 'asurascans',
      url: _AS + '/comics/' + mangaId,
      chapters: _asParseChapters(doc, mangaId),
    };
  },

  async getPages(chapterId) {
    var html = (await apiFetch('/manga/proxy/html?url=' + encodeURIComponent(_AS + '/comics/' + chapterId))).html;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var pages = [];
    doc.querySelectorAll("img[src*='/asura-images/chapters/']").forEach(function(img) {
      var src = img.getAttribute('src');
      if (src) pages.push(src);
    });
    if (pages.length > 0) return pages;

    var seen = {};
    var imgUrls = [];
    var scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    var urlRe = /https?:\/\/[^\s"'\\,\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'\\,\]]*)?/gi;
    for (var i = 0; i < scriptBlocks.length; i++) {
      var u;
      urlRe.lastIndex = 0;
      while ((u = urlRe.exec(scriptBlocks[i])) !== null) {
        var uu = u[0];
        if (!seen[uu] && !uu.includes('logo') && !uu.includes('icon') && !uu.includes('avatar') && !uu.includes('favicon')) {
          seen[uu] = true;
          imgUrls.push(uu);
        }
      }
    }
    if (imgUrls.length > 0) return imgUrls;

    return [];
  },

  async getPopular(page) {
    var doc = await _fetchDoc(_AS + '/browse?page=' + (page || 1) + '&sort=rating');
    return _asParseCards(doc);
  },

  async getLatest(page) {
    var doc = await _fetchDoc(_AS + '/browse?page=' + (page || 1) + '&sort=update');
    return _asParseCards(doc);
  },
};
