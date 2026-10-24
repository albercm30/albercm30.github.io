#!/usr/bin/env python3
"""News Tracker, code version: builds data/news.json (the daily digest shown at /projects/news-tracker/).

    python scripts/news_digest.py            # fetch, rank, summarise, write data/news.json
    python scripts/news_digest.py --dry-run  # same, but print the result instead of writing it

Pipeline:  RSS/Atom feeds  ->  recent items  ->  de-duplicate  ->  score  ->  pick 10  ->  summarise  ->  JSON.
 * Score = source weight x freshness (half-life 12 h) x (1 + interest keywords) / clickbait penalty.
 * Pick  = best item of each category first, then the best remaining ones, never more than 3 per category.
 * Summaries are written by the Claude API when ANTHROPIC_API_KEY is set (own words, in Spanish, plus a "why it
   matters to you" line). Without a key the feed's own snippet is used and the digest has no "why" line.
Feeds, weights and interest keywords live in scripts/news_sources.json. Only needs `requests`."""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "news.json"
CONF = json.loads((Path(__file__).parent / "news_sources.json").read_text(encoding="utf-8"))
PER_DAY, PER_CATEGORY, KEEP_DAYS, MAX_AGE_H, HALF_LIFE_H = 10, 3, 7, 36, 12.0
UA = {"User-Agent": "albercm30-news-tracker/1.0 (+https://albercm30.github.io/projects/news-tracker/)"}
NS = {"atom": "http://www.w3.org/2005/Atom", "media": "http://search.yahoo.com/mrss/", "dc": "http://purl.org/dc/elements/1.1/"}


def clean(text: str, limit: int = 400) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit].rsplit(" ", 1)[0] + "…"


def parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        d = parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def parse_feed(xml_text: str, feed: dict) -> list[dict]:
    """RSS 2.0 and Atom. Returns [{title, url, published, snippet, source, category, weight}]."""
    out = []
    root = ET.fromstring(xml_text)
    for it in root.iter("item"):
        link = (it.findtext("link") or "").strip()
        out.append({"title": clean(it.findtext("title") or "", 220), "url": link,
                    "published": parse_date(it.findtext("pubDate") or it.findtext("dc:date", namespaces=NS)),
                    "snippet": clean(it.findtext("description") or "")})
    for it in root.findall("atom:entry", NS):
        link_el = it.find("atom:link[@rel='alternate']", NS)
        if link_el is None:
            link_el = it.find("atom:link", NS)
        out.append({"title": clean(it.findtext("atom:title", namespaces=NS) or "", 220), "url": (link_el.get("href") if link_el is not None else "").strip(),
                    "published": parse_date(it.findtext("atom:published", namespaces=NS) or it.findtext("atom:updated", namespaces=NS)),
                    "snippet": clean(it.findtext("atom:summary", namespaces=NS) or it.findtext("atom:content", namespaces=NS) or "")})
    for o in out:
        o.update(source=feed["name"], category=feed["category"], weight=feed.get("weight", 1.0))
    return [o for o in out if o["title"] and o["url"].startswith("http")]


def fetch_all(feeds: list[dict]) -> list[dict]:
    items = []
    for f in feeds:
        try:
            r = requests.get(f["url"], headers=UA, timeout=20)
            r.raise_for_status()
            items += parse_feed(r.text, f)
        except Exception as e:  # one broken feed must never stop the digest
            print(f"  skipped {f['name']}: {e}", file=sys.stderr)
    return items


def tokens(title: str) -> set[str]:
    return {w for w in re.findall(r"[a-záéíóúñü0-9]{4,}", title.lower())}


def dedupe(items: list[dict]) -> list[dict]:
    """Same URL, or very similar titles (Jaccard >= 0.6): keep the one whose source weighs more."""
    kept: list[dict] = []
    for it in sorted(items, key=lambda x: -x["weight"]):
        t = tokens(it["title"])
        if any(it["url"].split("?")[0] == k["url"].split("?")[0] or (t and tokens(k["title"]) and len(t & tokens(k["title"])) / len(t | tokens(k["title"])) >= 0.6) for k in kept):
            continue
        kept.append(it)
    return kept


def score(it: dict, now: datetime) -> float:
    age_h = max(0.0, (now - it["published"]).total_seconds() / 3600)
    fresh = 0.5 ** (age_h / HALF_LIFE_H)
    text = f"{it['title']} {it['snippet']}".lower()
    interest = sum(w for k, w in CONF["profile_keywords"].items() if k in text)
    penalty = 3.0 if any(c in text for c in CONF["clickbait"]) else 1.0
    return it["weight"] * fresh * (1 + math.log1p(interest)) / penalty


def pick(items: list[dict], now: datetime, n: int = PER_DAY, per_cat: int = PER_CATEGORY) -> list[dict]:
    pool = [i for i in items if i["published"] and timedelta(0) <= now - i["published"] <= timedelta(hours=MAX_AGE_H)]
    for i in pool:
        i["score"] = score(i, now)
    pool = sorted(dedupe(pool), key=lambda i: -i["score"])
    chosen: list[dict] = []
    for cat in dict.fromkeys(i["category"] for i in pool):  # round 1: the best of every category
        chosen.append(next(i for i in pool if i["category"] == cat))
    for i in pool:  # round 2: fill with the best remaining, respecting the per-category cap
        if len(chosen) >= n:
            break
        if i not in chosen and sum(c["category"] == i["category"] for c in chosen) < per_cat:
            chosen.append(i)
    chosen = sorted(chosen, key=lambda i: -i["score"])[:n]
    return chosen


SYSTEM = ("Eres el curador de noticias de Alberto, ingeniero de datos e IA en Gran Canaria interesado en conservación, "
          "fauna, tecnología y Canarias. Responde SOLO con JSON: {\"summary\": 2 frases en español con tus propias palabras, "
          "sin copiar frases del texto; \"why\": una frase corta de por qué le interesa a Alberto}. Usa solo la información dada; "
          "si el extracto es insuficiente, dilo en el resumen. En política, sin opinar.")


def summarise(it: dict) -> dict:
    key = os.environ.get("ANTHROPIC_API_KEY")
    fallback = {"summary": it["snippet"], "why": ""}
    if not key:
        return fallback
    try:
        r = requests.post("https://api.anthropic.com/v1/messages", timeout=60,
                          headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                          json={"model": os.environ.get("NEWS_MODEL", "claude-sonnet-5-5"), "max_tokens": 400, "system": SYSTEM,
                                "messages": [{"role": "user", "content": f"Medio: {it['source']}\nTitular: {it['title']}\nExtracto: {it['snippet']}"}]})
        r.raise_for_status()
        txt = r.json()["content"][0]["text"]
        out = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
        return {"summary": str(out.get("summary", "")).strip() or it["snippet"], "why": str(out.get("why", "")).strip()}
    except Exception as e:
        print(f"  no AI summary for '{it['title'][:50]}': {e}", file=sys.stderr)
        return fallback


def merge(existing: dict, today_items: list[dict], today: str) -> dict:
    days = [d for d in existing.get("days", []) if d["date"] != today]
    # earlier days keep only headline, link, source and category
    days = [{"date": d["date"], "items": [{k: i[k] for k in ("cat", "source", "title", "url") if k in i} for i in d["items"]]} for d in days]
    days.insert(0, {"date": today, "items": today_items})
    cutoff = (datetime.fromisoformat(today) - timedelta(days=KEEP_DAYS)).date().isoformat()
    return {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "note": existing.get("note", ""),
            "days": [d for d in days if d["date"] > cutoff]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    now = datetime.now(timezone.utc)
    items = fetch_all(CONF["feeds"])
    print(f"{len(items)} items from {len(CONF['feeds'])} feeds")
    chosen = pick(items, now)
    if not chosen:
        print("Nothing recent enough; keeping the current digest.")
        return 0
    today_items = []
    for i in chosen:
        s = summarise(i)
        today_items.append({"cat": i["category"], "source": i["source"], "title": i["title"], "url": i["url"], "summary": s["summary"], **({"why": s["why"]} if s["why"] else {})})
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    result = merge(existing, today_items, now.astimezone().date().isoformat())
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if args.dry_run:
        print(text)
    else:
        OUT.write_text(text, encoding="utf-8")
        print(f"Wrote {len(today_items)} articles to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
