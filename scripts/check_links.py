#!/usr/bin/env python3
"""Check every link on the site.

    python scripts/check_links.py                 # internal + external links
    python scripts/check_links.py --internal-only # only links between your own pages and files
    python scripts/check_links.py --report report.md

Internal links (pages, images, scripts, PDFs) must point to a file that exists in the repo.
External links must answer with a success status. Sites that block automated checks
(LinkedIn, Instagram, ...) or answer 401/403/429 are listed as "could not verify", not as broken.
Exit code is 1 when something is really broken, otherwise 0. Standard library only.
"""
import argparse
import concurrent.futures as cf
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://albercm30.github.io"
SKIP_EXTERNAL_HOSTS = ("linkedin.com", "instagram.com", "facebook.com", "twitter.com", "x.com", "claude.ai", "goatcounter.com", "gc.zgo.at")
UNVERIFIABLE_STATUS = {401, 403, 405, 406, 429, 451, 999}
UA = "Mozilla/5.0 (compatible; site-link-check/1.0; +https://albercm30.github.io)"
LINK_ATTRS = {"a": "href", "link": "href", "img": "src", "script": "src", "source": "src", "iframe": "src", "video": "src", "audio": "src"}


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        attr = LINK_ATTRS.get(tag)
        if attr and a.get(attr):
            self.links.append((tag, a[attr].strip()))
        if tag == "meta" and a.get("property") in ("og:image", "og:url") and a.get("content"):
            self.links.append(("meta", a["content"].strip()))
        if tag == "img" and a.get("srcset"):
            for part in a["srcset"].split(","):
                if part.strip():
                    self.links.append(("img", part.strip().split()[0]))


def html_files(root: Path):
    for p in sorted(root.rglob("*.html")):
        rel = p.relative_to(root).parts
        if any(x.startswith(".") or x in ("node_modules",) for x in rel):
            continue
        yield p


def resolve_internal(root: Path, page: Path, href: str):
    """Return (target_path, fragment) for a link that stays on this site, else None."""
    parsed = urllib.parse.urlsplit(href)
    if parsed.scheme in ("http", "https"):
        if parsed.netloc.lower().removeprefix("www.") != urllib.parse.urlsplit(SITE).netloc:
            return None
        path = parsed.path
        first = path.strip("/").split("/")[0]
        # Other repositories published under the same domain (e.g. /WildCast/) are not files in this repo.
        if first and not (root / first).exists() and not (root / (first + ".html")).exists():
            return None
    elif parsed.scheme or href.startswith("//"):
        return None
    else:
        path = parsed.path
    path = urllib.parse.unquote(path)
    if not path:
        return page, parsed.fragment
    base = root if path.startswith("/") else page.parent
    target = (base / path.lstrip("/")).resolve() if path.startswith("/") else (base / path).resolve()
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target, parsed.fragment


def check_external(url: str):
    last = ""
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=20) as r:
                r.read(1024)
                return ("ok", r.status)
        except urllib.error.HTTPError as e:
            if e.code in UNVERIFIABLE_STATUS:
                return ("unverified", e.code)
            if e.code in (404, 410):
                return ("broken", e.code)
            last = f"HTTP {e.code}"
        except (urllib.error.URLError, socket.timeout, ConnectionError, TimeoutError) as e:
            last = str(getattr(e, "reason", e))
    return ("broken", last or "no response")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument("--internal-only", action="store_true")
    ap.add_argument("--report", default="")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    ids_by_file, page_links = {}, {}
    for p in html_files(root):
        c = Collector()
        c.feed(p.read_text(encoding="utf-8", errors="replace"))
        ids_by_file[p.resolve()] = c.ids
        page_links[p] = c.links

    broken_internal, bad_anchor, external = [], [], {}
    for page, links in page_links.items():
        rel = page.relative_to(root).as_posix()
        for tag, href in links:
            if not href or href == "#" or href.startswith(("mailto:", "tel:", "javascript:", "data:")):
                continue
            res = resolve_internal(root, page, href)
            if res is None:
                if href.startswith(("http://", "https://")):
                    external.setdefault(href.split("#")[0], []).append(rel)
                continue
            target, frag = res
            try:
                inside = target.is_relative_to(root)
            except AttributeError:
                inside = str(target).startswith(str(root))
            if not inside or not target.exists():
                broken_internal.append((rel, tag, href))
            elif frag and frag.lower() != "top" and target.suffix == ".html":
                if frag not in ids_by_file.get(target, set()):
                    bad_anchor.append((rel, href))

    broken_external, unverified, checked = [], [], 0
    if not args.internal_only:
        urls = [u for u in external if not any(urllib.parse.urlsplit(u).netloc.endswith(h) for h in SKIP_EXTERNAL_HOSTS)]
        skipped = len(external) - len(urls)
        with cf.ThreadPoolExecutor(max_workers=8) as ex:
            for url, (state, info) in zip(urls, ex.map(check_external, urls)):
                checked += 1
                if state == "broken":
                    broken_external.append((url, info, sorted(set(external[url]))))
                elif state == "unverified":
                    unverified.append((url, info))
    else:
        skipped = 0

    lines = ["# Link check report", ""]
    problems = len(broken_internal) + len(broken_external)
    lines.append(f"Pages scanned: {len(page_links)} · external links checked: {checked} · skipped (sites that block bots): {skipped}")
    lines.append("")
    if broken_internal:
        lines += ["## Broken internal links", ""] + [f"- `{p}` → `{h}` ({t})" for p, t, h in broken_internal] + [""]
    if broken_external:
        lines += ["## Broken external links", ""]
        for url, info, pages in broken_external:
            shown = ", ".join(f"`{x}`" for x in pages[:4]) + (" …" if len(pages) > 4 else "")
            lines.append(f"- {url} → **{info}** (on {shown})")
        lines.append("")
    if bad_anchor:
        lines += ["## Anchors that were not found (warning)", ""] + [f"- `{p}` → `{h}`" for p, h in bad_anchor] + [""]
    if unverified:
        lines += ["## Could not verify (site blocks automated checks, open manually)", ""] + [f"- {u} (HTTP {c})" for u, c in unverified] + [""]
    if not problems:
        lines.append("No broken links found. ✅")
    text = "\n".join(lines) + "\n"
    print(text)
    if args.report:
        Path(args.report).write_text(text, encoding="utf-8")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
