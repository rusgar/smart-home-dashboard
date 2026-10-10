# `js/app.js` — Lógica de la aplicación

Fichero con toda la lógica: estado, instancias, render del plano, bucle de
simulación, gráficas y exportaciones.

- Líneas: 2286
- Depende de: `js/zonas.js` (`PLANTAS`, `ZONAS`, `CATEGORIAS`, `CATALOGO`)
- Depende del DOM de `index.html` (IDs indicados en [`html-index.md`](html-index.md))

**Índice**

1. [Globales y estado](#1-globales-y-estado)
2. [Instancias y perfiles](#2-instancias-y-perfiles)
3. [Sin persistencia](#3-sin-persistencia)
4. [Posicionamiento en el plano](#4-posicionamiento-en-el-plano)
5. [Render del plano y leyenda](#5-render-del-plano-y-leyenda)
6. [Selección e inspector](#6-selección-e-inspector)
7. [Encendido, duración y zonas](#7-encendido-duración-y-zonas)
8. [Duplicar / eliminar](#8-duplicar--eliminar)
9. [Controles generales](#9-controles-generales)
10. [Simulación](#10-simulación)
11. [UI y estadísticas](#11-ui-y-estadísticas)
12. [Gráficas en canvas](#12-gráficas-en-canvas)
13. [Bucle y reset](#13-bucle-y-reset)
14. [Lectura de datos por hora](#14-lectura-de-datos-por-hora)
15. [Exportaciones](#15-exportaciones)
16. [Inicialización](#16-inicialización)

---

## 1. Globales y estado

### Constantes y maps (líneas 5–8)

| Global | Tipo | Descripción |
|---|---|---|
| `aparatos` | objeto | Mapa `idInstancia → instancia`. Es el "estado vivo" de todos los equipos. |
| `contadorDuplicados` | objeto | Mapa `idCatalogo → último número de duplicado creado`. |
| `CLAVE_DISTRIBUCION` | string | Clave heredada de `localStorage` (`'smart-home-distribucion-v1'`). La app **no guarda nada**: se usa solo para borrar lo que hubiera de versiones anteriores. |
| `ACS_KWH_POR_LITRO` | number | `0,0465` kWh por litro de ACS calentado (40 °C); base de `potenciaTermicaEquipo()`. |

Línea 10–12: `CATALOGO.forEach(...)` crea la instancia original de cada equipo.

### `state` (líneas 87–131)

Objeto único con el reloj, la UI y todos los acumuladores de 24 horas.

| Grupo | Campos | Descripción |
|---|---|---|
| Reloj | `hour`, `minute`, `playing`, `speed` | Hora simulada, flag de reproducción y minutos por segundo reales. |
| Auto | `autoSim` | `true` mientras está activo el botón **🎲 Auto (pruebas)** (modo de pruebas, no usar en la práctica). |
| UI | `tabActiva`, `plantaActiva`, `aparatoSeleccionado`, `arrastre` | Pestaña abierta, planta visible, equipo seleccionado y datos del arrastre en curso. |
| Perfiles | `baseElec`, `baseAgua`, `baseTerm` | Consumo base de la casa por hora (se rellenan con `generarPerfilesBase()`). |
| Energía horaria | `apElec`, `apAgua`, `apTerm` | kWh/L acumulados por hora por los aparatos. |
| **Potencia horaria media** | `apPotenciaElec`, `apPotenciaAgua`, `apPotenciaTerm`, `solarPotencia`, `dieselPotencia` | Media aritmética de la potencia de cada hora (se actualizan **solo** en `avanzarMinuto()`). |
| Generación | `solarGenerada`, `dieselGenerada` | kWh generados por hora. |
| Control de doble cómputo | `minutosSimulados[24]` | Minutos ya simulados de cada hora (0–60). |
| Red | `demandaHora`, `importRedHora`, `vertidoRedHora` | kWh de demanda, importación y vertido por hora. |
| FP | `fp[24]` | Factor de potencia por hora (inicializa a 0,95). |
| Totales diarios | `energiaHoy`, `aguaHoy`, `termicaHoy`, `gasHoy`, `solarHoy`, `dieselHoy`, `dieselLitrosHoy`, `importRedHoy`, `vertidoRedHoy` | Acumulados desde las 00:00. |
| Instantáneos | `demandaActual`, `potenciaCargaActual`, `potenciaAguaActual`, `potenciaTermicaActual`, `generacionSolarActual`, `generacionDieselActual`, `importacionActual` | Valores del minuto en curso. |

Línea 133: `cargarDistribucion()` se ejecuta **antes** de que el resto de la app
arranque, para que la posición guardada aplique desde el primer render.

---

## 2. Instancias y perfiles

### `crearInstanciaAparato(catalogoItem, idInstancia, numero)` — línea 14

Construye una instancia de equipo a partir de una plantilla del catálogo.

- Copia todos los campos con `...catalogoItem`.
- Añade `idInstancia` (clave en `aparatos`), `idCatalogo` y `numero` (1 = original).
- Posición por defecto 50/50 si no viene definida.
- `duracionMinutos`: 60 para el diésel, 1 para el resto.
- `on`: `true` si `siempreOn` o `generacionAutomatica`.
- Inicializa a 0 `minutosRestantes`, `duracionTotal`, `energiaAcum`, `aguaAcum`,
  `termicaAcum` y `horaInicio = null`.
- **Contadores de uso** (se exportan a Excel y se ven en el inspector):
  `minutosEncendido` (minutos totales encendido hoy) y `ciclos` (encendidos).
- **Registro de tramos**: `periodos` (array de tramos cerrados
  `{ desde, hasta, energia, agua, termica }` en horas decimales) y
  `periodoAbierto` (`{ desde, energia, agua, termica }` mientras esté encendido,
  o `null`). Arranca abierto a las 00:00 si `siempreOn`/`generacionAutomatica`.

### `horaSimulada()`, `formatoHoraDecimal(valor)`, `horarioAparato(ap)`

Ayudantes de los tramos de uso:

- `horaSimulada()` → `hour + minute/60` en el momento actual.
- `formatoHoraDecimal(v)` → `"07:15"` (redondea a minutos, 0–23 h).
- `nuevoPeriodo(desde)` → crea un tramo con `energia/agua/termica` a 0.
- `abrirPeriodo(ap)` / `cerrarPeriodo(ap)` → abren y cierran el tramo actual
  (`cerrarPeriodo` hace `push` en `periodos`).
- `tramosAparato(ap)` → lista `[{ periodo, hasta }]` (el último con
  `hasta: null` si sigue encendido).
- `horarioAparato(ap)` → **lista cronológica de tramos** para el Excel y el
  inspector: `—` si no hay ninguno, `"07:15–07:25 · 12:00–en curso"` con los
  tramos unidos por ` · `.
- `potenciaTermicaEquipo(ap)` → `agua × 60 × 0,0465` si el equipo es
  `acs: true` (calentamiento de ACS a 40 °C), si no `ap.termica`. La constante
  `ACS_KWH_POR_LITRO = 0,0465` está en la cabecera del fichero.

### `generarPerfilesBase()` — línea 162

Rellena `state.baseElec`, `baseAgua` y `baseTerm` para las 24 horas a partir de
`PERFIL_ELEC_BASE` / `PERFIL_AGUA_BASE` / `PERFIL_TERM_BASE`, aplicando
variación aleatoria:

- eléctrico: perfil × 0,8 × (0,85–1,15)
- agua: perfil × 30 × (0,8–1,2) → **L/h**
- térmico: perfil × 1,5 × (0,85–1,15)

Se llama una sola vez al iniciar (línea 2283).

### `limitar(valor, minimo, maximo)` — línea 176

`clamp` genérico: `Math.min(max, Math.max(min, v))`. Se usa en posiciones,
duraciones y hora del slider.

---

## 3. Sin persistencia

La app **no guarda nada en el navegador** (ni `localStorage` ni
`sessionStorage`): cada visita arranca con el catálogo por defecto, las
posiciones originales y los contadores a cero. Las funciones
`guardarDistribucion()` y `cargarDistribucion()` **se han eliminado**.

- Al arrancar se ejecuta `localStorage.removeItem(CLAVE_DISTRIBUCION)` para
  borrar el historial que hubiera dejado versiones anteriores de la app.
- Arrastrar, cambiar zona o duración ya no escriben en el navegador.

### `reiniciarInstanciasAparatos()` — línea 180

Borra `aparatos` y `contadorDuplicados` y vuelve a crear la instancia original
de cada elemento de `CATALOGO`.

### `restablecerPlano()` — línea 188

Botón "Restaurar plano". Pide confirmación (nativa), llama a
`reiniciarInstanciasAparatos()`, limpia la selección, vuelve a la planta baja,
pausa la simulación, repinta (`renderAparatos()` + `updateUI()`) y restablece
el texto del botón de play a "▶ Iniciar día".

---

## 4. Posicionamiento en el plano

### `nombreAparato(ap)` — línea 201

Nombre visible: añade el número solo cuando `numero > 1`
(`"Luces salón 2"`).

### `zonaDesdePosicion(x, y, planta)` — línea 205

Devuelve la zona cuyo rectángulo `plano` contiene el punto `(x, y)` **y** que
pertenece a la planta indicada. Se usa al soltar un arrastre para reasignar la
zona del equipo.

### `ajustarPosicionAparatoEnZona(ap)` — línea 214

Recorta `posX/posY` para que el badge quede dentro de su recuadro respetando un
margen (los badges son de 40 px, 46 px en generación):

- márgenes X: 12 para `tipo === 'generacion'`, 8,5 para el resto
- márgenes Y: 6 y 5 respectivamente

Si la zona es más estrecha que los márgenes, centra el equipo en el rectángulo.
Fundamental al cargar posiciones guardadas con zonas re-dimensionadas.

### `posicionarAparatoEnZona(ap, idZona)` — línea 228

Asigna zona y coloca el equipo en una de 6 casillas relativas
(`[22,28] [50,28] [78,28] [22,68] [50,68] [78,68]`), eligiendo la siguiente
libre según cuántos equipos ya haya en la zona. Convierte la casilla a % del
plano completo y limita a 2–98 / 3–97. Lo usan `duplicarAparato()` y
`cambiarZonaAparato()`.

---

## 5. Render del plano y leyenda

### `renderPlantaTabs()` — línea 242

Reconstruye `#plantaTabs` con un botón por elemento de `PLANTAS`, marcando
`active` la planta actual y usando `onclick="cambiarPlanta('id')"`.

### `claveCategoriaAparato(ap)` — línea 251

Devuelve `[clave, nombre, color]` de la categoría visual:

- `fuente === 'solar'` → `['solar', 'Solar', '#facc15']`
- `fuente === 'diesel'` → `['diesel', 'Diésel', '#fb923c']`
- resto → `CATEGORIAS[ap.categoria]` con `electro` como respaldo.

La clave se usa para la clase CSS `cat-*`, la variable `--cat-color` y la leyenda.

### `renderLeyendaPlano(planta)` — línea 258

Rellena `#planLegend` con un chip por categoría presente en la planta, con el
recuento de equipos. Orden predefinido:
`luz, clima, vent, electro, agua, garaje, solar, diesel`. Si no existe el
contenedor, sale sin más.

### `renderPlano()` — línea 278

Render principal del plano (se llama en cada cambio de planta, arrastre,
duplicado, etc.):

1. Busca la planta activa y aplica/quita la clase `roof-plan` (cubierta).
2. Por cada zona de la planta pinta un `.plano-zona` con `data-suelo`, posición
   en %, `--zona-color`, mobiliario de fondo y etiqueta con contador de equipos.
3. Por cada equipo de esa planta crea un `<button class="plan-device cat-*">`
   con posición %, clases de estado (`on`, `permanent`, `generation`,
   `source-*`, `selected`), `title` con nombre y categoría, y su HTML interno
   (emoji + nombre + estado ON/OFF).
4. Registra los manejadores `click → seleccionarAparato()` y
   `pointerdown → iniciarArrastreAparato()`.
5. Llama a `renderLeyendaPlano()` y `renderPlantaTabs()`.

---

## 6. Selección e inspector

### `actualizarSeleccionVisual()` — línea 333

Sincroniza la clase `selected` de todos los `.plan-device` con
`state.aparatoSeleccionado`. Evita repintar el plano entero al solo cambiar la
selección.

### `seleccionarAparato(idInstancia, cambiarPlanta = true)` — línea 339

Marca el equipo como seleccionado. Si `cambiarPlanta` es `true`, salta a la
planta de su zona (útil desde la lista de activos). Actualiza selección visual,
inspector y pestañas de planta.

### `cambiarPlanta(idPlanta)` — línea 349

Cambia de planta si el ID existe. Si el equipo seleccionado no pertenece a esa
planta, selecciona el primero que sí (o `null`). Redibuja plano e inspector.

### `iniciarArrastreAparato(event)` — línea 361

Manejador `pointerdown` de los badges. Comportamiento:

- Ignora botones distintos del izquierdo en ratón.
- Selecciona el equipo **sin** cambiar de planta (`false`).
- Guarda `state.arrastre = { id, pointerId, planta, posX, posY }` y hace
  `setPointerCapture`.
- `mover`: convierte `clientX/Y` a % respecto del rectángulo del plano,
  limita a 2–98 / 3–97 y actualiza el `left/top` del botón.
- `finalizar(cancelado)`: si no se canceló y hay zona destino, reasigna
  `ap.zona` y `ap.posX/posY`; luego repinta plano, inspector y UI. En caso
  contrario (solta fuera del plano o `pointercancel`) mantiene la posición
  anterior.

### `renderInspector()` — línea 422

Pinta el panel "Activo seleccionado" (`#inspectorContent`) o muestra el vacío
(`#emptyInspector`). Concretamente:

- Emoji, nombre (`nombreAparato`), ubicación con icono de zona y planta.
- Potencia: `potenciaGeneracion` si es generación, si no `potencia`.
- FP, etiquetas dinámicas de energía (`Generación`/`Energía`) y de recurso
  (`Gasoleo` / `Fuente` / `Agua`) con su valor correspondiente.
- **Uso de hoy** (`#inspectorHorario`, `#inspectorTiempo`, `#inspectorCiclos`):
  lista de tramos encendido–apagado del día (`horarioAparato`), minutos
  acumulados y número de ciclos.
- Interruptor: clase `on`, deshabilitado si `siempreOn`, `aria-pressed` y
  `title` contextual.
- Select de zona `#inspectorZone` reconstruido con `<optgroup>` por planta.
- Control de duración (oculto para solar), con `unidad` min/h según
  `duracionMinutos`.
- Habilita/deshabilita `Eliminar` (`numero !== 1`); ya no existe el botón de
  duplicar.

### `updateActiveList()` — línea 470

Rellena `#activeList` con los equipos encendidos: botón que los selecciona y
estado a la derecha (`Solar ON` / `Siempre ON` / `N min`). Si no hay ninguno,
escribe "Ninguno activo". La tarjeta «Aparatos activos ahora» va **encima** del
inspector en la barra lateral y se muestra con tipografía grande.

### `renderAparatos()` — línea 493

Atajo que llama en orden `renderPlano()` → `renderInspector()` →
`updateActiveList()`. Se usa tras cualquier cambio estructural.

---

## 7. Encendido, duración y zonas

### `activarAparato(ap)` — línea 499

Enciende el equipo y carga su temporizador:

- Abre un tramo nuevo con `abrirPeriodo(ap)` e incrementa `ciclos`.
- Solar: no usa duración (`minutosRestantes = 0`, `horaInicio = null`).
- Resto: `minutosRestantes = duracionTotal = duracionMinutos` y
  `horaInicio = horaSimulada()`.

### `desactivarAparato(ap)` — línea 514

Apaga, limpia `minutosRestantes`, `duracionTotal` y `horaInicio`, y cierra el
tramo abierto con `cerrarPeriodo(ap)` (queda en `periodos` con su
`hasta = horaSimulada()`). El apagado automático por fin de temporizador, dentro
de `avanzarMinuto()`, hace lo mismo.

### `toggleAparato(idInstancia)` — línea 522

Alterna el estado. Sale si no existe o si es `siempreOn`. Repinta y actualiza UI.

### `toggleAparatoFromInspector()` — línea 534

Enlace `onclick` del interruptor del inspector: alterna el seleccionado.

### `cambiarDuracionAparato()` — línea 538

Lee `#inspectorDuration` + `#inspectorUnit` (min/h), calcula
`duracionMinutos = valor × unidad` limitado a 1–1440. Si el equipo está
encendido y no es `siempreOn`, reinicia su temporizador con
`activarAparato()`. No aplica al solar.

### `cambiarZonaAparato()` — línea 549

Mueve el equipo seleccionado a la zona elegida en `#inspectorZone` usando
`posicionarAparatoEnZona()`, cambia la planta visible, repinta y actualiza la
UI.

---

## 8. Duplicar / eliminar

### `duplicarAparato(idInstancia)` — línea 562

Crea una copia de un equipo `duplicable` (si no lo es, `alert`). **Son
duplicables los 22 equipos de consumo**; solo `placas_solares` y
`generador_diesel` no lo son.

1. Incrementa `contadorDuplicados[idCatalogo]`.
2. Nuevo ID `idCatalogo_n`, nueva instancia con `numero = n`.
3. Hereda la duración del original y se coloca en una casilla libre de la zona.
4. La selecciona, repinta y actualiza UI.

**El botón «Duplicar» del inspector se ha eliminado** (y con él
`duplicarAparatoSeleccionado()`): la duplicación solo puede hacerse desde
consola o desde el propio código.

### `eliminarAparato(idInstancia)` — línea 585

Borra una instancia con estas reglas:

- `numero === 1` (original) → `alert` y no hace nada.
- Si está encendida → `alert` "Apaga el aparato antes de eliminarlo".
- Si procede: `delete aparatos[id]`, reasigna la selección a otro equipo de la
  misma zona (o `null`), repinta y actualiza UI.

### `eliminarAparatoSeleccionado()` — línea 602

Enlace del botón "Eliminar" del inspector.

### `apagarZona(idZona)` — línea 606

Apaga todos los equipos de la zona excepto los `siempreOn`. Devuelve el número
de equipos apagados. Repinta y actualiza UI.

### `encenderZona(idZona)` — línea 619

Enciende todos los equipos de la zona que estén apagados y no sean `siempreOn`
(cada uno con su propia duración).

### `encenderZonaDesdeInspector()` / `apagarZonaDesdeInspector()` — líneas 626 / 631

Atajos que toman la zona del equipo seleccionado y llaman a las funciones
anteriores.

### `getConsumoPorZona()` — línea 637

Devuelve `{ [idZona]: { elec, agua, term, generacion, solar, diesel, aparatosOn, aparatosTotal } }`.

- Inicializa todas las zonas a 0.
- Recorre `aparatos`: cuenta el total y, si está encendido, suma
  `potencia` (kW), `agua × 60` (L/h), `termica` (kW), o bien la generación
  repartida en `solar` (perfil solar de la hora) y `diesel`
  (`potenciaGeneracion`); `generacion` es la suma de ambas.

Alimenta a `updateStats()` (tarjetas por zona) y a `drawChartZonas()`.

---

## 9. Controles generales

### `setTab(idTab, boton)` — línea 675

Cambia de pestaña (`plano` | `consumo` | `graficas`): actualiza `state`,
la clase `active` y `aria-selected` de los botones, oculta/muestra los
`.tab-panel` y, si se abre la de gráficas, las redibuja en el siguiente frame
(`requestAnimationFrame(drawCharts)`).

### `togglePlay()` — línea 691

Arranca/pausa la simulación. Si estaba al final del día (23:59) primero llama a
`resetAll()`. Actualiza texto y clase del botón `#btnPlay`. Al **pausar** vacía
`accumMinutos` y llama a `updateUI()`, para que el reloj y las métricas queden
exactamente en el estado real (sin el desfase de hasta 250 ms de la
actualización por frame).

### `setSpeed(s, btn)` — línea 706

Fija `state.speed` (minutos simulados por segundo reales: 1, 5, 15, 60) y
marca `active` en el botón correspondiente.

### `jumpToHour(h)` — línea 712

Salta el reloj a una hora con el slider `#hourSlider`. Fija
`state.minute` a los minutos ya simulados de esa hora (o 59 si la hora está
completa) para no repetir cómputos, y refresca la UI.

### Simulación automática aleatoria (🎲 Auto (pruebas))

Modo de pruebas (etiquetado en la app como «🎲 Auto (pruebas)»), que enciende y
apaga equipos solos con horarios realistas **mientras la simulación está en
marcha**. No debe usarse durante la práctica:

| Global | Descripción |
|---|---|
| `PROB_ENCENDIDO` | Mapa `categoría →[24]` con la probabilidad **por hora** de encender ese equipo si está apagado (0 de madrugada; luz y electro con picos por la mañana y 18–22 h; `agua` solo 6–9 y 17–23 h). `simularAutomatica()` la convierte a minuto con `1 − (1 − p)^(1/60)`. |
| `DURACION_ALEATORIA` | Rango de duración por categoría (luces 30–120 min, clima 60–180, agua 4–8, electro 15–90, ventilador 30–120, garaje 10–60). |
| `DURACION_POR_EQUIPO` | Rangos específicos (`microondas` 1–5, `lavadora` 60–90, `lavavajillas` 60–120, `secadora` 40–90, `horno` 20–60, duchas 4–8). |

| Función | Descripción |
|---|---|
| `duracionAleatoria(ap)` | Elige duración entre el rango propio del equipo, el de su categoría o `[15,60]` (limitado a 1–1440). |
| `toggleAutoSim()` | Activa/desactiva `state.autoSim`, conmuta la clase `active` y `aria-pressed` de `#btnAuto` y actualiza su `title`. |
| `simularAutomatica()` | Recorre los equipos apagados (nunca `siempreOn`, ni `tipo === 'generacion'`): convierte `PROB_ENCENDIDO[categoría][hour]` a probabilidad por minuto y, si `Math.random()` sale por debajo, fija una duración aleatoria y lo enciende con `activarAparato()`. Devuelve `true` si encendió alguno para que el bucle repinte. |
| `gestionarGeneracion()` | Gestiona el **generador diésel** en modo automático: calcula `falta = max(0, demanda − solar)` (sin contar el propio diésel, para no oscilar) y lo **enciende si `falta > 1,5 kW`** y lo **apaga si `falta < 0,5 kW`** (histéresis). Al encender/apagar devuelve `true` para repintar; el temporizador de 60 min queda anulado mientras `state.autoSim` esté activo. |

El apagado **no** es aleatorio: ocurre por el temporizador normal
(`minutosRestantes`), así que las gráficas siguen siendo coherentes. Al
pausar no se enciende nada nuevo ni arranca el diésel, porque
`simularAutomatica()` y `gestionarGeneracion()` solo se llaman desde
`avanzarMinuto()`.

---

## 10. Simulación

### `avanzarMinuto()` — línea 808 · **núcleo del simulador**

Ejecuta un minuto simulado de la hora actual. Devuelve `true` si algún equipo
se apagó solo (para que el bucle repinte el plano).

Flujo:

1. **Guard**: si `minutosSimulados[h] >= 60` devuelve `false` (evita doble
   cómputo al reproducir o saltar a una hora ya simulada).
2. **Recorre los aparatos encendidos** y acumula en el minuto:
   - incrementa `ap.minutosEncendido` (tiempo encendido del día);
   - solar → `generacionSolar += PERFIL_SOLAR[h]`
   - diésel → `generacionDiesel += potenciaGeneracion` y
     `litrosGasoleo += potenciaGeneracion × 0,28 × (1/60)`; su temporizador no
     decrementa mientras `state.autoSim` (lo controla `gestionarGeneracion()`).
   - consumos → suma de `potencia`, `agua × 60` (L/h),
     `potenciaTermicaEquipo(ap)` (ACS: `agua × 60 × 0,0465`), además de
     acumular en el propio aparato (`energiaAcum`, `aguaAcum`, `termicaAcum`),
     en su **tramo abierto** (`periodoAbierto.energia/agua/termica`) y de
     ponderar el FP por potencia.
   - Decrementa `minutosRestantes` (salvo solar y `siempreOn`); al llegar a 0
      apaga el equipo, cierra el tramo con `cerrarPeriodo(ap)` y marca
      `cambioEstado`.
3. **Medias horarias**: recalcula en media móvil
   `apPotenciaElec/Agua/Term` y `solarPotencia/dieselPotencia` con los minutos ya
   simulados, e incrementa `minutosSimulados[h]`.
4. **Energías horarias**: `apElec`, `apAgua`, `apTerm`, `solarGenerada`,
   `dieselGenerada` += potencia × (1/60).
5. **FP de la hora**: media entre el valor anterior y el FP ponderado del
   minuto.
6. **Balance de red**: `demanda = baseElec + carga`;
   `importación = max(0, demanda − generación)`;
   `vertido = max(0, generación − demanda)`. Acumula `demandaHora`,
   `importRedHora`, `vertidoRedHora` (kWh) y actualiza todos los instantáneos
   de `state` (incluido `potenciaAguaActual`, `potenciaTermicaActual`,
   `generacionSolarActual`, `generacionDieselActual`).
7. **Totales diarios**: `energiaHoy`, `solarHoy`, `dieselHoy`,
   `dieselLitrosHoy`, `importRedHoy`, `vertidoRedHoy`, `aguaHoy`
   (`baseAgua + carga`) y `termicaHoy`; `gasHoy = termicaHoy / 10,5`.
8. **Auto** (si `state.autoSim`): llama a `simularAutomatica()` y a
   `gestionarGeneracion()`, y suma sus resultados a `cambioEstado`, para que el
   bucle repinte los equipos que acaban de encenderse.

---

## 11. UI y estadísticas

### `updateUI()` — línea 915

Actualiza toda la interfaz cada 250 ms durante la reproducción (y tras cualquier
acción). No escribe en los arrays horarios (eso lo hace `avanzarMinuto()`), solo
lee y pinta:

- Recalcula potencias instantáneas: `pDemanda`, `pSolar`, `pDiesel`,
  `pActiva = max(0, demanda − generación)`,
  `pExcedente = max(0, generación − demanda)` y reactiva
  `pDemanda · tan(acos(FP))` (se calcula sobre la **demanda** de la vivienda,
  no sobre la importación, para que no se ponga a 0 solo porque la generación
  cubra la casa).
- Reloj `#clock` y métricas `#demandaActual`, `#excedenteActual`, `#pActiva`,
  `#pReactiva`, `#fpVal`, `#energiaHoy`, `#solarGenerada`, `#dieselGenerada`,
  `#importRed`, `#gasoleoTotal`.
- **Desglose de la base** (hace visible por qué suben las cifras con todo
  apagado): `#baseElecNow`/`#apElecNow` (kW), `#baseAguaNow`/`#apAguaNow`
  (L/min) y `#baseTermNow`/`#apTermNow` (kW).
- **Anillo de FP** `#gaugeFP`: `conic-gradient` con color por tramo
  (verde ≥0,92 / ámbar ≥0,85 / rojo <0,85).
- **Alerta eléctrica** `#elecAlert`: si no hay ningún equipo encendido,
  "🏠 Solo base de la vivienda"; después demanda >4,5 kW, FP crítico,
  FP bajo, instalación cubriendo demanda, autoconsumo, pico y normal.
- **Agua**: caudal instantáneo `#caudal` (L/min = (base+aparatos)/60),
  `#aguaHoy`, `#presion` (valor simulado con `sin(h)`), y `#aguaAlert`
  (fuga si >20 L/min con nada encendido, >20 L/min, consumo elevado >10,
  "solo base vivienda" o "sin fugas"). Un solo equipo encendido nunca
  dispara la fuga.
- **Térmico**: `#termica`, `#gas`, `#temp` (`20 + térmica×5`) y `#termAlert`
  (con la variante "Caldera en reposo · solo base").
- Slider `#hourSlider`, barra del día, lista de activos y estadísticas.
- Refresca energía/recursos del inspector si hay selección.
- Si la pestaña activa es `graficas`, llama a `drawCharts()`.

### `updateDayBar()` — línea 1053

Construye (si hace falta) y actualiza las 24 casillas de `#dayBar`. El color de
cada hora depende de su importación de red, y el `title` muestra estado, demanda,
solar y diésel. Marca `active` la hora actual.

### `updateStats()` — línea 1072

Rellena los micro-datos de las tarjetas de gráficas y las zonas:

- Eléctrico: máximo, media y total de demanda hasta la hora actual; FP mínimo;
  red actual/media/máximo/total.
- Generación: total, solar (total y actual), diésel (total y actual), gasóleo
  consumido, **% de autoconsumo** = `min(energiaHoy, generación) / energiaHoy`
  y excedente total.
- Agua: pico, media y total.
- Térmico: pico, media, total y gas equivalente.
- `#zonasStats`: **primero la tarjeta `🏠 Base vivienda (siempre)`** con el
  consumo base de las 24 h (eléctrico, agua y térmico) y una barra gris, y
  después una tarjeta por zona con sus potencias, **barra de proporción**
  (`zona-stat-barra`, ancho = potencia ÷ máximo de todas las zonas, coloreada
  con `z.color`), clase `activa` si tiene equipos encendidos y el nº de
  activos. Las zonas con generación muestran `☀️ solar` y `⛽ diésel` (o
  "Sin generación").

---

## 12. Gráficas en canvas

### `setupCanvas(canvas)` — línea 1181

Prepara un canvas para dibujar nítido en pantallas HiDPI: multiplica el tamaño
por `devicePixelRatio`, aplica `ctx.scale(dpr, dpr)` y devuelve
`{ ctx, w, h }` en píxeles CSS. Devuelve `null` si el canvas no existe o tiene
tamaño 0.

### `drawCharts()` — línea 1198

Gráfica principal eléctrica (`#chartElec`) y orquesta el resto:

- Ejes, rejilla horizontal (4 divisiones) y etiquetas de horas cada 4 h.
- Barras apiladas por hora: base (gris) + aparatos (ámbar); las horas futuras
  se pintan translúcidas.
- Línea verde de FP (escala ×0,5) y línea azul de importación de red.
- Línea vertical discontinua de "ahora" en `hour + minute/60`.
- Al final llama a `drawBarChart('chartWater', ...)`,
  `drawBarChart('chartThermal', ...)`, a `drawChartGeneration()` y
  `drawChartZonas()`, y pinta la crosshair si hay hover
  (`dibujarCrosshair('chartElec')`).

### `drawChartGeneration()` — línea 1297

Gráfica de líneas de generación (`#chartGeneration`): serie solar continua
(`#facc15`) y serie diésel discontinua (`#fb923c`) a partir de
`obtenerDatosHora(i).solar/.diesel`, con eje, rejilla y marcador de hora.
Incluye la función auxiliar interna `dibujarLinea(datos, color, guiones)`.

### `drawChartZonas()` — línea 1359

Barras agrupadas por zona (`#chartZonas`): 4 barras por zona (eléctrica, agua
÷10, térmica y generación) con icono y nombre debajo. Si el ancho es menor que
560 px abrevia los nombres (`Dormitorio` → `Dorm`, etc.).

### `drawBarChart(canvasId, baseData, apData, colorBase, colorAp, colorAlert, alertThreshold, currentValue)` — línea 1427

Gráfica de barras apiladas reutilizable (agua y térmico):

- `maxVal` calculado considerando, para la hora actual, `currentValue` si la
  hora todavía no se ha simulado o `apData[h]` si ya lo está.
- Barras apiladas base + aparatos; color de alerta cuando supera
  `alertThreshold` (90 L/h en agua).
- Horas futuras en translúcido y marcador de "ahora"; al final pinta la
  crosshair (`dibujarCrosshair(canvasId)`).

### `chartGeom(w, h, padL = 40, padB = 25)` — línea 1193

Geometría compartida por las gráficas horarias: devuelve
`{ padL, padR: 15, padT: 15, padB, cw: w − padL − padR, ch: h − padT − padB }`.
Usada por `drawCharts()`, `drawChartGeneration()`, `drawBarChart()` y por la
crosshair, para que el área de trazado sea idéntica en dibujo y en lectura.

### Crosshair y tooltip de las gráficas horarias

Al pasar el ratón por las 4 gráficas de 24 h (`chartElec`, `chartGeneration`,
`chartWater`, `chartThermal`) se dibuja una cruz (línea vertical en la hora,
horizontal en el valor y punto en la intersección) y aparece un tooltip con la
hora, el estado (`Simulado`/`Actual`/`Proyectado`) y las magnitudes de esa hora.
La comparativa por zona (`chartZonas`) no es horaria, así que queda fuera.

Cada una de las 4 gráficas tiene un `div.chart-tip` hermano del canvas
(`#chartElec-tip`, `#chartGeneration-tip`, `#chartWater-tip`,
`#chartThermal-tip`), oculto con `hidden` mientras no hay hover. El estilo está
en `css/styles.css` (`.chart-tip`, `.tip-h`, `.tip-row`, `.tip-k`, `.tip-v`,
`.tip-estado`).

- `state.chartHoverHour` — hora bajo el ratón (`null` si no la hay). Se añade
  al estado en la inicialización.
- `CHART_CONFIGS` — mapa `id de canvas → { geom, max, datos }` para las 4
  gráficas horarias: `geom` reaprovecha `chartGeom`, `max` calcula el máximo del
  eje igual que su función de dibujo, y `datos(h)` devuelve
  `{ estado, filas: [[etiqueta, valor, color, decimales?, sufijo?]] }` leyendo
  `obtenerDatosHora(h)` o los arrays horarios de agua/térmico.
- `chartHoverGeom(chartId)` — resuelve la geometría y el máximo del canvas en
  píxeles CSS (usa `getBoundingClientRect`), o `null` si no está visible.
- `dibujarCrosshair(chartId)` — al final de cada función de dibujo repinta la
  cruz sobre el canvas (reaprovecha su contexto y su `dpr`).
- `actualizarTooltip()` — recorre `CHART_CONFIGS`, rellena el `innerHTML` del
  tooltip de la gráfica bajo el ratón y lo posiciona junto al cursor sin salirse
  del lienzo. Se oculta al no haber hover o al cambiar de pestaña.
- `initChartCrosshair()` — registra `mousemove`/`mouseleave` en los 4 canvas
  (se llama una vez al iniciar). Convierte la posición del ratón en hora
  (0–23) dentro del área `padL…padL+cw`; al cambiar de hora repinta con
  `drawCharts()` y refresca el tooltip. Al salir del canvas limpia la hora y
  oculta el tooltip.

---

## 13. Bucle y reset

### Globales de bucle (líneas 1635–1637)

`lastTick` (último `requestAnimationFrame`), `accumMinutos` (acumulado fraccionado)
y `ultimaActualizacionUI` (throttling de la UI a 250 ms).

### `loop(now)` — línea 1638

Bucle principal con `requestAnimationFrame`:

- Si está reproduciendo: acumula `speed × dt` minutos; por cada minuto entero
  incrementa el reloj y llama a `avanzarMinuto()`; al pasar de 60 min cambia de
  hora; al llegar a las 24:00 se detiene en 23:59 y cambia el botón a
  "▶ Reiniciar día". Si algún equipo cambió de estado, repinta plano e
  inspector. Llama a `updateUI()` como mucho cada 250 ms.
- Si no reproduce: vacía el acumulador (para que al reanudar no salte tiempo).
- Siempre reprograma `requestAnimationFrame(loop)`.

### `solicitarReset()`, `cancelarReset()`, `confirmarReset()` — línea 1679

Popup de confirmación del botón **«Reiniciar día»** (modal propio
`#resetModal`, no `confirm()` nativo):

- `solicitarReset()` — abre el modal (`hidden = false`) y enfoca «Seguir como
  está». El texto advierte de que se pierde todo el progreso del día.
- `cancelarReset()` — lo cierra sin tocar la simulación. También se cierra con
  **Escape** (listener global en la inicialización) o haciendo clic fuera de la
  caja.
- `confirmarReset()` — cierra el modal y ejecuta `resetAll()`.

### `resetAll()` — línea 1693

Reinicia el día completo: reloj a 00:00, pausa, todos los arrays horarios a 0
(`fp` a 0,95), todos los acumuladores diarios a 0, y cada aparato a su estado
inicial (`on = siempreOn || generacionAutomatica`, temporizadores y acumulados a
0, además de `minutosEncendido = 0`, `ciclos` a 1 si arrancaba encendido y
`periodos`/`periodoAbierto` vaciados —si arranca encendido, se abre un tramo a
las 00:00—). No toca `state.autoSim` (el modo 🎲 Auto
se mantiene). Resetea el botón de play y repinta.

---

## 14. Lectura de datos por hora

### `obtenerDatosHora(h)` — línea 1752 · **fuente única de verdad**

Devuelve un objeto con todos los valores de la hora `h`, resolviendo de dónde
sale cada dato:

- `estado`: `Simulado` si `minutosSimulados[h] > 0`; `Actual` si es la hora en
  curso; `Proyectado` en otro caso.
- Potencias de aparatos y generación: usa el promedio horario simulado si lo
  hay; si no, el instantáneo actual (hora actual) o una proyección con el
  perfil/estado de los generadores (horas futuras).
- Deriva: `generacion`, `importacion = max(0, demanda − generación)`,
  `excedente = max(0, generación − demanda)`,
  `reactiva = demanda · tan(acos(FP))`, `gas = térmica/10,5`.
- Energías acumuladas del día para esa hora: `energiaDemanda`, `energiaSolar`,
  `energiaDiesel`, `energiaImportada`, `energiaExcedente`.
- `gasoleo`: energía diésel de la hora × `litrosGasoleoPorKwh`.

Lo consumen: `updateDayBar()`, `updateStats()`, `drawCharts()`,
`drawChartGeneration()`, `drawBarChart()` y los tres exportadores.

---

## 15. Exportaciones

### `exportarCSV()` — línea 1816

Genera 24 filas (una por hora) con 23 columnas —hora, estado, potencias,
energías, FP, agua, térmica, gasóleo— más un bloque de "Resumen diario".
Usa `;` como separador y llama a `descargarArchivo()` con el nombre
`smart_home_24h.csv`.

### `descargarArchivo(contenido, nombre, tipo)` — línea 1851

Helper común: crea un `Blob` con BOM `\uFEFF` (para que Excel abra bien los
acentos), genera una URL temporal, la descarga con un `<a>` temporal y libera
tanto el nodo como el `objectURL`.

### `filasRegistroEncendidos()` — línea 1863

Helper común de las dos exportaciones a Excel: recorre `tramosAparato()` de
todos los equipos, calcula duración (minutos, con el tramo en curso redondeado
a la hora actual), y devuelve una fila por encendido (`num`, `desde`, `hasta`,
`duracion`, `energia`, `agua`, `termica`) **ordenada por hora de encendido**.

### `exportarExcelMultiHoja()` — línea 1887

Genera un `.xls` real en **SpreadsheetML XML** con 5 hojas:

| Hoja | Contenido |
|---|---|
| `Datos 24h` | 19 columnas por hora (potencias, energías, FP, gasóleo). |
| `Resumen Activos` | Una fila por equipo: zona, tipo, potencia, energía, agua, térmica, estado y **Horarios de encendido** (lista de tramos), **Tiempo encendido (min)**, **Ciclos**. |
| `Registro de encendidos` | **Una fila por encendido**: activo, zona, tipo, nº de ciclo, encendido, apagado, duración (min), energía (kWh), agua (L) y térmica (kWh). |
| `Resumen Diario` | 13 métricas clave (demanda, generación, autoconsumo, gasóleo, FP medio/mínimo…). |
| `Para Graficos` | Tabla plana de 8 columnas lista para insertar gráficos. |

Incluye `<Styles>` con cabecera invertida. Se descarga como
`smart_home_datos.xls`.

### `exportarExcelConGraficos()` — línea 2064 (async)

Exporta `.xlsx` real con **ExcelJS** (cargado por CDN). Pasos:

1. Aborta con `alert` si ExcelJS no está disponible.
2. Cambia temporalmente a la pestaña `graficas` y llama a `drawCharts()` para
   tener los canvas actualizados.
3. Crea el libro y 4 hojas de datos: `Datos 24h`, `Resumen Aparatos`
   (con las columnas **Horarios de encendido**, **Tiempo encendido (min)** y
   **Ciclos**), `Registro de encendidos` (una fila por encendido, desde
   `filasRegistroEncendidos()`) y `Resumen Diario` (mismos contenidos que el
   `.xls`).
4. Añade 5 hojas de imagen (`Grafico Electrico`, `Grafico Generacion`,
   `Grafico Agua`, `Grafico Termico`, `Grafico Zonas`) mediante las funciones
   anidadas `canvasToBase64()` y `addImageSheet()`.
5. Escribe el buffer, lo descarga como `smart_home_con_graficos.xlsx` y
   restaura la pestaña anterior.

Funciones anidadas (solo visibles dentro del exportador):

- `canvasToBase64(canvasId)` — línea 2084: copia el canvas a uno temporal con
  fondo `#1e293b` y devuelve el PNG en base64 sin prefijo `data:`.
- `addImageSheet(name, canvasId)` — línea 2097: crea una hoja, inserta la
  imagen a 720×400 px en la celda `0.5/0.5`.

---

## 16. Inicialización (líneas 2269–2286)

```js
window.addEventListener('resize', ...)  // repinta gráficas y tooltip si la pestaña está abierta
document.addEventListener('keydown', ...)  // Escape cierra el modal de reinicio
initChartCrosshair()  // mousemove/mouseleave en las 4 gráficas horarias
localStorage.removeItem(CLAVE_DISTRIBUCION)  // borra el historial heredado
state.aparatoSeleccionado = CATALOGO[0].id
state.plantaActiva = ...planta del seleccionado
generarPerfilesBase()
renderAparatos()
updateUI()
requestAnimationFrame(loop)
```

Orden de arranque completo al cargar la página:

1. `zonas.js` declara los datos.
2. `app.js` crea las instancias originales desde `CATALOGO` y borra la clave
   heredada de `localStorage` (la app no persiste nada).
3. Selección inicial, perfiles base aleatorios, primer render y primer pintado.
4. Arranca el bucle de animación (en pausa hasta pulsar "▶ Iniciar día").
