// Responsabilidad: comunicarse con el backend Express mediante fetch

// URL base del backend, definida en un solo lugar.
// Es relativa porque el mismo servidor Express entrega el frontend y la API:
// funciona igual en http://localhost:3000 y en la URL pública.
const API_URL = "/api";

// Las portadas se cargan como imágenes directamente desde Open Library
const COVERS_URL = "https://covers.openlibrary.org/b/id";

// Hace una petición GET al backend y devuelve el JSON de la respuesta.
// Si algo falla lanza un Error con un mensaje claro para mostrar al usuario.
async function getJson(path) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`);
  } catch (error) {
    console.error("Error de red:", error);
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }

  const data = await response.json();

  if (response.ok === false) {
    // El servidor explica el problema en la propiedad error
    throw new Error(data.error || `El servidor respondió con un error (${response.status}).`);
  }

  return data;
}

// Busca libros por término y preferencias. Devuelve una lista de libros.
export async function searchBooks(query, options = {}) {
  const { subject = "", language = "", sort = "relevance", limit = 24 } = options;

  const params = new URLSearchParams();
  if (query !== "") {
    params.set("q", query);
  }
  if (subject !== "") {
    params.set("subject", subject);
  }
  if (language !== "") {
    params.set("language", language);
  }
  params.set("sort", sort);
  params.set("limit", String(limit));

  const data = await getJson(`/search?${params.toString()}`);
  return Array.isArray(data.books) ? data.books : [];
}

// Obtiene la descripción de una obra a partir de su identificador.
export async function getWorkDescription(workId) {
  const data = await getJson(`/works/${encodeURIComponent(workId)}`);
  return typeof data.description === "string"
    ? data.description
    : "Sin descripción disponible.";
}

// Construye la URL de una portada (tamaño mediano) a partir de su identificador.
export function getCoverUrl(coverId) {
  if (coverId === null || coverId === undefined) {
    return null;
  }
  return `${COVERS_URL}/${coverId}-M.jpg`;
}
