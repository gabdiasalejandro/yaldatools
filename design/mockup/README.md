# Mockup de YaldaTools

Fuentes del mockup hecho en el lienzo de diseño de Claude. Cada `.dc.html` es una pantalla y `canvas.json` es el índice con la posición de cada una.

| Archivo | Pantalla |
| --- | --- |
| `Main.dc.html` | Inicio: escritorio con iconos de programas, wallpaper y ventana de bienvenida |
| `QR.dc.html` | Herramienta Código QR (interactiva: pestañas y colores) |
| `BgRemover.dc.html` | Herramienta Quitar fondo, con panel de diagnóstico de dificultad |
| `Mobile.dc.html` | Portada en móvil, en inglés |
| `StyleGuide.dc.html` | Colores, tipografía, controles y huecos de GIF de la mascota |

## Cómo verlo

Estos archivos usan el formato de componentes del lienzo de Claude (plantillas `{{ }}`, `<sc-for>`, `<sc-if>` y un runtime `support.js`), así que no se abren tal cual en el navegador. Sirven como referencia de diseño para implementar el sitio en Astro. La versión navegable está en el lienzo de Claude del propietario del repo.

## Recursos

- **Fuentes:** Pixelify Sans y VT323 de Google Fonts; la interfaz usa Tahoma o Verdana del sistema.
- **Iconos:** pixel art propio dibujado en SVG dentro de `Main.dc.html`.
- **Wallpaper:** se carga desde `assets/wallpaper.webp`, que **no se incluye** porque no tiene licencia. Ver [`docs/fondo-de-pantalla.md`](../../docs/fondo-de-pantalla.md).
- **GIFs de la mascota:** de momento son huecos marcados con rayas rosas. Ver la sección de GIFs en [`docs/especificaciones.md`](../../docs/especificaciones.md).
