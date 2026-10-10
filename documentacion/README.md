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
| **Instancia (`aparatos[id]`)** | Ejemplar vivo de un catálogo: tiene estado (`on`), acumulados (`energiaAcum`), duración restante, contadores de uso (`minutosEncendido`, `ciclos`) y **tramos de uso** (`periodos` con cada encendido–apagado del día y `periodoAbierto`) además de la posición en el plano. |
| **Duplicado** | Instancia extra de un catálogo marcado `duplicable: true`. **Son duplicables los 22 equipos de consumo**; solo `placas_solares` y `generador_diesel` no. Su ID es `idCatalogo_n`. No hay botón de duplicar en la interfaz: la copia se crea con `duplicarAparato()`. |
| **Consumo base** | Perfil por hora de la casa vacía (`baseElec`, `baseAgua`, `baseTerm`): siempre presente y **visible** en las tarjetas y en la primera tarjeta de zonas, para que suba aunque no haya equipos encendidos. |
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
- **🎲 Auto (pruebas)** (`state.autoSim`): modo de pruebas (no usar en la
  práctica) de simulación automática. Cada
  minuto, cada equipo apagado tiene una probabilidad (por categoría y hora,
  `PROB_ENCENDIDO`, expresada **por hora** y convertida a minuto) de encenderse
  con una duración aleatoria; el apagado lo hace el temporizador normal, así
  que las gráficas siguen siendo coherentes. Además, el **generador diésel**
  se enciende solo si falta más de 1,5 kW (menos solar + cargas) y se apaga
  por debajo de 0,5 kW.

## Fórmulas de balance energético

```
demanda      = baseElec[h] + suma(potencias de aparatos encendidos)
generación   = PERFIL_SOLAR[h] (si solar ON) + potenciaGeneracion (si diésel ON)
importación  = max(0, demanda − generación)     → se compra a la red
excedente    = max(0, generación − demanda)     → se vierte a la red
reactiva     = demanda · tan(acos(FP))
gasoleo      = potenciaDiésel · litrosGasoleoPorKwh · (1/60)  por minuto
gas (m³)     = energíaTérmica / 10,5
térmica ACS  = litros de agua · 0,0465   (duchas: agua × 60 × 0,0465 en kW)
```

## Convenciones

- Unidades de agua: el catálogo guarda **L/min**; internamente se multiplica
  por 60 para trabajar en **L/h**. La UI vuelve a dividir entre 60 para el
  caudal instantáneo.
- Perfil solar en kW pico a las 12:00 (máximo 6,5 kW).
- El frigorífico (`siempreOn`) y las placas solares (`generacionAutomatica`)
  arrancan encendidos y no se pueden apagar desde la interfaz.
- El generador diésel arranca **apagado**: se enciende a mano o
  automáticamente en modo 🎲 Auto (faltan > 1,5 kW; se apaga al bajar de
  0,5 kW).
- El botón **«Reiniciar día»** abre un **modal de confirmación** («¿Reiniciar
  el día?») antes de borrar el día; también se cierra con Escape o clicando
  fuera.
- **Sin persistencia**: la app no guarda nada en el navegador (ni posiciones ni
  contadores); al cargar se borra la clave heredada de `localStorage`, así que
  cada visita arranca de cero.
- La tarjeta **«Aparatos activos ahora»** va **encima** del inspector y se
  muestra con tipografía grande.
- En la pestaña **Gráficas**, al pasar el ratón por las 4 gráficas de 24 h
  (eléctrica, solar/diésel, hídrica y térmica) aparece un **crosshair** con la
  hora exacta, el estado (`Simulado`/`Actual`/`Proyectado`) y los valores de esa
  hora en un tooltip.
- El botón **«Duplicar»** se ha eliminado del inspector (queda solo
  «Eliminar»).
- Las potencias del catálogo están **recalibradas a valores realistas**
  (standby ≤ 0,10 kW, LED 0,02–0,10 kW, climatización 1,10–1,50 kW,
  electrodomésticos 1,00–2,50 kW y FP entre 0,70 y 0,99).
- Ambos Excel incluyen por equipo los **Horarios de encendido** (lista de
  tramos), el **tiempo encendido (min)** y los **ciclos** del día simulado, y
  una hoja **Registro de encendidos** con **una fila por cada encendido**
  (activo, ciclo, hora de encendido y apagado, duración, energía, agua y
  térmica).
