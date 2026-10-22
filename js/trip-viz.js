/* Trip Reports demo: analytics and charts for the finished report (inline SVG, so they print cleanly). */
(function (g) {
  var TR = g.TR = g.TR || {};
  var S = {
    en: {
      hl: "Trip highlights", glance: "Trip at a glance", best: "Best day", bestSub: "species", biggest: "Biggest sighting", earliest: "Earliest record", latest: "Latest record", regular: "Most regular", everyDay: "Seen every day", none: "none",
      looked: "Looked for, not found", of: "of", days: "days", day: "Day", perDay: "Species per day", newL: "New for the trip", repL: "Already on the list", growth: "Species list growth", hours: "When the wildlife shows up", hoursSub: "Sightings by hour of the day",
      top: "Most numerous species", weather: "Weather by day", presence: "Species list", sp: "Species", seenOn: "Seen on", count: "Count", status: "Status", confirmed: "Confirmed", corrected: "Corrected", heard: "heard only", guests: "guests", km: "km",
      wish: "Still on the wish list", wishSub: "Species the guide looked for but did not record.", photo: "photo", sightings: "sightings", indiv: "individuals", at: "at", total: "total", fine: "Counts marked ≥ are minimums: the guide did not give an exact number.",
      noHour: "Not enough timed sightings for this chart.", firstDay: "first seen day"
    },
    es: {
      hl: "Momentos destacados", glance: "El viaje de un vistazo", best: "Mejor día", bestSub: "especies", biggest: "Mayor avistamiento", earliest: "Primer registro", latest: "Último registro", regular: "La más constante", everyDay: "Vistas cada día", none: "ninguna",
      looked: "Buscadas y no encontradas", of: "de", days: "días", day: "Día", perDay: "Especies por día", newL: "Nuevas en el viaje", repL: "Ya en la lista", growth: "Crecimiento de la lista de especies", hours: "Cuándo aparece la fauna", hoursSub: "Avistamientos por hora del día",
      top: "Especies más numerosas", weather: "Tiempo por día", presence: "Lista de especies", sp: "Especie", seenOn: "Vista el día", count: "Cantidad", status: "Estado", confirmed: "Confirmada", corrected: "Corregida", heard: "solo oída", guests: "clientes", km: "km",
      wish: "Aún en la lista de deseos", wishSub: "Especies que el guía buscó pero no registró.", photo: "foto", sightings: "avistamientos", indiv: "individuos", at: "a las", total: "total", fine: "Las cantidades con ≥ son mínimos: el guía no dio un número exacto.",
      noHour: "No hay suficientes avistamientos con hora para este gráfico.", firstDay: "primer día visto"
    }
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* --------------------------------------------------------- analytics from the approved days */
  function analyse(days, dn, photos) {
    var seen = {}, per = [], hours = [], totals = {}, hl = [], best = null, big = null, early = null, late = null, i, tot = 0, nSight = 0;
    for (i = 0; i < 24; i++) hours.push(0);
    var photoBy = {}; (photos || []).forEach(function (p) { if (p.sci && !photoBy[p.sci]) photoBy[p.sci] = p.src; });
    var cum = {};
    days.forEach(function (d) {
      var set = {}, ind = 0, nw = 0, times = [];
      d.sightings.forEach(function (s) {
        if (s.kind !== "sp" || !s.sp || !s.done) return;
        var k = s.sp.s, c = s.count || 1;
        nSight++; ind += c; tot += c;
        if (!set[k]) { set[k] = 1; if (!seen[k]) { seen[k] = d.n; nw++; } }
        var t = totals[k] || (totals[k] = { sp: s.sp, total: 0, days: {}, exact: true, star: false, fixed: false, heard: false });
        t.total += c; t.days[d.n] = 1; if (!s.count) t.exact = false; if (s.star) t.star = true; if (s.heard) t.heard = true; if (s.m.st !== "exact") t.fixed = true;
        if (s.time) { var h = +s.time.slice(0, 2); hours[h]++; times.push(s.time);
          if (!early || s.time < early.time) early = { time: s.time, sp: s.sp, day: d.n };
          if (!late || s.time > late.time) late = { time: s.time, sp: s.sp, day: d.n }; }
        if (s.count && (!big || s.count > big.count)) big = { count: s.count, sp: s.sp, day: d.n, approx: s.approx };
        if (s.star) hl.push({ sp: s.sp, day: d.n, time: s.time, place: d.place, count: s.count, note: s.note, qty: s.qty, beh: s.beh, approx: s.approx, photo: photoBy[k] || "" });
      });
      var n = Object.keys(set).length;
      Object.keys(set).forEach(function (k) { cum[k] = 1; });
      times.sort();
      per.push({ n: d.n, sp: n, nw: nw, rep: n - nw, ind: ind, first: times[0] || "", last: times[times.length - 1] || "", place: d.place, date: d.date, cum: Object.keys(cum).length });
      if (n && (!best || n > best.sp)) best = { sp: n, day: d.n, date: d.date, place: d.place };
    });
    var list = Object.keys(totals).map(function (k) { return totals[k]; });
    list.forEach(function (t) { t.nDays = Object.keys(t.days).length; });
    var topInd = list.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 8);
    var maxDays = list.reduce(function (m, t) { return Math.max(m, t.nDays); }, 0);
    var regular = list.filter(function (t) { return t.nDays === maxDays; }).slice(0, 3);
    var every = days.length > 1 ? list.filter(function (t) { return t.nDays === days.length; }) : [];
    if (!hl.length) {
      var cand = []; days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.kind === "sp" && s.sp && s.done) cand.push({ sp: s.sp, day: d.n, time: s.time, place: d.place, count: s.count, note: s.note, qty: s.qty, beh: s.beh, approx: s.approx, photo: photoBy[s.sp.s] || "", sc: (s.count || 1) + (s.note ? 3 : 0) + (s.beh.length ? 2 : 0) }); }); });
      cand.sort(function (a, b) { return b.sc - a.sc; });
      var u = {}; cand.forEach(function (c) { if (!u[c.sp.s] && hl.length < 4) { u[c.sp.s] = 1; hl.push(c); } });
    }
    var miss = {}; days.forEach(function (d) { (d.misses || []).forEach(function (m) { miss[m] = d.n; }); });
    var guests = 0, km = 0; days.forEach(function (d) { guests = Math.max(guests, d.guests || 0); km += d.km || 0; });
    return { per: per, hours: hours, list: list, top: topInd, hl: hl.slice(0, 6), best: best, big: big, early: early, late: late, regular: regular, maxDays: maxDays, every: every, miss: Object.keys(miss), tot: tot, nSight: nSight, nSp: list.length, guests: guests, km: Math.round(km), nDays: days.length, dn: dn, photoBy: photoBy };
  }

  /* --------------------------------------------------------- charts */
  function axis(max, w, h, pl, pt, pb) {
    var s = "", ticks = max <= 4 ? [0, max] : [0, Math.round(max / 2), max];
    ticks.forEach(function (t) { var y = pt + (h - pt - pb) * (1 - t / max); s += '<line x1="' + pl + '" x2="' + w + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="vz-grid"/><text x="' + (pl - 5) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="vz-ax">' + t + "</text>"; });
    return s;
  }
  function perDayChart(a, L) {
    var w = 520, h = 190, pl = 28, pt = 26, pb = 34, n = a.per.length, max = Math.max.apply(0, a.per.map(function (p) { return p.sp; }).concat([2])), bw = (w - pl) / n, bar = Math.min(54, bw * 0.62), s = '<svg viewBox="0 0 ' + w + " " + h + '" class="vz-svg" role="img" aria-label="' + esc(L.perDay) + '">' + axis(max, w, h, pl, pt, pb);
    a.per.forEach(function (p, i) {
      var x = pl + i * bw + (bw - bar) / 2, ih = h - pt - pb, hn = ih * p.nw / max, hr = ih * p.rep / max, y0 = h - pb;
      if (p.rep) s += '<rect x="' + x.toFixed(1) + '" y="' + (y0 - hr).toFixed(1) + '" width="' + bar.toFixed(1) + '" height="' + hr.toFixed(1) + '" class="vz-rep"><title>' + esc(L.repL + ": " + p.rep) + "</title></rect>";
      if (p.nw) s += '<rect x="' + x.toFixed(1) + '" y="' + (y0 - hr - hn).toFixed(1) + '" width="' + bar.toFixed(1) + '" height="' + hn.toFixed(1) + '" class="vz-new" rx="2"><title>' + esc(L.newL + ": " + p.nw) + "</title></rect>";
      s += '<text x="' + (x + bar / 2).toFixed(1) + '" y="' + (y0 - hr - hn - 5).toFixed(1) + '" text-anchor="middle" class="vz-val">' + p.sp + "</text>";
      s += '<text x="' + (x + bar / 2).toFixed(1) + '" y="' + (h - 18) + '" text-anchor="middle" class="vz-ax">' + L.day + " " + p.n + "</text>";
      if (n <= 7) s += '<text x="' + (x + bar / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" class="vz-ax2">' + esc((p.place || "").split(",")[0].slice(0, 16)) + "</text>";
    });
    return s + "</svg>" + '<p class="vz-leg"><i class="vz-new"></i>' + L.newL + '<i class="vz-rep"></i>' + L.repL + "</p>";
  }
  function growthChart(a, L) {
    var w = 520, h = 190, pl = 34, pt = 28, pb = 28, n = a.per.length, max = Math.max(a.nSp, 2), s = '<svg viewBox="0 0 ' + w + " " + h + '" class="vz-svg" role="img" aria-label="' + esc(L.growth) + '">' + axis(max, w, h, pl, pt, pb);
    var pts = a.per.map(function (p, i) { return [pl + (n === 1 ? (w - pl) / 2 : 18 + i * (w - pl - 36) / (n - 1)), pt + (h - pt - pb) * (1 - p.cum / max), p]; });
    if (n > 1) s += '<path d="M' + pts[0][0].toFixed(1) + " " + (h - pb) + "L" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + "L" + pts[n - 1][0].toFixed(1) + " " + (h - pb) + 'Z" class="vz-area"/><path d="M' + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + '" class="vz-line" fill="none"/>';
    pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" class="vz-dot"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] - 9).toFixed(1) + '" text-anchor="middle" class="vz-val">' + p[2].cum + '</text><text x="' + p[0].toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle" class="vz-ax">' + L.day + " " + p[2].n + "</text>"; });
    return s + "</svg>";
  }
  function hourChart(a, L) {
    var timed = a.hours.reduce(function (x, y) { return x + y; }, 0);
    if (timed < 3) return '<p class="vz-empty">' + L.noHour + "</p>";
    var lo = 24, hi = 0, i; a.hours.forEach(function (v, h2) { if (v) { lo = Math.min(lo, h2); hi = Math.max(hi, h2); } });
    lo = Math.max(0, Math.min(lo, 5)); hi = Math.min(23, Math.max(hi, 20));
    var w = 520, h = 190, pl = 28, pt = 14, pb = 26, n = hi - lo + 1, bw = (w - pl) / n, max = Math.max.apply(0, a.hours.slice(lo, hi + 1).concat([2])), s = '<svg viewBox="0 0 ' + w + " " + h + '" class="vz-svg" role="img" aria-label="' + esc(L.hours) + '">' + axis(max, w, h, pl, pt, pb);
    for (i = lo; i <= hi; i++) {
      var v = a.hours[i], bh = (h - pt - pb) * v / max, x = pl + (i - lo) * bw + bw * 0.12, night = i < 6 || i >= 19;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (h - pb - bh).toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" class="' + (night ? "vz-nite" : "vz-new") + '"><title>' + (i < 10 ? "0" : "") + i + ":00 · " + v + " " + L.sightings + "</title></rect>";
      if ((i - lo) % 2 === 0) s += '<text x="' + (x + bw * 0.38).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle" class="vz-ax">' + (i < 10 ? "0" : "") + i + "h</text>";
    }
    return s + "</svg>";
  }
  function topChart(a, L) {
    if (!a.top.length) return "";
    var max = a.top[0].total, s = '<ul class="vz-hbars">';
    a.top.forEach(function (t) { s += "<li><span>" + esc(a.dn(t.sp)) + '</span><i style="--w:' + Math.max(3, Math.round(t.total / max * 100)) + '%"></i><b>' + (t.exact ? "" : "≥") + t.total + "</b></li>"; });
    return s + "</ul>";
  }

  /* --------------------------------------------------------- sections */
  function longDate(iso, lang) { try { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short" }); } catch (e) { return iso; } }
  function highlights(a, L, lang, behLabel) {
    if (!a.hl.length) return "";
    var h = '<section class="vz-sec"><h5>' + L.hl + '</h5><div class="vz-hl">';
    a.hl.forEach(function (x, i) {
      var meta = [L.day + " " + x.day, x.time ? x.time : "", (x.place || "").split(",")[0]].filter(Boolean).join(" · "), q = x.count ? (x.approx ? "~" : "×") + x.count : (x.qty === "several" ? (lang === "es" ? "varios" : "several") : "");
      var note = x.note || (x.beh || []).map(function (b) { return behLabel(b); }).join(", ");
      h += '<article class="vz-card' + (x.photo ? " has-img" : "") + '">' + (x.photo ? '<img src="' + esc(x.photo) + '" alt="">' : '<span class="vz-star" aria-hidden="true">★</span>') + '<div><h6>' + esc(a.dn(x.sp)) + (q ? ' <em>' + q + "</em>" : "") + "</h6><p class=\"vz-sci\">" + esc(x.sp.s) + '</p><p class="vz-meta">' + esc(meta) + "</p>" + (note ? '<p class="vz-note">“' + esc(note) + '”</p>' : "") + "</div></article>";
    });
    return h + "</div></section>";
  }
  function glance(a, L, lang) {
    var t = [];
    if (a.best) t.push([L.best, a.best.sp + " " + L.bestSub, L.day + " " + a.best.day + " · " + longDate(a.best.date, lang)]);
    if (a.big) t.push([L.biggest, (a.big.approx ? "~" : "×") + a.big.count, a.dn(a.big.sp) + " · " + L.day + " " + a.big.day]);
    if (a.early) t.push([L.earliest, a.early.time, a.dn(a.early.sp) + " · " + L.day + " " + a.early.day]);
    if (a.late && a.late.time !== (a.early && a.early.time)) t.push([L.latest, a.late.time, a.dn(a.late.sp) + " · " + L.day + " " + a.late.day]);
    if (a.regular.length && a.nDays > 1) t.push([L.regular, a.maxDays + " " + L.of + " " + a.nDays + " " + L.days, a.regular.map(function (r) { return a.dn(r.sp); }).join(", ")]);
    if (a.nDays > 1 && a.every.length) t.push([L.everyDay, String(a.every.length), a.every.slice(0, 4).map(function (r) { return a.dn(r.sp); }).join(", ") || L.none]);
    var h = '<section class="vz-sec"><h5>' + L.glance + '</h5><div class="vz-facts">';
    t.forEach(function (x) { h += '<div class="vz-fact"><span>' + esc(x[0]) + "</span><strong>" + esc(x[1]) + "</strong><em>" + esc(x[2]) + "</em></div>"; });
    return h + "</div></section>";
  }
  function charts(a, L) {
    return '<section class="vz-sec"><div class="vz-charts"><figure><figcaption>' + L.perDay + "</figcaption>" + perDayChart(a, L) + "</figure><figure><figcaption>" + L.growth + "</figcaption>" + growthChart(a, L) + "</figure>" +
      "<figure><figcaption>" + L.hours + ' <small>' + L.hoursSub + "</small></figcaption>" + hourChart(a, L) + "</figure><figure><figcaption>" + L.top + "</figcaption>" + topChart(a, L) + "</figure></div></section>";
  }
  function weather(days, L, wxText) {
    var rows = days.filter(function (d) { var t = wxText(d); return t; });
    if (!rows.length) return "";
    return '<section class="vz-sec"><h5>' + L.weather + '</h5><div class="vz-wx">' + rows.map(function (d) { return '<div><b>' + L.day + " " + d.n + "</b><span>" + esc(wxText(d)) + "</span></div>"; }).join("") + "</div></section>";
  }
  function presence(a, days, L) {
    var h = '<section class="vz-sec vz-list"><h5>' + L.presence + '</h5><div class="tr-tw"><table><thead><tr><th>#</th><th>' + L.sp + "</th><th>" + L.seenOn + "</th><th>" + L.count + "</th><th>" + L.status + "</th></tr></thead><tbody>";
    var max = a.list.reduce(function (m, t) { return Math.max(m, t.total); }, 1);
    a.list.forEach(function (t, i) {
      var dots = days.map(function (d) { return '<i class="vz-d' + (t.days[d.n] ? " on" : "") + '" title="' + L.day + " " + d.n + '"></i>'; }).join("");
      h += "<tr><td>" + (i + 1) + '</td><td class="n">' + esc(a.dn(t.sp)) + (t.star ? ' <span class="tr-star">★</span>' : "") + (t.heard ? ' <small class="vz-h">' + L.heard + "</small>" : "") + '<span class="s">' + esc(t.sp.s) + '</span></td><td class="vz-dots">' + dots + '</td><td class="vz-cnt"><i style="--w:' + Math.max(4, Math.round(t.total / max * 100)) + '%"></i><b>' + (t.exact ? "" : "≥") + t.total + '</b></td><td><span class="tr-st' + (t.fixed ? " fx" : "") + '">' + (t.fixed ? L.corrected : L.confirmed) + "</span></td></tr>";
    });
    return h + '</tbody></table></div><p class="tr-fine2">' + L.fine + "</p></section>";
  }
  function wishlist(a, L, lang, nameOf) {
    if (!a.miss.length) return "";
    return '<section class="vz-sec"><h5>' + L.wish + '</h5><p class="vz-sub">' + L.wishSub + '</p><div class="vz-chips">' + a.miss.map(function (m) { return "<span>" + esc(nameOf(m)) + "</span>"; }).join("") + "</div></section>";
  }

  TR.viz = { analyse: analyse, highlights: highlights, glance: glance, charts: charts, weather: weather, presence: presence, wishlist: wishlist, L: function (lang) { return S[lang] || S.en; } };
})(window);
