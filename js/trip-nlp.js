/* Trip Reports: understands a guide's free-form notes or dictation (English or Spanish) with no server and no AI model.
   It finds days, dates, times, weather, places, species, counts, behaviour, guests and distance, and flags what it is unsure about.
   The real product would use an LLM for the hard cases; this is deliberately rule-based so it is predictable and works offline. */
(function (g) {
  var TR = g.TR = g.TR || {};

  /* ------------------------------------------------------------ small helpers */
  function strip(s) {
    s = (s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return s.replace(/['’`]/g, "");
  }
  function sing(t) {
    var n = t.length;
    if (n < 4 || /^\d+$/.test(t)) return t;
    var a, b;
    if (/ies$/.test(t) && n > 4) { a = t.slice(0, -3) + "y"; b = t.slice(0, -2); return has(VOCAB, a) ? a : has(VOCAB, b) ? b : (has(VOCAB, t.slice(0, -1)) ? t.slice(0, -1) : a); }
    if (/(ches|shes|sses|xes|zes)$/.test(t)) return t.slice(0, -2);
    if (/es$/.test(t) && n > 4) { a = t.slice(0, -1); b = t.slice(0, -2); if (has(VOCAB, a)) return a; if (has(VOCAB, b)) return b; return /[nrdzj]es$/.test(t) && !/(tres|bres|dres|gres|cres|ares|eres|ores|ures)$/.test(t) ? b : a; }
    if (/(ss|us|is)$/.test(t)) return t;
    if (/s$/.test(t)) return t.slice(0, -1);
    return t;
  }
  function wordsOf(s) { return strip(s).replace(/[–—_\/-]/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean); }
  function canonName(s) { return wordsOf(s).map(sing); }
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, p = [], c, t;
    if (Math.abs(m - n) > 3) return 9;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { c = [i]; for (j = 1; j <= n; j++) { t = a[i - 1] === b[j - 1] ? 0 : 1; c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + t); } p = c; }
    return p[n];
  }
  function has(set, k) { return Object.prototype.hasOwnProperty.call(set, k); }
  function setOf(list) { var o = {}; list.split(/[\s,]+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  /* ------------------------------------------------------------ lexicons (English + Spanish) */
  var NUM = { zero: 0, cero: 0, one: 1, uno: 1, two: 2, dos: 2, three: 3, tres: 3, four: 4, cuatro: 4, five: 5, cinco: 5, six: 6, seis: 6, seven: 7, siete: 7, eight: 8, ocho: 8, nine: 9, nueve: 9, ten: 10, diez: 10, eleven: 11, once: 11, twelve: 12, doce: 12, thirteen: 13, trece: 13, fourteen: 14, catorce: 14, fifteen: 15, quince: 15, sixteen: 16, dieciseis: 16, seventeen: 17, diecisiete: 17, eighteen: 18, dieciocho: 18, nineteen: 19, diecinueve: 19, twenty: 20, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, thirty: 30, treinta: 30, forty: 40, cuarenta: 40, fifty: 50, cincuenta: 50, sixty: 60, sesenta: 60, seventy: 70, setenta: 70, eighty: 80, ochenta: 80, ninety: 90, noventa: 90, hundred: 100, cien: 100, ciento: 100, dozen: 12, docena: 12 };
  var MONTHS = { january: 1, jan: 1, enero: 1, february: 2, feb: 2, febrero: 2, march: 3, mar: 3, marzo: 3, april: 4, apr: 4, abril: 4, may: 5, mayo: 5, june: 6, jun: 6, junio: 6, july: 7, jul: 7, julio: 7, august: 8, aug: 8, agosto: 8, september: 9, sep: 9, sept: 9, septiembre: 9, setiembre: 9, october: 10, oct: 10, octubre: 10, november: 11, nov: 11, noviembre: 11, december: 12, dec: 12, diciembre: 12 };
  var ORD = { first: 1, primer: 1, primero: 1, primera: 1, second: 2, segundo: 2, third: 3, tercer: 3, tercero: 3, fourth: 4, cuarto: 4, fifth: 5, quinto: 5, sixth: 6, sexto: 6, seventh: 7, septimo: 7 };
  var TRIGTIME = setOf("at around about by until till from since before hacia sobre a las la desde hasta");
  var GENERIC = setOf("bird birds animal animals snake snakes lizard lizards frog frogs monkey monkeys deer insect insects spider spiders fish mammal mammals reptile reptiles creature thing things wildlife bear java");
  var MODS = setOf("great common northern southern eastern western asian african indian european american australian new little lesser greater black white red blue green yellow brown grey gray orange golden giant spotted striped long short wild water tree forest mountain sea river domestic typical");
  var SKIPTAIL = setOf("of and the in to with bear crane swift robin tit jay");
  var NONANIMAL = setOf("sunrise sunset sun moon star stars view views breakfast lunch dinner coffee tea beer water lake river waterfall fog mist cloud clouds rain storm wind rainbow sign signs track tracks nothing anything anyone everything people guest guests group car vehicle jeep truck bus boat road trail path bridge village temple hut camp tree trees flower flowers fruit fruits sky light weather place spot spots time day days night morning afternoon evening start end kilometre kilometer km mile miles hour hours minute minutes lot lots many few some more less different same other another one thing nada gente cliente clientes grupo coche vehiculo barco camino sendero puente pueblo templo arbol arboles flor flores fruta cielo luz tiempo lugar sitio dia dias noche manana tarde atardecer amanecer vista vistas desayuno comida cena cafe agua lago rio cascada niebla nubes lluvia tormenta viento arcoiris senal huellas rastro rastros mucho muchos poco pocos algunos algo otros otro");
  var SEXAGE = { male: "male", female: "female", juvenile: "juvenile", immature: "immature", adult: "adult", chick: "chick", calf: "calf", cub: "cub", macho: "male", hembra: "female", juvenil: "juvenile", inmaduro: "immature", adulto: "adult", pollo: "chick", polluelo: "chick", ternero: "calf", cria: "cub" };
  var DESC = setOf("big small large huge tiny beautiful lovely stunning gorgeous giant young old grande pequeno pequena enorme precioso preciosa hermoso hermosa joven viejo viejos hermosos preciosos");
  var STOPNOTE = setOf("and then but so we i also y luego despues pero tambien nosotros hemos vimos saw spotted heard found next after later plus ya entonces y");
  var FNWORD = setOf("the a an of with at in on to by from for and or the el la los las de del con en un una y o");

  var PER = {
    dawn: { en: ["dawn", "daybreak", "sunrise", "first light"], es: ["amanecer", "alba", "madrugada", "salida del sol"], t: "06:00" },
    morning: { en: ["morning"], es: [], t: "08:30" },
    midday: { en: ["midday", "noon", "lunchtime"], es: ["mediodia"], t: "12:00" },
    afternoon: { en: ["afternoon"], es: [], t: "15:30" },
    dusk: { en: ["dusk", "sunset", "twilight"], es: ["atardecer", "anochecer", "puesta de sol", "crepusculo"], t: "18:30" },
    evening: { en: ["evening"], es: [], t: "19:30" },
    night: { en: ["night", "nighttime", "tonight"], es: ["anoche"], t: "21:00" }
  };
  var PERLABEL = {
    en: { dawn: "at dawn", morning: "in the morning", midday: "at midday", afternoon: "in the afternoon", dusk: "at dusk", evening: "in the evening", night: "at night" },
    es: { dawn: "al amanecer", morning: "por la mañana", midday: "a mediodía", afternoon: "por la tarde", dusk: "al atardecer", evening: "al anochecer", night: "de noche" }
  };
  var PERSHORT = {
    en: { dawn: "dawn", morning: "morning", midday: "midday", afternoon: "afternoon", dusk: "dusk", evening: "evening", night: "night" },
    es: { dawn: "amanecer", morning: "mañana", midday: "mediodía", afternoon: "tarde", dusk: "atardecer", evening: "anochecer", night: "noche" }
  };
  /* weather: key -> [english words, spanish words, EN label, ES label, gender for ES qualifier] */
  var WX = {
    sunny: [["sunny", "sunshine"], ["soleado", "soleada", "sol", "radiante"], "sunny", "soleado"],
    clear: [["clear", "cloudless"], ["despejado", "despejada", "despejados", "limpio"], "clear skies", "cielo despejado"],
    cloudy: [["cloudy", "clouds", "cloud"], ["nublado", "nublada", "nubes", "nuboso", "nuboso"], "cloudy", "nublado"],
    overcast: [["overcast", "grey sky", "gray sky"], ["cubierto", "encapotado", "plomizo"], "overcast", "cubierto"],
    rain: [["rain", "rainy", "raining", "rained", "showers", "shower"], ["lluvia", "lluvioso", "lloviendo", "llovio", "chubascos", "chubasco", "llovia"], "rain", "lluvia", "f"],
    drizzle: [["drizzle", "drizzling"], ["llovizna", "chispeando", "lloviznando"], "drizzle", "llovizna"],
    storm: [["storm", "thunderstorm", "thunder", "stormy"], ["tormenta", "tronada", "truenos", "tormentoso"], "storm", "tormenta", "f"],
    fog: [["fog", "foggy"], ["niebla", "nieblas"], "fog", "niebla", "f"],
    mist: [["mist", "misty"], ["bruma", "brumoso", "neblina"], "mist", "bruma", "f"],
    hot: [["hot", "hotter", "scorching", "boiling", "sweltering"], ["calor", "caluroso", "calurosa", "sofocante", "abrasador"], "hot", "calor"],
    warm: [["warm", "warmer", "mild"], ["templado", "templada", "agradable", "calido", "calida"], "warm", "templado"],
    cool: [["cool", "cooler", "chilly", "crisp"], ["fresco", "fresca", "fresquito", "fresquita"], "cool", "fresco"],
    cold: [["cold", "colder", "freezing", "frosty"], ["frio", "fria", "helado", "helada", "gelido"], "cold", "frío"],
    windy: [["windy", "wind", "breeze", "breezy", "gusty"], ["viento", "ventoso", "ventosa", "brisa", "racheado"], "windy", "viento", "m"],
    humid: [["humid", "humidity", "muggy", "sticky"], ["humedo", "humeda", "humedad", "bochorno", "bochornoso"], "humid", "húmedo"],
    hazy: [["hazy", "haze", "smoggy"], ["calima", "calimoso", "velado"], "hazy", "calima"],
    dry: [["dry"], ["seco", "seca"], "dry", "seco"],
    dusty: [["dusty"], ["polvoriento", "polvorienta"], "dusty", "polvoriento"],
    snow: [["snow", "snowing", "snowy", "snowed"], ["nieve", "nevando", "nevada", "nevo"], "snow", "nieve", "f"]
  };
  var WXQ = { light: "l", slight: "l", gentle: "l", heavy: "h", intense: "h", strong: "h", torrential: "h", ligera: "l", ligero: "l", leve: "l", suave: "l", fuerte: "h", intensa: "h", intenso: "h", torrencial: "h" };
  var WXQL = { l: ["light", "ligera", "ligero"], h: ["heavy", "fuerte", "fuerte"] };
  var BEH = {
    calling: [["calling", "called", "call", "calls", "singing", "sang", "song", "vocalising", "vocalizing", "displaying", "display"], ["cantando", "cantaba", "canto", "llamando", "llamada", "exhibiendo", "cortejando"], "calling", "cantando"],
    nesting: [["nest", "nesting", "nests"], ["nido", "nidos", "anidando"], "nesting", "en el nido"],
    feeding: [["feeding", "eating", "ate", "foraging", "drinking"], ["comiendo", "alimentandose", "bebiendo", "forrajeando"], "feeding", "comiendo"],
    hunting: [["hunting", "hunted", "stalking"], ["cazando", "acechando"], "hunting", "cazando"],
    mating: [["mating", "courtship", "courting"], ["apareandose", "cortejo"], "courting", "en cortejo"],
    crossing: [["crossing", "crossed"], ["cruzando", "cruzaba"], "crossing", "cruzando"],
    resting: [["resting", "sleeping", "asleep", "basking"], ["descansando", "durmiendo", "dormido", "dormida"], "resting", "descansando"],
    swimming: [["swimming", "swam", "bathing"], ["nadando", "banandose"], "swimming", "nadando"],
    young: [["calves", "calf", "chicks", "cubs", "babies", "baby", "juveniles", "pups"], ["crias", "cria", "polluelos", "pollos", "bebes", "cachorros", "ternero", "terneros"], "with young", "con crías"]
  };
  var EMO = setOf("amazing incredible spectacular lifer rare fantastic unbelievable wow stunning brilliant awesome magical best magnificent espectacular increible impresionante raro rara fantastico fantastica alucinante magnifico magnifica mejor lifer");
  var UNSURE = setOf("maybe possibly probably perhaps unsure uncertain might could quiza quizas posiblemente probablemente creo parece supongo");
  var UNSUREPH = ["i think", "not sure", "looked like", "could be", "only heard", "heard only", "just heard", "might be", "tal vez", "no estoy seguro", "no estoy segura", "solo oimos", "solo escuchamos", "solo se oyo", "solo lo oimos", "se oyo", "creo que", "me parecio", "podria ser"];
  var NEG = setOf("not no never without didnt cant couldnt wasnt werent missed sin nunca ningun ninguna ni tampoco");
  var WISH = ["looking for", "searching for", "search for", "searched for", "hoping", "hoped", "hope to", "wanted to", "trying to find", "tried to find", "looked for", "buscando", "buscabamos", "buscar", "esperabamos", "queriamos", "ojala", "intentamos encontrar"];
  var FUTURE = ["we will", "well", "going to", "tomorrow we", "tomorrow", "we'll", "vamos a", "iremos", "buscaremos", "intentaremos", "manana vamos", "manana iremos", "voy a", "will"];
  var VERBS = setOf("saw see spotted spot found watched observed had heard hear vimos vi vemos observamos avistamos encontramos escuchamos oimos hubo aparecio vio");
  var VSTOP = setOf("at in on near by from with over above crossing and then but so en cerca junto desde con y luego pero entonces which that who");
  var PLACENOUN = setOf("trail track path lake river park reserve sanctuary hide viewpoint valley forest beach island hill ridge waterhole lodge camp station bridge village canyon cave waterfall marsh wetland lagoon bay reef sendero camino laguna lago rio parque reserva mirador observatorio valle bosque playa isla colina cresta charca campamento estacion puente pueblo cascada pantano humedal cueva bahia arrecife sierra");
  var PLACEFILL = setOf("de del la las el los and of");
  var CAPSTOP = setOf("i we the it then also today hoy nosotros el la los las y and but pero day dia weather tiempo place lugar guests guias guide good great first second morning afternoon night evening mananas then in at on a an our my el en");
  var PLACEPREP = setOf("in at near around inside en cerca junto hacia dentro through por");

  /* ------------------------------------------------------------ taxonomy index */
  var TAX = [], IDX = {}, IDXNS = {}, VOCAB = {}, VOCABLIST = [], LOC = {}, ready = false;
  function addVar(key, e, kind) {
    if (!key) return;
    var list = IDX[key] || (IDX[key] = []);
    for (var i = 0; i < list.length; i++) if (list[i].e === e) { if (kind === "full") list[i].kind = "full"; return; }
    list.push({ e: e, kind: kind });
    IDXNS[key.replace(/ /g, "")] = IDXNS[key.replace(/ /g, "")] || key;
    key.split(" ").forEach(function (t) { if (!VOCAB[t]) { VOCAB[t] = 1; VOCABLIST.push(t); } });
  }
  function build(rows, places) {
    TAX = []; IDX = {}; IDXNS = {}; VOCAB = {}; VOCABLIST = [];
    rows.forEach(function (r) {
      var e = { n: r[0], s: r[1], es: r[2] || "", al: r[3] ? r[3].split("|") : [] };
      e.nn = canonName(e.n).join(" "); e.ns = canonName(e.s).join(" ");
      TAX.push(e);
      [e.n, e.es].concat(e.al).forEach(function (nm, idx) {
        if (!nm) return;
        var tk = canonName(nm), isAlias = idx > 1;
        addVar(tk.join(" "), e, "full");
        if (idx > 1) return;
        for (var k = 1; k < tk.length; k++) {
          var tail = tk.slice(k);
          if (has(SKIPTAIL, tail[0])) continue;
          if (tail.length === 1 && (tail[0].length < 4 || has(GENERIC, tail[0]) || has(MODS, tail[0]) || has(SKIPTAIL, tail[0]) || has(NONANIMAL, tail[0]))) continue;
          addVar(tail.join(" "), e, "tail");
        }
        if (tk.length === 1 && has(GENERIC, tk[0])) delete IDX[tk[0]];
      });
      addVar(e.ns, e, "full");
    });
    LOC = {};
    for (var k in (places || {})) LOC[canonName(k).join(" ")] = { name: k, ll: places[k] };
    ready = true;
  }
  function entryCands(key, len) {
    var list = IDX[key];
    if (!list) return null;
    var full = list.filter(function (x) { return x.kind === "full"; }), use = full.length ? full : list;
    if (len === 1 && !full.length && use.length > 4) return null;
    return { list: use, kind: full.length ? "full" : "tail" };
  }

  /* ------------------------------------------------------------ tokenising */
  function tokenize(text) {
    var re = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ]+)*|[.,;:!?\n×(]/g, m, raw = [];
    while ((m = re.exec(text))) raw.push({ w: m[0], s: m.index, e: m.index + m[0].length });
    var words = [], i, t, prev;
    function last() { return words[words.length - 1]; }
    for (i = 0; i < raw.length; i++) {
      t = raw[i];
      if (/^[.;!?\n]$/.test(t.w)) { if ((prev = last())) { prev.br = true; if (t.w === "!") prev.ex = true; if (t.w === "?") prev.q = true; } continue; }
      if (t.w === "," || t.w === ":") { if ((prev = last())) prev.cm = true; continue; }
      if (t.w === "(") { if (raw[i + 1]) raw[i + 1].paren = true; continue; }
      if (t.w === "×") { if (raw[i + 1] && /^\d+$/.test(raw[i + 1].w) && raw[i + 1].s === t.e) { words.push({ w: "x" + raw[i + 1].w, s: t.s, e: raw[i + 1].e, cnt: +raw[i + 1].w }); i++; } continue; }
      /* 06:10 style times */
      if (/^\d{1,2}$/.test(t.w) && raw[i + 1] && raw[i + 1].w === ":" && raw[i + 1].s === t.e && raw[i + 2] && /^\d{2}$/.test(raw[i + 2].w) && raw[i + 2].s === raw[i + 1].e && +t.w < 25 && +raw[i + 2].w < 60) {
        words.push({ w: t.w + ":" + raw[i + 2].w, s: t.s, e: raw[i + 2].e, tm: { h: +t.w, m: +raw[i + 2].w } }); i += 2; continue;
      }
      var mm;
      if ((mm = t.w.match(/^(\d{1,2})h(\d{2})$/i)) && +mm[1] < 25) { words.push({ w: t.w, s: t.s, e: t.e, tm: { h: +mm[1], m: +mm[2] } }); continue; }
      if ((mm = t.w.match(/^(\d{1,2})(am|pm)$/i)) && +mm[1] >= 1 && +mm[1] <= 12) { var hh = +mm[1]; if (/pm/i.test(mm[2]) && hh < 12) hh += 12; if (/am/i.test(mm[2]) && hh === 12) hh = 0; words.push({ w: t.w, s: t.s, e: t.e, tm: { h: hh, m: 0, abs: true } }); continue; }
      if ((mm = t.w.match(/^[xX](\d+)$/)) || (mm = t.w.match(/^(\d+)[xX]$/))) { words.push({ w: t.w, s: t.s, e: t.e, cnt: +mm[1] }); continue; }
      if ((t.w === "x" || t.w === "X") && raw[i + 1] && /^\d+$/.test(raw[i + 1].w) && raw[i + 1].s <= t.e + 1) { words.push({ w: "x" + raw[i + 1].w, s: t.s, e: raw[i + 1].e, cnt: +raw[i + 1].w }); i++; continue; }
      var l = strip(t.w);
      words.push({ w: t.w, s: t.s, e: t.e, l: l, c: sing(l), cap: /^[A-ZÀ-Ü]/.test(t.w), paren: !!t.paren });
    }
    return words;
  }
  function numAt(words, i) {
    var w = words[i], v, nx;
    if (!w || w.tm || w.cnt != null) return null;
    if (/^\d+$/.test(w.w)) { v = +w.w; return v > 999 ? null : { v: v, len: 1 }; }
    if (!has(NUM, w.l) || w.l === "once") return w.l === "once" ? null : null;
    v = NUM[w.l];
    if (v >= 20 && v < 100) {
      nx = words[i + 1];
      if (nx && has(NUM, nx.l) && NUM[nx.l] >= 1 && NUM[nx.l] < 10 && !nx.cm && !words[i].br) return { v: v + NUM[nx.l], len: 2 };
      if (nx && nx.l === "y" && words[i + 2] && has(NUM, words[i + 2].l) && NUM[words[i + 2].l] >= 1 && NUM[words[i + 2].l] < 10) return { v: v + NUM[words[i + 2].l], len: 3 };
    }
    if (v < 10 && words[i + 1] && words[i + 1].l === "hundred") return { v: v * 100, len: 2 };
    return { v: v, len: 1 };
  }

  /* ------------------------------------------------------------ times */
  function timeEvents(words, wxPos) {
    var ev = [], covered = {}, i, w, p, n, h, m, len, pm, ctxPM = false, a, k, per;
    function push(pos, t, period, len2) { ev.push({ pos: pos, t: t, period: period || null }); for (var q = 0; q < (len2 || 1); q++) covered[pos + q] = 1; }
    for (i = 0; i < words.length; i++) {
      w = words[i];
      if (i > 0 && words[i - 1].br) ctxPM = false;
      if (w.tm) { h = w.tm.h; m = w.tm.m; len = 1; a = words[i + 1];
        if (w.tm.abs) { push(i, pad2(h) + ":" + pad2(m), null, 1); ctxPM = h >= 12; continue; }
        if (a && (a.l === "pm" || a.l === "am")) { if (a.l === "pm" && h < 12) h += 12; if (a.l === "am" && h === 12) h = 0; len = 2; }
        else if (a && words[i + 2] && (a.l === "p" || a.l === "a") && words[i + 2].l === "m") { if (a.l === "p" && h < 12) h += 12; len = 3; }
        push(i, pad2(h) + ":" + pad2(m), null, len); continue; }
      /* "half past six", "quarter to seven" */
      if ((w.l === "half" || w.l === "quarter") && words[i + 1] && (words[i + 1].l === "past" || words[i + 1].l === "to") && (n = numAt(words, i + 2)) && n.v >= 1 && n.v <= 12) {
        h = n.v; m = w.l === "half" ? 30 : 15; if (words[i + 1].l === "to") { h = h === 1 ? 12 : h - 1; m = 45; }
        h = hour24(h, ctxPM); push(i, pad2(h) + ":" + pad2(m), null, 3 + n.len - 1); ctxPM = h >= 12; continue;
      }
      /* bare spoken time at the start of a clause: "eight ten, ..." */
      if ((i === 0 || words[i - 1].br || words[i - 1].cm) && has(NUM, w.l) && NUM[w.l] >= 1 && NUM[w.l] <= 12 && words[i + 1] && has(NUM, words[i + 1].l) && [10, 15, 20, 30, 40, 45, 50].indexOf(NUM[words[i + 1].l]) > -1 && (words[i + 1].cm || words[i + 1].br || (words[i + 2] && /^(a|an|the|one|un|una|el|la)$/.test(words[i + 2].l)))) {
        h = hour24(NUM[w.l], ctxPM); push(i, pad2(h) + ":" + pad2(NUM[words[i + 1].l]), null, 2); ctxPM = h >= 12; i++; continue;
      }
      /* "at six thirty", "at 7", "a las siete y media" */
      p = words[i - 1];
      if (p && (has(TRIGTIME, p.l)) && !p.br && (n = numAt(words, i)) && n.v >= 0 && n.v <= 24) {
        if (p.l === "a" && !(words[i - 2] && false)) { /* "a" is only a time cue in Spanish before las/la, so skip a + number */ if (!(words[i - 1].l === "a" && /^\d{1,2}$/.test(w.w) && words[i + 1] && /^(y|menos|en|de)$/.test(words[i + 1].l))) { continue; } }
        if ((p.l === "las" || p.l === "la") && !(words[i - 2] && (words[i - 2].l === "a" || words[i - 2].l === "sobre" || words[i - 2].l === "hacia" || words[i - 2].l === "desde" || words[i - 2].l === "hasta" || words[i - 2].c === "esta" || words[i - 2].l === "de"))) { if (!(p.l === "la" && w.l === "una")) continue; }
        var nxw = words[i + n.len];
        if (nxw && (/^(degrees?|grados|celsius|c|km|kms|kilometers?|kilometres?|kilometros|miles?|millas|guests?|people|clients?|customers?|personas|clientes|hours?|horas|minutes?|minutos|metres?|meters?|metros|individuals?|animals?|birds?|species|especies|aves)$/.test(nxw.l) || (nxw.l.length > 2 && has(VOCAB, nxw.c) && !/^(pm|am)$/.test(nxw.l)))) continue;
        h = n.v; m = 0; len = n.len; k = i + n.len; a = words[k];
        if (a && a.l === "oclock") { len++; k++; }
        else if (a && a.l === "o" && words[k + 1] && words[k + 1].l === "clock") { len += 2; k += 2; }
        else if (a && a.l === "y" && words[k + 1] && (words[k + 1].l === "media" || words[k + 1].l === "cuarto")) { m = words[k + 1].l === "media" ? 30 : 15; len += 2; k += 2; }
        else if (a && a.l === "y" && words[k + 1] && has(NUM, words[k + 1].l) && [5, 10, 20, 25].indexOf(NUM[words[k + 1].l]) > -1) { m = NUM[words[k + 1].l]; len += 2; k += 2; }
        else if (a && a.l === "menos" && words[k + 1] && (words[k + 1].l === "cuarto" || (has(NUM, words[k + 1].l) && [5, 10, 20, 25].indexOf(NUM[words[k + 1].l]) > -1))) { m = 60 - (words[k + 1].l === "cuarto" ? 15 : NUM[words[k + 1].l]); h = h === 1 ? 12 : h - 1; len += 2; k += 2; }
        else if (a && a.l === "en" && words[k + 1] && words[k + 1].l === "punto") { len += 2; k += 2; }
        else if (a && has(NUM, a.l) && NUM[a.l] >= 20 && NUM[a.l] <= 50 && NUM[a.l] % 10 === 0 && !a.br && !words[k - 1].cm && words[k + 1] && has(NUM, words[k + 1].l) && NUM[words[k + 1].l] < 10 && words[k + 2] && !words[k + 2].tm) { m = NUM[a.l]; if (!(words[k + 2] && has(VOCAB, words[k + 2].c))) { m += NUM[words[k + 1].l]; len += 2; k += 2; } else { len += 1; k += 1; } }
        else if (a && (n2 = numAt(words, k)) && [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].indexOf(n2.v) > -1 && !a.br && !words[k - 1].cm && ((has(NUM, a.l) && NUM[a.l] >= 5) || /^\d\d$/.test(a.w))) { var n2; m = n2.v; len += n2.len; k += n2.len; }
        a = words[k]; pm = null;
        if (a && (a.l === "pm" || a.l === "am")) { pm = a.l === "pm"; len++; k++; }
        else if (a && words[k + 1] && (a.l === "p" || a.l === "a") && words[k + 1].l === "m") { pm = a.l === "p"; len += 2; k += 2; }
        else if (a && a.l === "in" && words[k + 1] && words[k + 2] && words[k + 1].l === "the" && /^(morning|afternoon|evening)$/.test(words[k + 2].l)) { pm = words[k + 2].l !== "morning"; len += 3; k += 3; }
        else if (a && a.l === "de" && words[k + 1] && words[k + 1].l === "la" && words[k + 2] && /^(manana|tarde|noche|madrugada)$/.test(words[k + 2].l)) { pm = /^(tarde|noche)$/.test(words[k + 2].l); len += 3; k += 3; }
        if (pm === true && h < 12) h += 12; else if (pm === false && h === 12) h = 0; else if (pm == null) h = hour24(h, ctxPM);
        if (h > 24) continue;
        push(i - 1 + 0, pad2(h % 24) + ":" + pad2(m), null, 1); ev[ev.length - 1].pos = i; covered[i - 1] = 1;
        for (k = 0; k < len; k++) covered[i + k] = 1;
        ctxPM = h >= 12; i += len - 1; continue;
      }
      /* period words */
      per = periodAt(words, i);
      if (per && !(wxPos && wxPos[i])) {
        push(i, null, per.period, per.len); if (/^(afternoon|dusk|evening|night)$/.test(per.period)) ctxPM = true; else if (/^(dawn|morning)$/.test(per.period)) ctxPM = false; i += per.len - 1;
      }
    }
    return { ev: ev, covered: covered };
  }
  function hour24(h, pm) { if (h === 12) return 12; if (h >= 1 && h <= 3) return h + 12; if (pm && h <= 11) return h + 12; return h; }
  function periodAt(words, i) {
    var w = words[i], l = w.l, p = words[i - 1], pl = p ? p.l : "", key, j, ph, ws;
    if (!l) return null;
    for (key in PER) {
      var en = PER[key].en, es = PER[key].es;
      for (j = 0; j < en.length; j++) { ph = en[j].split(" "); if (matchPhrase(words, i, ph)) return { period: key, len: ph.length }; }
      for (j = 0; j < es.length; j++) { ph = es[j].split(" "); if (matchPhrase(words, i, ph)) return { period: key, len: ph.length }; }
    }
    if (l === "manana" && /^(la|esta|de|por)$/.test(pl) && !(words[i + 1] && /^(vamos|iremos|intentaremos|buscaremos|saldremos)$/.test(words[i + 1].l))) return { period: "morning", len: 1 };
    if (l === "tarde" && /^(la|esta|de|por)$/.test(pl)) return { period: "afternoon", len: 1 };
    if (l === "noche" && /^(la|esta|de|por)$/.test(pl)) return { period: "night", len: 1 };
    if (l === "noche" && !pl) return null;
    return null;
  }
  function matchPhrase(words, i, ph) { for (var k = 0; k < ph.length; k++) { if (!words[i + k] || words[i + k].l !== ph[k]) return false; } return true; }

  /* ------------------------------------------------------------ weather, behaviour */
  var WXIDX = null, BEHIDX = null;
  function lexIndex(LEX) {
    var idx = {}, k, j, ph;
    for (k in LEX) { [LEX[k][0], LEX[k][1]].forEach(function (list) { list.forEach(function (x) { idx[strip(x)] = k; }); }); }
    return idx;
  }
  function weatherScan(words) {
    if (!WXIDX) WXIDX = lexIndex(WX);
    var tags = [], seen = {}, pos = {}, temp = null, i, w, key, q, prev, tmm;
    for (i = 0; i < words.length; i++) {
      w = words[i]; if (!w.l) continue;
      if ((w.l === "degrees" || w.l === "degree" || w.l === "grados" || w.l === "celsius" || w.l === "c") && words[i - 1] && /^\d{1,2}$/.test(words[i - 1].w) && temp == null) { temp = +words[i - 1].w; pos[i] = 1; pos[i - 1] = 1; continue; }
      if (has(WXIDX, w.l) && !(w.l === "sol" && words[i + 1] && /^(y|de)$/.test(words[i + 1].l) && false)) {
        key = WXIDX[w.l];
        if (key === "clear" && words[i - 1] && /^(very|really|crystal)$/.test(words[i - 1].l) && false) {}
        if (key === "cool" && words[i - 1] && /^(fresh)$/.test(words[i - 1].l)) {}
        prev = words[i - 1]; q = null;
        if (prev && has(WXQ, prev.l)) q = WXQ[prev.l]; else if (words[i + 1] && has(WXQ, words[i + 1].l) && (key === "rain" || key === "wind" || key === "windy" || key === "storm" || key === "fog")) q = WXQ[words[i + 1].l];
        pos[i] = 1;
        if (!seen[key]) { seen[key] = 1; tags.push({ k: key, q: q }); }
        else if (q) tags.forEach(function (t) { if (t.k === key && !t.q) t.q = q; });
      }
    }
    return { tags: tags, temp: temp, pos: pos };
  }
  function behaviours(words, a, b) {
    if (!BEHIDX) BEHIDX = lexIndex(BEH);
    var out = [], seen = {}, i, k;
    for (i = a; i <= b && i < words.length; i++) { if (words[i].l && has(BEHIDX, words[i].l)) { k = BEHIDX[words[i].l]; if (!seen[k]) { seen[k] = 1; out.push(k); } } }
    return out;
  }

  /* ------------------------------------------------------------ species mentions */
  function findMentions(words, blocked) {
    var n = words.length, used = new Array(n), out = [], i, len, key, c, k, j, ok;
    function free(a, b) { for (var q = a; q < b; q++) if (used[q] || (blocked && blocked[q])) return false; return true; }
    function take(a, b, m) { for (var q = a; q < b; q++) used[q] = 1; m.start = a; m.end = b; out.push(m); }
    for (len = 5; len >= 1; len--) {
      for (i = 0; i + len <= n; i++) {
        if (!free(i, i + len)) continue;
        ok = true; key = [];
        for (j = i; j < i + len; j++) { if (!words[j].c || words[j].tm || words[j].cnt != null) { ok = false; break; } key.push(words[j].c); }
        if (!ok) continue;
        c = entryCands(key.join(" "), len);
        if (!c) continue;
        if (len === 1 && c.kind === "tail" && words[i].l.length < 4) continue;
        var uniq = c.list.map(function (x) { return x.e; });
        var pv = words[i - 1], odd = c.kind === "tail" && pv && pv.l && !pv.br && !pv.cm && pv.l.length >= 6 && !has(VOCAB, pv.c) && !has(NUM, pv.l) && !has(FNWORD, pv.l) && !has(STOPNOTE, pv.l) && !has(VERBS, pv.l) && !has(DESC, pv.l) && !has(NONANIMAL, pv.l) && !has(NONANIMAL, pv.c) && !/(ed|ing|ly|mente)$/.test(pv.l) && !(blocked && blocked[i - 1]);
        if (odd && uniq.length === 1) take(i - 1, i + len, { st: "sugg", sugg: uniq, phrase: slice(words, i - 1, i + len) });
        else if (uniq.length === 1) take(i, i + len, { st: c.kind === "full" ? "exact" : "partial", sp: uniq[0], phrase: slice(words, i, i + len) });
        else take(i, i + len, { st: "amb", sugg: uniq.slice(0, 5), phrase: slice(words, i, i + len) });
      }
    }
    /* spelling slips and speech-recognition mishearings */
    var fix = {};
    function nearest(t) {
      if (has(fix, t)) return fix[t];
      var best = null, bd = t.length >= 9 ? 2 : 1, d, v;
      if (t.length >= 6 && !has(VOCAB, t)) for (v = 0; v < VOCABLIST.length; v++) { if (Math.abs(VOCABLIST[v].length - t.length) > 2) continue; d = lev(t, VOCABLIST[v]); if (d <= bd && (best === null || d < bd || VOCABLIST[v].length === t.length)) { best = VOCABLIST[v]; bd = d; } }
      return (fix[t] = best);
    }
    var cand = [];
    for (len = 4; len >= 1; len--) {
      for (i = 0; i + len <= n; i++) {
        if (!free(i, i + len)) continue;
        var toks = [], changed = 0, bad = false, eight = false;
        for (j = i; j < i + len; j++) {
          if (!words[j].c || words[j].tm || words[j].cnt != null || has(NONANIMAL, words[j].l)) { bad = true; break; }
          var nr = nearest(words[j].c);
          if (nr) { toks.push(nr); changed++; if (words[j].c.length >= 8) eight = true; } else toks.push(words[j].c);
        }
        if (bad) continue;
        var joined = toks.join(" "), cc = entryCands(joined, len), kind = null;
        if (changed && cc && (len >= 2 || eight)) kind = len >= 2 ? "fixed" : "sugg";
        else if (!cc && len >= 2) {
          var ns = words.slice(i, i + len).map(function (x) { return x.c; }).join("");
          if (has(IDXNS, ns)) { cc = entryCands(IDXNS[ns], len); kind = cc ? "fixed" : null; }
        }
        if (!cc || !kind) continue;
        if (len === 1 && cc.kind === "tail") continue;
        cand.push({ i: i, len: len, cc: cc, kind: kind });
      }
    }
    cand.sort(function (a, b) { return b.len - a.len || a.i - b.i; });
    cand.forEach(function (x) {
      if (!free(x.i, x.i + x.len)) return;
      var uniq = x.cc.list.map(function (y) { return y.e; }), m;
      if (uniq.length === 1 && x.kind === "fixed") m = { st: "fixed", sp: uniq[0], phrase: slice(words, x.i, x.i + x.len) };
      else m = { st: uniq.length === 1 ? "sugg" : "amb", sugg: uniq.slice(0, 4), phrase: slice(words, x.i, x.i + x.len) };
      take(x.i, x.i + x.len, m);
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }
  function slice(words, a, b) { return words.slice(a, b).map(function (w) { return w.w; }).join(" "); }

  /* ------------------------------------------------------------ places */
  function placeScan(words, taken) {
    var out = [], seen = {}, i, len, key, p, j, k, name, ph;
    function add(pos, name, ll, kind, len2) { var nk = canonName(name).join(" "); if (seen[nk]) return; seen[nk] = 1; out.push({ pos: pos, name: name, ll: ll || null, kind: kind, len: len2 || 1 }); }
    for (i = 0; i < words.length; i++) {
      for (len = 4; len >= 1; len--) {
        if (i + len > words.length) continue;
        key = []; for (j = i; j < i + len; j++) { if (!words[j].c) { key = null; break; } key.push(words[j].c); }
        if (!key) continue;
        if (has(LOC, key.join(" ")) && !(taken && taken[i])) { p = LOC[key.join(" ")]; add(i, p.name, p.ll, "gaz", len); i += len - 1; break; }
      }
    }
    for (i = 0; i < words.length; i++) {
      if (!words[i].l || !has(PLACENOUN, words[i].l) || (taken && taken[i])) continue;
      /* Haew Suwat trail / Laguna Grande / Parque Nacional de Monfragüe */
      k = i - 1; ph = [];
      while (k >= 0 && ph.length < 3 && words[k].cap && !has(CAPSTOP, words[k].l) && !words[k].br && !(taken && taken[k])) { ph.unshift(words[k].w); k--; }
      if (ph.length) { add(k + 1, ph.join(" ") + " " + words[i].w, null, "name", ph.length + 1); continue; }
      if (words[i].cap || (i === 0)) { var f = []; k = i + 1; if (words[k] && has(PLACEFILL, words[k].l)) k++; while (words[k] && f.length < 3 && words[k].cap && !has(CAPSTOP, words[k].l) && !(taken && taken[k])) { f.push(words[k].w); k++; if (words[k - 1].cm || words[k - 1].br) break; } if (f.length) add(i, words[i].w + " " + (words[i + 1] && has(PLACEFILL, words[i + 1].l) ? words[i + 1].w + " " : "") + f.join(" "), null, "name", f.length + 1); }
    }
    for (i = 0; i < words.length - 1; i++) {
      if (!words[i].l || !has(PLACEPREP, words[i].l) || words[i].br) continue;
      k = i + 1; if (words[k] && words[k].l === "the") k++;
      if ((words[i].l === "cerca" || words[i].l === "junto") && words[k] && words[k].l === "de") k++;
      ph = [];
      while (words[k] && ph.length < 3 && words[k].cap && !has(CAPSTOP, words[k].l) && !(taken && taken[k])) { ph.push(words[k].w); k++; if (words[k - 1].cm || words[k - 1].br) break; }
      if (ph.length && !(ph.length === 1 && words[k - 1].c.length < 3)) { var nm = ph.join(" "); if (!seen[canonName(nm).join(" ")]) add(i + 1, nm, null, "name", ph.length); }
    }
    out.sort(function (a, b) { return a.pos - b.pos; });
    return out;
  }

  /* ------------------------------------------------------------ dates */
  function findDate(text, ref) {
    var m, d, mo, y, t = strip(text);
    var yr = ref ? ref.getFullYear() : new Date().getFullYear();
    function mk(dd, mm, yy) { if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null; var dt = new Date(yy, mm - 1, dd); return dt.getDate() === dd ? iso(dt) : null; }
    if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return mk(+m[3], +m[2], +m[1]);
    if ((m = t.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+(?:of\s+|de\s+)?([a-z]+)(?:\s+(?:of\s+|de\s+)?(\d{4}))?/)) && has(MONTHS, m[2])) return mk(+m[1], MONTHS[m[2]], m[3] ? +m[3] : yr);
    if ((m = t.match(/\b([a-z]+)\s+(\d{1,2})(?:\s*(?:st|nd|rd|th))?(?:,?\s+(\d{4}))?\b/)) && has(MONTHS, m[1]) && m[1] !== "mar" && m[1] !== "may" || (m && has(MONTHS, m[1]) && /\d/.test(m[2]) && (m[1] === "march" || m[1] === "may"))) { if (m && has(MONTHS, m[1])) return mk(+m[2], MONTHS[m[1]], m[3] ? +m[3] : yr); }
    if ((m = t.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/))) { y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : yr; return mk(+m[1], +m[2], y); }
    return null;
  }

  /* ------------------------------------------------------------ one day of notes */
  function analyseDay(text, ctx) {
    var words = tokenize(text), day, wx = weatherScan(words), te, i, j, w, mentions, places, sentId = [], s = 0, sentStart = [], sentEnd = [];
    /* sentences */
    sentStart[0] = 0;
    for (i = 0; i < words.length; i++) { sentId[i] = s; if (words[i].br) { sentEnd[s] = i; s++; sentStart[s] = i + 1; } }
    sentEnd[s] = words.length - 1;
    function sentOf(i2) { return sentId[i2]; }
    te = timeEvents(words, wx.pos);
    var blocked = {}; for (i in te.covered) blocked[i] = 1; for (i in wx.pos) blocked[i] = 1;
    for (i = 0; i < words.length; i++) if (words[i].tm || words[i].cnt != null) blocked[i] = 1;
    mentions = findMentions(words, blocked);
    var taken = {}; mentions.forEach(function (m) { for (var q = m.start; q < m.end; q++) taken[q] = 1; });
    places = placeScan(words, taken);
    var sightings = [], misses = [], id = ctx.nextId;
    mentions.forEach(function (m) {
      var a = m.start, b = m.end, sid = sentOf(a), ss = sentStart[sid], se = sentEnd[sid], k, cnt = null, approx = false, qty = null, desc = [], unc = false, star = false, heard = false, neg = false, plan = false, nn, grp = false;
      /* negation, intent and plans before the mention (same sentence) */
      var before = words.slice(Math.max(ss, a - 7), a), bl = before.map(function (x) { return x.l || ""; }), bjoin = " " + bl.join(" ") + " ";
      for (k = Math.max(ss, a - 4); k < a; k++) if (words[k].l && has(NEG, words[k].l.replace(/[^a-z]/g, "")) && !(words[k].l === "no" && words[k + 1] && words[k + 1].l === "se")) neg = true;
      if (/ (didnt|couldnt|dont|cant|never|nunca|sin|no) /.test(bjoin) && !neg && / (no|sin|nunca) /.test(bjoin)) neg = true;
      WISH.forEach(function (p) { if (bjoin.indexOf(" " + p + " ") > -1 || bjoin.indexOf(" " + p.split(" ")[0] + " ") > -1 && p.indexOf(" ") < 0) unc = true; });
      FUTURE.forEach(function (p) { if (bjoin.indexOf(" " + strip(p) + " ") > -1) plan = true; });
      if (/ (we will|well|going to|vamos a|iremos|buscaremos|intentaremos|voy a) /.test(bjoin)) plan = true;
      if (!/ (tomorrow|manana) /.test(bjoin) && !/ (we will|well|going to|vamos a|iremos|buscaremos|intentaremos|voy a) /.test(bjoin)) plan = false;
      if (unc && !neg) { var after = " " + words.slice(b, se + 1).map(function (x) { return x.l || ""; }).join(" ") + " "; if (/ (but|pero|only|solo|sino|didnt|couldnt|no|not|never|nunca|without|sin) /.test(after) && WISH.some(function (p) { return bjoin.indexOf(" " + p + " ") > -1; })) neg = true; }
      if (neg) { misses.push(m.sp ? m.sp.n : m.phrase); return; }
      if (plan) return;
      /* count before */
      var lead = [], q2 = a - 1;
      while (q2 >= ss && lead.length < 6) { lead.unshift(q2); q2--; }
      var cut = lead.length;
      /* descriptors */
      while (cut > 0) { var wl = words[lead[cut - 1]]; if (wl.l && has(SEXAGE, wl.l)) { desc.push(SEXAGE[wl.l]); cut--; } else if (wl.l && has(DESC, wl.l)) cut--; else break; }
      var cl = lead.slice(0, cut);
      if (cl.length) {
        var lw = words[cl[cl.length - 1]], l2 = words[cl[cl.length - 2]], l3 = words[cl[cl.length - 3]];
        if (lw.cnt != null) cnt = lw.cnt;
        else if (lw.l === "of" && l2 && /^(pair|couple)$/.test(l2.l)) cnt = 2;
        else if (lw.l === "de" && l2 && /^(par|pareja)$/.test(l2.l)) cnt = 2;
        else if (lw.l === "of" && l2 && /^(group|flock|herd|troop|pack|pod|family|colony|school|band)$/.test(l2.l)) { grp = true; qty = "group"; }
        else if (lw.l === "de" && l2 && /^(grupo|manada|bandada|familia|colonia|banco|tropa)$/.test(l2.l)) { grp = true; qty = "group"; }
        else if (/^(several|many|numerous|varios|varias|muchos|muchas|montones)$/.test(lw.l) || (lw.l === "few" && l2 && l2.l === "a") || (lw.l === "cuantos" && l2 && l2.l === "unos")) qty = "several";
        else if (lw.l === "of" && l2 && /^(lots|plenty|loads)$/.test(l2.l)) qty = "several";
        else {
          for (k = 0; k < cl.length; k++) { nn = numAt(words, cl[k]); if (nn && cl[k] + nn.len === a - desc.length - (lead.length - cut) + (0) ) { } if (nn && cl[k] + nn.len - 1 === cl[cl.length - 1] && !te.covered[cl[k]]) { cnt = nn.v; if (k > 0) { var pw = words[cl[k - 1]]; if (pw && /^(about|around|approximately|roughly|some|nearly|almost|over|unos|unas|aproximadamente|casi|alrededor)$/.test(pw.l)) approx = true; else if (pw && pw.l === "de" && words[cl[k - 2]] && words[cl[k - 2]].l === "alrededor") approx = true; } break; } }
        }
      }
      /* count after */
      var nx = words[b], nx2 = words[b + 1];
      if (cnt == null && nx && nx.cnt != null && !(blocked[b] && nx.tm)) cnt = nx.cnt;
      else if (cnt == null && nx && /^\d{1,3}$/.test(nx.w) && nx.paren) cnt = +nx.w;
      else if (cnt == null && nx && (nn = numAt(words, b)) && !te.covered[b] && words[b + nn.len] && /^(of|individuals|individual|animals|birds|ejemplares|individuos|animales|aves|in|en|de)$/.test(words[b + nn.len].l) && (words[b + nn.len].l !== "in" && words[b + nn.len].l !== "en" || (words[b + nn.len + 1] && /^(total|all|sight|them)$/.test(words[b + nn.len + 1].l))) && !nx.br) cnt = nn.v;
      if (cnt != null && cnt > 500) cnt = null;
      /* uncertainty, heard-only, highlights */
      var near = words.slice(Math.max(ss, a - 6), Math.min(se + 1, b + 6)), nj = " " + near.map(function (x) { return x.l || ""; }).join(" ") + " ";
      near.forEach(function (x) { if (x.l && has(UNSURE, x.l)) unc = true; });
      UNSUREPH.forEach(function (p) { if (nj.indexOf(" " + strip(p) + " ") > -1) { unc = true; if (/heard|oimos|escuchamos|oyo/.test(p)) heard = true; } });
      if (words[se] && words[se].q) unc = true;
      var sj = " " + words.slice(ss, se + 1).map(function (x) { return x.l || ""; }).join(" ") + " ";
      if (/ (pero no lo vimos|no lo vimos|pero no lo vi|no lo vi|sin verlo|but not seen|didnt see it|did not see it|not see it|couldnt see it|but we didnt see|but never saw it|pero no lo vimos) /.test(sj) || / (but|pero) (we )?(didnt|did not|no) (see|ver|lo) /.test(sj)) { heard = true; unc = true; }
      var heardV = / (heard|hear|escuchamos|escuchado|oimos|escuche|oi) /.test(" " + bl.slice(-4).join(" ") + " ");
      for (k = ss; k <= se; k++) { if (words[k].ex) star = true; if (words[k].l && has(EMO, words[k].l)) star = true; }
      if (words[se] && words[se].ex && words[se].l && has(EMO, words[se].l)) star = true;
      /* note after: the guide's own words, trimmed */
      var ns = b + (nx && nx.cnt != null ? 1 : (cnt != null && nx && /^\d/.test(nx.w) ? 1 : 0)), noteW = [], limit = se, next = null;
      mentions.some(function (o) { if (o.start >= b) { next = o.start; return true; } });
      te.ev.some(function (e) { if (e.pos >= b && (next == null || e.pos < next)) { next = e.pos; return true; } });
      if (next != null && next - 1 < limit) limit = next - 1;
      if (words[ns - 1] && words[ns - 1].br && ns - 1 < limit) limit = ns - 1;
      for (k = ns; k <= limit && noteW.length < 8; k++) {
        var wk = words[k]; if (!wk.l) break;
        if (noteW.length === 0 && (has(STOPNOTE, wk.l) || (nn = numAt(words, k)) && words[k + 1] && /^(of|de)$/.test(words[k + 1].l) && words[k + 2] && /^(them|ellos)$/.test(words[k + 2].l))) { if (has(STOPNOTE, wk.l)) break; k += 2; continue; }
        if (noteW.length && (has(STOPNOTE, wk.l))) break;
        if (blocked[k] && !wx.pos[k]) break;
        noteW.push(wk.w); if (wk.br || (wk.cm && noteW.length > 1)) break;
      }
      while (noteW.length && has(FNWORD, strip(noteW[noteW.length - 1]))) noteW.pop();
      if (noteW.length && noteW.every(function (x) { var l = strip(x); return has(EMO, l) || has(DESC, l) || has(FNWORD, l); })) noteW = [];
      var note = noteW.join(" ");
      if (heard && !/heard|oid|escuch/.test(note.toLowerCase())) note = note ? note : "";
      var d2 = desc.reverse().filter(function (v, ix, arr) { return arr.indexOf(v) === ix; });
      /* behaviours in the surrounding clause */
      var beh = behaviours(words, Math.max(ss, a - 2), Math.min(limit < b ? b : limit, b + 8));
      var t = pickTime(te.ev, a, ss, se);
      sightings.push({ id: id++, raw: text.slice(words[ss].s, words[se].e).replace(/\s+/g, " ").trim(), phrase: m.phrase, pos: a, time: t.t, period: t.period, count: cnt, approx: approx, qty: qty, desc: d2, note: note, beh: beh, star: star, unc: unc, heard: heard || heardV, m: m, kind: "sp", sp: null, done: false, place: placeBefore(places, a) });
    });
    ctx.nextId = id;
    /* things the guide mentioned that are not in the taxonomy */
    var unknown = unknownMentions(words, text, mentions, blocked, te, wx, places, sentStart, sentEnd, sentId);
    unknown.forEach(function (u) { var uw = words[Math.min(u.pos, words.length - 1)], usid = uw ? sentId[u.pos] : 0, uu = false; if (uw) { var nj2 = " " + words.slice(sentStart[usid], sentEnd[usid] + 1).map(function (x) { return x.l || ""; }).join(" ") + " "; UNSUREPH.forEach(function (p) { if (nj2.indexOf(" " + strip(p) + " ") > -1) uu = true; }); words.slice(sentStart[usid], sentEnd[usid] + 1).forEach(function (x) { if (x.l && has(UNSURE, x.l)) uu = true; }); } sightings.push({ id: id++, raw: u.raw, phrase: u.phrase, pos: u.pos, time: pickTime(te.ev, u.pos, 0, 1e9).t, period: pickTime(te.ev, u.pos, 0, 1e9).period, count: u.count, approx: false, qty: null, desc: [], note: "", beh: [], star: false, unc: uu, heard: false, m: { st: "none", sugg: [] }, kind: "sp", sp: null, done: false, place: placeBefore(places, u.pos) }); });
    ctx.nextId = id;
    sightings.sort(function (a, b) { return a.pos - b.pos; });
    day = { weather: wx.tags, temp: wx.temp, sightings: sightings, misses: misses, places: places, notes: [], guests: null, km: null };
    var gm = text.match(/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(?:guests?|clients?|customers?|pax|people|clientes|hu[eé]spedes|personas|viajeros|travellers|travelers)\b/i);
    if (gm) day.guests = /^\d/.test(gm[1]) ? +gm[1] : NUM[strip(gm[1])];
    var km = text.match(/(\d+(?:[.,]\d+)?)\s*(km|kms|kilomet(?:er|re)s?|kil[oó]metros|miles?|millas)\b/i);
    if (!km) { var kw = strip(text).match(/\b([a-z]+)\s+(?:kilometros|kilometres|kilometers|kms?)\b/); if (kw && has(NUM, kw[1])) km = [0, String(NUM[kw[1]]), "km"]; }
    if (km) { day.km = Math.round(parseFloat(km[1].replace(",", ".")) * (/^mi|^milla/i.test(km[2]) ? 1.609 : 1) * 10) / 10; }
    var dt = findDate(text, ctx.ref); if (dt) day.date = dt;
    return day;
  }
  function pickTime(ev, pos, ss, se) {
    var best = null, d, bd = 1e9, i, e;
    for (i = 0; i < ev.length; i++) { e = ev[i]; if (e.pos >= ss && e.pos <= se) { d = Math.abs(e.pos - pos); if (e.pos > pos) d += 3; if (d < bd) { bd = d; best = e; } } }
    if (!best) { for (i = ev.length - 1; i >= 0; i--) if (ev[i].pos <= pos) { best = ev[i]; break; } }
    return best ? { t: best.t, period: best.t ? null : best.period } : { t: null, period: null };
  }
  function placeBefore(places, pos) { var r = null; for (var i = 0; i < places.length; i++) if (places[i].pos <= pos) r = places[i]; return r ? r.name : null; }

  function unknownMentions(words, text, mentions, blocked, te, wx, places, sentStart, sentEnd, sentId) {
    var out = [], used = {}, taken = {};
    mentions.forEach(function (m) { for (var q = m.start; q < m.end; q++) taken[q] = 1; });
    places.forEach(function (p) { for (var q = 0; q < p.len; q++) taken[p.pos + q] = 1; });
    function ok(i) { return !taken[i] && !blocked[i] && !wx.pos[i]; }
    for (var i = 0; i < words.length; i++) {
      var w = words[i]; if (!w.l || !has(VERBS, w.l) || taken[i]) continue;
      var sid = sentId[i], se = sentEnd[sid], k = i + 1, ph = [], skipped = 0, cnt = null, nn;
      if (mentions.some(function (m) { return m.start > i && m.start <= Math.min(se, i + 6) && sentId[m.start] === sid; })) continue;
      if (words[k] && /^(the|a|an|some|un|una|unos|unas|el|la|los|las)$/.test(words[k].l)) k++;
      if ((nn = numAt(words, k)) && !te.covered[k]) { cnt = nn.v; k += nn.len; }
      while (k <= se && ph.length < 4) {
        var x = words[k]; if (!x.l || has(VSTOP, x.l) || !ok(k) || (x.cm && ph.length) && false) break;
        if (has(DESC, x.l) || /^(beautiful|lovely|big|small|young|old|nice)$/.test(x.l)) { k++; skipped++; continue; }
        ph.push(x); k++; if (x.cm || x.br) break;
      }
      if (!ph.length) continue;
      var more = [];
      while (words[k] && /^(and|y|e|also|tambien)$/.test(words[k].l) && !words[k - 1].br && k < se) {
        var k2 = k + 1, p2 = [], c2 = null;
        while (words[k2] && /^(a|an|the|some|many|several|few|un|una|unos|unas|muchos|muchas|varios|varias|algunos|algunas|el|la|los|las)$/.test(words[k2].l)) k2++;
        if ((nn = numAt(words, k2)) && !te.covered[k2]) { c2 = nn.v; k2 += nn.len; }
        while (words[k2] && k2 <= se && p2.length < 3 && words[k2].l && !has(VSTOP, words[k2].l) && ok(k2) && !has(NONANIMAL, words[k2].l) && !has(DESC, words[k2].l)) { p2.push(words[k2]); k2++; if (words[k2 - 1].cm || words[k2 - 1].br) break; }
        if (!p2.length || mentions.some(function (m) { return m.start >= k && m.start < k2; })) break;
        more.push({ phrase: p2.map(function (x) { return x.w; }).join(" "), count: c2, pos: k + 1, key: p2.map(function (x) { return x.c; }).join(" ") });
        k = k2;
      }
      more.forEach(function (mo) { if (!used[mo.key] && mo.phrase.length > 3) { used[mo.key] = 1; out.push({ phrase: mo.phrase, raw: text.slice(words[sentStart[sid]].s, words[se].e).replace(/\s+/g, " ").trim(), pos: mo.pos, count: mo.count }); } });
      var last = ph[ph.length - 1];
      if (ph.every(function (x) { return has(NONANIMAL, x.l) || has(NONANIMAL, x.c) || /^\d+$/.test(x.w); })) continue;
      if (ph.some(function (x) { return has(NONANIMAL, x.c) && ph.length === 1; })) continue;
      if (has(NONANIMAL, last.l) || has(NONANIMAL, last.c)) continue;
      if (/^(it|them|that|this|those|these|something|nothing|everything|lo|eso|esto|algo|nada|todo)$/.test(ph[0].l)) continue;
      if (ph.length === 1 && ph[0].l.length < 4) continue;
      var key = ph.map(function (x) { return x.c; }).join(" ");
      if (used[key]) continue; used[key] = 1;
      out.push({ phrase: ph.map(function (x) { return x.w; }).join(" "), raw: text.slice(words[sentStart[sid]].s, words[se].e).replace(/\s+/g, " ").trim(), pos: i + 1, count: cnt });
    }
    /* structured lines that start with a time or a bullet and name nothing we know */
    var lines = text.split("\n"), off = 0;
    lines.forEach(function (ln) {
      var s0 = off, e0 = off + ln.length; off = e0 + 1;
      var tl = ln.trim(); if (!tl) return;
      if (!/^(?:[-*•]\s*)?(?:\d{1,2}[:h.]\d{2}\s*(?:am|pm)?\s+|[-*•]\s+)/i.test(tl)) return;
      var inside = words.filter(function (x) { return x.s >= s0 && x.e <= e0; });
      if (!inside.length) return;
      var any = inside.some(function (x, j) { var gi = words.indexOf(x); return taken[gi] || wx.pos[gi]; });
      if (any) return;
      var rest = inside.filter(function (x) { var gi = words.indexOf(x); return !blocked[gi] && x.l; });
      if (!rest.length || rest.length > 8) return;
      if (out.some(function (o) { return o.raw && o.raw.indexOf(rest[0].w) > -1; })) return;
      if (rest.every(function (x) { return has(NONANIMAL, x.l) || has(NONANIMAL, x.c); })) return;
      var fi = words.indexOf(rest[0]);
      out.push({ phrase: rest.map(function (x) { return x.w; }).join(" "), raw: tl, pos: fi, count: null });
    });
    return out;
  }

  /* ------------------------------------------------------------ days, memos, whole text */
  var DAYHEAD = /^\s*(?:day|d[ií]a|dia)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|uno|dos|tres|cuatro|cinco|seis|siete)\b\s*[:.,–—-]*\s*(.*)$/i;
  var INLINECUE = /(?:^|[.!?\n]\s*)(?:(?:and\s+)?(?:on\s+)?(?:day|d[ií]a)\s+(\d+|one|two|three|four|five|six|seven|uno|dos|tres|cuatro|cinco|seis|siete)\b|(?:el\s+)?(primer|segundo|tercer|cuarto|quinto)\s+d[ií]a|(first|second|third|fourth|fifth)\s+day\b|(?:al\s+d[ií]a\s+siguiente|the\s+next\s+day|next\s+day|the\s+following\s+day|el\s+d[ií]a\s+siguiente))/gi;
  function dayNo(tok) { tok = strip(tok); if (/^\d+$/.test(tok)) return +tok; if (has(NUM, tok)) return NUM[tok]; if (has(ORD, tok)) return ORD[tok]; return null; }

  function splitDays(text) {
    var chunks = [], lines = text.split("\n"), cur = null, headed = false;
    lines.forEach(function (ln) {
      var m = ln.match(DAYHEAD);
      if (m) { headed = true; var tt = m[2].trim(), rest = "", cut = tt.search(/[.!?]\s+\S/); if (cut > 0 && tt.length - cut > 12) { rest = tt.slice(cut + 1).trim(); tt = tt.slice(0, cut).trim(); } cur = { no: dayNo(m[1]), title: tt, lines: rest ? [rest] : [] }; chunks.push(cur); }
      else { if (!cur) { cur = { no: null, title: "", lines: [] }; chunks.push(cur); } cur.lines.push(ln); }
    });
    var res = [];
    chunks.forEach(function (c) { splitInline(c.lines.join("\n"), c).forEach(function (x) { res.push(x); }); });
    if (res.length === 1 && !headed && /\n\s*\n/.test(text.trim())) {
      var blocks = text.trim().split(/\n\s*\n+/).filter(function (b) { return b.trim(); });
      if (blocks.length > 1) return blocks.map(function (b) { return { no: null, title: "", text: b }; });
    }
    return res;
  }
  function splitInline(body, c) {
    var out = [], re = new RegExp(INLINECUE.source, "gi"), m, last = 0, first = true, cues = [];
    while ((m = re.exec(body))) {
      var start = m.index + (m[0].length - m[0].replace(/^[.!?\n]\s*/, "").length);
      var no = m[1] ? dayNo(m[1]) : m[2] ? dayNo(m[2]) : m[3] ? dayNo(m[3]) : null;
      cues.push({ at: start, end: m.index + m[0].length, no: no, rel: !m[1] && !m[2] && !m[3] });
    }
    if (!cues.length) return [{ no: c.no, title: c.title, text: body }];
    var prevNo = c.no;
    if (body.slice(0, cues[0].at).trim()) out.push({ no: c.no, title: c.title, text: body.slice(0, cues[0].at) });
    cues.forEach(function (cu, i) {
      var seg = body.slice(cu.end, i + 1 < cues.length ? cues[i + 1].at : body.length);
      var no = cu.no != null ? cu.no : (out.length ? ((out[out.length - 1].no || out.length) + 1) : null);
      out.push({ no: no, title: i === 0 && !body.slice(0, cues[0].at).trim() ? c.title : "", text: seg });
    });
    return out;
  }

  function analyse(text, opts) {
    opts = opts || {};
    if (!ready) return { days: [] };
    var ctx = { nextId: 1, ref: opts.start ? new Date(opts.start + "T12:00:00") : new Date() };
    var parts = splitDays(String(text || "")).filter(function (p) { return (p.text != null ? p.text : "").trim() || p.title; });
    var days = [], lastDate = null;
    parts.forEach(function (p, idx) {
      var body = p.text != null ? p.text : "";
      /* a bare title line like "Khao Yai, visitor centre" is part of the header, not a sighting */
      var d = analyseDay(body, ctx);
      d.n = days.length + 1;
      d.title = p.title || ""; d.no = p.no;
      /* primary place: first known place, otherwise the title */
      var tp = d.title ? placeScan(tokenize(d.title), {}) : [];
      tp.forEach(function (q) { if (!d.places.some(function (x) { return canonName(x.name).join(" ") === canonName(q.name).join(" "); })) d.places.unshift(q); });
      var prim = null, k;
      for (k = 0; k < d.places.length; k++) if (d.places[k].ll) { prim = d.places[k]; break; }
      if (!prim) prim = d.places[0] || null;
      d.place = d.title && !prim ? d.title : (d.title && prim && d.title.toLowerCase().indexOf(prim.name.toLowerCase()) > -1 ? d.title : (prim ? prim.name : d.title));
      d.ll = prim && prim.ll ? prim.ll : null;
      if (d.title && !d.ll) { var tt = placeScan(tokenize(d.title), {}); for (k = 0; k < tt.length; k++) if (tt[k].ll) { d.ll = tt[k].ll; break; } }
      var hd = d.title ? findDate(d.title, ctx.ref) : null; if (hd) d.date = hd;
      var pv = days[days.length - 1];
      if (!d.place && pv && pv.place) { d.place = pv.place; d.ll = pv.ll; d.placeGuess = true; }
      days.push(d);
    });
    /* dates: explicit ones win, the rest count forward from the trip start */
    var base = opts.start ? new Date(opts.start + "T12:00:00") : new Date(), prevD = null;
    days.forEach(function (d, i) {
      if (d.date) { prevD = new Date(d.date + "T12:00:00"); return; }
      var nd = prevD ? new Date(prevD.getTime() + 86400000) : new Date(base.getTime() + (i) * 86400000);
      if (!prevD && i > 0) nd = new Date(base.getTime() + i * 86400000);
      d.date = iso(nd); d.dateGuess = !opts.start; prevD = nd;
    });
    return { days: days };
  }

  /* ------------------------------------------------------------ public bits */
  TR.nlp = {
    build: build, analyse: analyse, tax: function () { return TAX; }, canon: canonName, lev: lev,
    wxLabel: function (t, lang) {
      var d = WX[t.k], i = lang === "es" ? 3 : 2, s = d[i];
      if (t.q) { var ql = WXQL[t.q]; if (lang === "es") { var g2 = d[4], q = ql[g2 === "m" ? 2 : 1]; return s + " " + q; } return ql[0] + " " + s; }
      return s;
    },
    periodLabel: function (p, lang) { return PERLABEL[lang][p] || ""; },
    periodShort: function (p, lang) { return PERSHORT[lang][p] || ""; },
    behLabel: function (k, lang) { return BEH[k][lang === "es" ? 3 : 2]; },
    isReady: function () { return ready; }
  };
})(typeof window !== "undefined" ? window : globalThis);
