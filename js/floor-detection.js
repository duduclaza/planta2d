"use strict";
//==================== FLOOR DETECTION (closed loops -> gray floor) ====================
function clusterNodes(){const eps=0.07,nodes=[];
  const nodeFor=(x,y)=>{for(let i=0;i<nodes.length;i++)if(Math.hypot(nodes[i].x-x,nodes[i].y-y)<eps)return i;nodes.push({x,y});return nodes.length-1;};
  const edges=[];for(const w of state.walls){const a=nodeFor(w.x1,w.y1),b=nodeFor(w.x2,w.y2);if(a!==b)edges.push({a,b});}
  return{nodes,edges};}
function computeFloors(){const{nodes,edges}=clusterNodes();if(edges.length<3)return[];
  const half=[];edges.forEach(e=>{half.push({from:e.a,to:e.b});half.push({from:e.b,to:e.a});});
  const byNode={},twin={};
  half.forEach((h,i)=>{h.ang=Math.atan2(nodes[h.to].y-nodes[h.from].y,nodes[h.to].x-nodes[h.from].x);(byNode[h.from]=byNode[h.from]||[]).push(i);});
  for(const k in byNode)byNode[k].sort((i,j)=>half[i].ang-half[j].ang);
  for(let i=0;i<edges.length;i++){twin[2*i]=2*i+1;twin[2*i+1]=2*i;}
  const seen=new Array(half.length).fill(false),faces=[];
  for(let s=0;s<half.length;s++){if(seen[s])continue;const face=[];let h=s,guard=0;
    do{seen[h]=true;face.push(half[h].from);const t=twin[h],node=half[t].from,lst=byNode[node],idx=lst.indexOf(t);h=lst[(idx-1+lst.length)%lst.length];}while(h!==s&&guard++<20000);
    if(face.length<3)continue;const pts=face.map(n=>nodes[n]);let area=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];area+=p.x*q.y-q.x*p.y;}area/=2;
    if(area>0.08)faces.push(pts);}
  return faces;}
function drawFloor(poly){c.fillStyle='#d9dbd5';c.beginPath();poly.forEach((p,i)=>{const[x,y]=toScreen(p.x,p.y);i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.fill();}
