// Panel de administración: reservas y platos.
// Solo funciona con una sesión iniciada (las políticas de Supabase lo exigen).

const $ = (sel) => document.querySelector(sel);

let sesionActiva = false;
let reservas = [];
let platos = [];

const ESTADOS = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada" };

function decir(el, texto, error = false) {
  el.textContent = texto;
  el.className = "mensaje" + (texto ? (error ? " error" : " ok") : "");
}

function formatoFecha(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/* ---------- Sesión ---------- */

function mostrar(session) {
  const entro = Boolean(session);
  $("#login").hidden = entro;
  $("#panel").hidden = !entro;
  if (entro && !sesionActiva) {
    cargarReservas();
    cargarPlatos();
  }
  sesionActiva = entro;
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = e.currentTarget.querySelector("button[type=submit]");
  boton.disabled = true;
  decir($("#login-msg"), "");
  const { error } = await db.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#clave").value,
  });
  boton.disabled = false;
  if (error) {
    console.error(error);
    decir($("#login-msg"), "Correo o contraseña incorrectos.", true);
    return;
  }
  $("#clave").value = "";
});

$("#salir").addEventListener("click", () => db.auth.signOut());

document.querySelectorAll("[data-tab]").forEach((boton) => {
  boton.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) =>
      b.setAttribute("aria-selected", String(b === boton))
    );
    $("#tab-reservas").hidden = boton.dataset.tab !== "reservas";
    $("#tab-platos").hidden = boton.dataset.tab !== "platos";
  });
});

/* ---------- Reservas ---------- */

async function cargarReservas() {
  let consulta = db.from("reservas").select("*").order("fecha").order("hora");
  if (!$("#pasadas").checked) consulta = consulta.gte("fecha", hoyISO());

  const { data, error } = await consulta;
  if (error) {
    console.error(error);
    decir($("#reservas-msg"), "No se pudieron cargar las reservas: " + error.message, true);
    return;
  }
  reservas = data;
  $("#reservas-vacio").hidden = data.length > 0;
  $("#reservas-cuerpo").innerHTML = data.map(filaReserva).join("");
}

function filaReserva(r) {
  const opciones = Object.entries(ESTADOS)
    .map(([valor, texto]) => `<option value="${valor}"${valor === r.estado ? " selected" : ""}>${texto}</option>`)
    .join("");
  return `
    <tr data-id="${r.id}" class="${esc(r.estado)}">
      <td>${formatoFecha(r.fecha)}</td>
      <td>${esc(r.hora.slice(0, 5))}</td>
      <td>${esc(r.nombre)}</td>
      <td><a href="tel:${esc(r.telefono)}">${esc(r.telefono)}</a></td>
      <td>${r.personas}</td>
      <td>${esc(r.notas)}</td>
      <td><select class="estado" aria-label="Estado de la reserva de ${esc(r.nombre)}">${opciones}</select></td>
      <td><button class="boton boton-sec boton-borrar chico" type="button" data-accion="borrar-reserva">Borrar</button></td>
    </tr>`;
}

$("#pasadas").addEventListener("change", cargarReservas);

$("#reservas-cuerpo").addEventListener("change", async (e) => {
  if (!e.target.matches("select.estado")) return;
  const fila = e.target.closest("tr");
  const { error } = await db.from("reservas").update({ estado: e.target.value }).eq("id", fila.dataset.id);
  if (error) {
    console.error(error);
    decir($("#reservas-msg"), "No se pudo cambiar el estado: " + error.message, true);
    cargarReservas();
    return;
  }
  fila.className = e.target.value;
  decir($("#reservas-msg"), "Estado actualizado.");
});

$("#reservas-cuerpo").addEventListener("click", async (e) => {
  const boton = e.target.closest("[data-accion='borrar-reserva']");
  if (!boton) return;
  const id = Number(boton.closest("tr").dataset.id);
  const r = reservas.find((x) => x.id === id);
  if (!confirm(`¿Borrar la reserva de ${r.nombre} del ${formatoFecha(r.fecha)}?`)) return;

  const { error } = await db.from("reservas").delete().eq("id", id);
  if (error) {
    console.error(error);
    decir($("#reservas-msg"), "No se pudo borrar la reserva: " + error.message, true);
    return;
  }
  await cargarReservas();
  decir($("#reservas-msg"), "Reserva borrada.");
});

/* ---------- Platos ---------- */

async function cargarPlatos() {
  const { data, error } = await db.from("platos").select("*").order("categoria").order("nombre");
  if (error) {
    console.error(error);
    decir($("#platos-msg"), "No se pudieron cargar los platos: " + error.message, true);
    return;
  }
  platos = data;
  $("#platos-cuerpo").innerHTML = data.map(filaPlato).join("");

  const categorias = new Set([...ORDEN_BASE, ...data.map((p) => p.categoria)]);
  $("#categorias-lista").innerHTML = [...categorias]
    .map((c) => `<option value="${esc(c)}">`)
    .join("");
}

const ORDEN_BASE = ["Entradas", "Platos fuertes", "Postres", "Bebidas"];

function filaPlato(p) {
  return `
    <tr data-id="${p.id}" class="${p.disponible ? "" : "agotado"}">
      <td><strong>${esc(p.nombre)}</strong>${p.descripcion ? `<br><span class="suave">${esc(p.descripcion)}</span>` : ""}</td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${dinero(p.precio)}</td>
      <td><label class="check"><input type="checkbox" class="disponible"${p.disponible ? " checked" : ""}> Disponible</label></td>
      <td>
        <button class="boton boton-sec chico" type="button" data-accion="editar">Editar</button>
        <button class="boton boton-sec boton-borrar chico" type="button" data-accion="borrar-plato">Borrar</button>
      </td>
    </tr>`;
}

function limpiarFormularioPlato() {
  $("#form-plato").reset();
  $("#plato-id").value = "";
  $("#guardar-plato").textContent = "Agregar plato";
  $("#cancelar-plato").hidden = true;
}

function editarPlato(id) {
  const p = platos.find((x) => x.id === id);
  $("#plato-id").value = p.id;
  $("#p-nombre").value = p.nombre;
  $("#p-categoria").value = p.categoria;
  $("#p-precio").value = p.precio;
  $("#p-descripcion").value = p.descripcion ?? "";
  $("#guardar-plato").textContent = "Guardar cambios";
  $("#cancelar-plato").hidden = false;
  decir($("#platos-msg"), "");
  $("#p-nombre").focus();
  $("#form-plato").scrollIntoView({ behavior: "smooth", block: "center" });
}

$("#cancelar-plato").addEventListener("click", limpiarFormularioPlato);

$("#form-plato").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = $("#guardar-plato");
  const id = $("#plato-id").value;
  const plato = {
    nombre: $("#p-nombre").value.trim(),
    categoria: $("#p-categoria").value.trim(),
    precio: Number($("#p-precio").value),
    descripcion: $("#p-descripcion").value.trim() || null,
  };

  boton.disabled = true;
  const { error } = id
    ? await db.from("platos").update(plato).eq("id", id)
    : await db.from("platos").insert(plato);
  boton.disabled = false;

  if (error) {
    console.error(error);
    decir($("#platos-msg"), "No se pudo guardar el plato: " + error.message, true);
    return;
  }
  limpiarFormularioPlato();
  await cargarPlatos();
  decir($("#platos-msg"), id ? "Cambios guardados." : "Plato agregado.");
});

$("#platos-cuerpo").addEventListener("change", async (e) => {
  if (!e.target.matches("input.disponible")) return;
  const fila = e.target.closest("tr");
  const { error } = await db.from("platos").update({ disponible: e.target.checked }).eq("id", fila.dataset.id);
  if (error) {
    console.error(error);
    e.target.checked = !e.target.checked;
    decir($("#platos-msg"), "No se pudo cambiar la disponibilidad: " + error.message, true);
    return;
  }
  fila.classList.toggle("agotado", !e.target.checked);
});

$("#platos-cuerpo").addEventListener("click", async (e) => {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const id = Number(boton.closest("tr").dataset.id);

  if (boton.dataset.accion === "editar") {
    editarPlato(id);
    return;
  }

  if (boton.dataset.accion === "borrar-plato") {
    const p = platos.find((x) => x.id === id);
    if (!confirm(`¿Borrar "${p.nombre}" del menú?`)) return;
    const { error } = await db.from("platos").delete().eq("id", id);
    if (error) {
      console.error(error);
      decir($("#platos-msg"), "No se pudo borrar el plato: " + error.message, true);
      return;
    }
    await cargarPlatos();
    decir($("#platos-msg"), "Plato borrado.");
  }
});

/* ---------- Inicio ---------- */

(async function iniciar() {
  if (!configurado) {
    decir($("#login-msg"), "Primero pega los datos de Supabase en js/config.js.", true);
    $("#form-login button[type=submit]").disabled = true;
    return;
  }
  const { data } = await db.auth.getSession();
  mostrar(data.session);
  db.auth.onAuthStateChange((_evento, session) => mostrar(session));
})();
