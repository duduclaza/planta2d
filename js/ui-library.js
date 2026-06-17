"use strict";
//==================== UI BUILD ====================
const rail = document.getElementById('rail');
TOOLS.forEach(t=>{if(t[0]==='door'||t[0]==='room')rail.insertAdjacentHTML('beforeend','<div class="div"></div>');
  const b=document.createElement('button');b.className='tool';b.dataset.tool=t[0];
  b.innerHTML=`<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t[3]}</svg><span class="tip">${t[1]}<b>${t[2]}</b></span>`;
  b.onclick=()=>setTool(t[0]);rail.appendChild(b);});
rail.insertAdjacentHTML('beforeend','<div class="div"></div>');
[['Desfazer','Ctrl Z','<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7L3 9"/>',undo],['Refazer','Ctrl Y','<path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-7l3 3"/>',redo]].forEach(u=>{const b=document.createElement('button');b.className='tool';b.innerHTML=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${u[2]}</svg><span class="tip">${u[0]}<b>${u[1]}</b></span>`;b.onclick=()=>{u[3]();renderProps();};rail.appendChild(b);});

// Library — Construção
const CICON={porta_simples:'<path d="M4 21V4h10v17"/><path d="M14 13a8 8 0 0 0-8 8"/>',porta_dupla:'<path d="M12 21V4M4 21V8h8M20 21V8h-8"/>',porta_correr:'<rect x="3" y="9" width="18" height="6"/><path d="M12 9v6"/>',janela:'<rect x="4" y="6" width="16" height="12"/><path d="M12 6v12M4 12h16"/>',janela_ampla:'<rect x="2" y="7" width="20" height="10"/><path d="M8 7v10M16 7v10"/>',pilar:'<rect x="7" y="7" width="10" height="10"/><path d="M7 7l10 10M17 7L7 17"/>',escada:'<rect x="7" y="3" width="10" height="18"/><path d="M7 8h10M7 13h10M7 18h10"/>'};
function buildConstr(){const el=document.getElementById('libConstr');
  el.innerHTML=`<div class="secttl">Parede — espessura</div>
    <div class="thickrow" id="thickRow">${[10,15,20].map(v=>`<button data-v="${v}" class="${Math.round(defaultWallT*100)===v?'sel':''}">${v} cm</button>`).join('')}</div>
    <div class="customthick">Outra: <input type="number" id="thickCustom" value="${Math.round(defaultWallT*100)}" min="5" max="50"> cm</div>
    <div class="secttl">Portas</div><div class="grid2" id="cDoors"></div>
    <div class="secttl">Janelas</div><div class="grid2" id="cWins"></div>
    <div class="secttl">Estrutura</div><div class="grid2" id="cStruct"></div>`;
  const doors=[['porta_simples','Porta simples',()=>{setTool('door');doorSub='simples';markLib('porta_simples');}],
    ['porta_dupla','Porta dupla',()=>{setTool('door');doorSub='dupla';markLib('porta_dupla');}],
    ['porta_correr','Porta de correr',()=>{setTool('door');doorSub='correr';markLib('porta_correr');}]];
  const wins=[['janela','Janela',()=>{setTool('window');winSub='simples';markLib('janela');}],
    ['janela_ampla','Janela ampla',()=>{setTool('window');winSub='ampla';markLib('janela_ampla');}]];
  const struct=[['pilar','Pilar',()=>{setTool('furniture');pendingFurniture=['pilar','Pilar',0.3,0.3];markLib('pilar');}],
    ['escada','Escada',()=>{setTool('furniture');pendingFurniture=['escada','Escada',1.0,2.6];markLib('escada');}]];
  const mk=(list,container)=>list.forEach(it=>{const d=document.createElement('div');d.className='libitem';d.dataset.lib=it[0];
    d.innerHTML=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CICON[it[0]]}</svg><div class="nm">${it[1]}</div>`;
    d.onclick=it[2];document.getElementById(container).appendChild(d);});
  mk(doors,'cDoors');mk(wins,'cWins');mk(struct,'cStruct');
  document.querySelectorAll('#thickRow button').forEach(b=>b.onclick=()=>{defaultWallT=(+b.dataset.v)/100;document.getElementById('thickCustom').value=b.dataset.v;syncThickBtns();setTool('wall');});
  document.getElementById('thickCustom').oninput=e=>{const v=Math.max(5,Math.min(50,+e.target.value||15));defaultWallT=v/100;syncThickBtns();};
}
function syncThickBtns(){const v=Math.round(defaultWallT*100);document.querySelectorAll('#thickRow button').forEach(b=>b.classList.toggle('sel',+b.dataset.v===v));const ci=document.getElementById('thickCustom');if(ci&&document.activeElement!==ci)ci.value=v;}
function markLib(id){document.querySelectorAll('.libitem').forEach(x=>x.classList.toggle('sel',x.dataset.lib===id));}

// Library — Móveis
const LIBICON_BOX=64; // tamanho (px CSS) da prévia de cada item — ícone real desenhado com drawFurnitureShape
function drawLibIcon(canvas,kind,realW,realH){
  const dpr=window.devicePixelRatio||1,box=LIBICON_BOX,pad=10,avail=box-pad*2;
  canvas.width=box*dpr;canvas.height=box*dpr;canvas.style.width=box+'px';canvas.style.height=box+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box,box);
  const s=avail/Math.max(realW,realH);
  ctx.save();ctx.translate(box/2,box/2);
  drawFurnitureShape(ctx,kind,realW*s,realH*s,1.3);
  ctx.restore();
}
function buildFurni(){const el=document.getElementById('libFurni');let html='';
  FURNI.forEach(([grp,items])=>{html+=`<div class="secttl">${grp}</div><div class="grid2">`;
    items.forEach(it=>{html+=`<div class="libitem" data-furni="${it[0]}"><canvas class="libicon"></canvas><div class="nm">${it[1]}</div><div class="dm">${it[2].toFixed(2).replace('.',',')}×${it[3].toFixed(2).replace('.',',')}</div></div>`;});
    html+='</div>';});
  el.innerHTML=html;
  const flat={};FURNI.forEach(([,items])=>items.forEach(it=>flat[it[0]]=it));
  el.querySelectorAll('.libitem').forEach(d=>{const it=flat[d.dataset.furni];drawLibIcon(d.querySelector('canvas.libicon'),it[0],it[2],it[3]);
    d.onclick=()=>{pendingFurniture=it;setTool('furniture');markLib2(d.dataset.furni);setHint('Clique no desenho pra soltar: '+pendingFurniture[1]);};});
}
function markLib2(id){document.querySelectorAll('#libFurni .libitem').forEach(x=>x.classList.toggle('sel',x.dataset.furni===id));}

// Library tabs + collapse
document.querySelectorAll('.libtab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.libtab').forEach(x=>x.classList.toggle('active',x===t));const f=t.dataset.tab==='furni';document.getElementById('libConstr').style.display=f?'none':'block';document.getElementById('libFurni').style.display=f?'block':'none';});
document.getElementById('collapseBtn').onclick=()=>{const l=document.getElementById('lib');l.classList.toggle('collapsed');setTimeout(resize,210);};

const HINTS={select:'Clique pra selecionar e arrastar. As medidas aparecem no painel da direita.',wall:'Clique cada canto. Enter ou duplo-clique finaliza. Espessura na aba Construção.',door:'Clique em cima de uma parede. Ajuste largura/abertura no painel.',window:'Clique em cima de uma parede. Ajuste a largura no painel.',room:'Arraste pra criar e nomear o cômodo. Mostra a área automática.',text:'Clique onde quer escrever.',measure:'Clique em dois pontos pra medir.',furniture:'Clique no desenho pra soltar o item escolhido.'};
function setTool(id){tool=id;sel=null;wallChain=[];measureA=null;roomStart=null;
  document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===id));
  if(id!=='furniture'&&id!=='door'&&id!=='window'){document.querySelectorAll('.libitem').forEach(x=>x.classList.remove('sel'));pendingFurniture=null;}
  setHint(HINTS[id]||'');cc.clearRect(0,0,W,H);renderProps();draw();}
function setHint(t){document.getElementById('hint').textContent=t;}
