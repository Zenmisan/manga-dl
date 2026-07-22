import os
import json
import re
import logging
from pathlib import Path
from curl_cffi import requests

log = logging.getLogger(__name__)
KEIYOUSHI_INDEX = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json"

EXTENSIONS_DIR = Path(__file__).parent / "extensions"


def load_extension_script(filename: str) -> str:
    """Read JavaScript template file from extensions directory."""
    path = EXTENSIONS_DIR / filename
    try:
        return path.read_text(encoding="utf-8")
    except Exception as e:
        log.error("Failed to load JS extension script %s: %s", filename, e)
        return ""


# Built-in extensions registry
BUILT_IN_EXTENSIONS: dict[str, dict] = {
    "mangadex": {
        "script": "mangadex.js",
        "name": "MangaDex",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://mangadex.org/favicon.ico",
        "nsfw": False,
        "skip_proxy": True,
    },
    "omegascans": {
        "script": "omegascans.js",
        "name": "Omega Scans",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://omegascans.org/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
    "asurascans": {
        "script": "asurascans.js",
        "name": "Asura Scans",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://asurascans.com/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
    "mangakatana": {
        "script": "mangakatana.js",
        "name": "MangaKatana",
        "lang": "en",
        "version": "1.0.0",
        "icon": "https://mangakatana.com/favicon.ico",
        "nsfw": False,
        "skip_proxy": False,
    },
}


def get_extension_code_by_pkg(pkg_id: str) -> dict | None:
    """Return extension code dict or dynamically build theme JS for community sources."""
    if pkg_id in BUILT_IN_EXTENSIONS:
        meta = BUILT_IN_EXTENSIONS[pkg_id]
        code = load_extension_script(meta["script"])
        return {
            "code": code,
            "skip_proxy": meta["skip_proxy"],
        }

    home_url = None
    index_json_path = "/home/zenmi/Projects/extensions/index.json"
    if os.path.exists(index_json_path):
        try:
            with open(index_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for ext in data.get("extensions", []):
                    if ext.get("packageName") == pkg_id:
                        sources = ext.get("sources", [])
                        if sources:
                            home_url = sources[0].get("homeUrl")
                            break
        except Exception as e:
            log.warning("Failed to parse local extensions index.json: %s", e)

    theme = None
    parts = pkg_id.split(".")
    if len(parts) >= 6:
        lang = parts[4]
        name = parts[5]
        src_dir = f"/home/zenmi/Projects/extensions-source/src/{lang}/{name}"
        if not os.path.exists(src_dir):
            src_dir = f"/home/zenmi/Projects/extensions-source/src/all/{name}"

        if os.path.exists(src_dir):
            for root, dirs, files in os.walk(src_dir):
                for f in files:
                    if f.endswith(".kt"):
                        path = os.path.join(root, f)
                        try:
                            with open(path, "r", encoding="utf-8") as file:
                                content = file.read()
                                if re.search(r":\s*Madara\b", content):
                                    theme = "Madara"
                                    break
                                elif re.search(r":\s*MangaThemesia\b", content):
                                    theme = "MangaThemesia"
                                    break
                        except Exception:
                            pass
                if theme:
                    break

    if home_url and theme:
        base_url = home_url.rstrip("/")
        if theme == "Madara":
            template = load_extension_script("madara.template.js")
            code = template.replace("{BASE_URL}", base_url)
            log.info("Dynamically generated Madara code for package: %s, URL: %s", pkg_id, base_url)
            return {"code": code, "skip_proxy": False}
        elif theme == "MangaThemesia":
            template = load_extension_script("mangathemesia.template.js")
            code = template.replace("{BASE_URL}", base_url)
            log.info("Dynamically generated MangaThemesia code for package: %s, URL: %s", pkg_id, base_url)
            return {"code": code, "skip_proxy": False}

    # Community extension fallback — attempt Keiyoushi online
    try:
        ext_url = f"https://raw.githubusercontent.com/keiyoushi/extensions/repo/sources/{pkg_id}/index.js"
        response = requests.get(ext_url, impersonate="chrome110", timeout=10)
        if response.status_code == 200:
            return {"code": response.text, "skip_proxy": False}
        return None
    except Exception as e:
        log.error("Failed to fetch extension code for %s: %s", pkg_id, e)
        return None
