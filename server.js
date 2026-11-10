import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Carga las variables del archivo .env (en el hosting se escriben en su panel)
dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

// API externa que consulta el servidor
const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_WORKS_URL = "https://openlibrary.org/works";

// Valores que el servidor acepta (validación de lo que envía el cliente)
const SUBJECTS = ["fiction", "science", "history", "fantasy", "biography", "poetry"];
const LANGUAGES = ["spa", "eng", "fre", "ger", "por"];
const SORT_OPTIONS = ["relevance", "new", "old", "rating"];
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 100;

// CORS: solo se aceptan los orígenes escritos en la variable ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin !== "");

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// El mismo servidor entrega el frontend (HTML, CSS y módulos .mjs)
app.use(express.static("public"));

// --- Rutas de la API ---

// Comprobación de estado
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Búsqueda de libros
app.get("/api/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const subject = typeof req.query.subject === "string" ? req.query.subject : "";
  const language = typeof req.query.language === "string" ? req.query.language : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "relevance";
  const limit = req.query.limit === undefined ? 24 : Number(req.query.limit);

  // Validación de los datos recibidos: si algo no es válido se responde 400
  if (q === "" && subject === "" && language === "") {
    return res.status(400).json({
      error: "Escribe un término de búsqueda o elige un tema o idioma.",
    });
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({
      error: `La búsqueda no puede tener más de ${MAX_QUERY_LENGTH} caracteres.`,
    });
  }
  if (subject !== "" && SUBJECTS.includes(subject) === false) {
    return res.status(400).json({ error: "El tema elegido no es válido." });
  }
  if (language !== "" && LANGUAGES.includes(language) === false) {
    return res.status(400).json({ error: "El idioma elegido no es válido." });
  }
  if (SORT_OPTIONS.includes(sort) === false) {
    return res.status(400).json({ error: "El orden elegido no es válido." });
  }
  if (Number.isInteger(limit) === false || limit < 1 || limit > MAX_LIMIT) {
    return res.status(400).json({
      error: `El límite debe ser un número entero entre 1 y ${MAX_LIMIT}.`,
    });
  }

  // Armar la consulta para Open Library
  const terms = [];
  if (q !== "") {
    terms.push(q);
  }
  if (subject !== "") {
    terms.push(`subject:${subject}`);
  }
  if (language !== "") {
    terms.push(`language:${language}`);
  }

  const params = new URLSearchParams();
  params.set("q", terms.join(" "));
  params.set("limit", String(limit));
  params.set("fields", "key,title,author_name,first_publish_year,cover_i");
  if (sort !== "relevance") {
    params.set("sort", sort);
  }

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`);

    if (response.ok === false) {
      console.error("Open Library respondió con estado", response.status);
      return res.status(500).json({
        error: "Open Library no respondió correctamente. Intenta de nuevo en un momento.",
      });
    }

    const data = await response.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];

    // Se devuelve solo lo que el frontend necesita, con nombres propios
    const books = docs.map((doc) => ({
      workId: typeof doc.key === "string" ? doc.key.replace("/works/", "") : "",
      title: typeof doc.title === "string" ? doc.title : "Título desconocido",
      authors: Array.isArray(doc.author_name) ? doc.author_name : [],
      year: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
      coverId: typeof doc.cover_i === "number" ? doc.cover_i : null,
    }));

    res.json({ books });
  } catch (error) {
    console.error("Error en GET /api/search:", error);
    res.status(500).json({ error: "Error interno del servidor al buscar libros." });
  }
});

// Descripción de una obra por su identificador (por ejemplo OL27448W)
app.get("/api/works/:workId", async (req, res) => {
  const { workId } = req.params;

  // Un identificador válido empieza por OL, sigue con números y termina en W
  if (/^OL\d+W$/.test(workId) === false) {
    return res.status(400).json({ error: "El identificador de la obra no es válido." });
  }

  try {
    const response = await fetch(`${OPEN_LIBRARY_WORKS_URL}/${workId}.json`);

    if (response.status === 404) {
      return res.status(404).json({ error: "No se encontró la obra solicitada." });
    }
    if (response.ok === false) {
      console.error("Open Library respondió con estado", response.status);
      return res.status(500).json({
        error: "Open Library no respondió correctamente. Intenta de nuevo en un momento.",
      });
    }

    const data = await response.json();
    let description = "Sin descripción disponible.";

    // Open Library envía la descripción como texto o como objeto { value }
    if (typeof data.description === "string") {
      description = data.description;
    } else if (data.description && typeof data.description.value === "string") {
      description = data.description.value;
    }

    res.json({ workId, description });
  } catch (error) {
    console.error("Error en GET /api/works/:workId:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener la obra." });
  }
});

// Cualquier otra ruta que empiece por /api no existe: 404 en JSON
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.listen(PORT, () => {
  console.log(`Servidor VITELA escuchando en http://localhost:${PORT}`);
});
