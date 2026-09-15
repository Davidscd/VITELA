// app.mjs
// Punto de entrada del proyecto.
// Conecta la API, el almacenamiento y la interfaz
// mediante eventos del usuario.

import {
  searchBooks,
  getCoverUrl,
  getWorkDescription,
} from "./api.mjs";

import {
  getFavorites,
  addFavorite,
  removeFavorite,
  clearFavorites,
  isFavorite,
  getHistory,
  addToHistory,
} from "./storage.mjs";

import {
  formatAuthors,
  truncate,
} from "./utils.mjs";

import {
  setStatus,
  renderResults,
  renderFavorites,
  renderHistoryChips,
  updateHistoryDatalist,
  togglePanel,
  setupResultsDelegation,
} from "./ui.mjs";

// Portada de reemplazo para libros que no tienen imagen.
const PLACEHOLDER_COVER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">' +
      '<rect width="200" height="300" fill="#f2ecd9"/>' +
      '<text x="100" y="155" font-family="serif" font-size="16" fill="#7c4128" text-anchor="middle">Sin portada</text>' +
      "</svg>",
  );

// --- Referencias al DOM -----------------------------------------------

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
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

// --- Estado de la búsqueda --------------------------------------------

let lastResults = [];

// --- Acciones de las tarjetas -----------------------------------------

const cardHandlers = {
  getCoverUrl,
  getWorkDescription,
  formatAuthors,
  truncate,
  placeholderCover: PLACEHOLDER_COVER,
  isFavorite: (workId) => isFavorite(workId),
  onToggleFavorite: handleToggleFavorite,
  getBookById: (workId) => lastResults.find((book) => book.workId === workId) || null,
};

// Agrega o elimina un libro de favoritos.
function handleToggleFavorite(book) {
  if (isFavorite(book.workId) === true) {
    removeFavorite(book.workId);
  } else {
    addFavorite(book);
  }

  refreshFavorites();

  renderResults(
    resultsList,
    cardTemplate,
    lastResults,
    cardHandlers,
  );
}

// Actualiza la lista de favoritos.
function refreshFavorites() {
  const favorites = getFavorites();

  renderFavorites(
    favoritesPanel,
    favoritesCount,
    favorites,
    {
      onRemoveFavorite: (workId) => {
        removeFavorite(workId);
        refreshFavorites();

        renderResults(
          resultsList,
          cardTemplate,
          lastResults,
          cardHandlers,
        );
      },
    },
  );
}

// Actualiza el historial de búsquedas.
function refreshHistory() {
  const history = getHistory();

  renderHistoryChips(
    historyChips,
    history,
    (term) => {
      input.value = term;
      runSearch(term);
    },
  );

  updateHistoryDatalist(historyList, history);
}

// Realiza la búsqueda de libros.
async function runSearch(term) {
  const query = term.trim();

  if (query === "" && subjectSelect.value === "") {
    setStatus(
      statusEl,
      "Escribe algo o elige un tema para recomendarte libros.",
    );
    return;
  }

  const message =
    query !== ""
      ? `Buscando "${query}"…`
      : "Buscando libros según tu tema…";

  setStatus(statusEl, message);
  resultsList.setAttribute("aria-busy", "true");

  try {
    const books = await searchBooks(query, {
      subject: subjectSelect.value,
      language: languageSelect.value,
      sort: sortSelect.value,
    });

    lastResults = books;

    renderResults(
      resultsList,
      cardTemplate,
      books,
      cardHandlers,
    );

    const count = books.length;
    const searchLabel =
      query !== "" ? `"${query}"` : "tu preferencia";

    setStatus(
      statusEl,
      count === 0
        ? `No encontramos libros para ${searchLabel}.`
        : `${count} libro(s) recomendado(s) para ${searchLabel}.`,
    );

    if (query !== "") {
      addToHistory(query);
      refreshHistory();
    }
  } catch (error) {
    lastResults = [];

    renderResults(
      resultsList,
      cardTemplate,
      [],
      cardHandlers,
    );

    setStatus(
      statusEl,
      "Ocurrió un error al buscar. Intenta de nuevo.",
    );
  } finally {
    resultsList.setAttribute("aria-busy", "false");
  }
}

// --- Eventos principales ----------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(input.value);
});

filtersToggle.addEventListener("click", () => {
  togglePanel(filtersToggle, filtersPanel);
});

favoritesToggle.addEventListener("click", () => {
  togglePanel(favoritesToggle, favoritesPanel);
});

// Cuando cambia un filtro, se repite la búsqueda.
[subjectSelect, languageSelect, sortSelect].forEach((select) => {
  select.addEventListener("change", () => {
    if (input.value.trim() !== "") {
      runSearch(input.value);
    }
  });
});

// Permite cerrar los paneles con la tecla Escape.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (
    filtersPanel.hidden === false &&
    filtersPanel.contains(document.activeElement) === true
  ) {
    togglePanel(filtersToggle, filtersPanel);
    filtersToggle.focus();
    return;
  }

  if (
    favoritesPanel.hidden === false &&
    favoritesPanel.contains(document.activeElement) === true
  ) {
    togglePanel(favoritesToggle, favoritesPanel);
    favoritesToggle.focus();
  }
});

// Vacía los favoritos.
clearFavoritesBtn.addEventListener("click", () => {
  clearFavorites();
  refreshFavorites();

  renderResults(
    resultsList,
    cardTemplate,
    lastResults,
    cardHandlers,
  );

  setStatus(
    statusEl,
    "Se vació la lista de favoritos.",
  );
});

// --- Inicialización ---------------------------------------------------

setupResultsDelegation(resultsList, cardHandlers);

refreshFavorites();
refreshHistory();

setStatus(
  statusEl,
  "Escribe un título, autor o tema para comenzar.",
);
