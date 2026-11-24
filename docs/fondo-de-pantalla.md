# Fondo de pantalla (wallpaper)

## Elegido: ノーコピーライトガール (No Copyright Girl)

| Campo | Dato |
| --- | --- |
| Obra | 「花粉とたたかう人たち」 ("Los que luchan contra el polen"), publicada el 24-02-2020 |
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
| Obras por encargo, obras con autoría marcada o con el aviso 「フリーイラストではありません」 | Comprobado: no lleva ese aviso |
| Fanart de terceros (por ejemplo Hatsune Miku) | Comprobado: es la chica propia de NCG |

### Pendiente

- [x] La página de la obra no lleva el aviso 「フリーイラストではありません」 y el personaje es la chica propia de NCG (lleva "NCG" en los auriculares), no un fanart.
- [ ] Guardar una captura de las condiciones de uso con fecha, por si cambian más adelante.
- [x] Archivo para el mockup: original de 2000×1200 reducido a 1600×960, en WebP calidad 80 (unos 33 KB).
- [x] Archivo de producción: `wallpaper.webp` a 2000×1200 (calidad 82, unos 47 KB) y `wallpaper-mobile.webp`, un recorte vertical de 720×1200 (unos 28 KB). Se generan con `sharp` a partir del PNG original y no se suben al repo.

### Notas de uso

- El fondo de la ilustración es gris claro (#eceeee), que se usa también como color de reserva.
- La chica está en la mitad derecha. En escritorio la imagen se alinea a la izquierda (`left center / cover`) y la ventana de bienvenida va junto a los iconos, para que no la tape. En móvil se usa el recorte vertical, centrado en el 68,5 % del ancho (x ≈ 1370 px del original), para que entren la cara, los auriculares y la mochila. El 78 % que se estimó antes cortaba la cara.
- Las pistolas de rayos llevan escritas marcas reales de antialérgicos (Allegra y Claritin). Es parte del chiste de la ilustración y no afecta al uso, pero mejor no recortar ese detalle para usarlo como logo o imagen destacada.

## Descartado: «Supra» de Seafh (2011)

- Publicada en Pixiv (ID de obra 23025455, ID de artista 876012). La cuenta ya no está disponible.
- Una búsqueda web de "Seafh" junto con pixiv y Twitter/X no encontró ninguna cuenta activa.
- **Se descartó por no tener licencia:** dar crédito no es un permiso, y una obra cuyo autor no se puede localizar sigue protegida por copyright. El mockup la usó solo como referencia de ambiente, y el archivo nunca se subió al repo.

## Requisitos técnicos

- La web carga `/wallpaper.webp` en escritorio y `/wallpaper-mobile.webp` por debajo de 720 px, desde `apps/web/public/`. Los archivos `wallpaper.*` y `wallpaper-mobile.*` de esa carpeta están en `.gitignore`; sin ellos se ve el color de reserva. El despliegue tendrá que añadirlos al build.
- El mockup carga el fondo desde `design/mockup/assets/wallpaper.webp`, que también está en `.gitignore`.
- El personaje debería quedar en la zona izquierda o central, para que no lo tape la ventana de bienvenida, que va a la derecha.
- Los textos blancos de los iconos del escritorio tienen que leerse encima; si no, se añade un velo oscuro.
