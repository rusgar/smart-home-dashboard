# Código heredado (`legacy/`)

La carpeta `legacy/` contiene tres ficheros **que no forman parte de la
aplicación activa**: son versiones anteriores con la lógica embebida en un
`<script>` dentro del propio HTML. Se conservan como referencia y **no deben
modificarse**. La aplicación vigente es [`index.html`](html-index.md).

| Archivo | Título | Diferencias frente a `index.html` |
|---|---|---|
| `legacy/domotica.html` | Smart Home Dashboard · Exportable a Excel | Versión más antigua: sin `js/zonas.js` ni `js/app.js`; todo el estado, el plano y la simulación están en un `<script>` inline. Sin cubierta ni generación. |
| `legacy/domotica1.html` | Smart Home Dashboard · Exportable a Excel | Evolución de la anterior: ya carga ExcelJS por CDN, pero sigue con la lógica inline en un único bloque `<script>`. |
| `legacy/prueba.html` | Smart Home Dashboard · Electrodomésticos + 24h | Prueba de concepto centrada en el reparto por electrodomésticos y la curva de 24 h; sin estructura de plantas. |

> Los tres son autocontenidos: solo referencian librerías por CDN, por lo que
> moverlos a `legacy/` no rompe nada. No cargan `css/styles.css` ni `js/*`.

## Estructura común de las versiones antiguas

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Smart Home Dashboard · Exportable a Excel</title>
  <!-- opcional: ExcelJS por CDN -->
</head>
<body>
  ...interfaz estática con los mismos bloques
  <script>
    TODO el código: estado, render, simulación y exportación
  </script>
</body>
</html>
```

## ¿Por qué se separó el HTML único?

| Antes (`legacy/*.html`) | Ahora (`index.html`) |
|---|---|
| Datos, lógica y UI en un solo fichero de ~50 KB. | Datos en `js/zonas.js`, lógica en `js/app.js`, UI en HTML y estilo en `css/styles.css`. |
| Difícil de mantener y de documentar por partes. | Cada responsabilidad en su fichero; documentación por archivo. |
| Una sola planta. | 3 plantas, 8 zonas y 24 equipos. |
| Sin generación ni compensación. | Solar + diésel, autoconsumo, excedente y gasóleo. |
| Exportación limitada. | CSV, `.xls` multi-hoja y `.xlsx` con gráficos incrustados. |

## Reglas del repositorio

- Trabajar **solo** sobre `index.html` y sus ficheros asociados (`css/`, `js/`).
- No editar nada dentro de `legacy/`.
- No introducir comentarios en el código fuente.
