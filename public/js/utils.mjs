// Responsabilidad: funciones pequeñas de apoyo, sin acceso al DOM

// Convierte una lista de autores en un texto legible.
export function formatAuthors(authors) {
  if (Array.isArray(authors) === false || authors.length === 0) {
    return "Autor desconocido";
  }
  return authors.join(", ");
}

// Recorta un texto largo y le agrega puntos suspensivos.
export function truncate(text, maxLength) {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}…`;
}

let idCounter = 0;

// Genera identificadores únicos para enlazar cada botón "Ver detalles"
// con su panel mediante aria-controls.
export function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
