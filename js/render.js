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
  for(const f of (state.floors||[]))drawFloorArea(f);
  for(const r of state.rooms)drawRoom(r,false);
  for(const w of state.walls)drawWall(w);
  for(const o of state.openings)drawOpening(o);
  for(const f of state.furniture)drawFurniture(f);
  for(const t of state.texts)drawText(t);
  for(const m of (state.measures||[]))drawSavedMeasure(m);
  if(showMeasures)for(const w of state.walls)drawWallLabel(w);
  if(multiSel&&multiSel.length>1)drawMultiSelection();else if(sel)drawSelection();
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
  if(w.measureHidden)return;
  const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2,ang=Math.atan2(w.y2-w.y1,w.x2-w.x1),off=(w.measureOffset??((w.t||defaultWallT)/2+0.18));
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
  if(o.subtype==='incendio'){ // porta de incêndio: folha vermelha com barra antipânico
    const hx=hinge*(wpx/2),tx=-hx;c.strokeStyle='#c23636';leaf(hx,tx,flip);
    const w2=Math.abs(tx-hx),midY=flip*w2*0.45;c.lineWidth=3;c.beginPath();c.moveTo(hx-4,midY);c.lineTo(hx+4,midY);c.stroke();
    c.lineWidth=2;c.strokeStyle='#2a2f37';return;}
  // simples
  const hx=hinge*(wpx/2),tx=-hx; leaf(hx,tx,flip);}
function leaf(hingeX,otherX,flip){const w=Math.abs(otherX-hingeX);const tipY=flip*w;
  c.beginPath();c.moveTo(hingeX,0);c.lineTo(hingeX,tipY);c.stroke(); // leaf
  const a1=Math.atan2(tipY,0),a2=Math.atan2(0,otherX-hingeX);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  c.beginPath();for(let i=0;i<=18;i++){const a=a1+d*i/18,px=hingeX+Math.cos(a)*w,py=Math.sin(a)*w;if(i===0)c.moveTo(px,py);else c.lineTo(px,py);}c.stroke();}

function roomPolygonPoints(r){if(!r.wallIds||r.wallIds.length<3)return null;const pts=[];
  for(const id of r.wallIds){const w=state.walls.find(o=>o.id===id);if(!w)return null;pts.push({x:w.x1,y:w.y1});}
  return pts;}
function materialInfo(id){return FLOOR_MATERIALS.find(m=>m[0]===id)||FLOOR_MATERIALS[0];}
function makeMaterialPattern(ctx,matId,base){
  const p=document.createElement('canvas'),s=matId==='porcelain'?64:matId==='ceramic'?52:matId==='wood'?72:matId==='grass'?48:matId==='asphalt'?44:matId==='sand'?42:48;
  p.width=p.height=s;const x=p.getContext('2d');x.fillStyle=base;x.fillRect(0,0,s,s);
  if(matId==='ceramic'){x.strokeStyle='rgba(70,55,35,.34)';x.lineWidth=2;x.strokeRect(0,0,s,s);x.strokeRect(s/2,0,s/2,s/2);x.strokeRect(0,s/2,s/2,s/2);x.fillStyle='rgba(255,255,255,.16)';x.fillRect(4,4,s/2-8,s/2-8);}
  else if(matId==='porcelain'){x.strokeStyle='rgba(100,115,125,.18)';x.lineWidth=1;x.strokeRect(0,0,s,s);for(let i=0;i<7;i++){x.strokeStyle=`rgba(130,140,150,${0.10+i*.012})`;x.beginPath();x.moveTo(-10+i*13,s*.15+i*2);x.bezierCurveTo(s*.25,s*.45+i*3,s*.65,s*.1+i*5,s+10,s*.38+i*3);x.stroke();}x.fillStyle='rgba(255,255,255,.25)';x.fillRect(0,0,s,s);}
  else if(matId==='wood'){for(let i=0;i<3;i++){const y=i*s/3;x.fillStyle=i%2?'rgba(80,38,14,.18)':'rgba(255,220,160,.10)';x.fillRect(0,y,s,s/3);x.strokeStyle='rgba(75,38,16,.32)';x.lineWidth=1.5;x.strokeRect(0,y,s,s/3);for(let k=0;k<4;k++){x.strokeStyle='rgba(65,32,12,.24)';x.beginPath();x.moveTo(0,y+6+k*6);x.bezierCurveTo(s*.25,y+1+k*7,s*.55,y+12+k*3,s,y+5+k*6);x.stroke();}}}
  else if(matId==='grass'){x.fillStyle='rgba(28,95,35,.32)';for(let i=0;i<38;i++){const px=(i*17)%s,py=(i*29)%s;x.strokeStyle=i%3?'rgba(225,255,200,.38)':'rgba(18,70,25,.58)';x.beginPath();x.moveTo(px,py+8);x.lineTo(px+(i%5)-2,py-8);x.stroke();}x.fillStyle='rgba(20,80,25,.18)';for(let i=0;i<22;i++){x.beginPath();x.arc((i*23)%s,(i*11)%s,1.3,0,7);x.fill();}}
  else if(matId==='asphalt'){x.fillStyle='rgba(0,0,0,.16)';x.fillRect(0,0,s,s);for(let i=0;i<70;i++){x.fillStyle=i%4?'rgba(255,255,255,.16)':'rgba(0,0,0,.35)';x.beginPath();x.arc((i*19)%s,(i*31)%s,(i%3)+.7,0,7);x.fill();}}
  else if(matId==='sand'){for(let i=0;i<80;i++){x.fillStyle=i%3?'rgba(105,75,35,.26)':'rgba(255,245,210,.42)';x.beginPath();x.arc((i*13)%s,(i*23)%s,(i%2)+.8,0,7);x.fill();}}
  else if(matId==='external'){x.strokeStyle='rgba(60,60,48,.28)';x.lineWidth=2;for(let y=0;y<=s;y+=16){x.beginPath();x.moveTo(0,y);x.lineTo(s,y);x.stroke();}for(let x0=0;x0<=s;x0+=22){x.beginPath();x.moveTo(x0,0);x.lineTo(x0,s);x.stroke();}}
  return ctx.createPattern(p,'repeat');
}
function fillCurrentPathWithMaterial(ctx,matId,color,alpha){
  const mat=materialInfo(matId),base=color||mat[2];
  if(mat[0]==='plain'){ctx.fillStyle=hexA(base,alpha);ctx.fill();return;}
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=makeMaterialPattern(ctx,mat[0],base);ctx.fill();ctx.restore();
}
function drawFloorArea(f){const[x,y]=toScreen(f.x,f.y),w=f.w*scl(),h=f.h*scl();c.beginPath();c.rect(x,y,w,h);fillCurrentPathWithMaterial(c,f.material,f.color||materialInfo(f.material)[2],0.82);c.strokeStyle=hexA('#2a2f37',0.28);c.lineWidth=1.2;c.strokeRect(x,y,w,h);}
function drawRoom(r,ghost){const w=r.w*scl(),h=r.h*scl();
  const poly=roomPolygonPoints(r);
  let lx,ly;
  c.beginPath();
  if(poly){let cx=0,cy=0;poly.forEach((p,i)=>{const[sx,sy]=toScreen(p.x,p.y);i?c.lineTo(sx,sy):c.moveTo(sx,sy);cx+=p.x;cy+=p.y;});c.closePath();
    [lx,ly]=toScreen(cx/poly.length,cy/poly.length);}
  else{const[x,y]=toScreen(r.x,r.y);c.rect(x,y,w,h);[lx,ly]=[x+w/2,y+h/2];}
  fillCurrentPathWithMaterial(c,r.material,r.color||materialInfo(r.material)[2],ghost?0.10:0.13);
  c.strokeStyle=hexA(r.color||'#4a90c2',ghost?0.5:0.7);c.setLineDash(ghost?[6,4]:[]);c.lineWidth=1.5;c.stroke();c.setLineDash([]);
  if(w>40&&h>26){c.textAlign='center';c.textBaseline='middle';
    if(r.name){c.font="700 14px 'Inter'";c.fillStyle='#2a2f37';c.fillText(r.name,lx,ly-8);}
    c.font="600 11px 'JetBrains Mono'";c.fillStyle=r.color||'#3a7099';c.fillText(fmtA(r.w*r.h),lx,ly+(r.name?10:0));
    if(!ghost){c.font="500 10px 'JetBrains Mono'";c.fillStyle='#93a0b0';c.fillText(r.w.toFixed(2).replace('.',',')+' × '+r.h.toFixed(2).replace('.',','),lx,ly+(r.name?26:16));}}}

function makeMaterialPattern(ctx,matId,base,patternPx){
  const p=document.createElement('canvas'),s=Math.max(18,Math.min(180,Math.round(patternPx||48)));
  p.width=p.height=s;const x=p.getContext('2d');x.fillStyle=base;x.fillRect(0,0,s,s);
  const speck=(n,c1,c2)=>{for(let i=0;i<n;i++){x.fillStyle=i%3?c1:c2;const px=(i*37)%s,py=(i*53)%s;x.beginPath();x.arc(px,py,Math.max(.7,(i%4)*.45),0,7);x.fill();}};
  if(matId==='ceramic'||matId==='ceramic_large'){x.strokeStyle='rgba(75,62,48,.38)';x.lineWidth=Math.max(1,s*.025);x.strokeRect(0,0,s,s);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(s*.08,s*.08,s*.36,s*.36);x.fillStyle='rgba(95,78,58,.08)';x.fillRect(s*.55,s*.12,s*.28,s*.24);speck(18,'rgba(255,255,255,.13)','rgba(70,55,35,.12)');}
  else if(matId==='porcelain'||matId==='porcelain_marble'){x.strokeStyle='rgba(105,116,124,.20)';x.lineWidth=1;x.strokeRect(0,0,s,s);for(let i=0;i<8;i++){x.strokeStyle=`rgba(115,125,132,${0.09+i*.012})`;x.lineWidth=1+(i%2)*.5;x.beginPath();x.moveTo(-s*.2+i*s*.18,s*(.12+i*.06));x.bezierCurveTo(s*.24,s*(.42+i*.04),s*.66,s*(.04+i*.07),s*1.2,s*(.34+i*.03));x.stroke();}x.fillStyle='rgba(255,255,255,.24)';x.fillRect(0,0,s,s);if(matId==='porcelain_marble'){x.strokeStyle='rgba(95,100,105,.22)';x.lineWidth=2;x.beginPath();x.moveTo(0,s*.76);x.bezierCurveTo(s*.28,s*.56,s*.58,s*.86,s,s*.62);x.stroke();}}
  else if(matId==='cement'){speck(55,'rgba(255,255,255,.10)','rgba(0,0,0,.12)');x.fillStyle='rgba(255,255,255,.10)';x.fillRect(0,0,s,s*.32);x.strokeStyle='rgba(30,30,30,.06)';x.strokeRect(0,0,s,s);}
  else if(matId==='wood'||matId==='laminate'||matId==='vinyl'){const rows=matId==='vinyl'?4:3;for(let i=0;i<rows;i++){const y=i*s/rows;x.fillStyle=i%2?'rgba(80,38,14,.16)':'rgba(255,220,160,.12)';x.fillRect(0,y,s,s/rows);x.strokeStyle='rgba(75,38,16,.34)';x.lineWidth=1.3;x.strokeRect(0,y,s,s/rows);for(let k=0;k<4;k++){x.strokeStyle='rgba(65,32,12,.22)';x.beginPath();x.moveTo(0,y+5+k*s/(rows*5));x.bezierCurveTo(s*.25,y+1+k*5,s*.55,y+12+k*2,s,y+5+k*5);x.stroke();}}}
  else if(matId==='wood_herringbone'){x.strokeStyle='rgba(70,35,15,.35)';x.lineWidth=2;for(let i=-2;i<5;i++){x.beginPath();x.moveTo(i*s*.28,0);x.lineTo(i*s*.28+s*.5,s*.5);x.lineTo(i*s*.28,s);x.stroke();x.beginPath();x.moveTo(i*s*.28+s*.5,0);x.lineTo(i*s*.28,s*.5);x.lineTo(i*s*.28+s*.5,s);x.stroke();}speck(22,'rgba(255,230,180,.13)','rgba(80,38,14,.13)');}
  else if(matId==='stone'){speck(70,'rgba(255,255,255,.13)','rgba(0,0,0,.16)');x.strokeStyle='rgba(50,45,40,.28)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,s*.35);x.lineTo(s*.38,s*.2);x.lineTo(s*.72,s*.48);x.lineTo(s,s*.31);x.moveTo(s*.2,0);x.lineTo(s*.34,s);x.moveTo(s*.66,0);x.lineTo(s*.58,s);x.stroke();}
  else if(matId==='grass'){x.fillStyle='rgba(15,70,20,.18)';x.fillRect(0,0,s,s);for(let i=0;i<95;i++){const px=(i*23)%s,py=(i*41)%s,len=3+(i%6),ang=((i*17)%80-40)*Math.PI/180;x.strokeStyle=i%4?'rgba(205,255,170,.38)':'rgba(18,78,26,.72)';x.lineWidth=i%5?1:1.7;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(ang)*len,py-Math.sin(ang)*len);x.stroke();}speck(22,'rgba(8,48,18,.28)','rgba(230,255,190,.22)');}
  else if(matId==='asphalt'){x.fillStyle='rgba(0,0,0,.22)';x.fillRect(0,0,s,s);speck(90,'rgba(255,255,255,.13)','rgba(0,0,0,.35)');x.strokeStyle='rgba(255,205,40,.92)';x.lineWidth=Math.max(3,s*.055);x.setLineDash([s*.22,s*.18]);x.beginPath();x.moveTo(s*.5,0);x.lineTo(s*.5,s);x.stroke();x.setLineDash([]);x.strokeStyle='rgba(255,232,90,.32)';x.lineWidth=1;x.beginPath();x.moveTo(s*.5+4,0);x.lineTo(s*.5+4,s);x.stroke();}
  else if(matId==='sand'){for(let i=0;i<90;i++){x.fillStyle=i%3?'rgba(105,75,35,.25)':'rgba(255,245,210,.45)';x.beginPath();x.arc((i*13)%s,(i*23)%s,(i%2)+.8,0,7);x.fill();}}
  else if(matId==='external'){x.strokeStyle='rgba(60,60,48,.28)';x.lineWidth=2;for(let y=0;y<=s;y+=s/2){x.beginPath();x.moveTo(0,y);x.lineTo(s,y);x.stroke();}for(let x0=0;x0<=s;x0+=s/2){x.beginPath();x.moveTo(x0,0);x.lineTo(x0,s);x.stroke();}speck(20,'rgba(255,255,255,.12)','rgba(0,0,0,.10)');}
  return ctx.createPattern(p,'repeat');
}
function fillCurrentPathWithMaterial(ctx,matId,color,alpha,opt){
  const mat=materialInfo(matId),base=color||mat[2],patternPx=opt&&opt.patternPx;
  if(mat[0]==='plain'){ctx.fillStyle=hexA(base,alpha);ctx.fill();return;}
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=makeMaterialPattern(ctx,mat[0],base,patternPx);ctx.fill();ctx.restore();
}
function drawFloorArea(f){const[x,y]=toScreen(f.x,f.y),w=f.w*scl(),h=f.h*scl(),mat=materialInfo(f.material),tile=f.tileSize||mat[3]||0.6;c.beginPath();c.rect(x,y,w,h);fillCurrentPathWithMaterial(c,f.material,f.color||mat[2],0.82,{patternPx:tile*scl()});c.strokeStyle=hexA('#2a2f37',0.28);c.lineWidth=1.2;c.strokeRect(x,y,w,h);}

function textMetrics(t){c.font=`600 ${t.size||14}px 'Inter'`;return{w:c.measureText(t.text).width/scl(),h:(t.size||14)/scl()};}
function drawText(t){const m=textMetrics(t),[cx,cy]=toScreen(t.x+m.w/2,t.y+m.h/2);
  c.font=`600 ${t.size||14}px 'Inter'`;c.save();c.translate(cx,cy);c.rotate(t.angle||0);
  c.fillStyle='#2a2f37';c.textAlign='center';c.textBaseline='middle';c.fillText(t.text,0,0);c.restore();}
function rotPosText(t){const m=textMetrics(t),sc=scl(),dy=-(m.h*sc/2+8+22),a=t.angle||0;
  const px=-dy*Math.sin(a),py=dy*Math.cos(a),[cx,cy]=toScreen(t.x+m.w/2,t.y+m.h/2);
  return[cx+px,cy+py];}

const _furnPatCache = {};
function getFurniturePattern(ctx, type, baseCol){
  const theme=typeof furnitureTheme==='undefined'?'clean3d':furnitureTheme;
  if(type==='plain'||theme==='flat2d') return baseCol;
  if(theme==='clean3d'&&type!=='wood'&&type!=='metal') return baseCol;
  const key=type+'_'+baseCol;
  if(_furnPatCache[key]) return _furnPatCache[key];
  const p=document.createElement('canvas');const s=64;p.width=p.height=s;
  const x=p.getContext('2d');x.fillStyle=baseCol;x.fillRect(0,0,s,s);
  if(type==='fabric'){
    for(let i=0;i<400;i++){x.fillStyle=Math.random()>0.5?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)';x.fillRect(Math.random()*s,Math.random()*s,2,2);}
  }else if(type==='wood'){
    for(let i=0;i<3;i++){const y=i*s/3;x.fillStyle=i%2?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.03)';x.fillRect(0,y,s,s/3);
    for(let k=0;k<5;k++){x.strokeStyle='rgba(0,0,0,0.05)';x.beginPath();x.moveTo(0,y+6+k*5);x.bezierCurveTo(s*.25,y+1+k*6,s*.55,y+12+k*2,s,y+5+k*5);x.stroke();}}
  }else if(type==='leather'){
    for(let i=0;i<200;i++){x.fillStyle='rgba(0,0,0,0.06)';x.beginPath();x.arc(Math.random()*s,Math.random()*s,1+Math.random()*2,0,7);x.fill();}
  }else if(type==='metal'){
    const g=x.createLinearGradient(0,0,s,s);g.addColorStop(0,'rgba(255,255,255,0.3)');g.addColorStop(0.5,'rgba(0,0,0,0.0)');g.addColorStop(1,'rgba(255,255,255,0.3)');x.fillStyle=g;x.fillRect(0,0,s,s);
  }
  _furnPatCache[key] = ctx.createPattern(p,'repeat');
  return _furnPatCache[key];
}

// Desenho do símbolo 2D de cada móvel em torno da origem local (0,0), sem transformação de mundo —
// usado tanto no canvas principal (drawFurniture) quanto nos ícones da biblioteca (drawLibIcon).
function furnitureStyle(kind){
  const map={
    cama_casal:['#d9e8ff','#8fb7e8'],cama_solteiro:['#d9e8ff','#8fb7e8'],berco:['#e5f0ff','#9ac0ea'],
    cama_queen:['#d9e8ff','#8fb7e8'],cama_king:['#d9e8ff','#8fb7e8'],cama_dossel:['#d9e8ff','#8fb7e8'],puff:['#f0d1eb','#d195c6'],
    sofa:['#ffe1bd','#e08a3c'],sofa2:['#ffe1bd','#e08a3c'],sofa_office:['#ffe1bd','#e08a3c'],sofa_l:['#ffe1bd','#e08a3c'],poltrona:['#ffe1bd','#e08a3c'],poltrona_reclinavel:['#d3d3d3','#9c9c9c'],mesa_centro:['#f6ddb2','#c68a36'],mesa_lateral:['#f6ddb2','#c68a36'],
    rack:['#efe1ce','#b98b5d'],painel_tv:['#efe1ce','#b98b5d'],tv:['#dfe5ec','#6f7f91'],tv_plana:['#dfe5ec','#6f7f91'],estante:['#efe1ce','#b98b5d'],estante2:['#efe1ce','#b98b5d'],aparador:['#efe1ce','#b98b5d'],lareira:['#f1dfd8','#c25d3a'],piano:['#2c2c2c','#111111'],tapete_sala:['#f5f5dc','#e3e3b5'],
    armario:['#eadff8','#9b6cc4'],closet:['#eadff8','#9b6cc4'],comoda:['#eadff8','#9b6cc4'],criado:['#eadff8','#9b6cc4'],penteadeira:['#eadff8','#9b6cc4'],buffet:['#eadff8','#9b6cc4'],cristaleira:['#eadff8','#9b6cc4'],bar:['#eadff8','#9b6cc4'],
    mesa_jantar:['#f6ddb2','#c68a36'],mesa_jantar_redonda:['#f6ddb2','#c68a36'],mesa_jantar_8:['#f6ddb2','#c68a36'],cadeira:['#fff0cf','#d9a44c'],cadeira_esc:['#fff0cf','#d9a44c'],banqueta:['#fff0cf','#d9a44c'],
    fogao:['#e9edf1','#8b98a8'],geladeira:['#eaf4f8','#82b6c8'],geladeira_side:['#eaf4f8','#82b6c8'],pia_cozinha:['#dff2e7','#5aa469'],pia_dupla:['#dff2e7','#5aa469'],bancada:['#dff2e7','#5aa469'],
    ilha:['#dff2e7','#5aa469'],pia_cooktop_120:['#f2f4f5','#8b98a8'],armario_cozinha:['#dff2e7','#5aa469'],micro:['#e9edf1','#8b98a8'],lava_loucas:['#e9edf1','#8b98a8'],mesa_cozinha:['#fff0cf','#d9a44c'],maquina:['#eaf4f8','#82b6c8'],secadora:['#eaf4f8','#82b6c8'],tanque:['#ddf4f2','#3aa0a0'],armario_lavanderia:['#dff2e7','#5aa469'],tabua_passar:['#fff0cf','#d9a44c'],varal:['#f4f1e8','#9aa3ad'],tanquinho:['#ddf4f2','#3aa0a0'],
    vaso:['#f1f4df','#94a35a'],lavatorio:['#ddf4f2','#3aa0a0'],chuveiro:['#ddf4f2','#3aa0a0'],chuveiro_duplo:['#ddf4f2','#3aa0a0'],banheira:['#ddf4f2','#3aa0a0'],jacuzzi:['#ddf4f2','#3aa0a0'],bide:['#ddf4f2','#3aa0a0'],gabinete_banho:['#ddf4f2','#3aa0a0'],espelho:['#eaf4f8','#82b6c8'],toalheiro:['#e9edf1','#8b98a8'],
    escrivaninha:['#efe1ce','#b98b5d'],mesa_l:['#efe1ce','#b98b5d'],arquivo:['#e9edf1','#8b98a8'],carro:['#dce8ff','#5f88d6'],carro_pequeno:['#dce8ff','#5f88d6'],carro_suv:['#dce8ff','#5f88d6'],moto:['#2c2c2c','#111111'],bicicleta:['#cde3c4','#468a36'],churrasqueira:['#f1dfd8','#c25d3a'],churrasqueira_gourmet:['#f1dfd8','#c25d3a'],
    piscina:['#d8f3ff','#4a90c2'],planta:['#dff1da','#5aa469'],arvore:['#cde3c4','#468a36'],mesa_ext:['#fff0cf','#d9a44c'],espreguicadeira:['#fff0cf','#d9a44c'],ombrelone:['#ffe1bd','#e08a3c'],banco_jardim:['#dff1da','#5aa469'],sofa_ext:['#ffe1bd','#e08a3c'],
    escada:['#e4e7dc','#8d9786'],escada_l_longa:['#e4e7dc','#8d9786'],escada_l_curta:['#e4e7dc','#8d9786'],escada_caracol:['#e4e7dc','#8d9786'],pilar:['#d8ddd5','#7f8a7b'],viga:['#d8ddd5','#7f8a7b'],
    tapete_banho:['#d8f3ff','#4a90c2'],cesto_lixo:['#e9edf1','#8b98a8'],cesto_roupa:['#efe1ce','#b98b5d'],prateleira_banho:['#f4f1e8','#9aa3ad'],
    mesa_sinuca:['#d9f2d9','#4da64d'],esteira:['#3a3a3a','#1a1a1a'],bicicleta_ergometrica:['#e6e6e6','#8a8a8a'],banco_supino:['#3a3a3a','#1a1a1a'],
    pista_danca:['#2a1a3a','#7a3aa8'],palco:['#3a3a3a','#1a1a1a'],som:['#2a2a2a','#111111'],balcao_bar:['#efe1ce','#b98b5d'],banqueta_redonda:['#fff0cf','#d9a44c'],mesinha_redonda:['#f6ddb2','#c68a36'],
    cadeira_giratoria:['#dfe5ec','#6f7f91'],notebook:['#3a3a3a','#1a1a1a']
  };
  const s=map[kind]||['#f4f1e8','#9aa3ad'];
  
  let matType = 'plain';
  if(kind.includes('sofa')||kind.includes('poltrona')||kind.includes('cama')||kind.includes('puff')||kind==='tapete_sala') matType='fabric';
  else if(kind.includes('mesa')||kind==='rack'||kind==='painel_tv'||kind.includes('estante')||kind==='aparador'||kind==='armario'||kind==='closet'||kind==='comoda'||kind==='criado'||kind==='penteadeira'||kind==='buffet'||kind==='cristaleira'||kind==='bar'||kind.includes('escrivaninha')||kind.includes('arquivo')||kind==='banco_jardim'||kind==='cadeira'||kind.includes('banqueta')||kind==='balcao_bar'||kind==='mesinha_redonda') matType='wood';
  else if(kind==='fogao'||kind.includes('geladeira')||kind==='micro'||kind==='lava_loucas'||kind==='maquina'||kind==='secadora'||kind==='churrasqueira'||kind==='pia_cozinha'||kind==='pia_dupla'||kind==='pia_cooktop_120'||kind==='notebook'||kind==='cadeira_giratoria'||kind==='som') matType='metal';
  
  const theme=typeof furnitureTheme==='undefined'?'clean3d':furnitureTheme;
  let fill=s[0],soft=s[1],stroke='#33404c';
  if(theme==='flat2d'){
    stroke='#53606d';
    fill=hexMix(fill,'#ffffff',0.40);
    soft=hexMix(soft,'#ffffff',0.24);
  }else if(theme==='clean3d'){
    stroke='#2f3f4b';
    fill=hexMix(fill,'#f8faf6',0.28);
    soft=hexMix(soft,'#ffffff',0.10);
  }else if(theme==='humanized'){
    stroke='#29333a';
    fill=hexMix(fill,'#f7e6c8',0.14);
    soft=hexMix(soft,'#8a5c2d',0.08);
  }
  return{fill,soft,stroke,matType};
}
const _imgCache = {};
let _drawingLibIcon = false;
function getFurnitureImage(url, callback) {
  if(_imgCache[url]) return _imgCache[url];
  const img = new Image();
  _imgCache[url] = { img, loaded: false, failed: false };
  img.onload = () => {
    _imgCache[url].loaded = true;
    if(callback) callback();
  };
  img.onerror = () => {
    _imgCache[url].failed = true;
    if(callback) callback();
  };
  img.src = url;
  return _imgCache[url];
}
function getFurnitureImageCandidate(sources, callback){
  const list=Array.isArray(sources)?sources:(sources?[sources]:[]);
  for(const url of list){
    const cache=getFurnitureImage(url, callback);
    if(cache.loaded)return cache;
    if(!cache.failed)return cache;
  }
  return null;
}

function drawFurnitureShape(ctx,kind,w,h,lineWidth){
  const theme=typeof furnitureTheme==='undefined'?'clean3d':furnitureTheme;
  if(!_drawingLibIcon&&theme==='humanized'&&typeof FURNITURE_IMAGES !== 'undefined' && FURNITURE_IMAGES[kind]) {
     const cache = getFurnitureImageCandidate(FURNITURE_IMAGES[kind], () => {
         if(typeof draw==='function') draw();
     });
     if(cache&&cache.loaded) {
         ctx.save();
         // Most top-down images need to be drawn centered.
         // Furniture dimensions are drawn from -w/2, -h/2
         ctx.drawImage(cache.img, -w/2, -h/2, w, h);
         ctx.restore();
         return; // Skip procedural drawing
     }
  }

  ctx.lineJoin='round';ctx.lineCap='round';
  const style=furnitureStyle(kind),stroke=style.stroke,matType=style.matType;
  ctx.globalAlpha=1;ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
  
  const fill=getFurniturePattern(ctx,matType,style.fill);
  const soft=getFurniturePattern(ctx,matType,style.soft);
  const L=-w/2,T=-h/2,R=w/2,B=h/2,mn=Math.min(w,h);
  
  let _sd = false;
  const shadowOn = () => {
    if(theme==='flat2d')return;
    if(!_sd){
      ctx.shadowColor=theme==='humanized'?'rgba(36,28,18,0.36)':'rgba(37,47,56,0.22)';
      ctx.shadowBlur=mn*(theme==='humanized'?0.18:0.10);
      ctx.shadowOffsetX=mn*(theme==='humanized'?0.045:0.025);
      ctx.shadowOffsetY=mn*(theme==='humanized'?0.085:0.055);
      _sd=true;
    } else {
      ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    }
  };

  const applyVolume = (x,y,ww,hh,rad,shape='rect') => {
    if(theme==='flat2d')return;
    ctx.save();
    if(shape==='rect'){
       const g=ctx.createLinearGradient(x,y,x+ww,y+hh);
       g.addColorStop(0,theme==='humanized'?'rgba(255,255,255,0.34)':'rgba(255,255,255,0.26)');
       g.addColorStop(0.52,'rgba(255,255,255,0.03)');
       g.addColorStop(1,theme==='humanized'?'rgba(48,32,18,0.24)':'rgba(0,0,0,0.14)');
       ctx.fillStyle=g; rr(ctx,x,y,ww,hh,rad); ctx.fill();
    } else if(shape==='oval'){
       const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(0.1,ww,hh));
       g.addColorStop(0,theme==='humanized'?'rgba(255,255,255,0.32)':'rgba(255,255,255,0.22)');
       g.addColorStop(1,theme==='humanized'?'rgba(48,32,18,0.22)':'rgba(0,0,0,0.12)');
       ctx.fillStyle=g; ctx.beginPath();ctx.ellipse(x,y,ww,hh,0,0,7);ctx.fill();
    }
    ctx.restore();
  };

  const box=()=>{shadowOn();ctx.fillStyle=fill;ctx.fillRect(L,T,w,h);ctx.shadowColor='transparent';applyVolume(L,T,w,h,0,'rect');ctx.strokeRect(L,T,w,h);};
  const rbox=(rad)=>{shadowOn();ctx.fillStyle=fill;rr(ctx,L,T,w,h,rad);ctx.fill();ctx.shadowColor='transparent';applyVolume(L,T,w,h,rad,'rect');ctx.stroke();};
  const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  const rect=(x,y,ww,hh,ff)=>{shadowOn();ctx.fillStyle=ff?(ff===style.soft?soft:getFurniturePattern(ctx,matType,ff)):fill;ctx.fillRect(x,y,ww,hh);ctx.shadowColor='transparent';if(!ff||ff===style.soft)applyVolume(x,y,ww,hh,0,'rect');ctx.strokeRect(x,y,ww,hh);};
  const oval=(x,y,rx,ry,ff)=>{shadowOn();ctx.fillStyle=ff?(ff===style.soft?soft:getFurniturePattern(ctx,matType,ff)):fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill();ctx.shadowColor='transparent';if(!ff||ff===style.soft)applyVolume(x,y,rx,ry,0,'oval');ctx.stroke();};
  const cushion=(x,y,ww,hh,rad=4)=>{
    shadowOn();
    ctx.fillStyle=getFurniturePattern(ctx,matType,'#ffffff');rr(ctx,x,y,ww,hh,rad);ctx.fill();
    ctx.shadowColor='transparent';
    ctx.globalAlpha=0.6; applyVolume(x,y,ww,hh,rad,'rect'); ctx.globalAlpha=1.0;
    ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+ww*.2,y+hh*.2);ctx.bezierCurveTo(x+ww*.4,y+hh*.4,x+ww*.6,y+hh*.2,x+ww*.8,y+hh*.3);ctx.strokeStyle=hexA(stroke,0.3);ctx.stroke();ctx.strokeStyle=stroke;
  };
  const leaf=(lx,ly,ang,len,wid,col)=>{
    shadowOn();
    ctx.save();ctx.translate(lx,ly);ctx.rotate(ang);ctx.fillStyle=col;ctx.beginPath();
    ctx.moveTo(0,0);ctx.quadraticCurveTo(len/2,-wid,len,0);ctx.quadraticCurveTo(len/2,wid,0,0);
    ctx.fill();ctx.shadowColor='transparent';
    const g=ctx.createLinearGradient(0,0,len,0);g.addColorStop(0,'rgba(0,0,0,0.3)');g.addColorStop(1,'rgba(255,255,255,0.1)');
    ctx.fillStyle=g;ctx.fill();
    ctx.stroke();ctx.restore();
  };

  switch(kind){
    case 'cama_casal':case 'cama_solteiro':case 'cama_queen':case 'cama_king':case 'cama_dossel':{
      const dbl=kind!=='cama_solteiro';
      shadowOn();ctx.fillStyle=getFurniturePattern(ctx,'wood','#a07345');rr(ctx,L,T,w,h,4);ctx.fill();ctx.shadowColor='transparent';ctx.stroke();
      ctx.fillStyle='#b9824a';rr(ctx,L,T,w,h*.085,4);ctx.fill();ctx.stroke();
      if(kind==='cama_dossel'){
        ctx.fillStyle='#e3e3e3';ctx.fillRect(L,T,8,8);ctx.fillRect(R-8,T,8,8);ctx.fillRect(L,B-8,8,8);ctx.fillRect(R-8,B-8,8,8);
        ctx.strokeRect(L,T,8,8);ctx.strokeRect(R-8,T,8,8);ctx.strokeRect(L,B-8,8,8);ctx.strokeRect(R-8,B-8,8,8);
        ctx.beginPath();ctx.moveTo(L+4,T+4);ctx.lineTo(R-4,T+4);ctx.lineTo(R-4,B-4);ctx.lineTo(L+4,B-4);ctx.closePath();ctx.strokeStyle=hexA('#8c7b6c',0.5);ctx.stroke();ctx.strokeStyle=stroke;
      }
      const mx=L+w*.05,my=T+h*.13,mw=w*.90,mh=h*.83;
      ctx.fillStyle=fill;rr(ctx,mx,my,mw,mh,6);ctx.fill();ctx.stroke();
      
      const blanketY=my+mh*.35,blanketH=mh*.65;
      ctx.fillStyle=soft;rr(ctx,mx-w*.02,blanketY,mw+w*.04,blanketH,8);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(mx,blanketY+mh*.1);ctx.bezierCurveTo(mx+mw*.3,blanketY-mh*.05,mx+mw*.7,blanketY+mh*.05,mx+mw,blanketY+mh*.02);ctx.strokeStyle=hexA(stroke,0.4);ctx.stroke();ctx.strokeStyle=stroke;
      
      const pw=dbl?mw*.40:mw*.75,ph=mh*.18;
      const drawPillow=(px,ang)=>{
        ctx.save();ctx.translate(px+pw/2,my+mh*.08+ph/2);ctx.rotate(ang);
        ctx.fillStyle='#fdfdfc';rr(ctx,-pw/2,-ph/2,pw,ph,6);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(-pw*.3,-ph*.1);ctx.bezierCurveTo(0,0,pw*.1,-ph*.2,pw*.3,-ph*.05);ctx.strokeStyle=hexA(stroke,0.2);ctx.stroke();ctx.strokeStyle=stroke;
        ctx.restore();
      };
      if(dbl){drawPillow(mx+mw*.05,-0.05);drawPillow(mx+mw*.55,0.03);}else{drawPillow(mx+mw*.12,0.02);}
      break;}
    case 'berco':{
      rbox(6);rect(L+w*.12,T+h*.08,w*.76,h*.84,'#f7fbff');
      ctx.fillStyle='#eef5fc';rr(ctx,L+w*.15,T+h*.15,w*.7,h*.6,4);ctx.fill();
      for(let i=1;i<6;i++)line(L+w*(.12+i*.126),T+h*.12,L+w*(.12+i*.126),B-h*.12);break;}
    case 'armario':case 'closet':case 'comoda':case 'buffet':case 'cristaleira':case 'bar':case 'armario_cozinha':case 'armario_lavanderia':{
      rbox(3);const n=kind==='comoda'||kind==='bar'?2:3;
      for(let i=1;i<n;i++)line(L+w*i/n,T,L+w*i/n,B);
      ctx.fillStyle=soft;for(let i=0;i<n;i++)ctx.fillRect(L+w*(i+.5)/n-3,T+h*.85,6,3);
      if(kind==='cristaleira'){ctx.fillStyle=hexA('#a8d3e6',0.4);ctx.fillRect(L+4,T+4,w-8,h-8);ctx.strokeRect(L+4,T+4,w-8,h-8);}
      break;}
    case 'criado':rbox(4);ctx.fillStyle=hexA('#ffffff',0.3);rr(ctx,L+4,T+4,w-8,h-8,3);ctx.fill();ctx.stroke();ctx.fillStyle=soft;ctx.beginPath();ctx.arc(0,h*.35,2.5,0,7);ctx.fill();break;
    case 'sofa':case 'sofa_l':{
      const isL=kind==='sofa_l';
      rbox(10);
      const armW=w*(isL?.06:.09),backH=h*(isL?.18:.30);
      rect(L,T+h*.04,armW,h*.92,soft);
      if(!isL) rect(R-armW,T+h*.04,armW,h*.92,soft);
      
      const bx0=L+armW+2,bw=w-armW*(isL?1:2)-4;
      ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,bx0,T+h*.04,bw,backH,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      if(isL){
        ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,R-armW*2.5,T+h*.04,armW*2.5,h-h*.08,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      }
      const seatY=T+h*.04+backH+2,seatH=h*.92-backH-4;
      const nSeats=isL?2:3;
      for(let i=0;i<nSeats;i++){
        const sw=isL?(bw-armW*2.5)/2:bw/3;
        const sh=isL&&i===1?seatH:seatH; 
        cushion(bx0+sw*i+2,seatY,sw-4,sh,6);
      }
      if(isL) cushion(R-armW*2.5+2,seatY,armW*2.5-4,seatH,6);
      
      const colors=['#2f7d78','#f1e9d8','#dba43a','#a9b0b8','#2c4a66'];
      const addDeco=(px,py,ang,ci)=>{
        ctx.save();ctx.translate(px,py);ctx.rotate(ang);
        ctx.fillStyle=colors[ci%colors.length];rr(ctx,-mn*.1,-mn*.08,mn*.2,mn*.16,5);ctx.fill();ctx.stroke();
        ctx.restore();
      };
      addDeco(L+armW*1.5,seatY+mn*.1,0.2,0);
      addDeco(R-armW*(isL?3.5:1.5),seatY+mn*.15,-0.1,1);
      if(!isL) addDeco(0,seatY+mn*.1,0.05,2);
      
      if(!isL){
        const rugW=w*.86,rugH=h*.40,rugY=B-2;
        ctx.fillStyle=hexA('#c9a25b',0.6);rr(ctx,L+(w-rugW)/2,rugY,rugW,rugH,4);ctx.fill();
        ctx.strokeStyle=hexA('#7a6235',0.6);ctx.lineWidth=1;
        for(let i=0;i<rugW;i+=6){ctx.beginPath();ctx.moveTo(L+(w-rugW)/2+i,rugY+rugH);ctx.lineTo(L+(w-rugW)/2+i,rugY+rugH+4);ctx.stroke();}
        ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      }
      break;}
    case 'sofa2':case 'sofa_office':{
      rbox(8);rect(L+w*.06,T+h*.15,w*.12,h*.70,soft);rect(R-w*.18,T+h*.15,w*.12,h*.70,soft);
      ctx.globalAlpha=0.5;ctx.fillStyle=soft;rr(ctx,L+w*.18,T+h*.15,w*.64,h*.25,5);ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      cushion(L+w*.20,T+h*.42,w*.29,h*.43,6);cushion(L+w*.51,T+h*.42,w*.29,h*.43,6);
      break;}
    case 'poltrona':case 'poltrona_reclinavel':{
      rbox(10);
      if(kind==='poltrona_reclinavel'){ctx.globalAlpha=0.4;ctx.fillStyle=soft;rr(ctx,L+w*.25,B-h*.1,w*.5,h*.3,5);ctx.fill();ctx.globalAlpha=1;ctx.stroke();}
      rect(L+w*.05,T+h*.1,w*.15,h*.8,soft);rect(R-w*.2,T+h*.1,w*.15,h*.8,soft);
      ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,L+w*.2,T+h*.1,w*.6,h*.3,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      cushion(L+w*.22,T+h*.42,w*.56,h*.46,6);
      break;}
    case 'puff':{
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,mn/2,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,mn/2-6,0,7);ctx.strokeStyle=hexA(stroke,0.3);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,mn/2-12,0,7);ctx.stroke();ctx.strokeStyle=stroke;
      ctx.fillStyle=soft;ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill();
      break;}
    case 'mesa_centro':case 'mesa_lateral':case 'aparador':{
      rbox(8);ctx.globalAlpha=0.4;ctx.fillStyle=soft;rr(ctx,L+w*.08,T+h*.12,w*.84,h*.76,4);ctx.fill();ctx.globalAlpha=1;
      if(kind==='mesa_centro'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,mn*.15,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#8ea352';ctx.beginPath();ctx.arc(0,0,mn*.1,0,7);ctx.fill();}
      break;}
    case 'rack':case 'painel_tv':case 'estante':case 'estante2':case 'arquivo':{
      rbox(3);ctx.fillStyle=soft;ctx.fillRect(L+w*0.06,T+h*.1,w*.88,h*.2);ctx.strokeRect(L+w*0.06,T+h*.1,w*.88,h*.2);
      line(L+w*.33,T,L+w*.33,B);line(L+w*.66,T,L+w*.66,B);
      if(kind==='estante'||kind==='estante2'){ctx.fillStyle='#8ea352';rect(L+w*.1,T+h*.4,w*.15,h*.3);rect(L+w*.7,T+h*.5,w*.1,h*.2);}
      break;}
    case 'tv':case 'tv_plana':{
      rbox(2);ctx.fillStyle='#111';rr(ctx,L+w*.02,T+h*.05,w*.96,h*.90,2);ctx.fill();
      if(kind==='tv'){rect(L+w*.3,B,w*.4,h*.3,fill);}
      break;}
    case 'lareira':{
      rbox(4);ctx.fillStyle='#444';rr(ctx,L+w*.2,T+h*.15,w*.6,h*.7,3);ctx.fill();ctx.stroke();
      ctx.fillStyle='#e86617';ctx.beginPath();ctx.moveTo(L+w*.3,B-h*.2);ctx.lineTo(0,T+h*.3);ctx.lineTo(R-w*.3,B-h*.2);ctx.fill();
      break;}
    case 'piano':{
      shadowOn();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R-w*.2,T);ctx.bezierCurveTo(R,T,R,B,R-w*.2,B);ctx.lineTo(L,B);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.stroke();
      ctx.fillStyle='#f0f0f0';rect(L-w*.1,T+h*.2,w*.15,h*.6);
      ctx.fillStyle='#111';for(let i=0;i<10;i++)rect(L-w*.1,T+h*.22+i*h*.055,w*.08,h*.03);
      ctx.fillStyle='#333';oval(L-w*.25,0,w*.1,h*.15);
      break;}
    case 'tapete_sala':{
      shadowOn();ctx.fillStyle=fill;rr(ctx,L,T,w,h,10);ctx.fill();ctx.shadowColor='transparent';
      ctx.globalAlpha=0.4;ctx.strokeStyle=soft;ctx.lineWidth=2;
      for(let i=0;i<40;i++){ctx.beginPath();ctx.arc(L+Math.random()*w,T+Math.random()*h,3+Math.random()*5,0,7);ctx.stroke();}
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'mesa_jantar':case 'mesa_jantar_redonda':case 'mesa_jantar_8':{
      const isRound=kind==='mesa_jantar_redonda';
      if(isRound) oval(0,0,w/2,h/2,fill); else rbox(8);
      const n=isRound?4:kind==='mesa_jantar_8'?8:6;
      for(let i=0;i<n;i++){
        let cx,cy;
        if(isRound){const a=i*Math.PI*2/n;cx=Math.cos(a)*w*.58;cy=Math.sin(a)*h*.58;}
        else{
          if(n===6){
            if(i<3){cx=L+w*(.2+.3*i);cy=T-h*.15;}else{cx=L+w*(.2+.3*(i-3));cy=B+h*.15;}
          }else{
            if(i<3){cx=L+w*(.2+.3*i);cy=T-h*.15;}else if(i<6){cx=L+w*(.2+.3*(i-3));cy=B+h*.15;}
            else if(i===6){cx=L-w*.1;cy=0;}else{cx=R+w*.1;cy=0;}
          }
        }
        ctx.fillStyle='#fff0cf';rr(ctx,cx-w*.05,cy-h*.08,w*.1,h*.16,4);ctx.fill();ctx.stroke();
      }
      ctx.fillStyle='#fff';oval(0,0,mn*.12,mn*.12);ctx.stroke();
      break;}
    case 'mesa_cozinha':case 'mesa_ext':case 'ilha':{
      rbox(6);ctx.fillStyle=soft;rr(ctx,L+w*.18,T+h*.2,w*.28,h*.6,3);ctx.fill();ctx.stroke();
      if(kind==='ilha'){ctx.fillStyle='#20242a';rr(ctx,R-w*.3,T+h*.2,w*.2,h*.6,4);ctx.fill();ctx.stroke();}
      break;}
    case 'cadeira':case 'cadeira_esc':case 'banqueta':{
      rbox(6);ctx.fillStyle=soft;rr(ctx,L+3,T+h*.12,w-6,h*.28,4);ctx.fill();ctx.stroke();
      if(kind!=='banqueta') line(L+4,T+h*.42,R-4,T+h*.42);
      break;}
    case 'fogao':{
      rbox(4);rect(L+w*.08,T+h*.12,w*.84,h*.80,'#1f252c');
      ctx.strokeStyle='#d7dde3';ctx.lineWidth=2;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(p=>{
        ctx.beginPath();ctx.arc(p[0]*w*0.22,p[1]*h*0.22,mn*0.13,0,7);ctx.stroke();
        ctx.beginPath();ctx.arc(p[0]*w*0.22,p[1]*h*0.22,mn*0.06,0,7);ctx.stroke();
        for(let i=0;i<4;i++){const a=i*Math.PI/2;line(p[0]*w*0.22+Math.cos(a)*mn*.05,p[1]*h*0.22+Math.sin(a)*mn*.05,p[0]*w*0.22+Math.cos(a)*mn*.15,p[1]*h*0.22+Math.sin(a)*mn*.15);}
      });
      ctx.fillStyle='#aab4c2';for(let i=0;i<4;i++)ctx.fillRect(L+w*(.2+i*.15),T+h*.02,w*.1,h*.06);
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'geladeira':case 'geladeira_side':{
      rbox(6);line(L+w*.05,T+h*0.48,R-w*.05,T+h*0.48);
      if(kind==='geladeira_side'){
        line(0,T,0,B);
        rect(L+w*.1,T+h*.6,w*.05,h*.3,'#ccc');rect(w*.1,T+h*.6,w*.05,h*.3,'#ccc');
      }else{
        rect(R-w*.15,T+h*.1,w*.05,h*.3,'#ccc');rect(R-w*.15,T+h*.6,w*.05,h*.3,'#ccc');
      }
      break;}
    case 'micro':case 'lava_loucas':case 'maquina':case 'secadora':{
      rbox(5);
      if(kind==='micro'){ctx.fillStyle='#111';rr(ctx,L+w*.05,T+h*.05,w*.65,h*.9,3);ctx.fill();ctx.fillStyle=soft;rect(R-w*.2,T+h*.1,w*.12,h*.3);}
      else {
        ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,mn*0.35,0,7);ctx.fill();ctx.stroke();
        ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(0,0,mn*0.25,Math.PI*.8,Math.PI*2.2);ctx.stroke();ctx.strokeStyle=stroke;
        ctx.fillStyle=soft;rect(L+w*.1,T+h*.05,w*.2,h*.15);
      }
      break;}
    case 'tanque':rbox(6);ctx.fillStyle='#f7fbff';rr(ctx,L+w*.1,T+h*.1,w*.8,h*.6,6);ctx.fill();ctx.stroke();oval(0,T+h*.4,mn*.05,mn*.05,'#111');
      break;
    case 'pia_cozinha':case 'pia_dupla':case 'bancada':{
      rbox(3);ctx.fillStyle=soft;rr(ctx,L+w*0.05,T+h*0.1,w*0.9,h*0.8,4);ctx.fill();ctx.stroke();
      const drawCuba=(cx)=>{
        ctx.fillStyle='#f7fbff';rr(ctx,cx-w*.15,T+h*.15,w*.3,h*.6,8);ctx.fill();ctx.stroke();
        oval(cx,T+h*.45,mn*.04,mn*.04,'#111');
        ctx.beginPath();ctx.moveTo(cx,T+h*.15);ctx.bezierCurveTo(cx+w*.05,T+h*.25,cx+w*.05,T+h*.35,cx,T+h*.4);ctx.lineWidth=3;ctx.strokeStyle='#aab4c2';ctx.stroke();ctx.lineWidth=lineWidth||1.6;ctx.strokeStyle=stroke;
        oval(cx-w*.05,T+h*.1,mn*.03,mn*.03,'#ccc');oval(cx+w*.05,T+h*.1,mn*.03,mn*.03,'#ccc');
      };
      if(kind==='pia_dupla'){drawCuba(L+w*.3);drawCuba(R-w*.3);}
      else if(kind==='pia_cozinha'){drawCuba(R-w*.25);}
      break;}
    case 'pia_cooktop_120':{
      rbox(3);
      ctx.globalAlpha=0.15; ctx.fillStyle='#000'; ctx.fillRect(L, T, w, h*0.05); ctx.globalAlpha=1.0;
      
      const cubaW = w * 0.34;
      const cubaH = h * 0.65;
      const cubaX = L + w * 0.06;
      const cubaY = T + h * 0.2;
      ctx.fillStyle='#f7fbff';
      rr(ctx,cubaX,cubaY,cubaW,cubaH,12);ctx.fill();ctx.stroke();
      
      oval(cubaX+cubaW/2,cubaY+cubaH/2,mn*.08,mn*.08,'#d1d8df');
      oval(cubaX+cubaW/2,cubaY+cubaH/2,mn*.05,mn*.05,'#111');
      
      ctx.beginPath();ctx.moveTo(cubaX+cubaW/2,T+h*.10);
      ctx.bezierCurveTo(cubaX+cubaW/2+w*.05,T+h*.18,cubaX+cubaW/2+w*.05,T+h*.28,cubaX+cubaW/2,T+h*.33);
      ctx.lineWidth=3.5;ctx.strokeStyle='#aab4c2';ctx.stroke();
      ctx.lineWidth=lineWidth||1.6;ctx.strokeStyle=stroke;
      
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      const grX = L + w * 0.44;
      for(let i=0; i<6; i++){
          const gy = T + h * 0.30 + i * (h * 0.08);
          const gw = w * 0.18 - i*(w*.005);
          ctx.beginPath(); ctx.moveTo(grX, gy); ctx.lineTo(grX + gw, gy + h * 0.02); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = lineWidth||1.6;
      
      const cookW = w * 0.27;
      const cookH = h * 0.85;
      const cookX = R - w * 0.30;
      const cookY = T + h * 0.08;
      
      ctx.fillStyle='#111';
      rr(ctx,cookX,cookY,cookW,cookH,2);ctx.fill();ctx.stroke();
      
      ctx.globalAlpha=0.15;
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.moveTo(cookX,cookY);ctx.lineTo(cookX+cookW,cookY);ctx.lineTo(cookX,cookY+cookH);ctx.fill();
      ctx.globalAlpha=1.0;

      const b1x = cookX + cookW * 0.40, b1y = cookY + cookH * 0.30;
      const b2x = cookX + cookW * 0.60, b2y = cookY + cookH * 0.65;
      
      ctx.strokeStyle='#dce0e3';
      ctx.lineWidth=2;
      [[b1x,b1y, mn*.10],[b2x,b2y, mn*.12]].forEach(b => {
         ctx.fillStyle='#333'; ctx.beginPath();ctx.arc(b[0],b[1],b[2],0,7);ctx.fill();ctx.stroke();
         ctx.fillStyle='#111'; ctx.beginPath();ctx.arc(b[0],b[1],b[2]*0.5,0,7);ctx.fill();
         ctx.beginPath();ctx.moveTo(b[0]-b[2]*1.3,b[1]);ctx.lineTo(b[0]+b[2]*1.3,b[1]);ctx.stroke();
         ctx.beginPath();ctx.moveTo(b[0],b[1]-b[2]*1.3);ctx.lineTo(b[0],b[1]+b[2]*1.3);ctx.stroke();
      });
      ctx.lineWidth=lineWidth||1.6;

      oval(cookX + cookW * 0.30, cookY + cookH * 0.88, mn*.03, mn*.03, '#333');
      oval(cookX + cookW * 0.70, cookY + cookH * 0.88, mn*.03, mn*.03, '#333');
      break;}
    case 'vaso':{
      ctx.fillStyle='#fff';rr(ctx,L+w*.1,T,w*.8,h*.35,6);ctx.fill();ctx.stroke();
      oval(0,T+h*.18,w*.1,h*.05,'#ccc');
      ctx.fillStyle='#fff';oval(0,T+h*.65,w*.35,h*.35);
      ctx.beginPath();ctx.ellipse(0,T+h*.65,w*.2,h*.22,0,0,7);ctx.stroke();
      break;}
    case 'bide':oval(0,0,w*0.42,h*0.42,'#ffffff');ctx.beginPath();ctx.ellipse(0,0,w*.23,h*.2,0,0,7);ctx.stroke();oval(0,-h*.15,mn*.05,mn*.05,'#aab4c2');break;
    case 'lavatorio':case 'gabinete_banho':{
      rbox(6);ctx.fillStyle='#fff';oval(0,T+h*.45,w*0.35,h*0.35);
      oval(0,T+h*.45,mn*.04,mn*.04,'#111');
      ctx.beginPath();ctx.moveTo(0,T+h*.1);ctx.lineTo(0,T+h*.25);ctx.lineWidth=3;ctx.strokeStyle='#ccc';ctx.stroke();ctx.lineWidth=lineWidth||1.6;ctx.strokeStyle=stroke;
      break;}
    case 'chuveiro':case 'chuveiro_duplo':{
      ctx.fillStyle=hexA('#e0f7fa',0.3);rr(ctx,L,T,w,h,2);ctx.fill();
      ctx.setLineDash([4,4]);line(L,T,R,B);line(R,T,L,B);ctx.setLineDash([]);
      const drawShower=(sx)=>{
        oval(sx,T+h*.2,mn*.15,mn*.15,'#ccc');
        for(let i=0;i<5;i++)for(let j=0;j<5;j++){ctx.fillStyle='#fff';ctx.fillRect(sx-mn*.08+i*mn*.03,T+h*.12+j*mn*.03,1,1);}
        oval(sx,T+h*.05,mn*.04,mn*.04,'#aab4c2');
      };
      if(kind==='chuveiro_duplo'){drawShower(L+w*.3);drawShower(R-w*.3);}else{drawShower(0);}
      oval(R-mn*.1,B-mn*.1,mn*.05,mn*.05,'#111');
      break;}
    case 'banheira':case 'jacuzzi':{
      rbox(kind==='jacuzzi'?w/2:12);
      ctx.fillStyle='#f7fbff';rr(ctx,L+w*.1,T+h*.1,w*.8,h*.8,kind==='jacuzzi'?w*.4:10);ctx.fill();ctx.stroke();
      if(kind==='jacuzzi'){
        ctx.fillStyle='#a8d3e6';rr(ctx,L+w*.15,T+h*.15,w*.7,h*.7,w*.35);ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.arc(Math.cos(a)*w*.3,Math.sin(a)*h*.3,mn*.04,0,7);ctx.stroke();}ctx.lineWidth=lineWidth||1.6;ctx.strokeStyle=stroke;
      }else{
        oval(R-w*.15,0,mn*.05,mn*.05,'#111');
        ctx.beginPath();ctx.moveTo(L+w*.1,0);ctx.lineTo(L+w*.2,0);ctx.lineWidth=4;ctx.strokeStyle='#ccc';ctx.stroke();ctx.lineWidth=lineWidth||1.6;ctx.strokeStyle=stroke;
      }
      break;}
    case 'espelho':case 'toalheiro':rbox(4);line(L+w*.15,0,R-w*.15,0);if(kind==='espelho'){ctx.fillStyle=hexA('#82b6c8',0.4);ctx.fillRect(L+4,T+4,w-8,h-8);}break;
    case 'escrivaninha':case 'penteadeira':{
      rbox(4);line(L,T+h*0.4,R,T+h*0.4);
      ctx.fillStyle=soft;rect(R-w*.25,T+h*.1,w*.2,h*.25);
      if(kind==='escrivaninha'){ctx.fillStyle='#111';rect(L+w*.1,T+h*.1,w*.3,h*.2);ctx.fillStyle='#ccc';rect(L+w*.15,T+h*.35,w*.2,h*.1);}
      else{oval(0,T+h*.2,w*.2,h*.15,'#82b6c8');}
      break;}
    case 'mesa_l':{
      shadowOn();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R,T);ctx.lineTo(R,T+h*.55);ctx.lineTo(L+w*.55,T+h*.55);ctx.lineTo(L+w*.55,B);ctx.lineTo(L,B);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.stroke();
      ctx.fillStyle='#111';rect(L+w*.1,T+h*.1,w*.2,h*.15);
      break;}
    case 'carro':case 'carro_pequeno':case 'carro_suv':{
      rbox(mn*0.2);
      ctx.fillStyle=hexA('#ffffff',0.7);
      ctx.beginPath();ctx.moveTo(L+w*.25,T+h*.2);ctx.lineTo(R-w*.25,T+h*.2);ctx.quadraticCurveTo(R-w*.15,h*.1,R-w*.25,B-h*.2);ctx.lineTo(L+w*.25,B-h*.2);ctx.quadraticCurveTo(L+w*.15,h*.1,L+w*.25,T+h*.2);ctx.fill();ctx.stroke();
      rect(L+w*.1,B-h*.18,w*.2,h*.08,'#111');rect(R-w*.3,B-h*.18,w*.2,h*.08,'#111');
      line(L+w*.25,T+h*.45,R-w*.25,T+h*.45);
      break;}
    case 'moto':{
      ctx.fillStyle=fill;rr(ctx,L+w*.25,T+h*.15,w*.5,h*.7,w*.2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#222';ctx.beginPath();ctx.arc(0,T+h*.1,w*.24,0,7);ctx.fill();
      ctx.beginPath();ctx.arc(0,B-h*.1,w*.24,0,7);ctx.fill();
      line(L+w*.08,T+h*.16,R-w*.08,T+h*.16);
      break;}
    case 'bicicleta':{
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,T+h*.14,w*.36,0,7);ctx.stroke();
      ctx.beginPath();ctx.arc(0,B-h*.14,w*.36,0,7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,T+h*.14);ctx.lineTo(0,B-h*.14);ctx.stroke();
      line(L+w*.18,T+h*.32,R-w*.18,T+h*.06);
      ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'churrasqueira':case 'churrasqueira_gourmet':{
      rbox(4);ctx.fillStyle='#282828';
      if(kind==='churrasqueira_gourmet'){
        rect(L+w*.1,T+h*.1,w*.4,h*.8);
        ctx.fillStyle=soft;rect(R-w*.4,T+h*.1,w*.3,h*.8);
      }else{
        ctx.beginPath();ctx.arc(0,0,mn*0.35,0,7);ctx.fill();ctx.stroke();
      }
      ctx.strokeStyle='#d8d8d8';ctx.lineWidth=2;
      for(let i=-3;i<=3;i++)line((kind==='churrasqueira_gourmet'?L+w*.15:-mn*.25),i*mn*.08,(kind==='churrasqueira_gourmet'?L+w*.45:mn*.25),i*mn*.08);
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      ctx.fillStyle='#e86617';oval((kind==='churrasqueira_gourmet'?L+w*.3:0),0,mn*.15,mn*.15);
      break;}
    case 'piscina':{
      const deck='#f1dfbd',water='#8cd6f5',edge='#aeb8bf';
      ctx.fillStyle=deck;rr(ctx,L,T,w,h,10);ctx.fill();ctx.strokeStyle='#b98b5d';ctx.stroke();
      const p=Math.max(6,mn*0.08),iw=w-p*2,ih=h-p*2;
      ctx.fillStyle=water;rr(ctx,L+p,T+p,iw,ih,8);ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=3;ctx.stroke();
      ctx.strokeStyle=hexA('#ffffff',0.5);ctx.lineWidth=2;
      for(let i=0;i<10;i++){
        ctx.beginPath();ctx.moveTo(L+p+Math.random()*(iw*.8),T+p+Math.random()*(ih*.8));
        ctx.quadraticCurveTo(0,0,L+p+Math.random()*(iw*.8),T+p+Math.random()*(ih*.8));ctx.stroke();
      }
      ctx.strokeStyle='#7d8d98';ctx.lineWidth=1.5;const lx=R-p*1.5;
      for(let i=0;i<4;i++)line(lx,T+p*(1.5+i*.5),lx+p*.6,T+p*(1.5+i*.5));
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'escada':{
      box();const n=Math.floor(h/20);
      for(let i=1;i<n;i++)line(L,T+h*i/n,R,T+h*i/n);
      ctx.lineWidth=3;line(L,T,L,B);line(R,T,R,B);ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'escada_l_longa':case 'escada_l_curta':{
      box();const aw=w*0.4,ah=h*0.4;
      const nv=Math.max(1,Math.floor((h-ah)/18));
      for(let i=1;i<=nv;i++){const yy=T+ah+(h-ah)*i/(nv+1);line(L,yy,L+aw,yy);}
      const nh=Math.max(1,Math.floor((w-aw)/18));
      for(let i=1;i<=nh;i++){const xx=L+aw+(w-aw)*i/(nh+1);line(xx,T,xx,T+ah);}
      line(L+aw,T,L+aw,T+ah);line(L,T+ah,L+aw,T+ah);
      ctx.beginPath();ctx.moveTo(L+aw*0.2,T+ah*0.8);ctx.lineTo(L+aw*0.8,T+ah*0.2);ctx.stroke();
      break;}
    case 'escada_caracol':{
      box();const rad=mn*0.46;
      ctx.beginPath();ctx.arc(0,0,rad,0,7);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,rad*0.25,0,7);ctx.stroke();
      for(let i=0;i<14;i++){const a=i*Math.PI*2/14;line(Math.cos(a)*rad*0.25,Math.sin(a)*rad*0.25,Math.cos(a)*rad,Math.sin(a)*rad);}
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,rad*0.08,0,7);ctx.fill();
      break;}
    case 'pilar':case 'viga':{
      ctx.fillStyle='#cdd2cb';ctx.fillRect(L,T,w,h);ctx.strokeRect(L,T,w,h);
      if(kind==='pilar'){line(L,T,R,B);line(R,T,L,B);}
      else{for(let i=1;i<5;i++)line(L+w*i/5,T,L+w*i/5,B);}
      break;}
    case 'espreguicadeira':{
      rbox(8);ctx.fillStyle=hexA('#ffffff',0.6);rr(ctx,L+w*.15,T+h*.1,w*.7,h*.3,5);ctx.fill();ctx.stroke();
      for(let i=1;i<8;i++)line(L+w*.2,T+h*(.4+i*.07),R-w*.2,T+h*(.4+i*.07));
      break;}
    case 'ombrelone':{
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,mn/2,0,7);ctx.fill();ctx.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4;line(0,0,Math.cos(a)*mn/2,Math.sin(a)*mn/2);}
      ctx.fillStyle='#333';ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill();
      break;}
    case 'banco_jardim':case 'sofa_ext':{
      rbox(6);
      if(kind==='sofa_ext'){
        rect(L,T,w,h*.2,soft);
        rect(L,T,w*.15,h,soft);rect(R-w*.15,T,w*.15,h,soft);
        cushion(L+w*.15+2,T+h*.2+2,w*.35-4,h*.8-4,5);cushion(R-w*.5+2,T+h*.2+2,w*.35-4,h*.8-4,5);
      }else{
        for(let i=1;i<5;i++)line(L+4,T+h*i/5,R-4,T+h*i/5);
      }
      break;}
    case 'tabua_passar':{
      shadowOn();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(R-w*.2,T);ctx.quadraticCurveTo(R,T+h/2,R-w*.2,B);ctx.lineTo(L,B);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.stroke();
      ctx.fillStyle='#ccc';rect(L-w*.1,T+h*.2,w*.15,h*.6);
      break;}
    case 'varal':{
      box();ctx.setLineDash([5,4]);
      for(let i=1;i<5;i++)line(L+w*.05,T+h*i/5,R-w*.05,T+h*i/5);
      ctx.setLineDash([]);
      ctx.lineWidth=3;line(L,T,L,B);line(R,T,R,B);ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'tanquinho':{
      rbox(6);oval(0,0,mn*.38,mn*.38,'#fff');oval(0,0,mn*.18,mn*.18,'#ccc');
      break;}
    case 'planta':case 'arvore':{
      ctx.fillStyle='#785532';ctx.beginPath();ctx.arc(0,0,mn*(kind==='arvore'?.2:.35),0,7);ctx.fill();ctx.stroke();
      const nLeaves=kind==='arvore'?24:12;
      for(let i=0;i<nLeaves;i++){
        const a=i*Math.PI*2/nLeaves + (Math.random()*0.4-0.2);
        const lLen=mn*(kind==='arvore'?0.45:0.4) + Math.random()*mn*.1;
        leaf(0,0,a,lLen,mn*.15,i%2===0?'#4c8c4a':'#5aa469');
      }
      break;}
    case 'tapete_banho':rbox(10);ctx.globalAlpha=0.8;ctx.strokeStyle=soft;ctx.lineWidth=2;for(let i=1;i<6;i++)line(L+w*i/6,T+4,L+w*i/6,B-4);ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;break;
    case 'cesto_lixo':case 'cesto_roupa':{
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,mn*.4,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,mn*.3,0,7);ctx.stroke();
      if(kind==='cesto_roupa'){ctx.globalAlpha=0.5;ctx.fillStyle=soft;ctx.beginPath();ctx.arc(0,0,mn*.25,0,7);ctx.fill();ctx.globalAlpha=1;}
      break;}
    case 'prateleira_banho':rbox(3);for(let i=1;i<4;i++)line(L,T+h*i/4,R,T+h*i/4);break;
    
    case 'mesa_sinuca':{
      rbox(8);ctx.fillStyle='#367a36';rr(ctx,L+w*.08,T+h*.12,w*.84,h*.76,4);ctx.fill();ctx.stroke();
      ctx.fillStyle='#111';
      [[L+w*.1,T+h*.15],[0,T+h*.12],[R-w*.1,T+h*.15],[L+w*.1,B-h*.15],[0,B-h*.12],[R-w*.1,B-h*.15]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],mn*.06,0,7);ctx.fill();});
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(L+w*.3,0,3,0,7);ctx.fill();
      ctx.fillStyle='#d93838';ctx.beginPath();ctx.arc(R-w*.3,0,3,0,7);ctx.fill();
      break;}
    case 'esteira':{
      rbox(4);ctx.fillStyle='#222';rect(L+w*.1,T+h*.1,w*.8,h*.8);
      ctx.fillStyle='#555';rect(R-w*.2,T,w*.2,h);
      ctx.fillStyle='#aaddff';rect(R-w*.15,T+h*.3,w*.08,h*.4);
      break;}
    case 'bicicleta_ergometrica':{
      rbox(4);ctx.fillStyle='#333';rect(L+w*.1,T+h*.4,w*.6,h*.2);
      oval(L+w*.3,0,mn*.3,mn*.3,'#111');
      rect(R-w*.2,T+h*.3,w*.1,h*.4,'#555');
      break;}
    case 'banco_supino':{
      rbox(4);ctx.fillStyle='#c23636';rr(ctx,L+w*.1,T+h*.35,w*.8,h*.3,5);ctx.fill();ctx.stroke();
      ctx.lineWidth=4;line(L+w*.2,T+h*.1,L+w*.2,B-h*.1);
      ctx.lineWidth=lineWidth||1.6;
      rect(L+w*.15,T,w*.1,h*.2,'#333');rect(L+w*.15,B-h*.2,w*.1,h*.2,'#333');
      break;}
    case 'pista_danca':{
      box();const cols=4,rows=4;
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)if((i+j)%2===0){ctx.fillStyle=hexA('#ffffff',0.14);ctx.fillRect(L+w*i/cols,T+h*j/rows,w/cols,h/rows);}
      ctx.strokeStyle=hexA('#ffffff',0.3);ctx.lineWidth=1;
      for(let i=1;i<cols;i++)line(L+w*i/cols,T,L+w*i/cols,B);
      for(let j=1;j<rows;j++)line(L,T+h*j/rows,R,T+h*j/rows);
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,mn*.08,0,7);ctx.fill();ctx.stroke();
      break;}
    case 'palco':{
      rbox(4);ctx.strokeStyle=hexA(stroke,0.4);ctx.lineWidth=1.5;
      for(let i=1;i<4;i++)line(L,T+h*i/4,R,T+h*i/4);
      ctx.lineWidth=3;ctx.strokeStyle=stroke;line(L,B,R,B);ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'som':{
      box();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,h*.12,mn*.28,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#555';ctx.beginPath();ctx.arc(0,h*.12,mn*.12,0,7);ctx.fill();
      ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,-h*.32,mn*.12,0,7);ctx.fill();ctx.stroke();
      break;}
    case 'balcao_bar':{
      rbox(6);ctx.fillStyle=soft;rect(L+w*.03,B-h*.18,w*.94,h*.1);
      ctx.strokeStyle=hexA(stroke,0.4);ctx.lineWidth=1.2;
      for(let i=1;i<6;i++)line(L+w*i/6,T+h*.1,L+w*i/6,B-h*.25);
      ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;
      break;}
    case 'banqueta_redonda':{
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,mn/2,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,mn/2-5,0,7);ctx.strokeStyle=hexA(stroke,0.3);ctx.stroke();ctx.strokeStyle=stroke;
      break;}
    case 'mesinha_redonda':{
      oval(0,0,w/2,h/2,fill);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,mn*.12,0,7);ctx.fill();ctx.stroke();
      break;}
    case 'cadeira_giratoria':{
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,-h*.08,mn*.32,0,7);ctx.fill();ctx.stroke();
      ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-h*.08,mn*.32,Math.PI*0.15,Math.PI*0.85);ctx.stroke();ctx.lineWidth=lineWidth||1.6;
      ctx.fillStyle='#333';ctx.beginPath();ctx.arc(0,0,mn*.05,0,7);ctx.fill();
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*mn*.4,Math.sin(a)*mn*.4,mn*.045,0,7);ctx.fillStyle='#222';ctx.fill();}
      break;}
    case 'notebook':{
      rbox(3);ctx.fillStyle='#1f1f1f';rect(L+w*.06,T+h*.04,w*.88,h*.18);
      ctx.fillStyle=soft;rr(ctx,L+w*.1,T+h*.28,w*.8,h*.62,2);ctx.fill();ctx.stroke();
      break;}

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
function drawSavedMeasure(m){drawDim(m.x1,m.y1,m.x2,m.y2);}

function drawSelection(){drawSelectionRef(sel);}
function drawMultiSelection(){(multiSel||[]).forEach(r=>drawSelectionRef(r));}
function drawSelectionRef(s){const sc=scl();if(!s)return;
  if(s.kind==='wall'){const w=state.walls.find(o=>o.id===s.id);if(!w)return;[[w.x1,w.y1],[w.x2,w.y2]].forEach(p=>handle(...toScreen(p[0],p[1])));if(activeWallPoint&&pseg(activeWallPoint.x,activeWallPoint.y,w.x1,w.y1,w.x2,w.y2).d<0.001)handle(...toScreen(activeWallPoint.x,activeWallPoint.y));}
  else if(s.kind==='room'){const r=state.rooms.find(o=>o.id===s.id);if(!r)return;const[x,y]=toScreen(r.x,r.y),w=r.w*sc,h=r.h*sc;c.strokeStyle=r.locked?'#d9544f':'#e08a3c';c.lineWidth=2;c.strokeRect(x,y,w,h);if(!r.locked)[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(p=>handle(p[0],p[1]));}
  else if(s.kind==='floor'){const f=(state.floors||[]).find(o=>o.id===s.id);if(!f)return;const[x,y]=toScreen(f.x,f.y),w=f.w*sc,h=f.h*sc;c.strokeStyle=f.locked?'#d9544f':'#e08a3c';c.lineWidth=2;c.strokeRect(x,y,w,h);if(!f.locked)[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(p=>handle(p[0],p[1]));}
  else if(s.kind==='furniture'){const f=state.furniture.find(o=>o.id===s.id);if(!f)return;const[cx,cy]=toScreen(f.x,f.y);c.save();c.translate(cx,cy);c.rotate(f.angle||0);const w=f.w*sc,h=f.h*sc;c.strokeStyle='#e08a3c';c.lineWidth=2;c.strokeRect(-w/2,-h/2,w,h);c.beginPath();c.moveTo(0,-h/2);c.lineTo(0,-h/2-22);c.stroke();c.restore();const ra=rotPos(f);c.fillStyle='#e08a3c';c.beginPath();c.arc(ra[0],ra[1],6,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}
  else if(s.kind==='opening'){const o=state.openings.find(x=>x.id===s.id);if(!o)return;const dx=Math.cos(o.angle),dy=Math.sin(o.angle);[-1,1].forEach(sg=>handle(...toScreen(o.x+sg*dx*o.width/2,o.y+sg*dy*o.width/2)));}
  else if(s.kind==='measure'){const m=(state.measures||[]).find(o=>o.id===s.id);if(!m)return;handle(...toScreen(m.x1,m.y1));handle(...toScreen(m.x2,m.y2));}
  else if(s.kind==='group'){const g=(state.groups||[]).find(o=>o.id===s.id);if(g)(g.items||[]).forEach(r=>drawSelectionRef(r));}
  else if(s.kind==='text'){const t=state.texts.find(o=>o.id===s.id);if(!t)return;const m=textMetrics(t),wpx=m.w*sc,hpx=m.h*sc,[cx,cy]=toScreen(t.x+m.w/2,t.y+m.h/2);
    c.save();c.translate(cx,cy);c.rotate(t.angle||0);c.strokeStyle='#e08a3c';c.lineWidth=1.5;c.strokeRect(-wpx/2-8,-hpx/2-8,wpx+16,hpx+16);
    c.beginPath();c.moveTo(0,-hpx/2-8);c.lineTo(0,-hpx/2-8-22);c.stroke();c.restore();
    const ra=rotPosText(t);c.fillStyle='#e08a3c';c.beginPath();c.arc(ra[0],ra[1],6,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}}
function handle(x,y){c.fillStyle='#fff';c.strokeStyle='#e08a3c';c.lineWidth=2;c.beginPath();c.rect(x-5,y-5,10,10);c.fill();c.stroke();}
function rotPos(f){const sc=scl(),dy=-(f.h*sc/2+22),a=f.angle||0,rx=-(-dy)*0+(-dy)*0;const px=0*Math.cos(a)-dy*Math.sin(a),py=0*Math.sin(a)+dy*Math.cos(a);const[cx,cy]=toScreen(f.x,f.y);return[cx+px,cy+py];}
function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function hexMix(a,b,t){
  const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16),m=(x,y)=>Math.round(x+(y-x)*t);
  return '#'+[m(pa>>16&255,pb>>16&255),m(pa>>8&255,pb>>8&255),m(pa&255,pb&255)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
