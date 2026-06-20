from bs4 import BeautifulSoup

with open("asura_search_results.html", "r") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

results = []
seen = {}
# Find all a tags containing '/comics/'
for card in soup.select("a[href*='/comics/']"):
    href = card.get('href') or ''
    # Extract slug
    slug = href.split('/comics/')[-1].strip('/')
    if not slug or slug in seen or '/chapter/' in href:
        continue
    seen[slug] = True
    
    img = card.select_one('img')
    # Let's find title
    title_el = card.select_one('span.font-bold, h3, .text-sm.font-bold, p.font-bold')
    title = ""
    if title_el:
        title = title_el.text.strip()
    elif img and img.get('alt'):
        title = img.get('alt').strip()
    else:
        title = card.text.strip()
        
    cover_url = img.get('src') or img.get('data-src') if img else None
    
    results.append({
        'id': slug,
        'title': title,
        'cover_url': cover_url
    })

print(f"Parsed {len(results)} search results:")
for r in results[:10]:
    print(r)
