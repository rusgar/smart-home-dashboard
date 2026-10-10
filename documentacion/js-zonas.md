# `js/zonas.js` — Modelo de datos del edificio

Fichero **solo de datos**: no contiene lógica ni DOM. Declara cuatro constantes
globales que `js/app.js` consume después.

- Líneas: 75
- Dependencias: ninguna (se carga el primero)
- Exporta: `PLANTAS`, `ZONAS`, `CATEGORIAS`, `CATALOGO`

---

## 1. `PLANTAS` (líneas 1–20)

Array con las tres plantas de la vivienda.

```js
{ id, nombre, icono, zonas: [idZona, ...] }
```

| id | nombre | zonas |
|---|---|---|
| `baja` | Planta Baja 🏠 | `salon`, `cocina`, `bano`, `garaje` |
| `alta` | Planta Alta 🏡 | `dormitorio`, `dormitorio2`, `bano_alta` |
| `cubierta` | Cubierta ↗ | `cubierta` |

`id` es la clave de `state.plantaActiva` y la usan los botones de pestaña de
planta (`renderPlantaTabs`) y `cambiarPlanta()`.

---

## 2. `ZONAS` (líneas 22–31)

Mapa de objetos por ID de zona (8 zonas). Cada entrada:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Clave única; es el valor que guardan `ap.zona`. |
| `nombre` | string | Nombre visible (etiqueta del plano, select del inspector, gráficas). |
| `icono` | emoji | Icono que precede al nombre. |
| `mueble` | emoji | Mobiliario de fondo (`aria-hidden`) que da aspecto de plano realista. |
| `planta` | string | ID de `PLANTAS` al que pertenece. |
| `suelo` | string | Material del suelo → selector CSS `[data-suelo=...]`: `madera`, `baldosa`, `hormigon`, `tejado`. |
| `color` | hex | Color de identificación; se inyecta como `--zona-color` en el recuadro y en cada badge. |
| `plano` | `{x,y,w,h}` | Geometría en **%** del contenedor del plano (esquina superior izquierda + tamaño). |

Zonas y geometría:

| id | nombre | planta | suelo | `plano` |
|---|---|---|---|---|
| `salon` | Salón | baja | madera | `{x:2, y:3, w:44, h:48}` |
| `cocina` | Cocina | baja | baldosa | `{x:48, y:3, w:30, h:48}` |
| `bano` | Baño | baja | baldosa | `{x:80, y:3, w:18, h:48}` |
| `garaje` | Garaje | baja | hormigon | `{x:2, y:54, w:96, h:43}` |
| `dormitorio` | Dormitorio 1 | alta | madera | `{x:2, y:3, w:28, h:94}` |
| `dormitorio2` | Dormitorio 2 | alta | madera | `{x:32, y:3, w:28, h:94}` |
| `bano_alta` | Baño (Alta) | alta | baldosa | `{x:63, y:3, w:35, h:94}` |
| `cubierta` | Cubierta | cubierta | tejado | `{x:2, y:3, w:96, h:94}` |

**Importante:** `ap.posX` / `ap.posY` se interpretan en el **mismo sistema
(% del plano completo)**, no de la zona. Por eso
`ajustarPosicionAparatoEnZona()` suma `zona.plano.x` para limitar dentro del
recuadro.

---

## 3. `CATEGORIAS` (líneas 33–41)

Clasificación visual de los equipos: define el color del badge en el plano y la
etiqueta de la leyenda (`renderLeyendaPlano`, `claveCategoriaAparato`).

| clave | nombre | color |
|---|---|---|
| `luz` | Iluminación | `#f59e0b` |
| `clima` | Climatización | `#ef4444` |
| `vent` | Ventilación | `#22c55e` |
| `electro` | Electrodomésticos | `#14b8a6` |
| `agua` | Agua | `#3b82f6` |
| `garaje` | Garaje | `#a78bfa` |
| `generacion` | Generación | `#84cc16` |

> Las fuentes `solar` y `diesel` tienen color propio (`#facc15` / `#fb923c`)
> y se resuelven en `claveCategoriaAparato()` de `app.js` antes de consultar
> este mapa.

---

## 4. `CATALOGO` (líneas 43–75)

Array con los **24 equipos base** (14 planta baja + 8 planta alta + 2 cubierta).
Es la fuente de verdad de la que `app.js` crea instancias.

### 4.1 Campos comunes

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID de catálogo y de la instancia original. |
| `emoji` | string | Icono del badge. |
| `nombre` | string | Nombre visible. |
| `potencia` | number | Consumo eléctrico en **kW** (0 en generadores). |
| `agua` | number | Caudal en **L/min** (8 en duchas, 0,7 en lavadora, 0,15 en lavavajillas; 0 en el resto). Se convierte a L/h ×60. |
| `fp` | number | Factor de potencia (0,70–0,99): bajo en motores (frigorífico, ventilador) y microondas. |
| `termica` | number | Aporte/refrigeración térmica en **kW** (negativo en aire acondicionado y frigorífico). En equipos `acs` se ignora: la térmica se deriva del agua. |
| `zona` | string | ID de zona por defecto. |
| `duplicable` | boolean | Si `true` se puede crear una copia con `duplicarAparato()` (ya no hay botón en el inspector). **Los 22 equipos de consumo son duplicables**; solo `placas_solares` y `generador_diesel` no lo son. |
| `posX`, `posY` | number | Posición por defecto en % del plano. |
| `categoria` | string | Clave de `CATEGORIAS`. |

### 4.2 Campos opcionales

| Campo | Descripción |
|---|---|
| `siempreOn: true` | No se puede apagar (frigorífico). Arranca encendido. |
| `acs: true` | Equipo de agua caliente sanitaria (duchas): su aporte térmico se calcula como `agua × 60 × 0,0465` kWh/L (calentamiento a 40 °C) en lugar de usar `termica`. |
| `tipo: 'generacion'` | Marca el equipo como fuente de energía, no como carga. |
| `fuente: 'solar' \| 'diesel'` | Tipo de generación. |
| `potenciaGeneracion` | kW pico del generador (6,5 solar / 5 diésel). |
| `generacionAutomatica: true` | Arranca encendido y sin temporizador (placas solares). |
| `litrosGasoleoPorKwh` | Consumo de gasóleo: 0,28 L/kWh. |

### 4.3 Listado por zona

Valores **realistas de vivienda** (recalibrados): standby y equipos de bajo
consumo ≤ 0,10 kW, iluminación LED 0,02–0,10 kW, climatización 1,10–1,50 kW y
electrodomésticos de ciclo 1,00–2,50 kW. **D** = duplicable.

**Agua por equipo**: duchas 8 L/min (`acs`), lavadora 0,7 L/min (~50 L por
ciclo), lavavajillas 0,15 L/min (~12 L por ciclo); el resto (incluida la
secadora) no consume agua.

**Planta baja · `salon`**
| id | equipo | kW | FP | térmica | posX/posY | D |
|---|---|---|---|---|---|---|
| `tv` | Televisor 55" | 0,10 | 0,92 | 0 | 36 / 20 | ✔ |
| `luces_salon` | Luces salón | 0,10 | 0,95 | 0,05 | 16 / 16 | ✔ |
| `aire_salon` | Aire acondicionado | 1,10 | 0,95 | −2,0 | 12 / 38 | ✔ |

**Planta baja · `cocina`**
| id | equipo | kW | FP | térmica | posX/posY | D |
|---|---|---|---|---|---|---|
| `lavadora` | Lavadora | 2,00 | 0,85 | 0 | 56 / 19 | ✔ |
| `lavavajillas` | Lavavajillas | 1,80 | 0,88 | 0 | 68 / 19 | ✔ |
| `horno` | Horno eléctrico | 2,50 | 0,99 | 2,0 | 56 / 39 | ✔ |
| `microondas` | Microondas | 1,00 | 0,80 | 0,3 | 68 / 39 | ✔ |
| `frigorifico` | Frigorífico (`siempreOn`) | 0,08 | 0,72 | −0,1 | 62 / 9 | ✔ |
| `luces_cocina` | Luces cocina | 0,06 | 0,95 | 0,03 | 70 / 9 | ✔ |

**Planta baja · `bano`**
| id | equipo | kW | agua | FP | posX/posY | D |
|---|---|---|---|---|---|---|
| `ducha` | Ducha (ACS, `acs`) | 0,10 | 8 L/min | 0,98 | 88 / 20 | ✔ |
| `luces_bano` | Luces baño | 0,02 | 0 | 0,95 | 88 / 39 | ✔ |

**Planta baja · `garaje`**
| id | equipo | kW | FP | posX/posY | D |
|---|---|---|---|---|---|
| `secadora` | Secadora | 2,50 | 0,95 | 15 / 73 | ✔ |
| `enchufe_garaje` | Enchufe garaje | 0,60 | 0,92 | 35 / 73 | ✔ |
| `luces_garaje` | Luces garaje | 0,04 | 0,95 | 82 / 73 | ✔ |

**Planta alta · `dormitorio`**
| id | equipo | kW | FP | posX/posY | D |
|---|---|---|---|---|---|
| `luces_dorm` | Luces dormitorio 1 | 0,03 | 0,95 | 16 / 20 | ✔ |
| `radiador_dorm` | Radiador dormitorio 1 | 1,50 | 0,99 | 16 / 43 | ✔ |
| `ventilador` | Ventilador 1 | 0,05 | 0,70 | 16 / 68 | ✔ |

**Planta alta · `dormitorio2`** — mismo trío con IDs `luces_dorm2`,
`radiador_dorm2`, `ventilador2` en `posX 46`.

**Planta alta · `bano_alta`**
| id | equipo | kW | agua | posX/posY | D |
|---|---|---|---|---|---|
| `ducha_alta` | Ducha (ACS, `acs`) | 0,10 | 8 L/min | 72 / 20 | ✔ |
| `luces_bano_alta` | Luces baño | 0,02 | 0 | 86 / 40 | ✔ |

**Cubierta · `cubierta` (fuentes de generación)**
| id | equipo | fuente | potencia | notas | posX/posY |
|---|---|---|---|---|---|
| `placas_solares` | Placas solares | `solar` | 6,5 kW pico | `generacionAutomatica`, sigue `PERFIL_SOLAR` | 35 / 32 |
| `generador_diesel` | Generador diésel | `diesel` | 5 kW | `0,28 L/kWh`, arranca apagado | 70 / 68 |

---

## 5. Cómo se consume este fichero

| Constante | Consumidor principal |
|---|---|
| `PLANTAS` | `renderPlantaTabs()`, `cambiarPlanta()`, `renderInspector()` (optgroup), `renderPlano()`. |
| `ZONAS` | `renderPlano()`, `zonaDesdePosicion()`, `ajustarPosicionAparatoEnZona()`, `getConsumoPorZona()`, exportaciones. |
| `CATEGORIAS` | `claveCategoriaAparato()`. |
| `CATALOGO` | `crearInstanciaAparato()` al arrancar y en `duplicarAparato()`. |
