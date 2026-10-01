verificarAccesoModulo(["cotizacion"]);

const buscadorProd = document.getElementById("buscadorProd");
const resultadosProd = document.getElementById("resultadosProd");
const cuerpoCarrito = document.getElementById("cuerpoCarrito");
const txtSubtotal = document.getElementById("txtSubtotal");
const txtItbis = document.getElementById("txtItbis");
const txtTotal = document.getElementById("txtTotal");
const mensajeCotizacion = document.getElementById("mensajeCotizacion");
const btnGenerarCotizacion = document.getElementById("btnGenerarCotizacion");
const btnCancelarCotizacion = document.getElementById("btnCancelarCotizacion");
const fechaCotizacion = document.getElementById("fechaCotizacion");
const vigenciaDias = document.getElementById("vigenciaDias");

const nombreCliente = document.getElementById("nombreCliente");
const resultadosCliente = document.getElementById("resultadosCliente");
const clienteCedula = document.getElementById("clienteCedula");
const clienteWhatsapp = document.getElementById("clienteWhatsapp");
const clienteDireccion = document.getElementById("clienteDireccion");
const clienteSector = document.getElementById("clienteSector");
const clienteReferencia = document.getElementById("clienteReferencia");

const statusItems = document.getElementById("statusItems");
const statusVigencia = document.getElementById("statusVigencia");

let carrito = [];
let clienteSeleccionadoId = null;

// Arma el número de cotización con fecha y hora de emisión
function formatearNumero(numeroSecuencial, creadoEn) {
  const f = new Date(creadoEn);
  const pad = (n) => String(n).padStart(2, "0");
  const consecutivo = String(numeroSecuencial).padStart(8, "0");
  const fecha = f.getFullYear() + pad(f.getMonth() + 1) + pad(f.getDate());
  const hora = pad(f.getHours()) + pad(f.getMinutes()) + pad(f.getSeconds());
  return consecutivo + "-" + fecha + "-" + hora;
}

fechaCotizacion.textContent = new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

renderCarrito();

async function actualizarProximoNumero() {
  const badge = document.getElementById("proximoNumeroBadge");
  const { data, error } = await supabaseClient
    .from("cotizaciones")
    .select("numero_secuencial")
    .order("numero_secuencial", { ascending: false })
    .limit(1);
  if (error) return;
  const ultimo = (data && data.length > 0) ? data[0].numero_secuencial : 0;
  badge.textContent = "Próxima Cotización: #" + String(ultimo + 1).padStart(8, "0");
}
actualizarProximoNumero();

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

vigenciaDias.addEventListener("input", () => {
  statusVigencia.textContent = "⏳ " + (vigenciaDias.value || 0) + " días";
});

// ---------- Buscar cliente existente ----------
nombreCliente.addEventListener("input", async () => {
  clienteSeleccionadoId = null;
  const texto = nombreCliente.value.trim();
  resultadosCliente.innerHTML = "";
  if (texto.length < 2 || texto === "Consumidor Final") return;

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .ilike("nombre", `%${texto}%`)
    .limit(6);

  if (error || !data || data.length === 0) return;

  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "cliente-item";
    div.innerHTML = `<strong>${c.nombre}</strong><span>${c.telefono || c.whatsapp || ""} ${c.sector ? "— " + c.sector : ""}</span>`;
    div.addEventListener("click", () => {
      nombreCliente.value = c.nombre;
      clienteCedula.value = c.rnc_cedula || "";
      clienteWhatsapp.value = c.whatsapp || "";
      clienteDireccion.value = c.direccion || "";
      clienteSector.value = c.sector || "";
      clienteReferencia.value = c.referencia || "";
      clienteSeleccionadoId = c.id;
      resultadosCliente.innerHTML = "";
    });
    resultadosCliente.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".campo-cliente-wrap")) resultadosCliente.innerHTML = "";
});

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
    div.innerHTML = `<strong>${p.descripcion}</strong><br>$${Number(p.precio_venta).toFixed(2)} — Existencia: ${p.existencia}`;
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
      codigo: producto.codigo_manual || producto.codigo_barras || "—",
      precio_unitario: Number(producto.precio_venta),
      cantidad: 1
    });
  }
  renderCarrito();
}

function renderCarrito() {
  cuerpoCarrito.innerHTML = "";

  if (carrito.length === 0) {
    for (let i = 1; i <= 4; i++) {
      const fila = document.createElement("tr");
      fila.className = "fila-vacia";
      fila.innerHTML = `<td class="col-num">${i}</td><td colspan="6"></td>`;
      cuerpoCarrito.appendChild(fila);
    }
  }

  carrito.forEach((item, index) => {
    const subtotal = item.precio_unitario * item.cantidad;
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td>${item.descripcion}</td>
      <td>${item.codigo}</td>
      <td><input type="number" class="cant-input" min="1" value="${item.cantidad}" data-index="${index}"></td>
      <td class="monto-negrita">$${item.precio_unitario.toFixed(2)}</td>
      <td class="monto-negrita">$${subtotal.toFixed(2)}</td>
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

  statusItems.textContent = "📦 " + carrito.length + (carrito.length === 1 ? " item" : " items");
  calcularTotales();
}

function calcularTotales() {
  const subtotal = carrito.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
  const itbis = subtotal * 0.18;
  const total = subtotal + itbis;
  txtSubtotal.textContent = "$" + subtotal.toFixed(2);
  txtItbis.textContent = "$" + itbis.toFixed(2);
  txtTotal.textContent = "$" + total.toFixed(2);
  return { subtotal, itbis, total };
}

btnCancelarCotizacion.addEventListener("click", () => {
  if (carrito.length === 0) return;
  if (confirm("¿Cancelar esta cotización y vaciar el carrito?")) {
    carrito = [];
    renderCarrito();
    mensajeCotizacion.textContent = "";
  }
});

// ---------- Generar cotización ----------
btnGenerarCotizacion.addEventListener("click", async () => {
  mensajeCotizacion.textContent = "";

  if (carrito.length === 0) {
    mensajeCotizacion.textContent = "Agrega al menos un producto al carrito.";
    return;
  }

  const { subtotal, itbis, total } = calcularTotales();
  const cliente = nombreCliente.value || "Consumidor Final";
  const vigencia = parseInt(vigenciaDias.value) || 15;

  const datosExtra = {
    cedula: clienteCedula.value.trim(),
    whatsapp: clienteWhatsapp.value.trim(),
    direccion: clienteDireccion.value.trim(),
    sector: clienteSector.value.trim(),
    referencia: clienteReferencia.value.trim()
  };
  const hayDatosExtra = datosExtra.cedula || datosExtra.whatsapp || datosExtra.direccion || datosExtra.sector || datosExtra.referencia;

  let clienteIdFinal = clienteSeleccionadoId;

  if (!clienteIdFinal && cliente !== "Consumidor Final" && hayDatosExtra) {
    const { data: nuevoCliente, error: errorCliente } = await supabaseClient
      .from("clientes")
      .insert({
        nombre: cliente,
        rnc_cedula: datosExtra.cedula || null,
        whatsapp: datosExtra.whatsapp || null,
        direccion: datosExtra.direccion || null,
        sector: datosExtra.sector || null,
        referencia: datosExtra.referencia || null
      })
      .select()
      .single();
    if (!errorCliente) clienteIdFinal = nuevoCliente.id;
  }

  const { data: cotizacionCreada, error: errorCot } = await supabaseClient
    .from("cotizaciones")
    .insert({
      cliente_id: clienteIdFinal,
      cliente_nombre: cliente,
      cliente_cedula: datosExtra.cedula || null,
      cliente_whatsapp: datosExtra.whatsapp || null,
      cliente_direccion: datosExtra.direccion || null,
      cliente_sector: datosExtra.sector || null,
      cliente_referencia: datosExtra.referencia || null,
      subtotal: subtotal,
      itbis: itbis,
      total: total,
      vigencia_dias: vigencia
    })
    .select()
    .single();

  if (errorCot) {
    mensajeCotizacion.textContent = "Error al crear cotización: " + errorCot.message;
    return;
  }

  const items = carrito.map((item) => ({
    cotizacion_id: cotizacionCreada.id,
    producto_id: item.producto_id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.precio_unitario * item.cantidad
  }));

  const { error: errorItems } = await supabaseClient.from("cotizacion_items").insert(items);

  if (errorItems) {
    mensajeCotizacion.textContent = "Error al guardar detalle: " + errorItems.message;
    return;
  }

  mostrarCotizacionImpresa(cotizacionCreada, cliente, subtotal, itbis, total, datosExtra, vigencia, carrito);
  actualizarProximoNumero();
});

function mostrarLineaOpcional(idLinea, idSpan, valor) {
  const linea = document.getElementById(idLinea);
  if (valor) {
    document.getElementById(idSpan).textContent = valor;
    linea.style.display = "block";
  } else {
    linea.style.display = "none";
  }
}

function mostrarCotizacionImpresa(cot, cliente, subtotal, itbis, total, datosExtra, vigencia, items) {
  document.getElementById("pfNumero").textContent = formatearNumero(cot.numero_secuencial, cot.creado_en);
  document.getElementById("pfFecha").textContent = new Date(cot.creado_en).toLocaleString("es-DO");

  const vencimiento = new Date(cot.creado_en);
  vencimiento.setDate(vencimiento.getDate() + vigencia);
  document.getElementById("pfVencimiento").textContent = vencimiento.toLocaleDateString("es-DO");

  document.getElementById("pfCliente").textContent = cliente;
  document.getElementById("pfSubtotal").textContent = "$" + subtotal.toFixed(2);
  document.getElementById("pfItbis").textContent = "$" + itbis.toFixed(2);
  document.getElementById("pfTotal").textContent = "$" + total.toFixed(2);

  mostrarLineaOpcional("pfLineaCedula", "pfCedula", datosExtra.cedula);
  mostrarLineaOpcional("pfLineaWhatsapp", "pfWhatsapp", datosExtra.whatsapp);
  mostrarLineaOpcional("pfLineaDireccion", "pfDireccion", datosExtra.direccion);
  mostrarLineaOpcional("pfLineaSector", "pfSector", datosExtra.sector);
  mostrarLineaOpcional("pfLineaReferencia", "pfReferencia", datosExtra.referencia);

  const pfCuerpo = document.getElementById("pfCuerpo");
  pfCuerpo.innerHTML = "";
  items.forEach((item) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${item.descripcion}</td><td>${item.cantidad}</td><td>$${item.precio_unitario.toFixed(2)}</td><td>$${(item.precio_unitario * item.cantidad).toFixed(2)}</td>`;
    pfCuerpo.appendChild(fila);
  });

  document.getElementById("overlayCotizacion").style.display = "flex";
}

function aplicarFormatoImpresion(formato) {
  let styleTag = document.getElementById("estiloImpresionDinamico");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "estiloImpresionDinamico";
    document.head.appendChild(styleTag);
  }

  if (formato === "ticket") {
    styleTag.textContent = `
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
        .cot-doc-imprimir {
          width: 72mm !important;
          font-size: 9px !important;
          padding: 0 !important;
        }
        .cot-doc-imprimir h2 { font-size: 12px !important; }
        .cot-doc-imprimir table,
        .cot-doc-imprimir th,
        .cot-doc-imprimir td {
          font-size: 8px !important;
          padding: 2px !important;
        }
      }
    `;
  } else {
    styleTag.textContent = `
      @media print {
        @page { size: letter; margin: 20mm; }
        .cot-doc-imprimir {
          width: 100% !important;
          font-size: 12px !important;
          padding: 0 !important;
        }
      }
    `;
  }
}

document.getElementById("btnImprimirCotizacion").addEventListener("click", () => {
  const formato = document.getElementById("formatoImpresion").value;
  aplicarFormatoImpresion(formato);
  window.print();
});

document.getElementById("btnNuevaCotizacion").addEventListener("click", () => {
  carrito = [];
  renderCarrito();
  nombreCliente.value = "Consumidor Final";
  clienteCedula.value = "";
  clienteWhatsapp.value = "";
  clienteDireccion.value = "";
  clienteSector.value = "";
  clienteReferencia.value = "";
  clienteSeleccionadoId = null;
  vigenciaDias.value = 15;
  document.getElementById("overlayCotizacion").style.display = "none";
  mensajeCotizacion.textContent = "";
});

// ================= BUSCAR / CONVERTIR COTIZACIÓN =================
const overlayBuscarCot = document.getElementById("overlayBuscarCot");
const bcPasoBuscar = document.getElementById("bcPasoBuscar");
const bcPasoDetalle = document.getElementById("bcPasoDetalle");
const buscadorCot = document.getElementById("buscadorCot");
const resultadosBuscarCot = document.getElementById("resultadosBuscarCot");
const bcMensaje = document.getElementById("bcMensaje");

let cotizacionSeleccionada = null;

document.getElementById("btnAbrirBuscarCot").addEventListener("click", () => {
  overlayBuscarCot.style.display = "flex";
  bcPasoBuscar.style.display = "block";
  bcPasoDetalle.style.display = "none";
  buscadorCot.value = "";
  resultadosBuscarCot.innerHTML = "";
  buscadorCot.focus();
});

document.getElementById("btnCerrarBuscarCot").addEventListener("click", () => {
  overlayBuscarCot.style.display = "none";
});

document.getElementById("btnVolverBuscarCot").addEventListener("click", () => {
  bcPasoBuscar.style.display = "block";
  bcPasoDetalle.style.display = "none";
});

buscadorCot.addEventListener("input", async () => {
  const texto = buscadorCot.value.trim();
  resultadosBuscarCot.innerHTML = "";
  if (texto.length < 1) return;

  let query = supabaseClient.from("cotizaciones").select("*").order("creado_en", { ascending: false }).limit(10);

  const soloNumeros = /^\d+$/.test(texto);
  if (soloNumeros) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.ilike("cliente_nombre", `%${texto}%`);
  }

  const { data, error } = await query;

  if (error) { resultadosBuscarCot.innerHTML = "Error: " + error.message; return; }
  if (!data || data.length === 0) {
    resultadosBuscarCot.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron cotizaciones.</p>";
    return;
  }

  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "cliente-item";
    const estadoTexto = c.estado === "pendiente" ? "🟡 Pendiente" : c.estado === "convertida" ? "🟢 Convertida" : "🔴 Anulada";
    div.innerHTML = `<strong>${formatearNumero(c.numero_secuencial, c.creado_en)}</strong><span>${c.cliente_nombre} · $${Number(c.total).toFixed(2)} · ${estadoTexto}</span>`;
    div.addEventListener("click", () => mostrarDetalleCot(c));
    resultadosBuscarCot.appendChild(div);
  });
});

function mostrarDetalleCot(cot) {
  cotizacionSeleccionada = cot;
  document.getElementById("bcNumero").textContent = formatearNumero(cot.numero_secuencial, cot.creado_en);
  document.getElementById("bcFecha").textContent = new Date(cot.creado_en).toLocaleDateString("es-DO");
  document.getElementById("bcCliente").textContent = cot.cliente_nombre;
  document.getElementById("bcTotal").textContent = "$" + Number(cot.total).toFixed(2);

  const estadoTexto = cot.estado === "pendiente" ? "🟡 Pendiente" : cot.estado === "convertida" ? "🟢 Convertida a factura" : "🔴 Anulada";
  document.getElementById("bcEstado").textContent = estadoTexto;

  document.getElementById("btnConvertirFactura").style.display = cot.estado === "pendiente" ? "block" : "none";

  bcMensaje.textContent = "";
  bcPasoBuscar.style.display = "none";
  bcPasoDetalle.style.display = "block";
}

document.getElementById("btnReimprimirCot").addEventListener("click", async () => {
  bcMensaje.textContent = "Preparando cotización...";

  const { data: items, error } = await supabaseClient
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacionSeleccionada.id);

  if (error) {
    bcMensaje.textContent = "Error al cargar productos: " + error.message;
    return;
  }

  const itemsFormato = items.map((i) => ({
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: Number(i.precio_unitario)
  }));

  const datosExtra = {
    cedula: cotizacionSeleccionada.cliente_cedula,
    whatsapp: cotizacionSeleccionada.cliente_whatsapp,
    direccion: cotizacionSeleccionada.cliente_direccion,
    sector: cotizacionSeleccionada.cliente_sector,
    referencia: cotizacionSeleccionada.cliente_referencia
  };

  overlayBuscarCot.style.display = "none";
  mostrarCotizacionImpresa(
    cotizacionSeleccionada,
    cotizacionSeleccionada.cliente_nombre,
    Number(cotizacionSeleccionada.subtotal),
    Number(cotizacionSeleccionada.itbis),
    Number(cotizacionSeleccionada.total),
    datosExtra,
    cotizacionSeleccionada.vigencia_dias,
    itemsFormato
  );
});

document.getElementById("btnConvertirFactura").addEventListener("click", async () => {
  if (!confirm("¿Convertir esta cotización en una factura real? Esto descontará el inventario.")) return;

  bcMensaje.textContent = "Convirtiendo a factura...";

  const { data: items, error: errorItems } = await supabaseClient
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacionSeleccionada.id);

  if (errorItems) {
    bcMensaje.textContent = "Error al cargar productos: " + errorItems.message;
    return;
  }

  const { data: facturaCreada, error: errorFactura } = await supabaseClient
    .from("facturas")
    .insert({
      tipo_comprobante: "E32",
      cliente_id: cotizacionSeleccionada.cliente_id,
      cliente_nombre: cotizacionSeleccionada.cliente_nombre,
      cliente_cedula: cotizacionSeleccionada.cliente_cedula,
      cliente_whatsapp: cotizacionSeleccionada.cliente_whatsapp,
      cliente_direccion: cotizacionSeleccionada.cliente_direccion,
      cliente_sector: cotizacionSeleccionada.cliente_sector,
      cliente_referencia: cotizacionSeleccionada.cliente_referencia,
      subtotal: cotizacionSeleccionada.subtotal,
      itbis: cotizacionSeleccionada.itbis,
      total: cotizacionSeleccionada.total,
      forma_pago: "Efectivo"
    })
    .select()
    .single();

  if (errorFactura) {
    bcMensaje.textContent = "Error al crear la factura: " + errorFactura.message;
    return;
  }

  const itemsFactura = items.map((i) => ({
    factura_id: facturaCreada.id,
    producto_id: i.producto_id,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.subtotal
  }));

  await supabaseClient.from("factura_items").insert(itemsFactura);

  for (const item of items) {
    if (!item.producto_id) continue;
    const { data: prod } = await supabaseClient.from("productos").select("existencia").eq("id", item.producto_id).single();
    if (prod) {
      await supabaseClient.from("productos").update({ existencia: Math.max(0, prod.existencia - item.cantidad) }).eq("id", item.producto_id);
    }
  }

  await supabaseClient
    .from("cotizaciones")
    .update({ estado: "convertida", factura_id: facturaCreada.id })
    .eq("id", cotizacionSeleccionada.id);

  overlayBuscarCot.style.display = "none";
  alert("¡Listo! Se generó la Factura #" + facturaCreada.numero_secuencial + " a partir de esta cotización. Puedes reimprimirla desde el módulo de Facturación (Buscar / Reimprimir Factura).");
});

// ================= REGISTRAR CLIENTE NUEVO =================
const overlayNuevoCliente = document.getElementById("overlayNuevoCliente");
const ncMensaje = document.getElementById("ncMensaje");

document.getElementById("btnAbrirNuevoCliente").addEventListener("click", () => {
  document.getElementById("ncNombre").value = "";
  document.getElementById("ncCedula").value = "";
  document.getElementById("ncWhatsapp").value = "";
  document.getElementById("ncDireccion").value = "";
  document.getElementById("ncSector").value = "";
  document.getElementById("ncReferencia").value = "";
  ncMensaje.textContent = "";
  overlayNuevoCliente.style.display = "flex";
  document.getElementById("ncNombre").focus();
});

document.getElementById("btnCerrarNuevoCliente").addEventListener("click", () => {
  overlayNuevoCliente.style.display = "none";
});

document.getElementById("btnGuardarNuevoCliente").addEventListener("click", async () => {
  ncMensaje.textContent = "";
  const nombre = document.getElementById("ncNombre").value.trim();

  if (!nombre) {
    ncMensaje.textContent = "El nombre del cliente es obligatorio.";
    return;
  }

  const nuevo = {
    nombre: nombre,
    rnc_cedula: document.getElementById("ncCedula").value.trim() || null,
    whatsapp: document.getElementById("ncWhatsapp").value.trim() || null,
    direccion: document.getElementById("ncDireccion").value.trim() || null,
    sector: document.getElementById("ncSector").value.trim() || null,
    referencia: document.getElementById("ncReferencia").value.trim() || null
  };

  const { data, error } = await supabaseClient.from("clientes").insert(nuevo).select().single();

  if (error) {
    ncMensaje.textContent = "Error al guardar: " + error.message;
    return;
  }

  overlayNuevoCliente.style.display = "none";
  alert("Cliente \"" + nombre + "\" registrado correctamente.");

  nombreCliente.value = data.nombre;
  clienteCedula.value = data.rnc_cedula || "";
  clienteWhatsapp.value = data.whatsapp || "";
  clienteDireccion.value = data.direccion || "";
  clienteSector.value = data.sector || "";
  clienteReferencia.value = data.referencia || "";
  clienteSeleccionadoId = data.id;
});
