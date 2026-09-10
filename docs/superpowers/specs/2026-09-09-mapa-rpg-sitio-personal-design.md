# Sitio personal como mapa RPG — diseño

**Fecha:** 2026-09-09
**Estado:** aprobado en conversación, pendiente de plan de implementación

## 1. Objetivo

Un sitio personal liviano y muy visual que funciona como *hub* hacia el
portfolio, el currículum y el blog (`myxomatosis.xyz`). La portada es un mapa
estilo RPG 16-bit con tres zonas que se iluminan al pasar el mouse; al
seleccionar una, la cámara hace zoom y la vista pasa a dos columnas: el
fragmento del mapa a la izquierda, el contenido de esa zona a la derecha.

Criterios de éxito:

- Primer render del mapa en menos de 1 s sobre 4G. JS total < 200 KB gzip.
- Se ve claramente como pixel art 16-bit, con animación sutil.
- Cada zona tiene URL propia, indexable, y funciona con teclado y lector de pantalla.
- El contenido se mantiene editando JSON, sin tocar código.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dominio | Subdominio propio (p. ej. `yo.myxomatosis.xyz`), separado del blog Hugo |
| Hosting | GitHub Pages, repo nuevo, deploy por GitHub Actions |
| Renderer | PixiJS v8 con imports selectivos, Vite + TypeScript, sin framework de UI |
| Arte | Híbrido: terreno procedural con `Graphics` en un lienzo low-res escalado con nearest-neighbor, más 3-5 sprites PNG para los landmarks |
| Gamificación | Mapa interactivo sin personaje: hover ilumina, click hace zoom. Sin controles de movimiento ni progresión |
| Zonas v1 | Portfolio, Currículum, Blog |
| Navegación | URL propia por zona + transición sin recarga (History API) |
| Contenido | JSON estático en el repo, validado en build. Últimos posts del blog leídos del RSS en build time |
| Panel de contenido | HTML común posicionado con CSS, no `DOMContainer` (experimental en v8) |

## 3. Estructura del repo

```
mapa/
  index.html                 shell; Vite genera además /portfolio/, /cv/, /blog/
  src/
    main.ts                  arranque, resize, ruteo, loop
    map/
      canvas.ts              RenderTexture 480x270, sprite escalado nearest
      terrain.ts             pintores: agua, costa, pasto, bosque, montaña, camino
      zones.ts               definición de zonas: id, polígono, landmark, cartel
      landmarks.ts           carga de sprites PNG y animación por frames
      seed.ts                PRNG determinístico
    camera.ts                tween de position/scale del contenedor raíz
    router.ts                pushState/popstate, mapea URL <-> zona
    views/
      map-view.ts            estado pantalla completa
      zone-view.ts           estado dos columnas, monta contenido
      render-content.ts      JSON -> HTML de secciones e items
    a11y.ts                  accesibilidad de zonas, reduced-motion
  content/
    portfolio.json  cv.json  blog.json
    schema.json              JSON Schema compartido
  scripts/
    validate-content.mjs     valida content/*.json contra el schema
    fetch-blog-feed.mjs      lee el RSS de myxomatosis.xyz y genera content/blog.generated.json
    prerender.mjs            genera el HTML estático de cada ruta con el contenido
  public/
    sprites/                 PNGs de landmarks (32x32 o 48x48, 2-3 frames c/u)
    font/                    fuente bitmap pixel art (PNG + fnt), ~5 KB
    CNAME
  .github/workflows/deploy.yml
```

## 4. El mapa

### Lienzo

Un `RenderTexture` de 480x270 donde el terreno se pinta **una sola vez** al
cargar. Se muestra como `Sprite` con `scaleMode: 'nearest'` escalado hasta
cubrir el viewport (modo *cover*). A 4x da 1920x1080 con píxel marcado. Todo lo
que se dibuja en coordenadas del lienzo usa enteros.

### Terreno (procedural, determinístico)

Generación con seed fija en `seed.ts`, así el mapa es idéntico en cada carga.
Capas, de abajo hacia arriba:

1. **Agua**: relleno base más franja de costa con 2 frames alternados cada
   300 ms (única capa que se redibuja; se pinta a un `RenderTexture` propio).
2. **Tierra**: isla o continente central con borde de arena de 1-2 px.
3. **Pasto**: variación de tono en manchas.
4. **Bosque**: círculos apilados en 2 tonos con sombra a la derecha-abajo.
5. **Montañas**: triángulos con cara iluminada y cara en sombra, nieve en la punta.
6. **Caminos**: línea punteada de 1 px conectando los tres landmarks.

Paleta fija de ~16 colores estilo SNES, definida en un solo lugar.

### Zonas

| id | Nombre | Landmark | Idea |
|---|---|---|---|
| `portfolio` | Portfolio | Castillo-taller | Donde se construyen las cosas |
| `cv` | Currículum | Torre de archivo | Registro de lo hecho |
| `blog` | Blog | Puerto con barco | De ahí se "sale" del mapa a myxomatosis.xyz |

Cada zona: polígono en coordenadas del lienzo, posición del landmark, cartel
con el nombre en fuente bitmap. Cada zona es un `Container` propio que agrupa
su terreno, su landmark y su cartel, para poder aplicarle `tint` y filtros por
separado.

### Landmarks

Sprites PNG de 32x32 o 48x48 con 2-3 frames de animación sutil (bandera,
humo, luz). Se animan a 8 fps con `AnimatedSprite` solo mientras la zona está
en hover/foco o activa; en reposo quedan en el frame 0.

## 5. Interacción

### Estados de zona

| Estado | Visual |
|---|---|
| Reposo | `tint` al ~70% de brillo, landmark en frame 0, cartel visible |
| Hover / foco teclado | `tint` a 100% en ~150 ms; glow detrás del landmark (sprite radial, blend `add`, pulso lento); landmark animado |
| Activa | Cámara a ~2.5x centrada en el landmark; resto de zonas al 40% |

Eventos: `eventMode: 'static'`, `hitArea` con el polígono de la zona,
`cursor: 'pointer'`. Accesibilidad con el `AccessibilitySystem` de Pixi:
`accessible: true`, `accessibleTitle`, `accessibleHint`, `tabIndex` en orden
portfolio, cv, blog. Enter/Espacio activan.

### Cámara

`camera.ts` interpola `position` y `scale` de un `Container` raíz con un tween
propio (ease-out cúbico, 500 ms), sin librería. Expone `focus(zone)` y
`reset()`, ambos devuelven una promesa que resuelve al terminar. Con
`prefers-reduced-motion: reduce` la duración es 0.

### Vistas

**Vista mapa** (`/`): canvas a pantalla completa.

**Vista zona** (`/portfolio/`, `/cv/`, `/blog/`): grilla de dos columnas.

- Izquierda (~40%): el mismo canvas encogido, cámara sobre la zona, título de
  la zona como cartel pixel art, link "Volver al mapa".
- Derecha (~60%): contenido HTML con scroll propio.
- Móvil (< 768 px): columnas apiladas, mapa arriba con alto fijo (~40vh),
  contenido abajo.

El canvas usa `resizeTo` sobre su contenedor DOM, así sigue al layout.

### Transición mapa → zona

1. Click/Enter en zona → `history.pushState` a la URL de la zona.
2. En paralelo, 500 ms: tween de cámara y transición CSS del contenedor del
   canvas hacia la columna izquierda.
3. Al terminar, la columna derecha hace fade-in (200 ms) con el contenido.

"Volver al mapa", Esc y el botón atrás del browser (`popstate`) hacen el
camino inverso.

### Carga directa de una URL de zona

El HTML prerenderizado ya trae la grilla y el contenido de la derecha. El
canvas arranca en la columna izquierda con la cámara ya en la zona, sin
animación. Si el JS falla, el contenido queda legible igual.

### Móvil

Mapa en modo *cover*; si queda recortado se puede arrastrar con un dedo. Sin
pinch-zoom. Tap equivale a click.

## 6. Contenido

Un archivo por zona en `content/`, esquema común:

```json
{
  "id": "portfolio",
  "titulo": "Portfolio",
  "descripcion": "Una línea opcional bajo el título",
  "secciones": [
    {
      "subtitulo": "Juegos",
      "items": [
        {
          "titulo": "politik_tcg",
          "descripcion": "Qué es, en una o dos líneas",
          "links": [{ "label": "Repo", "url": "https://..." }]
        }
      ]
    }
  ]
}
```

Extras por zona:

- `cv.json` admite `"pdf": "/cv.pdf"` a nivel raíz → botón de descarga.
- `blog.json` tiene las secciones fijas escritas a mano. En build,
  `fetch-blog-feed.mjs` lee el RSS de `myxomatosis.xyz` y genera una sección
  "Últimos posts" (los 5 más recientes). Si el feed falla, el build sigue sin
  esa sección y avisa en el log.

`validate-content.mjs` corre antes de `vite build` y falla el build si algún
JSON no cumple el schema.

`render-content.ts` convierte el JSON a HTML semántico: `<h1>` título de zona,
`<section>` por sección con `<h2>`, `<article>` por item con `<h3>`, `<p>` y
lista de links. El mismo módulo lo usan el prerender (Node) y el cliente
(cuando se navega sin recarga).

## 7. Performance

| Recurso | Presupuesto |
|---|---|
| JS total | < 200 KB gzip (Pixi selectivo ~130-150) |
| Sprites | < 30 KB en total |
| Fuente bitmap | ~5 KB |
| Web fonts | ninguna; el contenido usa fuentes del sistema |
| Primer render del mapa | < 1 s en 4G |

El loop de Pixi está casi ocioso: el terreno es una textura estática y solo se
animan la costa y los landmarks activos. `ticker.maxFPS = 30` alcanza. Se
pausa el ticker con `visibilitychange` cuando la pestaña no está visible.

## 8. Deploy

- GitHub Actions en push a `main`: `npm ci`, `npm run build` (validate →
  fetch-feed → vite build → prerender), publica `dist/` a Pages.
- `public/CNAME` con el subdominio. El registro CNAME en GoDaddy lo agrega
  Nicolás a mano apuntando a `nicolas-ricc.github.io`.

## 9. Testing

- **Unit (Vitest):** `seed.ts` determinístico; `camera.ts` llega al destino y
  respeta reduced-motion; `router.ts` mapea URL ↔ zona en ambos sentidos;
  `render-content.ts` produce el HTML esperado desde un JSON de ejemplo;
  `validate-content` rechaza JSON inválido.
- **Build:** el prerender genera los cuatro HTML y cada uno contiene el título
  de su zona.
- **Manual:** checklist visual en desktop y móvil, navegación con teclado,
  lector de pantalla recorre las tres zonas, Lighthouse con performance > 95.

## 10. Fuera de alcance (v1)

- Personaje que camina, progresión, zonas bloqueadas.
- Zona de contacto/redes (posible v2, entra como cuarta zona sin cambiar la arquitectura).
- Editor visual del mapa; el terreno se ajusta en código.
- i18n: todo en español.
