// ================================================================
// ESTRUCTURA DE LA VIVIENDA: PLANTAS Y ZONAS
// ================================================================

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
  salon:      { id: 'salon',      nombre: 'Salón',      icono: '🛋️', planta: 'baja', color: '#38bdf8' },
  cocina:     { id: 'cocina',     nombre: 'Cocina',     icono: '🍳', planta: 'baja', color: '#fbbf24' },
  bano:       { id: 'bano',       nombre: 'Baño',       icono: '🚿', planta: 'baja', color: '#06b6d4' },
  garaje:     { id: 'garaje',     nombre: 'Garaje',     icono: '🚗', planta: 'baja', color: '#94a3b8' },
  dormitorio: { id: 'dormitorio', nombre: 'Dormitorio', icono: '🛏️', planta: 'alta', color: '#a855f7' },
  bano_alta:  { id: 'bano_alta',  nombre: 'Baño (Alta)', icono: '🚿', planta: 'alta', color: '#22d3ee' }
};

// ================================================================
// CATÁLOGO DE APARATOS
// ================================================================
// Cada aparato tiene ahora: zona por defecto, y un "tipo" que
// permite saber si es duplicable, su icono, etc.

const CATALOGO = [
  // --- Salón ---
  { id: 'tv',          emoji: '📺', nombre: 'Televisor',        potencia: 0.15, agua: 0.0, fp: 0.92, termica: 0,    zona: 'salon',      duplicable: false },
  { id: 'luces_salon', emoji: '💡', nombre: 'Luces salón',      potencia: 0.20, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'salon',      duplicable: true  },
  { id: 'aire_salon',  emoji: '❄️', nombre: 'Aire acondicionado', potencia: 1.80, agua: 0.0, fp: 0.90, termica: -1.5, zona: 'salon',      duplicable: false },

  // --- Cocina ---
  { id: 'lavadora',    emoji: '🧺', nombre: 'Lavadora',         potencia: 2.0, agua: 0.0, fp: 0.85, termica: 0,    zona: 'cocina',     duplicable: false },
  { id: 'lavavajillas', emoji: '🍽️', nombre: 'Lavavajillas',   potencia: 1.5, agua: 0.0, fp: 0.88, termica: 0,    zona: 'cocina',     duplicable: false },
  { id: 'horno',       emoji: '🔥', nombre: 'Horno',            potencia: 2.5, agua: 0.0, fp: 0.95, termica: 2.2,  zona: 'cocina',     duplicable: false },
  { id: 'microondas',  emoji: '📡', nombre: 'Microondas',       potencia: 1.2, agua: 0.0, fp: 0.95, termica: 0.5,  zona: 'cocina',     duplicable: false },
  { id: 'frigorifico', emoji: '🧊', nombre: 'Frigorífico',      potencia: 0.15, agua: 0.0, fp: 0.95, termica: -0.1, zona: 'cocina',     duplicable: false, siempreOn: true },
  { id: 'luces_cocina', emoji: '💡', nombre: 'Luces cocina',    potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'cocina',     duplicable: true  },

  // --- Baño (planta baja) ---
  { id: 'ducha',       emoji: '🚿', nombre: 'Ducha (ACS)',      potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano',       duplicable: false },
  { id: 'luces_bano',  emoji: '💡', nombre: 'Luces baño',       potencia: 0.10, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'bano',       duplicable: false },

  // --- Garaje ---
  { id: 'secadora',    emoji: '🌀', nombre: 'Secadora',         potencia: 2.2, agua: 0.0, fp: 0.87, termica: 1.0,  zona: 'garaje',     duplicable: false },
  { id: 'enchufe_garaje', emoji: '🔌', nombre: 'Enchufe garaje', potencia: 0.6, agua: 0.0, fp: 0.92, termica: 0,   zona: 'garaje',     duplicable: true  },
  { id: 'luces_garaje', emoji: '💡', nombre: 'Luces garaje',    potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'garaje',     duplicable: false },

  // --- Dormitorio ---
  { id: 'luces_dorm',  emoji: '💡', nombre: 'Luces dormitorio', potencia: 0.15, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'dormitorio', duplicable: true  },
  { id: 'radiador_dorm', emoji: '🌡️', nombre: 'Radiador',      potencia: 0.2, agua: 0.0, fp: 0.98, termica: 1.5,   zona: 'dormitorio', duplicable: true  },
  { id: 'ventilador',  emoji: '💨', nombre: 'Ventilador',       potencia: 0.05, agua: 0.0, fp: 0.95, termica: 0,    zona: 'dormitorio', duplicable: false },

  // --- Baño (planta alta) ---
  { id: 'ducha_alta',  emoji: '🚿', nombre: 'Ducha (ACS)',      potencia: 0.10, agua: 8.0, fp: 0.98, termica: 2.5,  zona: 'bano_alta',  duplicable: false },
  { id: 'luces_bano_alta', emoji: '💡', nombre: 'Luces baño',   potencia: 0.10, agua: 0.0, fp: 0.99, termica: 0.1,  zona: 'bano_alta',  duplicable: false }
];