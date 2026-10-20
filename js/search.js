/* Site search: loaded on demand by js/site.js. Static pages come from /data/search-index.json,
   wildlife species are read live from /data/wildlife.json (so they follow the weekly iNaturalist update). */
(function () {
  if (window.__siteSearch) return;
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var stamp = Math.floor(Date.now() / 3600000);
  var data = null, loading = null, lastFocus = null, active = -1, shown = [];

  var overlay = document.createElement("div");
  overlay.className = "search-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Search the site");
  overlay.innerHTML =
    '<div class="search-box">' +
    '<label class="sr-only" for="site-search-input">Search the site</label>' +
    '<input id="site-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search countries, hikes, projects, species…" role="combobox" aria-expanded="true" aria-controls="site-search-results" aria-autocomplete="list">' +
    '<ul id="site-search-results" role="listbox" aria-label="Search results"></ul>' +
    '<p class="search-hint"><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>' +
    "</div>";
  document.body.appendChild(overlay);
  var input = overlay.querySelector("input");
  var list = overlay.querySelector("ul");

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    var get = function (u) { return fetch(u + "?v=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    loading = Promise.all([get("/data/search-index.json"), get("/data/wildlife.json")]).then(function (a) {
      var items = (a[0] || []).slice();
      var w = a[1] && a[1].observations;
      if (w) {
        var seen = {};
        w.forEach(function (o) {
          var name = o.common_name || o.name; if (!name) return;
          var key = norm(name);
          if (!seen[key]) { seen[key] = { t: name, s: "Wildlife · " + (o.scientific_name || ""), u: "/wildlife/", g: "Wildlife", k: (o.scientific_name || "") + " ", countries: {} }; items.push(seen[key]); }
          if (o.country) seen[key].countries[o.country] = 1;
        });
        Object.keys(seen).forEach(function (k) { var e = seen[k]; var cs = Object.keys(e.countries); e.k += cs.join(" "); if (cs.length) e.s += " · " + cs.slice(0, 2).join(", "); delete e.countries; });
      }
      items.forEach(function (e) { e._t = norm(e.t); e._h = norm(e.t + " " + e.s + " " + e.k); });
      data = items; return items;
    });
    return loading;
  }

  var order = { Page: 0, Project: 1, Country: 2, Hike: 3, Wildlife: 4 };
  function run(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) {
      return (data || []).filter(function (e) { return e.g === "Page" || e.g === "Project"; }).slice(0, 8);
    }
    var res = [];
    (data || []).forEach(function (e) {
      var score = 0;
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (e._t.indexOf(t) === 0) score += 4; else if (e._t.indexOf(t) > -1) score += 3; else if (e._h.indexOf(t) > -1) score += 1; else return;
      }
      res.push({ e: e, s: score });
    });
    res.sort(function (a, b) { return b.s - a.s || (order[a.e.g] - order[b.e.g]) || a.e.t.localeCompare(b.e.t); });
    return res.slice(0, 10).map(function (r) { return r.e; });
  }

  function render() {
    shown = run(input.value);
    active = shown.length ? 0 : -1;
    if (!shown.length) { list.innerHTML = '<li class="search-empty" role="presentation">No results. Try a country, a hike or an animal.</li>'; input.removeAttribute("aria-activedescendant"); return; }
    list.innerHTML = shown.map(function (e, i) {
      return '<li role="option" id="sr-' + i + '" aria-selected="' + (i === 0) + '"><a href="' + esc(e.u) + '" tabindex="-1"><span class="sr-title">' + esc(e.t) + '</span><span class="sr-sub">' + esc(e.s) + '</span><span class="sr-tag">' + esc(e.g) + "</span></a></li>";
    }).join("");
    input.setAttribute("aria-activedescendant", "sr-0");
  }
  function setActive(i) {
    if (!shown.length) return;
    active = (i + shown.length) % shown.length;
    list.querySelectorAll("li").forEach(function (li, n) { li.setAttribute("aria-selected", n === active ? "true" : "false"); });
    var el = document.getElementById("sr-" + active);
    input.setAttribute("aria-activedescendant", "sr-" + active);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
  function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add("search-open");
    input.value = "";
    list.innerHTML = '<li class="search-empty" role="presentation">Loading…</li>';
    load().then(render);
    setTimeout(function () { input.focus(); }, 0);
  }
  function close() {
    overlay.hidden = true;
    document.documentElement.classList.remove("search-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  input.addEventListener("input", render);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) location.href = shown[active].u; }
    else if (e.key === "Tab") { e.preventDefault(); }
  });
  overlay.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); close(); } });
  overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
  list.addEventListener("mousemove", function (e) { var li = e.target.closest && e.target.closest("li[role=option]"); if (li) setActive(+li.id.replace("sr-", "")); });
  window.__siteSearch = { open: open, close: close };
  open();
})();
