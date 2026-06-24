"use strict";
//==================== STATUS / ZOOM ====================
function afterChange(){
  document.getElementById('counts').textContent=`${state.walls.length} paredes · ${state.rooms.length} cômodos · ${state.openings.length} portas/janelas · ${state.furniture.length} móveis · ${(state.measures||[]).length} medidas`;
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
}
function updateZoom(){document.getElementById('zoomLbl').textContent=Math.round(zoom*100)+'%';}
const snapChk=document.getElementById('snapChk');
if(snapChk){snapChk.checked=snapOn;snapChk.onchange=e=>{snapOn=e.target.checked;localStorage.setItem('planta2d:snapOn',snapOn?'1':'0');};}
const measureChk=document.getElementById('measureChk');
if(measureChk){measureChk.checked=showMeasures;measureChk.onchange=e=>{showMeasures=e.target.checked;localStorage.setItem('planta2d:showMeasures',showMeasures?'1':'0');draw();renderProps();};}
const guidesChk=document.getElementById('guidesChk');
if(guidesChk){guidesChk.checked=guidesOn;guidesChk.onchange=e=>{guidesOn=e.target.checked;localStorage.setItem('planta2d:guidesOn',guidesOn?'1':'0');};}
const gridEyeBtn=document.getElementById('gridEyeBtn');
if(gridEyeBtn){
  const syncEye=()=>{gridEyeBtn.classList.toggle('off',!gridOn);const sl=gridEyeBtn.querySelector('.eyeSlash');if(sl)sl.style.display=gridOn?'none':'';};
  syncEye();
  gridEyeBtn.onclick=()=>{gridOn=!gridOn;localStorage.setItem('planta2d:gridOn',gridOn?'1':'0');syncEye();draw();};
}
const bgSwatches=document.getElementById('bgSwatches');
if(bgSwatches){
  const renderBgSwatches=()=>{bgSwatches.innerHTML=Object.keys(CANVAS_BG_THEMES).map(k=>`<span data-v="${k}" class="${k===canvasBg?'sel':''}" style="background:${CANVAS_BG_THEMES[k].swatch}"></span>`).join('');
    bgSwatches.querySelectorAll('span').forEach(s=>s.onclick=()=>{canvasBg=s.dataset.v;localStorage.setItem('planta2d:canvasBg',canvasBg);renderBgSwatches();draw();});};
  renderBgSwatches();
}
document.getElementById('zoomIn').onclick=()=>zoomAt(1.2);document.getElementById('zoomOut').onclick=()=>zoomAt(1/1.2);
function zoomAt(f){const cx=W/2,cy=H/2,[wx,wy]=toWorld(cx,cy);zoom=Math.max(0.15,Math.min(8,zoom*f));panX=cx-wx*scl();panY=cy-wy*scl();updateZoom();draw();}
document.getElementById('zoomFit').onclick=fitView;
function fitView(){const b=bounds();if(!b){zoom=1;panX=W/2-4*PPM;panY=H/2-3*PPM;updateZoom();draw();return;}const pad=70,bw=(b.mxx-b.mnx)*PPM,bh=(b.mxy-b.mny)*PPM;zoom=Math.max(0.15,Math.min(4,Math.min((W-pad*2)/bw,(H-pad*2)/bh)));panX=W/2-((b.mnx+b.mxx)/2)*scl();panY=H/2-((b.mny+b.mxy)/2)*scl();updateZoom();draw();}
