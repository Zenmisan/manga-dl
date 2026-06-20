import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup

async def check_url(client, url):
    resp = await client.get(url, allow_redirects=True)
    print(f"URL: {url} -> Status: {resp.status_code}, Final: {resp.url}, Length: {len(resp.text)}")
    if resp.status_code == 200:
        soup = BeautifulSoup(resp.text, 'html.parser')
        # Check first 3 titles
        cards = soup.select("a[href*='/comics/']")
        seen = set()
        titles = []
        for card in cards:
            href = card.get('href')
            slug = href.split('/comics/')[-1].strip('/')
            if not slug or slug in seen or '/chapter/' in href:
                continue
            seen.add(slug)
            title_el = card.select_one('span.font-bold, h3, .text-sm.font-bold, p.font-bold')
            title = title_el.text.strip() if title_el else card.text.strip() or slug
            titles.append(title)
        print("  First 5 titles:", titles[:5])

async def test():
    async with AsyncSession(impersonate="chrome110") as client:
        # Check default browse, page 2 query param, page 2 route, page 2 param
        await check_url(client, "https://asurascans.com/browse")
        await check_url(client, "https://asurascans.com/browse?page=2")
        await check_url(client, "https://asurascans.com/browse/page/2")
        await check_url(client, "https://asurascans.com/browse?page=2&search=")

asyncio.run(test())
