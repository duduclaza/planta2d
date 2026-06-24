"use strict";
//==================== ACTIONS ====================
let savedFileHandle=null; // handle do arquivo escolhido (Abrir/Salvar) — reaproveitado pra salvar sem perguntar de novo
let cloudProjectId=localStorage.getItem('planta2d:projectId')||null;
let autoSaveEnabled=false,autoSavePaused=false,autoSaveTimer=null,autoSaveInFlight=false,autoSaveDirty=false,autoSaveLastPayload='';
const btnFile=document.getElementById('btnFile'),fileDrop=document.getElementById('fileDrop');
if(btnFile&&fileDrop){
  btnFile.onclick=e=>{e.stopPropagation();fileDrop.classList.toggle('show');};
  document.addEventListener('click',()=>fileDrop.classList.remove('show'));
  fileDrop.onclick=()=>fileDrop.classList.remove('show');
}
function currentProjectData(){state.measures=state.measures||[];state.groups=state.groups||[];return{app:'planta-baixa',v:2,name:document.getElementById('projName').value,defaultWallT,furnitureTheme,state,zoom,panX,panY};}
function hasNamedProject(){
  const name=(document.getElementById('projName').value||'').trim();
  return !!name&&name!=='Projeto sem título'&&name!=='Projeto sem tÃ­tulo';
}
function canUseCloud(){return location.protocol==='http:'||location.protocol==='https:';}
async function apiJson(path,options){
  const res=await fetch(path,{...options,headers:{'content-type':'application/json',...(typeof authHeaders==='function'?authHeaders():{}),...(options&&options.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
    if(res.status===401&&typeof showAuth==='function')showAuth('login');
    throw new Error(data.error||('HTTP '+res.status));
  }
  return data;
}
function downloadProject(data){
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const filename=(document.getElementById('projName').value||'planta').replace(/\s+/g,'_')+'.json';
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}
async function saveLocalProject(data){
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const filename=(document.getElementById('projName').value||'planta').replace(/\s+/g,'_')+'.json';
  if(window.showSaveFilePicker){
    try{
      if(!savedFileHandle)savedFileHandle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'Planta Baixa JSON',accept:{'application/json':['.json']}}]});
      const writable=await savedFileHandle.createWritable();
      await writable.write(blob);await writable.close();
      setHint('Projeto salvo em '+savedFileHandle.name+'.');
      return;
    }catch(err){savedFileHandle=null;if(err&&err.name==='AbortError')return;}
  }
  downloadProject(data);
}
async function saveCloudProject(data,source){
  const path=cloudProjectId?('/api/projects/'+encodeURIComponent(cloudProjectId)):'/api/projects';
  const method=cloudProjectId?'PUT':'POST';
  const saved=await apiJson(path,{method,body:JSON.stringify({name:data.name,data})});
  cloudProjectId=saved.id;localStorage.setItem('planta2d:projectId',cloudProjectId);
  autoSaveLastPayload=JSON.stringify(data);
  setHint(source==='auto'?'Salvo automaticamente.':'Projeto salvo na Cloudflare.');
}
function canAutoSave(){
  return autoSaveEnabled&&!autoSavePaused&&hasNamedProject()&&canUseCloud()&&typeof authToken!=='undefined'&&authToken&&typeof authUser!=='undefined'&&authUser;
}
function enableAutoSave(){autoSaveEnabled=true;}
function pauseAutoSave(fn){autoSavePaused=true;try{return fn();}finally{autoSavePaused=false;}}
function scheduleAutoSave(){
  if(!canAutoSave())return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(runAutoSave,2000);
}
async function runAutoSave(){
  if(!canAutoSave())return;
  if(autoSaveInFlight){autoSaveDirty=true;return;}
  const data=currentProjectData(),payload=JSON.stringify(data);
  if(payload===autoSaveLastPayload)return;
  autoSaveInFlight=true;autoSaveDirty=false;
  setHint('Salvando automaticamente...');
  try{await saveCloudProject(data,'auto');}
  catch(err){console.warn(err);setHint('Autosave indisponivel. Use Salvar para tentar novamente.');}
  finally{autoSaveInFlight=false;if(autoSaveDirty)scheduleAutoSave();}
}
async function openCloudProject(){
  const list=await apiJson('/api/projects');
  const projects=list.projects||[];
  if(!projects.length){setHint('Nenhum projeto salvo na Cloudflare ainda.');return false;}
  const project=await chooseCloudProject(projects);
  if(!project)return true;
  const loaded=await apiJson('/api/projects/'+encodeURIComponent(project.id));
  cloudProjectId=loaded.id;localStorage.setItem('planta2d:projectId',cloudProjectId);
  loadProjectData(JSON.stringify(loaded.data));
  setHint('Projeto aberto da Cloudflare.');
  return true;
}
function showEditorView(){
  const view=document.getElementById('projectsView');
  if(view)view.classList.remove('show');
  const admin=document.getElementById('adminView');
  if(admin)admin.classList.remove('show');
}
function showProjectsView(){
  const view=document.getElementById('projectsView');
  if(view)view.classList.add('show');
  const admin=document.getElementById('adminView');
  if(admin)admin.classList.remove('show');
  hideWelcome();
}
function showAdminView(){
  const view=document.getElementById('projectsView');
  if(view)view.classList.remove('show');
  const admin=document.getElementById('adminView');
  if(admin)admin.classList.add('show');
  hideWelcome();
}
async function openProjectById(id){
  const loaded=await apiJson('/api/projects/'+encodeURIComponent(id));
  cloudProjectId=loaded.id;localStorage.setItem('planta2d:projectId',cloudProjectId);
  loadProjectData(JSON.stringify(loaded.data));
  showEditorView();
  setHint('Projeto aberto.');
}
function drawProjectPreview(canvas,data){
  const ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,w=canvas.clientWidth||280,h=canvas.clientHeight||175;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fbfaf6';ctx.fillRect(0,0,w,h);
  const s=data&&data.state?data.state:{walls:[],rooms:[],floors:[],furniture:[],openings:[],texts:[]};
  let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity,any=false;
  const ext=(x,y)=>{any=true;mnx=Math.min(mnx,x);mny=Math.min(mny,y);mxx=Math.max(mxx,x);mxy=Math.max(mxy,y);};
  (s.walls||[]).forEach(o=>{ext(o.x1,o.y1);ext(o.x2,o.y2);});(s.rooms||[]).forEach(o=>{ext(o.x,o.y);ext(o.x+o.w,o.y+o.h);});(s.floors||[]).forEach(o=>{ext(o.x,o.y);ext(o.x+o.w,o.y+o.h);});(s.furniture||[]).forEach(o=>{ext(o.x-o.w/2,o.y-o.h/2);ext(o.x+o.w/2,o.y+o.h/2);});(s.openings||[]).forEach(o=>ext(o.x,o.y));
  if(!any){ctx.fillStyle='#d9dbd5';ctx.fillRect(w*.18,h*.25,w*.64,h*.5);ctx.strokeStyle='#9aa3ad';ctx.strokeRect(w*.18,h*.25,w*.64,h*.5);return;}
  const pad=18,scale=Math.min((w-pad*2)/Math.max(mxx-mnx,.5),(h-pad*2)/Math.max(mxy-mny,.5)),tx=pad-mnx*scale,ty=pad-mny*scale,T=(x,y)=>[x*scale+tx,y*scale+ty];
  (s.floors||[]).forEach(f=>{const [x,y]=T(f.x,f.y);ctx.fillStyle=(materialInfo(f.material)||[])[2]||'#d9dbd5';ctx.globalAlpha=.55;ctx.fillRect(x,y,f.w*scale,f.h*scale);ctx.globalAlpha=1;});
  (s.rooms||[]).forEach(r=>{const [x,y]=T(r.x,r.y);ctx.fillStyle=hexA(r.color||'#4a90c2',.16);ctx.fillRect(x,y,r.w*scale,r.h*scale);});
  ctx.lineCap='round';ctx.strokeStyle='#2a2f37';(s.walls||[]).forEach(wall=>{const [x1,y1]=T(wall.x1,wall.y1),[x2,y2]=T(wall.x2,wall.y2);ctx.lineWidth=Math.max((wall.t||.15)*scale,2);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.fillStyle='#e08a3c';(s.openings||[]).forEach(o=>{const [x,y]=T(o.x,o.y);ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();});
  ctx.fillStyle='#607080';(s.furniture||[]).forEach(f=>{const [x,y]=T(f.x,f.y);ctx.fillRect(x-Math.max(f.w*scale/2,2),y-Math.max(f.h*scale/2,2),Math.max(f.w*scale,4),Math.max(f.h*scale,4));});
}
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function renameProjectById(id,currentName){
  const name=await askProjectName(currentName||'');
  if(!name||name===currentName)return null;
  const saved=await apiJson('/api/projects/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({name})});
  setHint('Projeto renomeado.');
  return saved;
}
async function deleteProjectById(id,name){
  if(!confirm('Excluir o projeto "'+(name||'Projeto sem título')+'"? Esta ação não pode ser desfeita.'))return false;
  await apiJson('/api/projects/'+encodeURIComponent(id),{method:'DELETE'});
  if(cloudProjectId===id){cloudProjectId=null;localStorage.removeItem('planta2d:projectId');}
  setHint('Projeto excluído.');
  return true;
}
async function showMyProjects(){
  const listEl=document.getElementById('projectsList');
  showProjectsView();
  listEl.innerHTML='<div class="projectsEmpty">Carregando seus projetos...</div>';
  const list=await apiJson('/api/projects');
  const projects=list.projects||[];
  if(!projects.length){listEl.innerHTML='<div class="projectsEmpty">Nenhum projeto salvo ainda.</div>';return;}
  listEl.innerHTML=projects.map(p=>`<div class="projectCard" data-id="${p.id}">
    <div class="projectActions">
      <button class="projectActionBtn" data-act="rename" title="Renomear projeto">✎</button>
      <button class="projectActionBtn danger" data-act="delete" title="Excluir projeto">🗑</button>
    </div>
    <canvas class="projectPreview"></canvas>
    <span class="projectMeta"><b>${escapeHtml(p.name||'Projeto sem título')}</b><small>Última alteração: ${new Date(p.updated_at).toLocaleString()}</small></span>
  </div>`).join('');
  listEl.querySelectorAll('.projectCard').forEach(async card=>{
    const id=card.dataset.id;
    card.onclick=e=>{if(e.target.closest('.projectActionBtn'))return;openProjectById(id);};
    const renameBtn=card.querySelector('[data-act="rename"]'),delBtn=card.querySelector('[data-act="delete"]');
    renameBtn.onclick=async e=>{
      e.stopPropagation();
      const nameEl=card.querySelector('.projectMeta b');
      try{const saved=await renameProjectById(id,nameEl.textContent);if(saved)nameEl.textContent=saved.name;}
      catch(err){console.warn(err);alert('Não foi possível renomear o projeto.');}
    };
    delBtn.onclick=async e=>{
      e.stopPropagation();
      try{const nameEl=card.querySelector('.projectMeta b');if(await deleteProjectById(id,nameEl.textContent))card.remove();
        if(!listEl.querySelector('.projectCard'))listEl.innerHTML='<div class="projectsEmpty">Nenhum projeto salvo ainda.</div>';
      }catch(err){console.warn(err);alert('Não foi possível excluir o projeto.');}
    };
    try{const loaded=await apiJson('/api/projects/'+encodeURIComponent(id));drawProjectPreview(card.querySelector('canvas'),loaded.data);}
    catch(err){console.warn(err);}
  });
}
function moneyBRL(cents){
  return (Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function styledFurnitureOptions(){
  const out=[];
  const add=(category,items)=>items.forEach(it=>{
    const folders=typeof categoryImageFolders==='function'?categoryImageFolders(category):['geral'];
    out.push({kind:it[0],label:it[1],category,folder:folders[0]||'geral'});
  });
  FURNI.forEach(([category,items])=>add(category,items));
  CONSTR_ITEMS.forEach(([category,items])=>add(category,items));
  [['Estrutura',[['viga','Viga'],['pilar','Pilar'],['escada','Escada']]]].forEach(([category,items])=>add(category,items));
  const seen=new Set();
  return out.filter(o=>{const k=o.kind+'|'+o.folder;if(seen.has(k))return false;seen.add(k);return true;});
}
function styledAssetMessage(msg,isError){
  const box=document.getElementById('styledAssetMsg');
  if(!box)return;
  box.textContent=msg||'';
  box.classList.toggle('error',!!isError);
}
function canvasToPngDataUrl(canvas){
  return canvas.toDataURL('image/png');
}
async function resizeStyledPng(file){
  if(!file)throw new Error('Escolha um PNG.');
  if(file.type&&file.type!=='image/png')throw new Error('Envie apenas PNG.');
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{
      const im=new Image();
      im.onload=()=>resolve(im);
      im.onerror=()=>reject(new Error('Nao foi possivel ler a imagem.'));
      im.src=url;
    });
    let maxSide=512,dataUrl='',w=0,h=0;
    for(let attempt=0;attempt<5;attempt++){
      const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
      w=Math.max(1,Math.round(img.naturalWidth*scale));
      h=Math.max(1,Math.round(img.naturalHeight*scale));
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const x=canvas.getContext('2d');
      x.clearRect(0,0,w,h);
      x.imageSmoothingEnabled=true;
      x.imageSmoothingQuality='high';
      x.drawImage(img,0,0,w,h);
      dataUrl=canvasToPngDataUrl(canvas);
      if(Math.floor((dataUrl.length-dataUrl.indexOf(',')-1)*3/4)<900000)break;
      maxSide=Math.max(256,Math.floor(maxSide*.82));
    }
    return{dataUrl,width:w,height:h};
  }finally{URL.revokeObjectURL(url);}
}
async function loadStyledAssetList(){
  const box=document.getElementById('styledAssetList');
  if(!box)return;
  try{
    const data=await apiJson('/api/admin/styled-assets');
    const assets=data.assets||[];
    if(!assets.length){box.innerHTML='<span class="styledAssetPill">Nenhum PNG enviado ainda</span>';return;}
    box.innerHTML=assets.slice(0,30).map(a=>`<span class="styledAssetPill" title="${escapeHtml(a.folder+'/'+a.filename)}">${escapeHtml(a.furniture_kind)} <small>${Number(a.width||0)}x${Number(a.height||0)}</small><button data-id="${escapeHtml(a.id)}" title="Excluir">x</button></span>`).join('');
    box.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{
      if(!confirm('Excluir este PNG estilizado?'))return;
      await apiJson('/api/admin/styled-assets/'+encodeURIComponent(b.dataset.id),{method:'DELETE'});
      Object.keys(_imgCache||{}).forEach(k=>delete _imgCache[k]);
      draw();
      loadStyledAssetList();
    });
  }catch(err){box.innerHTML='<span class="styledAssetPill">Nao foi possivel carregar a lista</span>';}
}
function renderAdminStyledAssetPanel(){
  const el=document.getElementById('adminStyledAssets');
  if(!el)return;
  const options=styledFurnitureOptions();
  el.innerHTML=`<h3>Moveis estilizados</h3>
    <p>Somente o administrador pode enviar PNGs. O sistema redimensiona antes de salvar para nao entrar imagem gigante.</p>
    <div class="styledUploadGrid">
      <label>Movel<select id="styledKind">${options.map(o=>`<option value="${escapeHtml(o.kind)}" data-folder="${escapeHtml(o.folder)}" data-label="${escapeHtml(o.label)}">${escapeHtml(o.category)} - ${escapeHtml(o.label)}</option>`).join('')}</select></label>
      <label>Pasta<input id="styledFolder" value="${escapeHtml(options[0]&&options[0].folder||'geral')}" maxlength="40"></label>
      <label>PNG<input id="styledFile" type="file" accept="image/png"></label>
      <button class="hbtn primary" id="styledUploadBtn">Enviar PNG</button>
    </div>
    <div class="styledAssetMsg" id="styledAssetMsg"></div>
    <div class="styledAssetList" id="styledAssetList"></div>`;
  const selKind=document.getElementById('styledKind'),folder=document.getElementById('styledFolder'),file=document.getElementById('styledFile');
  selKind.onchange=()=>{const opt=selKind.selectedOptions[0];folder.value=opt?opt.dataset.folder||'geral':'geral';};
  document.getElementById('styledUploadBtn').onclick=async()=>{
    try{
      styledAssetMessage('Redimensionando PNG...');
      const opt=selKind.selectedOptions[0],kind=selKind.value,label=opt?opt.dataset.label:'';
      const resized=await resizeStyledPng(file.files[0]);
      styledAssetMessage('Enviando PNG...');
      const filename=kind+'.png';
      await apiJson('/api/admin/styled-assets',{method:'POST',body:JSON.stringify({kind,label,folder:folder.value,filename,width:resized.width,height:resized.height,data_url:resized.dataUrl})});
      Object.keys(_imgCache||{}).forEach(k=>delete _imgCache[k]);
      if(typeof buildFurni==='function')buildFurni();
      draw();
      file.value='';
      styledAssetMessage('PNG salvo e disponivel para todos.');
      loadStyledAssetList();
    }catch(err){styledAssetMessage(err.message||'Nao foi possivel enviar o PNG.',true);}
  };
  loadStyledAssetList();
}
async function showAdminManagement(){
  if(!authUser||!authUser.is_super_admin){setHint('Apenas o Super Admin pode acessar o gerenciamento.');return;}
  const listEl=document.getElementById('adminUsersList');
  const summary=document.getElementById('adminSummary');
  showAdminView();
  renderAdminStyledAssetPanel();
  if(listEl)listEl.innerHTML='<tr><td colspan="5" class="adminEmpty">Carregando clientes...</td></tr>';
  const data=await apiJson('/api/admin/users');
  const users=data.users||[];
  const totals=users.reduce((acc,u)=>{acc.clients++;acc.projects+=Number(u.project_count||0);acc.spent+=Number(u.spent_cents||0);acc.free+=u.free_png_export?1:0;return acc;},{clients:0,projects:0,spent:0,free:0});
  if(summary)summary.innerHTML=`<span><b>${totals.clients}</b> clientes</span><span><b>${totals.projects}</b> projetos</span><span><b>${moneyBRL(totals.spent)}</b> recebidos</span><span><b>${totals.free}</b> liberados</span>`;
  if(!listEl)return;
  if(!users.length){listEl.innerHTML='<tr><td colspan="5" class="adminEmpty">Nenhum cliente cadastrado.</td></tr>';return;}
  listEl.innerHTML=users.map(u=>`<tr data-id="${u.id}">
    <td><b>${escapeHtml(u.name||'Sem nome')}</b><small>${escapeHtml(u.email||'')}</small>${u.is_super_admin?'<em>Super Admin</em>':''}</td>
    <td>${Number(u.project_count||0)}</td>
    <td>${moneyBRL(u.spent_cents)}</td>
    <td>${Number(u.paid_exports||0)}</td>
    <td><label class="adminSwitch"><input type="checkbox" ${u.free_png_export?'checked':''}><span></span></label></td>
  </tr>`).join('');
  listEl.querySelectorAll('tr[data-id]').forEach(row=>{
    const input=row.querySelector('input[type="checkbox"]');
    input.onchange=async()=>{
      input.disabled=true;
      try{
        const saved=await apiJson('/api/admin/users/'+encodeURIComponent(row.dataset.id),{method:'PATCH',body:JSON.stringify({free_png_export:input.checked})});
        if(authUser&&authUser.id===saved.id){authUser.can_export_free=saved.free_png_export;localStorage.setItem('planta2d:authUser',JSON.stringify(authUser));}
        setHint(saved.free_png_export?'Cliente liberado para baixar sem pagar.':'Cliente voltou a pagar para baixar.');
      }catch(err){
        input.checked=!input.checked;
        setHint(err.message||'Nao foi possivel salvar a permissao.');
      }finally{input.disabled=false;}
    };
  });
}
function askProjectName(initial){
  return new Promise(resolve=>{
    let modal=document.getElementById('projectNamePrompt');
    if(!modal){modal=document.createElement('div');modal.id='projectNamePrompt';modal.className='namePrompt';document.body.appendChild(modal);}
    modal.innerHTML=`<div class="namecard"><h3>Nome do projeto</h3><p>Dê um nome para organizar em Meus projetos e ativar o salvamento automático.</p><input id="projectNameField" maxlength="120" value="${(initial||'').replace(/"/g,'&quot;')}"><div class="nameactions"><button class="hbtn" id="nameCancel">Cancelar</button><button class="hbtn primary" id="nameOk">Começar</button></div></div>`;
    modal.classList.add('show');
    const input=document.getElementById('projectNameField');
    const close=v=>{modal.classList.remove('show');resolve(v);};
    document.getElementById('nameCancel').onclick=()=>close(null);
    document.getElementById('nameOk').onclick=()=>{const name=input.value.trim();if(!name){input.focus();return;}close(name);};
    input.onkeydown=e=>{if(e.key==='Enter')document.getElementById('nameOk').click();if(e.key==='Escape')close(null);};
    setTimeout(()=>{input.focus();input.select();},30);
  });
}
async function ensureProjectName(){
  if(hasNamedProject())return true;
  const name=await askProjectName('');
  if(!name)return false;
  document.getElementById('projName').value=name;
  scheduleAutoSave();
  return true;
}
function chooseCloudProject(projects){
  return new Promise(resolve=>{
    let modal=document.getElementById('projectPicker');
    if(!modal){modal=document.createElement('div');modal.id='projectPicker';modal.className='projectPicker';document.body.appendChild(modal);}
    modal.innerHTML=`<div class="pickcard"><div class="pickhead"><b>Meus projetos</b><button id="pickClose">×</button></div><div class="picklist">
      ${projects.map(p=>`<div class="pickrow" data-id="${p.id}"><button class="pickitem" data-id="${p.id}"><span>${escapeHtml(p.name||'Projeto sem título')}</span><small>${new Date(p.updated_at).toLocaleString()}</small></button><button class="pickdel" data-id="${p.id}" title="Excluir projeto">Excluir</button></div>`).join('')}
    </div></div>`;
    modal.classList.add('show');
    const close=()=>{modal.classList.remove('show');resolve(null);};
    document.getElementById('pickClose').onclick=close;
    modal.onclick=e=>{if(e.target===modal)close();};
    modal.querySelectorAll('.pickitem').forEach(b=>b.onclick=()=>{modal.classList.remove('show');resolve(projects.find(p=>p.id===b.dataset.id)||null);});
    modal.querySelectorAll('.pickdel').forEach(b=>b.onclick=async e=>{
      e.stopPropagation();
      const project=projects.find(p=>p.id===b.dataset.id);if(!project)return;
      if(!confirm('Excluir o projeto "'+(project.name||'Projeto sem título')+'"?'))return;
      try{
        await apiJson('/api/projects/'+encodeURIComponent(project.id),{method:'DELETE'});
        if(cloudProjectId===project.id){cloudProjectId=null;localStorage.removeItem('planta2d:projectId');}
        const row=modal.querySelector(`.pickrow[data-id="${CSS.escape(project.id)}"]`);if(row)row.remove();
        setHint('Projeto excluído.');
        if(!modal.querySelector('.pickrow')){modal.classList.remove('show');resolve(null);}
      }catch(err){alert('Não foi possível excluir o projeto.');console.warn(err);}
    });
  });
}
function resetEditorProject(name){
  state.walls=[];state.openings=[];state.rooms=[];state.floors=[];state.furniture=[];state.texts=[];state.measures=[];state.groups=[];sel=null;multiSel=[];
  document.getElementById('projName').value=name||'Projeto sem título';
  savedFileHandle=null;cloudProjectId=null;localStorage.removeItem('planta2d:projectId');
  autoSaveLastPayload='';
  draw();afterChange();renderProps();
}
document.getElementById('btnNew').onclick=async()=>{if(!confirm('Começar um projeto novo? O desenho atual será apagado.'))return;const name=await askProjectName('');if(!name)return;pushHistory();pauseAutoSave(()=>resetEditorProject(name));scheduleAutoSave();hideWelcome();showEditorView();};
const btnDashboard=document.getElementById('btnDashboard');
if(btnDashboard)btnDashboard.onclick=async()=>{try{await showMyProjects();}catch(err){console.warn(err);setHint('Não foi possível abrir Meus projetos.');}};
const btnAdminManagement=document.getElementById('btnAdminManagement');
if(btnAdminManagement)btnAdminManagement.onclick=async()=>{try{await showAdminManagement();}catch(err){console.warn(err);setHint('Nao foi possivel abrir o gerenciamento.');}};
const projectsClose=document.getElementById('projectsClose');
if(projectsClose)projectsClose.onclick=showEditorView;
const adminClose=document.getElementById('adminClose');
if(adminClose)adminClose.onclick=showEditorView;
document.getElementById('btnSave').onclick=async()=>{
  if(!(await ensureProjectName()))return;
  const data=currentProjectData();
  if(canUseCloud()){
    try{await saveCloudProject(data);return;}
    catch(err){console.warn(err);setHint('Cloudflare indisponivel; salvando arquivo local.');downloadProject(data);return;}
  }
  await saveLocalProject(data);
};
function loadProjectData(text){
  try{pauseAutoSave(()=>{const d=JSON.parse(text);pushHistory();Object.assign(state,d.state);state.floors=state.floors||[];state.measures=state.measures||[];state.groups=state.groups||[];if(d.defaultWallT)defaultWallT=d.defaultWallT;if(d.furnitureTheme){furnitureTheme=d.furnitureTheme;localStorage.setItem('planta2d:furnitureTheme',furnitureTheme);}document.getElementById('projName').value=d.name||'Projeto';if(d.zoom){zoom=d.zoom;panX=d.panX;panY=d.panY;updateZoom();}sel=null;multiSel=[];buildConstr();buildFurni();draw();afterChange();renderProps();hideWelcome();showEditorView();autoSaveLastPayload=JSON.stringify(currentProjectData());});}
  catch(err){alert('Arquivo inválido.');}
}
document.getElementById('btnOpen').onclick=async()=>{
  if(window.showOpenFilePicker){
    try{
      const[handle]=await window.showOpenFilePicker({types:[{description:'Planta Baixa JSON',accept:{'application/json':['.json']}}]});
      const file=await handle.getFile();loadProjectData(await file.text());savedFileHandle=handle;return;
    }catch(err){if(err&&err.name==='AbortError')return;}
  }
  document.getElementById('fileInput').click();
};
document.getElementById('fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{savedFileHandle=null;loadProjectData(rd.result);};rd.readAsText(f);e.target.value='';};
const projNameInput=document.getElementById('projName');
if(projNameInput)projNameInput.addEventListener('input',scheduleAutoSave);
function downloadPngUrl(url){
  const a=document.createElement('a');a.href=url;a.download=(document.getElementById('projName').value||'planta').replace(/\s+/g,'_')+'.png';a.click();
}
function ensurePixModal(){
  let modal=document.getElementById('pixExportModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='pixExportModal';
  modal.className='pixExportModal';
  document.body.appendChild(modal);
  return modal;
}
function setPixModalState(modal,state,msg){
  const status=modal.querySelector('.pixStatus');
  if(status){status.className='pixStatus '+(state||'');status.textContent=msg||'';}
}
function closePixModal(){
  const modal=document.getElementById('pixExportModal');
  if(!modal)return;
  if(modal._stripeCheckout&&typeof modal._stripeCheckout.destroy==='function'){
    try{modal._stripeCheckout.destroy();}catch(err){console.warn(err);}
    modal._stripeCheckout=null;
  }
  const oldUrl=modal.dataset.qrObjectUrl;
  if(oldUrl)URL.revokeObjectURL(oldUrl);
  clearInterval(Number(modal.dataset.pollTimer||0));
  modal.classList.remove('show');
}
async function loadPixQrImage(modal,url){
  const img=modal.querySelector('.pixQr');
  img.style.display='none';
  img.removeAttribute('src');
  if(/^data:image\//.test(String(url||''))){
    img.src=url;
    img.style.display='block';
    return;
  }
  const res=await fetch(url,{headers:{...(typeof authHeaders==='function'?authHeaders():{})}});
  if(!res.ok)throw new Error('Nao foi possivel carregar o QR Code.');
  const objectUrl=URL.createObjectURL(await res.blob());
  modal.dataset.qrObjectUrl=objectUrl;
  img.src=objectUrl;
  img.style.display='block';
}
async function waitForPixPayment(paymentId,pngUrl,modal){
  clearInterval(Number(modal.dataset.pollTimer||0));
  const downloadBtn=modal.querySelector('#pixDownloadBtn');
  const check=async()=>{
    const data=await apiJson('/api/payments/'+encodeURIComponent(paymentId)+'/status');
    if(data.paid){
      clearInterval(Number(modal.dataset.pollTimer||0));
      setPixModalState(modal,'paid','Pagamento confirmado. Baixando PNG...');
      downloadBtn.disabled=false;
      downloadBtn.textContent='Baixar PNG';
      downloadPngUrl(pngUrl);
      setTimeout(closePixModal,900);
      return true;
    }
    return false;
  };
  downloadBtn.onclick=async()=>{try{if(!(await check()))setPixModalState(modal,'waiting','Ainda aguardando confirmacao do PagBank.');}catch(err){setPixModalState(modal,'error',err.message||'Erro ao consultar pagamento.');}};
  const timer=setInterval(async()=>{try{await check();}catch(err){console.warn(err);}},4000);
  modal.dataset.pollTimer=String(timer);
  try{await check();}catch(err){console.warn(err);}
}
async function waitForStripePayment(paymentId,pngUrl,modal){
  clearInterval(Number(modal.dataset.pollTimer||0));
  const downloadBtn=modal.querySelector('#pixDownloadBtn');
  const check=async()=>{
    const data=await apiJson('/api/payments/'+encodeURIComponent(paymentId)+'/status');
    if(data.paid){
      clearInterval(Number(modal.dataset.pollTimer||0));
      setPixModalState(modal,'paid','Pagamento confirmado. Baixando PNG...');
      downloadBtn.disabled=false;
      downloadBtn.textContent='Baixar PNG';
      downloadPngUrl(pngUrl);
      setTimeout(closePixModal,900);
      return true;
    }
    return false;
  };
  downloadBtn.onclick=async()=>{try{if(!(await check()))setPixModalState(modal,'waiting','Ainda aguardando confirmacao do Stripe.');}catch(err){setPixModalState(modal,'error',err.message||'Erro ao consultar pagamento.');}};
  const timer=setInterval(async()=>{try{await check();}catch(err){console.warn(err);}},3500);
  modal.dataset.pollTimer=String(timer);
  try{await check();}catch(err){console.warn(err);}
}
async function mountStripeCheckout(modal,payment){
  if(!payment.stripe_client_secret||!payment.stripe_publishable_key||typeof Stripe!=='function')return false;
  const stripeMount=modal.querySelector('#stripeEmbeddedCheckout');
  if(!stripeMount)return false;
  try{
    const stripe=Stripe(payment.stripe_publishable_key);
    const checkout=await stripe.initEmbeddedCheckout({clientSecret:payment.stripe_client_secret});
    modal._stripeCheckout=checkout;
    checkout.mount('#stripeEmbeddedCheckout');
    return true;
  }catch(err){
    console.warn(err);
    return false;
  }
}
async function startPaidPngExport(){
  downloadPngUrl(renderExport(2.2));
  setHint('PNG exportado sem cobranca.');
  return;
  if(authUser&&authUser.can_export_free){
    downloadPngUrl(renderExport(2.2));
    setHint('Exportacao PNG liberada sem pagamento.');
    return;
  }
  if(!canUseCloud()){setHint('Abra o app pelo servidor para pagar e exportar PNG.');downloadPngUrl(renderExport(2.2));return;}
  const pngUrl=renderExport(2.2);
  const modal=ensurePixModal();
  modal.innerHTML=`<div class="pixCard">
    <div class="pixHead"><b>Exportar PNG</b><button id="pixClose" aria-label="Fechar">×</button></div>
    <div class="pixBody">
      <div class="pixQrBox"><span class="pixQrLoading">Gerando QR Code...</span><img class="pixQr" alt="QR Code PIX" style="display:none"></div>
      <div class="pixInfo">
        <strong>Pagamento de R$ 1,99</strong>
        <p>Conclua o pagamento para liberar o download automatico do PNG.</p>
        <textarea class="pixCopy" readonly></textarea>
        <div class="pixActions">
          <button class="hbtn" id="pixCopyBtn">Copiar codigo</button>
          <button class="hbtn primary" id="pixDownloadBtn" disabled>Aguardando pagamento</button>
        </div>
        <div class="pixStatus waiting">Gerando cobranca...</div>
      </div>
    </div>
  </div>`;
  modal.classList.add('show');
  modal.onclick=e=>{if(e.target===modal)closePixModal();};
  modal.querySelector('#pixClose').onclick=closePixModal;
  try{
    const payment=await apiJson('/api/payments/export-png',{method:'POST',body:JSON.stringify({project_name:document.getElementById('projName').value||'Planta baixa'})});
    if(payment.provider==='stripe'){
      const body=modal.querySelector('.pixBody');
      if(body)body.classList.add('stripeMode');
      const qrBox=modal.querySelector('.pixQrBox');
      if(qrBox)qrBox.outerHTML='<div class="stripeCheckoutBox" id="stripeEmbeddedCheckout"><span class="pixQrLoading">Carregando Stripe...</span></div>';
      modal.querySelector('.pixInfo strong').textContent='Pagamento de R$ 1,99';
      modal.querySelector('.pixInfo p').textContent='Conclua o checkout seguro abaixo. Assim que o pagamento confirmar, o PNG baixa automaticamente.';
      const copy=modal.querySelector('.pixCopy');
      copy.value=payment.checkout_url||'';
      copy.readOnly=true;
      const openBtn=modal.querySelector('#pixCopyBtn');
      openBtn.textContent=payment.checkout_url?'Abrir em nova aba':'Atualizar status';
      openBtn.onclick=()=>{if(payment.checkout_url)window.open(payment.checkout_url,'_blank','noopener');};
      const mounted=await mountStripeCheckout(modal,payment);
      if(!mounted&&payment.checkout_url)window.open(payment.checkout_url,'_blank','noopener');
      if(!mounted){
        if(body)body.classList.add('hostedFallback');
        const stripeBox=modal.querySelector('#stripeEmbeddedCheckout');
        if(stripeBox)stripeBox.innerHTML='<span class="pixQrLoading">Checkout aberto em nova aba.</span>';
        modal.querySelector('.pixInfo p').textContent='O checkout seguro foi aberto em uma nova aba. Depois do pagamento, volte aqui para baixar automaticamente.';
      }
      setPixModalState(modal,'waiting','Aguardando pagamento no Stripe...');
      await waitForStripePayment(payment.id,pngUrl,modal);
      return;
    }
    modal.querySelector('.pixCopy').value=payment.qr_text||'';
    modal.querySelector('#pixCopyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(payment.qr_text||'');setPixModalState(modal,'waiting','Codigo PIX copiado. Aguardando pagamento...');}catch(err){setPixModalState(modal,'error','Nao foi possivel copiar automaticamente.');}};
    await loadPixQrImage(modal,payment.qr_image_url);
    setPixModalState(modal,'waiting','Aguardando confirmacao do pagamento...');
    await waitForPixPayment(payment.id,pngUrl,modal);
  }catch(err){
    console.warn(err);
    setPixModalState(modal,'error',err.message||'Nao foi possivel gerar o PIX.');
  }
}
document.getElementById('btnPng').onclick=startPaidPngExport;
document.getElementById('btnPrint').onclick=()=>{const url=renderExport(2.2);const w=window.open('');w.document.write(`<html><head><title>${document.getElementById('projName').value}</title></head><body style="margin:0;text-align:center"><img src="${url}" style="max-width:100%"><scr`+`ipt>onload=()=>print()</scr`+`ipt></body></html>`);w.document.close();};

function bounds(){let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity,any=false;const ext=(x,y)=>{any=true;mnx=Math.min(mnx,x);mny=Math.min(mny,y);mxx=Math.max(mxx,x);mxy=Math.max(mxy,y);};
  state.walls.forEach(w=>{ext(w.x1,w.y1);ext(w.x2,w.y2);});state.rooms.forEach(r=>{ext(r.x,r.y);ext(r.x+r.w,r.y+r.h);});(state.floors||[]).forEach(f=>{ext(f.x,f.y);ext(f.x+f.w,f.y+f.h);});state.furniture.forEach(f=>{ext(f.x-f.w/2,f.y-f.h/2);ext(f.x+f.w/2,f.y+f.h/2);});state.texts.forEach(t=>ext(t.x,t.y));state.openings.forEach(o=>ext(o.x,o.y));(state.measures||[]).forEach(m=>{ext(m.x1,m.y1);ext(m.x2,m.y2);});
  if(!any)return null;return{mnx,mny,mxx,mxy};}
function renderExport(q){const b=bounds(),pad=1,tmp=document.createElement('canvas');
  const bw=(b?(b.mxx-b.mnx):8)+pad*2,bh=(b?(b.mxy-b.mny):6)+pad*2,px=Math.min(2800,Math.max(900,bw*PPM*q)),scale=px/(bw*PPM);
  tmp.width=bw*PPM*scale;tmp.height=bh*PPM*scale;const x=tmp.getContext('2d'),E=PPM*scale,ox=(-(b?b.mnx:0)+pad)*E,oy=(-(b?b.mny:0)+pad)*E,T=(a,b2)=>[a*E+ox,b2*E+oy];
  x.fillStyle='#fff';x.fillRect(0,0,tmp.width,tmp.height);
  computeFloors().forEach(poly=>{x.fillStyle='#d9dbd5';x.beginPath();poly.forEach((p,i)=>{const[a,b2]=T(p.x,p.y);i?x.lineTo(a,b2):x.moveTo(a,b2);});x.closePath();x.fill();});
  (state.floors||[]).forEach(f=>{const[a,b2]=T(f.x,f.y),w=f.w*E,h=f.h*E,mat=materialInfo(f.material),tile=f.tileSize||mat[3]||0.6;x.beginPath();x.rect(a,b2,w,h);fillCurrentPathWithMaterial(x,f.material,f.color||mat[2],0.82,{patternPx:tile*E});x.strokeStyle=hexA('#2a2f37',0.28);x.lineWidth=1.2;x.strokeRect(a,b2,w,h);});
  state.rooms.forEach(r=>{const[a,b2]=T(r.x,r.y),w=r.w*E,h=r.h*E,mat=materialInfo(r.material),tile=r.tileSize||mat[3]||0.6;x.beginPath();x.rect(a,b2,w,h);fillCurrentPathWithMaterial(x,r.material,r.color||mat[2],0.13,{patternPx:tile*E});x.strokeStyle=hexA(r.color||'#4a90c2',0.7);x.lineWidth=1.5;x.strokeRect(a,b2,w,h);x.textAlign='center';x.textBaseline='middle';if(r.name){x.font="700 14px Inter,sans-serif";x.fillStyle='#2a2f37';x.fillText(r.name,a+w/2,b2+h/2-8);}x.font="600 11px monospace";x.fillStyle=r.color||'#4a90c2';x.fillText(fmtA(r.w*r.h),a+w/2,b2+h/2+(r.name?10:0));});
  x.lineCap='round';x.lineJoin='round';state.walls.forEach(w=>{const[x1,y1]=T(w.x1,w.y1),[x2,y2]=T(w.x2,w.y2);x.strokeStyle='#2a2f37';x.lineWidth=Math.max((w.t||defaultWallT)*E,3);x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();});
  state.openings.forEach(o=>{const wt=Math.max((o.t||defaultWallT)*E,3),[cx,cy]=T(o.x,o.y);x.save();x.translate(cx,cy);x.rotate(o.angle);const wp=o.width*E;x.fillStyle='#fff';x.fillRect(-wp/2-1,-wt/2-1,wp+2,wt+1);x.strokeStyle='#2a2f37';x.lineWidth=2;x.beginPath();x.moveTo(-wp/2,-wt/2);x.lineTo(-wp/2,wt/2);x.moveTo(wp/2,-wt/2);x.lineTo(wp/2,wt/2);x.stroke();if(o.type==='window'){x.strokeStyle='#3a7099';x.beginPath();x.moveTo(-wp/2,0);x.lineTo(wp/2,0);x.stroke();}else{const hinge=o.hinge||-1,flip=o.flip||1;if(o.subtype==='correr'){const off=Math.max(wt*0.3,3),pw=wp*0.55;x.lineWidth=Math.max(wt*0.5,4);x.lineCap='butt';x.beginPath();x.moveTo(-wp/2,-off);x.lineTo(-wp/2+pw,-off);x.stroke();x.beginPath();x.moveTo(wp/2-pw,off);x.lineTo(wp/2,off);x.stroke();x.lineWidth=1;x.beginPath();x.moveTo(-wp/2,0);x.lineTo(wp/2,0);x.stroke();x.lineCap='round';}else if(o.subtype==='dupla'){[[-wp/2,wp/2],[wp/2,-wp/2]].forEach(p=>{const hx=p[0],tx=p[1],w=Math.abs(tx-hx),tipY=flip*w;x.beginPath();x.moveTo(hx,0);x.lineTo(hx,tipY);x.stroke();const a1=Math.atan2(tipY,0),a2=Math.atan2(0,tx-hx);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;x.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18;i===0?x.moveTo(hx+Math.cos(a)*w,Math.sin(a)*w):x.lineTo(hx+Math.cos(a)*w,Math.sin(a)*w);}x.stroke();});}else{const hx=hinge*(wp/2),tx=-hx,w=Math.abs(tx-hx),tipY=flip*w;x.beginPath();x.moveTo(hx,0);x.lineTo(hx,tipY);x.stroke();const a1=Math.atan2(tipY,0),a2=Math.atan2(0,tx-hx);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;x.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18,px2=hx+Math.cos(a)*w,py2=Math.sin(a)*w;i===0?x.moveTo(px2,py2):x.lineTo(px2,py2);}x.stroke();}}x.restore();});
  state.furniture.forEach(f=>{const[cx,cy]=T(f.x,f.y);x.save();x.translate(cx,cy);x.rotate(f.angle||0);drawFurnitureShape(x,f.kind,f.w*E,f.h*E,1.5);x.restore();if(f.label){const[lx,ly]=T(f.x,f.y+f.h/2+0.16);x.font="500 10px Inter";x.fillStyle='#777';x.textAlign='center';x.textBaseline='top';x.fillText(f.label,lx,ly);}});
  (state.measures||[]).forEach(m=>{const[s1x,s1y]=T(m.x1,m.y1),[s2x,s2y]=T(m.x2,m.y2);x.strokeStyle='#c25d3a';x.lineWidth=1.5;x.beginPath();x.moveTo(s1x,s1y);x.lineTo(s2x,s2y);x.stroke();x.font="600 11px monospace";x.fillStyle='#c25d3a';x.textAlign='center';x.textBaseline='middle';x.fillText(fmt(Math.hypot(m.x2-m.x1,m.y2-m.y1)),(s1x+s2x)/2,(s1y+s2y)/2);});
  if(showMeasures)state.walls.forEach(w=>{if(w.measureHidden)return;const len=Math.hypot(w.x2-w.x1,w.y2-w.y1);if(len<0.05)return;const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2,ang=Math.atan2(w.y2-w.y1,w.x2-w.x1),off=(w.measureOffset??((w.t||defaultWallT)/2+0.18)),[lx,ly]=T(mx+Math.sin(ang)*off,my-Math.cos(ang)*off);x.font="600 11px monospace";x.fillStyle='#2a2f37';x.textAlign='center';x.textBaseline='middle';x.fillText(fmt(len),lx,ly);});
  state.texts.forEach(t=>{x.font=`600 ${t.size||14}px Inter`;const tw=x.measureText(t.text).width,th=t.size||14,[cx,cy]=T(t.x+tw/E/2,t.y+th/E/2);x.save();x.translate(cx,cy);x.rotate(t.angle||0);x.fillStyle='#2a2f37';x.textAlign='center';x.textBaseline='middle';x.fillText(t.text,0,0);x.restore();});
  x.font="700 16px Inter";x.fillStyle='#1d2530';x.textAlign='left';x.textBaseline='top';x.fillText(document.getElementById('projName').value||'Planta baixa',12,12);
  return tmp.toDataURL('image/png');}
