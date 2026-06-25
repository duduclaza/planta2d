"use strict";
//==================== MODAL (substitui prompt/confirm/alert do navegador) ====================
function ensureCustomModal(){
  let modal=document.getElementById('customModal');
  if(!modal){modal=document.createElement('div');modal.id='customModal';modal.className='namePrompt';document.body.appendChild(modal);}
  return modal;
}
function showFormModal({title,message,fields,okText,cancelText,danger}){
  fields=fields||[];
  return new Promise(resolve=>{
    const modal=ensureCustomModal();
    const fieldsHtml=fields.map((f,i)=>{
      if(f.type==='select'){
        const opts=(f.options||[]).map(o=>{const[v,l]=Array.isArray(o)?o:[o,o];return `<option value="${String(v).replace(/"/g,'&quot;')}" ${v===f.value?'selected':''}>${l}</option>`;}).join('');
        return `<div class="prow"><label>${f.label}</label><select id="modalField${i}">${opts}</select></div>`;
      }
      return `<div class="prow"><label>${f.label}</label><div class="unit" data-u="${f.suffix||''}"><input type="${f.type||'text'}" id="modalField${i}" value="${(f.value??'').toString().replace(/"/g,'&quot;')}"></div></div>`;
    }).join('');
    modal.innerHTML=`<div class="namecard">
      <h3>${title}</h3>
      ${message?`<p>${message}</p>`:''}
      ${fieldsHtml}
      <div class="nameactions">
        ${cancelText!==null?`<button class="hbtn" id="modalCancel">${cancelText||'Cancelar'}</button>`:''}
        <button class="hbtn ${danger?'danger':'primary'}" id="modalOk">${okText||'OK'}</button>
      </div>
    </div>`;
    modal.classList.add('show');
    const inputs=fields.map((_,i)=>document.getElementById('modalField'+i));
    const close=v=>{modal.classList.remove('show');modal.onkeydown=null;resolve(v);};
    const cancelBtn=document.getElementById('modalCancel');
    if(cancelBtn)cancelBtn.onclick=()=>close(null);
    document.getElementById('modalOk').onclick=()=>{
      const values=fields.map((f,i)=>{
        const raw=inputs[i].value;
        if(f.type==='number'){const n=parseFloat(String(raw).replace(',','.'));return isNaN(n)?(f.value??0):n;}
        return raw;
      });
      close(fields.length?values:true);
    };
    modal.onkeydown=e=>{
      if(e.key==='Enter'){e.preventDefault();document.getElementById('modalOk').click();}
      if(e.key==='Escape')close(null);
    };
    setTimeout(()=>{if(inputs[0]){inputs[0].focus();if(inputs[0].select)inputs[0].select();}else document.getElementById('modalOk').focus();},30);
  });
}
function customForm(title,fields,opts){
  return showFormModal({title,fields,message:opts&&opts.message,okText:opts&&opts.okText,cancelText:opts&&opts.cancelText});
}
function customConfirm(message,opts){
  opts=opts||{};
  return showFormModal({title:opts.title||'Confirmar',message,fields:[],okText:opts.okText||'Confirmar',cancelText:opts.cancelText||'Cancelar',danger:opts.danger}).then(v=>v===true);
}
function customAlert(message,opts){
  opts=opts||{};
  return showFormModal({title:opts.title||'Aviso',message,fields:[],okText:'OK',cancelText:null});
}
