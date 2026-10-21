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
          g.polygonAltitude(function (d) { return d === f && d.__c ? 0.045 : (d.__c ? 0.02 : 0.006); });
        })
        .onPolygonClick(function (f) { if (f && f.__c) go(f.__c); })
        .pointsData(list)
        .pointLat("lat").pointLng("lng")
        .pointColor(function () { return "#fff4c2"; })
        .pointAltitude(0.03).pointRadius(0.32)
        .pointLabel(tip)
        .onPointClick(go)
        .arcsData(arcs)
        .arcColor(function () { return ["rgba(228,217,166,.05)", "rgba(228,217,166,.7)"]; })
        .arcStroke(0.28).arcAltitudeAutoScale(0.45)
        .arcDashLength(0.35).arcDashGap(0.9).arcDashAnimateTime(reduce ? 0 : 3800)
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
