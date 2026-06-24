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
  if(!isMultiSelected(hit)){const g=findGroupForRef(hit);if(g){sel={kind:'group',id:g.id};multiSel=cleanRefs(g.items);}else selectOnly(hit);}
  renderProps();draw();showCtx(e.clientX,e.clientY,hit);});
let rightDown=null;
function hideCtx(){document.getElementById('ctxMenu').classList.remove('show');}
function refKey(r){return r&&r.kind+':'+r.id;}
function sameRef(a,b){return !!a&&!!b&&a.kind===b.kind&&a.id===b.id;}
function cleanRefs(refs){return (refs||[]).filter(r=>r&&r.kind!=='group'&&ent(r)).filter((r,i,a)=>a.findIndex(x=>sameRef(x,r))===i);}
function ensureGroups(){state.groups=state.groups||[];state.groups.forEach(g=>g.items=cleanRefs(g.items));state.groups=state.groups.filter(g=>g.items&&g.items.length>1);}
function isMultiSelected(ref){return multiSel.some(r=>sameRef(r,ref));}
function selectedRefs(){if(sel&&sel.kind==='group'){const g=ent(sel);return cleanRefs(g&&g.items);}return multiSel.length?cleanRefs(multiSel):(sel?[sel]:[]);}
function selectOnly(ref){sel=ref;multiSel=ref?[ref]:[];}
function toggleMulti(ref){if(!ref)return;ensureGroups();const group=findGroupForRef(ref);if(group)ref={kind:'group',id:group.id};if(ref.kind==='group'){sel=ref;multiSel=cleanRefs(ent(ref).items);return;}const i=multiSel.findIndex(r=>sameRef(r,ref));if(i>=0)multiSel.splice(i,1);else multiSel.push(ref);multiSel=cleanRefs(multiSel);sel=multiSel.length===1?multiSel[0]:multiSel.length?multiSel[multiSel.length-1]:null;}
function findGroupForRef(ref){ensureGroups();return state.groups.find(g=>(g.items||[]).some(r=>sameRef(r,ref)))||null;}
function groupSelection(){
  const items=cleanRefs(selectedRefs());if(items.length<2)return null;
  ensureGroups();state.groups=state.groups.filter(g=>!(g.items||[]).some(r=>items.some(x=>sameRef(x,r))));
  const g={id:newId(),items};state.groups.push(g);sel={kind:'group',id:g.id};multiSel=items;setHint('Objetos agrupados. Use o botao do meio para arrastar o grupo.');draw();afterChange();renderProps();return g;
}
function ungroupSelection(){
  if(!sel||sel.kind!=='group')return false;ensureGroups();const g=ent(sel);if(!g)return false;
  multiSel=cleanRefs(g.items);state.groups=state.groups.filter(x=>x.id!==sel.id);sel=multiSel[0]||null;setHint('Grupo desfeito.');draw();afterChange();renderProps();return true;
}
function moveRefBy(ref,dx,dy){
  const o=ent(ref);if(!o||o.locked)return;
  if(ref.kind==='wall'){o.x1+=dx;o.y1+=dy;o.x2+=dx;o.y2+=dy;}
  else if(ref.kind==='measure'){o.x1+=dx;o.y1+=dy;o.x2+=dx;o.y2+=dy;}
  else if('x'in o&&'y'in o){o.x+=dx;o.y+=dy;if(ref.kind==='room')syncRoomWalls(o);}
}
function moveRefsStart(refs){return cleanRefs(refs).map(r=>({ref:r,orig:JSON.parse(JSON.stringify(ent(r)))}));}
function applyMoveRefs(items,dx,dy){items.forEach(it=>{const o=ent(it.ref);if(!o)return;Object.assign(o,JSON.parse(JSON.stringify(it.orig)));moveRefBy(it.ref,dx,dy);});refreshRoomBounds();}
function hitSelectedRef(hit){if(!hit)return false;if(hit.kind==='group')return true;const refs=selectedRefs();return refs.some(r=>sameRef(r,hit))||!!findGroupForRef(hit)&&sel&&sel.kind==='group'&&sel.id===findGroupForRef(hit).id;}
function deleteRefs(refs){
  refs=cleanRefs(refs);if(!refs.length)return;
  const byKind=refs.reduce((a,r)=>{(a[r.kind]=a[r.kind]||new Set()).add(r.id);return a;},{});
  if(byKind.room)byKind.room.forEach(id=>{const r=state.rooms.find(o=>o.id===id);if(r&&r.wallIds)state.walls=state.walls.filter(w=>!r.wallIds.includes(w.id));});
  const map={wall:'walls',room:'rooms',floor:'floors',furniture:'furniture',opening:'openings',text:'texts',measure:'measures'};
  Object.keys(byKind).forEach(k=>{if(map[k])state[map[k]]=state[map[k]].filter(o=>!byKind[k].has(o.id));});
  state.groups=(state.groups||[]).map(g=>({...g,items:cleanRefs(g.items)})).filter(g=>g.items.length>1);
  sel=null;multiSel=[];draw();afterChange();renderProps();
}
function deleteCurrentSelection(){deleteRefs(selectedRefs());}
function endpointDetached(w,ep){return !!(w.detached&&w.detached[ep]);}
function connectedEndpointRefs(w,ep){
  const px=w['x'+ep],py=w['y'+ep],eps=0.07,refs=[];
  if(endpointDetached(w,ep))return[{w,ep}];
  for(const ww of state.walls)for(const e2 of ['1','2']){
    if(endpointDetached(ww,e2))continue;
    if(Math.hypot(ww['x'+e2]-px,ww['y'+e2]-py)<eps)refs.push({w:ww,ep:e2});
  }
  return refs.length?refs:[{w,ep}];
}
function moveWallEndpointGroup(w,ep,x,y){connectedEndpointRefs(w,ep).forEach(r=>{r.w['x'+r.ep]=x;r.w['y'+r.ep]=y;});}
function nearestWallEndpoint(w,x,y){
  let best=null,bd=0.18/zoom;
  for(const ep of ['1','2']){
    const d=Math.hypot(w['x'+ep]-x,w['y'+ep]-y);
    if(d<bd){bd=d;best=ep;}
  }
  return best;
}
function splitWallAt(w,p){
  if(!w||p.t<0.08||p.t>0.92)return false;
  const x=p.x,y=p.y,oldX2=w.x2,oldY2=w.y2,nw=JSON.parse(JSON.stringify(w));
  nw.id=newId();nw.x1=x;nw.y1=y;nw.x2=oldX2;nw.y2=oldY2;if(nw.detached)delete nw.detached;
  w.x2=x;w.y2=y;if(w.detached)delete w.detached['2'];
  const idx=state.walls.indexOf(w);state.walls.splice(idx+1,0,nw);
  state.rooms.forEach(r=>{if(!r.wallIds)return;const i=r.wallIds.indexOf(w.id);if(i>=0)r.wallIds.splice(i+1,0,nw.id);});
  activeWallPoint={x,y};
  sel={kind:'wall',id:w.id};refreshRoomBounds();draw();afterChange();renderProps();setHint('Ponto criado na parede. Arraste o quadradinho para mover as paredes ligadas.');
  return true;
}
function detachWallEndpoint(w,ep){
  if(!w||!ep)return false;
  w.detached=w.detached||{};w.detached[ep]=true;
  setHint('Ponto desconectado. Agora essa ponta pode mover sozinha.');
  draw();afterChange();renderProps();
  return true;
}
function materializeWallSnap(sp){
  if(!sp||!sp.wallId)return sp;
  const w=state.walls.find(o=>o.id===sp.wallId);
  if(!w)return sp;
  const p=pseg(sp.x,sp.y,w.x1,w.y1,w.x2,w.y2);
  splitWallAt(w,p);
  return{x:p.x,y:p.y};
}
function wallMeasureHit(sx,sy){
  if(!showMeasures)return null;
  for(let i=state.walls.length-1;i>=0;i--){
    const w=state.walls[i];if(w.measureHidden)continue;
    const len=Math.hypot(w.x2-w.x1,w.y2-w.y1);if(len<0.05)continue;
    const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2,ang=Math.atan2(w.y2-w.y1,w.x2-w.x1),off=(w.measureOffset??((w.t||defaultWallT)/2+0.18));
    const[lx,ly]=toScreen(mx+Math.sin(ang)*off,my-Math.cos(ang)*off);
    c.font="600 11px 'JetBrains Mono',monospace";
    const bw=c.measureText(fmt(len)).width+14,bh=22;
    if(sx>=lx-bw/2&&sx<=lx+bw/2&&sy>=ly-bh/2&&sy<=ly+bh/2)return w;
  }
  return null;
}
function showCtx(px,py,hit){const el=document.getElementById('ctxMenu'),o=ent(hit),wm=hit.kind==='wall'?getMouse({clientX:px,clientY:py}):null,refs=selectedRefs(),grouped=sel&&sel.kind==='group';
  const names={wall:'Parede',room:'Cômodo',floor:(o&&o.label)||'Piso',furniture:(o&&o.label)||'Móvel',opening:o&&o.type==='door'?'Porta':'Janela',text:'Texto'};
  names.measure='Medida';names.group='Grupo';
  const trash='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
  const copy='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  let html=`<div class="label">${names[hit.kind]||'Item'}</div>`;
  html+=`<div class="ci" id="ctxCfg">${copy} Configurações</div>`;
  if(hit.kind==='wall')html+=`<div class="ci" id="ctxSplit">Criar ponto aqui</div>`;
  if(hit.kind==='wall'&&nearestWallEndpoint(o,wm.wx,wm.wy))html+=`<div class="ci" id="ctxDetach">Desconectar ponto</div>`;
  if(refs.length>1&&!grouped)html+=`<div class="ci" id="ctxGroup">Agrupar selecao</div>`;
  if(grouped)html+=`<div class="ci" id="ctxUngroup">Desagrupar</div>`;
  if(hit.kind!=='wall')html+=`<div class="ci" id="ctxDup">${copy} Duplicar</div>`;
  html+=`<div class="ci" id="ctxLock">${o&&o.locked?'Destravar':'Travar'}</div>`;
  html+=`<div class="ci danger" id="ctxDel">${trash} Excluir</div>`;
  el.innerHTML=html;el.style.left=Math.min(px,window.innerWidth-176)+'px';el.style.top=Math.min(py,window.innerHeight-150)+'px';el.classList.add('show');
  document.getElementById('ctxDel').onclick=()=>{pushHistory();if(refs.length>1||grouped)deleteCurrentSelection();else{sel=hit;deleteSel();}hideCtx();};
  document.getElementById('ctxCfg').onclick=()=>{sel=hit;showPropsTemporarily();renderProps();draw();hideCtx();};
  document.getElementById('ctxLock').onclick=()=>{pushHistory();const e=ent(hit);if(e){e.locked=!e.locked;setHint(e.locked?'Item travado.':'Item destravado.');}draw();renderProps();hideCtx();};
  const split=document.getElementById('ctxSplit');if(split)split.onclick=()=>{pushHistory();const p=pseg(wm.wx,wm.wy,o.x1,o.y1,o.x2,o.y2);splitWallAt(o,p);hideCtx();};
  const detach=document.getElementById('ctxDetach');if(detach)detach.onclick=()=>{pushHistory();detachWallEndpoint(o,nearestWallEndpoint(o,wm.wx,wm.wy));hideCtx();};
  const group=document.getElementById('ctxGroup');if(group)group.onclick=()=>{pushHistory();groupSelection();hideCtx();};
  const ungroup=document.getElementById('ctxUngroup');if(ungroup)ungroup.onclick=()=>{pushHistory();ungroupSelection();hideCtx();};
  const dup=document.getElementById('ctxDup');if(dup)dup.onclick=()=>{duplicateSelection(hit);hideCtx();};}

function duplicateSelection(target){
  const s=target||sel;if(!s)return;const o=ent(s);if(!o)return;pushHistory();
  if(s.kind==='room'){
    const nr=JSON.parse(JSON.stringify(o));nr.id=newId();nr.x+=0.4;nr.y+=0.4;nr.locked=false;nr.wallIds=[];
    (o.wallIds||[]).forEach(id=>{const w=state.walls.find(x=>x.id===id);if(!w)return;const nw=JSON.parse(JSON.stringify(w));nw.id=newId();nw.x1+=0.4;nw.y1+=0.4;nw.x2+=0.4;nw.y2+=0.4;nw.locked=false;state.walls.push(nw);nr.wallIds.push(nw.id);});
    state.rooms.push(nr);placeSelect('room',nr.id,'Cômodo duplicado.');return;
  }
  const map={floor:'floors',furniture:'furniture',opening:'openings',text:'texts',measure:'measures'};const arr=state[map[s.kind]];if(!arr)return;
  const no=JSON.parse(JSON.stringify(o));no.id=newId();no.locked=false;if('x'in no)no.x+=0.3;if('y'in no)no.y+=0.3;arr.push(no);placeSelect(s.kind,no.id,'Cópia criada.');
}

function onDown(e){const m=getMouse(e);mainC.setPointerCapture(e.pointerId);
  if(e.button===1){
    const hit=hitTest(m.wx,m.wy);
    if(hit&&hitSelectedRef(hit)){pushHistory();drag={mode:'multimove',start:{x:m.wx,y:m.wy},items:moveRefsStart(selectedRefs())};return;}
    panning={x:e.clientX,y:e.clientY,px:panX,py:panY};return;
  }
  if(spaceDown||e.button===2){if(e.button===2)rightDown={x:e.clientX,y:e.clientY};panning={x:e.clientX,y:e.clientY,px:panX,py:panY};return;}
  hideCtx();
  if(e.button!==0)return;
  const mh=tool==='select'?wallMeasureHit(m.sx,m.sy):null;
  if(mh){pushHistory();sel={kind:'wall',id:mh.id};const ang=Math.atan2(mh.y2-mh.y1,mh.x2-mh.x1);drag={mode:'measurelabel',w:mh,start:{x:m.wx,y:m.wy},orig:mh.measureOffset??((mh.t||defaultWallT)/2+0.18),nx:Math.sin(ang),ny:-Math.cos(ang)};renderProps();draw();return;}
  if(tool==='wall'){let sp=snapPoint(m.wx,m.wy);
    if(!wallChain.length)pushHistory();
    sp=materializeWallSnap(sp);
    if(wallChain.length>=2&&Math.hypot(sp.x-wallChain[0].x,sp.y-wallChain[0].y)<0.09){wallChain.push({x:wallChain[0].x,y:wallChain[0].y});finishWall();setTool('select');setHint('Contorno fechado! Use a ferramenta Mover — os cantos ficam grudados.');return;}
    wallChain.push({x:sp.x,y:sp.y});draw();return;}
  if(tool==='room'){roomStart=snapPoint(m.wx,m.wy);return;}
  if(tool==='floor'){if(!pendingFloor){setHint('Escolha um piso na biblioteca.');return;}pushHistory();const sp=snapPoint(m.wx,m.wy);const f={id:newId(),x:sp.x,y:sp.y,w:2,h:2,material:pendingFloor[0],color:pendingFloor[2],label:pendingFloor[1],tileSize:pendingFloor[3]||0.6};state.floors=state.floors||[];state.floors.push(f);placeSelect('floor',f.id,'Piso criado. Arraste os cantos para redimensionar.');return;}
  if(tool==='measure'){
    const sp=snapPoint(m.wx,m.wy);
    if(measureA){
      const len=Math.hypot(sp.x-measureA.x,sp.y-measureA.y);
      if(len>0.02){
        pushHistory();state.measures=state.measures||[];
        const ms={id:newId(),x1:measureA.x,y1:measureA.y,x2:sp.x,y2:sp.y};
        state.measures.push(ms);measureA=null;placeSelect('measure',ms.id,'Medida fixada. Selecione e aperte Delete para excluir.');
      }else{measureA=null;draw();}
      return;
    }
    measureA=sp;setHint('Clique no segundo ponto para fixar a medida.');draw();return;}
  if(tool==='door'||tool==='window'){const nw=nearestWall(m.wx,m.wy);if(nw){pushHistory();const ang=Math.atan2(nw.w.y2-nw.w.y1,nw.w.x2-nw.w.x1);const o={id:newId(),type:tool,subtype:tool==='door'?doorSub:winSub,x:nw.p.x,y:nw.p.y,angle:ang,t:nw.w.t||defaultWallT,width:tool==='door'?(doorSub==='dupla'?1.4:doorSub==='incendio'?0.9:0.8):(winSub==='ampla'?2.0:1.2),hinge:-1,flip:1};state.openings.push(o);placeSelect('opening',o.id,'Adicionada — arraste as pontas ou digite a largura no painel.');}else setHint('Clique em cima de uma parede.');return;}
  if(tool==='furniture'){if(!pendingFurniture){setHint('Escolha um item na biblioteca.');return;}pushHistory();const sp=snapPoint(m.wx,m.wy);const f={id:newId(),kind:pendingFurniture[0],x:sp.x,y:sp.y,w:pendingFurniture[2],h:pendingFurniture[3],angle:0,label:pendingFurniture[1]};state.furniture.push(f);placeSelect('furniture',f.id,'Item adicionado — gire ou redimensione no painel da direita.');return;}
  if(tool==='text'){const txt=prompt('Texto:');if(txt){pushHistory();state.texts.push({id:newId(),x:snap(m.wx),y:snap(m.wy),text:txt,size:14});draw();afterChange();}return;}
  // SELECT
  if(tool==='select'&&e.shiftKey){const h=hitTest(m.wx,m.wy);if(h){toggleMulti(h);setHint(multiSel.length+' objetos selecionados. Clique direito para agrupar.');}draw();renderProps();return;}
  if(sel&&sel.kind==='furniture'){const f=state.furniture.find(o=>o.id===sel.id);if(f&&!f.locked){const rh=rotPos(f);if(Math.hypot(rh[0]-m.sx,rh[1]-m.sy)<10){pushHistory();drag={mode:'rotate',f};return;}}}
  if(sel&&sel.kind==='room'){const r=state.rooms.find(o=>o.id===sel.id);if(r&&!r.locked){const[x,y]=toScreen(r.x,r.y),w=r.w*scl(),h=r.h*scl();for(const cn of [[x,y,'tl'],[x+w,y,'tr'],[x,y+h,'bl'],[x+w,y+h,'br']])if(Math.hypot(cn[0]-m.sx,cn[1]-m.sy)<10){pushHistory();drag={mode:'roomresize',r,corner:cn[2]};return;}}}
  if(sel&&sel.kind==='floor'){const f=(state.floors||[]).find(o=>o.id===sel.id);if(f&&!f.locked){const[x,y]=toScreen(f.x,f.y),w=f.w*scl(),h=f.h*scl();for(const cn of [[x,y,'tl'],[x+w,y,'tr'],[x,y+h,'bl'],[x+w,y+h,'br']])if(Math.hypot(cn[0]-m.sx,cn[1]-m.sy)<10){pushHistory();drag={mode:'floorresize',f,corner:cn[2]};return;}}}
  if(sel&&sel.kind==='wall'){const w=state.walls.find(o=>o.id===sel.id);if(w&&!w.locked)for(const ep of ['1','2']){const px=w['x'+ep],py=w['y'+ep],[hx,hy]=toScreen(px,py);if(Math.hypot(hx-m.sx,hy-m.sy)<11){pushHistory();const group=e.altKey?[{w,ep}]:connectedEndpointRefs(w,ep),exc=new Set(group.map(g=>g.w.id));drag={mode:'wallpt',group,exc,solo:e.altKey||endpointDetached(w,ep)};return;}}}
  if(sel&&sel.kind==='measure'){const ms=(state.measures||[]).find(o=>o.id===sel.id);if(ms)for(const ep of ['1','2']){const[hx,hy]=toScreen(ms['x'+ep],ms['y'+ep]);if(Math.hypot(hx-m.sx,hy-m.sy)<11){pushHistory();drag={mode:'measurept',m:ms,ep};return;}}}
  if(sel&&sel.kind==='opening'){const o=state.openings.find(x=>x.id===sel.id);if(o&&!o.locked){const dx=Math.cos(o.angle),dy=Math.sin(o.angle);for(const sg of [-1,1]){const ex=o.x+sg*dx*o.width/2,ey=o.y+sg*dy*o.width/2,[hx,hy]=toScreen(ex,ey);if(Math.hypot(hx-m.sx,hy-m.sy)<11){pushHistory();drag={mode:'openresize',o,dx,dy,fixed:{x:o.x-sg*dx*o.width/2,y:o.y-sg*dy*o.width/2}};return;}}}}
  const hit=hitTest(m.wx,m.wy);
  if(hit){const g=findGroupForRef(hit);if(g){sel={kind:'group',id:g.id};multiSel=cleanRefs(g.items);}else selectOnly(hit);}else{sel=null;multiSel=[];}
  if(hit){const obj=ent(hit);if(obj&&obj.locked){setHint('Item travado. Destrave nas configurações para mover.');renderProps();draw();return;}pushHistory();
    if(hit.kind==='wall'){const w=ent(hit),members=[];for(const ep of ['1','2'])connectedEndpointRefs(w,ep).forEach(r=>members.push({w:r.w,ep:r.ep,ox:r.w['x'+r.ep],oy:r.w['y'+r.ep]}));drag={mode:'wallmove',start:{x:m.wx,y:m.wy},members};}
    else if(hit.kind==='measure'){const ms=ent(hit);drag={mode:'measuremove',m:ms,start:{x:m.wx,y:m.wy},orig:JSON.parse(JSON.stringify(ms))};}
    else drag={mode:'move',start:{x:m.wx,y:m.wy},kind:hit.kind,id:hit.id,orig:JSON.parse(JSON.stringify(ent(hit)))};}
  else {
    panning={x:e.clientX,y:e.clientY,px:panX,py:panY};
  }
  renderProps();draw();}

function placeSelect(kind,id,msg){sel={kind,id};multiSel=sel?[sel]:[];tool='select';pendingFurniture=null;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool==='select'));document.querySelectorAll('.libitem').forEach(x=>x.classList.remove('sel'));cc.clearRect(0,0,W,H);setHint(msg);draw();afterChange();renderProps();}
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
function createRoom(x,y,w,h,name){const r={id:newId(),x,y,w,h,name,color:ROOM_COLORS[state.rooms.length%ROOM_COLORS.length],material:'plain',t:defaultWallT,wallIds:[]};const cs=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],pairs=[[0,1],[1,2],[2,3],[3,0]];pairs.forEach(p=>{const a=cs[p[0]],b=cs[p[1]],wl={id:newId(),x1:a[0],y1:a[1],x2:b[0],y2:b[1],t:defaultWallT};state.walls.push(wl);r.wallIds.push(wl.id);});state.rooms.push(r);return r;}
function ent(s){const map={wall:state.walls,room:state.rooms,floor:state.floors||[],furniture:state.furniture,opening:state.openings,text:state.texts,measure:state.measures||[],group:state.groups||[]};return map[s.kind].find(o=>o.id===s.id);}
function onMove(e){const m=getMouse(e);mouseW={x:m.wx,y:m.wy};
  document.getElementById('coord').textContent=m.wx.toFixed(2).replace('.',',')+' m · '+m.wy.toFixed(2).replace('.',',')+' m';
  if(panning){panX=panning.px+(e.clientX-panning.x);panY=panning.py+(e.clientY-panning.y);draw();return;}
  if(drag){
    if(drag.mode==='move'){const e2=ent(drag),dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;
      if(drag.kind==='opening'){const nx=drag.orig.x+dx,ny=drag.orig.y+dy,nw=nearestWall(nx,ny);if(nw){e2.x=nw.p.x;e2.y=nw.p.y;e2.angle=Math.atan2(nw.w.y2-nw.w.y1,nw.w.x2-nw.w.x1);e2.t=nw.w.t||defaultWallT;}else{e2.x=nx;e2.y=ny;}}
      else if(drag.kind==='text'){e2.x=drag.orig.x+dx;e2.y=drag.orig.y+dy;}
      else{e2.x=snap(drag.orig.x+dx);e2.y=snap(drag.orig.y+dy);if(drag.kind==='room')syncRoomWalls(e2);}draw();}
    else if(drag.mode==='wallmove'){const dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;drag.members.forEach(mb=>{mb.w['x'+mb.ep]=snap(mb.ox+dx);mb.w['y'+mb.ep]=snap(mb.oy+dy);});refreshRoomBounds();draw();renderProps();}
    else if(drag.mode==='rotate'){drag.f.angle=Math.round((Math.atan2(m.wy-drag.f.y,m.wx-drag.f.x)+Math.PI/2)/(Math.PI/12))*(Math.PI/12);draw();renderProps();}
    else if(drag.mode==='wallpt'){const sp=drag.solo?gridPoint(m.wx,m.wy):snapPoint(m.wx,m.wy,drag.exc);drag.group.forEach(gp=>{gp.w['x'+gp.ep]=sp.x;gp.w['y'+gp.ep]=sp.y;});refreshRoomBounds();draw();renderProps();}
    else if(drag.mode==='measurept'){const sp=snapPoint(m.wx,m.wy);drag.m['x'+drag.ep]=sp.x;drag.m['y'+drag.ep]=sp.y;draw();renderProps();}
    else if(drag.mode==='measuremove'){const dx=snap(m.wx-drag.start.x),dy=snap(m.wy-drag.start.y);drag.m.x1=drag.orig.x1+dx;drag.m.y1=drag.orig.y1+dy;drag.m.x2=drag.orig.x2+dx;drag.m.y2=drag.orig.y2+dy;draw();renderProps();}
    else if(drag.mode==='multimove'){const dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;applyMoveRefs(drag.items,dx,dy);draw();renderProps();}
    else if(drag.mode==='roomresize'){const r=drag.r,sp=snapPoint(m.wx,m.wy),right=r.x+r.w,bottom=r.y+r.h;if(drag.corner.includes('l')){r.x=Math.min(sp.x,right-0.1);r.w=right-r.x;}else r.w=Math.max(0.1,sp.x-r.x);if(drag.corner.includes('t')){r.y=Math.min(sp.y,bottom-0.1);r.h=bottom-r.y;}else r.h=Math.max(0.1,sp.y-r.y);syncRoomWalls(r);draw();renderProps();}
    else if(drag.mode==='floorresize'){const f=drag.f,sp=snapPoint(m.wx,m.wy),right=f.x+f.w,bottom=f.y+f.h;if(drag.corner.includes('l')){f.x=Math.min(sp.x,right-0.1);f.w=right-f.x;}else f.w=Math.max(0.1,sp.x-f.x);if(drag.corner.includes('t')){f.y=Math.min(sp.y,bottom-0.1);f.h=bottom-f.y;}else f.h=Math.max(0.1,sp.y-f.y);draw();renderProps();}
    else if(drag.mode==='openresize'){const o=drag.o,t=(m.wx-drag.fixed.x)*drag.dx+(m.wy-drag.fixed.y)*drag.dy,lim=o.type==='door'?[0.6,3.0]:[0.4,4.0];let w=Math.max(lim[0],Math.min(lim[1],Math.abs(t)));const sg=Math.sign(t)||1,ex=drag.fixed.x+drag.dx*w*sg,ey=drag.fixed.y+drag.dy*w*sg;o.x=(drag.fixed.x+ex)/2;o.y=(drag.fixed.y+ey)/2;o.width=w;draw();renderProps();}
    else if(drag.mode==='measurelabel'){const dx=m.wx-drag.start.x,dy=m.wy-drag.start.y;drag.w.measureOffset=Math.max(-2,Math.min(2,drag.orig+dx*drag.nx+dy*drag.ny));draw();renderProps();}
    return;}
  drawCursor();if(tool==='wall'||tool==='room'||tool==='measure')draw();}

function onUp(){if(panning){panning=null;return;}if(drag){afterChange();drag=null;renderProps();return;}
  if(tool==='room'&&roomStart){const sp=snapPoint(mouseW.x,mouseW.y),x=Math.min(roomStart.x,sp.x),y=Math.min(roomStart.y,sp.y),w=Math.abs(sp.x-roomStart.x),h=Math.abs(sp.y-roomStart.y);roomStart=null;if(w>0.2&&h>0.2){pushHistory();const name=prompt('Nome do cômodo (ex.: Quarto, Cozinha):','')||'';const r=createRoom(x,y,w,h,name);placeSelect('room',r.id,'Cômodo criado com paredes e piso. Ajuste medidas/espessura no painel.');}else draw();}}

function onDbl(e){const m=getMouse(e);if(tool==='wall'){
  if(wallChain.length){
    let sp=materializeWallSnap(snapPoint(m.wx,m.wy));
    const last=wallChain[wallChain.length-1];
    if(Math.hypot(sp.x-last.x,sp.y-last.y)>0.03)wallChain.push({x:sp.x,y:sp.y});
  }
  finishWall();setTool('select');return;}const hit=hitTest(m.wx,m.wy);
  if(!hit){setTool('select');sel=null;draw();renderProps();return;}
  if(hit&&hit.kind==='wall'){const w=state.walls.find(o=>o.id===hit.id);const p=pseg(m.wx,m.wy,w.x1,w.y1,w.x2,w.y2);pushHistory();if(!splitWallAt(w,p))history.pop();return;}
  if(hit&&hit.kind==='room'){const r=state.rooms.find(o=>o.id===hit.id);const n=prompt('Nome do cômodo:',r.name||'');if(n!==null){pushHistory();r.name=n;draw();renderProps();}}
  else if(hit&&hit.kind==='text'){const t=state.texts.find(o=>o.id===hit.id);const n=prompt('Editar texto:',t.text);if(n!==null){pushHistory();t.text=n;draw();}}}

function finishWall(){if(wallChain.length>=2)for(let i=0;i<wallChain.length-1;i++)state.walls.push({id:newId(),x1:wallChain[i].x,y1:wallChain[i].y,x2:wallChain[i+1].x,y2:wallChain[i+1].y,t:defaultWallT});wallChain=[];draw();afterChange();}
function onWheel(e){e.preventDefault();hideCtx();const m=getMouse(e),f=e.deltaY<0?1.12:1/1.12,nz=Math.max(0.15,Math.min(8,zoom*f)),[wx,wy]=toWorld(m.sx,m.sy);zoom=nz;panX=m.sx-wx*scl();panY=m.sy-wy*scl();updateZoom();draw();}
function drawMagnetCue(sp){
  if(!sp||!sp.magnet)return;
  const[x,y]=toScreen(sp.x,sp.y),pulse=1+0.12*Math.sin(Date.now()/90);
  cc.save();
  cc.strokeStyle='rgba(224,138,60,.95)';cc.fillStyle='rgba(224,138,60,.16)';cc.lineWidth=2;
  cc.beginPath();cc.arc(x,y,12*pulse,0,7);cc.fill();cc.stroke();
  cc.strokeStyle='rgba(255,255,255,.95)';cc.lineWidth=1.5;
  cc.beginPath();cc.moveTo(x-9,y);cc.lineTo(x+9,y);cc.moveTo(x,y-9);cc.lineTo(x,y+9);cc.stroke();
  cc.fillStyle='#e08a3c';cc.strokeStyle='#fff';cc.lineWidth=1.5;
  cc.beginPath();cc.rect(x-4,y-4,8,8);cc.fill();cc.stroke();
  cc.restore();
}
function drawCursor(){cc.clearRect(0,0,W,H);
  if(tool==='door'||tool==='window'){const nw=nearestWall(mouseW.x,mouseW.y);if(nw){const[x,y]=toScreen(nw.p.x,nw.p.y);cc.strokeStyle='#e08a3c';cc.lineWidth=2;cc.beginPath();cc.arc(x,y,8,0,7);cc.stroke();}}
  if(tool==='wall'){
    const sp=snapPoint(mouseW.x,mouseW.y);
    if(snapOn||sp.magnet){const[x,y]=toScreen(sp.x,sp.y);cc.strokeStyle='#4a90c2';cc.lineWidth=1.5;cc.beginPath();cc.moveTo(x-7,y);cc.lineTo(x+7,y);cc.moveTo(x,y-7);cc.lineTo(x,y+7);cc.stroke();}
    drawMagnetCue(sp);
  }else if(snapOn&&(tool==='room'||tool==='measure')){const sp=snapPoint(mouseW.x,mouseW.y),[x,y]=toScreen(sp.x,sp.y);cc.strokeStyle='#4a90c2';cc.lineWidth=1.5;cc.beginPath();cc.moveTo(x-7,y);cc.lineTo(x+7,y);cc.moveTo(x,y-7);cc.lineTo(x,y+7);cc.stroke();}}
