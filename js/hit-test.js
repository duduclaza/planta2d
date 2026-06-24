"use strict";
//==================== HIT TEST ====================
function pseg(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;let t=l2?((px-x1)*dx+(py-y1)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return{d:Math.hypot(px-(x1+t*dx),py-(y1+t*dy)),t,x:x1+t*dx,y:y1+t*dy};}
function hitTest(x,y){const thr=0.18/zoom;
  for(let i=state.texts.length-1;i>=0;i--){const t=state.texts[i];c.font=`600 ${t.size||14}px 'Inter'`;const w=c.measureText(t.text).width/scl(),h=(t.size||14)/scl();if(x>=t.x&&x<=t.x+w&&y>=t.y&&y<=t.y+h)return{kind:'text',id:t.id};}
  for(let i=(state.measures||[]).length-1;i>=0;i--){const m=state.measures[i];if(pseg(x,y,m.x1,m.y1,m.x2,m.y2).d<Math.max(0.08,thr))return{kind:'measure',id:m.id};}
  for(let i=state.furniture.length-1;i>=0;i--){const f=state.furniture[i],a=-(f.angle||0),dx=x-f.x,dy=y-f.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(lx)<=f.w/2&&Math.abs(ly)<=f.h/2)return{kind:'furniture',id:f.id};}
  for(let i=state.openings.length-1;i>=0;i--){const o=state.openings[i];if(Math.hypot(o.x-x,o.y-y)<Math.max(o.width/2,thr))return{kind:'opening',id:o.id};}
  for(let i=state.walls.length-1;i>=0;i--){const w=state.walls[i];if(pseg(x,y,w.x1,w.y1,w.x2,w.y2).d<Math.max((w.t||defaultWallT),thr))return{kind:'wall',id:w.id};}
  for(let i=state.rooms.length-1;i>=0;i--){const r=state.rooms[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return{kind:'room',id:r.id};}
  for(let i=(state.floors||[]).length-1;i>=0;i--){const f=state.floors[i];if(x>=f.x&&x<=f.x+f.w&&y>=f.y&&y<=f.y+f.h)return{kind:'floor',id:f.id};}
  return null;}
function nearestWall(x,y){let best=null,bd=0.6/zoom;for(const w of state.walls){const p=pseg(x,y,w.x1,w.y1,w.x2,w.y2);if(p.d<bd){bd=p.d;best={w,p};}}return best;}
