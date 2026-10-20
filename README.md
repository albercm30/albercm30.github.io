# Alberto Castellano — GitHub Pages

This version is deliberately **plain static HTML/CSS/JS** so it can run directly on GitHub Pages with no build step.

## Upload

Put the contents of this folder directly into the root of your `YOURUSERNAME.github.io` repository.

The repository root must contain:

- `index.html`
- `style.css`
- `js/`
- `assets/`
- `professional/`
- `travel/`
- `mountains/`
- `diving/`
- `wildlife/`
- `photography/`
- `countries/`
- `projects/`

## GitHub Pages

Repository → Settings → Pages → Deploy from branch → `main` → `/ (root)`.

Then visit:

`https://YOURUSERNAME.github.io/`

No Python server is required after deployment.

## Spanish version (`/es/`)

Home, Professional, Contact, Mountains and the seven project case studies exist in Spanish. The English HTML is the source of truth:

1. Edit the English page as usual.
2. If you added new English text, add its Spanish to `scripts/es_strings.py` (or `scripts/es_projects.py`).
3. Run `python scripts/build_es.py`. It rewrites `es/`, the `hreflang` tags and the sitemap, and stops with a list of any text that still needs a translation.

Never edit files under `es/` by hand; they are regenerated. Travel, Diving, Wildlife, Photography and the country pages are English only for now.

## Broken-link check

`.github/workflows/link-check.yml` runs every Monday (and on demand from the Actions tab). It opens or updates an issue called "Broken links report" when something is broken, and closes it when everything is fine. Run it locally with `python scripts/check_links.py`.
