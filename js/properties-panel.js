"use strict";
//==================== PROPERTIES PANEL ====================
const propsEl = document.getElementById('props');
function pHead(icon,title){return `<div class="ph"><span class="pico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span><span class="ptitle">${title}</span><button class="pcollapse" id="pCollapse" title="Recolher / expandir"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></button></div>`;}
let propsCollapsed=false;
let propsTempVisible=false;
function showPropsTemporarily(){propsTempVisible=true;propsEl.classList.remove('hidden');}
function setPropsMode(mode){propsMode=mode;localStorage.setItem('planta2d:propsMode',mode);if(mode!=='hidden')propsTempVisible=false;applyCollapse();}
function applyCollapse(){
  const isHidden=(propsMode==='hidden'&&!propsTempVisible)||(propsMode==='auto'&&!sel&&!propsTempVisible);
  propsEl.classList.toggle('collapsed',propsCollapsed);
  propsEl.classList.toggle('pinned',propsMode==='pinned');
  propsEl.classList.toggle('auto',propsMode==='auto');
  propsEl.classList.toggle('hidden',isHidden);
  const showBtn=document.getElementById('propsShowBtn');
  if(showBtn){showBtn.classList.toggle('show',propsMode==='hidden'&&!propsTempVisible);showBtn.onclick=()=>{setPropsMode('pinned');renderProps();draw();};}
  const b=document.getElementById('pCollapse');if(b)b.onclick=()=>{propsCollapsed=!propsCollapsed;applyCollapse();};
}
function renderProps(){if(propsMode==='auto'&&!sel)propsTempVisible=false;renderPropsInner();applyCollapse();}
function renderPropsInner(){
  if(!sel){ // document settings
    propsEl.innerHTML=pHead('<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/>','Configurações')+
      `<div class="pbody">
        <div class="prow"><label>Espessura padrão da parede</label><div class="unit" data-u="cm"><input type="number" id="ppDefT" value="${Math.round(defaultWallT*100)}" min="5" max="50" step="1"></div></div>
        <div class="prow"><label>Tamanho da grade</label><div class="segbtns" id="ppGrid">
          ${[0.1,0.25,0.5].map(v=>`<button data-v="${v}" class="${gridStep===v?'sel':''}">${v.toString().replace('.',',')} m</button>`).join('')}
        </div></div>
        <div class="prow"><label>Painel</label><div class="segbtns" id="ppPanel">
          ${[['pinned','Fixo'],['auto','Auto'],['hidden','Oculto']].map(v=>`<button data-v="${v[0]}" class="${propsMode===v[0]?'sel':''}">${v[1]}</button>`).join('')}
        </div></div>
        <div class="prow"><label>Medidas</label><div class="segbtns" id="ppMeasures">
          <button data-v="1" class="${showMeasures?'sel':''}">Mostrar</button><button data-v="0" class="${!showMeasures?'sel':''}">Ocultar</button>
        </div></div>
        <div class="prow"><div class="pmeta">Dica: selecione qualquer parede, porta, janela, cômodo ou móvel para editar as medidas aqui.</div></div>
      </div>`;
    document.getElementById('ppDefT').oninput=e=>{defaultWallT=Math.max(0.05,(+e.target.value||15)/100);syncThickBtns();draw();};
    document.querySelectorAll('#ppGrid button').forEach(b=>b.onclick=()=>{gridStep=+b.dataset.v;renderProps();});
    document.querySelectorAll('#ppPanel button').forEach(b=>b.onclick=()=>{setPropsMode(b.dataset.v);renderProps();});
    document.querySelectorAll('#ppMeasures button').forEach(b=>b.onclick=()=>{showMeasures=b.dataset.v==='1';localStorage.setItem('planta2d:showMeasures',showMeasures?'1':'0');const chk=document.getElementById('measureChk');if(chk)chk.checked=showMeasures;draw();renderProps();});
    return;}
  const o=ent(sel);if(!o){sel=null;renderProps();return;}
  if(sel.kind==='wall'){const len=Math.hypot(o.x2-o.x1,o.y2-o.y1);
    propsEl.innerHTML=pHead('<path d="M3 21v-6l9-9 9 9v6"/>','Parede')+`<div class="pbody">
      <div class="two"><div class="prow"><label>Comprimento</label><div class="unit" data-u="m"><input type="number" id="wLen" value="${len.toFixed(2)}" min="0.1" step="0.05"></div></div>
      <div class="prow"><label>Espessura</label><div class="unit" data-u="cm"><input type="number" id="wT" value="${Math.round((o.t||defaultWallT)*100)}" min="5" step="1"></div></div></div>
      <div class="prow"><label>Trava</label><div class="segbtns" id="wLock"><button data-v="0" class="${!o.locked?'sel':''}">Livre</button><button data-v="1" class="${o.locked?'sel':''}">Travada</button></div></div>
      <div class="two"><div class="prow"><label>Medida</label><div class="segbtns" id="wMeasure"><button data-v="1" class="${!o.measureHidden?'sel':''}">Ver</button><button data-v="0" class="${o.measureHidden?'sel':''}">Ocultar</button></div></div>
      <div class="prow"><label>Posição</label><div class="unit" data-u="m"><input type="number" id="wMeasureOffset" value="${(o.measureOffset??((o.t||defaultWallT)/2+0.18)).toFixed(2)}" step="0.05"></div></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar parede</button></div></div>`;
    document.getElementById('wT').oninput=e=>{pushHistory();o.t=Math.max(0.05,(+e.target.value||15)/100);draw();};
    document.getElementById('wLen').oninput=e=>{pushHistory();const nl=Math.max(0.1,+e.target.value||0.1),a=Math.atan2(o.y2-o.y1,o.x2-o.x1);moveWallEndpointGroup(o,'2',o.x1+Math.cos(a)*nl,o.y1+Math.sin(a)*nl);refreshRoomBounds();draw();renderProps();};
    document.querySelectorAll('#wLock button').forEach(b=>b.onclick=()=>{pushHistory();o.locked=b.dataset.v==='1';draw();renderProps();});
    document.querySelectorAll('#wMeasure button').forEach(b=>b.onclick=()=>{pushHistory();o.measureHidden=b.dataset.v==='0';draw();renderProps();});
    document.getElementById('wMeasureOffset').oninput=e=>{o.measureOffset=+e.target.value||0;draw();};
  } else if(sel.kind==='measure'){const len=Math.hypot(o.x2-o.x1,o.y2-o.y1);
    propsEl.innerHTML=pHead('<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v3M15 8v3M19 8v3"/>','Medida')+`<div class="pbody">
      <div class="prow"><div class="pmeta">Comprimento: <b style="color:var(--accent)">${fmt(len)}</b></div></div>
      <div class="two"><div class="prow"><label>X inicial</label><div class="unit" data-u="m"><input type="number" id="mX1" value="${o.x1.toFixed(2)}" step="0.05"></div></div>
      <div class="prow"><label>Y inicial</label><div class="unit" data-u="m"><input type="number" id="mY1" value="${o.y1.toFixed(2)}" step="0.05"></div></div></div>
      <div class="two"><div class="prow"><label>X final</label><div class="unit" data-u="m"><input type="number" id="mX2" value="${o.x2.toFixed(2)}" step="0.05"></div></div>
      <div class="prow"><label>Y final</label><div class="unit" data-u="m"><input type="number" id="mY2" value="${o.y2.toFixed(2)}" step="0.05"></div></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar medida</button></div></div>`;
    ['X1','Y1','X2','Y2'].forEach(k=>{document.getElementById('m'+k).oninput=e=>{o[k.toLowerCase()]=+e.target.value||0;draw();};});
  } else if(sel.kind==='group'){
    propsEl.innerHTML=pHead('<rect x="4" y="4" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>','Grupo')+`<div class="pbody">
      <div class="prow"><div class="pmeta"><b>${(o.items||[]).length}</b> objetos agrupados</div></div>
      <div class="prow"><button class="hbtn" id="ungroupBtn" style="width:100%;justify-content:center">Desagrupar</button></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar grupo</button></div></div>`;
    document.getElementById('ungroupBtn').onclick=()=>{pushHistory();ungroupSelection();};
  } else if(sel.kind==='opening'){const isDoor=o.type==='door';
    propsEl.innerHTML=pHead(isDoor?'<path d="M4 21V4h10v17"/><path d="M14 13a8 8 0 0 0-8 8"/>':'<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>',isDoor?'Porta':'Janela')+`<div class="pbody">
      <div class="prow"><label>Largura (${isDoor?'60–300':'40–400'} cm)</label><div class="unit" data-u="cm"><input type="number" id="oW" value="${Math.round(o.width*100)}" min="${isDoor?60:40}" max="${isDoor?300:400}" step="5"></div></div>
      ${isDoor?`<div class="prow"><label>Tipo</label><div class="segbtns" id="oSub">${[['simples','Simples'],['dupla','Dupla'],['correr','Correr']].map(s=>`<button data-v="${s[0]}" class="${o.subtype===s[0]?'sel':''}">${s[1]}</button>`).join('')}</div></div>
      <div class="two"><div class="prow"><label>Dobradiça</label><div class="segbtns" id="oHinge"><button data-v="-1" class="${o.hinge===-1?'sel':''}">Esq.</button><button data-v="1" class="${o.hinge===1?'sel':''}">Dir.</button></div></div>
      <div class="prow"><label>Abre p/</label><div class="segbtns" id="oFlip"><button data-v="1" class="${(o.flip||1)===1?'sel':''}">Baixo</button><button data-v="-1" class="${o.flip===-1?'sel':''}">Cima</button></div></div></div>`:''}
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar</button></div></div>`;
    const lim=isDoor?[0.6,3.0]:[0.4,4.0],oWEl=document.getElementById('oW');
    oWEl.oninput=e=>{const v=(+e.target.value)/100;if(v>0.05){o.width=v;draw();}};
    oWEl.onchange=e=>{pushHistory();o.width=Math.max(lim[0],Math.min(lim[1],(+e.target.value||80)/100));draw();renderProps();};
    document.querySelectorAll('#oSub button').forEach(b=>b.onclick=()=>{pushHistory();o.subtype=b.dataset.v;if(b.dataset.v==='dupla'&&o.width<1.2)o.width=1.4;draw();renderProps();});
    document.querySelectorAll('#oHinge button').forEach(b=>b.onclick=()=>{pushHistory();o.hinge=+b.dataset.v;draw();renderProps();});
    document.querySelectorAll('#oFlip button').forEach(b=>b.onclick=()=>{pushHistory();o.flip=+b.dataset.v;draw();renderProps();});
  } else if(sel.kind==='room'){
    propsEl.innerHTML=pHead('<rect x="3" y="3" width="18" height="18" rx="1"/>','Cômodo')+`<div class="pbody">
      <div class="prow"><label>Nome</label><input type="text" id="rName" value="${(o.name||'').replace(/"/g,'&quot;')}" placeholder="Ex.: Cozinha"></div>
      <div class="two"><div class="prow"><label>Largura</label><div class="unit" data-u="m"><input type="number" id="rW" value="${o.w.toFixed(2)}" min="0.5" step="0.1"></div></div>
      <div class="prow"><label>Profundidade</label><div class="unit" data-u="m"><input type="number" id="rH" value="${o.h.toFixed(2)}" min="0.5" step="0.1"></div></div></div>
      ${o.wallIds?`<div class="prow"><label>Espessura das paredes</label><div class="unit" data-u="cm"><input type="number" id="rT" value="${Math.round((o.t||defaultWallT)*100)}" min="5" step="1"></div></div>`:''}
      <div class="prow"><label>Trava</label><div class="segbtns" id="rLock"><button data-v="0" class="${!o.locked?'sel':''}">Livre</button><button data-v="1" class="${o.locked?'sel':''}">Travado</button></div></div>
      <div class="prow"><label>Piso</label><div class="segbtns wrap" id="rMaterial">${FLOOR_MATERIALS.map(m=>`<button data-v="${m[0]}" class="${(o.material||'plain')===m[0]?'sel':''}">${m[1]}</button>`).join('')}</div></div>
      <div class="prow"><label>Cor</label><div class="swatch" id="rColor">${ROOM_COLORS.map(col=>`<span data-c="${col}" class="${o.color===col?'sel':''}" style="background:${col}"></span>`).join('')}</div></div>
      <div class="prow"><div class="pmeta">Área: <b style="color:var(--accent)">${fmtA(o.w*o.h)}</b></div></div>
      <div class="prow"><button class="hbtn" id="dupRoom" style="width:100%;justify-content:center">Duplicar cômodo</button></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar cômodo</button></div></div>`;
    document.getElementById('rName').oninput=e=>{o.name=e.target.value;draw();};
    document.getElementById('rW').oninput=e=>{pushHistory();o.w=Math.max(0.5,+e.target.value||1);syncRoomWalls(o);draw();renderProps();};
    document.getElementById('rH').oninput=e=>{pushHistory();o.h=Math.max(0.5,+e.target.value||1);syncRoomWalls(o);draw();renderProps();};
    {const rt=document.getElementById('rT');if(rt)rt.oninput=e=>{pushHistory();o.t=Math.max(0.05,(+e.target.value||15)/100);syncRoomWalls(o);draw();};}
    document.querySelectorAll('#rLock button').forEach(b=>b.onclick=()=>{pushHistory();o.locked=b.dataset.v==='1';draw();renderProps();});
    document.querySelectorAll('#rMaterial button').forEach(b=>b.onclick=()=>{pushHistory();const m=materialInfo(b.dataset.v);o.material=m[0];o.tileSize=o.tileSize||m[3]||0.6;draw();renderProps();});
    document.querySelectorAll('#rColor span').forEach(s=>s.onclick=()=>{pushHistory();o.color=s.dataset.c;draw();renderProps();});
    document.getElementById('dupRoom').onclick=()=>duplicateSelection(sel);
  } else if(sel.kind==='floor'){
    propsEl.innerHTML=pHead('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v16"/>',o.label||'Piso')+`<div class="pbody">
      <div class="two"><div class="prow"><label>Largura</label><div class="unit" data-u="m"><input type="number" id="flW" value="${o.w.toFixed(2)}" min="0.1" step="0.1"></div></div>
      <div class="prow"><label>Profundidade</label><div class="unit" data-u="m"><input type="number" id="flH" value="${o.h.toFixed(2)}" min="0.1" step="0.1"></div></div></div>
      <div class="prow"><label>Material</label><div class="segbtns wrap" id="flMaterial">${FLOOR_MATERIALS.map(m=>`<button data-v="${m[0]}" class="${(o.material||'plain')===m[0]?'sel':''}">${m[1]}</button>`).join('')}</div></div>
      <div class="prow"><label>Tamanho do desenho</label><div class="unit" data-u="m"><input type="number" id="flTile" value="${(o.tileSize||materialInfo(o.material)[3]||0.6).toFixed(2)}" min="0.1" max="5" step="0.05"></div></div>
      <div class="prow"><label>Trava</label><div class="segbtns" id="flLock"><button data-v="0" class="${!o.locked?'sel':''}">Livre</button><button data-v="1" class="${o.locked?'sel':''}">Travado</button></div></div>
      <div class="prow"><button class="hbtn" id="dupFloor" style="width:100%;justify-content:center">Duplicar piso</button></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar piso</button></div></div>`;
    document.getElementById('flW').oninput=e=>{o.w=Math.max(0.1,+e.target.value||1);draw();};
    document.getElementById('flH').oninput=e=>{o.h=Math.max(0.1,+e.target.value||1);draw();};
    document.getElementById('flTile').oninput=e=>{o.tileSize=Math.max(0.1,Math.min(5,+e.target.value||0.6));draw();};
    document.querySelectorAll('#flMaterial button').forEach(b=>b.onclick=()=>{pushHistory();const m=materialInfo(b.dataset.v);o.material=m[0];o.color=m[2];o.label=m[1];o.tileSize=m[3]||o.tileSize||0.6;draw();renderProps();});
    document.querySelectorAll('#flLock button').forEach(b=>b.onclick=()=>{pushHistory();o.locked=b.dataset.v==='1';draw();renderProps();});
    document.getElementById('dupFloor').onclick=()=>duplicateSelection(sel);
  } else if(sel.kind==='furniture'){
    propsEl.innerHTML=pHead('<rect x="3" y="11" width="18" height="7" rx="1"/><path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>',o.label||'Móvel')+`<div class="pbody">
      <div class="two"><div class="prow"><label>Largura</label><div class="unit" data-u="m"><input type="number" id="fW" value="${o.w.toFixed(2)}" min="0.1" step="0.05"></div></div>
      <div class="prow"><label>Profundidade</label><div class="unit" data-u="m"><input type="number" id="fH" value="${o.h.toFixed(2)}" min="0.1" step="0.05"></div></div></div>
      <div class="prow"><label>Rotação</label><div class="unit" data-u="°"><input type="number" id="fA" value="${Math.round((o.angle||0)*180/Math.PI)}" step="15"></div></div>
      <div class="prow"><label>Trava</label><div class="segbtns" id="fLock"><button data-v="0" class="${!o.locked?'sel':''}">Livre</button><button data-v="1" class="${o.locked?'sel':''}">Travado</button></div></div>
      <div class="prow"><button class="hbtn" id="dupFurniture" style="width:100%;justify-content:center">Duplicar móvel</button></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar</button></div></div>`;
    document.getElementById('fW').oninput=e=>{pushHistory();o.w=Math.max(0.1,+e.target.value||0.5);draw();};
    document.getElementById('fH').oninput=e=>{pushHistory();o.h=Math.max(0.1,+e.target.value||0.5);draw();};
    document.getElementById('fA').oninput=e=>{pushHistory();o.angle=(+e.target.value||0)*Math.PI/180;draw();};
    document.querySelectorAll('#fLock button').forEach(b=>b.onclick=()=>{pushHistory();o.locked=b.dataset.v==='1';draw();renderProps();});
    document.getElementById('dupFurniture').onclick=()=>duplicateSelection(sel);
  } else if(sel.kind==='text'){
    propsEl.innerHTML=pHead('<path d="M4 7V5h16v2M9 5v14M9 19h6"/>','Texto')+`<div class="pbody">
      <div class="prow"><label>Conteúdo</label><input type="text" id="tT" value="${(o.text||'').replace(/"/g,'&quot;')}"></div>
      <div class="two"><div class="prow"><label>Tamanho</label><div class="unit" data-u="px"><input type="number" id="tS" value="${o.size||14}" min="8" step="1"></div></div>
      <div class="prow"><label>Rotação</label><div class="unit" data-u="°"><input type="number" id="tA" value="${Math.round((o.angle||0)*180/Math.PI)}" step="15"></div></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar texto</button></div></div>`;
    document.getElementById('tT').oninput=e=>{o.text=e.target.value;draw();};
    document.getElementById('tS').oninput=e=>{pushHistory();o.size=Math.max(8,+e.target.value||14);draw();};
    document.getElementById('tA').oninput=e=>{pushHistory();o.angle=(+e.target.value||0)*Math.PI/180;draw();};
  }
  const del=document.getElementById('del');if(del)del.onclick=()=>{pushHistory();deleteSel();};
}
function deleteSel(){if(typeof deleteCurrentSelection==='function'){deleteCurrentSelection();return;}if(sel.kind==='room'){const r=state.rooms.find(o=>o.id===sel.id);if(r&&r.wallIds)state.walls=state.walls.filter(w=>!r.wallIds.includes(w.id));}const map={wall:'walls',room:'rooms',floor:'floors',furniture:'furniture',opening:'openings',text:'texts',measure:'measures'};state[map[sel.kind]]=state[map[sel.kind]].filter(o=>o.id!==sel.id);sel=null;draw();afterChange();renderProps();}
