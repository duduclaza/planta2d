"use strict";
//==================== DRAW ====================
function draw(){drawGrid();drawMain();}
function fmt(m){return m.toFixed(2).replace('.',',')+' m';}
function fmtA(a){return a.toFixed(2).replace('.',',')+' m²';}

function drawGrid(){g.clearRect(0,0,W,H);g.fillStyle='#fbfaf6';g.fillRect(0,0,W,H);
  const [wx0,wy0]=toWorld(0,0),[wx1,wy1]=toWorld(W,H),minor=0.5;
  g.lineWidth=1;
  for(let x=Math.floor(wx0/minor)*minor;x<=wx1;x+=minor){const [sx]=toScreen(x,0);const mj=Math.abs(x%1)<1e-6;g.strokeStyle=mj?'#d2d6cf':'#e7e9e4';g.beginPath();g.moveTo(sx,0);g.lineTo(sx,H);g.stroke();}
  for(let y=Math.floor(wy0/minor)*minor;y<=wy1;y+=minor){const [,sy]=toScreen(0,y);const mj=Math.abs(y%1)<1e-6;g.strokeStyle=mj?'#d2d6cf':'#e7e9e4';g.beginPath();g.moveTo(0,sy);g.lineTo(W,sy);g.stroke();}
  const [ox,oy]=toScreen(0,0);g.strokeStyle='#c2b6a3';g.lineWidth=1.5;g.beginPath();g.moveTo(ox,0);g.lineTo(ox,H);g.moveTo(0,oy);g.lineTo(W,oy);g.stroke();}

function drawMain(){c.clearRect(0,0,W,H);
  for(const poly of computeFloors())drawFloor(poly);
  for(const r of state.rooms)drawRoom(r,false);
  for(const w of state.walls)drawWall(w);
  for(const o of state.openings)drawOpening(o);
  for(const f of state.furniture)drawFurniture(f);
  for(const t of state.texts)drawText(t);
  for(const w of state.walls)drawWallLabel(w);
  if(sel)drawSelection();
  if(tool==='wall'&&wallChain.length){const sc=scl();c.strokeStyle='#e08a3c';c.lineWidth=Math.max(defaultWallT*sc,3);c.lineCap='round';c.lineJoin='round';
    c.beginPath();const [px,py]=toScreen(wallChain[0].x,wallChain[0].y);c.moveTo(px,py);
    for(let i=1;i<wallChain.length;i++){const[x,y]=toScreen(wallChain[i].x,wallChain[i].y);c.lineTo(x,y);}
    const sp=snapPoint(mouseW.x,mouseW.y);const[mx,my]=toScreen(sp.x,sp.y);c.lineTo(mx,my);c.stroke();
    const last=wallChain[wallChain.length-1],len=Math.hypot(sp.x-last.x,sp.y-last.y);
    if(len>0.01){const[lx,ly]=toScreen((last.x+sp.x)/2,(last.y+sp.y)/2);chip(lx,ly,fmt(len),'#e08a3c');}
    c.fillStyle='#241402';for(const p of wallChain){const[x,y]=toScreen(p.x,p.y);c.beginPath();c.arc(x,y,4,0,7);c.fill();}}
  if(tool==='measure'&&measureA){const sp=snapPoint(mouseW.x,mouseW.y);drawDim(measureA.x,measureA.y,sp.x,sp.y);}
  if(tool==='room'&&roomStart){const sp=snapPoint(mouseW.x,mouseW.y);const x=Math.min(roomStart.x,sp.x),y=Math.min(roomStart.y,sp.y),w=Math.abs(sp.x-roomStart.x),h=Math.abs(sp.y-roomStart.y);drawRoom({x,y,w,h,name:'',color:'#4a90c2'},true);}}

function drawWall(w){const sc=scl();const[x1,y1]=toScreen(w.x1,w.y1),[x2,y2]=toScreen(w.x2,w.y2);
  c.strokeStyle='#2a2f37';c.lineWidth=Math.max((w.t||defaultWallT)*sc,3);c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function drawWallLabel(w){const len=Math.hypot(w.x2-w.x1,w.y2-w.y1);if(len<0.05)return;
  const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2,ang=Math.atan2(w.y2-w.y1,w.x2-w.x1),off=(w.t||defaultWallT)/2+0.18;
  const[lx,ly]=toScreen(mx+Math.sin(ang)*off,my-Math.cos(ang)*off);chip(lx,ly,fmt(len),'#2a2f37');}
function chip(x,y,txt,color){c.font="600 11px 'JetBrains Mono',monospace";const w=c.measureText(txt).width+10;
  c.fillStyle='rgba(251,250,246,.92)';rr(c,x-w/2,y-9,w,18,5);c.fill();c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y+1);}

function drawOpening(o){const sc=scl(),wt=Math.max((o.t||defaultWallT)*sc,3);const[cx,cy]=toScreen(o.x,o.y);
  c.save();c.translate(cx,cy);c.rotate(o.angle);const wpx=o.width*sc;
  c.fillStyle='#fbfaf6';c.fillRect(-wpx/2-1,-wt/2-1,wpx+2,wt+1);
  c.strokeStyle='#2a2f37';c.lineWidth=2;
  // jambs
  c.beginPath();c.moveTo(-wpx/2,-wt/2);c.lineTo(-wpx/2,wt/2);c.moveTo(wpx/2,-wt/2);c.lineTo(wpx/2,wt/2);c.stroke();
  if(o.type==='window'){
    c.strokeStyle='#3a7099';c.lineWidth=2;
    c.beginPath();c.moveTo(-wpx/2,-wt*0.28);c.lineTo(wpx/2,-wt*0.28);c.moveTo(-wpx/2,wt*0.28);c.lineTo(wpx/2,wt*0.28);c.stroke();
    c.lineWidth=1.4;c.beginPath();c.moveTo(-wpx/2,0);c.lineTo(wpx/2,0);c.stroke();
  } else { drawDoorLeaf(o,wpx); }
  c.restore();}
function drawDoorLeaf(o,wpx){const flip=o.flip||1,hinge=o.hinge||-1;
  c.strokeStyle='#2a2f37';c.lineWidth=2;
  if(o.subtype==='correr'){ // de correr: dois painéis sobrepostos
    const wt=Math.max((o.t||defaultWallT)*scl(),3),off=Math.max(wt*0.3,3),pw=wpx*0.55;c.lineWidth=Math.max(wt*0.5,4);c.lineCap='butt';
    c.beginPath();c.moveTo(-wpx/2,-off);c.lineTo(-wpx/2+pw,-off);c.stroke();
    c.beginPath();c.moveTo(wpx/2-pw,off);c.lineTo(wpx/2,off);c.stroke();
    c.lineWidth=1;c.beginPath();c.moveTo(-wpx/2,0);c.lineTo(wpx/2,0);c.stroke();c.lineWidth=2;c.lineCap='round';return;}
  if(o.subtype==='dupla'){ // two leaves meeting in middle
    leaf(-wpx/2,wpx/2,flip);leaf(wpx/2,-wpx/2,flip);return;}
  // simples
  const hx=hinge*(wpx/2),tx=-hx; leaf(hx,tx,flip);}
function leaf(hingeX,otherX,flip){const w=Math.abs(otherX-hingeX);const tipY=flip*w;
  c.beginPath();c.moveTo(hingeX,0);c.lineTo(hingeX,tipY);c.stroke(); // leaf
  const a1=Math.atan2(tipY,0),a2=Math.atan2(0,otherX-hingeX);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  c.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18,px=hingeX+Math.cos(a)*w,py=Math.sin(a)*w;if(i===0)c.moveTo(px,py);else c.lineTo(px,py);}c.stroke();}

function roomPolygonPoints(r){if(!r.wallIds||r.wallIds.length<3)return null;const pts=[];
  for(const id of r.wallIds){const w=state.walls.find(o=>o.id===id);if(!w)return null;pts.push({x:w.x1,y:w.y1});}
  return pts;}
function drawRoom(r,ghost){const w=r.w*scl(),h=r.h*scl();
  const poly=roomPolygonPoints(r);
  let lx,ly;
  c.fillStyle=hexA(r.color||'#4a90c2',ghost?0.10:0.13);
  c.beginPath();
  if(poly){let cx=0,cy=0;poly.forEach((p,i)=>{const[sx,sy]=toScreen(p.x,p.y);i?c.lineTo(sx,sy):c.moveTo(sx,sy);cx+=p.x;cy+=p.y;});c.closePath();
    [lx,ly]=toScreen(cx/poly.length,cy/poly.length);}
  else{const[x,y]=toScreen(r.x,r.y);c.rect(x,y,w,h);[lx,ly]=[x+w/2,y+h/2];}
  c.fill();
  c.strokeStyle=hexA(r.color||'#4a90c2',ghost?0.5:0.7);c.setLineDash(ghost?[6,4]:[]);c.lineWidth=1.5;c.stroke();c.setLineDash([]);
  if(w>40&&h>26){c.textAlign='center';c.textBaseline='middle';
    if(r.name){c.font="700 14px 'Inter'";c.fillStyle='#2a2f37';c.fillText(r.name,lx,ly-8);}
    c.font="600 11px 'JetBrains Mono'";c.fillStyle=r.color||'#3a7099';c.fillText(fmtA(r.w*r.h),lx,ly+(r.name?10:0));
    if(!ghost){c.font="500 10px 'JetBrains Mono'";c.fillStyle='#93a0b0';c.fillText(r.w.toFixed(2).replace('.',',')+' × '+r.h.toFixed(2).replace('.',','),lx,ly+(r.name?26:16));}}}

function drawText(t){const[x,y]=toScreen(t.x,t.y);c.font=`600 ${t.size||14}px 'Inter'`;c.fillStyle='#2a2f37';c.textAlign='left';c.textBaseline='top';c.fillText(t.text,x,y);}

// Desenho do símbolo 2D de cada móvel em torno da origem local (0,0), sem transformação de mundo —
// usado tanto no canvas principal (drawFurniture) quanto nos ícones da biblioteca (drawLibIcon).
function drawFurnitureShape(ctx,kind,w,h,lineWidth){
  ctx.lineJoin='round';ctx.lineCap='round';
  const stroke='#3a4350',fill='#ffffff',soft='#dfe3df';ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
  const L=-w/2,T=-h/2,R=w/2,B=h/2,mn=Math.min(w,h);
  const box=()=>{ctx.fillStyle=fill;ctx.fillRect(L,T,w,h);ctx.strokeRect(L,T,w,h);};
  const rbox=(rad)=>{ctx.fillStyle=fill;rr(ctx,L,T,w,h,rad);ctx.fill();ctx.stroke();};
  switch(kind){
    case 'cama_casal':case 'cama_solteiro':box();ctx.strokeRect(L+w*0.08,T+h*0.04,w*0.84,h*0.28);if(kind==='cama_casal'){ctx.beginPath();ctx.moveTo(0,T+h*0.04);ctx.lineTo(0,T+h*0.32);ctx.stroke();}ctx.beginPath();ctx.moveTo(L,T+h*0.40);ctx.lineTo(R,T+h*0.40);ctx.stroke();break;
    case 'berco':box();ctx.strokeRect(L+w*0.12,T+h*0.08,w*0.76,h*0.84);break;
    case 'armario':case 'comoda':case 'buffet':box();{const n=kind==='comoda'?2:3;for(let i=1;i<n;i++){ctx.beginPath();ctx.moveTo(L+w*i/n,T);ctx.lineTo(L+w*i/n,B);ctx.stroke();}}break;
    case 'criado':box();ctx.strokeRect(L+3,T+3,w-6,h-6);break;
    case 'sofa':case 'sofa2':rbox(6);ctx.strokeRect(L+6,T+8,w-12,h-12);break;
    case 'poltrona':rbox(8);break;
    case 'mesa_centro':rbox(6);break;
    case 'rack':case 'tv':case 'estante':case 'estante2':box();ctx.fillStyle=soft;ctx.fillRect(L+w*0.3,T+2,w*0.4,4);break;
    case 'mesa_jantar':ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,7);ctx.fill();ctx.stroke();break;
    case 'mesa_cozinha':case 'mesa_ext':rbox(6);break;
    case 'cadeira':case 'cadeira_esc':rbox(5);ctx.beginPath();ctx.moveTo(L+3,T+h*0.3);ctx.lineTo(R-3,T+h*0.3);ctx.stroke();break;
    case 'fogao':box();[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(p=>{ctx.beginPath();ctx.arc(p[0]*w*0.22,p[1]*h*0.22,mn*0.13,0,7);ctx.stroke();});break;
    case 'geladeira':box();ctx.beginPath();ctx.moveTo(L,T+h*0.45);ctx.lineTo(R,T+h*0.45);ctx.stroke();ctx.beginPath();ctx.moveTo(R-5,T+5);ctx.lineTo(R-5,T+h*0.4);ctx.stroke();break;
    case 'micro':box();ctx.strokeRect(L+3,T+3,w*0.62,h-6);break;
    case 'maquina':box();ctx.beginPath();ctx.arc(0,0,mn*0.32,0,7);ctx.stroke();break;
    case 'tanque':rbox(4);ctx.beginPath();ctx.ellipse(0,2,w*0.3,h*0.3,0,0,7);ctx.stroke();break;
    case 'pia_cozinha':case 'bancada':box();ctx.fillStyle=soft;rr(ctx,L+w*0.08,T+h*0.18,w*0.4,h*0.64,4);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(R-w*0.2,0,3,0,7);ctx.stroke();break;
    case 'vaso':ctx.fillStyle=fill;ctx.fillRect(L,T,w,h*0.32);ctx.strokeRect(L,T,w,h*0.32);ctx.beginPath();ctx.ellipse(0,T+h*0.62,w*0.4,h*0.34,0,0,7);ctx.fill();ctx.stroke();break;
    case 'bide':ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(0,0,w*0.42,h*0.42,0,0,7);ctx.fill();ctx.stroke();break;
    case 'lavatorio':rbox(4);ctx.beginPath();ctx.ellipse(0,2,w*0.3,h*0.3,0,0,7);ctx.stroke();break;
    case 'chuveiro':box();ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R,B);ctx.moveTo(R,T);ctx.lineTo(L,B);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(R-6,T+6,3,0,7);ctx.stroke();break;
    case 'banheira':rbox(10);ctx.strokeRect(L+5,T+5,w-10,h-10);break;
    case 'escrivaninha':box();ctx.beginPath();ctx.moveTo(L,T+h*0.5);ctx.lineTo(R,T+h*0.5);ctx.stroke();break;
    case 'carro':rbox(mn*0.22);rr(ctx,L+w*0.12,T+h*0.12,w*0.76,h*0.3,4);ctx.stroke();break;
    case 'churrasqueira':box();ctx.beginPath();ctx.arc(0,0,mn*0.3,0,7);ctx.stroke();break;
    case 'piscina':rbox(10);ctx.strokeStyle='#4a90c2';ctx.strokeRect(L+6,T+6,w-12,h-12);break;
    case 'escada':box();{const n=8;for(let i=1;i<n;i++){ctx.beginPath();ctx.moveTo(L,T+h*i/n);ctx.lineTo(R,T+h*i/n);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,T);ctx.lineTo(0,B);ctx.stroke();}break;
    case 'pilar':ctx.fillStyle='#cdd2cb';ctx.fillRect(L,T,w,h);ctx.strokeRect(L,T,w,h);ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R,B);ctx.moveTo(R,T);ctx.lineTo(L,B);ctx.stroke();break;
    case 'planta':ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,mn/2,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,mn/4,0,7);ctx.stroke();break;
    default:box();
  }
}

function drawFurniture(f){const sc=scl();const[cx,cy]=toScreen(f.x,f.y),w=f.w*sc,h=f.h*sc;
  c.save();c.translate(cx,cy);c.rotate(f.angle||0);
  drawFurnitureShape(c,f.kind,w,h);
  c.restore();
  if(f.label){const[lx,ly]=toScreen(f.x,f.y+f.h/2+0.16);c.font="500 10px 'Inter'";c.fillStyle='#93a0b0';c.textAlign='center';c.textBaseline='top';c.fillText(f.label,lx,ly);}}

function drawDim(x1,y1,x2,y2){const[s1x,s1y]=toScreen(x1,y1),[s2x,s2y]=toScreen(x2,y2);
  c.strokeStyle='#c25d3a';c.lineWidth=1.5;c.setLineDash([]);c.beginPath();c.moveTo(s1x,s1y);c.lineTo(s2x,s2y);c.stroke();
  const a=Math.atan2(s2y-s1y,s2x-s1x)+Math.PI/2;[[s1x,s1y],[s2x,s2y]].forEach(p=>{c.beginPath();c.moveTo(p[0]+Math.cos(a)*5,p[1]+Math.sin(a)*5);c.lineTo(p[0]-Math.cos(a)*5,p[1]-Math.sin(a)*5);c.stroke();});
  chip((s1x+s2x)/2,(s1y+s2y)/2,fmt(Math.hypot(x2-x1,y2-y1)),'#c25d3a');}

function drawSelection(){const sc=scl();
  if(sel.kind==='wall'){const w=state.walls.find(o=>o.id===sel.id);if(!w)return;[[w.x1,w.y1],[w.x2,w.y2]].forEach(p=>handle(...toScreen(p[0],p[1])));}
  else if(sel.kind==='room'){const r=state.rooms.find(o=>o.id===sel.id);if(!r)return;const[x,y]=toScreen(r.x,r.y),w=r.w*sc,h=r.h*sc;c.strokeStyle='#e08a3c';c.lineWidth=2;c.strokeRect(x,y,w,h);[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(p=>handle(p[0],p[1]));}
  else if(sel.kind==='furniture'){const f=state.furniture.find(o=>o.id===sel.id);if(!f)return;const[cx,cy]=toScreen(f.x,f.y);c.save();c.translate(cx,cy);c.rotate(f.angle||0);const w=f.w*sc,h=f.h*sc;c.strokeStyle='#e08a3c';c.lineWidth=2;c.strokeRect(-w/2,-h/2,w,h);c.beginPath();c.moveTo(0,-h/2);c.lineTo(0,-h/2-22);c.stroke();c.restore();const ra=rotPos(f);c.fillStyle='#e08a3c';c.beginPath();c.arc(ra[0],ra[1],6,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}
  else if(sel.kind==='opening'){const o=state.openings.find(x=>x.id===sel.id);if(!o)return;const dx=Math.cos(o.angle),dy=Math.sin(o.angle);[-1,1].forEach(sg=>handle(...toScreen(o.x+sg*dx*o.width/2,o.y+sg*dy*o.width/2)));}
  else if(sel.kind==='text'){const t=state.texts.find(o=>o.id===sel.id);if(!t)return;const[x,y]=toScreen(t.x,t.y);c.font=`600 ${t.size||14}px 'Inter'`;const w=c.measureText(t.text).width;c.strokeStyle='#e08a3c';c.lineWidth=1.5;c.strokeRect(x-4,y-4,w+8,(t.size||14)+8);}}
function handle(x,y){c.fillStyle='#fff';c.strokeStyle='#e08a3c';c.lineWidth=2;c.beginPath();c.rect(x-5,y-5,10,10);c.fill();c.stroke();}
function rotPos(f){const sc=scl(),dy=-(f.h*sc/2+22),a=f.angle||0,rx=-(-dy)*0+(-dy)*0;const px=0*Math.cos(a)-dy*Math.sin(a),py=0*Math.sin(a)+dy*Math.cos(a);const[cx,cy]=toScreen(f.x,f.y);return[cx+px,cy+py];}
function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
