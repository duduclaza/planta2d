"use strict";
//==================== WELCOME / INIT ====================
function hideWelcome(){document.getElementById('welcome').style.display='none';}
document.getElementById('startBtn').onclick=()=>{hideWelcome();document.querySelectorAll('.libtab')[0].click();setTool('wall');};
function init(){resize();panX=W/2-5*PPM;panY=H/2-4*PPM;buildConstr();buildFurni();setTool('select');updateZoom();afterChange();renderProps();draw();}
window.addEventListener('load',init);init();
