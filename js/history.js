"use strict";
//==================== HISTORY ====================
function snapshot(){return JSON.stringify(state);}
function pushHistory(){history.push(snapshot());if(history.length>80)history.shift();future=[];}
function restore(s){const o=JSON.parse(s);Object.assign(state,o);sel=null;}
function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());draw();afterChange();}
function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());draw();afterChange();}
