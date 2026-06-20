from bs4 import BeautifulSoup

with open("asura_search_results.html", "r") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("=== SELECTS ===")
for s in soup.find_all("select"):
    print(f"Select name={s.get('name')} id={s.get('id')}")
    for opt in s.find_all("option"):
        print(f"  Option value={opt.get('value')} text={opt.text.strip()}")

print("\n=== LINKS WITH BROWSE OR SEARCH ===")
links = soup.find_all("a")
for a in links:
    href = a.get("href") or ""
    if "browse" in href or "search=" in href:
        print(f"Link: href={href} text={a.text.strip()}")
