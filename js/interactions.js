"use strict";
//==================== INTERACTION ====================
let measureA=null,roomStart=null;
function getMouse(e){const r=stage.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,[wx,wy]=toWorld(sx,sy);return{sx,sy,wx,wy};}
mainC.addEventListener('pointerdown',onDown);window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);
mainC.addEventListener('dblclick',onDbl);mainC.addEventListener('wheel',onWheel,{passive:false});
mainC.addEventListener('contextmenu',e=>{e.preventDefault();
  if(rightDown&&Math.hypot(e.clientX-rightDown.x,e.clientY-rightDown.y)>5){return;} // foi arraste (mover tela)
  const m=getMouse(e),hit=hitTest(m.wx,m.wy);
  if(!hit){hideCtx();return;}
  sel=hit;renderProps();draw();showCtx(e.clientX,e.clientY,hit);});
let rightDown=null;
function hideCtx(){document.getElementById('ctxMenu').classList.remove('show');}
function showCtx(px,py,hit){const el=document.getElementById('ctxMenu'),o=ent(hit);
  const names={wall:'Parede',room:'Cômodo',furniture:(o&&o.label)||'Móvel',opening:o&&o.type==='door'?'Porta':'Janela',text:'Texto'};
  const trash='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
  const copy='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  let html=`<div class="label">${names[hit.kind]||'Item'}</div>`;
  if(hit.kind==='furniture')html+=`<div class="ci" id="ctxDup">${copy} Duplicar</div>`;
  html+=`<div class="ci danger" id="ctxDel">${trash} Excluir</div>`;
  el.innerHTML=html;el.style.left=Math.min(px,window.innerWidth-176)+'px';el.style.top=Math.min(py,window.innerHeight-110)+'px';el.classList.add('show');
  document.getElementById('ctxDel').onclick=()=>{pushHistory();sel=hit;deleteSel();hideCtx();};
  const dup=document.getElementById('ctxDup');if(dup)dup.onclick=()=>{pushHistory();const nf=JSON.parse(JSON.stringify(ent(hit)));nf.id=newId();nf.x+=0.3;nf.y+=0.3;state.furniture.push(nf);placeSelect('furniture',nf.id,'Cópia criada.');hideCtx();};}

function onDown(e){const m=getMouse(e);mainC.setPointerCapture(e.pointerId);
  if(e.button===1||spaceDown||e.button===2){if(e.button===2)rightDown={x:e.clientX,y:e.clientY};panning={x:e.clientX,y:e.clientY,px:panX,py:panY};return;}
  hideCtx();
  if(e.button!==0)return;
  if(tool==='wall'){const sp=snapPoint(m.wx,m.wy);
    if(wallChain.length>=2&&Math.hypot(sp.x-wallChain[0].x,sp.y-wallChain[0].y)<0.09){wallChain.push({x:wallChain[0].x,y:wallChain[0].y});finishWall();setTool('select');setHint('Contorno fechado! Use a ferramenta Mover — os cantos ficam grudados.');return;}
    if(!wallChain.length)pushHistory();wallChain.push({x:sp.x,y:sp.y});draw();return;}
  if(tool==='room'){roomStart=snapPoint(m.wx,m.wy);return;}
  if(tool==='measure'){measureA=snapPoint(m.wx,m.wy);return;}
  if(tool==='door'||tool==='window'){const nw=nearestWall(m.wx,m.wy);if(nw){pushHistory();const ang=Math.atan2(nw.w.y2-nw.w.y1,nw.w.x2-nw.w.x1);const o={id:newId(),type:tool,subtype:tool==='door'?doorSub:winSub,x:nw.p.x,y:nw.p.y,angle:ang,t:nw.w.t||defaultWallT,width:tool==='door'?(doorSub==='dupla'?1.4:0.8):(winSub==='ampla'?2.0:1.2),hinge:-1,flip:1};state.openings.push(o);placeSelect('opening',o.id,'Adicionada — arraste as pontas ou digite a largura no painel.');}else setHint('Clique em cima de uma parede.');return;}
  if(tool==='furniture'){if(!pendingFurniture){setHint('Escolha um item na biblioteca.');return;}pushHistory();const sp=snapPoint(m.wx,m.wy);const f={id:newId(),kind:pendingFurniture[0],x:sp.x,y:sp.y,w:pendingFurniture[2],h:pendingFurniture[3],angle:0,label:pendingFurniture[1]};state.furniture.push(f);placeSelect('furniture',f.id,'Item adicionado — gire ou redimensione no painel da direita.');return;}
  if(tool==='text'){const txt=prompt('Texto:');if(txt){pushHistory();state.texts.push({id:newId(),x:snap(m.wx),y:snap(m.wy),text:txt,size:14});draw();afterChange();}return;}
  // SELECT
  if(sel&&sel.kind==='furniture'){const f=state.furniture.find(o=>o.id===sel.id);if(f){const rh=rotPos(f);if(Math.hypot(rh[0]-m.sx,rh[1]-m.sy)<10){pushHistory();drag={mode:'rotate',f};return;}}}
  if(sel&&sel.kind==='room'){const r=state.rooms.find(o=>o.id===sel.id);if(r){const[x,y]=toScreen(r.x,r.y),w=r.w*scl(),h=r.h*scl();for(const cn of [[x,y,'tl'],[x+w,y,'tr'],[x,y+h,'bl'],[x+w,y+h,'br']])if(Math.hypot(cn[0]-m.sx,cn[1]-m.sy)<10){pushHistory();drag={mode:'roomresize',r,corner:cn[2]};return;}}}
  if(sel&&sel.kind==='wall'){const w=state.walls.find(o=>o.id===sel.id);if(w)for(const ep of ['1','2']){const px=w['x'+ep],py=w['y'+ep],[hx,hy]=toScreen(px,py);if(Math.hypot(hx-m.sx,hy-m.sy)<11){pushHistory();const eps=0.07,group=[],exc=new Set();for(const ww of state.walls){if(Math.hypot(ww.x1-px,ww.y1-py)<eps){group.push({w:ww,ep:'1'});exc.add(ww.id);}if(Math.hypot(ww.x2-px,ww.y2-py)<eps){group.push({w:ww,ep:'2'});exc.add(ww.id);}}drag={mode:'wallpt',group,exc};return;}}}
  if(sel&&sel.kind==='opening'){const o=state.openings.find(x=>x.id===sel.id);if(o){const dx=Math.cos(o.angle),dy=Math.sin(o.angle);for(const sg of [-1,1]){const ex=o.x+sg*dx*o.width/2,ey=o.y+sg*dy*o.width/2,[hx,hy]=toScreen(ex,ey);if(Math.hypot(hx-m.sx,hy-m.sy)<11){pushHistory();drag={mode:'openresize',o,dx,dy,fixed:{x:o.x-sg*dx*o.width/2,y:o.y-sg*dy*o.width/2}};return;}}}}
  const hit=hitTest(m.wx,m.wy);sel=hit;
  if(hit){pushHistory();
    if(hit.kind==='wall'){const w=ent(hit),eps=0.07,members=[];for(const ww of state.walls)for(const ep of ['1','2']){const px=ww['x'+ep],py=ww['y'+ep];if(Math.hypot(px-w.x1,py-w.y1)<eps||Math.hypot(px-w.x2,py-w.y2)<eps)members.push({w:ww,ep,ox:px,oy:py});}drag={mode:'wallmove',start:{x:m.wx,y:m.wy},members};}
    else drag={mode:'move',start:{x:m.wx,y:m.wy},kind:hit.kind,id:hit.id,orig:JSON.parse(JSON.stringify(ent(hit)))};}
  renderProps();draw();}

function placeSelect(kind,id,msg){sel={kind,id};tool='select';pendingFurniture=null;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool==='select'));document.querySelectorAll('.libitem').forEach(x=>x.classList.remove('sel'));cc.clearRect(0,0,W,H);setHint(msg);draw();afterChange();renderProps();}
function roomBoundsFromWalls(r){if(!r.wallIds||!r.wallIds.length)return null;let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity;
  r.wallIds.forEach(id=>{const w=state.walls.find(o=>o.id===id);if(!w)return;[[w.x1,w.y1],[w.x2,w.y2]].forEach(p=>{mnx=Math.min(mnx,p[0]);mny=Math.min(mny,p[1]);mxx=Math.max(mxx,p[0]);mxy=Math.max(mxy,p[1]);});});
  if(mnx===Infinity)return null;return{x:mnx,y:mny,w:Math.max(mxx-mnx,1e-6),h:Math.max(mxy-mny,1e-6)};}
function refreshRoomBounds(){state.rooms.forEach(r=>{const b=roomBoundsFromWalls(r);if(b){r.x=b.x;r.y=b.y;r.w=b.w;r.h=b.h;}});}
// Move/redimensiona o cômodo mapeando proporcionalmente a forma atual das paredes pro novo retângulo —
// preserva cantos puxados livremente em vez de forçar de volta um retângulo perfeito.
function syncRoomWalls(r){if(!r.wallIds)return;const old=roomBoundsFromWalls(r);if(!old)return;
  const sx=old.w>1e-6?r.w/old.w:1,sy=old.h>1e-6?r.h/old.h:1;
  r.wallIds.forEach(id=>{const w=state.walls.find(o=>o.id===id);if(!w)return;
    w.x1=r.x+(w.x1-old.x)*sx;w.y1=r.y+(w.y1-old.y)*sy;w.x2=r.x+(w.x2-old.x)*sx;w.y2=r.y+(w.y2-old.y)*sy;
    if(r.t)w.t=r.t;});}
function createRoom(x,y,w,h,name){const r={id:newId(),x,y,w,h,name,color:ROOM_COLORS[state.rooms.length%ROOM_COLORS.length],t:defaultWallT,wallIds:[]};const cs=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],pairs=[[0,1],[1,2],[2,3],[3,0]];pairs.forEach(p=>{const a=cs[p[0]],b=cs[p[1]],wl={id:newId(),x1:a[0],y1:a[1],x2:b[0],y2:b[1],t:defaultWallT};state.walls.push(wl);r.wallIds.push(wl.id);});state.rooms.push(r);return r;}
function ent(s){const map={wall:state.walls,room:state.rooms,furniture:state.furniture,opening:state.openings,text:state.texts};return map[s.kind].find(o=>o.id===s.id);}
function onMove(e){const m=getMouse(e);mouseW={x:m.wx,y:m.wy};
  document.getElementById('coord').textContent=m.wx.toFixed(2).replace('.',',')+' m · '+m.wy.toFixed(2).replace('.',',')+' m';
  if(panning){panX=panning.px+(e.clientX-panning.x);panY=panning.py+(e.clientY-panning.y);draw();return;}
  if(drag){
    if(drag.mode==='move'){const e2=ent(drag),dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;
      if(drag.kind==='opening'){const nx=drag.orig.x+dx,ny=drag.orig.y+dy,nw=nearestWall(nx,ny);if(nw){e2.x=nw.p.x;e2.y=nw.p.y;e2.angle=Math.atan2(nw.w.y2-nw.w.y1,nw.w.x2-nw.w.x1);e2.t=nw.w.t||defaultWallT;}else{e2.x=nx;e2.y=ny;}}
      else{e2.x=snap(drag.orig.x+dx);e2.y=snap(drag.orig.y+dy);if(drag.kind==='room')syncRoomWalls(e2);}draw();}
    else if(drag.mode==='wallmove'){const dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;drag.members.forEach(mb=>{mb.w['x'+mb.ep]=snap(mb.ox+dx);mb.w['y'+mb.ep]=snap(mb.oy+dy);});refreshRoomBounds();draw();renderProps();}
    else if(drag.mode==='rotate'){drag.f.angle=Math.round((Math.atan2(m.wy-drag.f.y,m.wx-drag.f.x)+Math.PI/2)/(Math.PI/12))*(Math.PI/12);draw();renderProps();}
    else if(drag.mode==='wallpt'){const sp=snapPoint(m.wx,m.wy,drag.exc);drag.group.forEach(gp=>{gp.w['x'+gp.ep]=sp.x;gp.w['y'+gp.ep]=sp.y;});refreshRoomBounds();draw();renderProps();}
    else if(drag.mode==='roomresize'){const r=drag.r,sp=snapPoint(m.wx,m.wy),right=r.x+r.w,bottom=r.y+r.h;if(drag.corner.includes('l')){r.x=Math.min(sp.x,right-0.1);r.w=right-r.x;}else r.w=Math.max(0.1,sp.x-r.x);if(drag.corner.includes('t')){r.y=Math.min(sp.y,bottom-0.1);r.h=bottom-r.y;}else r.h=Math.max(0.1,sp.y-r.y);syncRoomWalls(r);draw();renderProps();}
    else if(drag.mode==='openresize'){const o=drag.o,t=(m.wx-drag.fixed.x)*drag.dx+(m.wy-drag.fixed.y)*drag.dy,lim=o.type==='door'?[0.6,3.0]:[0.4,4.0];let w=Math.max(lim[0],Math.min(lim[1],Math.abs(t)));const sg=Math.sign(t)||1,ex=drag.fixed.x+drag.dx*w*sg,ey=drag.fixed.y+drag.dy*w*sg;o.x=(drag.fixed.x+ex)/2;o.y=(drag.fixed.y+ey)/2;o.width=w;draw();renderProps();}
    return;}
  drawCursor();if(tool==='wall'||tool==='room'||tool==='measure')draw();}

function onUp(){if(panning){panning=null;return;}if(drag){afterChange();drag=null;renderProps();return;}
  if(tool==='room'&&roomStart){const sp=snapPoint(mouseW.x,mouseW.y),x=Math.min(roomStart.x,sp.x),y=Math.min(roomStart.y,sp.y),w=Math.abs(sp.x-roomStart.x),h=Math.abs(sp.y-roomStart.y);roomStart=null;if(w>0.2&&h>0.2){pushHistory();const name=prompt('Nome do cômodo (ex.: Quarto, Cozinha):','')||'';const r=createRoom(x,y,w,h,name);placeSelect('room',r.id,'Cômodo criado com paredes e piso. Ajuste medidas/espessura no painel.');}else draw();}}

function onDbl(e){const m=getMouse(e);if(tool==='wall'){finishWall();return;}const hit=hitTest(m.wx,m.wy);
  if(hit&&hit.kind==='room'){const r=state.rooms.find(o=>o.id===hit.id);const n=prompt('Nome do cômodo:',r.name||'');if(n!==null){pushHistory();r.name=n;draw();renderProps();}}
  else if(hit&&hit.kind==='text'){const t=state.texts.find(o=>o.id===hit.id);const n=prompt('Editar texto:',t.text);if(n!==null){pushHistory();t.text=n;draw();}}}

function finishWall(){if(wallChain.length>=2)for(let i=0;i<wallChain.length-1;i++)state.walls.push({id:newId(),x1:wallChain[i].x,y1:wallChain[i].y,x2:wallChain[i+1].x,y2:wallChain[i+1].y,t:defaultWallT});wallChain=[];draw();afterChange();}
function onWheel(e){e.preventDefault();hideCtx();const m=getMouse(e),f=e.deltaY<0?1.12:1/1.12,nz=Math.max(0.15,Math.min(8,zoom*f)),[wx,wy]=toWorld(m.sx,m.sy);zoom=nz;panX=m.sx-wx*scl();panY=m.sy-wy*scl();updateZoom();draw();}
function drawCursor(){cc.clearRect(0,0,W,H);
  if(tool==='door'||tool==='window'){const nw=nearestWall(mouseW.x,mouseW.y);if(nw){const[x,y]=toScreen(nw.p.x,nw.p.y);cc.strokeStyle='#e08a3c';cc.lineWidth=2;cc.beginPath();cc.arc(x,y,8,0,7);cc.stroke();}}
  if(snapOn&&(tool==='wall'||tool==='room'||tool==='measure')){const sp=snapPoint(mouseW.x,mouseW.y),[x,y]=toScreen(sp.x,sp.y);cc.strokeStyle='#4a90c2';cc.lineWidth=1.5;cc.beginPath();cc.moveTo(x-7,y);cc.lineTo(x+7,y);cc.moveTo(x,y-7);cc.lineTo(x,y+7);cc.stroke();}}
