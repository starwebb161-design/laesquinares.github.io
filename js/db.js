// Cliente de Supabase compartido por la web y el panel.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const configurado = !SUPABASE_URL.includes("TU-PROYECTO");

// Escapa texto antes de meterlo en innerHTML (las notas de las reservas
// las escribe cualquier visitante).
function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function dinero(n) {
  return "$" + Number(n).toFixed(2);
}

// Fecha de hoy como AAAA-MM-DD, en la hora local del navegador.
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
