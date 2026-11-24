// Web pública: muestra el menú y guarda reservas.

const ORDEN_CATEGORIAS = ["Entradas", "Platos fuertes", "Postres", "Bebidas"];

function posicion(categoria) {
  const i = ORDEN_CATEGORIAS.indexOf(categoria);
  return i === -1 ? 99 : i;
}

/* ---------- Menú ---------- */

async function cargarMenu() {
  const contenedor = document.getElementById("platos");
  const nav = document.getElementById("categorias");

  // El filtro hace falta aunque la política de Supabase ya lo aplique: si el
  // dueño tiene sesión abierta en el mismo navegador, vería también los agotados.
  const { data, error } = await db
    .from("platos")
    .select("*")
    .eq("disponible", true)
    .order("nombre");

  if (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="vacio">No se pudo cargar el menú. Recarga la página en un momento.</p>';
    return;
  }
  if (data.length === 0) {
    contenedor.innerHTML = '<p class="vacio">Estamos actualizando el menú. Vuelve en un rato.</p>';
    return;
  }

  const grupos = {};
  data.forEach((p) => (grupos[p.categoria] ||= []).push(p));
  const categorias = Object.keys(grupos).sort(
    (a, b) => posicion(a) - posicion(b) || a.localeCompare(b, "es")
  );

  nav.innerHTML = categorias
    .map((c, i) => `<a href="#cat-${i}">${esc(c)}</a>`)
    .join("");

  contenedor.innerHTML = categorias
    .map((c, i) => `
      <div class="categoria" id="cat-${i}">
        <h3>${esc(c)}</h3>
        <ul>
          ${grupos[c].map((p) => `
            <li class="plato">
              <div class="plato-cabecera">
                <span class="nombre">${esc(p.nombre)}</span>
                <span class="puntos" aria-hidden="true"></span>
                <span class="precio">${dinero(p.precio)}</span>
              </div>
              ${p.descripcion ? `<p class="desc">${esc(p.descripcion)}</p>` : ""}
            </li>`).join("")}
        </ul>
      </div>`)
    .join("");
}

/* ---------- Reservas ---------- */

function prepararFormulario() {
  const personas = document.getElementById("personas");
  for (let i = 1; i <= 12; i++) {
    personas.add(new Option(i === 1 ? "1 persona" : `${i} personas`, i, i === 2, i === 2));
  }

  // Horas cada 30 minutos, de 11:00 a 20:00.
  const hora = document.getElementById("hora");
  hora.add(new Option("Elige una hora", "", true, true));
  hora.options[0].disabled = true;
  for (let min = 11 * 60; min <= 20 * 60; min += 30) {
    const h = Math.floor(min / 60);
    const m = String(min % 60).padStart(2, "0");
    const h12 = ((h + 11) % 12) + 1;
    const sufijo = h < 12 ? "a. m." : "p. m.";
    hora.add(new Option(`${h12}:${m} ${sufijo}`, `${String(h).padStart(2, "0")}:${m}`));
  }

  document.getElementById("fecha").min = hoyISO();
}

function decir(texto, error = false) {
  const el = document.getElementById("mensaje");
  el.textContent = texto;
  el.className = "mensaje" + (texto ? (error ? " error" : " ok") : "");
}

document.getElementById("form-reserva").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const boton = form.querySelector("button[type=submit]");

  if (!configurado) {
    decir("La web todavía no está conectada a Supabase. Revisa js/config.js.", true);
    return;
  }

  const reserva = {
    nombre: form.nombre.value.trim(),
    telefono: form.telefono.value.trim(),
    personas: Number(form.personas.value),
    fecha: form.fecha.value,
    hora: form.hora.value,
    notas: form.notas.value.trim() || null,
  };

  boton.disabled = true;
  decir("");
  const { error } = await db.from("reservas").insert(reserva);
  boton.disabled = false;

  if (error) {
    console.error(error);
    decir("No pudimos guardar la reserva. Revisa los datos e inténtalo otra vez, o llámanos.", true);
    return;
  }

  form.reset();
  decir(`Reserva enviada. Te llamaremos al ${reserva.telefono} para confirmarla.`);
});

/* ---------- Inicio ---------- */

prepararFormulario();

if (!configurado) {
  const aviso = document.getElementById("aviso");
  aviso.textContent = "Falta conectar Supabase: abre js/config.js y pega la URL y la clave de tu proyecto.";
  aviso.hidden = false;
  document.getElementById("platos").innerHTML = '<p class="vacio">El menú aparecerá cuando conectes Supabase.</p>';
} else {
  cargarMenu();
}
