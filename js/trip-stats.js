/* Trip Reports demo: the guide's logbook and stats.
   Approved reports are saved in this browser (localStorage). The stats tab turns them into weekly, monthly, yearly
   and all-time figures a guide can show clients. A labelled, generated sample history is included so the charts have
   something to show; it is never stored and can be switched off. */
(function (g) {
  var TR = g.TR = g.TR || {};
  var KEY = "trip-logbook-v1";
  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "es" ? "es" : "en";
  var TXT = {
    en: {
      week: "Week", month: "Month", year: "Year", all: "All time", prev: "Previous", next: "Next",
      title: "Guide stats", sub: "Every approved report is saved to this logbook. These are the numbers a guide can show clients.",
      sample: "Include sample history", sampleNote: "Sample data: a generated guiding history so the charts are not empty. It is not real and is never saved.",
      mine: "Your saved reports", noMine: "Nothing saved yet. Approve a report and tick “Save to logbook” to add your own days.",
      tours: "Tours", days: "Guiding days", guests: "Guests", km: "Distance walked or driven (km)", species: "Species", indiv: "Individuals", newsp: "New species", perday: "Species per day",
      best: "Best day", photo: "Photo-backed", places: "Places",
      perChart: "Species per", cumChart: "Life list growth", topH: "What clients can expect to see", topSub: "Share of guiding days in this period on which the species was recorded.",
      sp: "Species", seen: "Days seen", chance: "Chance", ind: "Individuals", dates: "Dates", noData: "No guiding days in this period.", ofDays: "of", daysWord: "days",
      proofH: "Client proof card", proofSub: "A one-page summary a guide can show or print.", by: "Guide", period: "Period",
      foot: "Self-reported by the guide from approved trip reports. In the product every figure links back to the sightings and photos behind it.",
      print: "Print or save as PDF", copy: "Copy summary", copied: "Copied", csv: "Download sightings (CSV)", exp: "Export logbook", imp: "Import logbook", clearMine: "Delete my saved reports", confirmClear: "Click again to delete",
      saved: "Saved to your logbook", viewStats: "View stats", storeFail: "Your browser blocked local storage, so this logbook only lasts until you close the page.",
      newFirst: "first record in the logbook", tourWord: "tours", dayWord: "days", withPhoto: "with a photo", importOk: "Logbook imported", importBad: "That file is not a logbook",
      dow: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], bucketDay: "day", bucketMonth: "month", bucketYear: "year", weekOf: "Week of", sampleTag: "sample", timesSeen: "times"
    },
    es: {
      week: "Semana", month: "Mes", year: "Año", all: "Total", prev: "Anterior", next: "Siguiente",
      title: "Estadísticas del guía", sub: "Cada informe aprobado se guarda en este cuaderno. Estas son las cifras que un guía puede enseñar a sus clientes.",
      sample: "Incluir historial de ejemplo", sampleNote: "Datos de ejemplo: un historial de guiado generado para que los gráficos no estén vacíos. No es real y nunca se guarda.",
      mine: "Tus informes guardados", noMine: "Aún no hay nada guardado. Aprueba un informe y marca «Guardar en el cuaderno» para añadir tus propios días.",
      tours: "Salidas", days: "Días de guiado", guests: "Clientes", km: "Distancia recorrida (km)", species: "Especies", indiv: "Individuos", newsp: "Especies nuevas", perday: "Especies por día",
      best: "Mejor día", photo: "Con foto", places: "Lugares",
      perChart: "Especies por", cumChart: "Crecimiento de la lista de vida", topH: "Qué pueden esperar ver los clientes", topSub: "Porcentaje de días de guiado de este periodo en que se registró la especie.",
      sp: "Especie", seen: "Días vista", chance: "Probabilidad", ind: "Individuos", dates: "Fechas", noData: "No hay días de guiado en este periodo.", ofDays: "de", daysWord: "días",
      proofH: "Ficha para clientes", proofSub: "Un resumen de una página que el guía puede enseñar o imprimir.", by: "Guía", period: "Periodo",
      foot: "Datos aportados por el guía a partir de informes aprobados. En el producto cada cifra enlaza con los avistamientos y las fotos que la respaldan.",
      print: "Imprimir o guardar en PDF", copy: "Copiar resumen", copied: "Copiado", csv: "Descargar avistamientos (CSV)", exp: "Exportar cuaderno", imp: "Importar cuaderno", clearMine: "Borrar mis informes guardados", confirmClear: "Pulsa otra vez para borrar",
      saved: "Guardado en tu cuaderno", viewStats: "Ver estadísticas", storeFail: "Tu navegador bloqueó el almacenamiento local, así que este cuaderno solo dura hasta cerrar la página.",
      newFirst: "primer registro del cuaderno", tourWord: "salidas", dayWord: "días", withPhoto: "con foto", importOk: "Cuaderno importado", importBad: "Ese archivo no es un cuaderno",
      dow: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], bucketDay: "día", bucketMonth: "mes", bucketYear: "año", weekOf: "Semana del", sampleTag: "ejemplo", timesSeen: "veces"
    }
  };
  var T = TXT[LANG];
  var SAMPLE_SCI = ["Buceros bicornis", "Hylobates lar", "Elephas maximus indicus", "Macaca leonina", "Harpactes erythrocephalus", "Nyctyornis athertoni", "Merops leschenaulti", "Trimeresurus macrops", "Physignathus cocincinus", "Muntiacus vaginalis", "Rusa unicolor cambojensis", "Hystrix brachyura", "Bungarus candidus", "Tamiops rodolphii", "Callosciurus finlaysonii", "Pycnonotus aurigaster", "Chrysopelea ornata", "Prionailurus bengalensis", "Rhyticeros undulatus", "Polypedates maculatus", "Amaurornis phoenicurus", "Calotes versicolor", "Varanus salvator", "Draco maculatus", "Pavo cristatus", "Bubalus arnee"];
  var SAMPLE_PLACES = ["Khao Yai, visitor centre trail", "Khao Yai, Haew Suwat trail", "Khao Yai, Nong Phak Chi hide", "Khao Yai, Pa Kluai Mai road", "Khao Yai, night drive"];
  var WXKEYS = ["sunny", "cloudy", "rain", "clear", "hot", "cool", "humid"];
  var state = { period: "month", anchor: new Date(), sample: true, tax: null, mem: null, root: null, confirm: false };

  /* ---------------------------------------------------------- dates */
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dt(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2], 12); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function monday(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), k = (x.getDay() + 6) % 7; return addDays(x, -k); }
  function loc() { return LANG === "es" ? "es-ES" : "en-GB"; }
  function fmt(d, o) { try { return d.toLocaleDateString(loc(), o); } catch (e) { return iso(d); } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------------------------------------------------------- storage */
  function loadMine() {
    if (state.mem) return state.mem;
    try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); return (j && j.trips) || []; } catch (e) { return []; }
  }
  function saveMine(trips) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, trips: trips })); state.mem = null; return true; } catch (e) { state.mem = trips; return false; }
  }

  /* ---------------------------------------------------------- generated sample history */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  var sampleCache = null;
  function sampleTrips() {
    if (sampleCache) return sampleCache;
    var tax = state.tax || [], by = {}, r = rng(777), pool = [], trips = [], today = new Date(), d, cur = null, left = 0, n = 0, i;
    tax.forEach(function (e) { by[e.s] = e; });
    SAMPLE_SCI.forEach(function (s, k) { if (by[s]) pool.push({ e: by[s], p: Math.max(0.06, 0.9 - k * 0.032) }); });
    if (!pool.length) return (sampleCache = []);
    today.setHours(12, 0, 0, 0);
    d = addDays(today, -430);
    while (d <= today) {
      if (!cur && r() < 0.2) { cur = { id: "sample-" + (++n), sample: true, op: "Sample Tours", guide: "Sample guide", name: "Khao Yai", start: iso(d), days: [] }; left = 2 + Math.floor(r() * 4); }
      if (cur) {
        var wx = WXKEYS[Math.floor(r() * WXKEYS.length)], f = wx === "rain" ? 0.65 : 1, day = { date: iso(d), place: SAMPLE_PLACES[Math.floor(r() * SAMPLE_PLACES.length)], guests: 2 + Math.floor(r() * 7), km: Math.round((5 + r() * 18) * 10) / 10, weather: [wx], sightings: [] };
        pool.forEach(function (x) {
          if (r() < x.p * f) {
            var c = 1 + Math.floor(r() * r() * 9), h = 5 + Math.floor(r() * 14);
            day.sightings.push({ sci: x.e.s, n: x.e.n, es: x.e.es || "", count: c, approx: false, time: p2(h) + ":" + p2(Math.floor(r() * 4) * 15), star: r() < 0.08, photo: r() < 0.45 });
          }
        });
        cur.days.push(day);
        if (--left <= 0) { trips.push(cur); cur = null; }
      }
      d = addDays(d, 1);
    }
    if (cur) trips.push(cur);
    return (sampleCache = trips);
  }

  /* ---------------------------------------------------------- public logbook API */
  TR.log = {
    mine: loadMine,
    add: function (trip) {
      var t = loadMine().filter(function (x) { return x.id !== trip.id; });
      t.push(trip);
      var ok = saveMine(t);
      if (state.root) render();
      return { ok: ok, count: t.length };
    },
    init: function (tax) { state.tax = tax; sampleCache = null; },
    mount: function (el) { state.root = el; state.sample = !loadMine().length; render(); },
    refresh: function () { if (state.root) render(); },
    pickAnchorFromTrips: function () {
      var m = loadMine(), last = null;
      m.forEach(function (t) { t.days.forEach(function (d) { if (!last || d.date > last) last = d.date; }); });
      if (last) state.anchor = dt(last);
    },
    hasMine: function () { return loadMine().length; }
  };

  /* ---------------------------------------------------------- computing */
  function allDays() {
    var out = [];
    var src = loadMine().concat(state.sample ? sampleTrips() : []);
    src.forEach(function (t) { t.days.forEach(function (d) { out.push({ trip: t, day: d }); }); });
    out.sort(function (a, b) { return a.day.date < b.day.date ? -1 : a.day.date > b.day.date ? 1 : 0; });
    return out;
  }
  function range(type, anchor, all) {
    var a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12), s, e;
    if (type === "week") { s = monday(a); e = addDays(s, 6); }
    else if (type === "month") { s = new Date(a.getFullYear(), a.getMonth(), 1, 12); e = new Date(a.getFullYear(), a.getMonth() + 1, 0, 12); }
    else if (type === "year") { s = new Date(a.getFullYear(), 0, 1, 12); e = new Date(a.getFullYear(), 11, 31, 12); }
    else { s = all.length ? dt(all[0].day.date) : a; e = all.length ? dt(all[all.length - 1].day.date) : a; }
    return { s: s, e: e, a: iso(s), b: iso(e) };
  }
  function label(type, rg) {
    if (type === "week") return T.weekOf + " " + fmt(rg.s, { day: "numeric", month: "short" }) + " – " + fmt(rg.e, { day: "numeric", month: "short", year: "numeric" });
    if (type === "month") return fmt(rg.s, { month: "long", year: "numeric" });
    if (type === "year") return String(rg.s.getFullYear());
    return fmt(rg.s, { month: "short", year: "numeric" }) + " – " + fmt(rg.e, { month: "short", year: "numeric" });
  }
  function buckets(type, rg) {
    var out = [], d, k;
    if (type === "week" || type === "month") { for (d = new Date(rg.s.getTime()); d <= rg.e; d = addDays(d, 1)) out.push({ a: iso(d), b: iso(d), lab: type === "week" ? T.dow[(d.getDay() + 6) % 7] : String(d.getDate()) }); }
    else if (type === "year") { for (k = 0; k < 12; k++) { var s = new Date(rg.s.getFullYear(), k, 1, 12), e = new Date(rg.s.getFullYear(), k + 1, 0, 12); out.push({ a: iso(s), b: iso(e), lab: fmt(s, { month: "short" }) }); } }
    else {
      var months = (rg.e.getFullYear() - rg.s.getFullYear()) * 12 + rg.e.getMonth() - rg.s.getMonth() + 1;
      if (months <= 30) { for (k = 0; k < months; k++) { var s2 = new Date(rg.s.getFullYear(), rg.s.getMonth() + k, 1, 12), e2 = new Date(s2.getFullYear(), s2.getMonth() + 1, 0, 12); out.push({ a: iso(s2), b: iso(e2), lab: fmt(s2, { month: "short" }).slice(0, 3) + (s2.getMonth() === 0 || k === 0 ? " " + String(s2.getFullYear()).slice(2) : "") }); } }
      else { for (k = rg.s.getFullYear(); k <= rg.e.getFullYear(); k++) out.push({ a: k + "-01-01", b: k + "-12-31", lab: String(k) }); }
    }
    return out;
  }
  function compute() {
    var all = allDays(), rg = range(state.period, state.anchor, all), inR = all.filter(function (x) { return x.day.date >= rg.a && x.day.date <= rg.b; });
    var first = {}, sp = {}, tours = {}, places = {}, km = 0, guests = 0, ind = 0, photoS = 0, totS = 0, best = null, i;
    all.forEach(function (x) { x.day.sightings.forEach(function (s) { if (!first[s.sci] || x.day.date < first[s.sci]) first[s.sci] = x.day.date; }); });
    inR.forEach(function (x) {
      var d = x.day, set = {};
      tours[x.trip.id] = 1; km += d.km || 0; guests += d.guests || 0;
      if (d.place) places[d.place.split(",")[0].trim()] = 1;
      d.sightings.forEach(function (s) {
        set[s.sci] = 1; totS++; if (s.photo) photoS++; ind += s.count || 1;
        var r = sp[s.sci] || (sp[s.sci] = { sci: s.sci, n: s.n, es: s.es, days: {}, ind: 0, photoDays: 0, dates: [] });
        if (!r.days[d.date]) { r.days[d.date] = 1; r.dates.push(d.date); }
        r.ind += s.count || 1; if (s.photo) r.photoDays++;
      });
      var cnt = Object.keys(set).length;
      if (!best || cnt > best.n) best = { n: cnt, date: d.date, place: d.place };
    });
    var dayKeys = {}; inR.forEach(function (x) { dayKeys[x.day.date + "|" + x.trip.id] = 1; });
    var nDays = Object.keys(dayKeys).length, spList = Object.keys(sp).map(function (k) { return sp[k]; });
    spList.forEach(function (r) { r.seen = r.dates.length; r.pct = nDays ? r.seen / nDays : 0; });
    spList.sort(function (a, b) { return b.seen - a.seen || b.ind - a.ind; });
    var newSp = spList.filter(function (r) { return first[r.sci] >= rg.a && first[r.sci] <= rg.b; }).length;
    var sumSp = 0; inR.forEach(function (x) { sumSp += new Set ? new Set(x.day.sightings.map(function (s) { return s.sci; })).size : 0; });
    /* charts */
    var bk = buckets(state.period, rg), per = bk.map(function (b) {
      var set = {}, any = 0; inR.forEach(function (x) { if (x.day.date >= b.a && x.day.date <= b.b) { any++; x.day.sightings.forEach(function (s) { set[s.sci] = 1; }); } });
      return { lab: b.lab, v: Object.keys(set).length, any: any, a: b.a, b: b.b };
    });
    var seenSoFar = {}, ai = 0, cum = bk.map(function (b) {
      while (ai < all.length && all[ai].day.date <= b.b) { if (all[ai].day.date >= rg.a) all[ai].day.sightings.forEach(function (s) { seenSoFar[s.sci] = 1; }); ai++; }
      return { lab: b.lab, v: Object.keys(seenSoFar).length };
    });
    return { rg: rg, all: all, inR: inR, nDays: nDays, tours: Object.keys(tours).length, guests: guests, km: Math.round(km), species: spList.length, ind: ind, newSp: newSp, perDay: nDays ? Math.round(sumSp / nDays * 10) / 10 : 0, best: best, photoPct: totS ? Math.round(photoS / totS * 100) : 0, places: Object.keys(places), top: spList, per: per, cum: cum, totS: totS, photoS: photoS };
  }

  /* ---------------------------------------------------------- drawing */
  function nm(r) { return LANG === "es" && r.es ? r.es : r.n; }
  function bars(data, unit) {
    var w = 560, h = 150, pl = 26, pb = 22, pt = 10, max = Math.max.apply(0, data.map(function (d) { return d.v; }).concat([1])), bw = (w - pl) / data.length, s = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" class="ts-svg">';
    var step = Math.max(1, Math.ceil(data.length / 12)), ticks = [0, Math.round(max / 2), max];
    ticks.forEach(function (t) { var y = pt + (h - pt - pb) * (1 - t / max); s += '<line x1="' + pl + '" x2="' + w + '" y1="' + y + '" y2="' + y + '" class="ts-grid"/><text x="' + (pl - 4) + '" y="' + (y + 3) + '" text-anchor="end" class="ts-ax">' + t + "</text>"; });
    data.forEach(function (d, i) {
      var bh = (h - pt - pb) * (d.v / max), x = pl + i * bw + bw * 0.14, ww = Math.max(bw * 0.72, 1.5);
      s += '<rect x="' + x.toFixed(1) + '" y="' + (h - pb - bh).toFixed(1) + '" width="' + ww.toFixed(1) + '" height="' + Math.max(bh, d.v ? 1.5 : 0).toFixed(1) + '" rx="2" class="ts-bar"><title>' + esc(d.lab + ": " + d.v + " " + unit) + "</title></rect>";
      if (i % step === 0) s += '<text x="' + (x + ww / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" class="ts-ax">' + esc(d.lab) + "</text>";
    });
    return s + "</svg>";
  }
  function line(data, unit) {
    var w = 560, h = 150, pl = 26, pb = 22, pt = 10, max = Math.max.apply(0, data.map(function (d) { return d.v; }).concat([1])), n = data.length, step = Math.max(1, Math.ceil(n / 12)), s = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" class="ts-svg">', pts;
    [0, Math.round(max / 2), max].forEach(function (t) { var y = pt + (h - pt - pb) * (1 - t / max); s += '<line x1="' + pl + '" x2="' + w + '" y1="' + y + '" y2="' + y + '" class="ts-grid"/><text x="' + (pl - 4) + '" y="' + (y + 3) + '" text-anchor="end" class="ts-ax">' + t + "</text>"; });
    pts = data.map(function (d, i) { return [pl + (n === 1 ? (w - pl) / 2 : i * (w - pl - 8) / (n - 1)), pt + (h - pt - pb) * (1 - d.v / max)]; });
    s += '<path d="M' + pts[0][0].toFixed(1) + " " + (h - pb) + "L" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + "L" + pts[n - 1][0].toFixed(1) + " " + (h - pb) + 'Z" class="ts-area"/>';
    s += '<path d="M' + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + '" class="ts-line" fill="none"/>';
    data.forEach(function (d, i) { if (i % step === 0) s += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" class="ts-ax">' + esc(d.lab) + "</text>"; });
    pts.forEach(function (p, i) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (n > 40 ? 1.6 : 3) + '" class="ts-dot"><title>' + esc(data[i].lab + ": " + data[i].v + " " + unit) + "</title></circle>"; });
    return s + "</svg>";
  }
  function kpi(v, l, sub) { return '<div class="ts-kpi"><strong>' + v + "</strong><span>" + l + "</span>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>"; }
  function pct(x) { return Math.round(x * 100) + "%"; }

  function render() {
    var c = compute(), root = state.root, mine = loadMine(), unit = state.period === "week" || state.period === "month" ? T.bucketDay : state.period === "year" ? T.bucketMonth : (c.per.length && c.per[0].lab.length === 4 ? T.bucketYear : T.bucketMonth);
    var h = '<div class="ts-wrap"><div class="ts-head"><div><h3>' + T.title + "</h3><p class=\"tr-sub\">" + T.sub + "</p></div>" +
      '<label class="ts-sample"><input type="checkbox" id="ts-sample"' + (state.sample ? " checked" : "") + "> " + T.sample + "</label></div>";
    if (state.sample) h += '<p class="ts-badge">' + T.sampleNote + "</p>";
    h += '<div class="ts-bar-top"><div class="ts-tabs" role="tablist">' + ["week", "month", "year", "all"].map(function (k) { return '<button type="button" role="tab" aria-selected="' + (state.period === k) + '" class="ts-tab' + (state.period === k ? " on" : "") + '" data-p="' + k + '">' + T[k] + "</button>"; }).join("") + "</div>" +
      '<div class="ts-nav"><button type="button" class="tr-btn sm ghost" data-nav="-1" aria-label="' + T.prev + '"' + (state.period === "all" ? " disabled" : "") + '>‹</button><strong>' + esc(label(state.period, c.rg)) + '</strong><button type="button" class="tr-btn sm ghost" data-nav="1" aria-label="' + T.next + '"' + (state.period === "all" ? " disabled" : "") + ">›</button></div></div>";
    if (!c.nDays) {
      h += '<p class="ts-empty">' + T.noData + "</p>";
    } else {
      h += '<div class="ts-kpis">' + kpi(c.tours, T.tours) + kpi(c.nDays, T.days) + kpi(c.guests, T.guests) + kpi(c.km, T.km) + kpi(c.species, T.species) + kpi(c.ind, T.indiv) + kpi(c.newSp, T.newsp) + kpi(c.perDay, T.perday) +
        kpi(c.best ? c.best.n : 0, T.best, c.best ? esc(fmt(dt(c.best.date), { day: "numeric", month: "short" })) : "") + kpi(c.photoPct + "%", T.photo, c.photoS + " / " + c.totS) + kpi(c.places.length, T.places) + "</div>";
      h += '<div class="ts-charts"><figure><figcaption>' + T.perChart + " " + unit + "</figcaption>" + bars(c.per, T.species.toLowerCase()) + "</figure><figure><figcaption>" + T.cumChart + "</figcaption>" + line(c.cum, T.species.toLowerCase()) + "</figure></div>";
      h += '<div class="ts-top"><h4>' + T.topH + '</h4><p class="tr-sub">' + T.topSub + '</p><div class="tr-tw"><table><thead><tr><th>#</th><th>' + T.sp + "</th><th>" + T.seen + '</th><th colspan="2">' + T.chance + "</th><th>" + T.ind + "</th><th>" + T.dates + "</th></tr></thead><tbody>";
      c.top.slice(0, 12).forEach(function (r, i) {
        h += "<tr><td>" + (i + 1) + '</td><td class="n">' + esc(nm(r)) + ' <span class="s">' + esc(r.sci) + "</span></td><td>" + r.seen + " " + T.ofDays + " " + c.nDays + '</td><td class="ts-pc"><i style="width:' + Math.max(2, Math.round(r.pct * 100)) + '%"></i></td><td>' + pct(r.pct) + "</td><td>" + r.ind + "</td><td><details><summary>" + r.photoDays + " " + T.withPhoto + "</summary><p>" + r.dates.slice(0, 40).map(function (x) { return esc(fmt(dt(x), { day: "numeric", month: "short", year: "2-digit" })); }).join(" · ") + "</p></details></td></tr>";
      });
      h += "</tbody></table></div></div>";
      h += proof(c);
    }
    h += '<div class="ts-actions"><button type="button" class="tr-btn ghost" data-t="csv">' + T.csv + '</button><button type="button" class="tr-btn ghost" data-t="exp">' + T.exp + '</button><label class="tr-btn ghost" for="ts-imp">' + T.imp + '</label><input type="file" id="ts-imp" accept="application/json,.json" hidden>' +
      (mine.length ? '<button type="button" class="tr-btn ghost" data-t="clear">' + (state.confirm ? T.confirmClear : T.clearMine) + "</button>" : "") + "</div>";
    h += '<div class="ts-mine"><h4>' + T.mine + " (" + mine.length + ")</h4>" + (mine.length ? "<ul>" + mine.map(function (t) { var d0 = t.days.length ? t.days[0].date : t.start; return "<li><strong>" + esc(t.name || "") + "</strong> · " + esc(t.op || "") + " · " + t.days.length + " " + T.dayWord + " · " + esc(fmt(dt(d0), { day: "numeric", month: "short", year: "numeric" })) + "</li>"; }).join("") + "</ul>" : "<p>" + T.noMine + "</p>") + "</div></div>";
    root.innerHTML = h;
    root._c = c;
  }
  function proof(c) {
    var mine = loadMine(), guide = (mine.length ? mine[mine.length - 1].guide : "") || "", op = (mine.length ? mine[mine.length - 1].op : "") || "";
    if (state.sample && !mine.length) { guide = "Sample guide"; op = "Sample Tours"; }
    var h = '<section class="ts-proof" id="ts-proof"><div class="ts-proof-in"><div class="ts-proof-top"><div><p class="tr-brand">' + esc(op) + "</p><h4>" + T.proofH + '</h4></div><div class="ts-proof-meta"><span>' + T.by + ": <b>" + esc(guide || "—") + "</b></span><span>" + T.period + ": <b>" + esc(label(state.period, c.rg)) + "</b></span></div></div>" +
      '<div class="ts-proof-kpis">' + kpi(c.nDays, T.days) + kpi(c.species, T.species) + kpi(c.guests, T.guests) + kpi(c.perDay, T.perday) + kpi(c.photoPct + "%", T.photo) + "</div><ol class=\"ts-proof-top5\">";
    c.top.slice(0, 5).forEach(function (r) { h += "<li><span>" + esc(nm(r)) + '</span><i style="--w:' + Math.round(r.pct * 100) + '%"></i><b>' + pct(r.pct) + "</b></li>"; });
    h += "</ol><p class=\"ts-proof-foot\">" + T.foot + (state.sample ? " " + T.sampleNote : "") + '</p></div><div class="ts-proof-act"><button type="button" class="tr-btn" data-t="print">' + T.print + '</button><button type="button" class="tr-btn ghost" data-t="copy">' + T.copy + "</button></div></section>";
    return h;
  }
  function summaryText(c) {
    var t = T.title + " — " + label(state.period, c.rg) + (state.sample ? " (" + T.sampleTag + ")" : "") + "\n" + [T.days + ": " + c.nDays, T.species + ": " + c.species, T.guests + ": " + c.guests, T.perday + ": " + c.perDay, T.photo + ": " + c.photoPct + "%"].join(" · ") + "\n\n";
    c.top.slice(0, 8).forEach(function (r, i) { t += (i + 1) + ". " + nm(r) + " (" + r.sci + ") — " + pct(r.pct) + " (" + r.seen + "/" + c.nDays + ")\n"; });
    return t;
  }
  function csvOf(c) {
    var rows = [["date", "trip", "place", "time", "scientific_name", "common_name", "count", "photo", "guide", "sample"]];
    c.inR.forEach(function (x) { x.day.sightings.forEach(function (s) { rows.push([x.day.date, x.trip.name || "", x.day.place || "", s.time || "", s.sci, s.n, s.count || "", s.photo ? "yes" : "no", x.trip.guide || "", x.trip.sample ? "yes" : "no"]); }); });
    return "﻿" + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n");
  }
  function download(name, mime, data) {
    var a = document.createElement("a"), u = URL.createObjectURL(new Blob([data], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
  }
  function flash(b, m) { var o = b.textContent; b.textContent = m; setTimeout(function () { b.textContent = o; }, 1700); }

  document.addEventListener("click", function (e) {
    var root = state.root; if (!root || !root.contains(e.target)) return;
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.p) { state.period = b.dataset.p; if (b.dataset.p !== "all") TR.log.pickAnchorFromTrips && 0; return render(); }
    if (b.dataset.nav) {
      var k = +b.dataset.nav, a = state.anchor;
      state.anchor = state.period === "week" ? addDays(a, 7 * k) : state.period === "month" ? new Date(a.getFullYear(), a.getMonth() + k, 1, 12) : new Date(a.getFullYear() + k, a.getMonth(), 1, 12);
      return render();
    }
    var t = b.dataset.t; if (!t) return;
    var c = root._c;
    if (t === "print") { var pr = document.getElementById("ts-proof"); if (pr && TR.printNode) { var cl = pr.cloneNode(true), act = cl.querySelector(".ts-proof-act"); if (act) act.remove(); var pn = document.createElement("div"); pn.appendChild(cl); var node = pn; TR.printNode(node); } return; }
    if (t === "copy") { var v = summaryText(c); (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { flash(b, T.copied); }, function () { var ta = document.createElement("textarea"); ta.value = v; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); flash(b, T.copied); } catch (x) {} ta.remove(); }); return; }
    if (t === "csv") return download("sightings-" + c.rg.a + "_" + c.rg.b + ".csv", "text/csv;charset=utf-8", csvOf(c));
    if (t === "exp") return download("trip-logbook.json", "application/json", JSON.stringify({ v: 1, trips: loadMine() }, null, 2));
    if (t === "clear") { if (!state.confirm) { state.confirm = true; render(); setTimeout(function () { state.confirm = false; }, 3500); return; } state.confirm = false; saveMine([]); state.mem = null; return render(); }
  });
  document.addEventListener("change", function (e) {
    var root = state.root; if (!root || !root.contains(e.target)) return;
    if (e.target.id === "ts-sample") { state.sample = e.target.checked; render(); }
    if (e.target.id === "ts-imp" && e.target.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result);
          if (!j || !Array.isArray(j.trips)) throw 0;
          var cur = loadMine(), ids = {}; cur.forEach(function (t) { ids[t.id] = 1; });
          j.trips.forEach(function (t) { if (t && t.id && Array.isArray(t.days) && !t.sample && !ids[t.id]) cur.push(t); });
          saveMine(cur); state.sample = false; render();
        } catch (x) { var l = root.querySelector(".ts-mine h4"); if (l) l.textContent = T.importBad; }
      };
      rd.readAsText(e.target.files[0]);
    }
  });
  
  TR.logText = T;
})(window);
