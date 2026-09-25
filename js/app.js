// ================================================================
// INSTANCIAS DE APARATOS
// El CATALOGO está definido en zonas.js (se carga antes que este archivo).
// ================================================================
const aparatos = {};
const contadorDuplicados = {};
const CLAVE_DISTRIBUCION = 'smart-home-distribucion-v1';

CATALOGO.forEach(a => {
  aparatos[a.id] = crearInstanciaAparato(a, a.id, 1);
});

function crearInstanciaAparato(catalogoItem, idInstancia, numero) {
  return {
    ...catalogoItem,
    idInstancia: idInstancia,
    idCatalogo: catalogoItem.id,
    numero: numero,
    zona: catalogoItem.zona,
    posX: Number.isFinite(catalogoItem.posX) ? catalogoItem.posX : 50,
    posY: Number.isFinite(catalogoItem.posY) ? catalogoItem.posY : 50,
    duracionMinutos: catalogoItem.fuente === 'diesel' ? 60 : 1,
    on: !!(catalogoItem.siempreOn || catalogoItem.generacionAutomatica),
    minutosRestantes: 0,
    duracionTotal: 0,
    energiaAcum: 0,
    aguaAcum: 0,
    termicaAcum: 0,
    horaInicio: null
  };
}

// ================================================================
// ESTADO GLOBAL
// ================================================================
const state = {
  hour: 0,
  minute: 0,
  playing: false,
  speed: 1,
  tabActiva: 'plano',
  plantaActiva: 'baja',
  aparatoSeleccionado: null,
  arrastre: null,
  baseElec: Array(24).fill(0),
  baseAgua: Array(24).fill(0),
  baseTerm: Array(24).fill(0),
  apElec: Array(24).fill(0),
  apAgua: Array(24).fill(0),
  apTerm: Array(24).fill(0),
  apPotenciaElec: Array(24).fill(0),
  apPotenciaAgua: Array(24).fill(0),
  apPotenciaTerm: Array(24).fill(0),
  solarGenerada: Array(24).fill(0),
  dieselGenerada: Array(24).fill(0),
  minutosSimulados: Array(24).fill(0),
  demandaHora: Array(24).fill(0),
  importRedHora: Array(24).fill(0),
  vertidoRedHora: Array(24).fill(0),
  solarPotencia: Array(24).fill(0),
  dieselPotencia: Array(24).fill(0),
  fp: Array(24).fill(0.95),
  energiaHoy: 0,
  aguaHoy: 0,
  termicaHoy: 0,
  gasHoy: 0,
  solarHoy: 0,
  dieselHoy: 0,
  dieselLitrosHoy: 0,
  importRedHoy: 0,
  vertidoRedHoy: 0,
  demandaActual: 0,
  potenciaCargaActual: 0,
  potenciaAguaActual: 0,
  potenciaTermicaActual: 0,
  generacionSolarActual: 0,
  generacionDieselActual: 0,
  importacionActual: 0
};

cargarDistribucion();

// ================================================================
// PERFILES BASE
// ================================================================
const PERFIL_ELEC_BASE = [
  0.15, 0.10, 0.10, 0.10, 0.10, 0.20,
  0.30, 0.40, 0.35, 0.25, 0.30, 0.35,
  0.40, 0.35, 0.30, 0.25, 0.30, 0.40,
  0.55, 0.60, 0.50, 0.40, 0.30, 0.20
];
const PERFIL_AGUA_BASE = [
  0.05, 0.02, 0.02, 0.02, 0.02, 0.15,
  0.30, 0.45, 0.25, 0.15, 0.20, 0.25,
  0.35, 0.25, 0.10, 0.08, 0.15, 0.25,
  0.40, 0.50, 0.30, 0.20, 0.15, 0.08
];
const PERFIL_TERM_BASE = [
  0.30, 0.35, 0.35, 0.35, 0.40, 0.60,
  0.85, 0.70, 0.40, 0.20, 0.20, 0.30,
  0.35, 0.30, 0.20, 0.20, 0.25, 0.45,
  0.70, 0.90, 0.80, 0.60, 0.45, 0.35
];
const PERFIL_SOLAR = [
  0, 0, 0, 0, 0, 0.2,
  1.0, 2.4, 3.8, 5.0, 5.8, 6.2,
  6.5, 6.3, 5.8, 5.0, 3.8, 2.5,
  1.2, 0.3, 0, 0, 0, 0
];

function generarPerfilesBase() {
  for (let h = 0; h < 24; h++) {
    const varE = 0.85 + Math.random() * 0.3;
    const varA = 0.8 + Math.random() * 0.4;
    const varT = 0.85 + Math.random() * 0.3;
    state.baseElec[h] = PERFIL_ELEC_BASE[h] * 0.8 * varE;
    state.baseAgua[h] = PERFIL_AGUA_BASE[h] * 30 * varA;
    state.baseTerm[h] = PERFIL_TERM_BASE[h] * 1.5 * varT;
  }
}

// ================================================================
// RENDER APARATOS (agrupados por planta y zona)
// ================================================================
function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function guardarDistribucion() {
  try {
    const dispositivos = Object.values(aparatos).map(ap => ({
      idCatalogo: ap.idCatalogo,
      idInstancia: ap.idInstancia,
      numero: ap.numero,
      zona: ap.zona,
      posX: ap.posX,
      posY: ap.posY,
      duracionMinutos: ap.duracionMinutos
    }));
    localStorage.setItem(CLAVE_DISTRIBUCION, JSON.stringify({ version: 1, dispositivos }));
  } catch (error) {
    return false;
  }
  return true;
}

function cargarDistribucion() {
  try {
    const contenido = localStorage.getItem(CLAVE_DISTRIBUCION);
    if (!contenido) return;
    const guardada = JSON.parse(contenido);
    if (guardada.version !== 1 || !Array.isArray(guardada.dispositivos)) return;

    const restaurados = {};
    CATALOGO.forEach(item => {
      restaurados[item.id] = crearInstanciaAparato(item, item.id, 1);
    });

    guardada.dispositivos.forEach(dispositivo => {
      const item = CATALOGO.find(c => c.id === dispositivo.idCatalogo);
      if (!item || !ZONAS[dispositivo.zona]) return;
      const numero = Number(dispositivo.numero) || 1;

      if (numero === 1) {
        if (dispositivo.idInstancia !== item.id || !restaurados[item.id]) return;
        restaurados[item.id].zona = dispositivo.zona;
        restaurados[item.id].posX = limitar(Number(dispositivo.posX) || item.posX, 2, 98);
        restaurados[item.id].posY = limitar(Number(dispositivo.posY) || item.posY, 3, 97);
        ajustarPosicionAparatoEnZona(restaurados[item.id]);
        restaurados[item.id].duracionMinutos = limitar(Number(dispositivo.duracionMinutos) || 1, 1, 1440);
        return;
      }

      if (!item.duplicable || restaurados[dispositivo.idInstancia]) return;
      const instancia = crearInstanciaAparato(item, dispositivo.idInstancia, numero);
      instancia.zona = dispositivo.zona;
      instancia.posX = limitar(Number(dispositivo.posX) || item.posX, 2, 98);
      instancia.posY = limitar(Number(dispositivo.posY) || item.posY, 3, 97);
      ajustarPosicionAparatoEnZona(instancia);
      instancia.duracionMinutos = limitar(Number(dispositivo.duracionMinutos) || 1, 1, 1440);
      restaurados[instancia.idInstancia] = instancia;
      contadorDuplicados[item.id] = Math.max(contadorDuplicados[item.id] || 1, instancia.numero);
    });

    Object.keys(aparatos).forEach(id => delete aparatos[id]);
    Object.assign(aparatos, restaurados);
  } catch (error) {
    return;
  }
}

function reiniciarInstanciasAparatos() {
  Object.keys(aparatos).forEach(id => delete aparatos[id]);
  Object.keys(contadorDuplicados).forEach(id => delete contadorDuplicados[id]);
  CATALOGO.forEach(item => {
    aparatos[item.id] = crearInstanciaAparato(item, item.id, 1);
  });
}

function restablecerPlano() {
  if (!confirm('¿Restaurar la distribución original y eliminar los duplicados?')) return;
  reiniciarInstanciasAparatos();
  state.aparatoSeleccionado = null;
  state.plantaActiva = 'baja';
  state.playing = false;
  localStorage.removeItem(CLAVE_DISTRIBUCION);
  renderAparatos();
  updateUI();
  const btn = document.getElementById('btnPlay');
  btn.textContent = '▶ Iniciar día';
  btn.className = 'btn-play';
}

function nombreAparato(ap) {
  return ap.numero > 1 ? `${ap.nombre} ${ap.numero}` : ap.nombre;
}

function zonaDesdePosicion(x, y, planta) {
  return Object.values(ZONAS).find(zona => {
    const plano = zona.plano;
    return zona.planta === planta && plano &&
      x >= plano.x && x <= plano.x + plano.w &&
      y >= plano.y && y <= plano.y + plano.h;
  });
}

function ajustarPosicionAparatoEnZona(ap) {
  const zona = ZONAS[ap.zona];
  if (!zona || !zona.plano) return;
  const plano = zona.plano;
  const margenX = ap.tipo === 'generacion' ? 12 : 8.5;
  const margenY = ap.tipo === 'generacion' ? 6 : 5;
  const minX = plano.x + margenX;
  const maxX = plano.x + plano.w - margenX;
  const minY = plano.y + margenY;
  const maxY = plano.y + plano.h - margenY;
  ap.posX = minX <= maxX ? limitar(ap.posX, minX, maxX) : plano.x + plano.w / 2;
  ap.posY = minY <= maxY ? limitar(ap.posY, minY, maxY) : plano.y + plano.h / 2;
}

function posicionarAparatoEnZona(ap, idZona) {
  const zona = ZONAS[idZona];
  if (!zona || !zona.plano) return;
  const ocupados = Object.values(aparatos).filter(otro => otro.idInstancia !== ap.idInstancia && otro.zona === idZona).length;
  const posiciones = [
    [22, 28], [50, 28], [78, 28],
    [22, 68], [50, 68], [78, 68]
  ];
  const [x, y] = posiciones[ocupados % posiciones.length];
  ap.zona = idZona;
  ap.posX = limitar(zona.plano.x + zona.plano.w * x / 100, 2, 98);
  ap.posY = limitar(zona.plano.y + zona.plano.h * y / 100, 3, 97);
}

function renderPlantaTabs() {
  const contenedor = document.getElementById('plantaTabs');
  contenedor.innerHTML = PLANTAS.map(planta => `
    <button class="plant-tab ${planta.id === state.plantaActiva ? 'active' : ''}" onclick="cambiarPlanta('${planta.id}')">
      ${planta.icono} ${planta.nombre}
    </button>
  `).join('');
}

function claveCategoriaAparato(ap) {
  if (ap.fuente === 'solar') return ['solar', 'Solar', '#facc15'];
  if (ap.fuente === 'diesel') return ['diesel', 'Diésel', '#fb923c'];
  const cat = CATEGORIAS[ap.categoria] || CATEGORIAS.electro;
  return [ap.categoria || 'electro', cat.nombre, cat.color];
}

function renderLeyendaPlano(planta) {
  const contenedor = document.getElementById('planLegend');
  if (!contenedor) return;
  const mapa = new Map();
  Object.values(aparatos)
    .filter(ap => ZONAS[ap.zona].planta === planta.id)
    .forEach(ap => {
      const [clave, nombre, color] = claveCategoriaAparato(ap);
      const actual = mapa.get(clave) || { nombre, color, total: 0 };
      actual.total++;
      mapa.set(clave, actual);
    });
  const orden = ['luz', 'clima', 'vent', 'electro', 'agua', 'garaje', 'solar', 'diesel'];
  contenedor.innerHTML = [...mapa.entries()]
    .sort((a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0]))
    .map(([clave, item]) =>
      `<span class="legend-chip" data-cat="${clave}"><i style="--chip-color:${item.color}"></i>${item.nombre}<b>${item.total}</b></span>`
    ).join('');
}

function renderPlano() {
  const plano = document.getElementById('floorPlan');
  const planta = PLANTAS.find(p => p.id === state.plantaActiva) || PLANTAS[0];
  state.plantaActiva = planta.id;
  plano.classList.toggle('roof-plan', planta.id === 'cubierta');

  plano.innerHTML = planta.zonas.map(idZona => {
    const zona = ZONAS[idZona];
    const total = Object.values(aparatos).filter(ap => ap.zona === idZona).length;
    return `
      <div class="plano-zona" data-suelo="${zona.suelo}" style="left:${zona.plano.x}%;top:${zona.plano.y}%;width:${zona.plano.w}%;height:${zona.plano.h}%;--zona-color:${zona.color}">
        <span class="plano-zona-furniture" aria-hidden="true">${zona.mueble}</span>
        <span class="plano-zona-label">${zona.icono} ${zona.nombre}<span class="plano-zona-count">${total}</span></span>
      </div>
    `;
  }).join('');

  Object.values(aparatos)
    .filter(ap => ZONAS[ap.zona].planta === planta.id)
    .forEach(ap => {
      const zona = ZONAS[ap.zona];
      const [catClave, catNombre, catColor] = claveCategoriaAparato(ap);
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `plan-device cat-${catClave}`;
      if (ap.tipo === 'generacion') boton.classList.add('generation', `source-${ap.fuente}`);
      if (ap.on) boton.classList.add('on');
      if (ap.siempreOn || ap.generacionAutomatica) boton.classList.add('permanent');
      if (ap.idInstancia === state.aparatoSeleccionado) boton.classList.add('selected');
      boton.style.left = `${ap.posX}%`;
      boton.style.top = `${ap.posY}%`;
      boton.style.setProperty('--zona-color', zona.color);
      boton.style.setProperty('--cat-color', catColor);
      boton.dataset.id = ap.idInstancia;
      boton.setAttribute('aria-label', `${nombreAparato(ap)}, ${zona.nombre}`);
      boton.title = `${nombreAparato(ap)} · ${catNombre}`;
      const estado = ap.on
        ? (ap.fuente === 'solar' ? 'SOLAR ON' : ap.siempreOn ? 'SIEMPRE ON' : 'ON')
        : 'OFF';
      boton.innerHTML = `
        <span class="plan-device-emoji">${ap.emoji}</span>
        <span class="plan-device-copy">
          <span class="plan-device-name">${nombreAparato(ap)}</span>
          <span class="plan-device-status">${estado}</span>
        </span>
      `;
      boton.addEventListener('click', () => seleccionarAparato(ap.idInstancia));
      boton.addEventListener('pointerdown', iniciarArrastreAparato);
      plano.appendChild(boton);
    });

  renderLeyendaPlano(planta);
  renderPlantaTabs();
}

function actualizarSeleccionVisual() {
  document.querySelectorAll('.plan-device').forEach(boton => {
    boton.classList.toggle('selected', boton.dataset.id === state.aparatoSeleccionado);
  });
}

function seleccionarAparato(idInstancia, cambiarPlanta = true) {
  const ap = aparatos[idInstancia];
  if (!ap) return;
  state.aparatoSeleccionado = idInstancia;
  if (cambiarPlanta) state.plantaActiva = ZONAS[ap.zona].planta;
  actualizarSeleccionVisual();
  renderInspector();
  renderPlantaTabs();
}

function cambiarPlanta(idPlanta) {
  if (!PLANTAS.some(planta => planta.id === idPlanta)) return;
  state.plantaActiva = idPlanta;
  const seleccionado = aparatos[state.aparatoSeleccionado];
  if (!seleccionado || ZONAS[seleccionado.zona].planta !== idPlanta) {
    const primero = Object.values(aparatos).find(ap => ZONAS[ap.zona].planta === idPlanta);
    state.aparatoSeleccionado = primero ? primero.idInstancia : null;
  }
  renderPlano();
  renderInspector();
}

function iniciarArrastreAparato(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const boton = event.currentTarget;
  const ap = aparatos[boton.dataset.id];
  const plano = document.getElementById('floorPlan');
  if (!ap || !plano) return;

  event.preventDefault();
  seleccionarAparato(ap.idInstancia, false);
  state.arrastre = {
    id: ap.idInstancia,
    pointerId: event.pointerId,
    planta: ZONAS[ap.zona].planta,
    posX: ap.posX,
    posY: ap.posY
  };

  try {
    boton.setPointerCapture(event.pointerId);
  } catch (error) {
    state.arrastre = null;
    return;
  }
  boton.classList.add('dragging');

  const mover = moveEvent => {
    if (!state.arrastre || state.arrastre.pointerId !== moveEvent.pointerId) return;
    const rect = plano.getBoundingClientRect();
    state.arrastre.posX = limitar((moveEvent.clientX - rect.left) / rect.width * 100, 2, 98);
    state.arrastre.posY = limitar((moveEvent.clientY - rect.top) / rect.height * 100, 3, 97);
    boton.style.left = `${state.arrastre.posX}%`;
    boton.style.top = `${state.arrastre.posY}%`;
  };

  const finalizar = cancelado => {
    if (!state.arrastre || state.arrastre.pointerId !== event.pointerId) return;
    const arrastre = state.arrastre;
    state.arrastre = null;
    boton.classList.remove('dragging');
    try {
      boton.releasePointerCapture(event.pointerId);
    } catch (error) {
      boton.classList.remove('dragging');
    }

    const zonaDestino = zonaDesdePosicion(arrastre.posX, arrastre.posY, arrastre.planta);
    if (!cancelado && zonaDestino) {
      ap.zona = zonaDestino.id;
      ap.posX = arrastre.posX;
      ap.posY = arrastre.posY;
      guardarDistribucion();
    }
    renderPlano();
    renderInspector();
    updateUI();
  };

  boton.addEventListener('pointermove', mover);
  boton.addEventListener('pointerup', () => finalizar(false));
  boton.addEventListener('pointercancel', () => finalizar(true));
}

function renderInspector() {
  const vacio = document.getElementById('emptyInspector');
  const contenido = document.getElementById('inspectorContent');
  const ap = aparatos[state.aparatoSeleccionado];
  vacio.hidden = !!ap;
  contenido.hidden = !ap;
  if (!ap) return;

  const zona = ZONAS[ap.zona];
  const esGeneracion = ap.tipo === 'generacion';
  contenido.className = `inspector-content${esGeneracion ? ` source-${ap.fuente}` : ''}`;
  document.getElementById('inspectorEmoji').textContent = ap.emoji;
  document.getElementById('inspectorName').textContent = nombreAparato(ap);
  document.getElementById('inspectorLocation').textContent = `${zona.icono} ${zona.nombre} · ${PLANTAS.find(p => p.id === zona.planta).nombre}`;
  document.getElementById('inspectorPower').textContent = `${(esGeneracion ? ap.potenciaGeneracion : ap.potencia).toFixed(2)} kW`;
  document.getElementById('inspectorFp').textContent = ap.fp.toFixed(2);
  document.getElementById('inspectorEnergyLabel').textContent = esGeneracion ? 'Generación' : 'Energía';
  document.getElementById('inspectorEnergy').textContent = `${(ap.fuente === 'solar' ? state.solarHoy : ap.fuente === 'diesel' ? state.dieselHoy : ap.energiaAcum).toFixed(3)} kWh`;
  document.getElementById('inspectorResourceLabel').textContent = ap.fuente === 'diesel' ? 'Gasoleo' : ap.fuente === 'solar' ? 'Fuente' : 'Agua';
  document.getElementById('inspectorWater').textContent = ap.fuente === 'diesel' ? `${state.dieselLitrosHoy.toFixed(2)} L` : ap.fuente === 'solar' ? 'Solar' : `${ap.aguaAcum.toFixed(1)} L`;

  const interruptor = document.getElementById('inspectorSwitch');
  interruptor.className = `switch ${ap.on ? 'on' : ''}`;
  interruptor.disabled = !!ap.siempreOn;
  interruptor.setAttribute('aria-pressed', String(ap.on));
  interruptor.title = ap.siempreOn ? 'Frigorífico: siempre encendido' : ap.fuente === 'solar' ? (ap.on ? 'Desactivar placas solares' : 'Activar placas solares') : ap.on ? 'Apagar' : 'Encender';

  const selectorZona = document.getElementById('inspectorZone');
  selectorZona.innerHTML = PLANTAS.map(planta => `
    <optgroup label="${planta.nombre}">
      ${planta.zonas.map(idZona => `<option value="${idZona}">${ZONAS[idZona].nombre}</option>`).join('')}
    </optgroup>
  `).join('');
  selectorZona.value = ap.zona;

  const controlDuracion = document.getElementById('durationControl');
  controlDuracion.hidden = ap.fuente === 'solar';
  const unidad = ap.duracionMinutos >= 60 && ap.duracionMinutos % 60 === 0 ? 60 : 1;
  document.getElementById('inspectorDuration').value = ap.duracionMinutos / unidad;
  document.getElementById('inspectorUnit').value = String(unidad);

  const duplicar = document.getElementById('inspectorDuplicate');
  const eliminar = document.getElementById('inspectorDelete');
  duplicar.disabled = !ap.duplicable;
  eliminar.disabled = ap.numero === 1;
}

function updateActiveList() {
  const contenedor = document.getElementById('activeList');
  const activos = Object.values(aparatos).filter(ap => ap.on);
  if (activos.length === 0) {
    contenedor.textContent = 'Ninguno activo';
    return;
  }

  contenedor.innerHTML = activos.map(ap => {
    const estado = ap.fuente === 'solar'
      ? 'Solar ON'
      : ap.siempreOn
        ? 'Siempre ON'
        : `${ap.minutosRestantes} min`;
    return `
      <div class="item">
        <button onclick="seleccionarAparato('${ap.idInstancia}')">${ap.emoji} ${nombreAparato(ap)}</button>
        <span class="t">${estado}</span>
      </div>
    `;
  }).join('');
}

function renderAparatos() {
  renderPlano();
  renderInspector();
  updateActiveList();
}

function activarAparato(ap) {
  ap.on = true;
  if (ap.fuente === 'solar') {
    ap.minutosRestantes = 0;
    ap.duracionTotal = 0;
    ap.horaInicio = null;
    return;
  }
  ap.minutosRestantes = ap.duracionMinutos;
  ap.duracionTotal = ap.duracionMinutos;
  ap.horaInicio = state.hour + state.minute / 60;
}

function desactivarAparato(ap) {
  ap.on = false;
  ap.minutosRestantes = 0;
  ap.duracionTotal = 0;
  ap.horaInicio = null;
}

function toggleAparato(idInstancia) {
  const ap = aparatos[idInstancia];
  if (!ap || ap.siempreOn) return;
  if (ap.on) {
    desactivarAparato(ap);
  } else {
    activarAparato(ap);
  }
  renderAparatos();
  updateUI();
}

function toggleAparatoFromInspector() {
  if (state.aparatoSeleccionado) toggleAparato(state.aparatoSeleccionado);
}

function cambiarDuracionAparato() {
  const ap = aparatos[state.aparatoSeleccionado];
  if (!ap || ap.fuente === 'solar') return;
  const valor = Math.max(1, Number(document.getElementById('inspectorDuration').value) || 1);
  const unidad = Number(document.getElementById('inspectorUnit').value) || 1;
  ap.duracionMinutos = limitar(Math.round(valor * unidad), 1, 1440);
  if (ap.on && !ap.siempreOn) activarAparato(ap);
  guardarDistribucion();
  renderInspector();
  updateUI();
}

function cambiarZonaAparato() {
  const ap = aparatos[state.aparatoSeleccionado];
  if (!ap) return;
  const idZona = document.getElementById('inspectorZone').value;
  posicionarAparatoEnZona(ap, idZona);
  state.plantaActiva = ZONAS[idZona].planta;
  guardarDistribucion();
  renderAparatos();
  updateUI();
}

// ================================================================
// GESTIÓN DE ZONAS Y DUPLICADOS
// ================================================================
function duplicarAparato(idInstancia) {
  const original = aparatos[idInstancia];
  if (!original) return;
  if (!original.duplicable) {
    alert('Este aparato no se puede duplicar.');
    return;
  }
  const idCat = original.idCatalogo;
  contadorDuplicados[idCat] = (contadorDuplicados[idCat] || 1) + 1;
  const nuevoId = `${idCat}_${contadorDuplicados[idCat]}`;
  const nuevaInstancia = crearInstanciaAparato(
    CATALOGO.find(c => c.id === idCat),
    nuevoId,
    contadorDuplicados[idCat]
  );
  nuevaInstancia.duracionMinutos = original.duracionMinutos;
  posicionarAparatoEnZona(nuevaInstancia, original.zona);
  aparatos[nuevoId] = nuevaInstancia;
  state.aparatoSeleccionado = nuevoId;
  guardarDistribucion();
  renderAparatos();
  updateUI();
}

function duplicarAparatoSeleccionado() {
  if (state.aparatoSeleccionado) duplicarAparato(state.aparatoSeleccionado);
}

function eliminarAparato(idInstancia) {
  const ap = aparatos[idInstancia];
  if (!ap) return;
  if (ap.numero === 1) {
    alert('No puedes eliminar la instancia original. Solo puedes apagarla.');
    return;
  }
  if (ap.on) {
    alert('Apaga el aparato antes de eliminarlo.');
    return;
  }
  delete aparatos[idInstancia];
  state.aparatoSeleccionado = Object.values(aparatos).find(otro => otro.zona === ap.zona)?.idInstancia || null;
  guardarDistribucion();
  renderAparatos();
  updateUI();
}

function eliminarAparatoSeleccionado() {
  if (state.aparatoSeleccionado) eliminarAparato(state.aparatoSeleccionado);
}

function apagarZona(idZona) {
  let apagados = 0;
  Object.values(aparatos).forEach(ap => {
    if (ap.zona === idZona && ap.on && !ap.siempreOn) {
      desactivarAparato(ap);
      apagados++;
    }
  });
  renderAparatos();
  updateUI();
  return apagados;
}

function encenderZona(idZona) {
  Object.values(aparatos).forEach(ap => {
    if (ap.zona === idZona && !ap.on && !ap.siempreOn) activarAparato(ap);
  });
  renderAparatos();
  updateUI();
}

function encenderZonaDesdeInspector() {
  const ap = aparatos[state.aparatoSeleccionado];
  if (ap) encenderZona(ap.zona);
}

function apagarZonaDesdeInspector() {
  const ap = aparatos[state.aparatoSeleccionado];
  if (ap) apagarZona(ap.zona);
}

function getConsumoPorZona() {
  const resultado = {};
  Object.keys(ZONAS).forEach(z => {
    resultado[z] = {
      elec: 0,
      agua: 0,
      term: 0,
      generacion: 0,
      aparatosOn: 0,
      aparatosTotal: 0
    };
  });
  Object.values(aparatos).forEach(ap => {
    const z = ap.zona;
    if (!resultado[z]) return;
    resultado[z].aparatosTotal++;
    if (ap.on) {
      if (ap.tipo === 'generacion') {
        resultado[z].generacion += ap.fuente === 'solar' ? PERFIL_SOLAR[state.hour] : ap.potenciaGeneracion;
      } else {
        resultado[z].elec += ap.potencia;
        resultado[z].agua += ap.agua * 60;
        resultado[z].term += ap.termica;
      }
      resultado[z].aparatosOn++;
    }
  });
  return resultado;
}

// ================================================================
// CONTROLES
// ================================================================
function setTab(idTab, boton) {
  if (!['plano', 'consumo', 'graficas'].includes(idTab)) return;
  state.tabActiva = idTab;
  document.querySelectorAll('.tab-button').forEach(tab => {
    const activo = tab === boton || tab.dataset.tab === idTab;
    tab.classList.toggle('active', activo);
    tab.setAttribute('aria-selected', String(activo));
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const activo = panel.id === `panel-${idTab}`;
    panel.hidden = !activo;
    panel.classList.toggle('active', activo);
  });
  if (idTab === 'graficas') requestAnimationFrame(drawCharts);
}

function togglePlay() {
  if (!state.playing && state.hour === 23 && state.minute === 59) resetAll();
  state.playing = !state.playing;
  const btn = document.getElementById('btnPlay');
  if (state.playing) {
    btn.textContent = '⏸ Pausar';
    btn.className = 'btn-pause';
  } else {
    btn.textContent = '▶ Continuar';
    btn.className = 'btn-play';
    accumMinutos = 0;
    updateUI();
  }
}

function setSpeed(s, btn) {
  state.speed = s;
  document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function jumpToHour(h) {
  state.hour = limitar(parseInt(h, 10) || 0, 0, 23);
  state.minute = state.minutosSimulados[state.hour] >= 60
    ? 59
    : state.minutosSimulados[state.hour];
  updateUI();
}

// ================================================================
// AVANZAR MINUTO
// ================================================================
function avanzarMinuto() {
  const h = state.hour;
  if (state.minutosSimulados[h] >= 60) return false;
  const frac = 1 / 60;
  let potenciaCarga = 0;
  let potenciaAgua = 0;
  let potenciaTermica = 0;
  let fpPonderado = 0;
  let pesoFp = 0;
  let generacionSolar = 0;
  let generacionDiesel = 0;
  let litrosGasoleo = 0;
  let cambioEstado = false;

  Object.values(aparatos).forEach(ap => {
    if (!ap.on) return;

    if (ap.fuente === 'solar') {
      generacionSolar += PERFIL_SOLAR[h];
    } else if (ap.fuente === 'diesel') {
      generacionDiesel += ap.potenciaGeneracion;
      litrosGasoleo += ap.potenciaGeneracion * ap.litrosGasoleoPorKwh * frac;
    } else {
      potenciaCarga += ap.potencia;
      potenciaAgua += ap.agua * 60;
      potenciaTermica += ap.termica;
      fpPonderado += ap.fp * ap.potencia;
      pesoFp += ap.potencia;
      ap.energiaAcum += ap.potencia * frac;
      ap.aguaAcum += ap.agua * 60 * frac;
      ap.termicaAcum += ap.termica * frac;
    }

    if (ap.fuente !== 'solar' && !ap.siempreOn) {
      ap.minutosRestantes -= 1;
      if (ap.minutosRestantes <= 0) {
        ap.on = false;
        ap.minutosRestantes = 0;
        ap.horaInicio = null;
        cambioEstado = true;
      }
    }
  });

  const minutosPrevios = state.minutosSimulados[h];
  const divisorPromedio = minutosPrevios + 1;
  state.apPotenciaElec[h] = (state.apPotenciaElec[h] * minutosPrevios + potenciaCarga) / divisorPromedio;
  state.apPotenciaAgua[h] = (state.apPotenciaAgua[h] * minutosPrevios + potenciaAgua) / divisorPromedio;
  state.apPotenciaTerm[h] = (state.apPotenciaTerm[h] * minutosPrevios + potenciaTermica) / divisorPromedio;
  state.solarPotencia[h] = (state.solarPotencia[h] * minutosPrevios + generacionSolar) / divisorPromedio;
  state.dieselPotencia[h] = (state.dieselPotencia[h] * minutosPrevios + generacionDiesel) / divisorPromedio;
  state.minutosSimulados[h] = divisorPromedio;
  state.apElec[h] += potenciaCarga * frac;
  state.apAgua[h] += potenciaAgua * frac;
  state.apTerm[h] += potenciaTermica * frac;
  state.solarGenerada[h] += generacionSolar * frac;
  state.dieselGenerada[h] += generacionDiesel * frac;

  if (pesoFp > 0) {
    const fpEstaHora = fpPonderado / pesoFp;
    state.fp[h] = (state.fp[h] + fpEstaHora) / 2;
  }

  const demanda = state.baseElec[h] + potenciaCarga;
  const generacion = generacionSolar + generacionDiesel;
  const importacion = Math.max(0, demanda - generacion);
  const vertido = Math.max(0, generacion - demanda);
  state.demandaHora[h] += demanda * frac;
  state.importRedHora[h] += importacion * frac;
  state.vertidoRedHora[h] += vertido * frac;
  state.demandaActual = demanda;
  state.potenciaCargaActual = potenciaCarga;
  state.potenciaAguaActual = potenciaAgua;
  state.potenciaTermicaActual = potenciaTermica;
  state.generacionSolarActual = generacionSolar;
  state.generacionDieselActual = generacionDiesel;
  state.importacionActual = importacion;
  state.energiaHoy += demanda * frac;
  state.solarHoy += generacionSolar * frac;
  state.dieselHoy += generacionDiesel * frac;
  state.dieselLitrosHoy += litrosGasoleo;
  state.importRedHoy += importacion * frac;
  state.vertidoRedHoy += vertido * frac;
  state.aguaHoy += (state.baseAgua[h] + potenciaAgua) * frac;
  state.termicaHoy += (state.baseTerm[h] + potenciaTermica) * frac;
  state.gasHoy = state.termicaHoy / 10.5;
  return cambioEstado;
}

// ================================================================
// UI
// ================================================================
function updateUI() {
  const h = state.hour;
  const pBase = state.baseElec[h];
  const pAp = Object.values(aparatos).reduce((total, ap) => total + (ap.on && ap.tipo !== 'generacion' ? ap.potencia : 0), 0);
  const pDemanda = pBase + pAp;
  const solarAp = aparatos.placas_solares;
  const dieselAp = aparatos.generador_diesel;
  const pSolar = solarAp && solarAp.on ? PERFIL_SOLAR[h] : 0;
  const pDiesel = dieselAp && dieselAp.on ? dieselAp.potenciaGeneracion : 0;
  const pGeneracion = pSolar + pDiesel;
  const pActiva = Math.max(0, pDemanda - pGeneracion);
  const fp = state.fp[h] || 0.95;
  const pReactiva = pDemanda * Math.tan(Math.acos(Math.min(fp, 0.999)));
  const pExcedente = Math.max(0, pGeneracion - pDemanda);
  state.demandaActual = pDemanda;
  state.potenciaCargaActual = pAp;
  state.generacionSolarActual = pSolar;
  state.generacionDieselActual = pDiesel;
  state.importacionActual = pActiva;

  document.getElementById('clock').textContent =
    String(h).padStart(2, '0') + ':' + String(state.minute).padStart(2, '0');

  document.getElementById('demandaActual').textContent = pDemanda.toFixed(2);
  document.getElementById('excedenteActual').textContent = pExcedente.toFixed(3);
  document.getElementById('pActiva').textContent = pActiva.toFixed(2);
  document.getElementById('pReactiva').textContent = pReactiva.toFixed(2);
  document.getElementById('fpVal').textContent = fp.toFixed(2);
  document.getElementById('energiaHoy').textContent = state.energiaHoy.toFixed(3);
  document.getElementById('solarGenerada').textContent = state.solarHoy.toFixed(3);
  document.getElementById('dieselGenerada').textContent = state.dieselHoy.toFixed(3);
  document.getElementById('importRed').textContent = state.importRedHoy.toFixed(3);
  document.getElementById('gasoleoTotal').textContent = state.dieselLitrosHoy.toFixed(2);

  const deg = fp * 360;
  let color = '#22c55e';
  if (fp < 0.85) color = '#f87171';
  else if (fp < 0.92) color = '#fbbf24';
  const gauge = document.getElementById('gaugeFP');
  gauge.style.background = `conic-gradient(${color} 0deg, ${color} ${deg}deg, #1e293b ${deg}deg)`;
  document.getElementById('fpVal').style.color = color;

  const alertE = document.getElementById('elecAlert');
  if (pDemanda > 4.5) {
    alertE.className = 'alert alert-danger';
    alertE.textContent = '🚨 Demanda muy elevada';
  } else if (fp < 0.85) {
    alertE.className = 'alert alert-danger';
    alertE.textContent = '🚨 FP crítico · penalización';
  } else if (fp < 0.92) {
    alertE.className = 'alert alert-warn';
    alertE.textContent = '⚠️ FP bajo';
  } else if (pGeneracion > 0 && pActiva <= pDemanda * 0.1) {
    alertE.className = 'alert alert-ok';
    alertE.textContent = '☀️ Instalación cubriendo la demanda';
  } else if (pGeneracion > 0 && pActiva < pDemanda * 0.5) {
    alertE.className = 'alert alert-ok';
    alertE.textContent = '⚡ Autoconsumo activo';
  } else if (pDemanda > 3.5) {
    alertE.className = 'alert alert-warn';
    alertE.textContent = '⚠️ Pico de consumo';
  } else {
    alertE.className = 'alert alert-ok';
    alertE.textContent = '✅ Consumo normal';
  }

  const potenciaAguaActual = Object.values(aparatos).reduce((total, ap) => total + (ap.on && ap.tipo !== 'generacion' ? ap.agua * 60 : 0), 0);
  const potenciaTermicaActual = Object.values(aparatos).reduce((total, ap) => total + (ap.on && ap.tipo !== 'generacion' ? ap.termica : 0), 0);
  state.potenciaAguaActual = potenciaAguaActual;
  state.potenciaTermicaActual = potenciaTermicaActual;
  const agua = state.baseAgua[h] + potenciaAguaActual;
  document.getElementById('caudal').textContent = (agua / 60).toFixed(1);
  document.getElementById('aguaHoy').textContent = state.aguaHoy.toFixed(1);
  document.getElementById('presion').textContent = (3 + Math.sin(h) * 0.5).toFixed(1);

  const alertA = document.getElementById('aguaAlert');
  if (agua > 90) {
    alertA.className = 'alert alert-danger';
    alertA.textContent = '🚨 Posible fuga detectada';
  } else if (agua > 60) {
    alertA.className = 'alert alert-warn';
    alertA.textContent = '⚠️ Consumo elevado';
  } else {
    alertA.className = 'alert alert-ok';
    alertA.textContent = '✅ Sin fugas';
  }

  const term = state.baseTerm[h] + potenciaTermicaActual;
  document.getElementById('termica').textContent = state.termicaHoy.toFixed(3);
  document.getElementById('gas').textContent = state.gasHoy.toFixed(4);
  document.getElementById('temp').textContent = (20 + Math.max(term, 0) * 5).toFixed(1);

  const alertT = document.getElementById('termAlert');
  if (term > 4) {
    alertT.className = 'alert alert-warn';
    alertT.textContent = '⚠️ Alta demanda térmica';
  } else if (term > 0.5) {
    alertT.className = 'alert alert-ok';
    alertT.textContent = '🔥 Caldera activa';
  } else {
    alertT.className = 'alert alert-ok';
    alertT.textContent = '✅ Caldera en reposo';
  }

  document.getElementById('hourSlider').value = h;
  updateDayBar();
  updateActiveList();
  updateStats();
  const seleccionado = aparatos[state.aparatoSeleccionado];
  if (seleccionado) {
    document.getElementById('inspectorEnergy').textContent = `${(seleccionado.fuente === 'solar' ? state.solarHoy : seleccionado.fuente === 'diesel' ? state.dieselHoy : seleccionado.energiaAcum).toFixed(3)} kWh`;
    document.getElementById('inspectorWater').textContent = seleccionado.fuente === 'diesel' ? `${state.dieselLitrosHoy.toFixed(2)} L` : seleccionado.fuente === 'solar' ? 'Solar' : `${seleccionado.aguaAcum.toFixed(1)} L`;
  }
  if (state.tabActiva === 'graficas') drawCharts();
}

function updateDayBar() {
  const bar = document.getElementById('dayBar');
  if (bar.children.length !== 24) {
    bar.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const d = document.createElement('div');
      d.title = `${i}:00 h`;
      bar.appendChild(d);
    }
  }
  [...bar.children].forEach((d, i) => {
    const datosHora = obtenerDatosHora(i);
    const shade = Math.min(30 + datosHora.importacion * 40, 200);
    d.title = `${i}:00 h · ${datosHora.estado} · Demanda ${datosHora.demanda.toFixed(2)} kW · Solar ${datosHora.energiaSolar.toFixed(2)} kWh · Diésel ${datosHora.energiaDiesel.toFixed(2)} kWh`;
    d.style.background = `rgb(${shade}, ${shade + 30}, ${shade + 70})`;
    d.classList.toggle('active', i === state.hour);
  });
}

function updateStats() {
  const demandaPasadas = [];
  const importacionPasadas = [];
  for (let i = 0; i <= state.hour; i++) {
    const datosHora = obtenerDatosHora(i);
    demandaPasadas.push(datosHora.demanda);
    importacionPasadas.push(datosHora.importacion);
  }
  const maxE = Math.max(...demandaPasadas, 0);
  const avgE = demandaPasadas.reduce((a, b) => a + b, 0) / (demandaPasadas.length || 1);
  const maxImport = Math.max(...importacionPasadas, 0);
  const avgImport = importacionPasadas.reduce((a, b) => a + b, 0) / (importacionPasadas.length || 1);
  const fpValidos = state.fp.slice(0, state.hour + 1).filter(v => v > 0);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;

  document.getElementById('statElecMax').textContent = maxE.toFixed(2);
  document.getElementById('statElecAvg').textContent = avgE.toFixed(2);
  document.getElementById('statElecTotal').textContent = state.energiaHoy.toFixed(2);
  document.getElementById('statFPMin').textContent = fpMin.toFixed(2);
  document.getElementById('statGridActive').textContent = state.importacionActual.toFixed(2);
  document.getElementById('statGridAvg').textContent = avgImport.toFixed(2);
  document.getElementById('statGridMax').textContent = maxImport.toFixed(2);
  document.getElementById('statGridTotal').textContent = state.importRedHoy.toFixed(2);

  const generacionTotal = state.solarHoy + state.dieselHoy;
  const autoconsumo = Math.min(state.energiaHoy, generacionTotal);
  const porcentajeAutoconsumo = state.energiaHoy > 0 ? autoconsumo / state.energiaHoy * 100 : 0;
  document.getElementById('statGenerationTotal').textContent = generacionTotal.toFixed(2);
  document.getElementById('statSolarTotal').textContent = state.solarHoy.toFixed(2);
  document.getElementById('statSolarCurrent').textContent = state.generacionSolarActual.toFixed(2);
  document.getElementById('statDieselTotal').textContent = state.dieselHoy.toFixed(2);
  document.getElementById('statDieselCurrent').textContent = state.generacionDieselActual.toFixed(2);
  document.getElementById('statDieselTotalLiters').textContent = state.dieselLitrosHoy.toFixed(2);
  document.getElementById('statOffsetTotal').textContent = `${porcentajeAutoconsumo.toFixed(1)} %`;
  document.getElementById('statExcessTotal').textContent = state.vertidoRedHoy.toFixed(2);

  const aguaPasadas = [];
  for (let i = 0; i <= state.hour; i++) aguaPasadas.push(obtenerDatosHora(i).aguaTotal);
  const maxA = Math.max(...aguaPasadas, 0);
  const avgA = aguaPasadas.reduce((a, b) => a + b, 0) / (aguaPasadas.length || 1);
  document.getElementById('statWaterMax').textContent = maxA.toFixed(0);
  document.getElementById('statWaterAvg').textContent = avgA.toFixed(0);
  document.getElementById('statWaterTotal').textContent = state.aguaHoy.toFixed(0);

  const termPasadas = [];
  for (let i = 0; i <= state.hour; i++) termPasadas.push(obtenerDatosHora(i).termicaTotal);
  const maxT = Math.max(...termPasadas, 0);
  const avgT = termPasadas.reduce((a, b) => a + b, 0) / (termPasadas.length || 1);
  document.getElementById('statThermMax').textContent = maxT.toFixed(2);
  document.getElementById('statThermAvg').textContent = avgT.toFixed(2);
  document.getElementById('statThermTotal').textContent = state.termicaHoy.toFixed(1);
  document.getElementById('statGasTotal').textContent = state.gasHoy.toFixed(2);

  const consumoZonas = getConsumoPorZona();
  const contZonas = document.getElementById('zonasStats');
  if (contZonas) {
    contZonas.innerHTML = Object.values(ZONAS).map(z => {
      const c = consumoZonas[z.id];
      const recurso = c.generacion > 0
        ? `<span class="source-value">⚡ Genera ${c.generacion.toFixed(2)} kW</span>`
        : `<span>⚡ ${c.elec.toFixed(2)} kW</span>
           <span>💧 ${c.agua.toFixed(0)} L/h</span>
           <span>🔥 ${c.term.toFixed(2)} kW</span>`;
      return `
        <div class="zona-stat ${c.generacion > 0 ? 'source-zone' : ''}" style="border-left-color: ${z.color}">
          <div class="zona-stat-nombre">${z.icono} ${z.nombre}</div>
          <div class="zona-stat-valores">${recurso}</div>
          <div class="zona-stat-activos">${c.aparatosOn} de ${c.aparatosTotal} activos</div>
        </div>
      `;
    }).join('');
  }
}

// ================================================================
// GRÁFICAS EN CANVAS
// ================================================================
function setupCanvas(canvas) {
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function drawCharts() {
  const canvas = document.getElementById('chartElec');
  const config = setupCanvas(canvas);
  if (!config) return;
  const { ctx, w, h } = config;
  ctx.clearRect(0, 0, w, h);

  const padL = 40, padR = 15, padT = 15, padB = 25;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  let maxVal = 0.5;
  for (let i = 0; i < 24; i++) {
    const total = obtenerDatosHora(i).demanda;
    if (total > maxVal) maxVal = total;
  }
  maxVal = Math.ceil(maxVal * 2) / 2;

  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cw, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = maxVal - (maxVal / 4) * i;
    const y = padT + (ch / 4) * i;
    ctx.fillText(v.toFixed(1), padL - 5, y + 3);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 24; i += 4) {
    const x = padL + (cw / 24) * i;
    ctx.fillText(i + 'h', x, h - 8);
  }

  const barW = cw / 24 * 0.7;
  for (let i = 0; i < 24; i++) {
    const x = padL + (cw / 24) * i + (cw / 24 - barW) / 2;
    const datosHora = obtenerDatosHora(i);
    const base = datosHora.elecBase;
    const ap = datosHora.elecAp;
    const futura = i > state.hour;
    const hBase = (base / maxVal) * ch;
    const yBase = padT + ch - hBase;
    ctx.fillStyle = futura ? 'rgba(30, 41, 59, 0.3)' : '#334155';
    ctx.fillRect(x, yBase, barW, hBase);
    if (ap > 0) {
      const hAp = (ap / maxVal) * ch;
      const yAp = yBase - hAp;
      ctx.fillStyle = futura ? 'rgba(251, 191, 36, 0.3)' : '#fbbf24';
      ctx.fillRect(x, yAp, barW, hAp);
    }
  }

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= state.hour; i++) {
    const x = padL + (cw / 24) * (i + 0.5);
    const y = padT + ch - (state.fp[i] * 0.5) * ch;
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  started = false;
  for (let i = 0; i <= state.hour; i++) {
    const importacion = obtenerDatosHora(i).importacion;
    const x = padL + (cw / 24) * (i + 0.5);
    const y = padT + ch - (importacion / maxVal) * ch;
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const xNow = padL + (cw / 24) * (state.hour + state.minute / 60);
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xNow, padT);
  ctx.lineTo(xNow, padT + ch);
  ctx.stroke();
  ctx.setLineDash([]);

  drawBarChart('chartWater', state.baseAgua, state.apPotenciaAgua, '#38bdf8', '#0ea5e9', '#f87171', 90, state.potenciaAguaActual);
  drawBarChart('chartThermal', state.baseTerm, state.apPotenciaTerm, '#f87171', '#fca5a5', null, null, state.potenciaTermicaActual);
  drawChartGeneration();
  drawChartZonas();
}

function drawChartGeneration() {
  const config = setupCanvas(document.getElementById('chartGeneration'));
  if (!config) return;
  const { ctx, w, h } = config;
  ctx.clearRect(0, 0, w, h);

  const padL = 40, padR = 15, padT = 15, padB = 25;
  const cw = w - padL - padR;
  const ch = h - padT - padB;
  const datosHorario = Array.from({ length: 24 }, (_, i) => obtenerDatosHora(i));
  const solarData = datosHorario.map(datos => datos.solar);
  const dieselData = datosHorario.map(datos => datos.diesel);
  const maxVal = Math.ceil(Math.max(...solarData, ...dieselData, 1) * 2) / 2;

  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cw, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const valor = maxVal - (maxVal / 4) * i;
    ctx.fillText(valor.toFixed(1), padL - 5, padT + (ch / 4) * i + 3);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 24; i += 4) {
    ctx.fillText(i + 'h', padL + (cw / 24) * i, h - 8);
  }

  const dibujarLinea = (datos, color, guiones) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(guiones ? [5, 3] : []);
    ctx.beginPath();
    datos.forEach((valor, i) => {
      const x = padL + (cw / 24) * (i + 0.5);
      const y = padT + ch - (valor / maxVal) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  dibujarLinea(solarData, '#facc15', false);
  dibujarLinea(dieselData, '#fb923c', true);

  const xNow = padL + (cw / 24) * (state.hour + state.minute / 60);
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xNow, padT);
  ctx.lineTo(xNow, padT + ch);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawChartZonas() {
  const config = setupCanvas(document.getElementById('chartZonas'));
  if (!config) return;
  const { ctx, w, h } = config;
  ctx.clearRect(0, 0, w, h);

  const padL = 45, padR = 15, padT = 15, padB = 40;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const zonas = Object.values(ZONAS);
  const consumo = getConsumoPorZona();

  let maxVal = 0.5;
  zonas.forEach(z => {
    const c = consumo[z.id];
    maxVal = Math.max(maxVal, c.elec, c.agua / 10, c.term, c.generacion);
  });
  maxVal = Math.ceil(maxVal * 2) / 2;

  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cw, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = maxVal - (maxVal / 4) * i;
    const y = padT + (ch / 4) * i;
    ctx.fillText(v.toFixed(1), padL - 5, y + 3);
  }

  const numZonas = zonas.length;
  const grupoW = cw / numZonas;
  const barW = grupoW / 5;
  const gap = 2;

  zonas.forEach((z, i) => {
    const c = consumo[z.id];
    const xBase = padL + grupoW * i + grupoW / 2;

    const valores = [c.elec, c.agua / 10, c.term, c.generacion];
    const colores = ['#fbbf24', '#38bdf8', '#f87171', '#4ade80'];

    valores.forEach((v, j) => {
      const barH = (v / maxVal) * ch;
      const x = xBase - (barW * 4 + gap * 3) / 2 + j * (barW + gap);
      const y = padT + ch - barH;
      ctx.fillStyle = colores[j];
      ctx.fillRect(x, y, barW, barH);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.icono, xBase, h - 22);
    const etiquetaZona = w < 560
      ? z.nombre.replace('Dormitorio', 'Dorm').replace('Sala de estar', 'Sala').replace('alta', 'A')
      : z.nombre;
    ctx.fillText(etiquetaZona, xBase, h - 10);
  });
}

function drawBarChart(canvasId, baseData, apData, colorBase, colorAp, colorAlert, alertThreshold, currentValue = 0) {
  const config = setupCanvas(document.getElementById(canvasId));
  if (!config) return;
  const { ctx, w, h } = config;
  ctx.clearRect(0, 0, w, h);

  const padL = 40, padR = 15, padT = 15, padB = 25;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  let maxVal = 1;
  for (let i = 0; i < 24; i++) {
    const ap = i === state.hour
      ? state.minutosSimulados[i] > 0 ? apData[i] : currentValue
      : apData[i];
    const t = baseData[i] + ap;
    if (t > maxVal) maxVal = t;
  }
  maxVal = Math.ceil(maxVal * 1.2);

  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cw, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = maxVal - (maxVal / 4) * i;
    const y = padT + (ch / 4) * i;
    ctx.fillText(v.toFixed(0), padL - 5, y + 3);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 24; i += 4) {
    const x = padL + (cw / 24) * i;
    ctx.fillText(i + 'h', x, h - 8);
  }

  const barW = cw / 24 * 0.7;
  for (let i = 0; i < 24; i++) {
    const x = padL + (cw / 24) * i + (cw / 24 - barW) / 2;
    const base = baseData[i];
    const ap = i === state.hour
      ? state.minutosSimulados[i] > 0 ? apData[i] : currentValue
      : apData[i];
    const futura = i > state.hour;
    const hBase = (base / maxVal) * ch;
    const yBase = padT + ch - hBase;
    ctx.fillStyle = futura ? 'rgba(30, 41, 59, 0.3)' : colorBase;
    ctx.fillRect(x, yBase, barW, hBase);
    if (ap > 0) {
      const hAp = (ap / maxVal) * ch;
      const yAp = yBase - hAp;
      if (alertThreshold && (base + ap) > alertThreshold) {
        ctx.fillStyle = futura ? 'rgba(248, 113, 113, 0.3)' : colorAlert;
      } else {
        ctx.fillStyle = futura ? 'rgba(14, 165, 233, 0.3)' : colorAp;
      }
      ctx.fillRect(x, yAp, barW, hAp);
    }
  }

  const xNow = padL + (cw / 24) * (state.hour + state.minute / 60);
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xNow, padT);
  ctx.lineTo(xNow, padT + ch);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ================================================================
// LOOP
// ================================================================
let lastTick = performance.now();
let accumMinutos = 0;
let ultimaActualizacionUI = 0;
function loop(now) {
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (state.playing) {
    let cambioAparatos = false;
    accumMinutos += state.speed * dt;
    while (accumMinutos >= 1) {
      accumMinutos -= 1;
      state.minute++;
      cambioAparatos = avanzarMinuto() || cambioAparatos;
      if (state.minute >= 60) {
        state.minute = 0;
        state.hour++;
        if (state.hour >= 24) {
          state.hour = 23;
          state.minute = 59;
          state.playing = false;
          document.getElementById('btnPlay').textContent = '▶ Reiniciar día';
          document.getElementById('btnPlay').className = 'btn-play';
          break;
        }
      }
    }
    if (cambioAparatos) {
      renderPlano();
      renderInspector();
    }
    if (now - ultimaActualizacionUI >= 250) {
      updateUI();
      ultimaActualizacionUI = now;
    }
  } else {
    accumMinutos = 0;
  }
  requestAnimationFrame(loop);
}

// ================================================================
// RESET
// ================================================================
function resetAll() {
  state.hour = 0;
  state.minute = 0;
  state.playing = false;
  state.apElec = Array(24).fill(0);
  state.apAgua = Array(24).fill(0);
  state.apTerm = Array(24).fill(0);
  state.apPotenciaElec = Array(24).fill(0);
  state.apPotenciaAgua = Array(24).fill(0);
  state.apPotenciaTerm = Array(24).fill(0);
  state.solarGenerada = Array(24).fill(0);
  state.dieselGenerada = Array(24).fill(0);
  state.minutosSimulados = Array(24).fill(0);
  state.demandaHora = Array(24).fill(0);
  state.importRedHora = Array(24).fill(0);
  state.vertidoRedHora = Array(24).fill(0);
  state.solarPotencia = Array(24).fill(0);
  state.dieselPotencia = Array(24).fill(0);
  state.fp = Array(24).fill(0.95);
  state.energiaHoy = 0;
  state.aguaHoy = 0;
  state.termicaHoy = 0;
  state.gasHoy = 0;
  state.solarHoy = 0;
  state.dieselHoy = 0;
  state.dieselLitrosHoy = 0;
  state.importRedHoy = 0;
  state.vertidoRedHoy = 0;
  state.demandaActual = 0;
  state.potenciaCargaActual = 0;
  state.potenciaAguaActual = 0;
  state.potenciaTermicaActual = 0;
  state.generacionSolarActual = 0;
  state.generacionDieselActual = 0;
  state.importacionActual = 0;

  Object.values(aparatos).forEach(ap => {
    ap.on = !!(ap.siempreOn || ap.generacionAutomatica);
    ap.minutosRestantes = 0;
    ap.duracionTotal = 0;
    ap.energiaAcum = 0;
    ap.aguaAcum = 0;
    ap.termicaAcum = 0;
    ap.horaInicio = null;
  });

  accumMinutos = 0;
  document.getElementById('btnPlay').textContent = '▶ Iniciar día';
  document.getElementById('btnPlay').className = 'btn-play';

  renderAparatos();
  updateUI();
}

function obtenerDatosHora(h) {
  const esHoraActual = h === state.hour;
  const esHoraSimulada = state.minutosSimulados[h] > 0;
  const usaEstadoSimulado = esHoraSimulada;
  const elecBase = state.baseElec[h];
  const elecAp = usaEstadoSimulado ? state.apPotenciaElec[h] : state.potenciaCargaActual;
  const demanda = elecBase + elecAp;
  const solar = usaEstadoSimulado
    ? state.solarPotencia[h]
    : esHoraActual
      ? state.generacionSolarActual
      : !!(aparatos.placas_solares && aparatos.placas_solares.on) ? PERFIL_SOLAR[h] : 0;
  const diesel = usaEstadoSimulado
    ? state.dieselPotencia[h]
    : esHoraActual
      ? state.generacionDieselActual
      : !!(aparatos.generador_diesel && aparatos.generador_diesel.on) ? aparatos.generador_diesel.potenciaGeneracion : 0;
  const generacion = solar + diesel;
  const importacion = Math.max(0, demanda - generacion);
  const excedente = Math.max(0, generacion - demanda);
  const fp = state.fp[h] || 0.95;
  const reactiva = demanda * Math.tan(Math.acos(Math.min(fp, 0.999)));
  const aguaBase = state.baseAgua[h];
  const aguaAp = usaEstadoSimulado ? state.apPotenciaAgua[h] : state.potenciaAguaActual;
  const aguaTotal = aguaBase + aguaAp;
  const termicaBase = state.baseTerm[h];
  const termicaAp = usaEstadoSimulado ? state.apPotenciaTerm[h] : state.potenciaTermicaActual;
  const termicaTotal = termicaBase + termicaAp;
  const estado = esHoraSimulada
    ? 'Simulado'
    : esHoraActual
      ? 'Actual'
      : 'Proyectado';
  return {
    estado,
    elecBase,
    elecAp,
    demanda,
    solar,
    diesel,
    generacion,
    importacion,
    excedente,
    fp,
    reactiva,
    aguaBase,
    aguaAp,
    aguaTotal,
    termicaBase,
    termicaAp,
    termicaTotal,
    gas: termicaTotal / 10.5,
    energiaDemanda: state.demandaHora[h],
    energiaSolar: state.solarGenerada[h],
    energiaDiesel: state.dieselGenerada[h],
    energiaImportada: state.importRedHora[h],
    energiaExcedente: state.vertidoRedHora[h],
    gasoleo: (usaEstadoSimulado ? state.dieselGenerada[h] : diesel) * (aparatos.generador_diesel?.litrosGasoleoPorKwh || 0)
  };
}

// ================================================================
// EXPORTACIÓN A CSV
// ================================================================
function exportarCSV() {
  const filas = [[
    'Hora', 'Estado',
    'Demanda (kW)', 'Solar (kW)', 'Diésel (kW)', 'Generación (kW)',
    'Importación (kW)', 'Excedente (kW)', 'FP', 'Reactiva (kVAr)',
    'Agua base (L/h)', 'Agua aparatos (L/h)', 'Agua total (L/h)',
    'Térmica base (kW)', 'Térmica aparatos (kW)', 'Térmica total (kW)',
    'Gas equivalente (m3/h)', 'Demanda (kWh)', 'Solar (kWh)',
    'Diésel (kWh)', 'Importación (kWh)', 'Excedente (kWh)', 'Gasoleo (L)'
  ]];

  for (let h = 0; h < 24; h++) {
    const datos = obtenerDatosHora(h);
    filas.push([
      String(h).padStart(2, '0') + ':00', datos.estado,
      datos.demanda.toFixed(3), datos.solar.toFixed(3), datos.diesel.toFixed(3), datos.generacion.toFixed(3),
      datos.importacion.toFixed(3), datos.excedente.toFixed(3), datos.fp.toFixed(3), datos.reactiva.toFixed(3),
      datos.aguaBase.toFixed(2), datos.aguaAp.toFixed(2), datos.aguaTotal.toFixed(2),
      datos.termicaBase.toFixed(3), datos.termicaAp.toFixed(3), datos.termicaTotal.toFixed(3), datos.gas.toFixed(4),
      datos.energiaDemanda.toFixed(3), datos.energiaSolar.toFixed(3), datos.energiaDiesel.toFixed(3),
      datos.energiaImportada.toFixed(3), datos.energiaExcedente.toFixed(3), datos.gasoleo.toFixed(3)
    ]);
  }

  filas.push([]);
  filas.push(['Resumen diario', 'Demanda', state.energiaHoy.toFixed(3), 'kWh']);
  filas.push(['Resumen diario', 'Generación solar', state.solarHoy.toFixed(3), 'kWh']);
  filas.push(['Resumen diario', 'Generación diésel', state.dieselHoy.toFixed(3), 'kWh']);
  filas.push(['Resumen diario', 'Importación', state.importRedHoy.toFixed(3), 'kWh']);
  filas.push(['Resumen diario', 'Excedente', state.vertidoRedHoy.toFixed(3), 'kWh']);
  filas.push(['Resumen diario', 'Gasoleo', state.dieselLitrosHoy.toFixed(3), 'L']);
  const csv = filas.map(f => f.join(';')).join('\n');
  descargarArchivo(csv, 'smart_home_24h.csv', 'text/csv;charset=utf-8;');
}

function descargarArchivo(contenido, nombre, tipo) {
  const blob = new Blob(['\uFEFF' + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ================================================================
// EXPORTACIÓN A EXCEL MULTI-HOJA (SpreadsheetML .xls)
// ================================================================
function exportarExcelMultiHoja() {
  const cabecerasDatos = [
    'Hora', 'Estado', 'Demanda (kW)', 'Solar (kW)', 'Diésel (kW)', 'Generación (kW)',
    'Importación (kW)', 'Excedente (kW)', 'FP', 'Reactiva (kVAr)',
    'Agua total (L/h)', 'Térmica total (kW)', 'Gas equivalente (m3/h)',
    'Demanda (kWh)', 'Solar (kWh)', 'Diésel (kWh)', 'Importación (kWh)',
    'Excedente (kWh)', 'Gasoleo (L)'
  ];
  let hojaDatos = `
    <Worksheet ss:Name="Datos 24h">
      <Table>
        <Row>${cabecerasDatos.map(cabecera => `<Cell ss:StyleID="header"><Data ss:Type="String">${cabecera}</Data></Cell>`).join('')}</Row>`;

  for (let h = 0; h < 24; h++) {
    const d = obtenerDatosHora(h);
    const valores = [
      `${String(h).padStart(2, '0')}:00`, d.estado, d.demanda, d.solar, d.diesel, d.generacion,
      d.importacion, d.excedente, d.fp, d.reactiva, d.aguaTotal, d.termicaTotal, d.gas,
      d.energiaDemanda, d.energiaSolar, d.energiaDiesel, d.energiaImportada,
      d.energiaExcedente, d.gasoleo
    ];
    hojaDatos += `<Row>${valores.map((valor, indice) => indice < 2
      ? `<Cell><Data ss:Type="String">${valor}</Data></Cell>`
      : `<Cell><Data ss:Type="Number">${Number(valor).toFixed(4)}</Data></Cell>`).join('')}</Row>`;
  }
  hojaDatos += `</Table></Worksheet>`;

  let hojaAparatos = `
    <Worksheet ss:Name="Resumen Activos">
      <Table>
        <Row>
          <Cell ss:StyleID="header"><Data ss:Type="String">Activo</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Zona</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Tipo</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Potencia (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Energía (kWh)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua (L)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Térmica (kWh)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Estado</Data></Cell>
        </Row>`;

  Object.values(aparatos).forEach(ap => {
    const energia = ap.fuente === 'solar' ? state.solarHoy : ap.fuente === 'diesel' ? state.dieselHoy : ap.energiaAcum;
    const potencia = ap.tipo === 'generacion' ? ap.potenciaGeneracion : ap.potencia;
    hojaAparatos += `
      <Row>
        <Cell><Data ss:Type="String">${ap.nombre}${ap.numero > 1 ? ' ' + ap.numero : ''}</Data></Cell>
        <Cell><Data ss:Type="String">${ZONAS[ap.zona]?.nombre || 'Sin zona'}</Data></Cell>
        <Cell><Data ss:Type="String">${ap.tipo === 'generacion' ? `Generación ${ap.fuente}` : 'Consumo'}</Data></Cell>
        <Cell><Data ss:Type="Number">${potencia.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${energia.toFixed(4)}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.aguaAcum.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.termicaAcum.toFixed(4)}</Data></Cell>
        <Cell><Data ss:Type="String">${ap.on ? 'ACTIVO' : 'Apagado'}</Data></Cell>
      </Row>`;
  });
  hojaAparatos += `</Table></Worksheet>`;

  const fpValidos = state.fp.filter(v => v > 0);
  const fpMedio = fpValidos.reduce((a, b) => a + b, 0) / (fpValidos.length || 1);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;
  const generacionTotal = state.solarHoy + state.dieselHoy;
  const autoconsumo = Math.min(state.energiaHoy, generacionTotal);
  const porcentajeAutoconsumo = state.energiaHoy > 0 ? autoconsumo / state.energiaHoy * 100 : 0;

  let hojaResumen = `
    <Worksheet ss:Name="Resumen Diario">
      <Table>
        <Row><Cell ss:StyleID="header"><Data ss:Type="String">Métrica</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Valor</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Unidad</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Demanda eléctrica</Data></Cell><Cell><Data ss:Type="Number">${state.energiaHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Generación solar</Data></Cell><Cell><Data ss:Type="Number">${state.solarHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Generación diésel</Data></Cell><Cell><Data ss:Type="Number">${state.dieselHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Generación total</Data></Cell><Cell><Data ss:Type="Number">${generacionTotal.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía importada</Data></Cell><Cell><Data ss:Type="Number">${state.importRedHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Excedente vertido</Data></Cell><Cell><Data ss:Type="Number">${state.vertidoRedHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Grado de autoconsumo</Data></Cell><Cell><Data ss:Type="Number">${porcentajeAutoconsumo.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">%</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Gasoleo consumido</Data></Cell><Cell><Data ss:Type="Number">${state.dieselLitrosHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">L</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Consumo de agua</Data></Cell><Cell><Data ss:Type="Number">${state.aguaHoy.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">L</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía térmica</Data></Cell><Cell><Data ss:Type="Number">${state.termicaHoy.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Gas equivalente</Data></Cell><Cell><Data ss:Type="Number">${state.gasHoy.toFixed(4)}</Data></Cell><Cell><Data ss:Type="String">m³</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">FP medio</Data></Cell><Cell><Data ss:Type="Number">${fpMedio.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">-</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">FP mínimo</Data></Cell><Cell><Data ss:Type="Number">${fpMin.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">-</Data></Cell></Row>
      </Table>
    </Worksheet>`;

  let hojaGraficos = `
    <Worksheet ss:Name="Para Graficos">
      <Table>
        <Row>
          <Cell ss:StyleID="header"><Data ss:Type="String">Hora</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Demanda (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Solar (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Diésel (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Importación (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua (L/h)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Térmica (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">FP</Data></Cell>
        </Row>`;
  for (let h = 0; h < 24; h++) {
    const d = obtenerDatosHora(h);
    hojaGraficos += `
      <Row>
        <Cell><Data ss:Type="String">${String(h).padStart(2, '0')}:00</Data></Cell>
        <Cell><Data ss:Type="Number">${d.demanda.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.solar.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.diesel.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.importacion.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.aguaTotal.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.termicaTotal.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.fp.toFixed(3)}</Data></Cell>
      </Row>`;
  }
  hojaGraficos += `</Table></Worksheet>`;

  const estilos = `
    <Styles>
      <Style ss:ID="header">
        <Font ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
        <Alignment ss:Horizontal="Center"/>
      </Style>
      <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Bottom"/>
      </Style>
    </Styles>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  ${estilos}
  ${hojaDatos}
  ${hojaAparatos}
  ${hojaResumen}
  ${hojaGraficos}
</Workbook>`;

  descargarArchivo(xml, 'smart_home_datos.xls', 'application/vnd.ms-excel');
}

// ================================================================
// EXPORTACIÓN A EXCEL .XLSX CON GRÁFICOS (ExcelJS + imágenes)
// ================================================================
async function exportarExcelConGraficos() {
  if (typeof ExcelJS === 'undefined') {
    alert('ExcelJS no está cargado todavía. Espera un segundo y vuelve a intentarlo.');
    return;
  }

  const tabAnterior = state.tabActiva;
  if (tabAnterior !== 'graficas') setTab('graficas');
  drawCharts();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Smart Home Dashboard';
  wb.created = new Date();

  // ---------- HOJA 1: DATOS 24h ----------
  const ws = wb.addWorksheet('Datos 24h');
  ws.columns = [
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Demanda (kW)', key: 'dem', width: 14 },
    { header: 'Solar (kW)', key: 'sol', width: 12 },
    { header: 'Diésel (kW)', key: 'die', width: 13 },
    { header: 'Generación (kW)', key: 'gen', width: 16 },
    { header: 'Importación (kW)', key: 'imp', width: 17 },
    { header: 'Excedente (kW)', key: 'exc', width: 16 },
    { header: 'FP', key: 'fp', width: 8 },
    { header: 'Reactiva (kVAr)', key: 'rea', width: 16 },
    { header: 'Agua (L/h)', key: 'agua', width: 13 },
    { header: 'Térmica (kW)', key: 'ter', width: 14 },
    { header: 'Demanda (kWh)', key: 'edem', width: 15 },
    { header: 'Solar (kWh)', key: 'esol', width: 14 },
    { header: 'Diésel (kWh)', key: 'edie', width: 15 },
    { header: 'Importación (kWh)', key: 'eimp', width: 18 },
    { header: 'Excedente (kWh)', key: 'eexc', width: 17 },
    { header: 'Gasoleo (L)', key: 'gasoleo', width: 13 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  ws.getRow(1).alignment = { horizontal: 'center' };

  for (let h = 0; h < 24; h++) {
    const d = obtenerDatosHora(h);
    ws.addRow({
      hora: `${String(h).padStart(2, '0')}:00`,
      estado: d.estado,
      dem: +d.demanda.toFixed(3), sol: +d.solar.toFixed(3), die: +d.diesel.toFixed(3),
      gen: +d.generacion.toFixed(3), imp: +d.importacion.toFixed(3), exc: +d.excedente.toFixed(3),
      fp: +d.fp.toFixed(3), rea: +d.reactiva.toFixed(3), agua: +d.aguaTotal.toFixed(2), ter: +d.termicaTotal.toFixed(3),
      edem: +d.energiaDemanda.toFixed(3), esol: +d.energiaSolar.toFixed(3), edie: +d.energiaDiesel.toFixed(3),
      eimp: +d.energiaImportada.toFixed(3), eexc: +d.energiaExcedente.toFixed(3), gasoleo: +d.gasoleo.toFixed(3),
    });
  }

  // ---------- HOJA 2: RESUMEN APARATOS ----------
  const ws2 = wb.addWorksheet('Resumen Aparatos');
  ws2.columns = [
    { header: 'Activo', key: 'n', width: 24 },
    { header: 'Zona', key: 'z', width: 17 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Potencia (kW)', key: 'p', width: 15 },
    { header: 'Energía (kWh)', key: 'e', width: 15 },
    { header: 'Agua (L)', key: 'a', width: 12 },
    { header: 'Térmica (kWh)', key: 't', width: 15 },
    { header: 'Estado', key: 's', width: 12 },
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  Object.values(aparatos).forEach(ap => {
    const energia = ap.fuente === 'solar' ? state.solarHoy : ap.fuente === 'diesel' ? state.dieselHoy : ap.energiaAcum;
    const potencia = ap.tipo === 'generacion' ? ap.potenciaGeneracion : ap.potencia;
    ws2.addRow({
      n: ap.nombre + (ap.numero > 1 ? ' ' + ap.numero : ''),
      z: ZONAS[ap.zona] ? ZONAS[ap.zona].nombre : ap.zona,
      tipo: ap.tipo === 'generacion' ? `Generación ${ap.fuente}` : 'Consumo',
      p: potencia,
      e: +energia.toFixed(4),
      a: +ap.aguaAcum.toFixed(3),
      t: +ap.termicaAcum.toFixed(4),
      s: ap.on ? 'ACTIVO' : 'Apagado',
    });
  });

  // ---------- HOJA 3: RESUMEN DIARIO ----------
  const ws3 = wb.addWorksheet('Resumen Diario');
  ws3.columns = [
    { header: 'Métrica', key: 'm', width: 32 },
    { header: 'Valor',   key: 'v', width: 14 },
    { header: 'Unidad',  key: 'u', width: 10 },
  ];
  ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  const fpValidos = state.fp.filter(v => v > 0);
  const fpMedio = fpValidos.reduce((a, b) => a + b, 0) / (fpValidos.length || 1);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;
  const generacionTotal = state.solarHoy + state.dieselHoy;
  const autoconsumo = Math.min(state.energiaHoy, generacionTotal);
  const porcentajeAutoconsumo = state.energiaHoy > 0 ? autoconsumo / state.energiaHoy * 100 : 0;

  [
    ['Demanda eléctrica', state.energiaHoy.toFixed(3), 'kWh'],
    ['Generación solar', state.solarHoy.toFixed(3), 'kWh'],
    ['Generación diésel', state.dieselHoy.toFixed(3), 'kWh'],
    ['Generación total', generacionTotal.toFixed(3), 'kWh'],
    ['Energía importada', state.importRedHoy.toFixed(3), 'kWh'],
    ['Excedente vertido', state.vertidoRedHoy.toFixed(3), 'kWh'],
    ['Grado de autoconsumo', porcentajeAutoconsumo.toFixed(2), '%'],
    ['Gasoleo consumido', state.dieselLitrosHoy.toFixed(3), 'L'],
    ['Consumo de agua', state.aguaHoy.toFixed(2), 'L'],
    ['Energía térmica', state.termicaHoy.toFixed(3), 'kWh'],
    ['Gas equivalente', state.gasHoy.toFixed(4), 'm³'],
    ['FP medio', fpMedio.toFixed(3), '-'],
    ['FP mínimo', fpMin.toFixed(3), '-'],
  ].forEach(fila => ws3.addRow({ m: fila[0], v: fila[1], u: fila[2] }));

  // ---------- HOJAS 4-6: IMÁGENES DE LOS GRÁFICOS ----------
  function canvasToBase64(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#1e293b';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);
    return tmp.toDataURL('image/png').split(',')[1];
  }

  function addImageSheet(name, canvasId) {
    const img = canvasToBase64(canvasId);
    if (!img) return;
    const wsImg = wb.addWorksheet(name);
    const imageId = wb.addImage({ base64: img, extension: 'png' });
    wsImg.addImage(imageId, {
      tl: { col: 0.5, row: 0.5 },
      ext: { width: 720, height: 400 },
      editAs: 'oneCell',
    });
  }

  addImageSheet('Grafico Electrico', 'chartElec');
  addImageSheet('Grafico Generacion', 'chartGeneration');
  addImageSheet('Grafico Agua',      'chartWater');
  addImageSheet('Grafico Termico',   'chartThermal');
  addImageSheet('Grafico Zonas',     'chartZonas');

  // ---------- DESCARGAR ----------
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart_home_con_graficos.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (tabAnterior !== 'graficas') setTab(tabAnterior);
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
window.addEventListener('resize', () => {
  if (state.tabActiva === 'graficas') drawCharts();
});

state.aparatoSeleccionado = CATALOGO[0].id;
state.plantaActiva = ZONAS[aparatos[state.aparatoSeleccionado].zona].planta;
generarPerfilesBase();
renderAparatos();
updateUI();
requestAnimationFrame(loop);