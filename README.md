# VITELA — Recomendador de libros

Aplicación web para buscar libros, filtrarlos por tema e idioma, leer su sinopsis y guardar favoritos. Usa una arquitectura cliente-servidor: el frontend (HTML, Bootstrap y módulos de JavaScript) le pide los datos a un servidor propio hecho con Node.js y Express, y ese servidor consulta la API pública de [Open Library](https://openlibrary.org).

Proyecto del segundo corte · Dayron Fabián Sotelo Merchán · Ingeniería de Sistemas, UNISANGIL.

- **Aplicación publicada:** _pendiente: pegar aquí la URL pública_
- **Repositorio:** _pendiente: pegar aquí la URL de GitHub_

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
git clone URL-DEL-REPOSITORIO
cd vitela
npm install
```

Copia `.env.example` con el nombre `.env` y luego inicia el servidor:

```bash
npm start
```

Abre <http://localhost:3000>. El mismo servidor entrega la página y la API, así que no hace falta Live Server.

## Estructura

```text
vitela/
├── server.js            Servidor Express: middleware, rutas de la API y archivos estáticos
├── package.json         Dependencias (express, cors, dotenv) y script de inicio
├── .env.example         Plantilla de las variables de entorno
├── .gitignore           Excluye node_modules/ y .env
└── public/              Frontend que entrega Express
    ├── index.html       Vistas: buscador, preferencias, resultados y favoritos
    ├── css/
    │   ├── styles.css       Estilos propios (fuente legible)
    │   └── styles.min.css   Versión minificada, la que carga la página
    └── js/
        ├── app.mjs      Escucha los eventos y coordina los demás módulos
        ├── api.mjs      Peticiones al backend con fetch y async/await
        ├── ui.mjs       Crea y actualiza el DOM
        ├── storage.mjs  localStorage y sessionStorage
        └── utils.mjs    Funciones de apoyo
```

## Rutas del servidor

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/health` | `200 { status, timestamp }` |
| GET | `/api/search?q&subject&language&sort&limit` | `200 { books: [...] }`, `400 { error }` si los datos no son válidos, `500 { error }` |
| GET | `/api/works/:workId` | `200 { workId, description }`, `400` si el identificador no es válido, `404` si la obra no existe |
| GET | `/api/...` (cualquier otra) | `404 { error }` |

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `PORT` | Puerto del servidor. En local es 3000; el hosting define el suyo. |
| `ALLOWED_ORIGINS` | Orígenes que CORS acepta, separados por coma. |

El archivo `.env` no se sube al repositorio. En el hosting las variables se escriben en su panel.

## Qué se guarda en el navegador

| Dónde | Clave | Contenido | Por qué ahí |
| --- | --- | --- | --- |
| localStorage | `vitela:theme` | `light` o `dark` | Es una preferencia: debe seguir en la próxima visita. |
| localStorage | `vitela:favorites` | Lista de libros favoritos | La persona espera encontrarlos al volver. |
| sessionStorage | `vitela:history` | Últimas 8 búsquedas | Solo sirven durante la visita actual. |

No se guarda ningún dato sensible. El pie de página informa qué se guarda y el botón **Borrar mis datos** lo elimina todo.

## Seguridad

- Los datos que llegan de fuera se escriben en la página con `textContent` y `createElement`, no con `innerHTML`, para prevenir XSS.
- El servidor valida todo lo que recibe (texto, tema, idioma, orden, límite e identificador) y responde `400` si algo no es válido.
- CORS acepta solo los orígenes de `ALLOWED_ORIGINS`.
- No hay claves en el código; la configuración vive en variables de entorno.

## Optimización

- `loading="lazy"` en las portadas: solo se descargan las que se van a ver.
- CSS minificado (`styles.min.css`). Si cambias `styles.css`, vuelve a generarlo con `npx clean-css-cli -o public/css/styles.min.css public/css/styles.css`.
- Solo se carga el CSS de Bootstrap; su JavaScript no se incluye porque la página no usa menús ni modales.

### Informe de Lighthouse

_Pendiente: ejecutar Lighthouse sobre la URL publicada y escribir aquí los cuatro puntajes y su análisis._

## Despliegue

Un solo servicio web (opción B): Express entrega el frontend con `express.static("public")` y también la API, así que ambos comparten origen y `fetch` usa la ruta relativa `/api`.

- Build Command: `npm install`
- Start Command: `node server.js`
- Variable de entorno: `ALLOWED_ORIGINS` con la URL pública de la aplicación

## Créditos

Datos de libros y portadas: [Open Library](https://openlibrary.org).
