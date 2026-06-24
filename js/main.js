"use strict";
//==================== WELCOME / INIT ====================
function hideWelcome(){document.getElementById('welcome').style.display='none';}
function wantsWelcomeHidden(){return localStorage.getItem('planta2d:hideWelcome')==='1';}
function maybeShowWelcome(){
  const welcome=document.getElementById('welcome');
  const chk=document.getElementById('hideWelcomeChk');
  if(chk)chk.checked=wantsWelcomeHidden();
  if(welcome)welcome.style.display=wantsWelcomeHidden()?'none':'flex';
}
function showProjectChoice(){
  if(typeof showEditorView==='function')showEditorView();
  maybeShowWelcome();
  if(typeof setTool==='function')setTool('select');
}
const hideWelcomeChk=document.getElementById('hideWelcomeChk');
if(hideWelcomeChk){
  hideWelcomeChk.checked=wantsWelcomeHidden();
  hideWelcomeChk.onchange=e=>{
    if(e.target.checked)localStorage.setItem('planta2d:hideWelcome','1');
    else localStorage.removeItem('planta2d:hideWelcome');
  };
}
document.getElementById('startBtn').onclick=async()=>{
  const chk=document.getElementById('hideWelcomeChk');
  if(chk&&chk.checked)localStorage.setItem('planta2d:hideWelcome','1');
  if(typeof ensureProjectName==='function'&&!(await ensureProjectName()))return;
  hideWelcome();document.querySelectorAll('.libtab')[0].click();setTool('select');
};
const openExistingBtn=document.getElementById('openExistingBtn');
if(openExistingBtn)openExistingBtn.onclick=async()=>{
  const chk=document.getElementById('hideWelcomeChk');
  if(chk&&chk.checked)localStorage.setItem('planta2d:hideWelcome','1');
  if(typeof showMyProjects==='function')await showMyProjects();
};
function init(){resize();panX=W/2-5*PPM;panY=H/2-4*PPM;buildConstr();buildFurni();setTool('select');updateZoom();afterChange();renderProps();draw();maybeShowWelcome();if(typeof enableAutoSave==='function')enableAutoSave();}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});
else init();
