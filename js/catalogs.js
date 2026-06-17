"use strict";
//==================== CATALOGS ====================
const FURNI = [
  ['Sala de estar',[
    ['sofa','Sofá 3 lugares',2.0,0.9],['sofa2','Sofá 2 lugares',1.5,0.9],['poltrona','Poltrona',0.8,0.8],
    ['mesa_centro','Mesa de centro',1.1,0.6],['rack','Rack / TV',1.6,0.4],['estante','Estante',1.6,0.4],
  ]],
  ['Quarto',[
    ['cama_casal','Cama casal',1.4,1.9],['cama_solteiro','Cama solteiro',0.9,1.9],['criado','Criado-mudo',0.5,0.45],
    ['armario','Guarda-roupa',1.8,0.6],['comoda','Cômoda',1.2,0.5],['berco','Berço',0.7,1.3],
  ]],
  ['Cozinha',[
    ['fogao','Fogão',0.6,0.6],['geladeira','Geladeira',0.7,0.7],['pia_cozinha','Pia',1.2,0.6],
    ['bancada','Bancada',2.0,0.6],['micro','Micro-ondas',0.5,0.35],['mesa_cozinha','Mesa',1.0,0.7],
  ]],
  ['Sala de jantar',[
    ['mesa_jantar','Mesa de jantar',1.6,0.9],['cadeira','Cadeira',0.45,0.45],['buffet','Buffet',1.4,0.45],
  ]],
  ['Banheiro',[
    ['vaso','Vaso sanitário',0.4,0.6],['lavatorio','Lavatório',0.5,0.4],['chuveiro','Box / Chuveiro',0.9,0.9],
    ['banheira','Banheira',1.7,0.75],['bide','Bidê',0.4,0.55],
  ]],
  ['Escritório',[
    ['escrivaninha','Escrivaninha',1.2,0.6],['cadeira_esc','Cadeira',0.55,0.55],['estante2','Estante',1.6,0.4],
  ]],
  ['Lavanderia',[
    ['maquina','Máq. de lavar',0.6,0.6],['tanque','Tanque',0.55,0.5],
  ]],
  ['Área externa / Garagem',[
    ['carro','Carro',1.8,4.5],['churrasqueira','Churrasqueira',1.2,0.6],['piscina','Piscina',3.0,2.0],
    ['planta','Vaso de planta',0.5,0.5],['mesa_ext','Mesa externa',1.2,1.2],
  ]],
];

const TOOLS = [
  ['select','Selecionar / mover','V','<path d="M4 3l7 17 2.5-7L21 11z"/>'],
  ['wall','Parede','P','<path d="M3 21v-6l9-9 9 9v6"/><path d="M3 21h18"/>'],
  ['door','Porta','D','<path d="M4 21V4h10v17"/><path d="M14 13a8 8 0 0 0-8 8"/>'],
  ['window','Janela','J','<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>'],
  ['room','Cômodo','C','<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18" opacity=".4"/>'],
  ['text','Texto','T','<path d="M4 7V5h16v2M9 5v14M9 19h6"/>'],
  ['measure','Medir','R','<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v3M15 8v3M19 8v3"/>'],
];
