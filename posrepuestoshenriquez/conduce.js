verificarAccesoModulo(["conduce"]);

const buscadorProd = document.getElementById("buscadorProd");
const resultadosProd = document.getElementById("resultadosProd");
const cuerpoCarrito = document.getElementById("cuerpoCarrito");
const mensajeGuia = document.getElementById("mensajeGuia");
const btnGenerarGuia = document.getElementById("btnGenerarGuia");
const btnCancelarGuia = document.getElementById("btnCancelarGuia");
const clienteNombre = document.getElementById("clienteNombre");
const destino = document.getElementById("destino");
const fechaTraslado = document.getElementById("fechaTraslado");
const buscadorFactura = document.getElementById("buscadorFactura");
const resultadosFactura = document.getElementById("resultadosFactura");

let carrito = [];
let facturaVinculada = null;

fechaTraslado.value = new Date().toISOString().slice(0, 10);

function formatearNumero(numeroSecuencial, creadoEn) {
  const f = new Date(creadoEn);
  const pad = (n) => String(n).padStart(2, "0");
  const consecutivo = String(numeroSecuencial).padStart(8, "0");
  const fecha = f.getFullYear() + pad(f.getMonth() + 1) + pad(f.getDate());
  const hora = pad(f.getHours()) + pad(f.getMinutes()) + pad(f.getSeconds());
  return consecutivo + "-" + fecha + "-" + hora;
}

async function actualizarProximoNumero() {
  const badge = document.getElementById("proximoNumeroBadge");
  const { data, error } = await supabaseClient
    .from("guias_remision")
    .select("numero_secuencial")
    .order("numero_secuencial", { ascending: false })
    .limit(1);
  if (error) return;
  const ultimo = (data && data.length > 0) ? data[0].numero_secuencial : 0;
  badge.textContent = "Próxima Guía: #" + String(ultimo + 1).padStart(8, "0");
}
actualizarProximoNumero();

renderCarrito();

async function cargarDatosEmpresaImpresion() {
  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) return;

  document.getElementById("pfEmpresaNombre").textContent = data.nombre_empresa || "Ingeniería & Tecnología Henríquez";
  if (data.telefono_empresa) document.getElementById("pfEmpresaTelefono").textContent = "Tel: " + data.telefono_empresa;
  if (data.eslogan_empresa) {
    document.getElementById("pfEmpresaEslogan").textContent = data.eslogan_empresa;
    document.getElementById("pfEmpresaEslogan").style.display = "block";
  }
  if (data.rnc_empresa) {
    document.getElementById("pfEmpresaRnc").textContent = "RNC: " + data.rnc_empresa;
    document.getElementById("pfEmpresaRnc").style.display = "block";
  }
}
cargarDatosEmpresaImpresion();

// ---------- Vincular factura ----------
buscadorFactura.addEventListener("input", async () => {
  const texto = buscadorFactura.value.trim();
  resultadosFactura.innerHTML = "";
  if (!texto) return;

  let query = supabaseClient.from("facturas").select("*").order("creado_en", { ascending: false }).limit(6);
  if (/^\d+$/.test(texto)) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.ilike("cliente_nombre", `%${texto}%`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return;

  data.forEach((f) => {
    const div = document.createElement("div");
    div.className = "prov-item";
    div.innerHTML = `<strong>${formatearNumero(f.numero_secuencial, f.creado_en)}</strong>${f.cliente_nombre} · $${Number(f.total).toFixed(2)}`;
    div.addEventListener("click", () => vincularFactura(f));
    resultadosFactura.appendChild(div);
  });
});

async function vincularFactura(factura) {
  facturaVinculada = factura;
  buscadorFactura.value = formatearNumero(factura.numero_secuencial, factura.creado_en);
  resultadosFactura.innerHTML = "";
  clienteNombre.value = factura.cliente_nombre;
  if (factura.cliente_direccion) destino.value = factura.cliente_direccion;

  const { data: items, error } = await supabaseClient
    .from("factura_items")
    .select("*")
    .eq("factura_id", factura.id);

  if (error || !items) return;

  carrito = items.map((i) => ({
    producto_id: i.producto_id,
    descripcion: i.descripcion,
    cantidad: i.cantidad
  }));
  renderCarrito();
}

// ---------- Buscador de productos ----------
buscadorProd.addEventListener("input", async () => {
  const texto = buscadorProd.value.trim();
  resultadosProd.innerHTML = "";
  if (texto.length < 2) return;

  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .or(`descripcion.ilike.%${texto}%,marca.ilike.%${texto}%,codigo_manual.ilike.%${texto}%,codigo_barras.ilike.%${texto}%`)
    .limit(8);

  if (error) { resultadosProd.innerHTML = "Error: " + error.message; return; }

  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "resultado-item";
    div.innerHTML = `<strong>${p.descripcion}</strong><br>Existencia: ${p.existencia}`;
    div.addEventListener("click", () => {
      agregarAlCarrito(p);
      buscadorProd.value = "";
      resultadosProd.innerHTML = "";
    });
    resultadosProd.appendChild(div);
  });
});

function agregarAlCarrito(producto) {
  const existente = carrito.find((i) => i.producto_id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      producto_id: producto.id,
      descripcion: producto.descripcion,
      cantidad: 1
    });
  }
  renderCarrito();
}

function renderCarrito() {
  cuerpoCarrito.innerHTML = "";

  if (carrito.length === 0) {
    for (let i = 1; i <= 3; i++) {
      const fila = document.createElement("tr");
      fila.className = "fila-vacia";
      fila.innerHTML = `<td class="col-num">${i}</td><td colspan="3"></td>`;
      cuerpoCarrito.appendChild(fila);
    }
  }

  carrito.forEach((item, index) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td>${item.descripcion}</td>
      <td><input type="number" class="cant-input" min="1" value="${item.cantidad}" data-index="${index}"></td>
      <td><button class="btn-quitar" data-index="${index}">✕</button></td>
    `;
    cuerpoCarrito.appendChild(fila);
  });

  document.querySelectorAll(".cant-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const i = parseInt(e.target.dataset.index);
      carrito[i].cantidad = Math.max(1, parseInt(e.target.value) || 1);
      renderCarrito();
    });
  });

  document.querySelectorAll(".btn-quitar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(e.target.dataset.index);
      carrito.splice(i, 1);
      renderCarrito();
    });
  });
}

btnCancelarGuia.addEventListener("click", () => {
  if (carrito.length === 0) return;
  if (confirm("¿Cancelar esta guía y vaciar la lista de productos?")) {
    carrito = [];
    facturaVinculada = null;
    buscadorFactura.value = "";
    renderCarrito();
    mensajeGuia.textContent = "";
  }
});

// ---------- Generar guía ----------
btnGenerarGuia.addEventListener("click", async () => {
  mensajeGuia.textContent = "";

  if (carrito.length === 0) {
    mensajeGuia.textContent = "Agrega al menos un producto a trasladar.";
    return;
  }

  const nuevaGuia = {
    cliente_nombre: clienteNombre.value || "Consumidor Final",
    destino: destino.value.trim() || null,
    fecha_traslado: fechaTraslado.value,
    transportista_nombre: document.getElementById("transNombre").value.trim() || null,
    transportista_cedula: document.getElementById("transCedula").value.trim() || null,
    transportista_vehiculo: document.getElementById("transVehiculo").value.trim() || null,
    factura_id: facturaVinculada ? facturaVinculada.id : null,
    factura_numero: facturaVinculada ? formatearNumero(facturaVinculada.numero_secuencial, facturaVinculada.creado_en) : null
  };

  const { data: guiaCreada, error: errorGuia } = await supabaseClient
    .from("guias_remision")
    .insert(nuevaGuia)
    .select()
    .single();

  if (errorGuia) {
    mensajeGuia.textContent = "Error al crear la guía: " + errorGuia.message;
    return;
  }

  const items = carrito.map((item) => ({
    guia_id: guiaCreada.id,
    producto_id: item.producto_id,
    descripcion: item.descripcion,
    cantidad: item.cantidad
  }));

  const { error: errorItems } = await supabaseClient.from("guia_items").insert(items);

  if (errorItems) {
    mensajeGuia.textContent = "Error al guardar detalle: " + errorItems.message;
    return;
  }

  mostrarGuiaImpresa(guiaCreada, carrito);
  actualizarProximoNumero();
});

function mostrarGuiaImpresa(guia, items) {
  document.getElementById("pfNumero").textContent = formatearNumero(guia.numero_secuencial, guia.creado_en);
  document.getElementById("pfFecha").textContent = new Date(guia.fecha_traslado + "T00:00:00").toLocaleDateString("es-DO");
  document.getElementById("pfCliente").textContent = guia.cliente_nombre;

  mostrarLineaOpcional("pfLineaFactura", "pfFactura", guia.factura_numero);
  mostrarLineaOpcional("pfLineaDestino", "pfDestino", guia.destino);
  mostrarLineaOpcional("pfLineaTransNombre", "pfTransNombre", guia.transportista_nombre);
  mostrarLineaOpcional("pfLineaTransCedula", "pfTransCedula", guia.transportista_cedula);
  mostrarLineaOpcional("pfLineaTransVehiculo", "pfTransVehiculo", guia.transportista_vehiculo);

  const pfCuerpo = document.getElementById("pfCuerpo");
  pfCuerpo.innerHTML = "";
  items.forEach((item) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${item.descripcion}</td><td>${item.cantidad}</td>`;
    pfCuerpo.appendChild(fila);
  });

  document.getElementById("overlayGuia").style.display = "flex";
}

function mostrarLineaOpcional(idLinea, idSpan, valor) {
  const linea = document.getElementById(idLinea);
  if (valor) {
    document.getElementById(idSpan).textContent = valor;
    linea.style.display = "block";
  } else {
    linea.style.display = "none";
  }
}

document.getElementById("btnImprimirGuia").addEventListener("click", () => window.print());

document.getElementById("btnNuevaGuia").addEventListener("click", () => {
  carrito = [];
  facturaVinculada = null;
  buscadorFactura.value = "";
  clienteNombre.value = "Consumidor Final";
  destino.value = "";
  document.getElementById("transNombre").value = "";
  document.getElementById("transCedula").value = "";
  document.getElementById("transVehiculo").value = "";
  fechaTraslado.value = new Date().toISOString().slice(0, 10);
  renderCarrito();
  document.getElementById("overlayGuia").style.display = "none";
  mensajeGuia.textContent = "";
});

// ================= BUSCAR / REIMPRIMIR GUÍA =================
const overlayBuscarGuia = document.getElementById("overlayBuscarGuia");
const buscadorGuia = document.getElementById("buscadorGuia");
const resultadosBuscarGuia = document.getElementById("resultadosBuscarGuia");

document.getElementById("btnAbrirBuscarGuia").addEventListener("click", () => {
  overlayBuscarGuia.style.display = "flex";
  buscadorGuia.value = "";
  resultadosBuscarGuia.innerHTML = "";
  buscadorGuia.focus();
});

document.getElementById("btnCerrarBuscarGuia").addEventListener("click", () => {
  overlayBuscarGuia.style.display = "none";
});

buscadorGuia.addEventListener("input", async () => {
  const texto = buscadorGuia.value.trim();
  resultadosBuscarGuia.innerHTML = "";
  if (!texto) return;

  let query = supabaseClient.from("guias_remision").select("*").order("creado_en", { ascending: false }).limit(10);
  if (/^\d+$/.test(texto)) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.ilike("cliente_nombre", `%${texto}%`);
  }

  const { data, error } = await query;
  if (error) { resultadosBuscarGuia.innerHTML = "Error: " + error.message; return; }
  if (!data || data.length === 0) {
    resultadosBuscarGuia.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron guías.</p>";
    return;
  }

  data.forEach((g) => {
    const div = document.createElement("div");
    div.className = "prov-item";
    div.innerHTML = `<strong>${formatearNumero(g.numero_secuencial, g.creado_en)}</strong>${g.cliente_nombre} · ${new Date(g.fecha_traslado + "T00:00:00").toLocaleDateString("es-DO")}`;
    div.addEventListener("click", () => reimprimirGuia(g));
    resultadosBuscarGuia.appendChild(div);
  });
});

async function reimprimirGuia(guia) {
  const { data: items, error } = await supabaseClient
    .from("guia_items")
    .select("*")
    .eq("guia_id", guia.id);

  if (error) return;

  const itemsFormato = items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad }));
  overlayBuscarGuia.style.display = "none";
  mostrarGuiaImpresa(guia, itemsFormato);
}
