// Responsabilidad: construir y actualizar el DOM (tarjetas, favoritos,
// historial, mensaje de estado y paneles), incluidos los atributos ARIA.
// Todo el contenido dinámico se escribe con textContent y createElement,
// nunca con innerHTML: así un texto que venga de fuera no se ejecuta como código.

import { nextId, formatAuthors, truncate } from "./utils.mjs";

// Escribe un mensaje en la región de estado (role="status").
// type: "info" (texto normal), "success", "warning" o "danger" (alertas de Bootstrap).
export function setStatus(statusEl, message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = type === "info" ? "status" : `alert alert-${type} py-2`;
}

// Dibuja los botones de búsquedas recientes.
export function renderHistoryChips(container, history) {
  container.replaceChildren();

  history.forEach((term) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "btn btn-sm btn-secondary rounded-pill chip";
    chip.textContent = term;
    container.appendChild(chip);
  });
}

// Sincroniza las sugerencias del buscador (<datalist>) con el historial.
export function updateHistoryDatalist(datalistEl, history) {
  datalistEl.replaceChildren();

  history.forEach((term) => {
    const option = document.createElement("option");
    option.value = term;
    datalistEl.appendChild(option);
  });
}

// Deja vacía la lista de resultados.
export function clearResults(listEl) {
  listEl.replaceChildren();
}

// Dibuja los resultados a partir de la plantilla <template id="book-card-template">.
export function renderResults(listEl, template, books, handlers) {
  listEl.replaceChildren();

  if (books.length === 0) {
    listEl.appendChild(
      buildEmptyMessage("No se encontraron libros. Prueba con otro término o preferencia."),
    );
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

  const card = fragment.querySelector(".book-card");
  const img = fragment.querySelector(".book-cover img");
  const favButton = fragment.querySelector(".btn-fav");
  const detailsButton = fragment.querySelector(".btn-details");
  const detailsPanel = fragment.querySelector(".book-details");

  // El identificador del libro queda en la tarjeta para la delegación de eventos
  card.dataset.workId = book.workId;

  fragment.querySelector(".book-title").textContent = book.title;
  fragment.querySelector(".book-author").textContent = formatAuthors(book.authors);
  fragment.querySelector(".book-year").textContent =
    book.year !== null ? `Publicado en ${book.year}` : "Año desconocido";

  // Portada: si no hay o no carga, se muestra una imagen de reemplazo
  const coverUrl = handlers.getCoverUrl(book.coverId);
  img.alt = `Portada de ${book.title}`;
  img.addEventListener(
    "error",
    () => {
      img.src = handlers.placeholderCover;
    },
    { once: true },
  );
  img.src = coverUrl !== null ? coverUrl : handlers.placeholderCover;

  // Enlace entre el botón y su panel (aria-controls)
  const detailsId = nextId("details");
  detailsPanel.id = detailsId;
  detailsButton.setAttribute("aria-controls", detailsId);

  syncFavoriteButton(favButton, handlers.isFavorite(book.workId));

  return fragment;
}

// Delegación de eventos: un solo listener en la lista atiende los clics
// de "Favorito" y "Ver detalles" de todas las tarjetas.
export function setupResultsDelegation(listEl, handlers) {
  listEl.addEventListener("click", (event) => {
    const favButton = event.target.closest(".btn-fav");
    const detailsButton = event.target.closest(".btn-details");

    if (favButton === null && detailsButton === null) {
      return;
    }

    const card = event.target.closest(".book-card");
    const book = handlers.getBookById(card.dataset.workId);
    if (book === null) {
      return;
    }

    if (favButton !== null) {
      handlers.onToggleFavorite(book);
      return;
    }

    const panel = card.querySelector(".book-details");
    if (detailsButton.getAttribute("aria-expanded") === "true") {
      collapseDetails(detailsButton, panel);
    } else {
      expandDetails(detailsButton, panel, book, handlers);
    }
  });
}

// Actualiza el texto, el color y aria-pressed del botón de favorito.
// El estado no depende solo del color: también cambian el texto y la estrella.
function syncFavoriteButton(button, favored) {
  button.setAttribute("aria-pressed", favored === true ? "true" : "false");
  button.textContent = favored === true ? "★ En favoritos" : "☆ Favorito";
  button.classList.toggle("btn-danger", favored === true);
  button.classList.toggle("btn-secondary", favored === false);
}

async function expandDetails(button, panel, book, handlers) {
  button.setAttribute("aria-expanded", "true");
  button.textContent = "Ocultar detalles";
  panel.hidden = false;
  panel.textContent = "Cargando descripción…";

  try {
    const description = await handlers.getWorkDescription(book.workId);
    panel.textContent = truncate(description, 500);
  } catch (error) {
    panel.textContent = error.message;
  }
}

function collapseDetails(button, panel) {
  button.setAttribute("aria-expanded", "false");
  button.textContent = "Ver detalles";
  panel.hidden = true;
}

// Dibuja la lista de favoritos y actualiza el contador.
export function renderFavorites(listEl, countEl, favorites) {
  listEl.replaceChildren();
  countEl.textContent = String(favorites.length);

  if (favorites.length === 0) {
    listEl.appendChild(buildEmptyMessage("Aún no tienes libros favoritos."));
    return;
  }

  favorites.forEach((book) => {
    const li = document.createElement("li");
    li.className = "favorite-item";
    li.dataset.workId = book.workId;

    const title = document.createElement("span");
    title.className = "favorite-title";
    title.textContent = book.title;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-sm btn-danger btn-remove";
    removeButton.textContent = "Quitar";
    removeButton.setAttribute("aria-label", `Quitar ${book.title} de favoritos`);

    li.appendChild(title);
    li.appendChild(removeButton);
    listEl.appendChild(li);
  });
}

// Abre o cierra un panel y mantiene aria-expanded igual al estado real.
export function togglePanel(button, panel) {
  const willExpand = button.getAttribute("aria-expanded") !== "true";

  button.setAttribute("aria-expanded", willExpand === true ? "true" : "false");
  panel.hidden = willExpand === false;
}
