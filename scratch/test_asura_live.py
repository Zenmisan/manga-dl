from curl_cffi import requests
import re

# Detail test
manga_url = "https://asurascans.com/comics/emperor-of-solo-play-f886a8af"
res = requests.get(manga_url, impersonate="chrome110")
print("Detail status:", res.status_code)

ch_links = set(re.findall(r'href=["\'](/comics/emperor-of-solo-play-f886a8af/chapter/[^"\'/]+)["\']', res.text))
print("Chapters found count:", len(ch_links))
sample_ch = list(ch_links)[0] if ch_links else None
print("Sample chapter:", sample_ch)

if sample_ch:
    ch_url = "https://asurascans.com" + sample_ch
    res_c = requests.get(ch_url, impersonate="chrome110")
    print("\nChapter page status:", res_c.status_code)
    imgs = set(re.findall(r'src=["\'](https?://[^"\']*(?:asura-images|pages|uploads|chapters)[^"\']*)["\']', res_c.text))
    print("Page images count:", len(imgs))
    for img in list(imgs)[:3]:
        print(" Image:", img)
