"use strict";
//==================== STATUS / ZOOM ====================
function afterChange(){document.getElementById('counts').textContent=`${state.walls.length} paredes · ${state.rooms.length} cômodos · ${state.openings.length} portas/janelas · ${state.furniture.length} móveis`;}
function updateZoom(){document.getElementById('zoomLbl').textContent=Math.round(zoom*100)+'%';}
document.getElementById('snapChk').onchange=e=>{snapOn=e.target.checked;};
document.getElementById('zoomIn').onclick=()=>zoomAt(1.2);document.getElementById('zoomOut').onclick=()=>zoomAt(1/1.2);
function zoomAt(f){const cx=W/2,cy=H/2,[wx,wy]=toWorld(cx,cy);zoom=Math.max(0.15,Math.min(8,zoom*f));panX=cx-wx*scl();panY=cy-wy*scl();updateZoom();draw();}
document.getElementById('zoomFit').onclick=fitView;
function fitView(){const b=bounds();if(!b){zoom=1;panX=W/2-4*PPM;panY=H/2-3*PPM;updateZoom();draw();return;}const pad=70,bw=(b.mxx-b.mnx)*PPM,bh=(b.mxy-b.mny)*PPM;zoom=Math.max(0.15,Math.min(4,Math.min((W-pad*2)/bw,(H-pad*2)/bh)));panX=W/2-((b.mnx+b.mxx)/2)*scl();panY=H/2-((b.mny+b.mxy)/2)*scl();updateZoom();draw();}
