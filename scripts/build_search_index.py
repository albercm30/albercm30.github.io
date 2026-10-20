#!/usr/bin/env python3
"""Rebuild data/search-index.json for the site search box.

Run from the repo root after adding or renaming pages, countries, projects or hikes:

    python scripts/build_search_index.py

Wildlife species are NOT in this file: the search reads them live from data/wildlife.json,
so they update automatically with the weekly iNaturalist job.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUFFIX = " · Alberto Castellano Macías"


def meta(path: Path):
    s = path.read_text(encoding="utf-8")
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    title = html.unescape(t.group(1)).replace(SUFFIX, "").strip() if t else path.parent.name
    desc = html.unescape(d.group(1)).strip() if d else ""
    return title, desc


def flat(v):
    if isinstance(v, list):
        return " ".join(flat(x) for x in v)
    if isinstance(v, dict):
        return " ".join(flat(x) for x in v.values())
    return str(v or "")


entries = []

pages = [("index.html", "/", "Home"), ("professional", "/professional/", "Professional"),
         ("travel", "/travel/", "Travel"), ("mountains", "/mountains/", "Mountains"),
         ("diving", "/diving/", "Diving"), ("wildlife", "/wildlife/", "Wildlife"),
         ("photography", "/photography/", "Photography")]
for folder, url, name in pages:
    p = ROOT / (folder if folder.endswith(".html") else f"{folder}/index.html")
    _, desc = meta(p)
    entries.append({"t": name, "s": "Page", "u": url, "g": "Page", "k": desc})

for p in sorted((ROOT / "projects").glob("*/index.html")):
    title, desc = meta(p)
    entries.append({"t": title, "s": "Project case study", "u": f"/projects/{p.parent.name}/", "g": "Project", "k": desc})

for c in json.loads((ROOT / "data" / "countries.json").read_text(encoding="utf-8")):
    kw = " ".join([flat(c.get("continent")), flat(c.get("year")), flat(c.get("focus")), flat(c.get("blurb")),
                   flat(c.get("highlights")), flat(c.get("route"))])
    entries.append({"t": c["name"], "s": f"Country · {c.get('continent', '')}", "u": f"/countries/{c['slug']}/", "g": "Country", "k": kw})

mfile = ROOT / "data" / "mountains.json"
if mfile.exists():
    for r in json.loads(mfile.read_text(encoding="utf-8")):
        entries.append({"t": r["name"], "s": f"Hike · {r['region']}", "u": "/mountains/", "g": "Hike",
                        "k": f"{r['region']} {r['km']} km {r['gain']} m hike summit mountain"})

out = ROOT / "data" / "search-index.json"
out.write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(entries)} entries to {out.relative_to(ROOT)}")
