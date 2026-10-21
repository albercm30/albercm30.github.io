/* Cursor-reactive background canvases, one theme per section. Sits behind content (z-index -1), ignores pointer events. */
(function(){
"use strict";
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var path=location.pathname.replace(/^\/es(?=\/|$)/,"")||"/",seg=path.split("/")[1]||"home";
var theme={home:"constellation",professional:"lattice",projects:"lattice",countries:"routes",travel:"routes",mountains:"contours",diving:"bubbles",wildlife:"fireflies",photography:"bokeh",contact:"fireflies"}[seg]||"constellation";
var cv=document.createElement("canvas");cv.className="bg-canvas";cv.setAttribute("aria-hidden","true");
cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
document.body.insertBefore(cv,document.body.firstChild);
var lastMove=0;
var ctx=cv.getContext("2d"),W=0,H=0,dpr=1,mx=-9999,my=-9999,px=-9999,py=-9999,active=0,col=[85,112,76],dark=false,vis=true,last=0;
var mobile=matchMedia("(pointer:coarse)").matches;
function readColor(){var s=getComputedStyle(document.documentElement).getPropertyValue("--green").trim(),m=/^#([\da-f]{6})$/i.exec(s);if(m){var n=parseInt(m[1],16);col=[n>>16,n>>8&255,n&255]}var bg=getComputedStyle(document.body).backgroundColor.match(/\d+/g);dark=bg?(+bg[0]+ +bg[1]+ +bg[2])<300:false}
function rgba(a){return "rgba("+col[0]+","+col[1]+","+col[2]+","+a+")"}
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);T.init()}
function R(a,b){return a+Math.random()*(b-a)}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
var T;

var themes={
/* dots drift; near the cursor they join with lines that light up */
constellation:function(){var P=[];return{
 init:function(){P=[];var n=Math.round(W*H/16000);for(var i=0;i<n;i++)P.push({x:R(0,W),y:R(0,H),vx:R(-.15,.15),vy:R(-.15,.15)})},
 draw:function(dt){var rad=170;
  P.forEach(function(p){p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
   var d=dist(p.x,p.y,mx,my),k=Math.max(0,1-d/rad);
   if(k>0){p.x+=(p.x-mx)/d*k*.4;p.y+=(p.y-my)/d*k*.4}
   ctx.fillStyle=rgba(.16+k*.7);ctx.beginPath();ctx.arc(p.x,p.y,1.4+k*2,0,6.3);ctx.fill()});
  for(var i=0;i<P.length;i++){var a=P[i],da=dist(a.x,a.y,mx,my);if(da>rad+60)continue;
   for(var j=i+1;j<P.length;j++){var b=P[j],d=dist(a.x,a.y,b.x,b.y);if(d>110)continue;
    var k=Math.max(0,1-Math.min(da,dist(b.x,b.y,mx,my))/rad);if(k<=0)continue;
    ctx.strokeStyle=rgba(k*(1-d/110)*.8);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}}},
/* a square data lattice; nodes near the cursor pulse and signals run along the grid */
lattice:function(){var cells=[],S=46,sig=[];return{
 init:function(){cells=[];sig=[];for(var x=S/2;x<W+S;x+=S)for(var y=S/2;y<H+S;y+=S)cells.push([x,y])},
 draw:function(dt,t){
  cells.forEach(function(c){var d=dist(c[0],c[1],mx,my),k=Math.max(0,1-d/200),w=.5+.5*Math.sin(t/900+c[0]*.02+c[1]*.03);
   ctx.fillStyle=rgba(.07+w*.05+k*.75);var r=1.1+k*2.6;ctx.fillRect(c[0]-r/2,c[1]-r/2,r,r);
   if(k>.25){ctx.strokeStyle=rgba(k*.35);ctx.lineWidth=1;ctx.strokeRect(c[0]-S/2,c[1]-S/2,S,S)}});
  if(active&&Math.random()<.18)sig.push({x:Math.round((mx-S/2)/S)*S+S/2,y:Math.round((my-S/2)/S)*S+S/2,d:Math.random()<.5?[1,0]:[0,1],s:Math.random()<.5?1:-1,l:0});
  sig=sig.filter(function(s){s.l+=dt*.12;var L=Math.min(s.l,260);ctx.strokeStyle=rgba(Math.max(0,.6-s.l/260*.6));ctx.lineWidth=1.5;ctx.beginPath();
   ctx.moveTo(s.x+s.d[0]*s.s*Math.max(0,s.l-40),s.y+s.d[1]*s.s*Math.max(0,s.l-40));ctx.lineTo(s.x+s.d[0]*s.s*L,s.y+s.d[1]*s.s*L);ctx.stroke();return s.l<300})}}},
/* scattered cities; the cursor links nearby ones with curved flight arcs */
routes:function(){var P=[],trail=[];return{
 init:function(){P=[];trail=[];var n=Math.round(W*H/21000);for(var i=0;i<n;i++)P.push({x:R(0,W),y:R(0,H),ph:R(0,6)})},
 draw:function(dt,t){
  P.forEach(function(p){var d=dist(p.x,p.y,mx,my),k=Math.max(0,1-d/190);ctx.fillStyle=rgba(.14+k*.8);ctx.beginPath();ctx.arc(p.x,p.y,1.5+k*2.6,0,6.3);ctx.fill();
   if(k>.5){ctx.strokeStyle=rgba(k*.5);ctx.beginPath();ctx.arc(p.x,p.y,6+((t/40+p.ph*20)%14),0,6.3);ctx.stroke()}});
  if(active&&dist(mx,my,px,py)>40){var near=P.filter(function(p){return dist(p.x,p.y,mx,my)<190}).sort(function(a,b){return dist(a.x,a.y,mx,my)-dist(b.x,b.y,mx,my)}).slice(0,3);
   for(var i=0;i<near.length-1;i++)trail.push({a:near[i],b:near[i+1],l:1});px=mx;py=my}
  trail=trail.filter(function(r){r.l-=dt*.0011;if(r.l<=0)return false;var a=r.a,b=r.b,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2-dist(a.x,a.y,b.x,b.y)*.35;
   ctx.strokeStyle=rgba(r.l*.7);ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,cy,b.x,b.y);ctx.stroke();
   var u=1-r.l,qx=(1-u)*(1-u)*a.x+2*(1-u)*u*cx+u*u*b.x,qy=(1-u)*(1-u)*a.y+2*(1-u)*u*cy+u*u*b.y;ctx.fillStyle=rgba(r.l);ctx.beginPath();ctx.arc(qx,qy,2.4,0,6.3);ctx.fill();return true})}}},
/* topographic contour rings that ripple outward from the cursor */
contours:function(){var rings=[],lastR=0;return{
 init:function(){rings=[]},
 draw:function(dt,t){
  if(active&&t-lastR>140&&dist(mx,my,px,py)>6){rings.push({x:mx,y:my,r:4,s:R(0,6.3)});lastR=t;px=mx;py=my}
  rings=rings.filter(function(g){g.r+=dt*.05;var a=Math.max(0,.5-g.r/320);if(a<=0)return false;ctx.strokeStyle=rgba(a);ctx.lineWidth=1;ctx.beginPath();
   for(var i=0;i<=48;i++){var an=i/48*6.283,w=1+.14*Math.sin(an*3+g.s)+.07*Math.sin(an*5-g.s*2),x=g.x+Math.cos(an)*g.r*w,y=g.y+Math.sin(an)*g.r*w*.82;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();return true})}}},
/* bubbles rise and swerve away from the cursor */
bubbles:function(){var P=[];return{
 init:function(){P=[];var n=Math.round(W*H/20000);for(var i=0;i<n;i++)P.push(mk(true))},
 draw:function(dt,t){P.forEach(function(b,i){b.y-=b.v*dt*.05;b.x+=Math.sin(t/900+b.ph)*.25;var d=dist(b.x,b.y,mx,my);if(d<120){b.x+=(b.x-mx)/d*(120-d)*.05;b.y+=(b.y-my)/d*(120-d)*.03}
   if(b.y<-20)P[i]=mk(false);ctx.strokeStyle=rgba(.22+(d<120?.4:0));ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.3);ctx.stroke();ctx.fillStyle=rgba(.25);ctx.beginPath();ctx.arc(b.x-b.r*.35,b.y-b.r*.35,b.r*.2,0,6.3);ctx.fill()});
  if(active&&Math.random()<.35)P.push({x:mx+R(-10,10),y:my+8,r:R(1.5,4),v:R(1.2,2.6),ph:R(0,6)});if(P.length>140)P.splice(0,P.length-140)}};
 function mk(any){return{x:R(0,W),y:any?R(0,H):H+20,r:R(2,9),v:R(.5,1.6),ph:R(0,6)}}},
/* fireflies drift, then gather and glow around the cursor */
fireflies:function(){var P=[];return{
 init:function(){P=[];var n=Math.round(W*H/26000);for(var i=0;i<n;i++)P.push({x:R(0,W),y:R(0,H),a:R(0,6.3),s:R(.2,.6),ph:R(0,6.3)})},
 draw:function(dt,t){P.forEach(function(p){p.a+=R(-.12,.12);var d=dist(p.x,p.y,mx,my);
   if(d<260&&d>30){var ang=Math.atan2(my-p.y,mx-p.x);p.a+=Math.sin(ang-p.a)*.08}
   p.x+=Math.cos(p.a)*p.s*dt*.05*(d<260?2:1);p.y+=Math.sin(p.a)*p.s*dt*.05*(d<260?2:1);
   if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;
   var g=.25+.75*Math.pow(.5+.5*Math.sin(t/500+p.ph),3),k=d<260?1.4:1,r=10*k,gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
   gr.addColorStop(0,rgba(.8*g));gr.addColorStop(1,rgba(0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.3);ctx.fill()})}}},
/* soft out-of-focus lights that bloom under the cursor, like a lens */
bokeh:function(){var P=[],tr=[];return{
 init:function(){P=[];tr=[];var n=Math.round(W*H/38000);for(var i=0;i<n;i++)P.push({x:R(0,W),y:R(0,H),r:R(14,46),vx:R(-.05,.05),vy:R(-.05,.05)})},
 draw:function(dt){P.forEach(function(p){p.x+=p.vx*dt*.05;p.y+=p.vy*dt*.05;if(p.x<-60)p.x=W+60;if(p.x>W+60)p.x=-60;if(p.y<-60)p.y=H+60;if(p.y>H+60)p.y=-60;
   var d=dist(p.x,p.y,mx,my),k=Math.max(0,1-d/260);ctx.fillStyle=rgba(.035+k*.2);ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1+k*.35),0,6.3);ctx.fill();
   if(k>.1){ctx.strokeStyle=rgba(k*.45);ctx.lineWidth=1;ctx.stroke()}});
  if(active)tr.push({x:mx,y:my,r:R(8,26),l:1});
  tr=tr.filter(function(s){s.l-=dt*.0016;if(s.l<=0)return false;ctx.fillStyle=rgba(s.l*.12);ctx.beginPath();ctx.arc(s.x,s.y,s.r*(1.5-s.l*.5),0,6.3);ctx.fill();return true})}}}
};

function frame(now){
 requestAnimationFrame(frame);if(!vis)return;
 var dt=Math.min(50,now-last||16);last=now;ctx.clearRect(0,0,W,H);
 if(mobile&&performance.now()-lastMove>2500){mx=W/2+Math.cos(now/2600)*W*.34;my=H/2+Math.sin(now/3300)*H*.3;active=1}
 ctx.globalAlpha=dark?.9:1;T.draw(dt,now);ctx.globalAlpha=1;
}
addEventListener("pointermove",function(e){mx=e.clientX;my=e.clientY;active=1;lastMove=performance.now()},{passive:true});
addEventListener("pointerleave",function(){mx=my=-9999;active=0});
document.addEventListener("mouseleave",function(){mx=my=-9999;active=0});
setInterval(function(){if(performance.now()-lastMove>1500)active=0},400);
document.addEventListener("visibilitychange",function(){vis=!document.hidden});
new MutationObserver(readColor).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
if(matchMedia)matchMedia("(prefers-color-scheme: dark)").addEventListener&&matchMedia("(prefers-color-scheme: dark)").addEventListener("change",readColor);
var rt;addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(resize,150)});
readColor();T=themes[theme]();resize();requestAnimationFrame(frame);
})();
