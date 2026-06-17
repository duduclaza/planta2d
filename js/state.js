"use strict";
//==================== STATE ====================
const PPM = 40;
let zoom = 1, panX = 0, panY = 0;
let snapOn = true, gridStep = 0.25;
let defaultWallT = 0.15;        // m
const state = { walls:[], openings:[], rooms:[], furniture:[], texts:[] };
let tool = 'select';
let doorSub='simples', winSub='simples';
let sel = null, drag = null, wallChain = [], mouseW = {x:0,y:0};
let panning = null, spaceDown = false, pendingFurniture = null;
const ROOM_COLORS = ['#4a90c2','#e08a3c','#5aa469','#9b6cc4','#c25d8a','#3aa0a0','#b08534'];
let history = [], future = [];
let uid = 1; const newId = ()=> 'e'+(uid++);
