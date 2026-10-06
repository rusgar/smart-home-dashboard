const PLANTAS = [
  {
    id: 'baja',
    nombre: 'Planta Baja',
    icono: '🏠',
    zonas: ['salon', 'cocina', 'bano', 'garaje']
  },
  {
    id: 'alta',
    nombre: 'Planta Alta',
    icono: '🏡',
    zonas: ['dormitorio', 'dormitorio2', 'bano_alta']
  },
  {
    id: 'cubierta',
    nombre: 'Cubierta',
    icono: '↗',
    zonas: ['cubierta']
  }
];

const ZONAS = {
  salon:       { id: 'salon',       nombre: 'Salón',          icono: '🛋️', mueble: '🛋️', planta: 'baja',     suelo: 'madera',   color: '#38bdf8', plano: { x: 2, y: 3, w: 44, h: 48 } },
  cocina:      { id: 'cocina',      nombre: 'Cocina',         icono: '🍳', mueble: '🍽️', planta: 'baja',     suelo: 'baldosa',  color: '#fbbf24', plano: { x: 48, y: 3, w: 30, h: 48 } },
  bano:        { id: 'bano',        nombre: 'Baño',           icono: '🚿', mueble: '🛁', planta: 'baja',     suelo: 'baldosa',  color: '#06b6d4', plano: { x: 80, y: 3, w: 18, h: 48 } },
  garaje:      { id: 'garaje',      nombre: 'Garaje',         icono: '🚗', mueble: '🚗', planta: 'baja',     suelo: 'hormigon', color: '#94a3b8', plano: { x: 2, y: 54, w: 96, h: 43 } },
  dormitorio:  { id: 'dormitorio',  nombre: 'Dormitorio 1',   icono: '🛏️', mueble: '🛏️', planta: 'alta',     suelo: 'madera',   color: '#a855f7', plano: { x: 2, y: 3, w: 28, h: 94 } },
  dormitorio2: { id: 'dormitorio2', nombre: 'Dormitorio 2',   icono: '🛏️', mueble: '🛏️', planta: 'alta',     suelo: 'madera',   color: '#c084fc', plano: { x: 32, y: 3, w: 28, h: 94 } },
  bano_alta:   { id: 'bano_alta',   nombre: 'Baño (Alta)',    icono: '🚿', mueble: '🚿', planta: 'alta',     suelo: 'baldosa',  color: '#22d3ee', plano: { x: 63, y: 3, w: 35, h: 94 } },
  cubierta:    { id: 'cubierta',    nombre: 'Cubierta',       icono: '↗',  mueble: '☀️', planta: 'cubierta', suelo: 'tejado',   color: '#84cc16', plano: { x: 2, y: 3, w: 96, h: 94 } }
};

const CATEGORIAS = {
  luz:     { nombre: 'Iluminación',        color: '#f59e0b' },
  clima:   { nombre: 'Climatización',      color: '#ef4444' },
  vent:    { nombre: 'Ventilación',        color: '#22c55e' },
  electro: { nombre: 'Electrodomésticos',  color: '#14b8a6' },
  agua:    { nombre: 'Agua',               color: '#3b82f6' },
  garaje:  { nombre: 'Garaje',             color: '#a78bfa' },
  generacion: { nombre: 'Generación',      color: '#84cc16' }
};

const CATALOGO = [
  { id: 'tv',             emoji: '📺', nombre: 'Televisor 55"',       potencia: 0.10, agua: 0.0, fp: 0.92, termica: 0,    zona: 'salon',      duplicable: true,  posX: 36, posY: 20, categoria: 'electro' },
  { id: 'luces_salon',    emoji: '💡', nombre: 'Luces salón',        potencia: 0.10, agua: 0.0, fp: 0.95, termica: 0.05, zona: 'salon',      duplicable: true,  posX: 16, posY: 16, categoria: 'luz' },
  { id: 'aire_salon',     emoji: '❄️', nombre: 'Aire acondicionado', potencia: 1.10, agua: 0.0, fp: 0.95, termica: -2.0, zona: 'salon',      duplicable: true,  posX: 12, posY: 38, categoria: 'clima' },

  { id: 'lavadora',       emoji: '🧺', nombre: 'Lavadora',           potencia: 2.00, agua: 0.7, fp: 0.85, termica: 0,    zona: 'cocina',     duplicable: true,  posX: 56, posY: 19, categoria: 'electro' },
  { id: 'lavavajillas',   emoji: '🍽️', nombre: 'Lavavajillas',       potencia: 1.80, agua: 0.15, fp: 0.88, termica: 0,    zona: 'cocina',     duplicable: true,  posX: 68, posY: 19, categoria: 'electro' },
  { id: 'horno',          emoji: '🔥', nombre: 'Horno eléctrico',    potencia: 2.50, agua: 0.0, fp: 0.99, termica: 2.0,  zona: 'cocina',     duplicable: true,  posX: 56, posY: 39, categoria: 'electro' },
  { id: 'microondas',     emoji: '📡', nombre: 'Microondas',         potencia: 1.00, agua: 0.0, fp: 0.80, termica: 0.3,  zona: 'cocina',     duplicable: true,  posX: 68, posY: 39, categoria: 'electro' },
  { id: 'frigorifico',    emoji: '🧊', nombre: 'Frigorífico',        potencia: 0.08, agua: 0.0, fp: 0.72, termica: -0.1, zona: 'cocina',     duplicable: true,  posX: 62, posY: 9, siempreOn: true, categoria: 'electro' },
  { id: 'luces_cocina',   emoji: '💡', nombre: 'Luces cocina',        potencia: 0.06, agua: 0.0, fp: 0.95, termica: 0.03, zona: 'cocina',     duplicable: true,  posX: 70, posY: 9, categoria: 'luz' },

  { id: 'ducha',          emoji: '🚿', nombre: 'Ducha (ACS)',        potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano',       duplicable: true,  posX: 88, posY: 20, categoria: 'agua', acs: true },
  { id: 'luces_bano',     emoji: '💡', nombre: 'Luces baño',         potencia: 0.02, agua: 0.0, fp: 0.95, termica: 0.01, zona: 'bano',       duplicable: true,  posX: 88, posY: 39, categoria: 'luz' },

  { id: 'secadora',       emoji: '🌀', nombre: 'Secadora',           potencia: 2.50, agua: 0.0, fp: 0.95, termica: 1.0,  zona: 'garaje',     duplicable: true,  posX: 15, posY: 73, categoria: 'electro' },
  { id: 'enchufe_garaje', emoji: '🔌', nombre: 'Enchufe garaje',     potencia: 0.60, agua: 0.0, fp: 0.92, termica: 0,    zona: 'garaje',     duplicable: true,  posX: 35, posY: 73, categoria: 'garaje' },
  { id: 'luces_garaje',   emoji: '💡', nombre: 'Luces garaje',       potencia: 0.04, agua: 0.0, fp: 0.95, termica: 0.02, zona: 'garaje',     duplicable: true,  posX: 82, posY: 73, categoria: 'luz' },

  { id: 'luces_dorm',     emoji: '💡', nombre: 'Luces dormitorio 1', potencia: 0.03, agua: 0.0, fp: 0.95, termica: 0.01, zona: 'dormitorio',  duplicable: true,  posX: 16, posY: 20, categoria: 'luz' },
  { id: 'radiador_dorm',  emoji: '🌡️', nombre: 'Radiador dormitorio 1', potencia: 1.50, agua: 0.0, fp: 0.99, termica: 1.5, zona: 'dormitorio',  duplicable: true,  posX: 16, posY: 43, categoria: 'clima' },
  { id: 'ventilador',     emoji: '💨', nombre: 'Ventilador 1',      potencia: 0.05, agua: 0.0, fp: 0.70, termica: 0,    zona: 'dormitorio',  duplicable: true,  posX: 16, posY: 68, categoria: 'vent' },

  { id: 'luces_dorm2',    emoji: '💡', nombre: 'Luces dormitorio 2', potencia: 0.03, agua: 0.0, fp: 0.95, termica: 0.01, zona: 'dormitorio2', duplicable: true,  posX: 46, posY: 20, categoria: 'luz' },
  { id: 'radiador_dorm2', emoji: '🌡️', nombre: 'Radiador dormitorio 2', potencia: 1.50, agua: 0.0, fp: 0.99, termica: 1.5, zona: 'dormitorio2', duplicable: true,  posX: 46, posY: 43, categoria: 'clima' },
  { id: 'ventilador2',    emoji: '💨', nombre: 'Ventilador 2',      potencia: 0.05, agua: 0.0, fp: 0.70, termica: 0,    zona: 'dormitorio2', duplicable: true,  posX: 46, posY: 68, categoria: 'vent' },

  { id: 'ducha_alta',     emoji: '🚿', nombre: 'Ducha (ACS)',        potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano_alta',   duplicable: true,  posX: 72, posY: 20, categoria: 'agua', acs: true },
  { id: 'luces_bano_alta', emoji: '💡', nombre: 'Luces baño',         potencia: 0.02, agua: 0.0, fp: 0.95, termica: 0.01, zona: 'bano_alta',   duplicable: true,  posX: 86, posY: 40, categoria: 'luz' },

  { id: 'placas_solares', emoji: 'PV', nombre: 'Placas solares', potencia: 0, agua: 0, fp: 1, termica: 0, zona: 'cubierta', duplicable: false, posX: 35, posY: 32, tipo: 'generacion', fuente: 'solar', potenciaGeneracion: 6.5, generacionAutomatica: true, categoria: 'generacion' },
  { id: 'generador_diesel', emoji: 'DG', nombre: 'Generador diésel', potencia: 0, agua: 0, fp: 1, termica: 0, zona: 'cubierta', duplicable: false, posX: 70, posY: 68, tipo: 'generacion', fuente: 'diesel', potenciaGeneracion: 5, litrosGasoleoPorKwh: 0.28, categoria: 'generacion' }
];
