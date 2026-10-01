verificarAccesoModulo(["devoluciones"]);

function formatearMonto(numero) {
  return "$" + Number(numero).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearNumero(numeroSecuencial, creadoEn) {
  const f = new Date(creadoEn);
  const pad = (n) => String(n).padStart(2, "0");
  const consecutivo = String(numeroSecuencial).padStart(8, "0");
  const fecha = f.getFullYear() + pad(f.getMonth() + 1) + pad(f.getDate());
  const hora = pad(f.getHours()) + pad(f.getMinutes()) + pad(f.getSeconds());
  return consecutivo + "-" + fecha + "-" + hora;
}

const buscadorFactura = document.getElementById("buscadorFactura");
const resultadosFactura = document.getElementById("resultadosFactura");
const pasoBuscarFactura = document.getElementById("pasoBuscarFactura");
const pasoProductos = document.getElementById("pasoProductos");
const cuerpoItemsFactura = document.getElementById("cuerpoItemsFactura");
const mensajeDevolucion = document.getElementById("mensajeDevolucion");

let facturaSeleccionada = null;
let itemsFacturaActual = [];

// ================= BUSCAR FACTURA =================
buscadorFactura.addEventListener("input", async () => {
  const texto = buscadorFactura.value.trim();
  resultadosFactura.innerHTML = "";
  if (!texto) return;

  let query = supabaseClient.from("facturas").select("*").eq("estado", "activa").order("creado_en", { ascending: false }).limit(10);
  if (/^\d+$/.test(texto)) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.ilike("cliente_nombre", `%${texto}%`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    resultadosFactura.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron facturas.</p>";
    return;
  }

  data.forEach((f) => {
    const div = document.createElement("div");
    div.className = "prov-item";
    div.innerHTML = `<strong>${formatearNumero(f.numero_secuencial, f.creado_en)}</strong>${f.cliente_nombre} · ${formatearMonto(f.total)}`;
    div.addEventListener("click", () => seleccionarFactura(f));
    resultadosFactura.appendChild(div);
  });
});

async function seleccionarFactura(factura) {
  facturaSeleccionada = factura;

  const { data: items, error } = await supabaseClient
    .from("factura_items")
    .select("*")
    .eq("factura_id", factura.id);

  if (error || !items) return;

  itemsFacturaActual = items;

  document.getElementById("facturaNumeroTitulo").textContent = formatearNumero(factura.numero_secuencial, factura.creado_en);
  document.getElementById("facturaClienteTitulo").textContent = factura.cliente_nombre;

  cuerpoItemsFactura.innerHTML = "";
  items.forEach((item, index) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><input type="checkbox" class="chk-item" data-index="${index}"></td>
      <td>${item.descripcion}</td>
      <td>${item.cantidad}</td>
      <td><input type="number" class="cant-devolver" data-index="${index}" min="1" max="${item.cantidad}" value="${item.cantidad}" disabled></td>
      <td>${formatearMonto(item.precio_unitario)}</td>
      <td class="subtotal-item" data-index="${index}">${formatearMonto(0)}</td>
    `;
    cuerpoItemsFactura.appendChild(fila);
  });

  document.querySelectorAll(".chk-item").forEach((chk) => {
    chk.addEventListener("change", (e) => {
      const i = e.target.dataset.index;
      const inputCant = document.querySelector(`.cant-devolver[data-index="${i}"]`);
      inputCant.disabled = !e.target.checked;
      actualizarSubtotales();
    });
  });

  document.querySelectorAll(".cant-devolver").forEach((inp) => {
    inp.addEventListener("input", actualizarSubtotales);
  });

  actualizarSubtotales();

  pasoBuscarFactura.style.display = "none";
  pasoProductos.style.display = "block";
}

function actualizarSubtotales() {
  let total = 0;
  itemsFacturaActual.forEach((item, index) => {
    const chk = document.querySelector(`.chk-item[data-index="${index}"]`);
    const inputCant = document.querySelector(`.cant-devolver[data-index="${index}"]`);
    const celda = document.querySelector(`.subtotal-item[data-index="${index}"]`);
    let subtotal = 0;
    if (chk.checked) {
      const cant = Math.min(parseInt(inputCant.value) || 0, item.cantidad);
      subtotal = cant * Number(item.precio_unitario);
    }
    celda.textContent = formatearMonto(subtotal);
    total += subtotal;
  });
  document.getElementById("totalCredito").textContent = formatearMonto(total);
}

document.getElementById("btnCambiarFactura").addEventListener("click", () => {
  facturaSeleccionada = null;
  itemsFacturaActual = [];
  buscadorFactura.value = "";
  resultadosFactura.innerHTML = "";
  pasoBuscarFactura.style.display = "block";
  pasoProductos.style.display = "none";
});

// ================= PROCESAR DEVOLUCIÓN =================
document.getElementById("btnProcesarDevolucion").addEventListener("click", async () => {
  mensajeDevolucion.textContent = "";

  const itemsSeleccionados = [];
  itemsFacturaActual.forEach((item, index) => {
    const chk = document.querySelector(`.chk-item[data-index="${index}"]`);
    const inputCant = document.querySelector(`.cant-devolver[data-index="${index}"]`);
    if (chk.checked) {
      const cant = Math.min(parseInt(inputCant.value) || 0, item.cantidad);
      if (cant > 0) {
        itemsSeleccionados.push({
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: cant,
          precio_unitario: Number(item.precio_unitario),
          subtotal: cant * Number(item.precio_unitario)
        });
      }
    }
  });

  if (itemsSeleccionados.length === 0) {
    mensajeDevolucion.textContent = "Selecciona al menos un producto a devolver.";
    return;
  }

  const motivo = document.getElementById("motivoDevolucion").value.trim() || null;
  const totalCredito = itemsSeleccionados.reduce((acc, i) => acc + i.subtotal, 0);

  const { data: devolucionCreada, error: errorDev } = await supabaseClient
    .from("devoluciones")
    .insert({
      factura_id: facturaSeleccionada.id,
      factura_numero: formatearNumero(facturaSeleccionada.numero_secuencial, facturaSeleccionada.creado_en),
      cliente_nombre: facturaSeleccionada.cliente_nombre,
      motivo: motivo,
      monto_credito: totalCredito
    })
    .select()
    .single();

  if (errorDev) {
    mensajeDevolucion.textContent = "Error al procesar: " + errorDev.message;
    return;
  }

  const itemsParaGuardar = itemsSeleccionados.map((i) => ({
    devolucion_id: devolucionCreada.id,
    producto_id: i.producto_id,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.subtotal
  }));

  const { error: errorItems } = await supabaseClient.from("devolucion_items").insert(itemsParaGuardar);

  if (errorItems) {
    mensajeDevolucion.textContent = "Error al guardar detalle: " + errorItems.message;
    return;
  }

  // Devolver la mercancía al inventario
  for (const item of itemsSeleccionados) {
    if (!item.producto_id) continue;
    const { data: prod } = await supabaseClient.from("productos").select("existencia").eq("id", item.producto_id).single();
    if (prod) {
      await supabaseClient.from("productos").update({ existencia: prod.existencia + item.cantidad }).eq("id", item.producto_id);
    }
  }

  mostrarNotaImpresa(devolucionCreada, itemsSeleccionados, motivo);
  cargarHistorial();
});

// ================= NOTA DE CRÉDITO IMPRIMIBLE =================
function mostrarNotaImpresa(devolucion, items, motivo) {
  document.getElementById("pfNumero").textContent = formatearNumero(devolucion.numero_secuencial, devolucion.creado_en);
  document.getElementById("pfFecha").textContent = new Date(devolucion.creado_en).toLocaleString("es-DO");
  document.getElementById("pfCliente").textContent = devolucion.cliente_nombre;
  document.getElementById("pfFacturaOriginal").textContent = devolucion.factura_numero;
  document.getElementById("pfMotivo").textContent = motivo || "—";
  document.getElementById("pfTotal").textContent = formatearMonto(devolucion.monto_credito);

  const pfCuerpo = document.getElementById("pfCuerpo");
  pfCuerpo.innerHTML = "";
  items.forEach((item) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${item.descripcion}</td><td>${item.cantidad}</td><td>${formatearMonto(item.precio_unitario)}</td><td>${formatearMonto(item.subtotal)}</td>`;
    pfCuerpo.appendChild(fila);
  });

  document.getElementById("overlayNota").style.display = "flex";
}

document.getElementById("btnImprimirNota").addEventListener("click", () => window.print());

document.getElementById("btnNuevaDevolucion").addEventListener("click", () => {
  facturaSeleccionada = null;
  itemsFacturaActual = [];
  buscadorFactura.value = "";
  resultadosFactura.innerHTML = "";
  document.getElementById("motivoDevolucion").value = "";
  pasoBuscarFactura.style.display = "block";
  pasoProductos.style.display = "none";
  document.getElementById("overlayNota").style.display = "none";
  mensajeDevolucion.textContent = "";
});

// ================= HISTORIAL =================
const buscadorHistorial = document.getElementById("buscadorHistorial");
const cuerpoHistorial = document.getElementById("cuerpoHistorial");
let historialCache = [];

async function cargarHistorial() {
  const { data, error } = await supabaseClient
    .from("devoluciones")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(50);

  if (error) return;
  historialCache = data;
  renderHistorial(data);
}

function renderHistorial(lista) {
  cuerpoHistorial.innerHTML = "";
  if (lista.length === 0) {
    cuerpoHistorial.innerHTML = "<tr><td colspan='6' class='sin-datos'>Sin devoluciones registradas todavía.</td></tr>";
    return;
  }
  lista.forEach((d) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${d.numero_secuencial}</td>
      <td>${new Date(d.creado_en).toLocaleDateString("es-DO")}</td>
      <td>${d.cliente_nombre}</td>
      <td>${d.factura_numero || "—"}</td>
      <td>${d.motivo || "—"}</td>
      <td>${formatearMonto(d.monto_credito)}</td>
    `;
    cuerpoHistorial.appendChild(fila);
  });
}

buscadorHistorial.addEventListener("input", () => {
  const texto = buscadorHistorial.value.toLowerCase();
  renderHistorial(historialCache.filter((d) => d.cliente_nombre.toLowerCase().includes(texto)));
});

// ================= EMPRESA (encabezado de la nota) =================
async function cargarDatosEmpresaImpresion() {
  const { data, error } = await supabaseClient.from("configuracion").select("*").eq("id", 1).single();
  if (error || !data) return;
  document.getElementById("pfEmpresaNombre").textContent = data.nombre_empresa || "Ingeniería & Tecnología Henríquez";
  if (data.telefono_empresa) document.getElementById("pfEmpresaTelefono").textContent = "Tel: " + data.telefono_empresa;
}
cargarDatosEmpresaImpresion();

cargarHistorial();
