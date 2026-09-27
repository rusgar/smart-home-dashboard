# Documentación técnica · Smart Home Dashboard (Domótica 2)

Documentación del código fuente del simulador de domótica: modelo de datos,
lógica de simulación, interfaz y exportaciones.

## Índice de documentos

| Documento | Contenido |
|---|---|
| [`js-zonas.md`](js-zonas.md) | **JavaScript** · `js/zonas.js`: constantes de datos (`PLANTAS`, `ZONAS`, `CATEGORIAS`, `CATALOGO`) y estructura de cada campo. |
| [`js-app.md`](js-app.md) | **JavaScript** · `js/app.js`: estado global, modelo de instancias, persistencia, plano, simulación, UI, gráficas y exportaciones. Una entrada por función. |
| [`html-index.md`](html-index.md) | **HTML** · `index.html`: estructura completa, paneles, IDs de referencia y manejadores `onclick`. |
| [`html-otros.md`](html-otros.md) | **HTML** · `legacy/domotica.html`, `legacy/domotica1.html` y `legacy/prueba.html`: versiones antiguas (legado) y por qué ya no se usan. |

## Estructura del proyecto

```
smart-home-dashboard/
├── index.html               ← aplicación activa (entrada para Netlify)
├── css/styles.css           ← estilos (tema oscuro)
├── js/zonas.js              ← DATOS: plantas, zonas y catálogo de equipos
├── js/app.js                ← LÓGICA: simulación, render y exportación
├── legacy/                  ← código heredado (no se modifica)
│   ├── domotica.html
│   ├── domotica1.html
│   └── prueba.html
└── documentacion/           ← esta documentación
```

## Orden de carga

`index.html` carga los scripts **al final del `body`**, en este orden:

1. `js/zonas.js` → define `PLANTAS`, `ZONAS`, `CATEGORIAS`, `CATALOGO` (globales).
2. `js/app.js` → consume esas constantes, crea las instancias y arranca la app.

> `app.js` se apoya en que `zonas.js` ya está declarado: la línea
> `CATALOGO.forEach(...)` de `app.js` se ejecuta inmediatamente al cargar.

Antes, en el `<head>`, se carga ExcelJS desde CDN para la exportación `.xlsx`.

## Conceptos clave del modelo

| Término | Significado |
|---|---|
| **Catálogo (`CATALOGO`)** | Plantilla inmutable de un equipo: potencia, agua, FP, zona por defecto y posición por defecto. |
| **Instancia (`aparatos[id]`)** | Ejemplar vivo de un catálogo: tiene estado (`on`), acumulados (`energiaAcum`), duración restante y posición en el plano. |
| **Duplicado** | Instancia extra de un catálogo marcado `duplicable: true` (luces, enchufes, radiadores). Su ID es `idCatalogo_n`. |
| **Zona (`ZONAS`)** | Recuadro del plano: tiene geometría (`plano: {x,y,w,h}` en %), color, tipo de suelo y planta a la que pertenece. |
| **Planta (`PLANTAS`)** | Nivel de la vivienda: `baja`, `alta`, `cubierta`. Agrupa listas de IDs de zonas. |
| **Instancia original** | Aquella con `numero === 1`; no se puede eliminar, solo apagar. |
| **Potencia vs. energía** | kW (instantáneo) y kWh (energía acumulada en la hora). |

## Motor de tiempo

- `state.hour` / `state.minute` marcan la hora simulada (00:00 → 23:59).
- El bucle `requestAnimationFrame` (`loop()`) acumula tiempo real y llama a
  `avanzarMinuto()` una vez por minuto simulado según `state.speed`.
- Cada hora tiene un contador `minutosSimulados[h]` (0–60) que evita dobles
  cómputos cuando se salta o reproduce una hora ya simulada.
- `obtenerDatosHora(h)` es la **única fuente de verdad** a la hora de leer una
  hora concreta: devuelve estado (`Simulado` / `Actual` / `Proyectado`) y todas
  las magnitudes. Gráficas, estadísticas y exportaciones usan esta función.

## Fórmulas de balance energético

```
demanda      = baseElec[h] + suma(potencias de aparatos encendidos)
generación   = PERFIL_SOLAR[h] (si solar ON) + potenciaGeneracion (si diésel ON)
importación  = max(0, demanda − generación)     → se compra a la red
excedente    = max(0, generación − demanda)     → se vierte a la red
reactiva     = demanda · tan(acos(FP))
gasoleo      = potenciaDiésel · litrosGasoleoPorKwh · (1/60)  por minuto
gas (m³)     = energíaTérmica / 10,5
```

## Convenciones

- Unidades de agua: el catálogo guarda **L/min**; internamente se multiplica
  por 60 para trabajar en **L/h**. La UI vuelve a dividir entre 60 para el
  caudal instantáneo.
- Perfil solar en kW pico a las 12:00 (máximo 6,5 kW).
- El frigorífico (`siempreOn`) y las placas solares (`generacionAutomatica`)
  arrancan encendidos y no se pueden apagar desde la interfaz.
- El generador diésel arranca **apagado** y solo se enciende manualmente.
