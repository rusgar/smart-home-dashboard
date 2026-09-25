// ================================================================
// INSTANCIAS DE APARATOS
// El CATALOGO está definido en zonas.js (se carga antes que este archivo).
// ================================================================
const aparatos = {};
const contadorDuplicados = {};

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
    on: !!catalogoItem.siempreOn,
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
  baseElec: Array(24).fill(0),
  baseAgua: Array(24).fill(0),
  baseTerm: Array(24).fill(0),
  apElec: Array(24).fill(0),
  apAgua: Array(24).fill(0),
  apTerm: Array(24).fill(0),
  fp: Array(24).fill(0.95),
  energiaHoy: 0,
  aguaHoy: 0,
  termicaHoy: 0,
  gasHoy: 0
};

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
function renderAparatos() {
  const cont = document.getElementById('applianceList');
  cont.innerHTML = '';

  PLANTAS.forEach(planta => {
    const headerP = document.createElement('div');
    headerP.className = 'planta-header';
    headerP.innerHTML = `<span>${planta.icono}</span> ${planta.nombre}`;
    cont.appendChild(headerP);

    planta.zonas.forEach(idZona => {
      const zona = ZONAS[idZona];
      if (!zona) return;

      const aparatosZona = Object.values(aparatos).filter(a => a.zona === idZona);
      const encendidos = aparatosZona.filter(a => a.on).length;

      const headerZ = document.createElement('div');
      headerZ.className = 'zona-header';
      headerZ.style.borderLeftColor = zona.color;
      headerZ.innerHTML = `
        <div class="zona-titulo">
          <span>${zona.icono}</span>
          <span>${zona.nombre}</span>
          <span class="zona-contador">${encendidos}/${aparatosZona.length}</span>
        </div>
        <div class="zona-botones">
          <button class="btn-zona btn-zona-on" onclick="encenderZona('${idZona}')" title="Encender toda la zona">⏻</button>
          <button class="btn-zona btn-zona-off" onclick="apagarZona('${idZona}')" title="Apagar toda la zona">⏼</button>
        </div>
      `;
      cont.appendChild(headerZ);

      const gridZ = document.createElement('div');
      gridZ.className = 'zona-aparatos';

      aparatosZona.forEach(ap => {
        const div = document.createElement('div');
        div.className = 'appliance' + (ap.on ? ' on' : '');
        div.style.borderLeftColor = zona.color;

        const nombreMostrar = ap.numero > 1 ? `${ap.nombre} ${ap.numero}` : ap.nombre;

        div.innerHTML = `
          <div class="emoji">${ap.emoji}</div>
          <div class="info">
            <div class="name">${nombreMostrar}</div>
            <div class="power">${ap.potencia} kW · FP ${ap.fp}</div>
            <div class="timer-row">
              <input type="number" min="1" max="1440" value="1" id="dur_${ap.idInstancia}">
              <select id="unit_${ap.idInstancia}">
                <option value="1" selected>min</option>
                <option value="60">h</option>
              </select>
              <span class="status-badge" id="badge_${ap.idInstancia}">${ap.on ? 'ON' : 'OFF'}</span>
            </div>
          </div>
          <div class="acciones">
            <button class="switch ${ap.on ? 'on' : ''}" onclick="toggleAparato('${ap.idInstancia}')"></button>
            ${ap.duplicable ? `<button class="btn-mini" onclick="duplicarAparato('${ap.idInstancia}')" title="Duplicar">➕</button>` : ''}
            ${ap.numero > 1 ? `<button class="btn-mini btn-peligro" onclick="eliminarAparato('${ap.idInstancia}')" title="Eliminar">🗑️</button>` : ''}
          </div>
        `;
        gridZ.appendChild(div);
      });

      cont.appendChild(gridZ);
    });
  });
}

function toggleAparato(idInstancia) {
  const ap = aparatos[idInstancia];
  if (!ap) return;
  if (ap.on) {
    ap.on = false;
    ap.minutosRestantes = 0;
    ap.duracionTotal = 0;
  } else {
    const dur = parseFloat(document.getElementById('dur_' + idInstancia).value) || 1;
    const unit = parseFloat(document.getElementById('unit_' + idInstancia).value) || 1;
    const minutos = dur * unit;
    ap.on = true;
    ap.minutosRestantes = minutos;
    ap.duracionTotal = minutos;
    ap.horaInicio = state.hour + state.minute / 60;
  }
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
  nuevaInstancia.zona = original.zona;
  aparatos[nuevoId] = nuevaInstancia;
  renderAparatos();
  updateUI();
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
  renderAparatos();
  updateUI();
}

function apagarZona(idZona) {
  let apagados = 0;
  Object.values(aparatos).forEach(ap => {
    if (ap.zona === idZona && ap.on && !ap.siempreOn) {
      ap.on = false;
      ap.minutosRestantes = 0;
      ap.duracionTotal = 0;
      apagados++;
    }
  });
  renderAparatos();
  updateUI();
  return apagados;
}

function encenderZona(idZona) {
  Object.values(aparatos).forEach(ap => {
    if (ap.zona === idZona && !ap.on && !ap.siempreOn) {
      const durInput = document.getElementById('dur_' + ap.idInstancia);
      const unitInput = document.getElementById('unit_' + ap.idInstancia);
      const dur = durInput ? parseFloat(durInput.value) || 1 : 1;
      const unit = unitInput ? parseFloat(unitInput.value) || 1 : 1;
      ap.on = true;
      ap.minutosRestantes = dur * unit;
      ap.duracionTotal = dur * unit;
      ap.horaInicio = state.hour + state.minute / 60;
    }
  });
  renderAparatos();
  updateUI();
}

function getConsumoPorZona() {
  const resultado = {};
  Object.keys(ZONAS).forEach(z => {
    resultado[z] = {
      elec: 0,
      agua: 0,
      term: 0,
      aparatosOn: 0,
      aparatosTotal: 0
    };
  });
  Object.values(aparatos).forEach(ap => {
    const z = ap.zona;
    if (!resultado[z]) return;
    resultado[z].aparatosTotal++;
    if (ap.on) {
      resultado[z].elec += ap.potencia;
      resultado[z].agua += ap.agua * 60;
      resultado[z].term += ap.termica;
      resultado[z].aparatosOn++;
    }
  });
  return resultado;
}

// ================================================================
// CONTROLES
// ================================================================
function togglePlay() {
  state.playing = !state.playing;
  const btn = document.getElementById('btnPlay');
  if (state.playing) {
    btn.textContent = '⏸ Pausar';
    btn.className = 'btn-pause';
  } else {
    btn.textContent = '▶ Continuar';
    btn.className = 'btn-play';
  }
}

function setSpeed(s, btn) {
  state.speed = s;
  document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function jumpToHour(h) {
  state.hour = parseInt(h);
  state.minute = 0;
  updateUI();
}

// ================================================================
// AVANZAR MINUTO
// ================================================================
function avanzarMinuto() {
  const h = state.hour;
  let sumaElecAp = 0, sumaAguaAp = 0, sumaTermAp = 0;
  let fpPond = 0, pesoTot = 0;

  Object.values(aparatos).forEach(ap => {
    if (ap.on && ap.minutosRestantes > 0) {
      sumaElecAp += ap.potencia;
      sumaAguaAp += ap.agua * 60;
      sumaTermAp += ap.termica;
      fpPond += ap.fp * ap.potencia;
      pesoTot += ap.potencia;

      const h1 = 1 / 60;
      ap.energiaAcum += ap.potencia * h1;
      ap.aguaAcum += ap.agua * 60 * h1;
      ap.termicaAcum += ap.termica * h1;

      ap.minutosRestantes -= 1;
      if (ap.minutosRestantes <= 0) {
        ap.on = false;
        ap.minutosRestantes = 0;
        renderAparatos();
      }
    }
  });

  state.apElec[h] += sumaElecAp / 60;
  state.apAgua[h] += sumaAguaAp / 60;
  state.apTerm[h] += sumaTermAp / 60;

  if (pesoTot > 0) {
    const fpEstaHora = fpPond / pesoTot;
    state.fp[h] = (state.fp[h] + fpEstaHora) / 2;
  }

  const frac = 1 / 60;
  state.energiaHoy += (state.baseElec[h] + state.apElec[h]) * frac;
  state.aguaHoy += (state.baseAgua[h] + state.apAgua[h]) * frac;
  state.termicaHoy += (state.baseTerm[h] + state.apTerm[h]) * frac;
  state.gasHoy = state.termicaHoy / 10.5;
}

// ================================================================
// UI
// ================================================================
function updateUI() {
  const h = state.hour;
  const pBase = state.baseElec[h];
  const pAp = state.apElec[h];
  const pActiva = pBase + pAp;
  const fp = state.fp[h] || 0.95;
  const pReactiva = pActiva * Math.tan(Math.acos(Math.min(fp, 0.999)));

  document.getElementById('clock').textContent =
    String(h).padStart(2, '0') + ':' + String(state.minute).padStart(2, '0');

  document.getElementById('pActiva').textContent = pActiva.toFixed(2);
  document.getElementById('pReactiva').textContent = pReactiva.toFixed(2);
  document.getElementById('fpVal').textContent = fp.toFixed(2);
  document.getElementById('energiaHoy').textContent = state.energiaHoy.toFixed(3);

  const deg = fp * 360;
  let color = '#22c55e';
  if (fp < 0.85) color = '#f87171';
  else if (fp < 0.92) color = '#fbbf24';
  const gauge = document.getElementById('gaugeFP');
  gauge.style.background = `conic-gradient(${color} 0deg, ${color} ${deg}deg, #1e293b ${deg}deg)`;
  document.getElementById('fpVal').style.color = color;

  const alertE = document.getElementById('elecAlert');
  if (pActiva > 4.5) {
    alertE.className = 'alert alert-danger';
    alertE.textContent = '🚨 Consumo muy elevado';
  } else if (fp < 0.85) {
    alertE.className = 'alert alert-danger';
    alertE.textContent = '🚨 FP crítico · penalización';
  } else if (fp < 0.92) {
    alertE.className = 'alert alert-warn';
    alertE.textContent = '⚠️ FP bajo';
  } else if (pActiva > 3.5) {
    alertE.className = 'alert alert-warn';
    alertE.textContent = '⚠️ Pico de consumo';
  } else {
    alertE.className = 'alert alert-ok';
    alertE.textContent = '✅ Consumo normal';
  }

  const agua = state.baseAgua[h] + state.apAgua[h];
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

  const term = state.baseTerm[h] + state.apTerm[h];
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
  drawCharts();
}

function updateActiveList() {
  const cont = document.getElementById('activeList');
  const activos = Object.values(aparatos).filter(a => a.on);
  if (activos.length === 0) {
    cont.innerHTML = 'Ninguno activo';
    return;
  }
  cont.innerHTML = activos.map(ap => {
    const zona = ZONAS[ap.zona];
    const nombreMostrar = ap.numero > 1 ? `${ap.nombre} ${ap.numero}` : ap.nombre;
    return `<div class="item">
      <span>${zona.icono} ${nombreMostrar}</span>
      <span class="t">${ap.minutosRestantes} min</span>
    </div>`;
  }).join('');
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
    const total = state.baseElec[i] + state.apElec[i];
    const shade = Math.min(30 + total * 40, 200);
    d.style.background = `rgb(${shade}, ${shade + 30}, ${shade + 70})`;
    d.classList.toggle('active', i === state.hour);
  });
}

function updateStats() {
  const elecPasadas = [];
  for (let i = 0; i <= state.hour; i++) elecPasadas.push(state.baseElec[i] + state.apElec[i]);
  const maxE = Math.max(...elecPasadas, 0);
  const avgE = elecPasadas.reduce((a, b) => a + b, 0) / (elecPasadas.length || 1);
  const fpValidos = state.fp.slice(0, state.hour + 1).filter(v => v > 0);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;

  document.getElementById('statElecMax').textContent = maxE.toFixed(2);
  document.getElementById('statElecAvg').textContent = avgE.toFixed(2);
  document.getElementById('statElecTotal').textContent = state.energiaHoy.toFixed(2);
  document.getElementById('statFPMin').textContent = fpMin.toFixed(2);

  const aguaPasadas = [];
  for (let i = 0; i <= state.hour; i++) aguaPasadas.push(state.baseAgua[i] + state.apAgua[i]);
  const maxA = Math.max(...aguaPasadas, 0);
  const avgA = aguaPasadas.reduce((a, b) => a + b, 0) / (aguaPasadas.length || 1);
  document.getElementById('statWaterMax').textContent = maxA.toFixed(0);
  document.getElementById('statWaterAvg').textContent = avgA.toFixed(0);
  document.getElementById('statWaterTotal').textContent = state.aguaHoy.toFixed(0);

  const termPasadas = [];
  for (let i = 0; i <= state.hour; i++) termPasadas.push(state.baseTerm[i] + state.apTerm[i]);
  const maxT = Math.max(...termPasadas, 0);
  const avgT = termPasadas.reduce((a, b) => a + b, 0) / (termPasadas.length || 1);
  document.getElementById('statThermMax').textContent = maxT.toFixed(2);
  document.getElementById('statThermAvg').textContent = avgT.toFixed(2);
  document.getElementById('statThermTotal').textContent = state.termicaHoy.toFixed(1);
  document.getElementById('statGasTotal').textContent = state.gasHoy.toFixed(2);

  // ---- Estadísticas por zona ----
  const consumoZonas = getConsumoPorZona();
  const contZonas = document.getElementById('zonasStats');
  if (contZonas) {
    contZonas.innerHTML = Object.values(ZONAS).map(z => {
      const c = consumoZonas[z.id];
      return `
        <div class="zona-stat" style="border-left-color: ${z.color}">
          <div class="zona-stat-nombre">${z.icono} ${z.nombre}</div>
          <div class="zona-stat-valores">
            <span>⚡ ${c.elec.toFixed(2)} kW</span>
            <span>💧 ${c.agua.toFixed(0)} L/h</span>
            <span>🔥 ${c.term.toFixed(2)} kW</span>
          </div>
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
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function drawCharts() {
  // Eléctrico
  const canvas = document.getElementById('chartElec');
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const padL = 40, padR = 15, padT = 15, padB = 25;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  let maxVal = 0.5;
  for (let i = 0; i < 24; i++) {
    const tot = (state.baseElec[i] + state.apElec[i]);
    if (tot > maxVal) maxVal = tot;
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
    const base = state.baseElec[i];
    const ap = state.apElec[i];
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

  const xNow = padL + (cw / 24) * (state.hour + 1);
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xNow, padT);
  ctx.lineTo(xNow, padT + ch);
  ctx.stroke();
  ctx.setLineDash([]);

  drawBarChart('chartWater', state.baseAgua, state.apAgua, '#38bdf8', '#0ea5e9', '#f87171', 90);
  drawBarChart('chartThermal', state.baseTerm, state.apTerm, '#f87171', '#fca5a5', null, null);
  drawChartZonas();
}

function drawChartZonas() {
  const canvas = document.getElementById('chartZonas');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const padL = 45, padR = 15, padT = 15, padB = 40;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const zonas = Object.values(ZONAS);
  const consumo = getConsumoPorZona();

  let maxVal = 0.5;
  zonas.forEach(z => {
    const c = consumo[z.id];
    maxVal = Math.max(maxVal, c.elec, c.agua / 10, c.term);
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
  const barW = grupoW / 4;
  const gap = 2;

  zonas.forEach((z, i) => {
    const c = consumo[z.id];
    const xBase = padL + grupoW * i + grupoW / 2;

    const valores = [c.elec, c.agua / 10, c.term];
    const colores = ['#fbbf24', '#38bdf8', '#f87171'];

    valores.forEach((v, j) => {
      const barH = (v / maxVal) * ch;
      const x = xBase - (barW * 3 + gap * 2) / 2 + j * (barW + gap);
      const y = padT + ch - barH;
      ctx.fillStyle = colores[j];
      ctx.fillRect(x, y, barW, barH);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.icono, xBase, h - 22);
    ctx.fillText(z.nombre, xBase, h - 10);
  });
}

function drawBarChart(canvasId, baseData, apData, colorBase, colorAp, colorAlert, alertThreshold) {
  const canvas = document.getElementById(canvasId);
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const padL = 40, padR = 15, padT = 15, padB = 25;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  let maxVal = 1;
  for (let i = 0; i < 24; i++) {
    const t = baseData[i] + apData[i];
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
    const ap = apData[i];
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

  const xNow = padL + (cw / 24) * (state.hour + 1);
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
function loop(now) {
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (state.playing) {
    accumMinutos += state.speed * dt;
    while (accumMinutos >= 1) {
      accumMinutos -= 1;
      state.minute++;
      avanzarMinuto();
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
    updateUI();
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
  state.fp = Array(24).fill(0.95);
  state.energiaHoy = 0;
  state.aguaHoy = 0;
  state.termicaHoy = 0;
  state.gasHoy = 0;

  Object.keys(aparatos).forEach(k => delete aparatos[k]);
  Object.keys(contadorDuplicados).forEach(k => delete contadorDuplicados[k]);

  CATALOGO.forEach(a => {
    aparatos[a.id] = crearInstanciaAparato(a, a.id, 1);
  });

  document.getElementById('btnPlay').textContent = '▶ Iniciar día';
  document.getElementById('btnPlay').className = 'btn-play';

  generarPerfilesBase();
  renderAparatos();
  updateUI();
}

// ================================================================
// EXPORTACIÓN A CSV
// ================================================================
function exportarCSV() {
  const filas = [];
  filas.push([
    'Hora',
    'Elec base (kW)', 'Elec aparatos (kW)', 'Elec total (kW)',
    'FP', 'Reactiva (kVAr)',
    'Agua base (L/h)', 'Agua aparatos (L/h)', 'Agua total (L/h)',
    'Termica base (kW)', 'Termica aparatos (kW)', 'Termica total (kW)',
    'Gas (m3)'
  ]);

  for (let h = 0; h < 24; h++) {
    const elecBase = state.baseElec[h];
    const elecAp = state.apElec[h];
    const elecTot = elecBase + elecAp;
    const fp = state.fp[h];
    const reactiva = elecTot * Math.tan(Math.acos(Math.min(fp, 0.999)));
    const aguaBase = state.baseAgua[h];
    const aguaAp = state.apAgua[h];
    const aguaTot = aguaBase + aguaAp;
    const termBase = state.baseTerm[h];
    const termAp = state.apTerm[h];
    const termTot = termBase + termAp;
    const gas = termTot / 10.5;

    filas.push([
      String(h).padStart(2, '0') + ':00',
      elecBase.toFixed(3), elecAp.toFixed(3), elecTot.toFixed(3),
      fp.toFixed(3), reactiva.toFixed(3),
      aguaBase.toFixed(2), aguaAp.toFixed(2), aguaTot.toFixed(2),
      termBase.toFixed(3), termAp.toFixed(3), termTot.toFixed(3),
      gas.toFixed(4)
    ]);
  }

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
  let hojaDatos = `
    <Worksheet ss:Name="Datos 24h">
      <Table>
        <Row>
          <Cell ss:StyleID="header"><Data ss:Type="String">Hora</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Elec base (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Elec aparatos (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Elec total (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">FP</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Reactiva (kVAr)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua base (L/h)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua aparatos (L/h)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua total (L/h)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Termica base (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Termica aparatos (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Termica total (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Gas (m3)</Data></Cell>
        </Row>`;

  for (let h = 0; h < 24; h++) {
    const elecBase = state.baseElec[h];
    const elecAp = state.apElec[h];
    const elecTot = elecBase + elecAp;
    const fp = state.fp[h];
    const reactiva = elecTot * Math.tan(Math.acos(Math.min(fp, 0.999)));
    const aguaBase = state.baseAgua[h];
    const aguaAp = state.apAgua[h];
    const aguaTot = aguaBase + aguaAp;
    const termBase = state.baseTerm[h];
    const termAp = state.apTerm[h];
    const termTot = termBase + termAp;
    const gas = termTot / 10.5;

    hojaDatos += `
      <Row>
        <Cell><Data ss:Type="String">${String(h).padStart(2,'0')}:00</Data></Cell>
        <Cell><Data ss:Type="Number">${elecBase.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${elecAp.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${elecTot.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${fp.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${reactiva.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${aguaBase.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${aguaAp.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${aguaTot.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${termBase.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${termAp.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${termTot.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${gas.toFixed(4)}</Data></Cell>
      </Row>`;
  }
  hojaDatos += `</Table></Worksheet>`;

  let hojaAparatos = `
    <Worksheet ss:Name="Resumen Aparatos">
      <Table>
        <Row>
          <Cell ss:StyleID="header"><Data ss:Type="String">Aparato</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Potencia (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">FP</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Energia acumulada (kWh)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua acumulada (L)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Termica acumulada (kWh)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Estado</Data></Cell>
        </Row>`;

  Object.values(aparatos).forEach(ap => {
    hojaAparatos += `
      <Row>
        <Cell><Data ss:Type="String">${ap.nombre}${ap.numero > 1 ? ' ' + ap.numero : ''}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.potencia}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.fp}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.energiaAcum.toFixed(4)}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.aguaAcum.toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${ap.termicaAcum.toFixed(4)}</Data></Cell>
        <Cell><Data ss:Type="String">${ap.on ? 'ENCENDIDO' : 'apagado'}</Data></Cell>
      </Row>`;
  });
  hojaAparatos += `</Table></Worksheet>`;

  const totalElecBase = state.baseElec.reduce((a,b)=>a+b,0);
  const totalElecAp = state.apElec.reduce((a,b)=>a+b,0);
  const totalAguaBase = state.baseAgua.reduce((a,b)=>a+b,0);
  const totalAguaAp = state.apAgua.reduce((a,b)=>a+b,0);
  const totalTermBase = state.baseTerm.reduce((a,b)=>a+b,0);
  const totalTermAp = state.apTerm.reduce((a,b)=>a+b,0);
  const fpValidos = state.fp.filter(v => v > 0);
  const fpMedio = fpValidos.reduce((a,b)=>a+b,0) / (fpValidos.length || 1);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;

  let hojaResumen = `
    <Worksheet ss:Name="Resumen Diario">
      <Table>
        <Row><Cell ss:StyleID="header"><Data ss:Type="String">Métrica</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Valor</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Unidad</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía eléctrica base</Data></Cell><Cell><Data ss:Type="Number">${totalElecBase.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía eléctrica aparatos</Data></Cell><Cell><Data ss:Type="Number">${totalElecAp.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía eléctrica total</Data></Cell><Cell><Data ss:Type="Number">${(totalElecBase+totalElecAp).toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Consumo agua base</Data></Cell><Cell><Data ss:Type="Number">${totalAguaBase.toFixed(1)}</Data></Cell><Cell><Data ss:Type="String">L</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Consumo agua aparatos</Data></Cell><Cell><Data ss:Type="Number">${totalAguaAp.toFixed(1)}</Data></Cell><Cell><Data ss:Type="String">L</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Consumo agua total</Data></Cell><Cell><Data ss:Type="Number">${(totalAguaBase+totalAguaAp).toFixed(1)}</Data></Cell><Cell><Data ss:Type="String">L</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía térmica base</Data></Cell><Cell><Data ss:Type="Number">${totalTermBase.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía térmica aparatos</Data></Cell><Cell><Data ss:Type="Number">${totalTermAp.toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Energía térmica total</Data></Cell><Cell><Data ss:Type="Number">${(totalTermBase+totalTermAp).toFixed(2)}</Data></Cell><Cell><Data ss:Type="String">kWh</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Gas equivalente</Data></Cell><Cell><Data ss:Type="Number">${((totalTermBase+totalTermAp)/10.5).toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">m³</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">FP medio</Data></Cell><Cell><Data ss:Type="Number">${fpMedio.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">-</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">FP mínimo</Data></Cell><Cell><Data ss:Type="Number">${fpMin.toFixed(3)}</Data></Cell><Cell><Data ss:Type="String">-</Data></Cell></Row>
      </Table>
    </Worksheet>`;

  let hojaGraficos = `
    <Worksheet ss:Name="Para Graficos">
      <Table>
        <Row>
          <Cell ss:StyleID="header"><Data ss:Type="String">Hora</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Elec Total (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Agua Total (L/h)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">Termica Total (kW)</Data></Cell>
          <Cell ss:StyleID="header"><Data ss:Type="String">FP</Data></Cell>
        </Row>`;
  for (let h = 0; h < 24; h++) {
    hojaGraficos += `
      <Row>
        <Cell><Data ss:Type="String">${String(h).padStart(2,'0')}:00</Data></Cell>
        <Cell><Data ss:Type="Number">${(state.baseElec[h]+state.apElec[h]).toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${(state.baseAgua[h]+state.apAgua[h]).toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${(state.baseTerm[h]+state.apTerm[h]).toFixed(3)}</Data></Cell>
        <Cell><Data ss:Type="Number">${state.fp[h].toFixed(3)}</Data></Cell>
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

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Smart Home Dashboard';
  wb.created = new Date();

  // ---------- HOJA 1: DATOS 24h ----------
  const ws = wb.addWorksheet('Datos 24h');
  ws.columns = [
    { header: 'Hora',                 key: 'hora', width: 10 },
    { header: 'Elec base (kW)',       key: 'eb',   width: 14 },
    { header: 'Elec aparatos (kW)',   key: 'ea',   width: 18 },
    { header: 'Elec total (kW)',      key: 'et',   width: 16 },
    { header: 'FP',                   key: 'fp',   width: 8  },
    { header: 'Reactiva (kVAr)',      key: 'rv',   width: 14 },
    { header: 'Agua base (L/h)',      key: 'ab',   width: 14 },
    { header: 'Agua aparatos (L/h)',  key: 'aa',   width: 18 },
    { header: 'Agua total (L/h)',     key: 'at',   width: 14 },
    { header: 'Termica base (kW)',    key: 'tb',   width: 16 },
    { header: 'Termica aparatos (kW)',key: 'ta',   width: 20 },
    { header: 'Termica total (kW)',   key: 'tt',   width: 16 },
    { header: 'Gas (m3)',             key: 'gs',   width: 12 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  ws.getRow(1).alignment = { horizontal: 'center' };

  for (let h = 0; h < 24; h++) {
    const eb = state.baseElec[h];
    const ea = state.apElec[h];
    const et = eb + ea;
    const fp = state.fp[h];
    const rv = et * Math.tan(Math.acos(Math.min(fp, 0.999)));
    const ab = state.baseAgua[h];
    const aa = state.apAgua[h];
    const at = ab + aa;
    const tb = state.baseTerm[h];
    const ta = state.apTerm[h];
    const tt = tb + ta;
    const gs = tt / 10.5;

    ws.addRow({
      hora: String(h).padStart(2, '0') + ':00',
      eb: +eb.toFixed(3), ea: +ea.toFixed(3), et: +et.toFixed(3),
      fp: +fp.toFixed(3), rv: +rv.toFixed(3),
      ab: +ab.toFixed(2), aa: +aa.toFixed(2), at: +at.toFixed(2),
      tb: +tb.toFixed(3), ta: +ta.toFixed(3), tt: +tt.toFixed(3),
      gs: +gs.toFixed(4),
    });
  }

  // ---------- HOJA 2: RESUMEN APARATOS ----------
  const ws2 = wb.addWorksheet('Resumen Aparatos');
  ws2.columns = [
    { header: 'Aparato',        key: 'n',  width: 22 },
    { header: 'Zona',           key: 'z',  width: 16 },
    { header: 'Potencia (kW)',  key: 'p',  width: 14 },
    { header: 'FP',             key: 'fp', width: 8  },
    { header: 'Energia (kWh)',  key: 'e',  width: 14 },
    { header: 'Agua (L)',       key: 'a',  width: 12 },
    { header: 'Termica (kWh)',  key: 't',  width: 14 },
    { header: 'Estado',         key: 's',  width: 12 },
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  Object.values(aparatos).forEach(ap => {
    const zonaNombre = ZONAS[ap.zona] ? ZONAS[ap.zona].nombre : ap.zona;
    ws2.addRow({
      n: ap.nombre + (ap.numero > 1 ? ' ' + ap.numero : ''),
      z: zonaNombre,
      p: ap.potencia, fp: ap.fp,
      e: +ap.energiaAcum.toFixed(4),
      a: +ap.aguaAcum.toFixed(3),
      t: +ap.termicaAcum.toFixed(4),
      s: ap.on ? 'ENCENDIDO' : 'apagado',
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

  const totalElecBase = state.baseElec.reduce((a,b)=>a+b,0);
  const totalElecAp   = state.apElec.reduce((a,b)=>a+b,0);
  const totalAguaBase = state.baseAgua.reduce((a,b)=>a+b,0);
  const totalAguaAp   = state.apAgua.reduce((a,b)=>a+b,0);
  const totalTermBase = state.baseTerm.reduce((a,b)=>a+b,0);
  const totalTermAp   = state.apTerm.reduce((a,b)=>a+b,0);
  const fpValidos = state.fp.filter(v => v > 0);
  const fpMedio = fpValidos.reduce((a,b)=>a+b,0) / (fpValidos.length || 1);
  const fpMin = fpValidos.length ? Math.min(...fpValidos) : 0.95;

  [
    ['Energía eléctrica base',        totalElecBase.toFixed(2), 'kWh'],
    ['Energía eléctrica aparatos',    totalElecAp.toFixed(2),   'kWh'],
    ['Energía eléctrica total',       (totalElecBase+totalElecAp).toFixed(2), 'kWh'],
    ['Consumo agua base',             totalAguaBase.toFixed(1), 'L'],
    ['Consumo agua aparatos',         totalAguaAp.toFixed(1),   'L'],
    ['Consumo agua total',            (totalAguaBase+totalAguaAp).toFixed(1), 'L'],
    ['Energía térmica base',          totalTermBase.toFixed(2), 'kWh'],
    ['Energía térmica aparatos',      totalTermAp.toFixed(2),   'kWh'],
    ['Energía térmica total',         (totalTermBase+totalTermAp).toFixed(2), 'kWh'],
    ['Gas equivalente',               ((totalTermBase+totalTermAp)/10.5).toFixed(3), 'm³'],
    ['FP medio',                      fpMedio.toFixed(3), '-'],
    ['FP mínimo',                     fpMin.toFixed(3),   '-'],
  ].forEach(r => ws3.addRow({ m: r[0], v: r[1], u: r[2] }));

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
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
window.addEventListener('resize', drawCharts);

generarPerfilesBase();
renderAparatos();
updateUI();
requestAnimationFrame(loop);