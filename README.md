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

Every page has a Spanish twin under `/es/` (home, professional, projects, mountains, travel, the 38 countries, diving, wildlife, photography, contact). The EN/ES button in the nav swaps `/es/` in and out of the current URL, so you stay on the same page and keep navigating in that language. The English HTML is the source of truth:

1. Edit the English page as usual (or regenerate the country pages).
2. If you added new English text, add its Spanish to `scripts/es_strings.py`, `es_projects.py`, `es_countries.py` or `es_pages.py`.
3. Run `python scripts/build_search_index.py` and then `python scripts/build_es.py`. The second one rewrites `es/`, the `hreflang` tags, the sitemap and `data/search-index-es.json`, and stops with a list of any text that still needs a translation.

Never edit files under `es/` by hand; they are regenerated. Wildlife species names come from iNaturalist and stay in English.

## Broken-link check

`.github/workflows/link-check.yml` runs every Monday (and on demand from the Actions tab). It opens or updates an issue called "Broken links report" when something is broken, and closes it when everything is fine. Run it locally with `python scripts/check_links.py`.
