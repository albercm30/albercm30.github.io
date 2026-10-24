/* News Tracker: renders data/news.json (today's digest + earlier days). Spanish article text, UI in the page language. */
(function () {
  "use strict";
  var es = (document.documentElement.lang || "en").slice(0, 2) === "es";
  var L = es ? {
    all: "Todas", why: "Por qué te interesa", read: "min de lectura", prev: "Días anteriores", items: "artículos", empty: "No se pudo cargar la selección.",
    cats: {}, today: "Edición del", updated: "Actualizado"
  } : {
    all: "All", why: "Why it matters to me", read: "min read", prev: "Earlier days", items: "articles", empty: "The digest could not be loaded.",
    cats: { "Fauna, conservación y clima": "Wildlife, conservation and climate", "IA, tecnología y datos": "AI, tech and data", "Canarias y España": "Canary Islands and Spain", "Política": "Politics", "Ciencia": "Science", "Viajes, buceo y deporte": "Travel, diving and sport" },
    today: "Edition of", updated: "Updated"
  };
  var root = document.getElementById("news-app");
  if (!root) return;
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function cat(c) { return L.cats[c] || c; }
  function fmt(d) {
    try { return new Intl.DateTimeFormat(es ? "es" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(d + "T12:00:00")); } catch (e) { return d; }
  }
  function link(url, text) { var a = h("a", null, text); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; }
  function render(data) {
    root.textContent = "";
    var days = data.days || [];
    if (!days.length) { root.appendChild(h("p", "tr-fine", L.empty)); return; }
    var cur = "all", today = days[0];
    var head = h("div", "nw-head");
    head.appendChild(h("h3", "nw-date", fmt(today.date).replace(/^./, function (c) { return c.toUpperCase(); })));
    head.appendChild(h("p", "tr-fine", today.items.length + " " + L.items));
    root.appendChild(head);
    var chips = h("div", "nw-chips");
    var cats = []; today.items.forEach(function (i) { if (cats.indexOf(i.cat) < 0) cats.push(i.cat); });
    var list = h("ol", "nw-list");
    function draw() {
      list.textContent = "";
      today.items.forEach(function (i) {
        if (cur !== "all" && i.cat !== cur) return;
        var li = h("li", "nw-card"), m = h("div", "nw-meta");
        m.appendChild(h("span", "nw-cat", cat(i.cat))); m.appendChild(h("span", "nw-src", i.source));
        if (i.mins) m.appendChild(h("span", null, i.mins + " " + L.read));
        li.appendChild(m);
        var t = h("h4"); t.appendChild(link(i.url, i.title)); li.appendChild(t);
        if (i.summary) li.appendChild(h("p", null, i.summary));
        if (i.why) { var w = h("p", "nw-why"); w.appendChild(h("b", null, L.why + ": ")); w.appendChild(document.createTextNode(i.why)); li.appendChild(w); }
        list.appendChild(li);
      });
      Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.c === cur)); });
    }
    [["all", L.all]].concat(cats.map(function (c) { return [c, cat(c)]; })).forEach(function (p) {
      var b = h("button", "nw-chip", p[1]); b.type = "button"; b.dataset.c = p[0];
      b.addEventListener("click", function () { cur = p[0]; draw(); }); chips.appendChild(b);
    });
    root.appendChild(chips); root.appendChild(list); draw();
    if (days.length > 1) {
      var det = h("details", "nw-prev"); det.appendChild(h("summary", null, L.prev));
      days.slice(1).forEach(function (d) {
        det.appendChild(h("h4", "nw-day", fmt(d.date).replace(/^./, function (c) { return c.toUpperCase(); })));
        var ul = h("ul");
        d.items.forEach(function (i) { var li = h("li"); li.appendChild(link(i.url, i.title)); li.appendChild(h("span", "nw-src2", " · " + i.source)); ul.appendChild(li); });
        det.appendChild(ul);
      });
      root.appendChild(det);
    }
    if (data.note) root.appendChild(h("p", "tr-fine", data.note));
  }
  fetch("/data/news.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(render).catch(function () { root.textContent = ""; root.appendChild(h("p", "tr-fine", L.empty)); });
})();
