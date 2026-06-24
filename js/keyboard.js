"use strict";
//==================== KEYBOARD ====================
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(e.code==='Space'){spaceDown=true;mainC.style.cursor='grab';}
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();renderProps();return;}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='z'))){e.preventDefault();redo();renderProps();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&sel){e.preventDefault();duplicateSelection();return;}
  if(e.key==='Enter'&&tool==='wall'){finishWall();return;}
  if(e.key==='Escape'){wallChain=[];measureA=null;roomStart=null;sel=null;multiSel=[];draw();renderProps();return;}
  if((e.key==='Delete'||e.key==='Backspace')&&sel){pushHistory();deleteSel();return;}
  if(sel&&(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight')&&(sel.kind==='furniture'||sel.kind==='text'||sel.kind==='room')){
    e.preventDefault();const o=ent(sel);if(!o)return;if(o.locked){setHint('Item travado.');return;}
    const step=e.shiftKey?0.25:0.05;
    let dx=0,dy=0;if(e.key==='ArrowUp')dy=-step;else if(e.key==='ArrowDown')dy=step;else if(e.key==='ArrowLeft')dx=-step;else dx=step;
    pushHistory();o.x+=dx;o.y+=dy;if(sel.kind==='room')syncRoomWalls(o);
    draw();afterChange();renderProps();return;}
  const t=TOOLS.find(t=>t[2].toLowerCase()===e.key.toLowerCase());if(t)setTool(t[0]);});
window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;mainC.style.cursor='';}});
