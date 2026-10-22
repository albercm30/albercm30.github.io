/* Trip Reports demo: a guide dictates or types the day, in English or Spanish, and the tool builds a checked species list,
   a branded trip report and guide stats. Everything runs in the browser. Nothing is uploaded; photos stay on the device.
   The product would use Whisper for voice, GBIF for names and an LLM for the narrative; this demo uses rule-based
   language understanding (js/trip-nlp.js), a small bundled taxonomy and written templates, so it works offline. */
(function () {
  var root = document.getElementById("trip-demo");
  var TR = window.TR = window.TR || {};
  if (!root) return;
  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "es" ? "es" : "en";

  /* ------------------------------------------------------------ interface text */
  var UI = {
    en: {
      tabReport: "Trip report", tabStats: "Guide stats",
      s1: "1 · Dictate or type the day", s1h: "Say it the way you would tell a colleague: species, times, weather, places, counts. No format needed.",
      samples: "Try an example", sampleNames: ["Khao Yai · quick notes", "Sri Lanka · dictation (EN)", "Monteverde · dictado (ES)", "Doñana · dictado (ES)"],
      ph: "Day one, Khao Yai. We started at half past six, clear and cool. A pair of great hornbills at the fig tree, three lar gibbons calling from the ridge, amazing! At quarter past nine around twelve pig-tailed macaques on the road. Heard a barred owlet but not sure…",
      dictate: "Dictate", stop: "Stop", dictating: "Listening… keep talking, pauses are fine", newDay: "New day", photos: "Add photos", clear: "Clear", photosNote: "Photos stay in your browser.",
      dlang: "Dictation language", dictNone: "Voice dictation needs Chrome, Edge or Safari. On a phone, use the microphone on the keyboard instead.",
      dictHelp: "Dictation tips", dictTips: ["Speak in full sentences and pause between sightings.", "Say “day two” or “segundo día” to start a new day.", "Say a number and a species: “three lar gibbons”, “two tucanes”.", "Say “not sure” or “creo que” and the tool will ask you to confirm.", "Say “new line” or “nueva línea” for a line break."],
      dictPrivacy: "Your browser's speech service turns the voice into text (Chrome and Edge send the audio to Google or Microsoft). The text itself stays on this page. The real product would use Whisper.",
      denied: "The microphone was blocked. Allow it in the browser address bar, or use your keyboard's microphone.",
      start: "First day of the trip", operator: "Operator", guide: "Guide", tone: "Tone", tones: ["Warm", "Factual", "Adventurous"], rlang: "Report language", color: "Colour",
      und: "What the tool understood", undEmpty: "Start typing or dictating and this fills in live.", est: "date estimated", guests: "guests", km: "km",
      timeUnk: "no time", heard: "heard only", unsureTag: "unsure", seenTag: "to confirm", notFound: "not seen", fixTag: "to check", others: "other notes",
      go: "Build report", s2: "2 · Check before anything is sent", s2h: "The tool never adds a species on its own. Anything uncertain waits for the guide.",
      s3: "3 · The report", matched: "species matched", flagged: "need the guide", none: "Nothing to check: every species was matched.",
      reasonUnc: "Marked as uncertain in the notes", reasonNone: "Not found in the species list", reasonAmb: "Several species fit this name", reasonSug: "No exact match, closest names below", reasonHeard: "Heard but not seen",
      confirm: "Confirm", keepNote: "Keep as a note", remove: "Remove", typeSp: "Type a species…", use: "Use",
      okChip: "Matched", fixedChip: "Spelling corrected", partChip: "Matched from", fromNotes: "from the notes",
      approveHead: "Guide approval", approveWait: "Resolve the flagged sightings above to continue.", approve: "Approve and publish", saveLog: "Save to my logbook (for the stats tab)",
      approvedBy: "Approved by", on: "on", edit: "Back to editing", saved: "Saved to your logbook", viewStats: "View stats", storeFail: "Your browser blocked storage, so the logbook will not survive closing this page.",
      copy: "Copy as text", copied: "Copied", print: "Print or save as PDF", csv: "Download sightings (CSV)", json: "Download sightings (JSON)",
      dataHead: "Structured sighting data", dataH: "Every approved report also becomes clean rows like these, with date, time, place and coordinates, owned by the operator and shared only with permission.",
      emptyNotes: "Add some notes or load an example first.", noSp: "No species recognised yet.",
      unsure: "The demo understands English and Spanish with fixed rules and a list of about 390 species. The real product uses speech-to-text, the full GBIF taxonomy and a language model, and keeps the guide-approval step.",
      photoCap: "Photo of", gallery: "Gallery", route: "Route", checklist: "Species list", days: "Days", count: "Count", status: "Status", confirmed: "Confirmed", corrected: "Corrected", noteLbl: "Notes", tagPhoto: "Tag species", untagged: "No species"
    },
    es: {
      tabReport: "Informe de viaje", tabStats: "Estadísticas del guía",
      s1: "1 · Dicta o escribe el día", s1h: "Cuéntalo como se lo contarías a un compañero: especies, horas, tiempo, lugares, cantidades. No hace falta ningún formato.",
      samples: "Prueba un ejemplo", sampleNames: ["Khao Yai · notas rápidas", "Sri Lanka · dictado (EN)", "Monteverde · dictado (ES)", "Doñana · dictado (ES)"],
      ph: "Primer día en Monteverde. Salimos a las seis y media, nublado y fresco. Vimos un quetzal resplandeciente, ¡increíble!, y dos tucanes. Hacia las nueve, unos doce monos aulladores cerca del sendero. Escuchamos un búho pero no estoy seguro…",
      dictate: "Dictar", stop: "Parar", dictating: "Escuchando… sigue hablando, puedes hacer pausas", newDay: "Nuevo día", photos: "Añadir fotos", clear: "Borrar", photosNote: "Las fotos se quedan en tu navegador.",
      dlang: "Idioma del dictado", dictNone: "El dictado por voz necesita Chrome, Edge o Safari. En el móvil, usa el micrófono del teclado.",
      dictHelp: "Consejos para dictar", dictTips: ["Habla con frases completas y haz una pausa entre avistamientos.", "Di «segundo día» o «day two» para empezar un día nuevo.", "Di el número y la especie: «tres gibones», «dos tucanes».", "Di «no estoy seguro» o «creo que» y la herramienta te pedirá confirmación.", "Di «nueva línea» o «new line» para un salto de línea."],
      dictPrivacy: "El servicio de voz de tu navegador convierte la voz en texto (Chrome y Edge envían el audio a Google o Microsoft). El texto se queda en esta página. El producto real usaría Whisper.",
      denied: "El micrófono está bloqueado. Permítelo en la barra de direcciones o usa el micrófono del teclado.",
      start: "Primer día del viaje", operator: "Operador", guide: "Guía", tone: "Tono", tones: ["Cercano", "Factual", "Aventurero"], rlang: "Idioma del informe", color: "Color",
      und: "Lo que ha entendido la herramienta", undEmpty: "Empieza a escribir o a dictar y esto se rellena en directo.", est: "fecha estimada", guests: "clientes", km: "km",
      timeUnk: "sin hora", heard: "solo oída", unsureTag: "dudosa", seenTag: "por confirmar", notFound: "no vista", fixTag: "por revisar", others: "otras notas",
      go: "Crear informe", s2: "2 · Revisar antes de enviar nada", s2h: "La herramienta nunca añade una especie por su cuenta. Lo dudoso espera al guía.",
      s3: "3 · El informe", matched: "especies reconocidas", flagged: "necesitan al guía", none: "Nada que revisar: todas las especies se reconocieron.",
      reasonUnc: "Marcado como dudoso en las notas", reasonNone: "No está en la lista de especies", reasonAmb: "Varias especies encajan con este nombre", reasonSug: "Sin coincidencia exacta; nombres más cercanos abajo", reasonHeard: "Oída pero no vista",
      confirm: "Confirmar", keepNote: "Dejar como nota", remove: "Quitar", typeSp: "Escribe una especie…", use: "Usar",
      okChip: "Reconocida", fixedChip: "Ortografía corregida", partChip: "Reconocida a partir de", fromNotes: "de las notas",
      approveHead: "Aprobación del guía", approveWait: "Resuelve los avistamientos marcados para continuar.", approve: "Aprobar y publicar", saveLog: "Guardar en mi cuaderno (para las estadísticas)",
      approvedBy: "Aprobado por", on: "el", edit: "Volver a editar", saved: "Guardado en tu cuaderno", viewStats: "Ver estadísticas", storeFail: "Tu navegador bloqueó el almacenamiento, así que el cuaderno no sobrevivirá al cerrar la página.",
      copy: "Copiar como texto", copied: "Copiado", print: "Imprimir o guardar en PDF", csv: "Descargar avistamientos (CSV)", json: "Descargar avistamientos (JSON)",
      dataHead: "Datos de avistamientos estructurados", dataH: "Cada informe aprobado se convierte también en filas limpias como estas, con fecha, hora, lugar y coordenadas, propiedad del operador y compartidas solo con permiso.",
      emptyNotes: "Añade unas notas o carga un ejemplo primero.", noSp: "Aún no se reconoce ninguna especie.",
      unsure: "La demostración entiende inglés y español con reglas fijas y una lista de unas 390 especies. El producto real usa reconocimiento de voz, la taxonomía completa de GBIF y un modelo de lenguaje, y mantiene el paso de aprobación del guía.",
      photoCap: "Foto de", gallery: "Galería", route: "Ruta", checklist: "Lista de especies", days: "Días", count: "Cantidad", status: "Estado", confirmed: "Confirmada", corrected: "Corregida", noteLbl: "Notas", tagPhoto: "Etiquetar especie", untagged: "Sin especie"
    }
  };
  var T = UI[LANG];

  /* ------------------------------------------------------------ report text (language chosen by the operator) */
  var RT = {
    en: {
      day: "Day", weather: "Weather", species: "species", individuals: "individuals", days: "days", title: "Trip report", by: "Guide", approved: "Approved by the guide",
      names: "Common names in English, with the scientific name.", several: "several", group: "a group of", unsure: "unsure", heardOnly: "heard",
      warm: {
        open: function (n, p) { return "Day " + n + (p ? " took us to " + p : " in the field") + "."; },
        wx: function (w) { return " The weather: " + w + "."; },
        first: function (a, b) { return b && b !== a ? " Our first sighting came at " + a + " and the last at " + b + "." : " Our first sighting came at " + a + "."; },
        star: function (l) { return " The stars of the day were " + l + "."; },
        rest: function (l) { return " We also logged " + l + "."; },
        miss: function (l) { return " We looked for " + l + " but it stayed hidden."; },
        fresh: function (k) { return k ? " " + k + (k === 1 ? " species was" : " species were") + " new for the trip list." : ""; },
        quiet: " A quiet day on the list, but a good one."
      },
      fact: {
        open: function (n, p) { return "Day " + n + (p ? " — " + p : "") + "."; },
        wx: function (w) { return " Weather: " + w + "."; },
        first: function (a, b) { return " First record " + a + (b && b !== a ? ", last " + b : "") + "."; },
        star: function (l) { return " Notable: " + l + "."; },
        rest: function (l) { return " Also recorded: " + l + "."; },
        miss: function (l) { return " Looked for, not recorded: " + l + "."; },
        fresh: function (k) { return k ? " New for the trip: " + k + "." : ""; },
        quiet: " No sightings recorded."
      },
      adv: {
        open: function (n, p) { return "Day " + n + (p ? ": " + p + ", and the wild did not disappoint." : ": out in the wild again."); },
        wx: function (w) { return " Conditions: " + w + "."; },
        first: function (a, b) { return " The first animal showed up at " + a + (b && b !== a ? " and the action ran until " + b : "") + "."; },
        star: function (l) { return " Showstoppers: " + l + "!"; },
        rest: function (l) { return " Along the way: " + l + "."; },
        miss: function (l) { return " " + l + " played hard to get."; },
        fresh: function (k) { return k ? " That made " + k + " brand-new " + (k === 1 ? "species" : "species") + " for the list." : ""; },
        quiet: " A slow day, but that is wildlife."
      }
    },
    es: {
      day: "Día", weather: "Tiempo", species: "especies", individuals: "individuos", days: "días", title: "Informe de viaje", by: "Guía", approved: "Aprobado por el guía",
      names: "Nombres comunes en español, con el nombre científico.", several: "varios", group: "un grupo de", unsure: "dudosa", heardOnly: "oída",
      warm: {
        open: function (n, p) { return "El día " + n + (p ? " nos llevó a " + p : " en el campo") + "."; },
        wx: function (w) { return " El tiempo: " + w + "."; },
        first: function (a, b) { return b && b !== a ? " El primer avistamiento llegó a las " + a + " y el último a las " + b + "." : " El primer avistamiento llegó a las " + a + "."; },
        star: function (l) { return " Las estrellas del día fueron " + l + "."; },
        rest: function (l) { return " También anotamos " + l + "."; },
        miss: function (l) { return " Buscamos " + l + " pero no se dejó ver."; },
        fresh: function (k) { return k ? " " + k + (k === 1 ? " especie nueva" : " especies nuevas") + " para la lista del viaje." : ""; },
        quiet: " Un día tranquilo en la lista, pero bueno."
      },
      fact: {
        open: function (n, p) { return "Día " + n + (p ? " — " + p : "") + "."; },
        wx: function (w) { return " Tiempo: " + w + "."; },
        first: function (a, b) { return " Primer registro " + a + (b && b !== a ? ", último " + b : "") + "."; },
        star: function (l) { return " Destacado: " + l + "."; },
        rest: function (l) { return " También registrado: " + l + "."; },
        miss: function (l) { return " Buscadas y no registradas: " + l + "."; },
        fresh: function (k) { return k ? " Nuevas en el viaje: " + k + "." : ""; },
        quiet: " Sin avistamientos registrados."
      },
      adv: {
        open: function (n, p) { return "Día " + n + (p ? ": " + p + ", y la naturaleza no decepcionó." : ": de nuevo en plena naturaleza."); },
        wx: function (w) { return " Condiciones: " + w + "."; },
        first: function (a, b) { return " El primer animal apareció a las " + a + (b && b !== a ? " y la acción duró hasta las " + b : "") + "."; },
        star: function (l) { return " Lo mejor del día: " + l + "."; },
        rest: function (l) { return " Por el camino: " + l + "."; },
        miss: function (l) { return " " + l + " se hizo de rogar."; },
        fresh: function (k) { return k ? " Eso sumó " + k + (k === 1 ? " especie nueva" : " especies nuevas") + " a la lista." : ""; },
        quiet: " Un día lento, pero así es la fauna."
      }
    }
  };
  var TONEKEY = ["warm", "fact", "adv"];

  /* ------------------------------------------------------------ samples */
  var SAMPLES = [
    { op: "Canopy Trails", guide: "Nok", start: 0, photos: [
        ["/assets/travel/globe-l/thailand-01.jpg", "Mainland Asian Elephant"], ["/assets/travel/globe-l/thailand-03.jpg", "Great Hornbill"], ["/assets/travel/globe-l/thailand-04.jpg", "Kramer's Pit Viper"], ["/assets/travel/globe-l/thailand-05.jpg", "Golden Tree Snake"], ["/assets/travel/globe-l/thailand-06.jpg", "East Asian Porcupine"]],
      text: "Day 1 – Khao Yai, visitor centre trail\nWeather: warm, hazy morning, clear afternoon\n06:10 Great Hornbill x2 at the fig tree\n06:40 Wreathed hornbil x5 flying over\n07:30 Lar gibbons (3) calling from the ridge!\n09:15 Pig-tailed macaque x12 on the road\n11:00 Red-headed trogon, female\n14:20 Blue bearded bee eater\n16:45 Asian elephant x4 crossing the road with 2 calves!\n19:50 Kramer's pit viper on a low branch\n20:10 Golden tree snake\n20:40 maybe a leopard cat? just eyeshine\n\nDay 2 – Khao Yai, Haew Suwat trail\nWeather: light rain, cooler\n06:30 Great hornbill x3\n07:15 Chestnut-headed bee-eater x6\n08:05 Asian water dragon at the stream\n10:30 Northern red muntjac\n13:00 Sambar deer x2\n15:20 Orange-winged flying lizard\n19:45 East Asian porcupine\n20:30 Malayan krait!\n21:00 small crested gecko-ish thing on the toilet block wall", tag: 0 },
    { op: "Island Wild Tours", guide: "Kasun", start: 0, photos: [
        ["/assets/travel/globe-l/sri-lanka-04.jpg", "Sri Lankan Elephant"], ["/assets/travel/globe-l/sri-lanka-07.jpg", "Toque Macaque"], ["/assets/travel/globe-l/sri-lanka-08.jpg", "Ceylon Serpent-Eagle"]],
      text: "Day one, Sigiriya. We started at half past six, hot and dry, six guests on the jeep. About twenty toque macaques at the rock gate, amazing! At quarter to eight an Indian garden lizard on the wall. Eight ten, Ceylon serpent eagle perched above the moat. In the afternoon around half past four two mugger crocodiles in the lake and a black turtle.\n\nDay two, Wilpattu National Park. Clear but very dusty, 74 km on the tracks. At quarter past six around forty spotted deer on the first plain, then six wild water buffalo. We were looking for sloth bear but only found fresh tracks. At nine thirty three Sri Lankan elephants bathing at the villu, what a moment! Maybe a jackal at dusk, not sure. Heard a Chunam tree frog after the rain.", tag: 0 },
    { op: "Quetzal Trails", guide: "Mariana", start: 0, photos: [],
      text: "Primer día en Monteverde. Salimos a las seis y media, nublado y fresco, unos dieciséis grados. Vimos un quetzal resplandeciente, increíble, y dos tucanes de pico iris. A las nueve y cuarto seis monos aulladores cerca del sendero. Hacia el mediodía un perezoso de tres dedos y cuatro coatíes de nariz blanca. Escuchamos un búho pero no estoy seguro. Por la tarde llovió fuerte. De noche, tres ranas de ojos rojos.\n\nSegundo día, Arenal. Amaneció despejado y soleado, con el volcán a la vista. A las siete menos cuarto cuatro guacamayos rojos volando. Un basilisco verde junto al río. Buscábamos el tapir de Baird pero no lo vimos. Por la tarde ocho monos capuchinos de cara blanca, ¡qué día!, y una mariposa morfo azul. Cuatro clientes, doce kilómetros.", tag: 0 },
    { op: "Marismas Wild", guide: "Lucía", start: 0, photos: [],
      text: "Día uno, Doñana. Salimos a las siete de la mañana con cielo despejado y mucho viento. Vimos un águila imperial ibérica posada en un alcornoque, increíble. A las ocho y media unos treinta flamencos comunes en la laguna y una garceta plumosa. Un zorro rojo cruzando el camino. Escuchamos un búho real pero no lo vimos. Por la tarde, hacia las cinco, una grulla común y tres buitres leonados.\n\nSegundo día. Amaneció nublado y fresco, unos doce grados. A las siete y cuarto un lince ibérico cruzando el camino, ¡qué suerte! Buscábamos el lobo ibérico pero no apareció. Una abubilla y varios mirlos comunes. Cinco clientes y veinte kilómetros.", tag: 0 }
  ];
  var SWATCHES = ["#55704c", "#a9842f", "#2f6b7a", "#8a4b3a"];
  var EXTRA_PLACES = { "Khao Yai": [14.43, 101.37], "Haew Suwat": [14.4, 101.37], "Sigiriya": [7.954, 80.755], "Wilpattu": [8.458, 80.052], "Monteverde": [10.3, -84.82], "Arenal": [10.46, -84.7], "Yala": [6.37, 81.5], "Kruger": [-23.99, 31.55], "Masai Mara": [-1.49, 35.14], "Doñana": [37.0, -6.44], "Tortuguero": [10.54, -83.5], "Serengeti": [-2.33, 34.83], "Pantanal": [-17.5, -56.9], "Corcovado": [8.54, -83.58] };

  /* ------------------------------------------------------------ taxonomy */
  var TAX = [], PLACES = {}, BYSCI = {};
  function bySci(s) { return BYSCI[s]; }
  function bySpName(v) {
    var k = TR.nlp.canon(v).join(" "), r = null;
    TAX.some(function (x) { if (TR.nlp.canon(x.n).join(" ") === k || TR.nlp.canon(x.es || "").join(" ") === k || x.ns === k) { r = x; return true; } });
    return r;
  }
  function dn(sp) { return st.lang === "es" && sp.es ? sp.es : sp.n; }

  /* ------------------------------------------------------------ analysis with the guide's decisions applied */
  var st = { days: [], tone: 0, lang: LANG, color: SWATCHES[0], op: "", guide: "", start: "", photos: [], approved: false, when: "", generated: false, ov: {}, tab: "report", dlang: LANG === "es" ? "es-ES" : "en-GB", saved: null };
  var el = {}, timer = null;
  function okey(d, s) { return TR.nlp.canon(s.phrase).join(" ") + "@" + d.n; }
  function analyse() {
    var res = TR.nlp.analyse(el.notes.value, { start: st.start || undefined });
    res.days.forEach(function (d) {
      d.notes = [];
      d.sightings.forEach(function (s) {
        if (s.m.st === "exact" || s.m.st === "partial" || s.m.st === "fixed") s.sp = s.m.sp;
        s.done = !!s.sp && !s.unc;
        var o = st.ov[okey(d, s)];
        if (o) {
          if (o.sci) { s.sp = bySci(o.sci); s.unc = false; s.done = true; s.m = { st: "exact", sp: s.sp }; }
          if (o.rm) s.kind = "removed";
          if (o.note) { s.kind = "note"; d.notes.push(s.raw); }
        }
      });
    });
    st.days = res.days;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { analyse(); drawUnderstood(); if (st.generated) draw(); }, 350); }

  /* ------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function join(list, lang) { if (list.length < 2) return list.join(""); return list.slice(0, -1).join(", ") + (lang === "es" ? " y " : " and ") + list[list.length - 1]; }
  function wxText(d, lang) {
    var t = d.weather.map(function (w) { return TR.nlp.wxLabel(w, lang); });
    if (d.temp != null) t.push(d.temp + " °C");
    return t.join(", ");
  }
  function fmtDate(iso, lang) { try { var a = iso.split("-"); return new Date(+a[0], +a[1] - 1, +a[2], 12).toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } }
  function pending() { var out = []; st.days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.kind === "sp" && !s.done) out.push(s); }); }); return out; }
  function aggregate() {
    var map = {}, order = [];
    st.days.forEach(function (d) {
      d.sightings.forEach(function (s) {
        if (s.kind !== "sp" || !s.sp || !s.done) return;
        var k = s.sp.s, r = map[k];
        if (!r) { r = map[k] = { sp: s.sp, total: 0, exact: true, days: [], star: false, fixed: false }; order.push(r); }
        if (!s.count) r.exact = false;
        r.total += s.count || 1;
        if (r.days.indexOf(d.n) < 0) r.days.push(d.n);
        if (s.star) r.star = true;
        if (s.m.st === "fixed" || s.m.st === "partial" || s.m.st === "sugg" || s.m.st === "amb") r.fixed = true;
      });
    });
    return order;
  }
  function item(s) {
    var R = RT[st.lang], t = dn(s.sp);
    if (s.count) t += " (" + (s.approx ? "~" : "×") + s.count + ")"; else if (s.qty === "several") t += " (" + R.several + ")"; else if (s.qty === "group") t += " (" + (st.lang === "es" ? "grupo" : "group") + ")";
    var extra = s.note ? s.note : s.beh.map(function (b) { return TR.nlp.behLabel(b, st.lang); }).join(", ");
    if (extra) t += " " + extra.replace(/^\s+/, "");
    return t;
  }
  function narrative(d, seenBefore) {
    var R = RT[st.lang], tone = R[TONEKEY[st.tone]], good = d.sightings.filter(function (s) { return s.kind === "sp" && s.sp && s.done; }), stars, others, fresh = 0, seen = {}, txt, wt;
    good.forEach(function (s) { if (!seenBefore[s.sp.s] && !seen[s.sp.s]) fresh++; seen[s.sp.s] = 1; });
    txt = tone.open(d.n, d.place || "");
    wt = wxText(d, st.lang); if (wt) txt += tone.wx(wt);
    if (!good.length) return txt + tone.quiet;
    var times = good.map(function (s) { return s.time; }).filter(Boolean).sort();
    if (times.length) txt += tone.first(times[0], times[times.length - 1]);
    stars = good.filter(function (s) { return s.star; }).slice(0, 4);
    if (!stars.length) stars = good.slice().sort(function (a, b) { return (b.count || 1) - (a.count || 1) || (b.note ? 1 : 0) - (a.note ? 1 : 0); }).slice(0, 2);
    others = good.filter(function (s) { return stars.indexOf(s) < 0; });
    var uniq = {}; others = others.filter(function (s) { if (uniq[s.sp.s]) return false; uniq[s.sp.s] = 1; return true; });
    txt += tone.star(join(stars.map(item), st.lang));
    if (others.length) txt += tone.rest(join(others.slice(0, 8).map(item), st.lang));
    if (d.misses && d.misses.length) txt += tone.miss(join(d.misses.slice(0, 3).map(function (x) { var e = TAX.filter(function (t) { return t.n === x; })[0]; return e ? dn(e) : x; }), st.lang));
    txt += tone.fresh(fresh);
    good.forEach(function (s) { seenBefore[s.sp.s] = 1; });
    return txt;
  }

  /* ------------------------------------------------------------ route map */
  function mapSvg(accent) {
    var pts = [], seen = {};
    st.days.forEach(function (d) { if (d.ll) { var key = (d.place || "").split(",")[0].trim().toLowerCase() || d.ll.join(); if (!seen[key]) { seen[key] = 1; pts.push({ n: d.n, name: (d.place || "").split(",")[0].trim(), ll: d.ll }); } } });
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
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 26).toFixed(1) + '" text-anchor="middle" class="tr-map-l">' + esc((pts[i].name || "").split(",")[0].slice(0, 26)) + "</text>";
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ shell */
  var SW = SWATCHES;
  function shell() {
    var tips = T.dictTips.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    root.innerHTML =
      '<div class="tr-tabs" role="tablist"><button type="button" role="tab" class="tr-tab on" data-tab="report" aria-selected="true">' + T.tabReport + '</button><button type="button" role="tab" class="tr-tab" data-tab="stats" aria-selected="false">' + T.tabStats + "</button></div>" +
      '<div id="tr-pane-report"><div class="tr-grid">' +
      '<section class="tr-card tr-in"><h3>' + T.s1 + '</h3><p class="tr-sub">' + T.s1h + "</p>" +
      '<div class="tr-samples"><span>' + T.samples + "</span>" + T.sampleNames.map(function (n, i) { return '<button type="button" class="tr-chip" data-sample="' + i + '">' + n + "</button>"; }).join("") + "</div>" +
      '<div class="tr-dictbar"><button type="button" class="tr-btn" id="tr-dict" hidden><i class="tr-mic" aria-hidden="true"></i><span>' + T.dictate + '</span></button><button type="button" class="tr-btn ghost" id="tr-newday">' + T.newDay + '</button><label class="tr-dl" id="tr-dl-wrap">' + T.dlang + '<select id="tr-dlang"><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option><option value="es-ES">Español (España)</option><option value="es-MX">Español (México)</option><option value="es-AR">Español (Argentina)</option></select></label></div>' +
      '<p class="tr-listen" id="tr-listen" hidden><i class="tr-pulse"></i> ' + T.dictating + '</p>' +
      '<textarea id="tr-notes" spellcheck="false" placeholder="' + esc(T.ph) + '" aria-label="' + esc(T.s1) + '"></textarea><p class="tr-interim" id="tr-interim" aria-live="polite"></p>' +
      '<p class="tr-nodict" id="tr-nodict" hidden>' + T.dictNone + "</p>" +
      '<details class="tr-tips"><summary>' + T.dictHelp + "</summary><ul>" + tips + "</ul><p>" + T.dictPrivacy + "</p></details>" +
      '<div class="tr-tools"><label class="tr-btn ghost" for="tr-photos">' + T.photos + '</label><input type="file" id="tr-photos" accept="image/*" multiple hidden><button type="button" class="tr-btn ghost" id="tr-clear">' + T.clear + '</button><span class="tr-note">' + T.photosNote + "</span></div><div id=\"tr-ph\" class=\"tr-ph\"></div>" +
      '<div class="tr-opts"><label>' + T.operator + '<input id="tr-op" maxlength="40" placeholder="Canopy Trails"></label><label>' + T.guide + '<input id="tr-guide" maxlength="30" placeholder="Nok"></label>' +
      "<label>" + T.start + '<input id="tr-start" type="date"></label>' +
      "<label>" + T.tone + '<select id="tr-tone">' + T.tones.map(function (t, i) { return '<option value="' + i + '">' + t + "</option>"; }).join("") + "</select></label>" +
      "<label>" + T.rlang + '<select id="tr-lang"><option value="en">English</option><option value="es">Español</option></select></label>' +
      '<div class="tr-sw" role="group" aria-label="' + esc(T.color) + '">' + SW.map(function (c, i) { return '<button type="button" class="tr-swatch' + (i ? "" : " on") + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join("") + "</div></div>" +
      '<button type="button" class="tr-btn" id="tr-go">' + T.go + " →</button></section>" +
      '<section class="tr-card tr-check"><h3>' + T.und + '</h3><div id="tr-und" class="tr-und"></div><div id="tr-checkbox" hidden><h3 class="tr-h3b">' + T.s2 + '</h3><p class="tr-sub">' + T.s2h + '</p><div id="tr-flags"></div></div></section>' +
      "</div>" +
      '<section class="tr-card tr-out" id="tr-out" hidden><h3 class="tr-h3">' + T.s3 + '</h3><div id="tr-report"></div><div id="tr-gate"></div></section></div>' +
      '<div id="tr-pane-stats" class="tr-card" hidden></div>' +
      '<p class="tr-fine">' + T.unsure + "</p>";
    el.notes = $("#tr-notes"); el.op = $("#tr-op"); el.guide = $("#tr-guide"); el.tone = $("#tr-tone"); el.lang = $("#tr-lang"); el.start = $("#tr-start"); el.dlang = $("#tr-dlang");
    el.lang.value = st.lang; el.dlang.value = st.dlang;
  }

  function setTab(t) {
    st.tab = t;
    Array.prototype.forEach.call(root.querySelectorAll(".tr-tab"), function (b) { var on = b.dataset.tab === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    $("#tr-pane-report").hidden = t !== "report"; $("#tr-pane-stats").hidden = t !== "stats";
    if (t === "stats" && TR.log) { TR.log.mount($("#tr-pane-stats")); }
  }

  function loadSample(i) {
    var s = SAMPLES[i];
    stopDict();
    el.notes.value = s.text; el.op.value = s.op; el.guide.value = s.guide; st.op = s.op; st.guide = s.guide;
    st.ov = {}; st.approved = false; st.saved = null;
    el.start.value = st.start = isoDaysAgo(6 - 0);
    st.photos = s.photos.map(function (p) { var e = TAX.filter(function (x) { return x.n === p[1]; })[0]; return { src: p[0], sci: e ? e.s : "" }; });
    st.color = SW[i % 4]; swatch(st.color);
    st.lang = i >= 2 ? "es" : (LANG === "es" && i < 2 ? "es" : "en"); el.lang.value = st.lang;
    el.dlang.value = st.dlang = i >= 2 ? "es-ES" : (LANG === "es" ? "es-ES" : "en-GB");
    generate();
  }
  function isoDaysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function swatch(c) { st.color = c; Array.prototype.forEach.call(root.querySelectorAll(".tr-swatch"), function (b) { b.classList.toggle("on", b.dataset.c === c); }); if (st.generated) draw(); }

  function generate() {
    if (!el.notes.value.trim()) { flash($("#tr-go"), T.emptyNotes); return; }
    st.op = el.op.value.trim() || "Your Tours"; st.guide = el.guide.value.trim(); st.tone = +el.tone.value; st.lang = el.lang.value; st.start = el.start.value;
    analyse(); st.approved = false; st.generated = true; st.saved = null;
    drawUnderstood(); draw();
    var t = $("#tr-out"); if (t && !t.hidden && matchMedia("(prefers-reduced-motion:no-preference)").matches) t.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function flash(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1800); }
  function draw() { flags(); report(); gate(); photoTags(); }

  /* ------------------------------------------------------------ "what the tool understood" */
  function drawUnderstood() {
    var box = $("#tr-und"), h = "";
    if (!el.notes.value.trim() || !st.days.length) { box.innerHTML = '<p class="tr-und-empty">' + T.undEmpty + "</p>"; return; }
    st.days.forEach(function (d) {
      var chips = [];
      chips.push('<span class="tr-c d">' + esc(fmtDate(d.date, LANG)) + (d.dateGuess ? ' <em>(' + T.est + ")</em>" : "") + "</span>");
      if (d.place) chips.push('<span class="tr-c p">' + esc(d.place.split(",")[0]) + "</span>");
      var wt = wxText(d, LANG); if (wt) chips.push('<span class="tr-c w">' + esc(wt) + "</span>");
      if (d.guests) chips.push('<span class="tr-c">' + d.guests + " " + T.guests + "</span>");
      if (d.km) chips.push('<span class="tr-c">' + d.km + " " + T.km + "</span>");
      h += '<div class="tr-und-day"><h4>' + RT[LANG].day + " " + d.n + '</h4><div class="tr-chips">' + chips.join("") + "</div><ul>";
      d.sightings.forEach(function (s) {
        if (s.kind === "removed") return;
        var nm = s.sp ? (LANG === "es" && s.sp.es ? s.sp.es : s.sp.n) : s.phrase, tags = [];
        if (s.count) tags.push((s.approx ? "~" : "×") + s.count); else if (s.qty) tags.push(s.qty === "group" ? (LANG === "es" ? "grupo" : "group") : RT[LANG].several);
        s.desc.forEach(function (x) { tags.push(x); });
        s.beh.forEach(function (b) { tags.push(TR.nlp.behLabel(b, LANG)); });
        if (s.star) tags.push("★");
        if (s.heard) tags.push(T.heard);
        var bad = !s.done && s.kind === "sp", cls = bad ? " warn" : (s.sp && s.m.st !== "exact" ? " fix" : "");
        h += '<li class="' + cls.trim() + '"><span class="t">' + (s.time || (s.period ? TR.nlp.periodShort(s.period, LANG) : "·")) + '</span><b>' + esc(nm) + "</b>" + tags.map(function (x) { return '<i class="tr-tag">' + esc(x) + "</i>"; }).join("") + (bad ? '<i class="tr-tag w">' + (s.unc ? T.unsureTag : T.fixTag) + "</i>" : "") + "</li>";
      });
      (d.misses || []).forEach(function (m) { var e = TAX.filter(function (t) { return t.n === m; })[0]; h += '<li class="miss"><span class="t">·</span><b>' + esc(e ? (LANG === "es" && e.es ? e.es : e.n) : m) + '</b><i class="tr-tag">' + T.notFound + "</i></li>"; });
      h += "</ul></div>";
    });
    box.innerHTML = h;
  }

  /* ------------------------------------------------------------ flagged sightings */
  function flags() {
    var all = [], f, box = $("#tr-checkbox"), cont = $("#tr-flags");
    st.days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.kind === "sp") all.push([d, s]); }); });
    var sp = aggregate().length;
    f = all.filter(function (x) { return !x[1].done; });
    box.hidden = false;
    var head = '<div class="tr-sumline"><strong>' + sp + "</strong> " + T.matched + ' · <strong class="' + (f.length ? "warn" : "ok") + '">' + f.length + "</strong> " + T.flagged + "</div>";
    if (!f.length) { cont.innerHTML = head + '<p class="tr-allgood">✓ ' + T.none + "</p>" + infoChips(all); return; }
    cont.innerHTML = head + f.map(function (x) { return flagCard(x[0], x[1]); }).join("") + infoChips(all);
  }
  function infoChips(all) {
    var fixed = all.filter(function (x) { var s = x[1]; return s.done && (s.m.st === "fixed" || s.m.st === "partial"); });
    if (!fixed.length) return "";
    return '<div class="tr-info">' + fixed.map(function (x) { var s = x[1]; return '<span class="tr-pill">' + (s.m.st === "fixed" ? T.fixedChip : T.partChip) + ": “" + esc(s.phrase) + "” → <b>" + esc(dn(s.sp)) + "</b></span>"; }).join("") + "</div>";
  }
  function reason(s) {
    if (s.unc && s.heard) return T.reasonHeard;
    if (s.unc && s.m.st === "none") return T.reasonUnc + " · " + T.reasonNone;
    if (s.unc) return T.reasonUnc;
    if (s.m.st === "amb") return T.reasonAmb;
    if (s.m.st === "sugg") return T.reasonSug;
    return T.reasonNone;
  }
  function flagCard(d, s) {
    var sug = s.sp ? [s.sp] : (s.m.sugg || []), h = '<article class="tr-flag" data-id="' + s.id + '" data-day="' + d.n + '"><div class="tr-flag-top"><span class="tr-day">' + RT[LANG].day.slice(0, 3) + " " + d.n + (s.time ? " · " + s.time : "") + "</span><q>" + esc(s.raw) + '</q></div><p class="tr-why">' + reason(s) + '</p><div class="tr-acts">';
    sug.forEach(function (x) { h += '<button type="button" class="tr-btn sm" data-act="pick" data-s="' + esc(x.s) + '">' + (s.sp ? T.confirm + " " : T.use + " ") + esc(LANG === "es" && x.es ? x.es : x.n) + "</button>"; });
    h += '<input class="tr-type" list="tr-dl" placeholder="' + esc(T.typeSp) + '" aria-label="' + esc(T.typeSp) + '"><button type="button" class="tr-btn sm ghost" data-act="note">' + T.keepNote + '</button><button type="button" class="tr-btn sm ghost" data-act="rm">' + T.remove + "</button></div></article>";
    return h;
  }
  function find(id) { var r = null, dd = null; st.days.forEach(function (d) { d.sightings.forEach(function (s) { if (s.id === id) { r = s; dd = d; } }); }); return r ? { s: r, d: dd } : null; }

  /* ------------------------------------------------------------ the report */
  function dateRange() {
    var ds = st.days.map(function (d) { return d.date; }).filter(Boolean).sort();
    if (!ds.length) return "";
    var f = function (x) { var p = x.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString(st.lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); };
    return ds.length === 1 || ds[0] === ds[ds.length - 1] ? f(ds[0]) : f(ds[0]) + " – " + f(ds[ds.length - 1]);
  }
  function routeLine() {
    var seen = {}, out = [];
    st.days.forEach(function (d) { var n = (d.place || "").split(",")[0].trim(), k = n.toLowerCase(); if (n && !seen[k]) { seen[k] = 1; out.push(n); } });
    return out.join(" → ");
  }
  function report() {
    var R = RT[st.lang], L = TR.viz.L(st.lang), order = aggregate(), out = $("#tr-out"), seenBefore = {}, html, label = tripName();
    out.hidden = false;
    var a = TR.viz.analyse(st.days, dn, st.photos), behL = function (b) { return TR.nlp.behLabel(b, st.lang); };
    var kp = [[a.nSp, R.species], [a.tot, R.individuals], [st.days.length, R.days]];
    if (a.guests) kp.push([a.guests, L.guests]); if (a.km) kp.push([a.km, L.km]); var nStar = 0; st.days.forEach(function (d) { d.sightings.forEach(function (x) { if (x.kind === "sp" && x.sp && x.done && x.star) nStar++; }); }); if (nStar) kp.push([nStar, "★"]);
    html = '<article class="tr-report" style="--ac:' + st.color + '"><header class="tr-rh"><p class="tr-brand">' + esc(st.op) + "</p><h4>" + R.title + " · " + esc(label) + "</h4>" +
      '<p class="tr-by">' + esc([dateRange(), st.guide ? R.by + ": " + st.guide : ""].filter(Boolean).join(" · ")) + "</p>" + (routeLine() && st.days.length > 1 ? '<p class="tr-route">' + esc(routeLine()) + "</p>" : "") +
      '<div class="tr-stats">' + kp.map(function (k) { return "<div><strong>" + k[0] + "</strong><span>" + esc(k[1]) + "</span></div>"; }).join("") + "</div></header>";
    html += TR.viz.highlights(a, L, st.lang, behL) + TR.viz.glance(a, L, st.lang);
    html += TR.viz.charts(a, L);
    html += TR.viz.weather(st.days, L, function (d) { return wxText(d, st.lang); });
    st.days.forEach(function (d, i) {
      var pd = a.per[i], good = d.sightings.filter(function (s) { return s.kind === "sp" && s.sp && s.done; });
      html += '<section class="tr-day-block"><h5>' + R.day + " " + d.n + (d.place ? " — " + esc(d.place) : "") + " <small>" + esc(fmtDate(d.date, st.lang)) + "</small></h5>";
      html += '<div class="vz-daystats"><span><b>' + pd.sp + "</b> " + R.species + "</span><span><b>" + pd.ind + "</b> " + R.individuals + "</span>" + (pd.first ? "<span>" + pd.first + (pd.last && pd.last !== pd.first ? "–" + pd.last : "") + "</span>" : "") + (pd.nw ? "<span><b>" + pd.nw + "</b> " + (st.lang === "es" ? "nuevas" : "new") + "</span>" : "") + (d.guests ? "<span>" + d.guests + " " + L.guests + "</span>" : "") + (d.km ? "<span>" + d.km + " km</span>" : "") + "</div>";
      html += "<p>" + esc(narrative(d, seenBefore)) + "</p>";
      if (d.notes.length) html += '<p class="tr-gnotes">' + d.notes.map(esc).join(" · ") + "</p>";
      html += "</section>";
    });
    var ph = st.photos.filter(function (p) { return p.src; });
    if (ph.length) {
      html += '<section class="tr-gal"><h5>' + T.gallery + '</h5><div class="tr-photos">' + ph.map(function (p) { var e = p.sci ? bySci(p.sci) : null, cap = e ? dn(e) : ""; return '<figure><img src="' + esc(p.src) + '" alt="' + esc(T.photoCap + " " + cap) + '" loading="lazy"><figcaption>' + esc(cap) + "</figcaption></figure>"; }).join("") + "</div></section>";
    }
    html += TR.viz.presence(a, st.days, L);
    html += TR.viz.wishlist(a, L, st.lang, function (n) { var e = TAX.filter(function (t) { return t.n === n; })[0]; return e ? dn(e) : n; });
    html += '<p class="tr-fine2 tr-names">' + R.names + "</p>";
    if (st.approved) html += '<footer class="tr-foot">✓ ' + R.approved + (st.guide ? " (" + esc(st.guide) + ")" : "") + " · " + esc(st.when) + "</footer>";
    html += "</article>";
    $("#tr-report").innerHTML = html;
    $("#tr-out").classList.toggle("is-approved", st.approved);
  }
  function printNode(node) {
    if (!node) return;
    var old = document.getElementById("tr-print"); if (old) old.remove();
    var box = document.createElement("div"); box.id = "tr-print"; box.appendChild(node.cloneNode(true)); document.body.appendChild(box);
    document.documentElement.classList.add("tr-printing");
    setTimeout(function () { window.print(); }, 60);
  }
  TR.printNode = printNode;
  function tripName() {
    var ps = st.days.map(function (d) { return d.place; }).filter(Boolean), first = (ps[0] || "").split(/[,–-]/)[0].trim();
    return first || (LANG === "es" ? "Mi viaje" : "My trip");
  }

  /* photo tagging */
  function photoTags() {
    var box = $("#tr-ph"), order = aggregate();
    if (!st.photos.length) { box.innerHTML = ""; return; }
    box.innerHTML = st.photos.map(function (p, i) {
      return '<div class="tr-ph-i"><img src="' + esc(p.src) + '" alt=""><select data-ph="' + i + '" aria-label="' + esc(T.tagPhoto) + '"><option value="">' + T.untagged + "</option>" + order.map(function (r) { return '<option value="' + esc(r.sp.s) + '"' + (p.sci === r.sp.s ? " selected" : "") + ">" + esc(dn(r.sp)) + "</option>"; }).join("") + "</select></div>";
    }).join("");
  }

  /* ------------------------------------------------------------ approval, logbook and exports */
  function gate() {
    var g = $("#tr-gate"), left = pending().length, h;
    if (st.approved) {
      h = '<div class="tr-actions"><button type="button" class="tr-btn" data-x="print">' + T.print + '</button><button type="button" class="tr-btn ghost" data-x="copy">' + T.copy + '</button><button type="button" class="tr-btn ghost" data-x="csv">' + T.csv + '</button><button type="button" class="tr-btn ghost" data-x="json">' + T.json + '</button><button type="button" class="tr-btn ghost" data-x="edit">' + T.edit + "</button></div>" +
        (st.saved ? '<p class="tr-saved">✓ ' + (st.saved.ok ? T.saved : T.storeFail) + ' <button type="button" class="tr-link" data-x="stats">' + T.viewStats + " →</button></p>" : "") + dataPreview();
    } else {
      h = '<div class="tr-gate"><div><strong>' + T.approveHead + "</strong><span>" + (left ? T.approveWait + " (" + left + ")" : "✓") + '</span><label class="tr-chk"><input type="checkbox" id="tr-savelog" checked> ' + T.saveLog + '</label></div><button type="button" class="tr-btn" data-x="approve"' + (left ? " disabled" : "") + ">" + T.approve + "</button></div>";
    }
    g.innerHTML = h;
  }
  function rows() {
    var out = [];
    st.days.forEach(function (d) {
      d.sightings.forEach(function (s) {
        if (s.kind !== "sp" || !s.sp || !s.done) return;
        out.push({ date: d.date, day: d.n, place: d.place || null, lat: d.ll ? d.ll[0] : null, lng: d.ll ? d.ll[1] : null, time: s.time || null, scientific_name: s.sp.s, common_name_en: s.sp.n, common_name_es: s.sp.es || null, count: s.count || null, count_approximate: !!s.approx, behaviour: s.beh.join("|") || null, weather: d.weather.map(function (w) { return w.k; }).join("|") || null, temperature_c: d.temp, note: s.note || null, id_status: s.m.st === "exact" ? "confirmed" : "guide_confirmed", observer: st.guide || null, operator: st.op });
      });
    });
    return out;
  }
  function hashStr(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function buildTrip() {
    var photoSci = {}; st.photos.forEach(function (p) { if (p.sci) photoSci[p.sci] = 1; });
    var days = st.days.map(function (d) {
      return { date: d.date, place: d.place || "", ll: d.ll || null, guests: d.guests || null, km: d.km || null, weather: d.weather.map(function (w) { return w.k; }), sightings: d.sightings.filter(function (s) { return s.kind === "sp" && s.sp && s.done; }).map(function (s) { return { sci: s.sp.s, n: s.sp.n, es: s.sp.es || "", count: s.count || 1, approx: !!s.approx || !s.count, time: s.time || "", star: !!s.star, photo: !!photoSci[s.sp.s] }; }) };
    });
    return { id: hashStr([st.op, st.guide, days.length ? days[0].date : "", tripName()].join("|")), op: st.op, guide: st.guide, name: tripName(), start: days.length ? days[0].date : "", days: days };
  }
  function dataPreview() {
    var r = rows().slice(0, 4);
    return '<div class="tr-data"><h4>' + T.dataHead + "</h4><p>" + T.dataH + "</p><pre>" + esc(JSON.stringify(r, null, 1)) + "</pre></div>";
  }
  function plain() {
    var R = RT[st.lang], order = aggregate(), seen = {}, t = st.op + " — " + R.title + " · " + tripName() + "\n\n";
    st.days.forEach(function (d) { t += R.day + " " + d.n + (d.place ? " — " + d.place : "") + "\n" + narrative(d, seen) + "\n\n"; });
    t += T.checklist + ":\n"; order.forEach(function (r, i) { t += (i + 1) + ". " + dn(r.sp) + " (" + r.sp.s + ") — " + (r.exact ? "" : "≥") + r.total + "\n"; });
    return t;
  }
  function download(name, mime, data) {
    var a = document.createElement("a"), u = URL.createObjectURL(new Blob([data], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
  }
  function csv() {
    var r = rows(), keys = r.length ? Object.keys(r[0]) : ["date", "scientific_name"];
    return "﻿" + [keys.join(",")].concat(r.map(function (o) { return keys.map(function (k) { var v = o[k] == null ? "" : String(o[k]); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); })).join("\n");
  }

  /* ------------------------------------------------------------ dictation */
  var rec = null, want = false;
  function SR() { return window.SpeechRecognition || window.webkitSpeechRecognition; }
  function setDictUi(on) {
    var b = $("#tr-dict"); if (!b) return;
    b.classList.toggle("live", on); b.querySelector("span").textContent = on ? T.stop : T.dictate; $("#tr-listen").hidden = !on;
    if (!on) $("#tr-interim").textContent = "";
  }
  function addFinal(t) {
    t = t.replace(/\s+/g, " ").trim().replace(/\s*\b(new line|new paragraph|nueva l[ií]nea|nuevo p[aá]rrafo)\b[.,]?\s*/gi, "\n");
    if (!t.trim()) return;
    t = t.replace(/(^|\n\s*)([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); });
    if (!/[.!?\n]$/.test(t)) t += ".";
    var v = el.notes.value, sep = !v || /\s$/.test(v) ? "" : " ";
    t = t.replace(/\n$/, "") === t ? t : t.replace(/([^.!?\n])\n$/, "$1.\n");
    el.notes.value = v + sep + t + (/\n$/.test(t) ? "" : " ");
    el.notes.scrollTop = el.notes.scrollHeight;
    schedule();
  }
  function startDict() {
    var C = SR(); if (!C) return;
    rec = new C(); rec.continuous = true; rec.interimResults = true; rec.lang = el.dlang.value; rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var interim = "", i, r;
      for (i = ev.resultIndex; i < ev.results.length; i++) { r = ev.results[i]; if (r.isFinal) addFinal(r[0].transcript); else interim += r[0].transcript; }
      $("#tr-interim").textContent = interim;
    };
    rec.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed") { want = false; setDictUi(false); var n = $("#tr-nodict"); n.textContent = T.denied; n.hidden = false; } };
    rec.onend = function () { if (want) { try { rec.start(); } catch (x) { want = false; setDictUi(false); } } else setDictUi(false); };
    want = true; setDictUi(true);
    try { rec.start(); } catch (x) { want = false; setDictUi(false); }
  }
  function stopDict() { want = false; if (rec) { try { rec.stop(); } catch (x) {} } setDictUi(false); }
  function newDay() {
    var n = st.days.length + 1, v = el.notes.value.replace(/\s+$/, "");
    el.notes.value = (v ? v + "\n\n" : "") + (LANG === "es" ? "Día " : "Day ") + n + " – ";
    el.notes.focus(); schedule();
  }

  /* ------------------------------------------------------------ events */
  function bind() {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"), card, o, v;
      if (!b) return;
      if (b.dataset.tab) return setTab(b.dataset.tab);
      if (b.dataset.sample != null) { setTab("report"); return loadSample(+b.dataset.sample); }
      if (b.classList.contains("tr-swatch")) return swatch(b.dataset.c);
      if (b.id === "tr-go") return generate();
      if (b.id === "tr-newday") return newDay();
      if (b.id === "tr-clear") { stopDict(); el.notes.value = ""; st.days = []; st.photos = []; st.ov = {}; st.generated = false; $("#tr-checkbox").hidden = true; $("#tr-out").hidden = true; drawUnderstood(); photoTags(); return; }
      if (b.id === "tr-dict") return want ? stopDict() : startDict();
      if (b.dataset.act) {
        card = b.closest(".tr-flag"); o = find(+card.dataset.id); if (!o) return;
        var key = okey(o.d, o.s);
        if (b.dataset.act === "pick") st.ov[key] = { sci: b.dataset.s };
        if (b.dataset.act === "rm") st.ov[key] = { rm: 1 };
        if (b.dataset.act === "note") st.ov[key] = { note: 1 };
        analyse(); drawUnderstood(); return draw();
      }
      var x = b.dataset.x; if (!x) return;
      if (x === "approve") {
        st.approved = true; st.when = new Date().toLocaleDateString(st.lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
        var sv = $("#tr-savelog"); st.saved = null;
        if (sv && sv.checked && TR.log) { st.saved = TR.log.add(buildTrip()); TR.log.pickAnchorFromTrips(); }
        return draw();
      }
      if (x === "stats") { setTab("stats"); $("#tr-pane-stats").scrollIntoView({ block: "start" }); return; }
      if (x === "edit") { st.approved = false; return draw(); }
      if (x === "print") { return printNode($("#tr-report .tr-report")); }
      if (x === "copy") { v = plain(); (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { flash(b, T.copied); }, function () { var t = document.createElement("textarea"); t.value = v; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); flash(b, T.copied); } catch (z) {} t.remove(); }); return; }
      if (x === "csv") return download("trip-sightings.csv", "text/csv;charset=utf-8", csv());
      if (x === "json") return download("trip-sightings.json", "application/json", JSON.stringify(rows(), null, 2));
    });
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !e.target.classList.contains("tr-type")) return;
      var card = e.target.closest(".tr-flag"), o = find(+card.dataset.id), sp = bySpName(e.target.value.trim());
      if (sp && o) { st.ov[okey(o.d, o.s)] = { sci: sp.s }; analyse(); drawUnderstood(); draw(); } else e.target.classList.add("bad");
    });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "tr-photos") { Array.prototype.forEach.call(t.files, function (f) { st.photos.push({ src: URL.createObjectURL(f), sci: "" }); }); t.value = ""; photoTags(); if (st.generated) report(); }
      if (t.dataset && t.dataset.ph != null) { st.photos[+t.dataset.ph].sci = t.value; if (st.generated) report(); }
      if (t.id === "tr-tone") { st.tone = +t.value; if (st.generated) draw(); }
      if (t.id === "tr-lang") { st.lang = t.value; if (st.generated) draw(); }
      if (t.id === "tr-dlang") { st.dlang = t.value; if (want) { stopDict(); startDict(); } }
      if (t.id === "tr-start") { st.start = t.value; schedule(); }
    });
    root.addEventListener("input", function (e) {
      var id = e.target.id;
      if (id === "tr-notes") schedule();
      if (id === "tr-op") { st.op = e.target.value.trim() || "Your Tours"; if (st.generated) report(); }
      if (id === "tr-guide") { st.guide = e.target.value.trim(); if (st.generated) report(); }
    });
    window.addEventListener("afterprint", function () { document.documentElement.classList.remove("tr-printing"); var b = document.getElementById("tr-print"); if (b) b.remove(); });
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    shell(); bind();
    if (SR()) { $("#tr-dict").hidden = false; } else { $("#tr-nodict").hidden = false; $("#tr-dl-wrap").hidden = true; }
    var dl = document.createElement("datalist"); dl.id = "tr-dl";
    dl.innerHTML = TAX.map(function (x) { return '<option value="' + esc(x.n) + '">' + (x.es ? '<option value="' + esc(x.es) + '">' : ""); }).join(""); root.appendChild(dl);
    if (TR.log) TR.log.init(TAX);
    loadSample(LANG === "es" ? 2 : 0);
    var h = (location.hash || "").replace("#", ""); if (h === "stats") setTab("stats");
  }
  function fail() { root.innerHTML = '<p class="tr-fine">' + (LANG === "es" ? "No se pudo cargar la demostración." : "The demo could not load.") + "</p>"; }

  Promise.all([
    fetch("/data/taxonomy-demo.json").then(function (r) { return r.json(); }),
    fetch("/data/stops.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    var stops = res[1], c, n, p;
    for (c in stops) for (n in stops[c]) PLACES[n] = stops[c][n];
    for (p in EXTRA_PLACES) PLACES[p] = EXTRA_PLACES[p];
    TR.nlp.build(res[0], PLACES);
    TAX = TR.nlp.tax(); TAX.forEach(function (e) { BYSCI[e.s] = e; });
    boot();
  }).catch(function (e) { if (window.console) console.error(e); fail(); });
})();
