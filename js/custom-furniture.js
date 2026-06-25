"use strict";
//==================== CUSTOM FURNITURE (imagens enviadas pelo usuário, guardadas no servidor) ====================
let customFurniture=[];
const CUSTOM_FURNITURE_KINDS=new Set();

async function loadCustomFurniture(){
  try{
    const data=await apiJson('/api/custom-furniture');
    customFurniture=(data.items||[]).map(it=>({kind:it.kind,label:it.label,w:it.w,h:it.h,category:it.category,dataUrl:it.image_url}));
    CUSTOM_FURNITURE_KINDS.clear();
    customFurniture.forEach(it=>{CUSTOM_FURNITURE_KINDS.add(it.kind);FURNITURE_IMAGES[it.kind]=[it.dataUrl];});
    if(typeof buildFurni==='function')buildFurni();
  }catch(e){console.warn('Não foi possível carregar sua biblioteca de imagens.',e);}
}
function clearCustomFurniture(){
  customFurniture.forEach(it=>{CUSTOM_FURNITURE_KINDS.delete(it.kind);delete FURNITURE_IMAGES[it.kind];});
  customFurniture=[];
  if(typeof buildFurni==='function')buildFurni();
}
function preloadFurnitureImage(url){
  return new Promise(resolve=>{
    const cache=getFurnitureImage(url,()=>resolve(cache));
    if(cache.loaded||cache.failed)resolve(cache);
  });
}
async function addCustomFurnitureItem(label,w,h,dataUrl,category){
  try{
    const data=await apiJson('/api/custom-furniture',{method:'POST',body:JSON.stringify({label,w,h,category,data_url:dataUrl})});
    const it={kind:data.item.kind,label:data.item.label,w:data.item.w,h:data.item.h,category:data.item.category,dataUrl:data.item.image_url};
    customFurniture.push(it);
    CUSTOM_FURNITURE_KINDS.add(it.kind);
    FURNITURE_IMAGES[it.kind]=[it.dataUrl];
    return it.kind;
  }catch(e){
    await customAlert('Não foi possível salvar a imagem no servidor: '+(e.message||'erro desconhecido'));
    return null;
  }
}
async function updateCustomFurnitureItem(kind,label,w,h,category){
  try{
    const data=await apiJson('/api/custom-furniture/'+encodeURIComponent(kind),{method:'PATCH',body:JSON.stringify({label,w,h,category})});
    const it=customFurniture.find(c=>c.kind===kind);
    if(it){it.label=data.item.label;it.w=data.item.w;it.h=data.item.h;it.category=data.item.category;}
    return true;
  }catch(e){
    await customAlert('Não foi possível salvar as alterações: '+(e.message||'erro desconhecido'));
    return false;
  }
}
async function removeCustomFurnitureItem(kind){
  try{await apiJson('/api/custom-furniture/'+encodeURIComponent(kind),{method:'DELETE'});}
  catch(e){await customAlert('Não foi possível remover a imagem: '+(e.message||'erro desconhecido'));return;}
  customFurniture=customFurniture.filter(it=>it.kind!==kind);
  CUSTOM_FURNITURE_KINDS.delete(kind);
  delete FURNITURE_IMAGES[kind];
}
