"use strict";
//==================== REMOÇÃO DE FUNDO (heurística por cor) ====================
function loadImageFromDataUrl(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=dataUrl;
  });
}
function imageToCanvas(img){
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
  canvas.getContext('2d').drawImage(img,0,0);
  return canvas;
}
function detectBackgroundColor(canvas){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const data=ctx.getImageData(0,0,w,h).data;
  const samples=[];
  const step=Math.max(1,Math.floor(Math.min(w,h)/60));
  const push=(x,y)=>{const i=(y*w+x)*4;samples.push([data[i],data[i+1],data[i+2]]);};
  for(let x=0;x<w;x+=step){push(x,0);push(x,h-1);}
  for(let y=0;y<h;y+=step){push(0,y);push(w-1,y);}
  const avg=samples.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]).map(v=>v/samples.length);
  const variance=samples.reduce((a,c)=>a+((c[0]-avg[0])**2+(c[1]-avg[1])**2+(c[2]-avg[2])**2),0)/samples.length;
  return{color:avg,uniform:variance<1100};
}
function removeBackgroundByColor(canvas,bgColor,tolerance){
  tolerance=tolerance||38;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const imgData=ctx.getImageData(0,0,w,h),data=imgData.data;
  const visited=new Uint8Array(w*h),removed=new Uint8Array(w*h);
  const dist=i=>{const dr=data[i]-bgColor[0],dg=data[i+1]-bgColor[1],db=data[i+2]-bgColor[2];return Math.sqrt(dr*dr+dg*dg+db*db);};
  const stack=[];
  const tryPush=(x,y)=>{
    if(x<0||y<0||x>=w||y>=h)return;
    const idx=y*w+x;if(visited[idx])return;visited[idx]=1;
    if(dist(idx*4)<=tolerance)stack.push(idx);
  };
  for(let x=0;x<w;x++){tryPush(x,0);tryPush(x,h-1);}
  for(let y=0;y<h;y++){tryPush(0,y);tryPush(w-1,y);}
  while(stack.length){
    const idx=stack.pop(),x=idx%w,y=(idx-x)/w;
    data[idx*4+3]=0;removed[idx]=1;
    tryPush(x-1,y);tryPush(x+1,y);tryPush(x,y-1);tryPush(x,y+1);
  }
  const feather=tolerance*1.6;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const idx=y*w+x;if(removed[idx])continue;
    const edge=(x>0&&removed[idx-1])||(x<w-1&&removed[idx+1])||(y>0&&removed[idx-w])||(y<h-1&&removed[idx+w]);
    if(!edge)continue;
    const d=dist(idx*4);
    if(d<feather){
      const alpha=Math.max(0,Math.min(1,(d-tolerance)/(feather-tolerance)));
      data[idx*4+3]=Math.round(data[idx*4+3]*alpha);
    }
  }
  ctx.putImageData(imgData,0,0);
  return canvas;
}
async function maybeRemoveBackground(dataUrl){
  try{
    const img=await loadImageFromDataUrl(dataUrl);
    const canvas=imageToCanvas(img);
    const{color,uniform}=detectBackgroundColor(canvas);
    if(!uniform)return dataUrl;
    const swatch=`rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;
    if(!confirm(`Detectamos um fundo de cor sólida nessa imagem (${swatch}). Remover o fundo automaticamente?`))return dataUrl;
    removeBackgroundByColor(canvas,color);
    return canvas.toDataURL('image/png');
  }catch(e){console.warn('Falha ao tentar remover o fundo',e);return dataUrl;}
}
