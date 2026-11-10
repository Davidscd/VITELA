// Responsabilidad: leer y escribir en el almacenamiento del navegador.
//
// localStorage (permanece al cerrar el navegador):
//   vitela:theme      tema elegido, "light" o "dark"
//   vitela:favorites  lista de libros favoritos
// sessionStorage (se borra al cerrar la pestaña):
//   vitela:history    búsquedas recientes de esta visita
//
// No se guarda ningún dato sensible.

const THEME_KEY = "vitela:theme";
const FAVORITES_KEY = "vitela:favorites";
const HISTORY_KEY = "vitela:history";
const MAX_HISTORY = 8;

// Lee una lista guardada como texto JSON. Si no existe (null) o está dañada, devuelve [].
function readList(storage, key) {
  const raw = storage.getItem(key);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Guarda un valor de texto. Si el navegador no permite guardar, la página sigue funcionando.
function save(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    console.warn("No se pudo guardar en el navegador:", error);
  }
}

// --- Tema (localStorage) ---

export function getTheme() {
  // En la primera visita getItem devuelve null: se usa el tema claro
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function saveTheme(theme) {
  save(localStorage, THEME_KEY, theme);
}

// --- Favoritos (localStorage) ---

export function getFavorites() {
  return readList(localStorage, FAVORITES_KEY);
}

export function isFavorite(workId) {
  return getFavorites().some((book) => book.workId === workId);
}

export function addFavorite(book) {
  if (isFavorite(book.workId) === true) {
    return;
  }
  save(localStorage, FAVORITES_KEY, JSON.stringify([...getFavorites(), book]));
}

export function removeFavorite(workId) {
  const remaining = getFavorites().filter((book) => book.workId !== workId);
  save(localStorage, FAVORITES_KEY, JSON.stringify(remaining));
}

export function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
}

// --- Historial de búsquedas (sessionStorage) ---

export function getHistory() {
  return readList(sessionStorage, HISTORY_KEY);
}

// Agrega un término al inicio, sin duplicados y con un máximo de elementos.
export function addToHistory(term) {
  const withoutDuplicate = getHistory().filter(
    (item) => item.toLowerCase() !== term.toLowerCase(),
  );
  const history = [term, ...withoutDuplicate].slice(0, MAX_HISTORY);
  save(sessionStorage, HISTORY_KEY, JSON.stringify(history));
}

// --- Borrar todo lo que este sitio guardó ---

export function clearAllData() {
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(FAVORITES_KEY);
  sessionStorage.removeItem(HISTORY_KEY);
}
