"use strict";
//==================== STATE ====================
const PPM = 40;
let zoom = 1, panX = 0, panY = 0;
let snapOn = localStorage.getItem('planta2d:snapOn')!=='0', gridStep = 0.25;
let defaultWallT = 0.15;        // m
const state = { walls:[], openings:[], rooms:[], floors:[], furniture:[], texts:[], measures:[], groups:[] };
let furnitureTheme = localStorage.getItem('planta2d:furnitureTheme')||'clean3d';
let showMeasures = localStorage.getItem('planta2d:showMeasures')!=='0';
let propsMode = localStorage.getItem('planta2d:propsMode')||'pinned'; // pinned | auto | hidden
let tool = 'select';
let doorSub='simples', winSub='simples';
let sel = null, multiSel = [], drag = null, wallChain = [], mouseW = {x:0,y:0}, activeWallPoint = null;
let panning = null, spaceDown = false, pendingFurniture = null, pendingFloor = null;
const ROOM_COLORS = ['#4a90c2','#e08a3c','#5aa469','#9b6cc4','#c25d8a','#3aa0a0','#b08534'];
const FLOOR_MATERIALS = [
  ['plain','Simples','#d9dbd5',1],
  ['ceramic','Ceramica 45x45','#e8e1d3',0.45],
  ['ceramic_large','Ceramica 60x60','#ddd5c7',0.6],
  ['porcelain','Porcelanato 80x80','#eceff2',0.8],
  ['porcelain_marble','Porcelanato marmore','#f2f3ef',0.9],
  ['cement','Cimento queimado','#b8b9b4',1.0],
  ['wood','Madeira corrida','#c8945e',0.9],
  ['wood_herringbone','Madeira escama','#bf8751',0.65],
  ['laminate','Laminado','#d0a070',0.75],
  ['vinyl','Vinilico','#bfa184',0.6],
  ['stone','Pedra natural','#a8a79d',0.65],
  ['grass','Grama realista','#5f9b45',0.5],
  ['asphalt','Asfalto faixa amarela','#3c4148',1.2],
  ['sand','Areia','#d8b66a',0.45],
  ['external','Piso externo','#9aa08f',0.5]
];
let history = [], future = [];
let uid = 1; const newId = ()=> 'e'+(uid++);
