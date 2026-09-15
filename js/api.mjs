// api.mjs
// Responsabilidad única: comunicarse con la API de Open Library
// (búsqueda de libros, portadas y descripciones de obras).

const SEARCH_URL = "https://openlibrary.org/search.json";
const WORKS_URL = "https://openlibrary.org/works";
const COVERS_URL = "https://covers.openlibrary.org/b/id";

/**
 * Busca libros en Open Library según un texto y filtros opcionales.
 * @param {string} query - Término de búsqueda (título, autor o tema).
 * @param {{subject?: string, language?: string, sort?: string, limit?: number}} options
 * @returns {Promise<Array<object>>} Lista de libros normalizados.
 */
export async function searchBooks(query, options = {}) {
  const {
    subject = "",
    language = "",
    sort = "relevance",
    limit = 24,
  } = options;

  const params = new URLSearchParams();
  let combinedQuery = query;
  const filters = [];

  if (subject !== "") {
    filters.push(`subject:${subject}`);
  }

  if (language !== "") {
    filters.push(`language:${language}`);
  }

  if (filters.length > 0) {
    combinedQuery = query !== ""
      ? `${query} ${filters.join(" ")}`
      : filters.join(" ");
  }

  params.set("q", combinedQuery);
  params.set("limit", String(limit));
  params.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,edition_count,subject",
  );

  if (sort === "new" || sort === "old" || sort === "rating") {
    params.set("sort", sort);
  }

  const url = `${SEARCH_URL}?${params.toString()}`;
  const response = await fetch(url);

  if (response.ok === false) {
    throw new Error(`Error al consultar Open Library (${response.status})`);
  }

  const data = await response.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];
  return docs.map(normalizeDoc);
}

/**
 * Convierte un documento crudo de la API en un objeto de libro con
 * campos consistentes y valores por defecto seguros.
 */
function normalizeDoc(doc) {
  const workId = typeof doc.key === "string" ? doc.key.replace("/works/", "") : "";

  return {
    workId,
    title: typeof doc.title === "string" ? doc.title : "Título desconocido",
    authors: Array.isArray(doc.author_name) ? doc.author_name : [],
    year: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
    coverId: typeof doc.cover_i === "number" ? doc.cover_i : null,
    editionCount: typeof doc.edition_count === "number" ? doc.edition_count : 0,
    subjects: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [],
  };
}

/**
 * Construye la URL de una portada a partir de su identificador.
 * @param {number|null} coverId
 * @param {"S"|"M"|"L"} size
 * @returns {string|null}
 */
export function getCoverUrl(coverId, size = "M") {
  if (coverId === null || coverId === undefined) {
    return null;
  }
  return `${COVERS_URL}/${coverId}-${size}.jpg`;
}

/**
 * Obtiene la descripción de una obra a partir de su identificador de "work".
 * @param {string} workId
 * @returns {Promise<string>}
 */
export async function getWorkDescription(workId) {
  if (typeof workId !== "string" || workId === "") {
    return "Sin descripción disponible.";
  }

  const url = `${WORKS_URL}/${workId}.json`;
  const response = await fetch(url);

  if (response.ok === false) {
    throw new Error("No se pudo obtener la descripción de la obra.");
  }

  const data = await response.json();
  const description = data.description;

  if (typeof description === "string") {
    return description;
  }

  if (description !== null && typeof description === "object" && typeof description.value === "string") {
    return description.value;
  }

  return "Sin descripción disponible.";
}