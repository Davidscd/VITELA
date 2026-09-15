// ui.mjs
// Responsabilidad única: construir y actualizar el DOM
// (tarjetas de libros, favoritos, historial, estado y paneles
// desplegables), incluyendo los atributos ARIA dinámicos.

import { nextId } from "./utils.mjs";

/**
 * Escribe un mensaje en la región de estado (role="status", aria-live).
 * @param {HTMLElement} statusEl
 * @param {string} message
 */
export function setStatus(statusEl, message) {
  statusEl.textContent = message;
}

/**
 * Renderiza los chips de búsquedas recientes.
 * @param {HTMLElement} container
 * @param {Array<string>} history
 * @param {(term: string) => void} onSelect
 */
export function renderHistoryChips(container, history, onSelect) {
  container.innerHTML = "";

  history.forEach((term) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = term;
    chip.addEventListener("click", () => {
      onSelect(term);
    });
    container.appendChild(chip);
  });
}

/**
 * Sincroniza el <datalist> del buscador con el historial guardado.
 * @param {HTMLDataListElement} datalistEl
 * @param {Array<string>} history
 */
export function updateHistoryDatalist(datalistEl, history) {
  datalistEl.innerHTML = "";
  history.forEach((term) => {
    const option = document.createElement("option");
    option.value = term;
    datalistEl.appendChild(option);
  });
}

/**
 * Renderiza la lista de resultados de búsqueda a partir de la plantilla
 * <template id="book-card-template">.
 * @param {HTMLElement} listEl
 * @param {HTMLTemplateElement} template
 * @param {Array<object>} books
 * @param {object} handlers - Funciones y datos necesarios para cada tarjeta.
 */
export function renderResults(listEl, template, books, handlers) {
  listEl.innerHTML = "";

  if (books.length === 0) {
    listEl.appendChild(buildEmptyMessage("No se encontraron libros. Prueba con otro término."));
    return;
  }

  books.forEach((book) => {
    listEl.appendChild(buildBookCard(template, book, handlers));
  });
}

function buildEmptyMessage(text) {
  const li = document.createElement("li");
  li.className = "empty-message";
  li.textContent = text;
  return li;
}

function buildBookCard(template, book, handlers) {
  const fragment = template.content.cloneNode(true);

  const img = fragment.querySelector(".book-cover img");
  const titleEl = fragment.querySelector(".book-title");
  const authorEl = fragment.querySelector(".book-author");
  const yearEl = fragment.querySelector(".book-year");
  const favButton = fragment.querySelector(".btn-fav");
  const detailsButton = fragment.querySelector(".btn-details");
  const detailsPanel = fragment.querySelector(".book-details");
  const li = fragment.querySelector(".book-card");

  // Enlace dinámico botón <-> panel mediante un id único (aria-controls).
  const detailsId = nextId("details");
  detailsPanel.id = detailsId;
  detailsButton.setAttribute("aria-controls", detailsId);

  const coverUrl = handlers.getCoverUrl(book.coverId, "M");
  img.src = coverUrl !== null ? coverUrl : handlers.placeholderCover;
  img.alt = `Portada de ${book.title}`;

  titleEl.textContent = book.title;
  authorEl.textContent = handlers.formatAuthors(book.authors);
  yearEl.textContent = book.year !== null ? `Publicado en ${book.year}` : "Año desconocido";

  li.dataset.workId = book.workId;

  syncFavoriteButton(favButton, handlers.isFavorite(book.workId));

  return fragment;
}

/**
 * Registra un único listener delegado sobre el contenedor de resultados
 * para manejar los clics de "Favorito" y "Ver detalles" de todas las
 * tarjetas, sin importar cuántas se rendericen o vuelvan a renderizar.
 * Debe llamarse una sola vez, durante la inicialización.
 * @param {HTMLElement} listEl
 * @param {object} handlers - Debe incluir getBookById, onToggleFavorite,
 *   getWorkDescription y truncate.
 */
export function setupResultsDelegation(listEl, handlers) {
  listEl.addEventListener("click", (event) => {
    const favButton = event.target.closest(".btn-fav");
    const detailsButton = event.target.closest(".btn-details");

    if (favButton !== null) {
      const card = favButton.closest(".book-card");
      const book = handlers.getBookById(card.dataset.workId);

      if (book !== null) {
        handlers.onToggleFavorite(book);
      }
      return;
    }

    if (detailsButton !== null) {
      const card = detailsButton.closest(".book-card");
      const panel = card.querySelector(".book-details");
      const book = handlers.getBookById(card.dataset.workId);

      if (book === null) {
        return;
      }

      const isOpen = detailsButton.getAttribute("aria-expanded") === "true";
      if (isOpen === true) {
        collapseDetails(detailsButton, panel);
      } else {
        expandDetails(detailsButton, panel, book, handlers);
      }
    }
  });
}

/**
 * Actualiza el texto y los atributos ARIA del botón de favorito
 * según el nuevo estado.
 * @param {HTMLButtonElement} button
 * @param {boolean} favored
 */
export function syncFavoriteButton(button, favored) {
  button.setAttribute("aria-pressed", favored === true ? "true" : "false");
  button.textContent = favored === true ? "★ En favoritos" : "☆ Favorito";
  button.classList.toggle("is-active", favored === true);
}

async function expandDetails(button, panel, book, handlers) {
  button.setAttribute("aria-expanded", "true");
  panel.hidden = false;
  panel.textContent = "Cargando descripción…";
  button.textContent = "Ocultar detalles";

  try {
    const description = await handlers.getWorkDescription(book.workId);
    panel.textContent = handlers.truncate(description, 500);
  } catch (error) {
    panel.textContent = "No se pudo cargar la descripción. Intenta de nuevo.";
  }
}

function collapseDetails(button, panel) {
  button.setAttribute("aria-expanded", "false");
  panel.hidden = true;
  button.textContent = "Ver detalles";
}

/**
 * Renderiza la lista de favoritos y actualiza el contador.
 * @param {HTMLElement} listEl
 * @param {HTMLElement} countEl
 * @param {Array<object>} favorites
 * @param {{onRemoveFavorite: (workId: string) => void}} handlers
 */
export function renderFavorites(listEl, countEl, favorites, handlers) {
  listEl.innerHTML = "";
  countEl.textContent = String(favorites.length);

  if (favorites.length === 0) {
    listEl.appendChild(buildEmptyMessage("Aún no tienes libros favoritos."));
    return;
  }

  favorites.forEach((book) => {
    const li = document.createElement("li");
    li.className = "favorite-item";

    const title = document.createElement("span");
    title.className = "favorite-title";
    title.textContent = book.title;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-text";
    removeButton.textContent = "Quitar";
    removeButton.setAttribute("aria-label", `Quitar ${book.title} de favoritos`);
    removeButton.addEventListener("click", () => {
      handlers.onRemoveFavorite(book.workId);
    });

    li.appendChild(title);
    li.appendChild(removeButton);
    listEl.appendChild(li);
  });
}

/**
 * Alterna un panel desplegable (filtros, favoritos) y sincroniza
 * aria-expanded en el botón con el atributo hidden del panel.
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} panel
 * @returns {boolean} Nuevo estado: true si quedó expandido.
 */
export function togglePanel(button, panel) {
  const isExpanded = button.getAttribute("aria-expanded") === "true";
  const willExpand = isExpanded === false;

  button.setAttribute("aria-expanded", willExpand === true ? "true" : "false");
  panel.hidden = willExpand === false;

  return willExpand;
}
