# `js/app.js` — Lógica de la aplicación

Fichero con toda la lógica: estado, instancias, persistencia, render del plano,
bucle de simulación, gráficas y exportaciones.

- Líneas: 1888
- Depende de: `js/zonas.js` (`PLANTAS`, `ZONAS`, `CATEGORIAS`, `CATALOGO`)
- Depende del DOM de `domotica2.html` (IDs indicados en [`archivos-html.md`](archivos-html.md))

**Índice**

1. [Globales y estado](#1-globales-y-estado)
2. [Instancias y perfiles](#2-instancias-y-perfiles)
3. [Persistencia de la distribución](#3-persistencia-de-la-distribución)
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

### Constantes y maps (líneas 5–7)

| Global | Tipo | Descripción |
|---|---|---|
| `aparatos` | objeto | Mapa `idInstancia → instancia`. Es el "estado vivo" de todos los equipos. |
| `contadorDuplicados` | objeto | Mapa `idCatalogo → último número de duplicado creado`. |
| `CLAVE_DISTRIBUCION` | string | Clave de `localStorage`: `'smart-home-distribucion-v1'`. |

Línea 9–11: `CATALOGO.forEach(...)` crea la instancia original de cada equipo.

### `state` (líneas 36–79)

Objeto único con el reloj, la UI y todos los acumuladores de 24 horas.

| Grupo | Campos | Descripción |
|---|---|---|
| Reloj | `hour`, `minute`, `playing`, `speed` | Hora simulada, flag de reproducción y minutos por segundo reales. |
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

Línea 81: `cargarDistribucion()` se ejecuta **antes** de que el resto de la app
arranque, para que la posición guardada aplique desde el primer render.

---

## 2. Instancias y perfiles

### `crearInstanciaAparato(catalogoItem, idInstancia, numero)` — línea 13

Construye una instancia de equipo a partir de una plantilla del catálogo.

- Copia todos los campos con `...catalogoItem`.
- Añade `idInstancia` (clave en `aparatos`), `idCatalogo` y `numero` (1 = original).
- Posición por defecto 50/50 si no viene definida.
- `duracionMinutos`: 60 para el diésel, 1 para el resto.
- `on`: `true` si `siempreOn` o `generacionAutomatica`.
- Inicializa a 0 `minutosRestantes`, `duracionTotal`, `energiaAcum`, `aguaAcum`, `termicaAcum` y `horaInicio = null`.

### `generarPerfilesBase()` — línea 111

Rellena `state.baseElec`, `baseAgua` y `baseTerm` para las 24 horas a partir de
`PERFIL_ELEC_BASE` / `PERFIL_AGUA_BASE` / `PERFIL_TERM_BASE`, aplicando
variación aleatoria:

- eléctrico: perfil × 0,8 × (0,85–1,15)
- agua: perfil × 30 × (0,8–1,2) → **L/h**
- térmico: perfil × 1,5 × (0,85–1,15)

Se llama una sola vez al iniciar (línea 1885).

### `limitar(valor, minimo, maximo)` — línea 125

`clamp` genérico: `Math.min(max, Math.max(min, v))`. Se usa en posiciones,
duraciones, hora del slider y en la carga de `localStorage`.

---

## 3. Persistencia de la distribución

### `guardarDistribucion()` — línea 129

Serializa a `localStorage` solo los campos que el usuario puede cambiar:

```json
{ "version": 1, "dispositivos": [ { idCatalogo, idInstancia, numero, zona, posX, posY, duracionMinutos } ] }
```

Devuelve `true`/`false` y nunca lanza (todo en `try/catch`). Se llama tras
arrastrar, cambiar zona, duración, duplicar o eliminar.

### `cargarDistribucion()` — línea 147

Lee la clave y reconstruye `aparatos`:

1. Comprueba `version === 1` y que `dispositivos` sea array.
2. Crea de nuevo todas las instancias originales desde `CATALOGO`.
3. Para cada guardado, localiza la plantilla y la zona; si la zona no existe, la descarta.
   - `numero === 1`: aplica zona, posición (limitada a 2–98 / 3–97) y duración (1–1440) a la instancia original.
   - `numero > 1`: solo se recrea si el catálogo es `duplicable` y la instancia no existe ya; incrementa `contadorDuplicados`.
4. En ambos casos llama a `ajustarPosicionAparatoEnZona()` para meterla en su recuadro.
5. Sustituye el contenido de `aparatos` por el restaurado.

Tolerante a errores: cualquier excepción termina silenciosamente y se queda con
el estado por defecto.

### `reiniciarInstanciasAparatos()` — línea 192

Borra `aparatos` y `contadorDuplicados` y vuelve a crear la instancia original
de cada elemento de `CATALOGO`. No toca `localStorage` (lo hace
`restablecerPlano`).

### `restablecerPlano()` — línea 200

Botón "Restaurar plano". Pide confirmación, llama a
`reiniciarInstanciasAparatos()`, limpia la selección, vuelve a la planta baja,
pausa la simulación, borra `localStorage`, repinta (`renderAparatos()` +
`updateUI()`) y restablece el texto del botón de play a "▶ Iniciar día".

---

## 4. Posicionamiento en el plano

### `nombreAparato(ap)` — línea 214

Nombre visible: añade el número solo cuando `numero > 1`
(`"Luces salón 2"`).

### `zonaDesdePosicion(x, y, planta)` — línea 218

Devuelve la zona cuyo rectángulo `plano` contiene el punto `(x, y)` **y** que
pertenece a la planta indicada. Se usa al soltar un arrastre para reasignar la
zona del equipo.

### `ajustarPosicionAparatoEnZona(ap)` — línea 227

Recorta `posX/posY` para que el badge quede dentro de su recuadro respetando un
margen (los badges son de 40 px, 46 px en generación):

- márgenes X: 12 para `tipo === 'generacion'`, 8,5 para el resto
- márgenes Y: 6 y 5 respectivamente

Si la zona es más estrecha que los márgenes, centra el equipo en el rectángulo.
Fundamental al cargar posiciones guardadas con zonas re-dimensionadas.

### `posicionarAparatoEnZona(ap, idZona)` — línea 241

Asigna zona y coloca el equipo en una de 6 casillas relativas
(`[22,28] [50,28] [78,28] [22,68] [50,68] [78,68]`), eligiendo la siguiente
libre según cuántos equipos ya haya en la zona. Convierte la casilla a % del
plano completo y limita a 2–98 / 3–97. Lo usan `duplicarAparato()` y
`cambiarZonaAparato()`.

---

## 5. Render del plano y leyenda

### `renderPlantaTabs()` — línea 255

Reconstruye `#plantaTabs` con un botón por elemento de `PLANTAS`, marcando
`active` la planta actual y usando `onclick="cambiarPlanta('id')"`.

### `claveCategoriaAparato(ap)` — línea 264

Devuelve `[clave, nombre, color]` de la categoría visual:

- `fuente === 'solar'` → `['solar', 'Solar', '#facc15']`
- `fuente === 'diesel'` → `['diesel', 'Diésel', '#fb923c']`
- resto → `CATEGORIAS[ap.categoria]` con `electro` como respaldo.

La clave se usa para la clase CSS `cat-*`, la variable `--cat-color` y la leyenda.

### `renderLeyendaPlano(planta)` — línea 271

Rellena `#planLegend` con un chip por categoría presente en la planta, con el
recuento de equipos. Orden predefinido:
`luz, clima, vent, electro, agua, garaje, solar, diesel`. Si no existe el
contenedor, sale sin más.

### `renderPlano()` — línea 291

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

### `actualizarSeleccionVisual()` — línea 346

Sincroniza la clase `selected` de todos los `.plan-device` con
`state.aparatoSeleccionado`. Evita repintar el plano entero al solo cambiar la
selección.

### `seleccionarAparato(idInstancia, cambiarPlanta = true)` — línea 352

Marca el equipo como seleccionado. Si `cambiarPlanta` es `true`, salta a la
planta de su zona (útil desde la lista de activos). Actualiza selección visual,
inspector y pestañas de planta.

### `cambiarPlanta(idPlanta)` — línea 362

Cambia de planta si el ID existe. Si el equipo seleccionado no pertenece a esa
planta, selecciona el primero que sí (o `null`). Redibuja plano e inspector.

### `iniciarArrastreAparato(event)` — línea 374

Manejador `pointerdown` de los badges. Comportamiento:

- Ignora botones distintos del izquierdo en ratón.
- Selecciona el equipo **sin** cambiar de planta (`false`).
- Guarda `state.arrastre = { id, pointerId, planta, posX, posY }` y hace
  `setPointerCapture`.
- `mover`: convierte `clientX/Y` a % respecto del rectángulo del plano,
  limita a 2–98 / 3–97 y actualiza el `left/top` del botón.
- `finalizar(cancelado)`: si no se canceló y hay zona destino, reasigna
  `ap.zona`, `ap.posX/posY` y guarda en `localStorage`; luego repinta plano,
  inspector y UI. En caso contrario (solta fuera del plano o `pointercancel`)
  mantiene la posición anterior.

### `renderInspector()` — línea 436

Pinta el panel "Activo seleccionado" (`#inspectorContent`) o muestra el vacío
(`#emptyInspector`). Concretamente:

- Emoji, nombre (`nombreAparato`), ubicación con icono de zona y planta.
- Potencia: `potenciaGeneracion` si es generación, si no `potencia`.
- FP, etiquetas dinámicas de energía (`Generación`/`Energía`) y de recurso
  (`Gasoleo` / `Fuente` / `Agua`) con su valor correspondiente.
- Interruptor: clase `on`, deshabilitado si `siempreOn`, `aria-pressed` y
  `title` contextual.
- Select de zona `#inspectorZone` reconstruido con `<optgroup>` por planta.
- Control de duración (oculto para solar), con `unidad` min/h según
  `duracionMinutos`.
- Habilita/deshabilita `Duplicar` (`duplicable`) y `Eliminar` (`numero !== 1`).

### `updateActiveList()` — línea 483

Rellena `#activeList` con los equipos encendidos: botón que los selecciona y
estado a la derecha (`Solar ON` / `Siempre ON` / `N min`). Si no hay ninguno,
escribe "Ninguno activo".

### `renderAparatos()` — línea 506

Atajo que llama en orden `renderPlano()` → `renderInspector()` →
`updateActiveList()`. Se usa tras cualquier cambio estructural.

---

## 7. Encendido, duración y zonas

### `activarAparato(ap)` — línea 512

Enciende el equipo y carga su temporizador:

- Solar: no usa duración (`minutosRestantes = 0`, `horaInicio = null`).
- Resto: `minutosRestantes = duracionTotal = duracionMinutos` y
  `horaInicio = hour + minute/60`.

### `desactivarAparato(ap)` — línea 525

Apaga y limpia `minutosRestantes`, `duracionTotal` y `horaInicio`.

### `toggleAparato(idInstancia)` — línea 532

Alterna el estado. Sale si no existe o si es `siempreOn`. Repinta y actualiza UI.

### `toggleAparatoFromInspector()` — línea 544

Enlace `onclick` del interruptor del inspector: alterna el seleccionado.

### `cambiarDuracionAparato()` — línea 548

Lee `#inspectorDuration` + `#inspectorUnit` (min/h), calcula
`duracionMinutos = valor × unidad` limitado a 1–1440, guardado en
`localStorage`. Si el equipo está encendido y no es `siempreOn`, reinicia su
temporizador con `activarAparato()`. No aplica al solar.

### `cambiarZonaAparato()` — línea 560

Mueve el equipo seleccionado a la zona elegida en `#inspectorZone` usando
`posicionarAparatoEnZona()`, cambia la planta visible, guarda, repinta y
actualiza la UI.

---

## 8. Duplicar / eliminar

### `duplicarAparato(idInstancia)` — línea 574

Crea una copia de un equipo `duplicable` (si no lo es, `alert`):

1. Incrementa `contadorDuplicados[idCatalogo]`.
2. Nuevo ID `idCatalogo_n`, nueva instancia con `numero = n`.
3. Hereda la duración del original y se coloca en una casilla libre de la zona.
4. La selecciona, guarda en `localStorage`, repinta y actualiza UI.

### `duplicarAparatoSeleccionado()` — línea 598

Enlace del botón "Duplicar" del inspector.

### `eliminarAparato(idInstancia)` — línea 602

Borra una instancia con estas reglas:

- `numero === 1` (original) → `alert` y no hace nada.
- Si está encendida → `alert` "Apaga el aparato antes de eliminarlo".
- Si procede: `delete aparatos[id]`, reasigna la selección a otro equipo de la
  misma zona (o `null`), guarda, repinta y actualiza UI.

### `eliminarAparatoSeleccionado()` — línea 620

Enlace del botón "Eliminar" del inspector.

### `apagarZona(idZona)` — línea 624

Apaga todos los equipos de la zona excepto los `siempreOn`. Devuelve el número
de equipos apagados. Repinta y actualiza UI.

### `encenderZona(idZona)` — línea 637

Enciende todos los equipos de la zona que estén apagados y no sean `siempreOn`
(cada uno con su propia duración).

### `encenderZonaDesdeInspector()` / `apagarZonaDesdeInspector()` — líneas 645 / 650

Atajos que toman la zona del equipo seleccionado y llaman a las funciones
anteriores.

### `getConsumoPorZona()` — línea 655

Devuelve `{ [idZona]: { elec, agua, term, generacion, aparatosOn, aparatosTotal } }`.

- Inicializa todas las zonas a 0.
- Recorre `aparatos`: cuenta el total y, si está encendido, suma
  `potencia` (kW), `agua × 60` (L/h), `termica` (kW), o bien la generación
  (perfil solar de la hora actual o `potenciaGeneracion` del diésel).

Alimenta a `updateStats()` (tarjetas por zona) y a `drawChartZonas()`.

---

## 9. Controles generales

### `setTab(idTab, boton)` — línea 688

Cambia de pestaña (`plano` | `consumo` | `graficas`): actualiza `state`,
la clase `active` y `aria-selected` de los botones, oculta/muestra los
`.tab-panel` y, si se abre la de gráficas, las redibuja en el siguiente frame
(`requestAnimationFrame(drawCharts)`).

### `togglePlay()` — línea 704

Arranca/pausa la simulación. Si estaba al final del día (23:59) primero llama a
`resetAll()`. Actualiza texto y clase del botón `#btnPlay`.

### `setSpeed(s, btn)` — línea 717

Fija `state.speed` (minutos simulados por segundo reales: 1, 5, 15, 60) y
marca `active` en el botón correspondiente.

### `jumpToHour(h)` — línea 723

Salta el reloj a una hora con el slider `#hourSlider`. Fija
`state.minute` a los minutos ya simulados de esa hora (o 59 si la hora está
completa) para no repetir cómputos, y refresca la UI.

---

## 10. Simulación

### `avanzarMinuto()` — línea 734 · **núcleo del simulador**

Ejecuta un minuto simulado de la hora actual. Devuelve `true` si algún equipo
se apagó solo (para que el bucle repinte el plano).

Flujo:

1. **Guard**: si `minutosSimulados[h] >= 60` devuelve `false` (evita doble
   cómputo al reproducir o saltar a una hora ya simulada).
2. **Recorre los aparatos encendidos** y acumula en el minuto:
   - solar → `generacionSolar += PERFIL_SOLAR[h]`
   - diésel → `generacionDiesel += potenciaGeneracion` y
     `litrosGasoleo += potenciaGeneracion × 0,28 × (1/60)`
   - consumos → suma de `potencia`, `agua × 60` (L/h), `termica`, además de
     acumular energía en el propio aparato (`energiaAcum`, `aguaAcum`,
     `termicaAcum`) y ponderar el FP por potencia.
   - Decrementa `minutosRestantes` (salvo solar y `siempreOn`); al llegar a 0
     apaga el equipo y marca `cambioEstado`.
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

---

## 11. UI y estadísticas

### `updateUI()` — línea 826

Actualiza toda la interfaz cada 250 ms durante la reproducción (y tras cualquier
acción). No escribe en los arrays horarios (eso lo hace `avanzarMinuto()`), solo
lee y pinta:

- Recalcula potencias instantáneas: `pDemanda`, `pSolar`, `pDiesel`,
  `pActiva = max(0, demanda − generación)` y reactiva
  `pActiva · tan(acos(FP))`.
- Reloj `#clock` y métricas `#demandaActual`, `#pActiva`, `#pReactiva`,
  `#fpVal`, `#energiaHoy`, `#solarGenerada`, `#dieselGenerada`,
  `#importRed`, `#gasoleoTotal`.
- **Anillo de FP** `#gaugeFP`: `conic-gradient` con color por tramo
  (verde ≥0,92 / ámbar ≥0,85 / rojo <0,85).
- **Alerta eléctrica** `#elecAlert`: 7 estados (demanda >4,5 kW, FP crítico,
  FP bajo, instalación cubriendo demanda, autoconsumo, pico, normal).
- **Agua**: caudal instantáneo `#caudal` (L/min = (base+aparatos)/60),
  `#aguaHoy`, `#presion` (valor simulado con `sin(h)`), y `#aguaAlert`
  (fuga >90 L/h, elevado >60, sin fugas).
- **Térmico**: `#termica`, `#gas`, `#temp` (`20 + térmica×5`) y `#termAlert`.
- Slider `#hourSlider`, barra del día, lista de activos y estadísticas.
- Refresca energía/recursos del inspector si hay selección.
- Si la pestaña activa es `graficas`, llama a `drawCharts()`.

### `updateDayBar()` — línea 940

Construye (si hace falta) y actualiza las 24 casillas de `#dayBar`. El color de
cada hora depende de su importación de red, y el `title` muestra estado, demanda,
solar y diésel. Marca `active` la hora actual.

### `updateStats()` — línea 959

Rellena los micro-datos de las tarjetas de gráficas y las zonas:

- Eléctrico: máximo, media y total de demanda hasta la hora actual; FP mínimo;
  red actual/media/máximo/total.
- Generación: total, solar (total y actual), diésel (total y actual), gasóleo
  consumido, **% de autoconsumo** = `min(energiaHoy, generación) / energiaHoy`
  y excedente total.
- Agua: pico, media y total.
- Térmico: pico, media, total y gas equivalente.
- `#zonasStats`: tarjeta por zona con sus potencias (o "Genera X kW" si es zona
  de generación) y nº de equipos activos.

---

## 12. Gráficas en canvas

### `setupCanvas(canvas)` — línea 1036

Prepara un canvas para dibujar nítido en pantallas HiDPI: multiplica el tamaño
por `devicePixelRatio`, aplica `ctx.scale(dpr, dpr)` y devuelve
`{ ctx, w, h }` en píxeles CSS. Devuelve `null` si el canvas no existe o tiene
tamaño 0.

### `drawCharts()` — línea 1048

Gráfica principal eléctrica (`#chartElec`) y orquesta el resto:

- Ejes, rejilla horizontal (4 divisiones) y etiquetas de horas cada 4 h.
- Barras apiladas por hora: base (gris) + aparatos (ámbar); las horas futuras
  se pintan translúcidas.
- Línea verde de FP (escala ×0,5) y línea azul de importación de red.
- Línea vertical discontinua de "ahora" en `hour + minute/60`.
- Al final llama a `drawBarChart('chartWater', ...)`,
  `drawBarChart('chartThermal', ...)` y a `drawChartGeneration()` y
  `drawChartZonas()`.

### `drawChartGeneration()` — línea 1147

Gráfica de líneas de generación (`#chartGeneration`): serie solar continua
(`#facc15`) y serie diésel discontinua (`#fb923c`) a partir de
`obtenerDatosHora(i).solar/.diesel`, con eje, rejilla y marcador de hora.
Incluye la función auxiliar interna `dibujarLinea(datos, color, guiones)`.

### `drawChartZonas()` — línea 1209

Barras agrupadas por zona (`#chartZonas`): 4 barras por zona (eléctrica, agua
÷10, térmica y generación) con icono y nombre debajo. Si el ancho es menor que
560 px abrevia los nombres (`Dormitorio` → `Dorm`, etc.).

### `drawBarChart(canvasId, baseData, apData, colorBase, colorAp, colorAlert, alertThreshold, currentValue)` — línea 1277

Gráfica de barras apiladas reutilizable (agua y térmico):

- `maxVal` calculado considerando, para la hora actual, `currentValue` si la
  hora todavía no se ha simulado o `apData[h]` si ya lo está.
- Barras apiladas base + aparatos; color de alerta cuando supera
  `alertThreshold` (90 L/h en agua).
- Horas futuras en translúcido y marcador de "ahora".

---

## 13. Bucle y reset

### Globales de bucle (líneas 1356–1358)

`lastTick` (último `requestAnimationFrame`), `accumMinutos` (acumulado fraccionado)
y `ultimaActualizacionUI` (throttling de la UI a 250 ms).

### `loop(now)` — línea 1359

Bucle principal con `requestAnimationFrame`:

- Si está reproduciendo: acumula `speed × dt` minutos; por cada minuto entero
  incrementa el reloj y llama a `avanzarMinuto()`; al pasar de 60 min cambia de
  hora; al llegar a las 24:00 se detiene en 23:59 y cambia el botón a
  "▶ Reiniciar día". Si algún equipo cambió de estado, repinta plano e
  inspector. Llama a `updateUI()` como mucho cada 250 ms.
- Si no reproduce: vacía el acumulador (para que al reanudar no salte tiempo).
- Siempre reprograma `requestAnimationFrame(loop)`.

### `resetAll()` — línea 1400

Reinicia el día completo: reloj a 00:00, pausa, todos los arrays horarios a 0
(`fp` a 0,95), todos los acumuladores diarios a 0, y cada aparato a su estado
inicial (`on = siempreOn || generacionAutomatica`, temporizadores y acumulados a
0). Resetea el botón de play y repinta.

---

## 14. Lectura de datos por hora

### `obtenerDatosHora(h)` — línea 1454 · **fuente única de verdad**

Devuelve un objeto con todos los valores de la hora `h`, resolviendo de dónde
sale cada dato:

- `estado`: `Simulado` si `minutosSimulados[h] > 0`; `Actual` si es la hora en
  curso; `Proyectado` en otro caso.
- Potencias de aparatos y generación: usa el promedio horario simulado si lo
  hay; si no, el instantáneo actual (hora actual) o una proyección con el
  perfil/estado de los generadores (horas futuras).
- Deriva: `generacion`, `importacion = max(0, demanda − generación)`,
  `excedente = max(0, generación − demanda)`, `reactiva`, `gas = térmica/10,5`.
- Energías acumuladas del día para esa hora: `energiaDemanda`, `energiaSolar`,
  `energiaDiesel`, `energiaImportada`, `energiaExcedente`.
- `gasoleo`: energía diésel de la hora × `litrosGasoleoPorKwh`.

Lo consumen: `updateDayBar()`, `updateStats()`, `drawCharts()`,
`drawChartGeneration()`, `drawBarChart()` y los tres exportadores.

---

## 15. Exportaciones

### `exportarCSV()` — línea 1518

Genera 24 filas (una por hora) con 23 columnas —hora, estado, potencias,
energías, FP, agua, térmica, gasóleo— más un bloque de "Resumen diario".
Usa `;` como separador y llama a `descargarArchivo()` con el nombre
`smart_home_24h.csv`.

### `descargarArchivo(contenido, nombre, tipo)` — línea 1553

Helper común: crea un `Blob` con BOM `\uFEFF` (para que Excel abra bien los
acentos), genera una URL temporal, la descarga con un `<a>` temporal y libera
tanto el nodo como el `objectURL`.

### `exportarExcelMultiHoja()` — línea 1568

Genera un `.xls` real en **SpreadsheetML XML** con 4 hojas:

| Hoja | Contenido |
|---|---|
| `Datos 24h` | 19 columnas por hora (potencias, energías, FP, gasóleo). |
| `Resumen Activos` | Una fila por equipo: zona, tipo, potencia, energía, agua, térmica y estado. |
| `Resumen Diario` | 13 métricas clave (demanda, generación, autoconsumo, gasóleo, FP medio/mínimo…). |
| `Para Graficos` | Tabla plana de 8 columnas lista para insertar gráficos. |

Incluye `<Styles>` con cabecera invertida. Se descarga como
`smart_home_datos.xls`.

### `exportarExcelConGraficos()` — línea 1712 (async)

Exporta `.xlsx` real con **ExcelJS** (cargado por CDN). Pasos:

1. Aborta con `alert` si ExcelJS no está disponible.
2. Cambia temporalmente a la pestaña `graficas` y llama a `drawCharts()` para
   tener los canvas actualizados.
3. Crea el libro y 3 hojas de datos: `Datos 24h`, `Resumen Aparatos` y
   `Resumen Diario` (mismos contenidos que el `.xls`).
4. Añade 5 hojas de imagen (`Grafico Electrico`, `Grafico Generacion`,
   `Grafico Agua`, `Grafico Termico`, `Grafico Zonas`) mediante las funciones
   anidadas `canvasToBase64()` y `addImageSheet()`.
5. Escribe el buffer, lo descarga como `smart_home_con_graficos.xlsx` y
   restaura la pestaña anterior.

Funciones anidadas (solo visibles dentro del exportador):

- `canvasToBase64(canvasId)` — línea 1829: copia el canvas a uno temporal con
  fondo `#1e293b` y devuelve el PNG en base64 sin prefijo `data:`.
- `addImageSheet(name, canvasId)` — línea 1842: crea una hoja, inserta la
  imagen a 720×400 px en la celda `0.5/0.5`.

---

## 16. Inicialización (líneas 1879–1888)

```js
window.addEventListener('resize', ...)  // repinta gráficas si la pestaña está abierta
state.aparatoSeleccionado = CATALOGO[0].id
state.plantaActiva = ...planta del seleccionado
generarPerfilesBase()
renderAparatos()
updateUI()
requestAnimationFrame(loop)
```

Orden de arranque completo al cargar la página:

1. `zonas.js` declara los datos.
2. `app.js` crea instancias → `cargarDistribucion()` (restaura posiciones).
3. Selección inicial, perfiles base aleatorios, primer render y primer pintado.
4. Arranca el bucle de animación (en pausa hasta pulsar "▶ Iniciar día").
