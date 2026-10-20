#!/usr/bin/env python3
"""Build the Spanish pages (/es/...) from the English ones and wire up hreflang.

    python scripts/build_es.py

The English HTML is the source of truth. For every page listed in PAGES this script
  * translates each text node / alt / aria-label / meta description using scripts/es_strings.py,
  * points internal links at the Spanish twin when one exists (otherwise they stay on the English page),
  * rewrites canonical / og:url / og:image, sets <html lang="es"> and og:locale,
  * adds <link rel="alternate" hreflang> pairs to BOTH the English and the Spanish page,
  * writes the result to es/<same path>.

It stops with a list of untranslated strings if a page gets new English text, so nothing is silently left out.
Edit the Spanish in scripts/es_strings.py (and es_projects.py), then run it again.
"""
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from es_strings import T, KEEP  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://albercm30.github.io"

PAGES = ["index.html", "professional/index.html", "contact/index.html", "mountains/index.html"] + [
    f"projects/{p}/index.html"
    for p in "ai-incident-classification bachelor-thesis flights-tracker kondo wildcast wildlife-data-explorer wildstays".split()
]


def url_path(page):
    return "/" + page[: -len("index.html")]


TRANSLATED = {url_path(p) for p in PAGES}

LANG_NOTE = ('<p class="lang-note shell">Las secciones de Viajes, Buceo, Fauna y Fotografía están, por ahora, '
             'solo en inglés. <a href="{en}" hreflang="en" lang="en">Read this page in English</a>.</p>')

# Literal replacements inside inline <script> blocks (form messages, map labels...).
SCRIPT_REPL = {
    "contact/index.html": [
        ('"Thanks! Your message has been sent."', '"¡Gracias! Tu mensaje se ha enviado."'),
        ('"Please add your name, a valid email and a message of at least 10 characters."',
         '"Añade tu nombre, un correo válido y un mensaje de al menos 10 caracteres."'),
        ('"Sending…"', '"Enviando…"'),
        ('btn.textContent="Send message →"', 'btn.textContent="Enviar mensaje →"'),
        ('"Sorry, that didn\'t go through. Please "', '"Lo siento, no se ha podido enviar. Por favor, "'),
        ('>email me directly</a>', '>escríbeme un correo directamente</a>'),
        ('"Message from your website"', '"Mensaje desde tu web"'),
        ('"New message from albercm30.github.io"', '"Nuevo mensaje desde albercm30.github.io (ES)"'),
    ],
    "mountains/index.html": [
        ('var fmt=function(n){return Math.round(n).toLocaleString("en-US")};',
         'var fmt=function(n){return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,".")};'
         'var RG={"Volcano · Guatemala":"Volcán · Guatemala","Aoraki / Mt Cook · New Zealand":"Aoraki / Monte Cook · Nueva Zelanda",'
         '"Cat Ba · Vietnam":"Cat Ba · Vietnam","Dolomites · Italy":"Dolomitas · Italia","Gran Canaria · Spain":"Gran Canaria · España"};'),
        ("<span>'+r.region+'</span>", "<span>'+(RG[r.region]||r.region)+'</span>"),
        ("<span>'+r.km+' km · '+fmt(r.gain)+' m gain · '+r.duration+'</span>", "<span>'+String(r.km).replace('.',',')+' km · '+fmt(r.gain)+' m de desnivel · '+r.duration+'</span>"),
        ('allBtn.textContent="All routes"', 'allBtn.textContent="Todas las rutas"'),
    ],
}

NUMERIC = re.compile(r"^\d[\d.,]*( ?(km|m|M))?( \(est\.\))?$|^\d+h \d{2}m$")
HAS_WORDS = re.compile(r"[A-Za-zÀ-ÿ]{2}")
missing = []


def num_es(s):
    s = re.sub(r"(?<=\d),(?=\d{3}(?!\d))", "\u0000", s)  # thousands
    s = re.sub(r"(?<=\d)\.(?=\d)", ",", s)  # decimals
    s = s.replace("\u0000", ".").replace("(est.)", "(aprox.)")
    return s


def esc_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s):
    return esc_text(s).replace('"', "&quot;")


def translate(key, page, where):
    """Return Spanish for `key`, or None to leave it unchanged."""
    if key in T:
        return T[key]
    if key in KEEP:
        return None
    suffix = " · Alberto Castellano Macías"
    if key.endswith(suffix) and key[: -len(suffix)] in KEEP:
        return None
    if NUMERIC.match(key):
        out = num_es(key)
        return out if out != key else None
    if not HAS_WORDS.search(key):
        return None
    missing.append((page, where, key))
    return None


def es_href(href):
    m = re.match(r"^(/[^?#]*)([?#].*)?$", href)
    if not m or href.startswith("//"):
        return href
    path, rest = m.group(1), m.group(2) or ""
    if path.endswith("index.html"):
        path = path[: -len("index.html")]
    if path in TRANSLATED:
        return "/es" + path + rest
    return href


def fix_attrs(tag, page):
    name = re.match(r"<\s*([A-Za-z0-9]+)", tag).group(1).lower()
    attrs = dict((m.group(1).lower(), html.unescape(m.group(2))) for m in re.finditer(r'([\w:-]+)="([^"]*)"', tag))

    def sub(m):
        a, v = m.group(1), html.unescape(m.group(2))
        a_l = a.lower()
        new = None
        if name == "html" and a_l == "lang":
            new = "es"
        elif a_l in ("alt", "title", "aria-label", "placeholder"):
            key = " ".join(v.split())
            tr = translate(key, page, a_l)
            new = tr if tr is not None else v
        elif name == "meta" and a_l == "content":
            ident = attrs.get("name", "") + attrs.get("property", "")
            if ident in ("description", "og:title", "og:description", "twitter:title", "twitter:description"):
                tr = translate(" ".join(v.split()), page, ident)
                new = tr if tr is not None else v
            elif ident == "og:url":
                new = SITE + "/es" + v[len(SITE):]
            elif ident in ("og:image", "twitter:image"):
                new = v.replace("/assets/og/", "/assets/og/es/")
        elif name == "link" and a_l == "href" and attrs.get("rel") == "canonical":
            new = SITE + "/es" + v[len(SITE):]
        elif name == "a" and a_l == "href":
            new = es_href(v)
        if new is None:
            return m.group(0)
        return f'{a}="{esc_attr(new)}"'

    return re.sub(r'([\w:-]+)="([^"]*)"', sub, tag)


LD_TRANSLATE = {"name", "description", "headline", "jobTitle", "alternativeName"}


def fix_ld(obj, page):
    if isinstance(obj, list):
        return [fix_ld(x, page) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "inLanguage":
                out[k] = "es"
            elif k in ("@id", "@type", "@context", "sameAs", "image", "logo", "thumbnailUrl", "datePublished", "dateModified"):
                out[k] = v
            elif k == "url" and isinstance(v, str):
                path = v[len(SITE):] if v.startswith(SITE) else None
                out[k] = SITE + "/es" + path if path in TRANSLATED else v
            elif k in LD_TRANSLATE and isinstance(v, str):
                tr = translate(" ".join(v.split()), page, "ld:" + k)
                out[k] = tr if tr is not None else v
            elif k == "knowsAbout" and isinstance(v, list):
                out[k] = [T.get(x, x) for x in v]
            else:
                out[k] = fix_ld(v, page)
        return out
    return obj


def build_page(page):
    src = (ROOT / page).read_text(encoding="utf8")
    # forget hreflang / locale tags from earlier runs
    src = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">', "", src)
    src = re.sub(r'<meta property="og:locale(:alternate)?" content="[^"]*">', "", src)
    parts = re.split(r"(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", src, flags=re.S)
    out = []
    for p in parts:
        if not p:
            continue
        if p.startswith("<!") or p.startswith("<style"):
            out.append(p)
        elif p.startswith("<script"):
            if 'type="application/ld+json"' in p.split(">", 1)[0]:
                m = re.match(r"(<script[^>]*>)(.*)(</script>)$", p, re.S)
                data = fix_ld(json.loads(m.group(2)), page)
                out.append(m.group(1) + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + m.group(3))
            elif "src=" in p.split(">", 1)[0] or page not in SCRIPT_REPL:
                out.append(p)
            else:
                s = p
                for a, b in SCRIPT_REPL[page]:
                    if a not in s:
                        # only apply replacements that belong to this particular script block
                        continue
                    s = s.replace(a, b)
                out.append(s)
        elif p.startswith("</"):
            out.append(p)
        elif p.startswith("<"):
            out.append(fix_attrs(p, page))
        else:
            m = re.match(r"(\s*)(.*?)(\s*)$", p, re.S)
            lead, core, trail = m.groups()
            if not core:
                out.append(p)
                continue
            key = " ".join(html.unescape(core).split())
            tr = translate(key, page, "text")
            out.append(lead + (esc_text(tr) if tr is not None else core) + trail)
    res = "".join(out)

    # every SCRIPT_REPL entry must have been used somewhere in the page
    for a, b in SCRIPT_REPL.get(page, []):
        if b not in res:
            missing.append((page, "script", a))

    en_url = SITE + url_path(page)
    es_url = SITE + "/es" + url_path(page)
    block = (f'<link rel="alternate" hreflang="en" href="{en_url}"><link rel="alternate" hreflang="es" href="{es_url}">'
             f'<link rel="alternate" hreflang="x-default" href="{en_url}">'
             f'<meta property="og:locale" content="es_ES"><meta property="og:locale:alternate" content="en_US">')
    res, n = re.subn(r'(<link rel="canonical" href="[^"]*">)', lambda m: m.group(1) + block, res, count=1)
    if n != 1:
        missing.append((page, "head", "no canonical link"))
    res, n = re.subn(r'(<footer class="footer shell">)', lambda m: LANG_NOTE.format(en=url_path(page)) + m.group(1), res, count=1)
    if n != 1:
        missing.append((page, "footer", "no footer"))
    return res


def patch_english(page):
    f = ROOT / page
    src = f.read_text(encoding="utf8")
    src = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">', "", src)
    src = re.sub(r'<meta property="og:locale(:alternate)?" content="[^"]*">', "", src)
    en_url = SITE + url_path(page)
    es_url = SITE + "/es" + url_path(page)
    block = (f'<link rel="alternate" hreflang="en" href="{en_url}"><link rel="alternate" hreflang="es" href="{es_url}">'
             f'<link rel="alternate" hreflang="x-default" href="{en_url}">'
             f'<meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="es_ES">')
    new, n = re.subn(r'(<link rel="canonical" href="[^"]*">)', lambda m: m.group(1) + block, src, count=1)
    if n == 1 and new != src:
        f.write_text(new, encoding="utf8", newline="")
    return n == 1


def update_sitemap():
    """Add the Spanish URLs (with hreflang alternates) to sitemap.xml. Safe to run repeatedly."""
    f = ROOT / "sitemap.xml"
    if not f.exists():
        return
    xml = f.read_text(encoding="utf8")
    xml = re.sub(r"\s*<url><loc>" + re.escape(SITE) + r"/es/.*?</url>", "", xml, flags=re.S)
    xml = re.sub(r"<xhtml:link [^>]*/>", "", xml)
    if "xmlns:xhtml" not in xml:
        xml = xml.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
    new_urls = []
    for page in PAGES:
        path = url_path(page)
        en, es = SITE + path, SITE + "/es" + path
        alt = (f'<xhtml:link rel="alternate" hreflang="en" href="{en}"/><xhtml:link rel="alternate" hreflang="es" href="{es}"/>'
               f'<xhtml:link rel="alternate" hreflang="x-default" href="{en}"/>')
        m = re.search(r"<url><loc>" + re.escape(en) + r"</loc>(.*?)</url>", xml, flags=re.S)
        if not m:
            continue
        body = m.group(1)
        xml = xml.replace(m.group(0), f"<url><loc>{en}</loc>{body}{alt}</url>")
        new_urls.append(f"  <url><loc>{es}</loc>{body}{alt}</url>")
    xml = xml.replace("</urlset>", "\n".join(new_urls) + "\n</urlset>")
    f.write_text(xml, encoding="utf8", newline="")


def main():
    built = []
    for page in PAGES:
        res = build_page(page)
        built.append((page, res))
    if missing:
        print("Untranslated strings (add them to scripts/es_strings.py or es_projects.py):\n")
        for page, where, key in missing:
            print(f"  [{page}] ({where}) {key[:160]!r}")
        sys.exit(1)
    for page, res in built:
        dest = ROOT / "es" / page
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(res, encoding="utf8", newline="")
        patch_english(page)
    update_sitemap()
    print(f"Built {len(built)} Spanish pages in es/ and added hreflang to the English twins.")


if __name__ == "__main__":
    main()
