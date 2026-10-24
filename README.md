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
- `js/visuals.js`: interactive elevation charts on /mountains/ and the draw-in animation of the country outline.
- `scripts/build_shapes.py <ne_10m_admin_0_countries.geojson>`: regenerates the "shape of" section on every country page (Natural Earth, public domain). Run `build_es.py` afterwards. Spain draws the Canary Islands.
- Bump the `?v=` query string on `/js/*.js` and `/style.css` in every HTML file when they change.
- Themed cursors: `html[data-sec]` is set by `js/visuals.js` from the URL; the cursor SVGs are generated into `style.css` by `scripts/build_cursors.py` (paw = wildlife, camera = photography, peaks = mountains, shark = diving, plane = travel/countries, `</>` = professional/projects). Links and inputs keep their normal cursors; touch devices are unaffected.
- Route on the country outline: stop coordinates live in `data/stops.json` (name → [lat, lng], names must match the route in `countries.json`). `python scripts/build_shapes.py <geojson> [slug ...]` redraws the outline and route; the travel globe reads the same file and shows the route when you hover a country.
- Share images: `python scripts/build_og.py [slug ...]` redraws `assets/og/countries-*.jpg` (and `es/`) from each page's photo, outline and route.
- Photography page: country filter chips and lightbox captions come from each card's "Category · Country" tag.
- Dive log: the dot strip is built from the rows of the dive table.

## Trip Reports demo (`/projects/trip-reports/`)
`js/tripdemo.js` is a client-side demo of the "AI trip reports for wildlife guides" project: free-form notes in, species matched against `data/taxonomy-demo.json` (284 species, `[common, scientific]`), uncertain or unknown sightings flagged for the guide, templated narrative in three tones and two languages, guide-approval gate, then print/PDF, text copy and CSV/JSON export. Nothing is uploaded. To add species, append `[name, scientific]` pairs to the taxonomy file; places for the route map come from `data/stops.json` plus a few names listed in the script.

The page also describes the separate real product (FastAPI + Postgres + Stripe, repo `albercm30/trip-reports`); the demo remains the browser-only version.

## Flights Tracker (`/projects/flights-tracker/`)
Case study of the redesigned app (repo `albercm30/FlightsTracker`). Screenshots in `assets/projects/flights-tracker/` come from that repo's `docs/` folder (simulated prices); replace them when the app's look changes.

## Ventana demo (`/projects/ventana/`)
Weather-aware cancellation tool for Canary Islands activity operators. The demo is a self-contained page, `projects/ventana/app.html` (Spanish UI, simulated weather, made-up bookings, 48 ports, 12 activities), embedded in the case study through an iframe that resizes itself via `postMessage` and follows the site's light/dark choice. It is not named `index.html`, so `build_es.py` leaves it alone. The case study text is translated in `scripts/es_projects.py`.

## News Tracker (`/projects/news-tracker/`)
Daily digest of 10 articles, shown from `data/news.json` by `js/news.js` (full edition for today, headline-only for the previous six days; text in Spanish, UI in the page language). The digest is produced by the "Noticias de la mañana" scheduled task in Claude, and `scripts/news_digest.py` is the code version of the same pipeline (RSS feeds in `scripts/news_sources.json` -> de-duplicate -> score -> pick 10 -> summarise with the Claude API if `ANTHROPIC_API_KEY` is set). `.github/workflows/news-digest.yml` runs it on demand; uncomment its `schedule` to run daily. If you enable it, stop copying `data/news.json` from zips, as with `data/wildlife.json`.
