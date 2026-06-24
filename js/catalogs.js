"use strict";
//==================== CATALOGS ====================
const CONSTR_ITEMS = [
  ['Banheiro',[
    ['vaso','Vaso sanitário',0.4,0.6],['lavatorio','Lavatório',0.5,0.4],['chuveiro','Box / Chuveiro',0.9,0.9],
    ['banheira','Banheira',1.7,0.75],['bide','Bidê',0.4,0.55],['gabinete_banho','Gabinete',0.9,0.5],
    ['espelho','Espelho',0.8,0.08],['toalheiro','Toalheiro',0.6,0.08],
  ]],
  ['Cozinha',[
    ['pia_cozinha','Pia',1.2,0.6],['bancada','Bancada',2.0,0.6],['pia_cooktop_120','Pia 120 + cooktop',1.2,0.55],
    ['fogao','Fogão',0.6,0.6],['geladeira','Geladeira',0.7,0.7],['micro','Micro-ondas',0.5,0.35],['lava_loucas','Lava-louças',0.6,0.6],
  ]],
  ['Lavanderia',[
    ['tanque','Tanque',0.55,0.5],['maquina','Máq. de lavar',0.6,0.6],['secadora','Secadora',0.6,0.6],
  ]],
  ['Área externa',[
    ['churrasqueira','Churrasqueira',1.2,0.6],['piscina','Piscina',3.0,2.0],
  ]],
];

const FURNITURE_IMAGES = {};

const FURNI = [
  ['Sala de estar',[
    ['sofa','Sofá 3 lugares',2.0,0.9],['sofa2','Sofá 2 lugares',1.5,0.9],['sofa_l','Sofá em L',2.5,1.5],
    ['poltrona','Poltrona',0.8,0.8],['poltrona_reclinavel','Poltrona Reclinável',0.9,0.95],
    ['mesa_centro','Mesa de centro',1.1,0.6],['mesa_lateral','Mesa lateral',0.45,0.45],
    ['rack','Rack / TV',1.6,0.4],['painel_tv','Painel TV',1.8,0.18],['tv_plana','TV Tela Plana',1.2,0.15],
    ['estante','Estante',1.6,0.4],['aparador','Aparador',1.4,0.4],
    ['lareira','Lareira',1.2,0.4],['piano','Piano de Cauda',1.5,1.5],['tapete_sala','Tapete Felpudo',2.5,2.0]
  ]],
  ['Quarto',[
    ['cama_casal','Cama casal',1.4,1.9],['cama_solteiro','Cama solteiro',0.9,1.9],
    ['cama_queen','Cama queen',1.6,2.0],['cama_king','Cama king',1.9,2.0],
    ['cama_dossel','Cama com Dossel',1.7,2.1],['criado','Mesa de cabeceira',0.5,0.45],
    ['penteadeira','Penteadeira',1.1,0.45],['armario','Guarda-roupa',1.8,0.6],
    ['closet','Closet',2.2,0.65],['comoda','Cômoda',1.2,0.5],['berco','Berço',0.7,1.3],
    ['puff','Puff Redondo',0.5,0.5]
  ]],
  ['Cozinha',[
    ['mesa_cozinha','Mesa',1.0,0.7],['armario_cozinha','Armário',1.4,0.55],['ilha','Ilha gourmet',1.8,0.9],
    ['cadeira','Cadeira',0.45,0.45],['bar','Bar',1.2,0.5],['banqueta','Banqueta',0.4,0.4],
    ['geladeira_side','Geladeira Side-by-side',0.9,0.75],['pia_dupla','Pia Dupla',1.6,0.6]
  ]],
  ['Sala de jantar',[
    ['mesa_jantar','Mesa 6 lugares',1.6,0.9],['mesa_jantar_redonda','Mesa redonda',1.2,1.2],
    ['mesa_jantar_8','Mesa 8 lugares',2.2,1.0],['cadeira','Cadeira',0.45,0.45],
    ['buffet','Buffet',1.4,0.45],['cristaleira','Cristaleira',0.9,0.45],
  ]],
  ['Banheiro',[
    ['tapete_banho','Tapete',0.7,0.45],['cesto_lixo','Cesto de lixo',0.25,0.25],['cesto_roupa','Cesto de roupa',0.45,0.45],
    ['prateleira_banho','Prateleira',0.8,0.2],['jacuzzi','Banheira Jacuzzi',1.8,1.8],['chuveiro_duplo','Chuveiro Duplo',1.4,0.9]
  ]],
  ['Escritório',[
    ['escrivaninha','Escrivaninha',1.2,0.6],['mesa_l','Mesa em L',1.5,1.2],['cadeira_esc','Cadeira Office',0.65,0.65],
    ['estante2','Estante',1.6,0.4],['arquivo','Arquivo',0.5,0.55],['sofa_office','Sofá apoio',1.4,0.75],
    ['cadeira_giratoria','Cadeira giratória',0.6,0.6],['notebook','Notebook',0.35,0.25],
  ]],
  ['Lavanderia',[
    ['armario_lavanderia','Armário',1.2,0.5],['tabua_passar','Tábua passar',1.2,0.35],
    ['varal','Varal de roupa',1.4,0.7],['tanquinho','Tanquinho',0.45,0.45],
  ]],
  ['Área externa / Garagem',[
    ['espreguicadeira','Espreguiçadeira',0.75,1.9],['ombrelone','Ombrelone',1.8,1.8],
    ['planta','Vaso de planta',0.5,0.5],['arvore','Árvore Grande',1.5,1.5],['mesa_ext','Mesa externa',1.2,1.2],
    ['banco_jardim','Banco jardim',1.5,0.55],['sofa_ext','Sofá de Exterior',1.8,0.8],
    ['churrasqueira_gourmet','Churrasqueira Gourmet',1.6,0.7]
  ]],
  ['Veículos',[
    ['carro','Carro',1.8,4.5],['carro_pequeno','Carro pequeno',1.6,3.8],['carro_suv','SUV / Caminhonete',1.9,5.0],
    ['moto','Moto',0.8,2.1],['bicicleta','Bicicleta',0.6,1.7]
  ]],
  ['Lazer / Academia',[
    ['mesa_sinuca','Mesa de Sinuca',2.3,1.3],['esteira','Esteira',1.8,0.8],['bicicleta_ergometrica','Bicicleta Ergom.',1.2,0.6],
    ['banco_supino','Banco de Supino',1.4,1.2]
  ]],
  ['Festas / Danceteria',[
    ['pista_danca','Pista de dança',3.0,3.0],['palco','Palco',3.0,2.0],['som','Caixa de som',0.4,0.4],
    ['balcao_bar','Balcão de bar',2.5,0.6],['banqueta_redonda','Banqueta redonda',0.4,0.4],['mesinha_redonda','Mesinha redonda',0.6,0.6]
  ]]
];

const FURNITURE_IMAGE_BASES = ['/api/styled-assets','/assets/moveisestilizados'];
function assetNameSlug(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function categoryImageFolders(category){
  const slug=assetNameSlug(category);
  if(slug.includes('saladeestar'))return ['saladeestar'];
  if(slug.includes('saladejantar'))return ['saladejantar','saladeantar'];
  if(slug.includes('quarto'))return ['quarto'];
  if(slug.includes('cozinha'))return ['cozinha'];
  if(slug.includes('banheiro'))return ['banheiro'];
  if(slug.includes('lavanderia'))return ['lavanderia'];
  if(slug.includes('escrit'))return ['escritorio'];
  if(slug.includes('lazer')||slug.includes('academia'))return ['lazeracademia'];
  if(slug.includes('veiculo'))return ['veiculos'];
  if(slug.includes('externa')&&slug.includes('garagem'))return ['areaexternagaragem','areaexterna'];
  if(slug.includes('externa'))return ['areaexterna'];
  return ['geral'];
}
function furnitureAssetNames(kind,label){
  const labelSlug=assetNameSlug(label),kindSlug=assetNameSlug(kind),first=assetNameSlug(String(label||'').split(/\s+/)[0]);
  const names=[kind,kindSlug,labelSlug,labelSlug+'1',first,first+'1'];
  const parts=String(label||'').trim().split(/\s+/);
  if(parts.length>1){
    const withDe=assetNameSlug(parts[0]+' de '+parts.slice(1).join(' '));
    names.push(withDe,withDe+'1');
  }
  return [...new Set(names.filter(Boolean))];
}
function registerStyledFurnitureImages(groups){
  groups.forEach(([category,items])=>{
    const folders=categoryImageFolders(category);
    items.forEach(([kind,label])=>{
      const names=furnitureAssetNames(kind,label);
      const urls=[];
      [...folders,'geral'].forEach(folder=>{
        names.forEach(name=>{
          FURNITURE_IMAGE_BASES.forEach(base=>{
            const url=`${base}/${folder}/${name}.png`;
            if(name&&!urls.includes(url))urls.push(url);
          });
        });
      });
      FURNITURE_IMAGES[kind]=[...(FURNITURE_IMAGES[kind]||[]),...urls.filter(url=>!(FURNITURE_IMAGES[kind]||[]).includes(url))];
    });
  });
}
registerStyledFurnitureImages(FURNI);
registerStyledFurnitureImages(CONSTR_ITEMS.map(([category,items])=>[category,items]));
['viga','pilar','escada','escada_l_longa','escada_l_curta','escada_caracol'].forEach(kind=>{
  FURNITURE_IMAGES[kind]=[
    ...FURNITURE_IMAGE_BASES.flatMap(base=>[
      `${base}/estrutura/${kind}.png`,
      `${base}/geral/${kind}.png`
    ])
  ];
});
FURNITURE_IMAGES['carro']=[...(FURNITURE_IMAGES['carro']||[]),...FURNITURE_IMAGE_BASES.map(base=>`${base}/Veiculos/carr.png`)];

const TOOLS = [
  ['select','Selecionar / mover','V','<path d="M4 3l7 17 2.5-7L21 11z"/>'],
  ['wall','Parede','P','<path d="M3 21v-6l9-9 9 9v6"/><path d="M3 21h18"/>'],
  ['door','Porta','D','<path d="M4 21V4h10v17"/><path d="M14 13a8 8 0 0 0-8 8"/>'],
  ['window','Janela','J','<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>'],
  ['room','Cômodo','C','<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18" opacity=".4"/>'],
  ['text','Texto','T','<path d="M4 7V5h16v2M9 5v14M9 19h6"/>'],
  ['measure','Medir','R','<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v3M15 8v3M19 8v3"/>'],
];
