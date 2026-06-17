"use strict";
//==================== ACTIONS ====================
let savedFileHandle=null; // handle do arquivo escolhido (Abrir/Salvar) — reaproveitado pra salvar sem perguntar de novo
document.getElementById('btnNew').onclick=()=>{if(confirm('Começar um projeto novo? O desenho atual será apagado.')){pushHistory();state.walls=[];state.openings=[];state.rooms=[];state.furniture=[];state.texts=[];sel=null;document.getElementById('projName').value='Projeto sem título';savedFileHandle=null;draw();afterChange();renderProps();}};
document.getElementById('btnSave').onclick=async()=>{
  const data={app:'planta-baixa',v:2,name:document.getElementById('projName').value,defaultWallT,state,zoom,panX,panY};
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
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
};
function loadProjectData(text){
  try{const d=JSON.parse(text);pushHistory();Object.assign(state,d.state);if(d.defaultWallT)defaultWallT=d.defaultWallT;document.getElementById('projName').value=d.name||'Projeto';if(d.zoom){zoom=d.zoom;panX=d.panX;panY=d.panY;updateZoom();}sel=null;buildConstr();draw();afterChange();renderProps();hideWelcome();}
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
document.getElementById('btnPng').onclick=()=>{const url=renderExport(2.2);const a=document.createElement('a');a.href=url;a.download=(document.getElementById('projName').value||'planta').replace(/\s+/g,'_')+'.png';a.click();};
document.getElementById('btnPrint').onclick=()=>{const url=renderExport(2.2);const w=window.open('');w.document.write(`<html><head><title>${document.getElementById('projName').value}</title></head><body style="margin:0;text-align:center"><img src="${url}" style="max-width:100%"><scr`+`ipt>onload=()=>print()</scr`+`ipt></body></html>`);w.document.close();};

function bounds(){let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity,any=false;const ext=(x,y)=>{any=true;mnx=Math.min(mnx,x);mny=Math.min(mny,y);mxx=Math.max(mxx,x);mxy=Math.max(mxy,y);};
  state.walls.forEach(w=>{ext(w.x1,w.y1);ext(w.x2,w.y2);});state.rooms.forEach(r=>{ext(r.x,r.y);ext(r.x+r.w,r.y+r.h);});state.furniture.forEach(f=>{ext(f.x-f.w/2,f.y-f.h/2);ext(f.x+f.w/2,f.y+f.h/2);});state.texts.forEach(t=>ext(t.x,t.y));state.openings.forEach(o=>ext(o.x,o.y));
  if(!any)return null;return{mnx,mny,mxx,mxy};}
function renderExport(q){const b=bounds(),pad=1,tmp=document.createElement('canvas');
  const bw=(b?(b.mxx-b.mnx):8)+pad*2,bh=(b?(b.mxy-b.mny):6)+pad*2,px=Math.min(2800,Math.max(900,bw*PPM*q)),scale=px/(bw*PPM);
  tmp.width=bw*PPM*scale;tmp.height=bh*PPM*scale;const x=tmp.getContext('2d'),E=PPM*scale,ox=(-(b?b.mnx:0)+pad)*E,oy=(-(b?b.mny:0)+pad)*E,T=(a,b2)=>[a*E+ox,b2*E+oy];
  x.fillStyle='#fff';x.fillRect(0,0,tmp.width,tmp.height);
  computeFloors().forEach(poly=>{x.fillStyle='#d9dbd5';x.beginPath();poly.forEach((p,i)=>{const[a,b2]=T(p.x,p.y);i?x.lineTo(a,b2):x.moveTo(a,b2);});x.closePath();x.fill();});
  state.rooms.forEach(r=>{const[a,b2]=T(r.x,r.y),w=r.w*E,h=r.h*E;x.fillStyle=hexA(r.color||'#4a90c2',0.13);x.fillRect(a,b2,w,h);x.strokeStyle=hexA(r.color||'#4a90c2',0.7);x.lineWidth=1.5;x.strokeRect(a,b2,w,h);x.textAlign='center';x.textBaseline='middle';if(r.name){x.font="700 14px Inter,sans-serif";x.fillStyle='#2a2f37';x.fillText(r.name,a+w/2,b2+h/2-8);}x.font="600 11px monospace";x.fillStyle=r.color;x.fillText(fmtA(r.w*r.h),a+w/2,b2+h/2+(r.name?10:0));});
  x.lineCap='round';x.lineJoin='round';state.walls.forEach(w=>{const[x1,y1]=T(w.x1,w.y1),[x2,y2]=T(w.x2,w.y2);x.strokeStyle='#2a2f37';x.lineWidth=Math.max((w.t||defaultWallT)*E,3);x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();});
  state.openings.forEach(o=>{const wt=Math.max((o.t||defaultWallT)*E,3),[cx,cy]=T(o.x,o.y);x.save();x.translate(cx,cy);x.rotate(o.angle);const wp=o.width*E;x.fillStyle='#fff';x.fillRect(-wp/2-1,-wt/2-1,wp+2,wt+1);x.strokeStyle='#2a2f37';x.lineWidth=2;x.beginPath();x.moveTo(-wp/2,-wt/2);x.lineTo(-wp/2,wt/2);x.moveTo(wp/2,-wt/2);x.lineTo(wp/2,wt/2);x.stroke();if(o.type==='window'){x.strokeStyle='#3a7099';x.beginPath();x.moveTo(-wp/2,0);x.lineTo(wp/2,0);x.stroke();}else{const hinge=o.hinge||-1,flip=o.flip||1;if(o.subtype==='correr'){const off=Math.max(wt*0.3,3),pw=wp*0.55;x.lineWidth=Math.max(wt*0.5,4);x.lineCap='butt';x.beginPath();x.moveTo(-wp/2,-off);x.lineTo(-wp/2+pw,-off);x.stroke();x.beginPath();x.moveTo(wp/2-pw,off);x.lineTo(wp/2,off);x.stroke();x.lineWidth=1;x.beginPath();x.moveTo(-wp/2,0);x.lineTo(wp/2,0);x.stroke();x.lineCap='round';}else if(o.subtype==='dupla'){[[-wp/2,wp/2],[wp/2,-wp/2]].forEach(p=>{const hx=p[0],tx=p[1],w=Math.abs(tx-hx),tipY=flip*w;x.beginPath();x.moveTo(hx,0);x.lineTo(hx,tipY);x.stroke();const a1=Math.atan2(tipY,0),a2=Math.atan2(0,tx-hx);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;x.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18;i===0?x.moveTo(hx+Math.cos(a)*w,Math.sin(a)*w):x.lineTo(hx+Math.cos(a)*w,Math.sin(a)*w);}x.stroke();});}else{const hx=hinge*(wp/2),tx=-hx,w=Math.abs(tx-hx),tipY=flip*w;x.beginPath();x.moveTo(hx,0);x.lineTo(hx,tipY);x.stroke();const a1=Math.atan2(tipY,0),a2=Math.atan2(0,tx-hx);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;x.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18,px2=hx+Math.cos(a)*w,py2=Math.sin(a)*w;i===0?x.moveTo(px2,py2):x.lineTo(px2,py2);}x.stroke();}}x.restore();});
  state.furniture.forEach(f=>{const[cx,cy]=T(f.x,f.y);x.save();x.translate(cx,cy);x.rotate(f.angle||0);const w=f.w*E,h=f.h*E;x.strokeStyle='#3a4350';x.fillStyle=f.kind==='pilar'?'#cdd2cb':'#fff';x.lineWidth=1.5;x.fillRect(-w/2,-h/2,w,h);x.strokeRect(-w/2,-h/2,w,h);x.restore();if(f.label){const[lx,ly]=T(f.x,f.y+f.h/2+0.16);x.font="500 10px Inter";x.fillStyle='#777';x.textAlign='center';x.textBaseline='top';x.fillText(f.label,lx,ly);}});
  state.walls.forEach(w=>{const len=Math.hypot(w.x2-w.x1,w.y2-w.y1);if(len<0.05)return;const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2,ang=Math.atan2(w.y2-w.y1,w.x2-w.x1),off=(w.t||defaultWallT)/2+0.18,[lx,ly]=T(mx+Math.sin(ang)*off,my-Math.cos(ang)*off);x.font="600 11px monospace";x.fillStyle='#2a2f37';x.textAlign='center';x.textBaseline='middle';x.fillText(fmt(len),lx,ly);});
  state.texts.forEach(t=>{const[a,b2]=T(t.x,t.y);x.font=`600 ${t.size||14}px Inter`;x.fillStyle='#2a2f37';x.textAlign='left';x.textBaseline='top';x.fillText(t.text,a,b2);});
  x.font="700 16px Inter";x.fillStyle='#1d2530';x.textAlign='left';x.textBaseline='top';x.fillText(document.getElementById('projName').value||'Planta baixa',12,12);
  return tmp.toDataURL('image/png');}
