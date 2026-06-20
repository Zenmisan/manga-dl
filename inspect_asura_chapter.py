from bs4 import BeautifulSoup
import re

with open("asura_chapter.html", "r") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("=== IMAGE TAGS ===")
imgs = soup.find_all("img")
print(f"Total img tags: {len(imgs)}")
for idx, img in enumerate(imgs):
    src = img.get("src")
    data_src = img.get("data-src")
    alt = img.get("alt")
    print(f"[{idx}] src={src} data-src={data_src} alt={alt}")

print("\n=== WEB CONTENT IMAGES ===")
# Look for tags that might contain the page images
# Often page images are in a specific container, let's look for large lists of images
potential_pages = [img.get("src") or img.get("data-src") for img in imgs if img.get("src") and "/asura-images/chapters/" in img.get("src")]
if not potential_pages:
    potential_pages = [img.get("src") or img.get("data-src") for img in imgs if img.get("src") and "chapter" in img.get("src")]
print(f"Potential chapter page images found: {len(potential_pages)}")
for p in potential_pages[:5]:
    print("  ", p)

print("\n=== SCRIPT BLOCKS ===")
scripts = soup.find_all("script")
print(f"Total script tags: {len(scripts)}")
for idx, s in enumerate(scripts):
    src = s.get("src")
    text = s.text.strip()
    print(f"[{idx}] src={src} length={len(text)}")
    # If the script contains JSON or arrays, show a snippet
    if text:
        if "[" in text or "{" in text:
            print("  Snippet:", text[:150].replace("\n", " "))
