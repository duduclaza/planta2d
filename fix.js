const fs = require('fs');
let f = fs.readFileSync('c:/Users/duduc/Desktop/Planta 2d/js/render.js', 'utf8');

f = f.replace(
  'ctx.fillStyle=hexA(soft,0.6);rr(ctx,bx0,T+h*.04,bw,backH,6);ctx.fill();ctx.stroke();',
  'ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,bx0,T+h*.04,bw,backH,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();'
);

f = f.replace(
  'ctx.fillStyle=hexA(soft,0.6);rr(ctx,R-armW*2.5,T+h*.04,armW*2.5,h-h*.08,6);ctx.fill();ctx.stroke();',
  'ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,R-armW*2.5,T+h*.04,armW*2.5,h-h*.08,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();'
);

f = f.replace(
  'ctx.fillStyle=hexA(soft,0.5);rr(ctx,L+w*.18,T+h*.15,w*.64,h*.25,5);ctx.fill();ctx.stroke();',
  'ctx.globalAlpha=0.5;ctx.fillStyle=soft;rr(ctx,L+w*.18,T+h*.15,w*.64,h*.25,5);ctx.fill();ctx.globalAlpha=1;ctx.stroke();'
);

f = f.replace(
  "if(kind==='poltrona_reclinavel'){ctx.fillStyle=hexA(soft,0.4);rr(ctx,L+w*.25,B-h*.1,w*.5,h*.3,5);ctx.fill();ctx.stroke();}",
  "if(kind==='poltrona_reclinavel'){ctx.globalAlpha=0.4;ctx.fillStyle=soft;rr(ctx,L+w*.25,B-h*.1,w*.5,h*.3,5);ctx.fill();ctx.globalAlpha=1;ctx.stroke();}"
);

f = f.replace(
  'ctx.fillStyle=hexA(soft,0.6);rr(ctx,L+w*.2,T+h*.1,w*.6,h*.3,6);ctx.fill();ctx.stroke();',
  'ctx.globalAlpha=0.6;ctx.fillStyle=soft;rr(ctx,L+w*.2,T+h*.1,w*.6,h*.3,6);ctx.fill();ctx.globalAlpha=1;ctx.stroke();'
);

f = f.replace(
  'rbox(8);ctx.fillStyle=hexA(soft,0.4);rr(ctx,L+w*.08,T+h*.12,w*.84,h*.76,4);ctx.fill();',
  'rbox(8);ctx.globalAlpha=0.4;ctx.fillStyle=soft;rr(ctx,L+w*.08,T+h*.12,w*.84,h*.76,4);ctx.fill();ctx.globalAlpha=1;'
);

f = f.replace(
  'ctx.strokeStyle=hexA(soft,0.4);ctx.lineWidth=2;',
  'ctx.globalAlpha=0.4;ctx.strokeStyle=soft;ctx.lineWidth=2;'
);

f = f.replace(
  'ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;',
  'ctx.globalAlpha=1;ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1.6;'
);

f = f.replace(
  'ctx.strokeStyle=hexA(soft,0.8);ctx.lineWidth=2;',
  'ctx.globalAlpha=0.8;ctx.strokeStyle=soft;ctx.lineWidth=2;'
);

f = f.replace(
  "if(kind==='cesto_roupa'){ctx.fillStyle=hexA(soft,0.5);ctx.beginPath();ctx.arc(0,0,mn*.25,0,7);ctx.fill();}",
  "if(kind==='cesto_roupa'){ctx.globalAlpha=0.5;ctx.fillStyle=soft;ctx.beginPath();ctx.arc(0,0,mn*.25,0,7);ctx.fill();ctx.globalAlpha=1;}"
);

fs.writeFileSync('c:/Users/duduc/Desktop/Planta 2d/js/render.js', f);
console.log('Fixes applied.');
