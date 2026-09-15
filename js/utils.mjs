/**
 * Convierte una lista de autores en una cadena legible.
 * @param {Array<string>} authors
 * @returns {string}
 */
export function formatAuthors(authors) {
  if (Array.isArray(authors) === false || authors.length === 0) {
    return "Autor desconocido";
  }
  return authors.join(", ");
}

/**
 * Recorta un texto largo añadiendo puntos suspensivos.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 480) {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}…`;
}

let idCounter = 0;

/**
 * Genera identificadores únicos incrementales para asociar
 * botones con paneles mediante aria-controls.
 * @param {string} prefix
 * @returns {string}
 */
export function nextId(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
