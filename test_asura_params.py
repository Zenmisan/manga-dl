import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup

async def get_titles(client, url):
    resp = await client.get(url, allow_redirects=True)
    if resp.status_code == 200:
        soup = BeautifulSoup(resp.text, 'html.parser')
        cards = soup.select("a[href*='/comics/']")
        seen = set()
        titles = []
        for card in cards:
            href = card.get('href')
            slug = href.split('/comics/')[-1].strip('/')
            if not slug or slug in seen or '/chapter/' in href:
                continue
            seen.add(slug)
            
            # Find the actual title: usually it is in an img alt attribute or title element
            img = card.select_one('img')
            title = (img.get('alt') if img else None) or card.text.strip() or slug
            titles.append(title.strip())
        print(f"URL: {url} -> {len(titles)} titles. First 5: {titles[:5]}")
    else:
        print(f"URL: {url} -> Status {resp.status_code}")

async def test():
    async with AsyncSession(impersonate="chrome110") as client:
        # Check potential popular/latest endpoints
        await get_titles(client, "https://asurascans.com/browse")
        # Let's try some typical parameters: order=trending, rating, update, popular, latest, views
        # Also sort_by=
        params = [
            "order=rating",
            "order=update",
            "order=popular",
            "order=latest",
            "sort=rating",
            "sort=update",
            "sort=views",
            "sort=trending",
            "order=trending"
        ]
        for p in params:
            await get_titles(client, f"https://asurascans.com/browse?{p}")

asyncio.run(test())
