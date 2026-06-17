"use strict";
//==================== CANVAS ====================
const stage=document.getElementById('stage');
const gridC=document.getElementById('grid'),mainC=document.getElementById('main'),curC=document.getElementById('cursorCanvas');
const g=gridC.getContext('2d'),c=mainC.getContext('2d'),cc=curC.getContext('2d');
let DPR=1,W=0,H=0;
function resize(){const r=stage.getBoundingClientRect();W=r.width;H=r.height;DPR=window.devicePixelRatio||1;
  [gridC,mainC,curC].forEach(cv=>{cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';});
  [g,c,cc].forEach(x=>x.setTransform(DPR,0,0,DPR,0,0));draw();}
window.addEventListener('resize',resize);

function scl(){return PPM*zoom;}
function toScreen(x,y){return [x*scl()+panX,y*scl()+panY];}
function toWorld(sx,sy){return [(sx-panX)/scl(),(sy-panY)/scl()];}
function snap(v){return snapOn?Math.round(v/gridStep)*gridStep:Math.round(v*100)/100;}
function snapPoint(x,y,exclude){const thr=0.35/zoom;let best=null,bd=thr;
  for(const w of state.walls){if(exclude&&exclude.has(w.id))continue;for(const p of [[w.x1,w.y1],[w.x2,w.y2]]){const d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=p;}}}
  if(best)return{x:best[0],y:best[1]};return{x:snap(x),y:snap(y)};}
