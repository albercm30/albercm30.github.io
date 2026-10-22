/* Trip Reports demo: guide's rough notes -> checked species list -> approved, branded trip report.
   Everything runs in the browser. Nothing is uploaded; photos stay on the device.
   The product would use Whisper for voice, GBIF for names and an LLM for the narrative; this demo uses
   a small bundled taxonomy and written templates so it works offline and costs nothing. */
(function () {
  var root = document.getElementById("trip-demo");
  if (!root) return;
  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "es" ? "es" : "en";

  /* ------------------------------------------------------------ interface text */
  var UI = {
    en: {
      s1: "1 · The guide's notes", s1h: "Type, paste or dictate the day the way you would on a phone. One sighting per line.",
      samples: "Try a sample", sampleNames: ["Khao Yai, Thailand", "Sri Lanka", "Costa Rica"],
      ph: "Day 1 – Place name\nWeather: sunny\n06:10 Great Hornbill x2 at the fig tree\n07:30 Lar gibbons (3) calling!\n…",
      dictate: "Dictate", dictating: "Listening…", photos: "Add photos", clear: "Clear", photosNote: "Photos stay in your browser.",
      operator: "Operator", guide: "Guide", tone: "Tone", tones: ["Warm", "Factual", "Adventurous"], rlang: "Report language", color: "Colour",
      go: "Generate report", s2: "2 · Check before anything is sent", s2h: "The tool never adds a species on its own. Anything uncertain waits for the guide.",
      s3: "3 · The report", matched: "species matched", flagged: "need the guide", none: "Nothing to check — every species was matched.",
      reasonUnc: "Marked as uncertain in the notes", reasonNone: "Not found in the taxonomy", reasonAmb: "Several species fit this name", reasonSug: "No exact match, closest names below",
      confirm: "Confirm", keepNote: "Keep as a note", remove: "Remove", typeSp: "Type a species…", use: "Use",
      okChip: "Matched", fixedChip: "Spelling corrected", partChip: "Matched from", fromNotes: "from the notes",
      approveHead: "Guide approval", approveWait: "Resolve the flagged sightings above to continue.", approve: "Approve and publish",
      approvedBy: "Approved by", on: "on", edit: "Back to editing",
      copy: "Copy as text", copied: "Copied", print: "Print or save as PDF", csv: "Download sightings (CSV)", json: "Download sightings (JSON)",
      dataHead: "Structured sighting data", dataH: "Every approved report also becomes clean rows like these, owned by the operator and shared only with permission.",
      emptyNotes: "Add some notes or load a sample first.", noSp: "No species recognised yet.",
      unsure: "The tool matches against a small demo list of 284 species. The real product uses the full GBIF taxonomy.",
      photoCap: "Photo of", gallery: "Gallery", route: "Route", checklist: "Species list", days: "Days", count: "Count", status: "Status", seen: "Seen", confirmed: "Confirmed", corrected: "Corrected", noteLbl: "Notes"
    },
    es: {
      s1: "1 · Las notas del guía", s1h: "Escribe, pega o dicta el día como lo harías en el móvil. Un avistamiento por línea.",
      samples: "Prueba un ejemplo", sampleNames: ["Khao Yai, Tailandia", "Sri Lanka", "Costa Rica"],
      ph: "Día 1 – Nombre del lugar\nTiempo: soleado\n06:10 Great Hornbill x2 en la higuera\n07:30 Lar gibbons (3) cantando!\n…",
      dictate: "Dictar", dictating: "Escuchando…", photos: "Añadir fotos", clear: "Borrar", photosNote: "Las fotos se quedan en tu navegador.",
      operator: "Operador", guide: "Guía", tone: "Tono", tones: ["Cercano", "Factual", "Aventurero"], rlang: "Idioma del informe", color: "Color",
      go: "Generar informe", s2: "2 · Revisar antes de enviar nada", s2h: "La herramienta nunca añade una especie por su cuenta. Lo dudoso espera al guía.",
      s3: "3 · El informe", matched: "especies reconocidas", flagged: "necesitan al guía", none: "Nada que revisar: todas las especies se reconocieron.",
      reasonUnc: "Marcado como dudoso en las notas", reasonNone: "No está en la taxonomía", reasonAmb: "Varias especies encajan con este nombre", reasonSug: "Sin coincidencia exacta; nombres más cercanos abajo",
      confirm: "Confirmar", keepNote: "Dejar como nota", remove: "Quitar", typeSp: "Escribe una especie…", use: "Usar",
      okChip: "Reconocida", fixedChip: "Ortografía corregida", partChip: "Reconocida a partir de", fromNotes: "de las notas",
      approveHead: "Aprobación del guía", approveWait: "Resuelve los avistamientos marcados para continuar.", approve: "Aprobar y publicar",
      approvedBy: "Aprobado por", on: "el", edit: "Volver a editar",
      copy: "Copiar como texto", copied: "Copiado", print: "Imprimir o guardar en PDF", csv: "Descargar avistamientos (CSV)", json: "Descargar avistamientos (JSON)",
      dataHead: "Datos de avistamientos estructurados", dataH: "Cada informe aprobado se convierte también en filas limpias como estas, propiedad del operador y compartidas solo con permiso.",
      emptyNotes: "Añade unas notas o carga un ejemplo primero.", noSp: "Aún no se reconoce ninguna especie.",
      unsure: "La herramienta compara con una lista de demostración de 284 especies. El producto real usa la taxonomía completa de GBIF.",
      photoCap: "Foto de", gallery: "Galería", route: "Ruta", checklist: "Lista de especies", days: "Días", count: "Cantidad", status: "Estado", seen: "Vistas", confirmed: "Confirmada", corrected: "Corregida", noteLbl: "Notas"
    }
  };
  var T = UI[LANG];

  /* ------------------------------------------------------------ report text (language chosen by the operator) */
  var RT = {
    en: {
      day: "Day", weather: "Weather", newToday: "new for the trip", species: "species", individuals: "individuals", days: "days",
      title: "Trip report", by: "Guide", approved: "Approved by the guide", names: "Names are shown in English with the scientific name.",
      highlights: "Highlights", summary: "species over", also: "Also",
      warm: {
        open: function (n, p) { return "Day " + n + (p ? " took us to " + p : " in the field") + "."; },
        wx: function (w) { return " The weather: " + w + "."; },
        star: function (l) { return " The stars of the day were " + l + "."; },
        rest: function (l) { return " We also logged " + l + "."; },
        fresh: function (k) { return k ? " " + k + (k === 1 ? " species was" : " species were") + " new for the trip list." : ""; },
        quiet: " A quiet day on the list, but a good one."
      },
      fact: {
        open: function (n, p) { return "Day " + n + (p ? " — " + p : "") + "."; },
        wx: function (w) { return " Weather: " + w + "."; },
        star: function (l) { return " Notable: " + l + "."; },
        rest: function (l) { return " Also recorded: " + l + "."; },
        fresh: function (k) { return k ? " New for the trip: " + k + "." : ""; },
        quiet: " No sightings recorded."
      },
      adv: {
        open: function (n, p) { return "Day " + n + (p ? ": " + p + ", and the wild did not disappoint." : ": out in the wild again."); },
        wx: function (w) { return " Conditions: " + w + "."; },
        star: function (l) { return " Showstoppers: " + l + "!"; },
        rest: function (l) { return " Along the way: " + l + "."; },
        fresh: function (k) { return k ? " That made " + k + " brand-new " + (k === 1 ? "species" : "species") + " for the list." : ""; },
        quiet: " A slow day, but that is wildlife."
      }
    },
    es: {
      day: "Día", weather: "Tiempo", newToday: "nuevas en el viaje", species: "especies", individuals: "individuos", days: "días",
      title: "Informe de viaje", by: "Guía", approved: "Aprobado por el guía", names: "Los nombres se muestran en inglés con el nombre científico.",
      highlights: "Momentos destacados", summary: "especies en", also: "También",
      warm: {
        open: function (n, p) { return "El día " + n + (p ? " nos llevó a " + p : " en el campo") + "."; },
        wx: function (w) { return " El tiempo: " + w + "."; },
        star: function (l) { return " Las estrellas del día fueron " + l + "."; },
        rest: function (l) { return " También anotamos " + l + "."; },
        fresh: function (k) { return k ? " " + k + (k === 1 ? " especie nueva" : " especies nuevas") + " para la lista del viaje." : ""; },
        quiet: " Un día tranquilo en la lista, pero bueno."
      },
      fact: {
        open: function (n, p) { return "Día " + n + (p ? " — " + p : "") + "."; },
        wx: function (w) { return " Tiempo: " + w + "."; },
        star: function (l) { return " Destacado: " + l + "."; },
        rest: function (l) { return " También registrado: " + l + "."; },
        fresh: function (k) { return k ? " Nuevas en el viaje: " + k + "." : ""; },
        quiet: " Sin avistamientos registrados."
      },
      adv: {
        open: function (n, p) { return "Día " + n + (p ? ": " + p + ", y la naturaleza no decepcionó." : ": de nuevo en plena naturaleza."); },
        wx: function (w) { return " Condiciones: " + w + "."; },
        star: function (l) { return " Lo mejor del día: " + l + "."; },
        rest: function (l) { return " Por el camino: " + l + "."; },
        fresh: function (k) { return k ? " Eso sumó " + k + (k === 1 ? " especie nueva" : " especies nuevas") + " a la lista." : ""; },
        quiet: " Un día lento, pero así es la fauna."
      }
    }
  };
  var TONEKEY = ["warm", "fact", "adv"];

  /* ------------------------------------------------------------ samples */
  var SAMPLES = [
    { op: "Canopy Trails", guide: "Nok", photos: [
        ["/assets/travel/globe-l/thailand-01.jpg", "Mainland Asian Elephant"], ["/assets/travel/globe-l/thailand-03.jpg", "Great Hornbill"], ["/assets/travel/globe-l/thailand-04.jpg", "Kramer's Pit Viper"], ["/assets/travel/globe-l/thailand-05.jpg", "Golden Tree Snake"], ["/assets/travel/globe-l/thailand-06.jpg", "East Asian Porcupine"]],
      text: "Day 1 – Khao Yai, visitor centre trail\nWeather: warm, hazy morning, clear afternoon\n06:10 Great Hornbill x2 at the fig tree\n06:40 Wreathed hornbil x5 flying over\n07:30 Lar gibbons (3) calling from the ridge!\n09:15 Pig-tailed macaque x12 on the road\n11:00 Red-headed trogon, female\n14:20 Blue bearded bee eater\n16:45 Asian elephant x4 crossing the road with 2 calves!\n19:50 Kramer's pit viper on a low branch\n20:10 Golden tree snake\n20:40 maybe a leopard cat? just eyeshine\n\nDay 2 – Khao Yai, Haew Suwat trail\nWeather: light rain, cooler\n06:30 Great hornbill x3\n07:15 Chestnut-headed bee-eater x6\n08:05 Asian water dragon at the stream\n10:30 Northern red muntjac\n13:00 Sambar deer x2\n15:20 Orange-winged flying lizard\n19:45 East Asian porcupine\n20:30 Malayan krait!\n21:00 small crested gecko-ish thing on the toilet block wall" },
    { op: "Island Wild Tours", guide: "Kasun", photos: [
        ["/assets/travel/globe-l/sri-lanka-04.jpg", "Sri Lankan Elephant"], ["/assets/travel/globe-l/sri-lanka-07.jpg", "Toque Macaque"], ["/assets/travel/globe-l/sri-lanka-08.jpg", "Ceylon Serpent-Eagle"]],
      text: "Day 1 – Sigiriya\nWeather: hot and dry\n06:30 Toque macaque x20 at the rock gate!\n07:45 Indian garden lizard\n08:10 Ceylon serpent eagle perched above the moat\n16:30 Mugger crocodile x2 in the lake\n17:20 Black turtle\n\nDay 2 – Wilpattu National Park\nWeather: clear, dusty tracks\n06:15 Spotted deer x40 on the first plain\n07:00 Wild water buffalo x6\n08:40 Sri Lankan jackal\n09:30 Sri Lankan elephant x3 bathing at the villu!\n10:15 Sloth bear? something dark in the scrub\n15:10 Chunam tree frog" },
    { op: "Quetzal Trails", guide: "Mariana", photos: [],
      text: "Day 1 – Monteverde cloud forest\nWeather: misty, 16 degrees\n06:20 Resplendant quetzal x2 at the aguacatillo tree!\n07:05 Violet sabrewing\n08:30 Mantled howler monkey x6\n09:40 White-nosed coati x4\n13:10 Three-toed sloth x1\n19:20 Red-eyed tree frog x3\n\nDay 2 – Arenal\nWeather: sunny, volcano clear\n06:40 Keel-billed toucan x2\n07:30 Scarlet macaw x4 flying over\n09:15 Green basilisk\n10:00 Baird's tapir? only heard it in the forest\n15:30 Blue morpho\n16:10 White-faced capuchin x8" }
  ];
  var SWATCHES = ["#55704c", "#a9842f", "#2f6b7a", "#8a4b3a"];

  /* ------------------------------------------------------------ taxonomy and matching */
  var TAX = [], EXACT = {}, PLACES = {};
  var STOP = { deer: 1, bird: 1, snake: 1, a: 1, an: 1, the: 1, of: 1, common: 1 };
  function norm(s) {
    s = (s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    s = s.replace(/['’`.]/g, "").replace(/[-–—_/]/g, " ").replace(/[^a-z0-9 ]/g, " ");
    return s.split(/\s+/).filter(Boolean).map(function (t) { return t.length > 3 && /s$/.test(t) && !/ss$/.test(t) ? t.slice(0, -1) : t; }).join(" ");
  }
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, p = [], c, t;
    if (Math.abs(m - n) > 4) return 9;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { c = [i]; for (j = 1; j <= n; j++) { t = a[i - 1] === b[j - 1] ? 0 : 1; c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + t); } p = c; }
    return p[n];
  }
  function match(phrase) {
    var q = norm(phrase), i, e, hits, toks, best = [], d;
    if (!q) return { st: "none", sugg: [] };
    if (EXACT[q]) return { st: "exact", sp: EXACT[q] };
    [q.split(" "), q.split(" ").filter(function (t) { return !STOP[t]; })].forEach(function (toks) {
      if (hits && hits.length === 1 || !toks.length) return;
      hits = TAX.filter(function (x) { return toks.every(function (t) { return x.tk.indexOf(t) > -1; }); });
    });
    if (hits && hits.length === 1) return { st: "partial", sp: hits[0] };
    if (hits && hits.length > 1 && hits.length <= 5) return { st: "amb", sugg: hits.slice(0, 4) };
    for (i = 0; i < TAX.length; i++) { e = TAX[i]; d = Math.min(lev(q, e.nn), lev(q, e.ns)); if (d <= 3) best.push([d, e]); }
    best.sort(function (a, b) { return a[0] - b[0]; });
    if (best.length && best[0][0] <= 1 && q.length >= 7 && (best.length === 1 || best[1][0] > 1)) return { st: "fixed", sp: best[0][1] };
    if (best.length && best[0][0] <= Math.max(2, Math.round(q.length * 0.3))) return { st: "sugg", sugg: best.slice(0, 3).map(function (x) { return x[1]; }) };
    return { st: "none", sugg: [] };
  }

  /* ------------------------------------------------------------ parsing */
  var UNSURE = /\?|\b(maybe|possibly|probably|possible|perhaps|i think|not sure|unsure|only heard|heard only|just heard)\b/i;
  var UNSURE_G = new RegExp(UNSURE.source, "gi");
  var DELIM = /\s+(?:at|near|in|on|by|from|with|over|crossing|calling|perched|bathing|flying\s+(?:over|past|around|above)|feeding|just|only|something|it)\b|[,;()–—]|\s-\s/i;
  function parse(text) {
    var days = [], cur = null, id = 0;
    function day(title) { cur = { n: days.length + 1, title: title || "", place: title || "", weather: "", notes: [], sightings: [] }; days.push(cur); }
    String(text || "").split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim(), m, rest, time = "", count = 0, star = false, unc, phrase, note, mm;
      if (!line) return;
      m = line.match(/^(?:day|d[ií]a)\s*(\d+)?\s*[:–—-]*\s*(.*)$/i);
      if (m && (m[1] || !cur)) { day(m[2]); return; }
      if (!cur) day("");
      m = line.match(/^(?:weather|tiempo|clima)\s*[:\-]\s*(.+)$/i);
      if (m) { cur.weather = m[1].replace(/\.$/, ""); return; }
      m = line.match(/^(?:place|lugar|location)\s*[:\-]\s*(.+)$/i);
      if (m) { cur.place = m[1]; return; }
      rest = line.replace(/^[-*•]\s*/, "");
      if ((mm = rest.match(/^(\d{1,2})[:.h](\d{2})\s*/))) { time = ("0" + mm[1]).slice(-2) + ":" + mm[2]; rest = rest.slice(mm[0].length); }
      if (/!+\s*$/.test(rest) || /\bstar\b/i.test(rest)) star = true;
      rest = rest.replace(/!+\s*$/, "").replace(/\bstar\b/i, "").trim();
      if ((mm = rest.match(/(?:^|\s)[x×]\s*(\d+)\b/i)) || (mm = rest.match(/\b(\d+)\s*[x×](?:\s|$)/i)) || (mm = rest.match(/\((\d+)\)/)) || (mm = rest.match(/^(\d+)\s+(?=[A-Za-z])/)) || (mm = rest.match(/~\s*(\d+)/))) { count = +mm[1]; rest = rest.replace(mm[0], " ").replace(/\s{2,}/g, " ").trim(); }
      unc = UNSURE.test(rest);
      rest = rest.replace(UNSURE_G, " ").replace(/^(?:a|an|the|some)\s+/i, "").replace(/\s{2,}/g, " ").trim();
      mm = rest.search(DELIM);
      phrase = mm > 0 ? rest.slice(0, mm) : rest;
      note = mm > 0 ? rest.slice(mm).replace(/^[\s,;()–—-]+/, "").replace(/\)$/, "").trim() : "";
      phrase = phrase.replace(/^(?:a|an|the|some)\s+/i, "").trim();
      if (!phrase) { cur.notes.push(line); return; }
      cur.sightings.push({ id: ++id, raw: line, time: time, count: count, note: note, star: star, unc: unc, phrase: phrase, m: match(phrase), kind: "sp", sp: null, done: false });
    });
    days.forEach(function (d) { d.sightings.forEach(function (s) { init(s); }); });
    return days;
  }
  function init(s) {
    if (s.m.st === "exact" || s.m.st === "partial" || s.m.st === "fixed") s.sp = s.m.sp;
    s.done = !!s.sp && !s.unc;
  }

  /* ------------------------------------------------------------ report model */
  function aggregate(days) {
    var map = {}, order = [];
    days.forEach(function (d) {
      d.sightings.forEach(function (s) {
        if (s.kind !== "sp" || !s.sp || !s.done) return;
        var k = s.sp.s, r = map[k];
        if (!r) { r = map[k] = { sp: s.sp, total: 0, exact: true, days: [], first: d.n, star: false, fixed: false }; order.push(r); }
        if (!s.count) r.exact = false;
        r.total += s.count || 1;
        if (r.days.indexOf(d.n) < 0) r.days.push(d.n);
        if (s.star) r.star = true;
        if (s.m.st === "fixed" || s.m.st === "partial" || s.m.st === "sugg" || s.m.st === "amb") r.fixed = true;
      });
    });
    return order;
  }
  function pending(days) {
    var out = [];
    days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.kind === "sp" && !s.done) out.push(s); }); });
    return out;
  }
  function join(list, lang) {
    if (list.length < 2) return list.join("");
    var and = lang === "es" ? " y " : " and ";
    return list.slice(0, -1).join(", ") + and + list[list.length - 1];
  }
  function item(s, withNote) {
    var t = s.sp.n + (s.count > 1 ? " (×" + s.count + ")" : "");
    if (withNote && s.note) t += " " + s.note.replace(/^\s+/, "");
    return t;
  }
  function narrative(d, seenBefore, st) {
    var R = RT[st.lang], tone = R[TONEKEY[st.tone]], good = d.sightings.filter(function (s) { return s.kind === "sp" && s.sp && s.done; }), stars, others, fresh = 0, seen = {}, txt;
    good.forEach(function (s) { if (!seenBefore[s.sp.s] && !seen[s.sp.s]) fresh++; seen[s.sp.s] = 1; });
    txt = tone.open(d.n, place(d)) + (d.weather ? tone.wx(d.weather) : "");
    if (!good.length) return txt + tone.quiet;
    stars = good.filter(function (s) { return s.star; }).slice(0, 4);
    if (!stars.length) stars = good.slice().sort(function (a, b) { return (b.count || 1) - (a.count || 1) || (b.note ? 1 : 0) - (a.note ? 1 : 0); }).slice(0, 2);
    others = good.filter(function (s) { return stars.indexOf(s) < 0; });
    var uniq = {}; others = others.filter(function (s) { if (uniq[s.sp.s]) return false; uniq[s.sp.s] = 1; return true; });
    txt += tone.star(join(stars.map(function (s) { return item(s, true); }), st.lang));
    if (others.length) txt += tone.rest(join(others.slice(0, 8).map(function (s) { return item(s, false); }), st.lang));
    txt += tone.fresh(fresh);
    good.forEach(function (s) { seenBefore[s.sp.s] = 1; });
    return txt;
  }
  function place(d) { return (d.place || "").replace(/^\s+|\s+$/g, ""); }

  /* ------------------------------------------------------------ places for the route map */
  function locate(name) {
    var n = norm(name), k, best = null;
    if (!n) return null;
    for (k in PLACES) { if (n.indexOf(k) > -1 && (!best || k.length > best.k.length)) best = { k: k, ll: PLACES[k] }; }
    return best && best.ll;
  }
  function mapSvg(days, accent) {
    var pts = [], seen = {};
    days.forEach(function (d) { var ll = locate(place(d)); if (ll) { var key = ll.join(); if (!seen[key]) { seen[key] = 1; pts.push({ n: d.n, name: place(d), ll: ll }); } } });
    if (pts.length < 2) return "";
    var la0 = pts.reduce(function (a, p) { return a + p.ll[0]; }, 0) / pts.length, k = Math.cos(la0 * Math.PI / 180);
    var xs = pts.map(function (p) { return p.ll[1] * k; }), ys = pts.map(function (p) { return -p.ll[0]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys), w = 560, h = 220, pad = 46;
    var sc = Math.min((w - 2 * pad) / Math.max(x1 - x0, 0.05), (h - 2 * pad) / Math.max(y1 - y0, 0.05));
    var cx = (w - sc * (x1 - x0)) / 2, cy = (h - sc * (y1 - y0)) / 2;
    var P = pts.map(function (p, i) { return [cx + (xs[i] - x0) * sc, cy + (ys[i] - y0) * sc]; });
    var s = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(T.route) + '"><rect width="' + w + '" height="' + h + '" rx="10" class="tr-map-bg"/>';
    s += '<path d="M' + P.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + '" fill="none" stroke="' + accent + '" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>';
    P.forEach(function (p, i) {
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="11" fill="' + accent + '"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="middle" class="tr-map-n">' + pts[i].n + "</text>";
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 26).toFixed(1) + '" text-anchor="middle" class="tr-map-l">' + esc(pts[i].name.split(",")[0].slice(0, 26)) + "</text>";
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ state and rendering */
  var st = { days: [], tone: 0, lang: LANG, color: SWATCHES[0], op: "", guide: "", photos: [], approved: false, when: "", generated: false };
  var el = {};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }

  function shell() {
    root.innerHTML =
      '<div class="tr-grid">' +
      '<section class="tr-card tr-in"><h3>' + T.s1 + '</h3><p class="tr-sub">' + T.s1h + '</p>' +
      '<div class="tr-samples"><span>' + T.samples + '</span>' + T.sampleNames.map(function (n, i) { return '<button type="button" class="tr-chip" data-sample="' + i + '">' + n + "</button>"; }).join("") + "</div>" +
      '<textarea id="tr-notes" spellcheck="false" placeholder="' + esc(T.ph) + '" aria-label="' + esc(T.s1) + '"></textarea>' +
      '<div class="tr-tools"><button type="button" class="tr-btn ghost" id="tr-dict" hidden>' + T.dictate + '</button><label class="tr-btn ghost" for="tr-photos">' + T.photos + '</label><input type="file" id="tr-photos" accept="image/*" multiple hidden><button type="button" class="tr-btn ghost" id="tr-clear">' + T.clear + '</button><span class="tr-note">' + T.photosNote + "</span></div>" +
      '<div class="tr-opts"><label>' + T.operator + '<input id="tr-op" maxlength="40" placeholder="Canopy Trails"></label><label>' + T.guide + '<input id="tr-guide" maxlength="30" placeholder="Nok"></label>' +
      "<label>" + T.tone + '<select id="tr-tone">' + T.tones.map(function (t, i) { return '<option value="' + i + '">' + t + "</option>"; }).join("") + "</select></label>" +
      "<label>" + T.rlang + '<select id="tr-lang"><option value="en">English</option><option value="es">Español</option></select></label>' +
      '<div class="tr-sw" role="group" aria-label="' + esc(T.color) + '">' + SWATCHES.map(function (c, i) { return '<button type="button" class="tr-swatch' + (i ? "" : " on") + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join("") + "</div></div>" +
      '<button type="button" class="tr-btn" id="tr-go">' + T.go + " →</button></section>" +
      '<section class="tr-card tr-check" id="tr-check" hidden><h3>' + T.s2 + '</h3><p class="tr-sub">' + T.s2h + '</p><div id="tr-flags"></div></section>' +
      "</div>" +
      '<section class="tr-card tr-out" id="tr-out" hidden><h3 class="tr-h3">' + T.s3 + '</h3><div id="tr-report"></div><div id="tr-gate"></div></section>' +
      '<p class="tr-fine">' + T.unsure + "</p>";
    el.notes = $("#tr-notes"); el.op = $("#tr-op"); el.guide = $("#tr-guide"); el.tone = $("#tr-tone"); el.lang = $("#tr-lang");
    el.lang.value = st.lang;
  }

  function loadSample(i) {
    var s = SAMPLES[i];
    el.notes.value = s.text; el.op.value = s.op; el.guide.value = s.guide;
    st.photos = s.photos.map(function (p) { return { src: p[0], sp: p[1] }; });
    st.color = SWATCHES[i % 4]; swatch(st.color);
    generate();
  }
  function swatch(c) { st.color = c; Array.prototype.forEach.call(root.querySelectorAll(".tr-swatch"), function (b) { b.classList.toggle("on", b.dataset.c === c); }); if (st.generated) draw(); }

  function generate() {
    var txt = el.notes.value;
    if (!txt.trim()) { flash($("#tr-go"), T.emptyNotes); return; }
    st.days = parse(txt); st.approved = false; st.generated = true;
    st.op = el.op.value.trim() || "Your Tours"; st.guide = el.guide.value.trim();
    st.tone = +el.tone.value; st.lang = el.lang.value;
    draw();
    var t = $("#tr-check"); if (t && !t.hidden && matchMedia("(prefers-reduced-motion:no-preference)").matches) t.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function flash(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1800); }

  function draw() { flags(); report(); gate(); }

  /* flagged sightings */
  function flags() {
    var all = [], ok = 0, f = [], box = $("#tr-check"), cont = $("#tr-flags");
    st.days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.kind === "sp") all.push([d, s]); }); });
    var sp = aggregate(st.days).length;
    f = all.filter(function (x) { return !x[1].done; });
    box.hidden = false;
    var head = '<div class="tr-sumline"><strong>' + sp + "</strong> " + T.matched + ' · <strong class="' + (f.length ? "warn" : "ok") + '">' + f.length + "</strong> " + T.flagged + "</div>";
    if (!f.length) { cont.innerHTML = head + '<p class="tr-allgood">✓ ' + T.none + "</p>" + infoChips(all); return; }
    cont.innerHTML = head + f.map(function (x) { return flagCard(x[0], x[1]); }).join("") + infoChips(all);
  }
  function infoChips(all) {
    var fixed = all.filter(function (x) { var s = x[1]; return s.done && (s.m.st === "fixed" || s.m.st === "partial"); });
    if (!fixed.length) return "";
    return '<div class="tr-info">' + fixed.map(function (x) { var s = x[1]; return '<span class="tr-pill">' + (s.m.st === "fixed" ? T.fixedChip : T.partChip) + ": “" + esc(s.phrase) + "” → <b>" + esc(s.sp.n) + "</b></span>"; }).join("") + "</div>";
  }
  function reason(s) {
    if (s.unc && s.sp) return T.reasonUnc;
    if (s.unc && s.m.st === "none") return T.reasonUnc + " · " + T.reasonNone;
    if (s.unc) return T.reasonUnc;
    if (s.m.st === "amb") return T.reasonAmb;
    if (s.m.st === "sugg") return T.reasonSug;
    return T.reasonNone;
  }
  function flagCard(d, s) {
    var sug = s.sp ? [s.sp] : (s.m.sugg || []), h = '<article class="tr-flag" data-id="' + s.id + '" data-day="' + d.n + '"><div class="tr-flag-top"><span class="tr-day">' + RT[st.lang].day.slice(0, 3) + " " + d.n + (s.time ? " · " + s.time : "") + '</span><q>' + esc(s.raw) + "</q></div><p class=\"tr-why\">" + reason(s) + "</p><div class=\"tr-acts\">";
    sug.forEach(function (x) { h += '<button type="button" class="tr-btn sm" data-act="pick" data-s="' + esc(x.s) + '">' + (s.sp ? T.confirm + " " : T.use + " ") + esc(x.n) + "</button>"; });
    h += '<input class="tr-type" list="tr-dl" placeholder="' + esc(T.typeSp) + '" aria-label="' + esc(T.typeSp) + '"><button type="button" class="tr-btn sm ghost" data-act="note">' + T.keepNote + '</button><button type="button" class="tr-btn sm ghost" data-act="rm">' + T.remove + "</button></div></article>";
    return h;
  }
  function find(id) { var r = null; st.days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.id === id) r = s; }); }); return r; }
  function bySci(sci) { return TAX.filter(function (x) { return x.s === sci; })[0]; }
  function bySpName(v) { var n = norm(v); return TAX.filter(function (x) { return x.nn === n || x.ns === n; })[0]; }

  /* the report */
  function report() {
    var R = RT[st.lang], order = aggregate(st.days), out = $("#tr-out"), seenBefore = {}, tot = 0, dayCount = st.days.length, html, i, photos;
    out.hidden = false;
    order.forEach(function (r) { tot += r.total; });
    html = '<article class="tr-report" style="--ac:' + st.color + '"><header class="tr-rh"><p class="tr-brand">' + esc(st.op) + '</p><h4>' + R.title + " · " + esc(tripName()) + "</h4>" + (st.guide ? '<p class="tr-by">' + R.by + ": " + esc(st.guide) + "</p>" : "") +
      '<div class="tr-stats"><div><strong>' + order.length + "</strong><span>" + R.species + "</span></div><div><strong>" + tot + "</strong><span>" + R.individuals + "</span></div><div><strong>" + dayCount + "</strong><span>" + R.days + "</span></div></div></header>";
    var m = mapSvg(st.days, st.color);
    if (m) html += '<div class="tr-map">' + m + "</div>";
    st.days.forEach(function (d) {
      var good = d.sightings.filter(function (s) { return s.kind === "sp" && s.sp && s.done; });
      html += '<section class="tr-day-block"><h5>' + R.day + " " + d.n + (place(d) ? " — " + esc(place(d)) : "") + "</h5><p>" + esc(narrative(d, seenBefore, st)) + "</p>";
      var notes = d.notes.filter(function (n) { return true; });
      if (notes.length) html += '<p class="tr-gnotes">' + notes.map(esc).join(" · ") + "</p>";
      html += "</section>";
    });
    if (st.photos.length) {
      html += '<section class="tr-gal"><h5>' + T.gallery + '</h5><div class="tr-photos">' + st.photos.map(function (p, i) { return '<figure><img src="' + esc(p.src) + '" alt="' + esc(T.photoCap + " " + (p.sp || "")) + '" loading="lazy"><figcaption>' + esc(p.sp || "") + "</figcaption></figure>"; }).join("") + "</div></section>";
    }
    html += '<section class="tr-list"><h5>' + T.checklist + '</h5><div class="tr-tw"><table><thead><tr><th>#</th><th>' + T.checklist.split(" ")[0] + '</th><th></th><th>' + T.days + "</th><th>" + T.count + "</th><th>" + T.status + "</th></tr></thead><tbody>";
    order.forEach(function (r, i) {
      html += "<tr><td>" + (i + 1) + '</td><td class="n">' + esc(r.sp.n) + (r.star ? ' <span class="tr-star" title="★">★</span>' : "") + '</td><td class="s">' + esc(r.sp.s) + "</td><td>" + r.days.join(", ") + "</td><td>" + (r.exact ? r.total : "≥" + r.total) + '</td><td><span class="tr-st' + (r.fixed ? " fx" : "") + '">' + (r.fixed ? T.corrected : T.confirmed) + "</span></td></tr>";
    });
    if (!order.length) html += '<tr><td colspan="6">' + T.noSp + "</td></tr>";
    html += '</tbody></table></div><p class="tr-fine2">' + R.names + "</p></section>";
    if (st.approved) html += '<footer class="tr-foot">✓ ' + R.approved + (st.guide ? " (" + esc(st.guide) + ")" : "") + " · " + esc(st.when) + "</footer>";
    html += "</article>";
    $("#tr-report").innerHTML = html;
    $("#tr-out").classList.toggle("is-approved", st.approved);
  }
  function tripName() {
    var ps = st.days.map(place).filter(Boolean), first = (ps[0] || "").split(/[,–-]/)[0].trim();
    return first || (LANG === "es" ? "Mi viaje" : "My trip");
  }

  /* approval gate and exports */
  function gate() {
    var g = $("#tr-gate"), left = pending(st.days).length, h;
    if (st.approved) {
      h = '<div class="tr-actions"><button type="button" class="tr-btn" data-x="print">' + T.print + '</button><button type="button" class="tr-btn ghost" data-x="copy">' + T.copy + '</button><button type="button" class="tr-btn ghost" data-x="csv">' + T.csv + '</button><button type="button" class="tr-btn ghost" data-x="json">' + T.json + '</button><button type="button" class="tr-btn ghost" data-x="edit">' + T.edit + "</button></div>" + dataPreview();
    } else {
      h = '<div class="tr-gate"><div><strong>' + T.approveHead + "</strong><span>" + (left ? T.approveWait + " (" + left + ")" : "✓") + '</span></div><button type="button" class="tr-btn" data-x="approve"' + (left ? " disabled" : "") + ">" + T.approve + "</button></div>";
    }
    g.innerHTML = h;
  }
  function rows() {
    var out = [];
    st.days.forEach(function (d) {
      var ll = locate(place(d));
      d.sightings.forEach(function (s) {
        if (s.kind !== "sp" || !s.sp || !s.done) return;
        out.push({ day: d.n, place: place(d), lat: ll ? ll[0] : null, lng: ll ? ll[1] : null, time: s.time || null, scientific_name: s.sp.s, common_name: s.sp.n, count: s.count || null, note: s.note || null, id_status: (s.m.st === "exact" ? "confirmed" : "guide_confirmed"), observer: st.guide || null, operator: st.op });
      });
    });
    return out;
  }
  function dataPreview() {
    var r = rows().slice(0, 4);
    return '<div class="tr-data"><h4>' + T.dataHead + "</h4><p>" + T.dataH + "</p><pre>" + esc(JSON.stringify(r, null, 1)) + "</pre></div>";
  }
  function plain() {
    var R = RT[st.lang], order = aggregate(st.days), seen = {}, t = st.op + " — " + R.title + " · " + tripName() + "\n\n";
    st.days.forEach(function (d) { t += R.day + " " + d.n + (place(d) ? " — " + place(d) : "") + "\n" + narrative(d, seen, st) + "\n\n"; });
    t += T.checklist + ":\n"; order.forEach(function (r, i) { t += (i + 1) + ". " + r.sp.n + " (" + r.sp.s + ") — " + (r.exact ? "" : "≥") + r.total + "\n"; });
    return t;
  }
  function download(name, mime, data) {
    var a = document.createElement("a"), u = URL.createObjectURL(new Blob([data], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
  }
  function csv() {
    var r = rows(), keys = r.length ? Object.keys(r[0]) : ["day", "scientific_name"];
    return "﻿" + [keys.join(",")].concat(r.map(function (o) { return keys.map(function (k) { var v = o[k] == null ? "" : String(o[k]); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); })).join("\n");
  }

  /* ------------------------------------------------------------ events */
  function bind() {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"), card, s, v, sp;
      if (!b) return;
      if (b.dataset.sample != null) return loadSample(+b.dataset.sample);
      if (b.classList.contains("tr-swatch")) return swatch(b.dataset.c);
      if (b.id === "tr-go") return generate();
      if (b.id === "tr-clear") { el.notes.value = ""; st.days = []; st.photos = []; st.generated = false; $("#tr-check").hidden = true; $("#tr-out").hidden = true; return; }
      if (b.id === "tr-dict") return dictate(b);
      if (b.dataset.act) {
        card = b.closest(".tr-flag"); s = find(+card.dataset.id); if (!s) return;
        if (b.dataset.act === "pick") { s.sp = bySci(b.dataset.s); s.unc = false; s.done = true; s.m = { st: "exact", sp: s.sp }; }
        if (b.dataset.act === "rm") s.kind = "removed";
        if (b.dataset.act === "note") { s.kind = "note"; st.days.forEach(function (d) { if (d.sightings.indexOf(s) > -1) d.notes.push(s.raw); }); }
        return draw();
      }
      if (b.dataset.x === "approve") { st.approved = true; st.when = new Date().toLocaleDateString(st.lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); return draw(); }
      if (b.dataset.x === "edit") { st.approved = false; return draw(); }
      if (b.dataset.x === "print") { document.documentElement.classList.add("tr-printing"); window.print(); return; }
      if (b.dataset.x === "copy") { v = plain(); (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { flash(b, T.copied); }, function () { var t = document.createElement("textarea"); t.value = v; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); flash(b, T.copied); } catch (x) {} t.remove(); }); return; }
      if (b.dataset.x === "csv") return download("trip-sightings.csv", "text/csv;charset=utf-8", csv());
      if (b.dataset.x === "json") return download("trip-sightings.json", "application/json", JSON.stringify(rows(), null, 2));
    });
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !e.target.classList.contains("tr-type")) return;
      var card = e.target.closest(".tr-flag"), s = find(+card.dataset.id), sp = bySpName(e.target.value.trim());
      if (sp && s) { s.sp = sp; s.unc = false; s.done = true; s.m = { st: "exact", sp: sp }; draw(); } else e.target.classList.add("bad");
    });
    root.addEventListener("change", function (e) {
      if (e.target.id === "tr-photos") {
        Array.prototype.forEach.call(e.target.files, function (f) { st.photos.push({ src: URL.createObjectURL(f), sp: "" }); });
        e.target.value = ""; if (st.generated) draw();
      }
      if (e.target.id === "tr-tone") { st.tone = +e.target.value; if (st.generated) draw(); }
      if (e.target.id === "tr-lang") { st.lang = e.target.value; if (st.generated) draw(); }
    });
    root.addEventListener("input", function (e) { if (e.target.id === "tr-op") { st.op = e.target.value.trim() || "Your Tours"; if (st.generated) report(); } if (e.target.id === "tr-guide") { st.guide = e.target.value.trim(); if (st.generated) report(); } });
    window.addEventListener("afterprint", function () { document.documentElement.classList.remove("tr-printing"); });
  }
  function dictate(btn) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, r;
    if (!SR) return;
    r = new SR(); r.lang = LANG === "es" ? "es-ES" : "en-GB"; r.interimResults = false; r.continuous = false;
    btn.textContent = T.dictating;
    r.onresult = function (ev) { var t = ev.results[0][0].transcript; el.notes.value += (el.notes.value && !/\n$/.test(el.notes.value) ? "\n" : "") + t.charAt(0).toUpperCase() + t.slice(1); };
    r.onend = r.onerror = function () { btn.textContent = T.dictate; };
    try { r.start(); } catch (x) { btn.textContent = T.dictate; }
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    shell(); bind();
    if (window.SpeechRecognition || window.webkitSpeechRecognition) $("#tr-dict").hidden = false;
    var dl = document.createElement("datalist"); dl.id = "tr-dl";
    dl.innerHTML = TAX.map(function (x) { return '<option value="' + esc(x.n) + '">'; }).join(""); root.appendChild(dl);
    loadSample(0);
  }
  function fail() { root.innerHTML = '<p class="tr-fine">' + (LANG === "es" ? "No se pudo cargar la demostración." : "The demo could not load.") + "</p>"; }

  Promise.all([
    fetch("/data/taxonomy-demo.json").then(function (r) { return r.json(); }),
    fetch("/data/stops.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    res[0].forEach(function (r) { var e = { n: r[0], s: r[1], nn: norm(r[0]), ns: norm(r[1]) }; e.tk = (e.nn + " " + e.ns).split(" "); TAX.push(e); EXACT[e.nn] = EXACT[e.nn] || e; EXACT[e.ns] = EXACT[e.ns] || e; });
    var stops = res[1], c, n;
    for (c in stops) for (n in stops[c]) PLACES[norm(n)] = stops[c][n];
    [["khao yai", [14.31, 101.53]], ["sigiriya", [7.954, 80.755]], ["wilpattu", [8.458, 80.052]], ["monteverde", [10.3, -84.82]], ["arenal", [10.46, -84.7]], ["yala", [6.37, 81.5]], ["kruger", [-23.99, 31.55]], ["masai mara", [-1.49, 35.14]], ["donana", [37.0, -6.44]], ["tortuguero", [10.54, -83.5]]].forEach(function (p) { PLACES[p[0]] = p[1]; });
    boot();
  }).catch(fail);
})();
