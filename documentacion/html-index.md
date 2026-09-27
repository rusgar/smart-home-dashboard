# `domotica2.html` — Estructura de la interfaz

Página única (304 líneas) que monta toda la UI. No contiene lógica: solo
estructura y llamadas `onclick`/`onchange` a funciones globales definidas en
`js/app.js`.

- Hoja de estilo: `css/styles.css`
- Librería externa: ExcelJS 4.4.0 (CDN) para exportar `.xlsx`
- Scripts: `js/zonas.js` y luego `js/app.js`, **al final del `body`**

---

## 1. Cabecera y carga de recursos

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Domótica 2 · Smart Home Dashboard</title>
  <link rel="stylesheet" href="css/styles.css">
  <script src=".../exceljs.min.js"></script>
</head>
```

| Recurso | Por qué |
|---|---|
| `css/styles.css` | Tema oscuro, plano, tarjetas, gráficas y responsive. |
| ExcelJS (CDN) | Necesario para `exportarExcelConGraficos()`. Se comprueba su existencia antes de usarla. |

---

## 2. `<header>` (líneas 12–18)

| Elemento | ID | Función |
|---|---|---|
| `h1` | — | Título de la aplicación. |
| `.sub` | — | Bajada descriptiva. |
| `.clock-display` | `clock` | Reloj simulado `HH:MM` (lo escribe `updateUI()`). |

---

## 3. Barra de herramientas (líneas 20–30)

Contenedor `.toolbar` con los controles de la simulación:

| Control | Atributos | Manejador |
|---|---|---|
| Botón play/pausa | `#btnPlay`, clase `btn-play` | `togglePlay()` |
| Reiniciar día | clase `btn-reset` | `resetAll()` |
| Velocidad 1 / 5 / 15 / 60 | 4 × `.btn-speed` (el primero `active`) | `setSpeed(n, this)` |
| Slider de hora | `#hourSlider` (`min=0 max=23 step=1`) | `jumpToHour(this.value)` (`oninput`) |

### `dayBar` (línea 32)

`<div class="day-bar" id="dayBar"></div>` — contenedor vacío que
`updateDayBar()` rellena con 24 casillas (una por hora), coloreadas según la
importación de la red y con la hora actual marcada.

---

## 4. Pestañas (líneas 34–38)

`<nav class="tabs" role="tablist">` con 3 botones `role="tab"`:

| `data-tab` | Texto | Panel asociado |
|---|---|---|
| `plano` | Plano de la casa | `#panel-plano` |
| `consumo` | Consumo | `#panel-consumo` |
| `graficas` | Gráficas | `#panel-graficas` |

Los tres usan `onclick="setTab('id', this)"` y llevan `aria-selected` /
`aria-controls`. La pestaña activa por defecto es `plano`.

---

## 5. `<main>` — Panel «Plano de la casa» (líneas 41–116)

`<section id="panel-plano" class="tab-panel active" role="tabpanel">`
contiene una `.plan-layout` con plano a la izquierda y sidebar a la derecha.

### 5.1 Tarjeta del plano (`.plan-card`)

| Elemento | ID / clase | Papel |
|---|---|---|
| Encabezado | `.section-heading` | Título, subtítulo con la instrucción de arrastre y **pestañas de planta**. |
| Pestañas de planta | `#plantaTabs` (`.plant-tabs`) | Vacío; lo rellena `renderPlantaTabs()`. |
| Pista y botón | `#planHint`, botón `restablecerPlano()` | Ayuda `aria-live` y "Restaurar plano". |
| Visor | `.plan-viewport` | Contiene el plano con scroll si hace falta. |
| **Plano** | `#floorPlan` (`.floor-plan`) | Elemento raíz del plano; lo vacía y repinta `renderPlano()`. |
| Leyenda | `#planLegend` (`.plan-legend`) | Vacía; la rellena `renderLeyendaPlano()` con chips de categoría. |

Los `<button>` de cada equipo, los recuadros de zona y las etiquetas se crean
**por JavaScript** dentro de `#floorPlan`.

### 5.2 Sidebar

**Tarjeta «Activo seleccionado»** (`.inspector-card`)

| ID | Tipo | Quién lo usa |
|---|---|---|
| `emptyInspector` | div | Se muestra cuando no hay selección. |
| `inspectorContent` | div (oculto por defecto) | Contenedor del inspector real. |
| `inspectorEmoji` | span | Emoji del equipo. |
| `inspectorName` | strong | Nombre (`nombreAparato`). |
| `inspectorLocation` | span | Zona + planta. |
| `inspectorSwitch` | button `.switch` | `onclick="toggleAparatoFromInspector()"`; se deshabilita si `siempreOn`. |
| `inspectorPower` / `inspectorFp` | strong | Potencia (kW) y factor de potencia. |
| `inspectorEnergyLabel` / `inspectorEnergy` | span/strong | "Energía" o "Generación" y su valor. |
| `inspectorResourceLabel` / `inspectorWater` | span/strong | "Agua", "Gasoleo" o "Fuente". |
| `inspectorZone` | `<select>` | `onchange="cambiarZonaAparato()"`; las opciones las genera `renderInspector()`. |
| `durationControl` | div | Bloque de duración; se oculta para el solar. |
| `inspectorDuration` | `input[type=number]` (1–1440) | `onchange="cambiarDuracionAparato()"`. |
| `inspectorUnit` | `<select>` (`1` min / `60` h) | `onchange="cambiarDuracionAparato()"`. |
| Botones de zona | `.btn-zone` | `encenderZonaDesdeInspector()` y `apagarZonaDesdeInspector()`. |
| `inspectorDuplicate` | button | `duplicarAparatoSeleccionado()`; se deshabilita si no es `duplicable`. |
| `inspectorDelete` | button `.btn-danger` | `eliminarAparatoSeleccionado()`; se deshabilita en las originales. |

**Tarjeta «Aparatos activos ahora»**

- `#activeList` (`.active-list`) — lo rellena `updateActiveList()`; arranca con
  el texto "Ninguno activo".

---

## 6. Panel «Consumo» (líneas 118–217)

`<section id="panel-consumo" class="tab-panel" hidden>` con `.grid-metrics`:

### 6.1 Consumo Eléctrico (`.card.electric`)

| ID | Contenido |
|---|---|
| `gaugeFP` | Anillo `conic-gradient` del factor de potencia (lo pinta `updateUI()`). |
| `fpVal` | Valor numérico del FP (cambia de color por tramo). |
| `pActiva` | Importación de red (kW). |
| `pReactiva` | Potencia reactiva (kVAr). |
| `energiaHoy` | Energía consumida hoy (kWh). |
| `elecAlert` | Banda de alerta (normal / FP bajo / FP crítico / pico / autoconsumo). |

### 6.2 Balance energético (`.card.generation`)

| ID | Contenido |
|---|---|
| `demandaActual` | Demanda de la vivienda (kW). |
| `solarGenerada` | Generación solar acumulada (kWh). |
| `dieselGenerada` | Generación diésel acumulada (kWh). |
| `importRed` | Energía importada de la red (kWh). |
| `excedenteActual` | Excedente vertido ahora mismo (kW). Explica por qué la importación instantánea puede ser 0. |
| `gasoleoTotal` | Gasóleo consumido (L). |

### 6.3 Consumo Hídrico (`.card.water`)

| ID | Contenido |
|---|---|
| `caudal` | Caudal instantáneo (L/min). |
| `aguaHoy` | Consumo de agua hoy (L). |
| `presion` | Presión simulada (bar). |
| `aguaAlert` | `Sin fugas` / `Consumo elevado` / `Posible fuga detectada`. |

### 6.4 Consumo Térmico y Gas (`.card.thermal`)

| ID | Contenido |
|---|---|
| `termica` | Energía térmica acumulada (kWh). |
| `gas` | Gas equivalente (m³). |
| `temp` | Temperatura estimada (°C). |
| `termAlert` | `Caldera en reposo` / `Caldera activa` / `Alta demanda térmica`. |

### 6.5 Consumo instantáneo por zona

- `#zonasStats` (`.zonas-stats`) → lo genera `updateStats()` con una tarjeta
  por zona, con su color lateral.

### 6.6 Descargar datos

| Botón | `onclick` | Salida |
|---|---|---|
| CSV | `exportarCSV()` | `smart_home_24h.csv` |
| Excel simple (.xls) | `exportarExcelMultiHoja()` | `smart_home_datos.xls` (SpreadsheetML) |
| Excel con gráficos (.xlsx) | `exportarExcelConGraficos()` | `smart_home_con_graficos.xlsx` (ExcelJS) |

---

## 7. Panel «Gráficas» (líneas 219–298)

`<section id="panel-graficas" class="tab-panel" hidden>` con `.grid-charts`.
Cada tarjeta = `<canvas>` + leyenda de colores + `.stat-mini` con métricas.

| Tarjeta | Canvas | Lógica de dibujo | IDs de métricas |
|---|---|---|---|
| Eléctrico · 24h | `chartElec` | `drawCharts()` | `statElecMax`, `statElecAvg`, `statElecTotal`, `statFPMin`, `statGridActive`, `statGridAvg`, `statGridMax`, `statGridTotal`, `statGenerationTotal`, `statExcessTotal` |
| Solar y diésel · 24h | `chartGeneration` | `drawChartGeneration()` | `statSolarCurrent`, `statSolarTotal`, `statDieselCurrent`, `statDieselTotal`, `statDieselTotalLiters`, `statOffsetTotal` |
| Hídrico · 24h | `chartWater` | `drawBarChart()` | `statWaterMax`, `statWaterAvg`, `statWaterTotal` |
| Térmico · 24h | `chartThermal` | `drawBarChart()` | `statThermMax`, `statThermAvg`, `statThermTotal`, `statGasTotal` |
| Comparativa por zona | `chartZonas` | `drawChartZonas()` | — |

> Los `<canvas>` no tienen tamaño fijo en HTML: se dimensionan en runtime con
> `setupCanvas()` según el contenedor y el `devicePixelRatio`.

---

## 8. Scripts (líneas 301–302)

```html
<script src="js/zonas.js"></script>
<script src="js/app.js"></script>
```

Orden obligatorio: `app.js` usa `CATALOGO`, `ZONAS`, `PLANTAS` y `CATEGORIAS`
en el momento de ejecutarse. Al estar al final del `body`, el DOM ya existe y
todas las llamadas a `document.getElementById(...)` funcionan.

---

## 9. Mapa inverso: ¿quién escribe cada ID?

| ID | Escrito por |
|---|---|
| `clock`, métricas de consumo, alertas, `hourSlider` | `updateUI()` |
| `dayBar` | `updateDayBar()` |
| `stat*` (mini estadísticas) | `updateStats()` |
| `zonasStats` | `updateStats()` |
| `plantaTabs` | `renderPlantaTabs()` |
| `floorPlan` | `renderPlano()` |
| `planLegend` | `renderLeyendaPlano()` |
| `inspector*`, `durationControl` | `renderInspector()` |
| `activeList` | `updateActiveList()` |
| `btnPlay` | `togglePlay()`, `resetAll()`, `loop()` |
| `chartElec`, `chartGeneration`, `chartWater`, `chartThermal`, `chartZonas` | `drawCharts()` / `drawChartGeneration()` / `drawBarChart()` / `drawChartZonas()` |

## 10. Mapa de manejadores inline

| Atributo | Función de `app.js` |
|---|---|
| `onclick="togglePlay()"` | `togglePlay()` |
| `onclick="resetAll()"` | `resetAll()` |
| `onclick="setSpeed(n, this)"` | `setSpeed()` |
| `oninput="jumpToHour(this.value)"` | `jumpToHour()` |
| `onclick="setTab('x', this)"` | `setTab()` |
| `onclick="restablecerPlano()"` | `restablecerPlano()` |
| `onclick="toggleAparatoFromInspector()"` | `toggleAparatoFromInspector()` |
| `onchange="cambiarZonaAparato()"` | `cambiarZonaAparato()` |
| `onchange="cambiarDuracionAparato()"` | `cambiarDuracionAparato()` |
| `onclick="encenderZonaDesdeInspector()"` / `apagarZonaDesdeInspector()` | ídem |
| `onclick="duplicarAparatoSeleccionado()"` / `eliminarAparatoSeleccionado()` | ídem |
| `onclick="exportarCSV()"` / `exportarExcelMultiHoja()` / `exportarExcelConGraficos()` | ídem |
| `onclick` de los badges y pestañas de planta | creados dinámicamente en `renderPlano()` / `renderPlantaTabs()` |
