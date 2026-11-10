// Responsabilidad: escuchar los eventos del usuario y coordinar los módulos
// de API (api.mjs), almacenamiento (storage.mjs) e interfaz (ui.mjs).

import { searchBooks, getCoverUrl, getWorkDescription } from "./api.mjs";

import {
  getTheme,
  saveTheme,
  getFavorites,
  addFavorite,
  removeFavorite,
  clearFavorites,
  isFavorite,
  getHistory,
  addToHistory,
  clearAllData,
} from "./storage.mjs";

import {
  setStatus,
  renderResults,
  clearResults,
  renderFavorites,
  renderHistoryChips,
  updateHistoryDatalist,
  togglePanel,
  setupResultsDelegation,
} from "./ui.mjs";

const WELCOME_MESSAGE = "Escribe un título, autor o tema para comenzar.";

// Portada de reemplazo para los libros que no tienen imagen
const PLACEHOLDER_COVER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">' +
      '<rect width="200" height="300" fill="#f2ecd9"/>' +
      '<text x="100" y="155" font-family="serif" font-size="16" fill="#7c4128" text-anchor="middle">Sin portada</text>' +
      "</svg>",
  );

// --- Referencias al DOM ---

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const filtersToggle = document.querySelector("#filters-toggle");
const filtersPanel = document.querySelector("#filters-panel");
const subjectSelect = document.querySelector("#filter-subject");
const languageSelect = document.querySelector("#filter-language");
const sortSelect = document.querySelector("#filter-sort");
const historyChips = document.querySelector("#history-chips");
const historyList = document.querySelector("#history-list");
const statusEl = document.querySelector("#status");
const resultsList = document.querySelector("#results-list");
const cardTemplate = document.querySelector("#book-card-template");
const favoritesToggle = document.querySelector("#favorites-toggle");
const favoritesPanel = document.querySelector("#favorites-panel");
const favoritesCount = document.querySelector("#favorites-count");
const clearFavoritesBtn = document.querySelector("#clear-favorites");
const clearDataBtn = document.querySelector("#clear-data");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeText = document.querySelector("#theme-text");

// --- Estado ---

// Libros de la última búsqueda
let lastResults = [];

// Datos y funciones que ui.mjs necesita para dibujar y atender las tarjetas
const cardHandlers = {
  getCoverUrl,
  getWorkDescription,
  placeholderCover: PLACEHOLDER_COVER,
  isFavorite,
  onToggleFavorite: handleToggleFavorite,
  getBookById: (workId) => lastResults.find((book) => book.workId === workId) ?? null,
};

// --- Favoritos e historial ---

function refreshFavorites() {
  renderFavorites(favoritesPanel, favoritesCount, getFavorites());
}

function refreshHistory() {
  const history = getHistory();
  renderHistoryChips(historyChips, history);
  updateHistoryDatalist(historyList, history);
}

// Vuelve a dibujar las tarjetas para que el botón de favorito muestre su estado real
function refreshResults() {
  if (lastResults.length > 0) {
    renderResults(resultsList, cardTemplate, lastResults, cardHandlers);
  }
}

function handleToggleFavorite(book) {
  if (isFavorite(book.workId) === true) {
    removeFavorite(book.workId);
    setStatus(statusEl, `Se quitó "${book.title}" de tus favoritos.`, "success");
  } else {
    addFavorite(book);
    setStatus(statusEl, `Se guardó "${book.title}" en tus favoritos.`, "success");
  }

  refreshFavorites();
  refreshResults();
}

// --- Búsqueda ---

async function runSearch() {
  const query = input.value.trim();
  const subject = subjectSelect.value;
  const language = languageSelect.value;
  const sort = sortSelect.value;

  // Sin término ni preferencias no se consulta al servidor
  if (query === "" && subject === "" && language === "") {
    lastResults = [];
    clearResults(resultsList);
    setStatus(
      statusEl,
      "Escribe el nombre de un libro o autor, o elige un tema en Preferencias.",
      "warning",
    );
    return;
  }

  // Estado de carga: mensaje, botón desactivado y aria-busy
  setStatus(statusEl, "Buscando recomendaciones…");
  searchButton.disabled = true;
  resultsList.setAttribute("aria-busy", "true");

  try {
    lastResults = await searchBooks(query, { subject, language, sort });
    renderResults(resultsList, cardTemplate, lastResults, cardHandlers);

    if (lastResults.length === 0) {
      setStatus(statusEl, "No encontramos libros. Prueba con otro término o preferencia.", "warning");
    } else {
      setStatus(statusEl, `${lastResults.length} libro(s) recomendado(s).`);
    }

    if (query !== "") {
      addToHistory(query);
      refreshHistory();
    }
  } catch (error) {
    console.error("Error al buscar libros:", error);
    lastResults = [];
    clearResults(resultsList);
    setStatus(statusEl, error.message, "danger");
  } finally {
    searchButton.disabled = false;
    resultsList.setAttribute("aria-busy", "false");
  }
}

// --- Tema claro / oscuro (data-bs-theme de Bootstrap) ---

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.dataset.bsTheme = theme;
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeText.textContent = isDark ? "Modo claro" : "Modo oscuro";
  themeToggle.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
}

// --- Eventos ---

// Buscar con el botón o con Enter
form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

// Al cambiar una preferencia se actualiza la búsqueda
[subjectSelect, languageSelect, sortSelect].forEach((select) => {
  select.addEventListener("change", runSearch);
});

filtersToggle.addEventListener("click", () => {
  togglePanel(filtersToggle, filtersPanel);
});

favoritesToggle.addEventListener("click", () => {
  togglePanel(favoritesToggle, favoritesPanel);
});

// Delegación: un solo listener para todos los botones de búsquedas recientes
historyChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (chip === null) {
    return;
  }
  input.value = chip.textContent;
  runSearch();
});

// Delegación: un solo listener para todos los botones "Quitar" de favoritos
favoritesPanel.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".btn-remove");
  if (removeButton === null) {
    return;
  }
  const item = removeButton.closest(".favorite-item");
  removeFavorite(item.dataset.workId);
  refreshFavorites();
  refreshResults();
  setStatus(statusEl, "Se quitó el libro de tus favoritos.", "success");
});

clearFavoritesBtn.addEventListener("click", () => {
  clearFavorites();
  refreshFavorites();
  refreshResults();
  setStatus(statusEl, "Se vació la lista de favoritos.", "success");
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  saveTheme(nextTheme);
});

// Borra todo lo que el sitio guardó en este navegador
clearDataBtn.addEventListener("click", () => {
  clearAllData();
  applyTheme(getTheme());
  refreshFavorites();
  refreshHistory();
  refreshResults();
  setStatus(statusEl, "Se borraron tus favoritos, tus búsquedas recientes y el tema guardado.", "success");
});

// --- Inicialización ---

applyTheme(getTheme());
setupResultsDelegation(resultsList, cardHandlers);
refreshFavorites();
refreshHistory();
setStatus(statusEl, WELCOME_MESSAGE);
