// storage.mjs
// Responsabilidad única: leer y escribir en sessionStorage
// (favoritos e historial de búsqueda). Ningún otro módulo
// debe tocar sessionStorage directamente.

const FAVORITES_KEY = "estanteria:favorites";
const HISTORY_KEY = "estanteria:history";
const MAX_HISTORY = 8;

/**
 * Lee de forma segura una clave JSON de sessionStorage.
 * @param {string} key
 * @returns {Array<any>}
 */
function readList(key) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) === true ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeList(key, list) {
  sessionStorage.setItem(key, JSON.stringify(list));
}

/** @returns {Array<object>} Lista de libros favoritos guardados. */
export function getFavorites() {
  return readList(FAVORITES_KEY);
}

/**
 * @param {string} workId
 * @returns {boolean}
 */
export function isFavorite(workId) {
  return getFavorites().some((book) => book.workId === workId);
}

/**
 * Agrega un libro a favoritos si aún no está guardado.
 * @param {object} book
 * @returns {Array<object>} Lista actualizada de favoritos.
 */
export function addFavorite(book) {
  const favorites = getFavorites();
  const alreadySaved = favorites.some((item) => item.workId === book.workId);

  if (alreadySaved === true) {
    return favorites;
  }

  const updated = [...favorites, book];
  writeList(FAVORITES_KEY, updated);
  return updated;
}

/**
 * @param {string} workId
 * @returns {Array<object>} Lista actualizada de favoritos.
 */
export function removeFavorite(workId) {
  const updated = getFavorites().filter((book) => book.workId !== workId);
  writeList(FAVORITES_KEY, updated);
  return updated;
}

/** @returns {Array<object>} Lista vacía tras eliminar todos los favoritos. */
export function clearFavorites() {
  sessionStorage.removeItem(FAVORITES_KEY);
  return [];
}

/** @returns {Array<string>} Historial de términos buscados, más reciente primero. */
export function getHistory() {
  return readList(HISTORY_KEY);
}

/**
 * Añade un término al historial evitando duplicados y limitando su tamaño.
 * @param {string} term
 * @returns {Array<string>} Historial actualizado.
 */
export function addToHistory(term) {
  const trimmed = term.trim();
  if (trimmed === "") {
    return getHistory();
  }

  const withoutDuplicate = getHistory().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  const updated = [trimmed, ...withoutDuplicate].slice(0, MAX_HISTORY);
  writeList(HISTORY_KEY, updated);
  return updated;
}
