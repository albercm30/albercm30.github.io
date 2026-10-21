/* Cursor-reactive background (homepage only). Sits behind content (z-index -1), ignores pointer events. */
(function(){
"use strict";
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var path=location.pathname.replace(/^\/es(?=\/|$)/,"")||"/",seg=path.split("/")[1]||"home";
if(seg!=="home")return;var theme="constellation";
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
    ctx.strokeStyle=rgba(k*(1-d/110)*.8);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}}}
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
