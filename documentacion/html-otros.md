# Otros archivos HTML del proyecto (legado)

Estos tres ficheros **no forman parte de la aplicación activa**: son versiones
anteriores con la lógica embebida en un `<script>` dentro del propio HTML. Se
conservan como referencia y **no deben modificarse**. La aplicación vigente es
[`domotica2.html`](html-domotica2.md).

| Archivo | Título | Diferencias frente a `domotica2.html` |
|---|---|---|
| `domotica.html` | Smart Home Dashboard · Exportable a Excel | Versión más antigua: sin `js/zonas.js` ni `js/app.js`; todo el estado, el plano y la simulación están en un `<script>` inline. Sin cubierta ni generación. |
| `domotica1.html` | Smart Home Dashboard · Exportable a Excel | Evolución de la anterior: ya carga ExcelJS por CDN, pero sigue con la lógica inline en un único bloque `<script>`. |
| `prueba.html` | Smart Home Dashboard · Electrodomésticos + 24h | Prueba de concepto centrada en el reparto por electrodomésticos y la curva de 24 h; sin estructura de plantas. |

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
    // TODO el código: estado, render, simulación y exportación
  </script>
</body>
</html>
```

## ¿Por qué se separó `domotica2.html`?

| Antes (HTML único) | Ahora (`domotica2.html`) |
|---|---|
| Datos, lógica y UI en un solo fichero de ~50 KB. | Datos en `js/zonas.js`, lógica en `js/app.js`, UI en HTML y estilo en `css/styles.css`. |
| Difícil de mantener y de documentar por partes. | Cada responsabilidad en su fichero; documentación por archivo. |
| Una sola planta. | 3 plantas, 8 zonas y 24 equipos. |
| Sin generación ni compensación. | Solar + diésel, autoconsumo, excedente y gasóleo. |
| Exportación limitada. | CSV, `.xls` multi-hoja y `.xlsx` con gráficos incrustados. |

## Reglas del repositorio

- Trabajar **solo** sobre `domotica2.html` y sus ficheros asociados.
- No editar `domotica.html`, `domotica1.html` ni `prueba.html`.
- No introducir comentarios en el código fuente.
