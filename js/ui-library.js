"use strict";
//==================== UI BUILD ====================
const rail = document.getElementById('rail');
const RAIL_TOOLS = TOOLS.filter(t=>['select','text','measure'].includes(t[0]));
RAIL_TOOLS.forEach(t=>{
  const b=document.createElement('button');b.className='tool';b.dataset.tool=t[0];
  b.innerHTML=`<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t[3]}</svg><span class="tip">${t[1]}<b>${t[2]}</b></span>`;
  b.onclick=()=>setTool(t[0]);rail.appendChild(b);
});
rail.insertAdjacentHTML('beforeend','<div class="div"></div>');
[['Desfazer','Ctrl Z','<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7L3 9"/>',undo],['Refazer','Ctrl Y','<path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-7l3 3"/>',redo]].forEach(u=>{const b=document.createElement('button');b.className='tool';b.innerHTML=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${u[2]}</svg><span class="tip">${u[0]}<b>${u[1]}</b></span>`;b.onclick=()=>{u[3]();renderProps();};rail.appendChild(b);});

const CICON={
  wall:'<path d="M3 20h18"/><path d="M5 20V8l4-3 4 3v12"/><path d="M13 10h6v10"/>',
  room:'<rect x="4" y="4" width="16" height="16"/><path d="M4 10h16M10 4v16"/>',
  viga:'<rect x="3" y="9" width="18" height="6"/><path d="M6 9v6M12 9v6M18 9v6"/>',
  porta_simples:'<path d="M4 21V4h10v17"/><path d="M14 13a8 8 0 0 0-8 8"/>',
  porta_dupla:'<path d="M12 21V4M4 21V8h8M20 21V8h-8"/>',
  porta_correr:'<rect x="3" y="9" width="18" height="6"/><path d="M12 9v6"/>',
  porta_incendio:'<path d="M4 21V4h8v17"/><path d="M12 13a6 6 0 0 0-6 6"/><path d="M17 8c1 1.6 1 2.6 0 3.6-1-1-1.6-.6-1.6.4 0 1.2 1 1.8 1.8 1.8 1.6 0 2.8-1.4 2.8-3 0-2.4-2-4-3-5.8z"/>',
  janela:'<rect x="4" y="6" width="16" height="12"/><path d="M12 6v12M4 12h16"/>',
  janela_ampla:'<rect x="2" y="7" width="20" height="10"/><path d="M8 7v10M16 7v10"/>',
  pilar:'<rect x="7" y="7" width="10" height="10"/><path d="M7 7l10 10M17 7L7 17"/>',
  escada:'<rect x="7" y="3" width="10" height="18"/><path d="M7 8h10M7 13h10M7 18h10"/>',
  escada_l_longa:'<path d="M5 3h14v8h-8v10H5V3z"/><path d="M5 7h14M5 11h6M9 13v8M13 13v8M17 13v8"/>',
  escada_l_curta:'<path d="M5 3h14v8h-8v10H5V3z"/><path d="M5 7h14M9 13v8M13 13v8"/>',
  escada_caracol:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 3v18M3 12h18" opacity=".5"/><circle cx="12" cy="12" r="1.4"/>'
};

function mkLib(list,container){
  list.forEach(it=>{
    const d=document.createElement('div');d.className='libitem';d.dataset.lib=it[0];
    d.innerHTML=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CICON[it[0]]}</svg><div class="nm">${it[1]}</div>`;
    d.onclick=it[2];document.getElementById(container).appendChild(d);
  });
}

function buildGroupedLibrary(containerId,groups,datasetName,markFn){
  const el=document.getElementById(containerId);let html='';
  groups.forEach(([grp,items],idx)=>{html+=`<div class="roomgrp ${idx===0?'open':''}">
    <button class="roomhead" type="button"><span>${grp}</span><b>${items.length}</b></button>
    <div class="grid2 furnigrid">`;
    items.forEach(it=>{html+=`<div class="libitem planitem" data-${datasetName}="${it[0]}">
      <canvas class="libicon"></canvas>
      <div class="nm">${it[1]}</div><div class="dm">${it[2].toFixed(2).replace('.',',')}×${it[3].toFixed(2).replace('.',',')} m</div>
    </div>`;});
    html+='</div></div>';});
  el.innerHTML=html;
  el.querySelectorAll('.roomhead').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
  const flat={};groups.forEach(([,items])=>items.forEach(it=>flat[it[0]]=it));
  el.querySelectorAll('.libitem').forEach(d=>{
    const id=d.dataset[datasetName],it=flat[id];
    drawLibIcon(d.querySelector('canvas.libicon'),it[0],it[2],it[3]);
    d.onclick=()=>{pendingFurniture=it;setTool('furniture');markFn(id);setHint('Clique no desenho pra soltar: '+pendingFurniture[1]);};
  });
}

function buildConstr(){
  const el=document.getElementById('libConstr');
  el.innerHTML=`<div class="secttl">Estrutura</div><div class="grid2" id="cBuild"></div>
    <div class="secttl">Parede - espessura</div>
    <div class="thickrow" id="thickRow">${[10,15,20].map(v=>`<button data-v="${v}" class="${Math.round(defaultWallT*100)===v?'sel':''}">${v} cm</button>`).join('')}</div>
    <div class="customthick">Outra: <input type="number" id="thickCustom" value="${Math.round(defaultWallT*100)}" min="5" max="50"> cm</div>
    <div class="grid2" id="cStruct"></div>
    <div class="secttl">Acabamentos</div><div id="finishGroups"></div>
    <div class="secttl">Ambientes</div><div id="cFixtures"></div>`;
  mkLib([
    ['wall','Parede',()=>{setTool('wall');markLib('wall');}],
    ['room','Cômodo',()=>{setTool('room');markLib('room');}],
    ['viga','Viga',()=>{setTool('furniture');pendingFurniture=['viga','Viga',2.5,0.2];markLib('viga');setHint('Clique no desenho pra soltar: Viga');}]
  ],'cBuild');
  mkLib([
    ['pilar','Pilar',()=>{setTool('furniture');pendingFurniture=['pilar','Pilar',0.3,0.3];markLib('pilar');}],
    ['escada','Escada reta',()=>{setTool('furniture');pendingFurniture=['escada','Escada',1.0,2.6];markLib('escada');}],
    ['escada_l_longa','Escada em L longa',()=>{setTool('furniture');pendingFurniture=['escada_l_longa','Escada em L longa',1.6,3.0];markLib('escada_l_longa');}],
    ['escada_l_curta','Escada em L curta',()=>{setTool('furniture');pendingFurniture=['escada_l_curta','Escada em L curta',1.4,1.4];markLib('escada_l_curta');}],
    ['escada_caracol','Escada caracol',()=>{setTool('furniture');pendingFurniture=['escada_caracol','Escada caracol',1.4,1.4];markLib('escada_caracol');}]
  ],'cStruct');
  buildFinishGroups();
  buildGroupedLibrary('cFixtures',CONSTR_ITEMS,'constr',markConstructionFixture);
  document.querySelectorAll('#thickRow button').forEach(b=>b.onclick=()=>{defaultWallT=(+b.dataset.v)/100;document.getElementById('thickCustom').value=b.dataset.v;syncThickBtns();setTool('wall');markLib('wall');});
  document.getElementById('thickCustom').oninput=e=>{const v=Math.max(5,Math.min(50,+e.target.value||15));defaultWallT=v/100;syncThickBtns();};
}

function buildFinishGroups(){
  const finishGroups=[
    ['Portas',[
      ['porta_simples','Porta simples',()=>{setTool('door');doorSub='simples';markLib('porta_simples');}],
      ['porta_dupla','Porta dupla',()=>{setTool('door');doorSub='dupla';markLib('porta_dupla');}],
      ['porta_correr','Porta de correr',()=>{setTool('door');doorSub='correr';markLib('porta_correr');}],
      ['porta_incendio','Porta de incêndio',()=>{setTool('door');doorSub='incendio';markLib('porta_incendio');}]
    ]],
    ['Janelas',[
      ['janela','Janela',()=>{setTool('window');winSub='simples';markLib('janela');}],
      ['janela_ampla','Janela ampla',()=>{setTool('window');winSub='ampla';markLib('janela_ampla');}]
    ]],
    ['Pisos e áreas', FLOOR_MATERIALS.map(m=>['floor_'+m[0],m[1],()=>{pendingFloor=m;setTool('floor');markFloor(m[0]);setHint('Clique na planta para criar uma área de '+m[1]+'.');},m])]
  ];
  let html='';
  finishGroups.forEach(([grp,items],idx)=>{html+=`<div class="roomgrp ${idx===0?'open':''}">
    <button class="roomhead" type="button"><span>${grp}</span><b>${items.length}</b></button>
    <div class="grid2 furnigrid">`;
    items.forEach(it=>{
      const m=it[3];
      if(m)html+=`<div class="libitem flooritem" data-floor="${m[0]}"><div class="floorswatch ${m[0]}" style="background-color:${m[2]}"></div><div class="nm">${m[1]}</div></div>`;
      else html+=`<div class="libitem" data-lib="${it[0]}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CICON[it[0]]}</svg><div class="nm">${it[1]}</div></div>`;
    });
    html+='</div></div>';});
  const target=document.getElementById('finishGroups');
  if(!target)return;
  target.innerHTML=html;
  document.querySelectorAll('#finishGroups .roomhead').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
  finishGroups.flatMap(([,items])=>items).forEach(it=>{
    const m=it[3],sel=m?`#finishGroups [data-floor="${m[0]}"]`:`#finishGroups [data-lib="${it[0]}"]`;
    const d=document.querySelector(sel);if(d)d.onclick=it[2];
  });
}

function syncThickBtns(){const v=Math.round(defaultWallT*100);document.querySelectorAll('#thickRow button').forEach(b=>b.classList.toggle('sel',+b.dataset.v===v));const ci=document.getElementById('thickCustom');if(ci&&document.activeElement!==ci)ci.value=v;}
function markLib(id){document.querySelectorAll('.libitem').forEach(x=>x.classList.toggle('sel',x.dataset.lib===id));}
function markFloor(id){document.querySelectorAll('#finishGroups .libitem').forEach(x=>x.classList.toggle('sel',x.dataset.floor===id));}
function markConstructionFixture(id){document.querySelectorAll('#cFixtures .libitem').forEach(x=>x.classList.toggle('sel',x.dataset.constr===id));}
function markLib2(id){document.querySelectorAll('#libFurni .libitem').forEach(x=>x.classList.toggle('sel',x.dataset.furni===id));}

const LIBICON_BOX=76;
function drawLibIcon(canvas,kind,realW,realH){
  const dpr=window.devicePixelRatio||1,box=LIBICON_BOX,pad=10,avail=box-pad*2;
  canvas.width=box*dpr;canvas.height=box*dpr;canvas.style.width=box+'px';canvas.style.height=box+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box,box);
  const s=avail/Math.max(realW,realH);
  ctx.save();ctx.translate(box/2,box/2);
  _drawingLibIcon=true;
  try{drawFurnitureShape(ctx,kind,realW*s,realH*s,1.3);}
  finally{_drawingLibIcon=false;}
  ctx.restore();
}
const FURNITURE_THEMES=[
  ['flat2d','2D'],
  ['clean3d','3D Clean'],
  ['humanized','Humanizado']
];
function setFurnitureTheme(id){
  furnitureTheme=id;
  localStorage.setItem('planta2d:furnitureTheme',id);
  document.querySelectorAll('.furnTheme button').forEach(b=>b.classList.toggle('active',b.dataset.theme===id));
  if(typeof buildFurni==='function')buildFurni();
  draw();afterChange();
}
function buildFurnitureThemeControl(){
  return `<div class="furnTheme"><div class="secttl">Tema dos moveis</div><div class="themeSeg">
    ${FURNITURE_THEMES.map(t=>`<button type="button" data-theme="${t[0]}" class="${furnitureTheme===t[0]?'active':''}">${t[1]}</button>`).join('')}
  </div></div>`;
}
function bindFurnitureThemeControl(){
  document.querySelectorAll('.furnTheme button').forEach(b=>b.onclick=()=>setFurnitureTheme(b.dataset.theme));
}
function allFurnitureCategories(){
  const names=FURNI.map(g=>g[0]);
  const customCats=customFurniture.map(it=>it.category).filter(Boolean);
  return Array.from(new Set([...names,...customCats]));
}
async function resolveCategoryChoice(cat){
  if(cat!=='__new__')return cat;
  const nv=await customForm('Nova categoria',[{key:'cat',label:'Nome da categoria',value:''}],{okText:'Criar'});
  if(!nv||!nv[0]||!nv[0].trim())return null;
  return nv[0].trim();
}
function mergedFurnitureGroups(){
  const groups=FURNI.map(([name,items])=>[name,items.map(it=>({kind:it[0],label:it[1],w:it[2],h:it[3]}))]);
  const byName={};groups.forEach(g=>{byName[g[0]]=g[1];});
  customFurniture.forEach(it=>{
    const cat=it.category||'Minha biblioteca';
    if(!byName[cat]){const arr=[];byName[cat]=arr;groups.push([cat,arr]);}
    byName[cat].push({kind:it.kind,label:it.label,w:it.w,h:it.h,custom:true});
  });
  return groups;
}
function buildFurni(){
  const el=document.getElementById('libFurni');
  if(!el)return;
  const groups=mergedFurnitureGroups();
  let html=buildFurnitureThemeControl();
  html+=`<div class="roomgrp open"><div class="grid2 furnigrid">
    <div class="libitem planitem addCustomItem" id="addCustomImage">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      <div class="nm">Adicionar imagem</div>
    </div>
  </div></div>`;
  groups.forEach(([grp,items],idx)=>{
    if(!items.length)return;
    html+=`<div class="roomgrp ${idx===0?'open':''}">
    <button class="roomhead" type="button"><span>${grp}</span><b>${items.length}</b></button>
    <div class="grid2 furnigrid">`;
    items.forEach(it=>{html+=`<div class="libitem planitem${it.custom?' customItem':''}" data-furni="${it.kind}"${it.custom?' title="Clique direito pra editar"':''}>
      ${it.custom?`<button class="customDel" data-del="${it.kind}" title="Remover">×</button>`:''}
      <canvas class="libicon"></canvas>
      <div class="nm">${it.label}</div><div class="dm">${it.w.toFixed(2).replace('.',',')}×${it.h.toFixed(2).replace('.',',')} m</div>
    </div>`;});
    html+='</div></div>';
  });
  el.innerHTML=html;
  bindFurnitureThemeControl();
  el.querySelectorAll('.roomhead').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
  const flat={};groups.forEach(([,items])=>items.forEach(it=>flat[it.kind]=it));
  el.querySelectorAll('.libitem[data-furni]').forEach(d=>{
    const kind=d.dataset.furni,it=flat[kind];if(!it)return;
    drawLibIcon(d.querySelector('canvas.libicon'),it.kind,it.w,it.h);
    d.onclick=(e)=>{
      if(e.target.closest('.customDel'))return;
      pendingFurniture=[it.kind,it.label,it.w,it.h];setTool('furniture');markLib2(kind);
      setHint('Clique no desenho pra soltar: '+it.label);
    };
  });
  bindCustomLibrary();
}
function bindCustomLibrary(){
  const addBtn=document.getElementById('addCustomImage');
  if(addBtn)addBtn.onclick=()=>{
    const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
    inp.onchange=()=>{
      const file=inp.files&&inp.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=async()=>{
        const rawUrl=reader.result;
        const dataUrl=await maybeRemoveBackground(rawUrl);
        const cache=await preloadFurnitureImage(dataUrl);
        if(!cache.loaded){await customAlert('Não foi possível carregar essa imagem.');return;}
        const cats=allFurnitureCategories();
        const values=await customForm('Adicionar imagem',[
          {key:'name',label:'Nome do item',value:'Meu móvel'},
          {key:'w',label:'Largura',type:'number',value:60,suffix:'cm'},
          {key:'h',label:'Profundidade',type:'number',value:60,suffix:'cm'},
          {key:'cat',label:'Categoria',type:'select',value:cats[0]||'Minha biblioteca',options:[...cats,['__new__','+ Criar nova categoria…']]}
        ],{okText:'Adicionar'});
        if(!values)return;
        let[name,wCm,hCm,cat]=values;
        cat=await resolveCategoryChoice(cat);if(!cat)return;
        addCustomFurnitureItem((name||'').trim()||'Meu móvel',Math.max(0.05,wCm/100),Math.max(0.05,hCm/100),dataUrl,cat);
        buildFurni();
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };
  document.querySelectorAll('#libFurni .customItem').forEach(d=>{
    const kind=d.dataset.furni,it=customFurniture.find(c=>c.kind===kind);if(!it)return;
    d.oncontextmenu=async(e)=>{
      e.preventDefault();
      const cats=allFurnitureCategories();
      const values=await customForm('Editar item',[
        {key:'name',label:'Nome do item',value:it.label},
        {key:'w',label:'Largura',type:'number',value:Math.round(it.w*100),suffix:'cm'},
        {key:'h',label:'Profundidade',type:'number',value:Math.round(it.h*100),suffix:'cm'},
        {key:'cat',label:'Categoria',type:'select',value:it.category||cats[0],options:[...cats,['__new__','+ Criar nova categoria…']]}
      ],{okText:'Salvar'});
      if(!values)return;
      let[name,wCm,hCm,cat]=values;
      cat=await resolveCategoryChoice(cat);if(!cat)return;
      it.label=(name||'').trim()||it.label;it.w=Math.max(0.05,wCm/100);it.h=Math.max(0.05,hCm/100);it.category=cat;
      saveCustomFurniture();
      buildFurni();
    };
  });
  document.querySelectorAll('#libFurni .customDel').forEach(b=>{
    b.onclick=async(e)=>{
      e.stopPropagation();
      if(!await customConfirm('Remover este item da sua biblioteca?',{danger:true,okText:'Remover'}))return;
      removeCustomFurnitureItem(b.dataset.del);
      buildFurni();
    };
  });
}

document.querySelectorAll('.libtab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.libtab').forEach(x=>x.classList.toggle('active',x===t));
  const tab=t.dataset.tab;
  document.getElementById('libConstr').style.display=tab==='constr'?'block':'none';
  document.getElementById('libFurni').style.display=tab==='furni'?'block':'none';
});
document.getElementById('collapseBtn').onclick=()=>{const l=document.getElementById('lib');l.classList.toggle('collapsed');setTimeout(resize,210);};

const HINTS={select:'Clique pra selecionar e arrastar. As medidas aparecem no painel da direita.',wall:'Clique cada canto. Enter ou duplo-clique finaliza. Espessura na aba Construção.',door:'Clique em cima de uma parede. Ajuste largura/abertura no painel.',window:'Clique em cima de uma parede. Ajuste a largura no painel.',room:'Arraste pra criar e nomear o cômodo. Mostra a área automática.',floor:'Clique para criar um piso retangular. Depois redimensione pelos cantos.',text:'Clique onde quer escrever.',measure:'Clique em dois pontos pra medir.',furniture:'Clique no desenho pra soltar o item escolhido.'};
function setTool(id){tool=id;sel=null;multiSel=[];wallChain=[];measureA=null;roomStart=null;
  document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===id));
  if(id!=='furniture'&&id!=='door'&&id!=='window'&&id!=='floor'&&id!=='wall'&&id!=='room'){document.querySelectorAll('.libitem').forEach(x=>x.classList.remove('sel'));pendingFurniture=null;pendingFloor=null;}
  setHint(HINTS[id]||'');cc.clearRect(0,0,W,H);renderProps();draw();}
function setHint(t){document.getElementById('hint').textContent=t;}
