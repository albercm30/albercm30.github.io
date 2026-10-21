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

## Adding photos to a country

1. Save the photos as `assets/travel/<slug>-NN.jpg` (max ~2000px) and make small copies in `assets/travel/globe-s/` (520px) and `globe-l/` (1100px) for the globe.
2. Add them to `countries/<slug>/index.html` as `<div class="photo-tile"><img src=… alt=… width=… height=…></div>` — galleries keep each photo's own proportions and open in a click-to-enlarge viewer automatically.
3. Add the photo numbers to `PH` in `js/globe.js`.
4. **Make the text match the photos**: update the country's story, highlights and route in both `data/countries.json` and the page, so the places and experiences shown in the photos are also described.
5. **Photography page**: add the best new shots to `photography/index.html` as `<article class="photo-card">` cards in the matching category rail (Wildlife / Nature / Cities / People), titled and tagged like `Wildlife · Thailand`, and remove placeholder cards that are no longer needed.
6. Add Spanish for every new caption/sentence in `scripts/es_countries.py`, then run `python scripts/build_search_index.py && python scripts/build_es.py`.

## Visual extras
- `js/bg.js`: cursor-reactive constellation background, homepage only. Disabled with reduced motion.
- `js/visuals.js`: interactive elevation charts on /mountains/ and the draw-in animation of the country outline.
- `scripts/build_shapes.py <ne_10m_admin_0_countries.geojson>`: regenerates the "shape of" section on every country page (Natural Earth, public domain). Run `build_es.py` afterwards. Spain draws the Canary Islands.
- Bump the `?v=` query string on `/js/*.js` and `/style.css` in every HTML file when they change.
