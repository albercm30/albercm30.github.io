/* Interactive 3D globe for the Travel page.
   Loads globe.gl + world outlines only when the section scrolls into view, and hides itself if anything fails. */
(function () {
  var sec = document.getElementById("globe-sec");
  var box = document.getElementById("globe");
  if (!sec || !box) return;

  var I = window.__i18n || { lang: "en", pre: "", country: function (n) { return n; } };
  var ES = I.lang === "es";
  var T = ES
    ? { open: "Haz clic para abrir", home: "Islas Canarias · mi casa", visited: "visitado", label: "Globo 3D interactivo de los países visitados. Los países también están listados más abajo." }
    : { open: "Click to open", home: "Canary Islands · home", visited: "visited", label: "Interactive 3D globe of the countries visited. The countries are also listed further down the page." };
  box.setAttribute("aria-label", T.label);

  var HOME = { lat: 28.3, lng: -16.0 };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var started = false;

  function fail() {
    sec.style.display = "none";
    var n = document.getElementById("globe-note"); if (n) n.style.display = "none";
    var tab = document.querySelector('#map-tabs [data-map="globe"]'), next = document.querySelector('#map-tabs [data-map="leaflet"]');
    if (tab) tab.style.display = "none";
    if (next) next.click();
  }

  function load(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = src; s.async = true; s.onload = ok; s.onerror = ko;
      document.head.appendChild(s);
    });
  }


  /* ---- Background: drifting country names, floating photo cards, and a photo that fades in when you hover a country ---- */
  var PH = { australia: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], guatemala: [2,3,5], italy: [1,2,3,4,5,6,7,8,9,10,11,12], mexico: [1,2,3,4,5,6,7], "new-zealand": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], spain: [1,2], "sri-lanka": [1,2,3,4,5,6,7,8,9,10,11,12], thailand: [1,2,3,4,5,6,7,8,9,10,11,12,13], vietnam: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] };
  var ALLPH = [];
  Object.keys(PH).forEach(function (s) { PH[s].forEach(function (n) { ALLPH.push({ slug: s, file: s + "-" + pad(n) + ".jpg" }); }); });
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function buildBackground(list) {
    var bg = el("div", "gb");
    bg.setAttribute("aria-hidden", "true");
    var names = list.map(function (c) { return I.country(c.name); });
    for (var r = 0; r < 3; r++) {
      var row = el("div", "gb-row gb-row" + r, bg);
      var inner = el("div", "gb-track", row);
      var rot = names.slice(r * 5).concat(names.slice(0, r * 5));
      var txt = rot.join("  ·  ") + "  ·  ";
      inner.textContent = txt + txt;
    }
    var photoA = el("img", "gb-photo", bg), photoB = el("img", "gb-photo", bg);
    photoA.alt = photoB.alt = "";
    var cap = el("div", "gb-cap", bg);
    var capName = el("strong", "", cap), capSub = el("span", "", cap);
    box.parentNode.insertBefore(bg, box);

    var front = photoA, back = photoB, hideT = null, curSlug = null;
    function show(c) {
      clearTimeout(hideT);
      if (!c || !PH[c.slug]) {
        hideT = setTimeout(function () { front.classList.remove("on"); back.classList.remove("on"); cap.classList.remove("on"); curSlug = null; }, 220);
        return;
      }
      if (curSlug === c.slug) return;
      curSlug = c.slug;
      var n = pick(PH[c.slug]), nx = back;
      nx.onload = function () {
        nx.classList.add("on"); front.classList.remove("on");
        var t = front; front = nx; back = t;
      };
      nx.src = "/assets/travel/globe-l/" + c.slug + "-" + pad(n) + ".jpg";
      capName.textContent = I.country(c.name);
      capSub.textContent = c.focus || "";
      cap.classList.add("on");
    }

    // floating photo cards on the sides
    var cards = [];
    {
      var order = ALLPH.slice().sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < 6; i++) {
        var a = el("a", "gb-card gb-card" + i, bg), im = el("img", "", a), lb = el("span", "", a);
        im.alt = ""; im.loading = "lazy"; im.decoding = "async";
        cards.push({ a: a, im: im, lb: lb });
      }
      var ix = 0;
      var setCard = function (k, p) {
        var cd = cards[k], c = list.filter(function (x) { return x.slug === p.slug; })[0];
        cd.a.href = (I.pre || "") + "/countries/" + p.slug + "/";
        cd.im.src = "/assets/travel/globe-s/" + p.file;
        cd.lb.textContent = c ? I.country(c.name) : "";
        cd.a.setAttribute("aria-label", cd.lb.textContent);
      };
      cards.forEach(function (cd, k) { setCard(k, order[ix++ % order.length]); });
      if (!reduce) {
        var turn = 0;
        setInterval(function () {
          var k = turn++ % cards.length, cd = cards[k];
          if (document.hidden) return;
          cd.a.classList.add("swap");
          setTimeout(function () { setCard(k, order[ix++ % order.length]); cd.a.classList.remove("swap"); }, 500);
        }, 3200);
      }
    }
    return { show: show };
  }

  function start() {
    if (started) return;
    started = true;
    var list = (typeof worldCountries !== "undefined" ? worldCountries : []);
    if (!list.length) return fail();

    Promise.all([
      load("https://unpkg.com/globe.gl@2/dist/globe.gl.min.js"),
      load("https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js")
    ]).then(function () {
      return fetch("https://unpkg.com/world-atlas@2.0.2/countries-110m.json").then(function (r) {
        if (!r.ok) throw new Error("atlas");
        return r.json();
      });
    }).then(function (topo) {
      var land = topojson.feature(topo, topo.objects.countries).features;
      var SLUG = { "united states of america": "usa", "united kingdom": "uk" };
      var visited = {};
      list.forEach(function (c) { visited[c.slug] = c; });
      land.forEach(function (f) {
        var n = (f.properties.name || "").toLowerCase();
        f.__c = visited[SLUG[n] || n.replace(/[^a-z]+/g, "-")] || null;
      });

      var by = {};
      list.forEach(function (c) { by[c.name] = c; });

      function tip(c) {
        return '<div style="font:700 12px/1.4 DM Sans,Arial,sans-serif;padding:7px 10px;background:#101a13;color:#f3efdc;border:1px solid #3a5a44;border-radius:8px">' +
          I.country(c.name) + '<br><span style="font-weight:400;opacity:.75">' + (c.focus || "") + '</span><br>' +
          '<span style="font-size:10px;letter-spacing:.6px;color:#c9d9a8">' + T.open.toUpperCase() + ' →</span></div>';
      }
      function go(c) { if (c && c.slug) location.href = (I.pre || "") + "/countries/" + c.slug + "/"; }

      var arcs = list.filter(function (c) {
        return Math.abs(c.lat - HOME.lat) + Math.abs(c.lng - HOME.lng) > 12;
      }).map(function (c) {
        return { startLat: HOME.lat, startLng: HOME.lng, endLat: c.lat, endLng: c.lng };
      });

      /* trip routes: shown as bright arcs between the real stops when you hover a country that has them */
      var STOPS = {}, ROUTE = {}, routeArcs = [], stopPts = [], curRoute = null;
      fetch("/data/stops.json").then(function (r) { return r.json(); }).then(function (j) { STOPS = j; }).catch(function () {});
      fetch("/data/countries.json").then(function (r) { return r.json(); }).then(function (j) { j.forEach(function (c) { ROUTE[c.slug] = c.route || []; }); }).catch(function () {});
      function setRoute(c) {
        var slug = c && c.slug && STOPS[c.slug] && ROUTE[c.slug] ? c.slug : null;
        if (slug === curRoute) return;
        curRoute = slug; routeArcs = []; stopPts = [];
        if (slug) {
          var pts = ROUTE[slug].filter(function (n) { return STOPS[slug][n]; }).map(function (n) { return { stop: n, lat: STOPS[slug][n][0], lng: STOPS[slug][n][1] }; });
          for (var i = 0; i < pts.length - 1; i++) routeArcs.push({ route: true, startLat: pts[i].lat, startLng: pts[i].lng, endLat: pts[i + 1].lat, endLng: pts[i + 1].lng });
          stopPts = pts;
        }
        try { g.arcsData(arcs.concat(routeArcs)); g.pointsData(list.concat(stopPts)); } catch (e) {}
      }
      function ptTip(d) {
        return d.stop ? '<div style="font:700 12px/1.4 DM Sans,Arial,sans-serif;padding:5px 9px;background:#101a13;color:#ffd48a;border:1px solid #6a5a2a;border-radius:8px">' + d.stop + '</div>' : tip(d);
      }

      var B = buildBackground(list);
      var g = Globe()(box)
        .width(box.clientWidth).height(box.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true).atmosphereColor("#9fd3a8").atmosphereAltitude(0.18)
        .polygonsData(land)
        .polygonCapColor(function (f) { return f.__c ? "#e4d9a6" : "#2b4a38"; })
        .polygonSideColor(function (f) { return f.__c ? "rgba(228,217,166,.5)" : "rgba(20,40,28,.4)"; })
        .polygonStrokeColor(function () { return "#0f1c14"; })
        .polygonAltitude(function (f) { return f.__c ? 0.02 : 0.006; })
        .polygonLabel(function (f) { return f.__c ? tip(f.__c) : ""; })
        .onPolygonHover(function (f) {
          box.style.cursor = f && f.__c ? "pointer" : "grab";
          B.show(f && f.__c); setRoute(f && f.__c);
          g.polygonAltitude(function (d) { return d === f && d.__c ? 0.045 : (d.__c ? 0.02 : 0.006); });
        })
        .onPolygonClick(function (f) { if (f && f.__c) go(f.__c); })
        .pointsData(list)
        .pointLat("lat").pointLng("lng")
        .pointColor(function (d) { return d.stop ? "#ffb347" : "#fff4c2"; })
        .pointAltitude(function (d) { return d.stop ? 0.05 : 0.03; }).pointRadius(function (d) { return d.stop ? 0.16 : 0.32; })
        .pointLabel(ptTip)
        .onPointHover(function (c) { B.show(c && c.slug ? c : null); setRoute(c && c.slug ? c : null); })
        .onPointClick(go)
        .arcsData(arcs)
        .arcColor(function (d) { return d.route ? ["rgba(255,212,138,.55)", "rgba(255,179,71,1)"] : ["rgba(228,217,166,.05)", "rgba(228,217,166,.7)"]; })
        .arcStroke(function (d) { return d.route ? 0.5 : 0.28; }).arcAltitudeAutoScale(function (d) { return d.route ? 0.2 : 0.45; })
        .arcDashLength(function (d) { return d.route ? 0.5 : 0.35; }).arcDashGap(function (d) { return d.route ? 0.15 : 0.9; }).arcDashAnimateTime(reduce ? 0 : 3800)
        .ringsData([HOME]).ringColor(function () { return function (t) { return "rgba(255,244,194," + (1 - t) + ")"; }; })
        .ringMaxRadius(5).ringPropagationSpeed(2).ringRepeatPeriod(1800)
        .labelsData([{ lat: HOME.lat, lng: HOME.lng, text: T.home }])
        .labelText("text").labelSize(1.1).labelDotRadius(0.35).labelColor(function () { return "#fff4c2"; })
        .labelAltitude(0.03).labelResolution(2);

      try { g.globeMaterial().color.set("#13281b"); } catch (e) {}
      var ctl = g.controls();
      ctl.enableZoom = false;
      ctl.autoRotate = !reduce;
      ctl.autoRotateSpeed = 0.55;
      g.pointOfView({ lat: 24, lng: 10, altitude: 2.3 }, 0);

      box.addEventListener("pointerdown", function () { ctl.autoRotate = false; });
      box.addEventListener("pointerleave", function () { ctl.autoRotate = !reduce; });

      function fit() { g.width(box.clientWidth).height(box.clientHeight); }
      window.addEventListener("resize", fit);
      sec.classList.add("globe-ready");
    }).catch(fail);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "300px" });
    io.observe(sec);
  } else {
    start();
  }
})();
