"use strict";
//==================== CUSTOM FURNITURE (imagens enviadas pelo usuário) ====================
const CUSTOM_FURNITURE_KEY='planta2d:customFurniture';
let customFurniture=[];
try{customFurniture=JSON.parse(localStorage.getItem(CUSTOM_FURNITURE_KEY)||'[]');}catch{customFurniture=[];}
const CUSTOM_FURNITURE_KINDS=new Set(customFurniture.map(it=>it.kind));
customFurniture.forEach(it=>{FURNITURE_IMAGES[it.kind]=[it.dataUrl];});
function saveCustomFurniture(){
  try{localStorage.setItem(CUSTOM_FURNITURE_KEY,JSON.stringify(customFurniture));}
  catch(e){customAlert('Não foi possível salvar a imagem no navegador (ela pode ser grande demais). O item vai funcionar nesta sessão, mas pode não aparecer depois de recarregar a página.');}
}
function preloadFurnitureImage(url){
  return new Promise(resolve=>{
    const cache=getFurnitureImage(url,()=>resolve(cache));
    if(cache.loaded||cache.failed)resolve(cache);
  });
}
function addCustomFurnitureItem(label,w,h,dataUrl){
  const kind='custom_'+newId();
  customFurniture.push({kind,label,w,h,dataUrl});
  CUSTOM_FURNITURE_KINDS.add(kind);
  FURNITURE_IMAGES[kind]=[dataUrl];
  saveCustomFurniture();
  return kind;
}
function removeCustomFurnitureItem(kind){
  customFurniture=customFurniture.filter(it=>it.kind!==kind);
  CUSTOM_FURNITURE_KINDS.delete(kind);
  delete FURNITURE_IMAGES[kind];
  saveCustomFurniture();
}
