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
    zonas: ['dormitorio', 'bano_alta']
  }
];

const ZONAS = {
  salon:      { id: 'salon',      nombre: 'Salón',       icono: '🛋️', planta: 'baja', color: '#38bdf8', plano: { x: 2, y: 3, w: 44, h: 48 } },
  cocina:     { id: 'cocina',     nombre: 'Cocina',      icono: '🍳', planta: 'baja', color: '#fbbf24', plano: { x: 48, y: 3, w: 30, h: 48 } },
  bano:       { id: 'bano',       nombre: 'Baño',        icono: '🚿', planta: 'baja', color: '#06b6d4', plano: { x: 80, y: 3, w: 18, h: 48 } },
  garaje:     { id: 'garaje',     nombre: 'Garaje',      icono: '🚗', planta: 'baja', color: '#94a3b8', plano: { x: 2, y: 54, w: 96, h: 43 } },
  dormitorio: { id: 'dormitorio', nombre: 'Dormitorio',  icono: '🛏️', planta: 'alta', color: '#a855f7', plano: { x: 2, y: 3, w: 58, h: 94 } },
  bano_alta:  { id: 'bano_alta',  nombre: 'Baño (Alta)', icono: '🚿', planta: 'alta', color: '#22d3ee', plano: { x: 63, y: 3, w: 35, h: 94 } }
};

const CATALOGO = [
  { id: 'tv',             emoji: '📺', nombre: 'Televisor',          potencia: 0.15, agua: 0.0, fp: 0.92, termica: 0,    zona: 'salon',      duplicable: false, posX: 36, posY: 20 },
  { id: 'luces_salon',    emoji: '💡', nombre: 'Luces salón',        potencia: 0.20, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'salon',      duplicable: true,  posX: 14, posY: 16 },
  { id: 'aire_salon',     emoji: '❄️', nombre: 'Aire acondicionado', potencia: 1.80, agua: 0.0, fp: 0.90, termica: -1.5, zona: 'salon',      duplicable: false, posX: 12, posY: 38 },

  { id: 'lavadora',       emoji: '🧺', nombre: 'Lavadora',           potencia: 2.0,  agua: 0.0, fp: 0.85, termica: 0,    zona: 'cocina',     duplicable: false, posX: 56, posY: 19 },
  { id: 'lavavajillas',   emoji: '🍽️', nombre: 'Lavavajillas',       potencia: 1.5,  agua: 0.0, fp: 0.88, termica: 0,    zona: 'cocina',     duplicable: false, posX: 68, posY: 19 },
  { id: 'horno',          emoji: '🔥', nombre: 'Horno',              potencia: 2.5,  agua: 0.0, fp: 0.95, termica: 2.2,  zona: 'cocina',     duplicable: false, posX: 56, posY: 39 },
  { id: 'microondas',     emoji: '📡', nombre: 'Microondas',         potencia: 1.2,  agua: 0.0, fp: 0.95, termica: 0.5,  zona: 'cocina',     duplicable: false, posX: 68, posY: 39 },
  { id: 'frigorifico',    emoji: '🧊', nombre: 'Frigorífico',        potencia: 0.15, agua: 0.0, fp: 0.95, termica: -0.1, zona: 'cocina',     duplicable: false, posX: 52, posY: 9, siempreOn: true },
  { id: 'luces_cocina',   emoji: '💡', nombre: 'Luces cocina',        potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'cocina',     duplicable: true,  posX: 70, posY: 9 },

  { id: 'ducha',          emoji: '🚿', nombre: 'Ducha (ACS)',        potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano',       duplicable: false, posX: 88, posY: 20 },
  { id: 'luces_bano',     emoji: '💡', nombre: 'Luces baño',         potencia: 0.10, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'bano',       duplicable: false, posX: 88, posY: 39 },

  { id: 'secadora',       emoji: '🌀', nombre: 'Secadora',           potencia: 2.2,  agua: 0.0, fp: 0.87, termica: 1.0,  zona: 'garaje',     duplicable: false, posX: 15, posY: 73 },
  { id: 'enchufe_garaje', emoji: '🔌', nombre: 'Enchufe garaje',     potencia: 0.6,  agua: 0.0, fp: 0.92, termica: 0,    zona: 'garaje',     duplicable: true,  posX: 35, posY: 73 },
  { id: 'luces_garaje',   emoji: '💡', nombre: 'Luces garaje',       potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'garaje',     duplicable: false, posX: 82, posY: 73 },

  { id: 'luces_dorm',     emoji: '💡', nombre: 'Luces dormitorio',   potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'dormitorio', duplicable: true,  posX: 14, posY: 20 },
  { id: 'radiador_dorm',  emoji: '🌡️', nombre: 'Radiador',          potencia: 0.2,  agua: 0.0, fp: 0.98, termica: 1.5,  zona: 'dormitorio', duplicable: true,  posX: 40, posY: 20 },
  { id: 'ventilador',     emoji: '💨', nombre: 'Ventilador',         potencia: 0.05, agua: 0.0, fp: 0.95, termica: 0,    zona: 'dormitorio', duplicable: false, posX: 14, posY: 43 },

  { id: 'ducha_alta',     emoji: '🚿', nombre: 'Ducha (ACS)',        potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano_alta',  duplicable: false, posX: 72, posY: 20 },
  { id: 'luces_bano_alta', emoji: '💡', nombre: 'Luces baño',         potencia: 0.10, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'bano_alta',  duplicable: false, posX: 86, posY: 20 }
];
