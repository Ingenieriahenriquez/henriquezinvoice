verificarAccesoModulo(["soporte"]);

const mensajeTicket = document.getElementById("mensajeTicket");
const listaTickets = document.getElementById("listaTickets");
const buscadorTicket = document.getElementById("buscadorTicket");
const filtroEstado = document.getElementById("filtroEstado");

let ticketsCache = [];
let ticketSeleccionado = null;

// ================= CREAR TICKET =================
document.getElementById("btnCrearTicket").addEventListener("click", async () => {
  mensajeTicket.textContent = "";
  const cliente = document.getElementById("ticketCliente").value.trim();
  const asunto = document.getElementById("ticketAsunto").value.trim();

  if (!cliente) {
    mensajeTicket.textContent = "El nombre del cliente es obligatorio.";
    return;
  }
  if (!asunto) {
    mensajeTicket.textContent = "El asunto es obligatorio.";
    return;
  }

  const nuevo = {
    cliente_nombre: cliente,
    telefono: document.getElementById("ticketTelefono").value.trim() || null,
    asunto: asunto,
    descripcion: document.getElementById("ticketDescripcion").value.trim() || null,
    prioridad: document.getElementById("ticketPrioridad").value
  };

  const { error } = await supabaseClient.from("soporte_tickets").insert(nuevo);

  if (error) {
    mensajeTicket.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("ticketCliente").value = "";
  document.getElementById("ticketTelefono").value = "";
  document.getElementById("ticketAsunto").value = "";
  document.getElementById("ticketDescripcion").value = "";
  document.getElementById("ticketPrioridad").value = "Media";

  cargarTickets();
});

// ================= CARGAR TICKETS =================
async function cargarTickets() {
  const { data, error } = await supabaseClient
    .from("soporte_tickets")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) return;
  ticketsCache = data;
  aplicarFiltros();
}

function aplicarFiltros() {
  const texto = buscadorTicket.value.toLowerCase();
  const estado = filtroEstado.value;

  const filtrados = ticketsCache.filter((t) => {
    const coincideTexto = t.cliente_nombre.toLowerCase().includes(texto) || t.asunto.toLowerCase().includes(texto);
    const coincideEstado = !estado || t.estado === estado;
    return coincideTexto && coincideEstado;
  });

  renderTickets(filtrados);
}

function claseEstado(estado) {
  return "estado-" + estado.toLowerCase().replace(" ", "-");
}

function claseePrioridad(prioridad) {
  return "prioridad-" + prioridad.toLowerCase();
}

function renderTickets(lista) {
  listaTickets.innerHTML = "";

  if (lista.length === 0) {
    listaTickets.innerHTML = "<p class='sin-datos'>No se encontraron solicitudes.</p>";
    return;
  }

  lista.forEach((t) => {
    const div = document.createElement("div");
    div.className = "ticket-item";
    div.innerHTML = `
      <div class="ticket-top">
        <span class="ticket-numero">Solicitud #${t.numero_secuencial}</span>
        <span class="tag-estado ${claseEstado(t.estado)}">${t.estado}</span>
      </div>
      <p class="ticket-asunto">${t.asunto}</p>
      <p class="ticket-cliente">${t.cliente_nombre} · ${new Date(t.creado_en).toLocaleDateString("es-DO")}
        <span class="tag-prioridad ${claseePrioridad(t.prioridad)}">${t.prioridad}</span>
      </p>
    `;
    div.addEventListener("click", () => abrirDetalle(t));
    listaTickets.appendChild(div);
  });
}

buscadorTicket.addEventListener("input", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);

// ================= DETALLE DEL TICKET =================
const overlayDetalle = document.getElementById("overlayDetalle");
const mensajeDetalle = document.getElementById("mensajeDetalle");

async function abrirDetalle(ticket) {
  ticketSeleccionado = ticket;

  document.getElementById("detNumero").textContent = "Solicitud #" + ticket.numero_secuencial;
  document.getElementById("detCliente").textContent = ticket.cliente_nombre;
  document.getElementById("detTelefono").textContent = ticket.telefono || "—";
  document.getElementById("detAsunto").textContent = ticket.asunto;
  document.getElementById("detDescripcion").textContent = ticket.descripcion || "—";
  document.getElementById("detFecha").textContent = new Date(ticket.creado_en).toLocaleString("es-DO");
  document.getElementById("detEstado").value = ticket.estado;
  document.getElementById("notaNueva").value = "";
  mensajeDetalle.textContent = "";

  await cargarNotas(ticket.id);

  overlayDetalle.style.display = "flex";
}

document.getElementById("btnCerrarDetalle").addEventListener("click", () => {
  overlayDetalle.style.display = "none";
});

document.getElementById("btnActualizarEstado").addEventListener("click", async () => {
  mensajeDetalle.textContent = "";
  const nuevoEstado = document.getElementById("detEstado").value;

  const cambios = { estado: nuevoEstado };
  if (nuevoEstado === "Resuelto" || nuevoEstado === "Cerrado") {
    cambios.resuelto_en = new Date().toISOString();
  }

  const { error } = await supabaseClient.from("soporte_tickets").update(cambios).eq("id", ticketSeleccionado.id);

  if (error) {
    mensajeDetalle.textContent = "Error: " + error.message;
    return;
  }

  mensajeDetalle.style.color = "#16a34a";
  mensajeDetalle.textContent = "✔ Estado actualizado.";
  ticketSeleccionado.estado = nuevoEstado;
  cargarTickets();
});

async function cargarNotas(ticketId) {
  const { data, error } = await supabaseClient
    .from("soporte_notas")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("creado_en", { ascending: false });

  const listaNotas = document.getElementById("listaNotas");
  listaNotas.innerHTML = "";

  if (error || !data || data.length === 0) {
    listaNotas.innerHTML = "<p class='sin-datos'>Sin notas de seguimiento todavía.</p>";
    return;
  }

  data.forEach((n) => {
    const div = document.createElement("div");
    div.className = "nota-item";
    div.innerHTML = `${n.nota}<span class="nota-fecha">${new Date(n.creado_en).toLocaleString("es-DO")}</span>`;
    listaNotas.appendChild(div);
  });
}

document.getElementById("btnAgregarNota").addEventListener("click", async () => {
  mensajeDetalle.textContent = "";
  const nota = document.getElementById("notaNueva").value.trim();

  if (!nota) {
    mensajeDetalle.textContent = "Escribe algo antes de agregar la nota.";
    return;
  }

  const { error } = await supabaseClient.from("soporte_notas").insert({
    ticket_id: ticketSeleccionado.id,
    nota: nota
  });

  if (error) {
    mensajeDetalle.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("notaNueva").value = "";
  cargarNotas(ticketSeleccionado.id);
});

cargarTickets();
