/* Visual extras: interactive elevation profiles (mountains) + country outline draw-in. No dependencies. */
(function(){
"use strict";
document.documentElement.dataset.sec=(location.pathname.replace(/^\/es(?=\/|$)/,"").split("/")[1]||"home");
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var NS="http://www.w3.org/2000/svg";
function el(n,a){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);return e}
function num(s){var m=String(s||"").replace(/,/g,"").match(/[\d.]+/);return m?parseFloat(m[0]):NaN}
function fmt(n){return Math.round(n).toLocaleString("en-US")}

/* ---------- reveal on scroll ---------- */
function reveal(nodes,cls){
  if(!("IntersectionObserver" in window)||reduce){nodes.forEach(function(n){n.classList.add(cls)});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add(cls);io.unobserve(e.target)}})},{threshold:.35});
  nodes.forEach(function(n){io.observe(n)});
}

/* ---------- country outline ---------- */
reveal([].slice.call(document.querySelectorAll(".shape-art")),"in");

/* ---------- elevation profiles ---------- */
function pts(d){var out=[],re=/(-?[\d.]+),(-?[\d.]+)/g,m;while((m=re.exec(d)))out.push([+m[1],+m[2]]);return out}
function setup(svg){
  var line=svg.querySelector(".peak-line");if(!line)return;
  var card=svg.closest(".peak-card"),facts={};
  if(card)card.querySelectorAll(".hero-fact").forEach(function(f){var s=f.querySelectorAll("span");if(s.length>1)facts[s[0].textContent.trim().toLowerCase()]=s[1].textContent});
  var texts=svg.querySelectorAll("text"),hi=num(texts[0]&&texts[0].textContent),lo=num(texts[1]&&texts[1].textContent);
  var km=num(facts["distance"]),est=/est/i.test(facts["distance"]||"");
  var P=pts(line.getAttribute("d"));if(P.length<2||isNaN(hi)||isNaN(lo))return;
  var base=170,top=Math.min.apply(null,P.map(function(p){return p[1]}));
  var x0=P[0][0],x1=P[P.length-1][0];
  function elev(y){return top===base?hi:lo+(base-y)/(base-top)*(hi-lo)}
  function at(x){x=Math.max(x0,Math.min(x1,x));for(var i=1;i<P.length;i++){if(P[i][0]>=x){var a=P[i-1],b=P[i],t=(x-a[0])/((b[0]-a[0])||1);return [x,a[1]+(b[1]-a[1])*t,i-1,i]}}return [x1,P[P.length-1][1]]}
  /* gradient fill under the line */
  var id="eg"+Math.random().toString(36).slice(2,7),defs=el("defs",{});
  var g=el("linearGradient",{id:id,x1:0,y1:0,x2:0,y2:1});
  g.appendChild(el("stop",{offset:0,"stop-color":"var(--green)","stop-opacity":.55}));
  g.appendChild(el("stop",{offset:1,"stop-color":"var(--green)","stop-opacity":.04}));
  defs.appendChild(g);svg.insertBefore(defs,svg.firstChild);
  var area=svg.querySelector(".peak-area");if(area)area.style.fill="url(#"+id+")";
  /* ticks every 5 km (or 1 km for short routes) */
  if(km>0&&!est){
    var step=km>=25?5:km>=8?2:1;
    for(var k=step;k<km;k+=step){var x=x0+(x1-x0)*k/km;
      svg.appendChild(el("line",{class:"tick",x1:x,y1:base,x2:x,y2:base+4}));
      var t=el("text",{class:"tick-label",x:x,y:base+14,"text-anchor":"middle"});t.textContent=k;svg.appendChild(t)}
  }
  /* draw-in */
  var L=line.getTotalLength?line.getTotalLength():0;
  if(L&&!reduce){line.style.strokeDasharray=L;line.style.strokeDashoffset=L;if(area)area.style.opacity=0;
    reveal([svg],"drawn");
    var obs=new MutationObserver(function(){if(svg.classList.contains("drawn")){line.style.transition="stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)";line.style.strokeDashoffset=0;if(area){area.style.transition="opacity 1.2s .5s";area.style.opacity=1}obs.disconnect()}});
    obs.observe(svg,{attributes:true,attributeFilter:["class"]});
  }
  /* summit pulse */
  var dot=svg.querySelector(".summit-dot");
  if(dot&&!reduce){var ring=el("circle",{cx:dot.getAttribute("cx"),cy:dot.getAttribute("cy"),r:4,class:"summit-ring"});svg.insertBefore(ring,dot)}
  /* scrub */
  var vl=el("line",{class:"scrub-line",y1:20,y2:base,x1:0,x2:0}),sd=el("circle",{class:"scrub-dot",r:4.5}),
      tip=el("g",{class:"scrub-tip"}),tb=el("rect",{rx:5,height:34,width:104}),t1=el("text",{x:8,y:14}),t2=el("text",{x:8,y:27});
  tip.appendChild(tb);tip.appendChild(t1);tip.appendChild(t2);
  [vl,sd,tip].forEach(function(n){n.style.opacity=0;svg.appendChild(n)});
  function move(e){
    var r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal,sc=Math.min(r.width/vb.width,r.height/vb.height),
        ox=(r.width-vb.width*sc)/2,x=((e.clientX-r.left-ox)/sc);
    var p=at(x),e_=elev(p[1]),frac=(p[0]-x0)/(x1-x0);
    vl.setAttribute("x1",p[0]);vl.setAttribute("x2",p[0]);sd.setAttribute("cx",p[0]);sd.setAttribute("cy",p[1]);
    var grade="";if(km>0&&p[2]!=null&&p[3]!=null){var a=P[p[2]],b=P[p[3]];var dE=elev(b[1])-elev(a[1]),dD=(b[0]-a[0])/(x1-x0)*km*1000;if(dD>0){var gr=dE/dD*100;grade=(gr>0?"+":"")+gr.toFixed(0)+"%"}}
    t1.textContent=fmt(e_)+" m"+(grade?"  "+grade:"");
    t2.textContent=km>0?(frac*km).toFixed(1)+" km"+(est?" (est.)":""):"";
    var tx=p[0]+10;if(tx+104>vb.width-4)tx=p[0]-114;tip.setAttribute("transform","translate("+tx+","+Math.max(4,p[1]-44)+")");
    [vl,sd,tip].forEach(function(n){n.style.opacity=1});
  }
  function leave(){[vl,sd,tip].forEach(function(n){n.style.opacity=0})}
  svg.addEventListener("pointermove",move);svg.addEventListener("pointerdown",move);svg.addEventListener("pointerleave",leave);
  svg.style.touchAction="pan-y";svg.classList.add("interactive");
  svg.setAttribute("role","img");
}
[].slice.call(document.querySelectorAll(".elevation-chart")).forEach(setup);

/* ---------- photography: filter by country ---------- */
(function(){
  var tabs=document.querySelector(".photo-tabs");if(!tabs)return;
  var ES=document.documentElement.lang==="es",ALL=ES?"Todos":"All",sel=null;
  var bar=document.createElement("div");bar.className="country-filter";bar.setAttribute("role","group");bar.setAttribute("aria-label",ES?"Filtrar por país":"Filter by country");
  tabs.parentNode.insertBefore(bar,tabs.nextSibling);
  function countryOf(card){var sp=card.querySelector(".photo-card-info span");if(!sp)return null;var p=sp.textContent.replace(/\s+/g," ").trim().split(" · ");return p.length>1&&!/^(Placeholder|Marcador)/i.test(p[p.length-1])&&!/^(Featured|Field notes)$/i.test(p[p.length-1])?p[p.length-1]:null}
  function activePanel(){return document.querySelector(".gallery-panel.is-visible")||document}
  function build(){
    var cnt={},cards=activePanel().querySelectorAll(".photo-card");
    cards.forEach(function(c){var k=countryOf(c);if(k)cnt[k]=(cnt[k]||0)+1});
    var keys=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||a.localeCompare(b)});
    if(sel&&!cnt[sel])sel=null;
    bar.innerHTML="";
    if(keys.length<2){bar.style.display="none";apply();return}
    bar.style.display="";
    [[null,ALL,cards.length]].concat(keys.map(function(k){return [k,k,cnt[k]]})).forEach(function(e){
      var b=document.createElement("button");b.type="button";b.className="country-chip"+(sel===e[0]?" is-active":"");b.setAttribute("aria-pressed",sel===e[0]);
      b.innerHTML="";b.appendChild(document.createTextNode(e[1]));var n=document.createElement("small");n.textContent=e[0]?e[2]:"";b.appendChild(n);
      b.onclick=function(){sel=e[0];build()};bar.appendChild(b)});
    apply();
  }
  function apply(){
    document.querySelectorAll(".photo-card").forEach(function(c){c.classList.toggle("is-filtered",!!sel&&countryOf(c)!==sel)});
    document.querySelectorAll(".photo-rail").forEach(function(r){r.scrollLeft=0});
  }
  tabs.addEventListener("click",function(){setTimeout(build,30)});
  build();
})();

/* ---------- dive log: one dot per dive ---------- */
(function(){
  var table=document.querySelector(".dive-table");if(!table)return;
  var legend={};document.querySelectorAll(".legend-dot").forEach(function(d){var m=/legend-([a-z-]+)/.exec(d.className.replace("legend-dot",""));if(m)legend[m[1]]=getComputedStyle(d).backgroundColor});
  var KEY={"malapascua":"malapascua","koh tao":"koh-tao","great barrier reef":"gbr","cabo pulmo":"cabo-pulmo"};
  var dives=[],groups=[];
  table.querySelectorAll(".dive-row:not(.header)").forEach(function(row){
    var t=function(c){var e=row.querySelector(c);return e?e.textContent.replace(/\s+/g," ").trim():""};
    var nums=t(".dive-number").split(/[–-]/).map(function(x){return parseInt(x,10)}).filter(function(x){return x});
    var from=nums[0],to=nums[1]||nums[0],site=t(".dive-site"),dest=t(".dive-country"),sp=t(".dive-species"),place=dest.split(" · ")[0];
    for(var n=from;n<=to;n++)dives.push({n:n,site:site,dest:dest,place:place,sp:sp==="-"?"":sp,row:row,color:legend[KEY[place.toLowerCase()]]||"var(--green)"});
  });
  if(!dives.length)return;
  var wrap=document.createElement("div");wrap.className="dive-strip";wrap.setAttribute("role","list");
  var tip=document.createElement("div");tip.className="dive-tip";tip.setAttribute("aria-hidden","true");
  var last=null;dives.forEach(function(d,i){
    if(!last||last.place!==d.place){last={place:d.place,color:d.color,count:0};groups.push(last)}last.count++;
    var b=document.createElement("button");b.type="button";b.className="dive-dot";b.style.setProperty("--c",d.color);b.style.setProperty("--i",i);
    b.setAttribute("role","listitem");b.setAttribute("aria-label","Dive "+d.n+": "+d.site+", "+d.dest+(d.sp?", "+d.sp:""));
    var s=document.createElement("span");s.textContent=d.n;b.appendChild(s);
    function on(){wrap.querySelectorAll(".is-on").forEach(function(x){x.classList.remove("is-on")});b.classList.add("is-on");d.row.classList.add("dive-hl");
      tip.innerHTML="";var a=document.createElement("strong");a.textContent=d.site;var c=document.createElement("span");c.textContent="#"+d.n+" · "+d.dest+(d.sp?" · "+d.sp:"");tip.appendChild(a);tip.appendChild(c);tip.style.setProperty("--c",d.color);tip.classList.add("on")}
    function off(){b.classList.remove("is-on");d.row.classList.remove("dive-hl");tip.classList.remove("on")}
    b.addEventListener("mouseenter",on);b.addEventListener("focus",on);b.addEventListener("mouseleave",off);b.addEventListener("blur",off);
    b.addEventListener("click",function(){d.row.scrollIntoView({behavior:"smooth",block:"center"})});
    wrap.appendChild(b);
  });
  var key=document.createElement("div");key.className="dive-strip-key";
  groups.forEach(function(g){var s=document.createElement("span");s.style.setProperty("--c",g.color);s.textContent=g.place+" · "+g.count;key.appendChild(s)});
  var box=document.createElement("div");box.className="dive-strip-box";box.appendChild(wrap);box.appendChild(tip);box.appendChild(key);
  table.parentNode.insertBefore(box,table);
  reveal([wrap],"in");
})();
})();
