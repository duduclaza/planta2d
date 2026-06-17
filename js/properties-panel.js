"use strict";
//==================== PROPERTIES PANEL ====================
const propsEl = document.getElementById('props');
function pHead(icon,title){return `<div class="ph"><span class="pico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span><span class="ptitle">${title}</span><button class="pcollapse" id="pCollapse" title="Recolher / expandir"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></button></div>`;}
let propsCollapsed=false;
function applyCollapse(){propsEl.classList.toggle('collapsed',propsCollapsed);const b=document.getElementById('pCollapse');if(b)b.onclick=()=>{propsCollapsed=!propsCollapsed;applyCollapse();};}
function renderProps(){renderPropsInner();applyCollapse();}
function renderPropsInner(){
  if(!sel){ // document settings
    propsEl.innerHTML=pHead('<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/>','Configurações')+
      `<div class="pbody">
        <div class="prow"><label>Espessura padrão da parede</label><div class="unit" data-u="cm"><input type="number" id="ppDefT" value="${Math.round(defaultWallT*100)}" min="5" max="50" step="1"></div></div>
        <div class="prow"><label>Tamanho da grade</label><div class="segbtns" id="ppGrid">
          ${[0.1,0.25,0.5].map(v=>`<button data-v="${v}" class="${gridStep===v?'sel':''}">${v.toString().replace('.',',')} m</button>`).join('')}
        </div></div>
        <div class="prow"><div class="pmeta">Dica: selecione qualquer parede, porta, janela, cômodo ou móvel para editar as medidas aqui.</div></div>
      </div>`;
    document.getElementById('ppDefT').oninput=e=>{defaultWallT=Math.max(0.05,(+e.target.value||15)/100);syncThickBtns();draw();};
    document.querySelectorAll('#ppGrid button').forEach(b=>b.onclick=()=>{gridStep=+b.dataset.v;renderProps();});
    return;}
  const o=ent(sel);if(!o){sel=null;renderProps();return;}
  if(sel.kind==='wall'){const len=Math.hypot(o.x2-o.x1,o.y2-o.y1);
    propsEl.innerHTML=pHead('<path d="M3 21v-6l9-9 9 9v6"/>','Parede')+`<div class="pbody">
      <div class="two"><div class="prow"><label>Comprimento</label><div class="unit" data-u="m"><input type="number" id="wLen" value="${len.toFixed(2)}" min="0.1" step="0.05"></div></div>
      <div class="prow"><label>Espessura</label><div class="unit" data-u="cm"><input type="number" id="wT" value="${Math.round((o.t||defaultWallT)*100)}" min="5" step="1"></div></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar parede</button></div></div>`;
    document.getElementById('wT').oninput=e=>{pushHistory();o.t=Math.max(0.05,(+e.target.value||15)/100);draw();};
    document.getElementById('wLen').oninput=e=>{pushHistory();const nl=Math.max(0.1,+e.target.value||0.1),a=Math.atan2(o.y2-o.y1,o.x2-o.x1);o.x2=o.x1+Math.cos(a)*nl;o.y2=o.y1+Math.sin(a)*nl;draw();};
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
      <div class="prow"><label>Cor</label><div class="swatch" id="rColor">${ROOM_COLORS.map(col=>`<span data-c="${col}" class="${o.color===col?'sel':''}" style="background:${col}"></span>`).join('')}</div></div>
      <div class="prow"><div class="pmeta">Área: <b style="color:var(--accent)">${fmtA(o.w*o.h)}</b></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar cômodo</button></div></div>`;
    document.getElementById('rName').oninput=e=>{o.name=e.target.value;draw();};
    document.getElementById('rW').oninput=e=>{pushHistory();o.w=Math.max(0.5,+e.target.value||1);syncRoomWalls(o);draw();renderProps();};
    document.getElementById('rH').oninput=e=>{pushHistory();o.h=Math.max(0.5,+e.target.value||1);syncRoomWalls(o);draw();renderProps();};
    {const rt=document.getElementById('rT');if(rt)rt.oninput=e=>{pushHistory();o.t=Math.max(0.05,(+e.target.value||15)/100);syncRoomWalls(o);draw();};}
    document.querySelectorAll('#rColor span').forEach(s=>s.onclick=()=>{pushHistory();o.color=s.dataset.c;draw();renderProps();});
  } else if(sel.kind==='furniture'){
    propsEl.innerHTML=pHead('<rect x="3" y="11" width="18" height="7" rx="1"/><path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>',o.label||'Móvel')+`<div class="pbody">
      <div class="two"><div class="prow"><label>Largura</label><div class="unit" data-u="m"><input type="number" id="fW" value="${o.w.toFixed(2)}" min="0.1" step="0.05"></div></div>
      <div class="prow"><label>Profundidade</label><div class="unit" data-u="m"><input type="number" id="fH" value="${o.h.toFixed(2)}" min="0.1" step="0.05"></div></div></div>
      <div class="prow"><label>Rotação</label><div class="unit" data-u="°"><input type="number" id="fA" value="${Math.round((o.angle||0)*180/Math.PI)}" step="15"></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar</button></div></div>`;
    document.getElementById('fW').oninput=e=>{pushHistory();o.w=Math.max(0.1,+e.target.value||0.5);draw();};
    document.getElementById('fH').oninput=e=>{pushHistory();o.h=Math.max(0.1,+e.target.value||0.5);draw();};
    document.getElementById('fA').oninput=e=>{pushHistory();o.angle=(+e.target.value||0)*Math.PI/180;draw();};
  } else if(sel.kind==='text'){
    propsEl.innerHTML=pHead('<path d="M4 7V5h16v2M9 5v14M9 19h6"/>','Texto')+`<div class="pbody">
      <div class="prow"><label>Conteúdo</label><input type="text" id="tT" value="${(o.text||'').replace(/"/g,'&quot;')}"></div>
      <div class="prow"><label>Tamanho</label><div class="unit" data-u="px"><input type="number" id="tS" value="${o.size||14}" min="8" step="1"></div></div>
      <div class="prow"><button class="delbtn" id="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> Apagar texto</button></div></div>`;
    document.getElementById('tT').oninput=e=>{o.text=e.target.value;draw();};
    document.getElementById('tS').oninput=e=>{pushHistory();o.size=Math.max(8,+e.target.value||14);draw();};
  }
  const del=document.getElementById('del');if(del)del.onclick=()=>{pushHistory();deleteSel();};
}
function deleteSel(){if(sel.kind==='room'){const r=state.rooms.find(o=>o.id===sel.id);if(r&&r.wallIds)state.walls=state.walls.filter(w=>!r.wallIds.includes(w.id));}const map={wall:'walls',room:'rooms',furniture:'furniture',opening:'openings',text:'texts'};state[map[sel.kind]]=state[map[sel.kind]].filter(o=>o.id!==sel.id);sel=null;draw();afterChange();renderProps();}
