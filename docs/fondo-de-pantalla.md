# Fondo de pantalla (wallpaper)

## Elegido: ノーコピーライトガール (No Copyright Girl)

| Campo | Dato |
| --- | --- |
| Obra | Ilustración `kahunntotatakau` |
| Artista | 春 (Haru) / ノーコピーライトガール |
| Página de la obra | https://fromtheasia.com/illustration/kahunntotatakau |
| Condiciones de uso | https://fromtheasia.com/usagerules |
| Contacto del proyecto | El correo que figura en la página de condiciones |
| Crédito en el sitio | `Ilustración / ノーコピーライトガール` (ES) e `Illustration / No Copyright Girl` (EN) |

Las condiciones se copiaron de la página de reglas de uso el 24 de noviembre de 2026; el repo no pudo leer la web directamente.

### Qué permiten las condiciones

- **Uso comercial y personal gratuito**, siempre dentro de las reglas: 商用、個人利用問わず無料でお使いいただけます。
- **Crédito:** se pide poner 「ノーコピーライトガール」 en sitios web y vídeos, donde se quiera. Ejemplo oficial: `イラスト/ノーコピーライトガール`. Si no es posible, se puede omitir, pero aquí sí se pondrá.
- **Modificar la imagen** (recortar, redimensionar, convertir a WebP, oscurecerla) está permitido, siempre que no dañe gravemente la imagen de la ilustración.

### Qué prohíben y cómo nos afecta

| Prohibición | Consecuencia para YaldaTools |
| --- | --- |
| Redistribuir o vender la ilustración, aunque esté modificada | El archivo **no se sube a este repo público**: se descarga de la fuente al desplegar o se guarda fuera de git. En el sitio se usa como fondo, que sí es uso permitido |
| Usarla para entrenar o alimentar IA (享受目的のAI学習・使用) | No se usa como imagen de ejemplo ni de prueba en el quitafondos ni en ningún modelo |
| Decir que es obra propia (自作発言) | Crédito visible en el escritorio y en "Léeme.txt / Acerca de" |
| Contenido sexual, spam o contrario a la moral | No aplica |
| Obras por encargo, obras con autoría marcada o con el aviso 「フリーイラストではありません」 | **Comprobar** que la página de esta ilustración no lleva ese aviso |
| Fanart de terceros (por ejemplo Hatsune Miku) | Comprobar que la ilustración es un personaje original |

### Pendiente

- [ ] Confirmar en la página de la obra que no tiene el aviso 「フリーイラストではありません」 y que es un personaje original.
- [ ] Guardar una captura de las condiciones de uso con fecha, por si cambian más adelante.
- [ ] Preparar el archivo: al menos 1920×1080 en WebP o AVIF de menos de 150 KB, más un recorte vertical para móvil.

## Descartado: «Supra» de Seafh (2011)

- Publicada en Pixiv (ID de obra 23025455, ID de artista 876012). La cuenta ya no está disponible.
- Una búsqueda web de "Seafh" junto con pixiv y Twitter/X no encontró ninguna cuenta activa.
- **Se descartó por no tener licencia:** dar crédito no es un permiso, y una obra cuyo autor no se puede localizar sigue protegida por copyright. El mockup la usó solo como referencia de ambiente, y el archivo nunca se subió al repo.

## Requisitos técnicos

- El mockup carga el fondo desde `design/mockup/assets/wallpaper.webp`, que está en `.gitignore`. Si no existe, se ve un color de reserva.
- El personaje debería quedar en la zona izquierda o central, para que no lo tape la ventana de bienvenida, que va a la derecha.
- Los textos blancos de los iconos del escritorio tienen que leerse encima; si no, se añade un velo oscuro.
