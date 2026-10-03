verificarAccesoModulo(["facturacion", "ventas"]);

const buscadorProd = document.getElementById("buscadorProd");
const resultadosProd = document.getElementById("resultadosProd");
const cuerpoCarrito = document.getElementById("cuerpoCarrito");
const txtSubtotal = document.getElementById("txtSubtotal");
const txtItbis = document.getElementById("txtItbis");
const txtTotal = document.getElementById("txtTotal");
const chkAplicarItbis = document.getElementById("chkAplicarItbis");
const mensajeFactura = document.getElementById("mensajeFactura");
const btnGenerarFactura = document.getElementById("btnGenerarFactura");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const fechaFactura = document.getElementById("fechaFactura");

const nombreCliente = document.getElementById("nombreCliente");
const resultadosCliente = document.getElementById("resultadosCliente");
const btnToggleDatosCliente = document.getElementById("btnToggleDatosCliente");
const panelDatosCliente = document.getElementById("panelDatosCliente");
const clienteCedula = document.getElementById("clienteCedula");
const clienteWhatsapp = document.getElementById("clienteWhatsapp");
const clienteDireccion = document.getElementById("clienteDireccion");
const clienteSector = document.getElementById("clienteSector");
const clienteReferencia = document.getElementById("clienteReferencia");

const statusItems = document.getElementById("statusItems");
const statusCondicion = document.getElementById("statusCondicion");
const statusPago = document.getElementById("statusPago");

let carrito = [];
let formaPagoSeleccionada = "Efectivo";
let condicionSeleccionada = "Contado";
let clienteSeleccionadoId = null;

// Arma el número de factura: consecutivo + fecha + hora exacta de emisión (igual para cualquier tipo de comprobante)
function formatearNumeroFactura(numeroSecuencial, creadoEn) {
  const f = new Date(creadoEn);
  const pad = (n) => String(n).padStart(2, "0");
  const consecutivo = String(numeroSecuencial).padStart(8, "0");
  const fecha = f.getFullYear() + pad(f.getMonth() + 1) + pad(f.getDate());
  const hora = pad(f.getHours()) + pad(f.getMinutes()) + pad(f.getSeconds());
  return consecutivo + "-" + fecha + "-" + hora;
}

// Formatea un monto con separador de miles, ej: 1000 -> $1,000.00
function formatearMonto(numero) {
  return "$" + Number(numero).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fecha de hoy en la barra superior
fechaFactura.textContent = new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

renderCarrito();

// El ITBIS viene APAGADO por defecto (checkbox sin marcar en el HTML).
// Al marcar/desmarcar, recalcula los totales en pantalla al instante.
chkAplicarItbis.addEventListener("change", () => {
  const { total } = calcularTotales();
  // Si el modal de confirmar pago está abierto, actualiza el total ahí también
  if (overlayPago.style.display === "flex") {
    pagoTotal.textContent = formatearMonto(total);
  }
});

// Carga los datos de la empresa desde Configuración y los aplica a los documentos imprimibles
async function cargarDatosEmpresaImpresion() {
  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) return;

  const nombre = data.nombre_empresa || "Ingeniería & Tecnología Henríquez";
  const telefono = data.telefono_empresa ? "Tel: " + data.telefono_empresa : "";

  document.getElementById("pfEmpresaNombre").textContent = nombre;
  if (telefono) document.getElementById("pfEmpresaTelefono").textContent = telefono;
  if (data.eslogan_empresa) {
    document.getElementById("pfEmpresaEslogan").textContent = data.eslogan_empresa;
    document.getElementById("pfEmpresaEslogan").style.display = "block";
  }
  if (data.rnc_empresa) {
    document.getElementById("pfEmpresaRnc").textContent = "RNC: " + data.rnc_empresa;
    document.getElementById("pfEmpresaRnc").style.display = "block";
  }

  if (data.logo_url) {
    document.getElementById("pfLogo").src = data.logo_url;
    document.getElementById("pfLogo").style.display = "block";
    document.getElementById("raLogo").src = data.logo_url;
    document.getElementById("raLogo").style.display = "block";
  }

  if (data.link_qr) {
    const urlQr = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=" + encodeURIComponent(data.link_qr);
    document.getElementById("pfQr").src = urlQr;
    document.getElementById("pfQrContenedor").style.display = "block";
  }

  document.getElementById("raEmpresaNombre").textContent = nombre;
  if (telefono) document.getElementById("raEmpresaTelefono").textContent = telefono;
  if (data.eslogan_empresa) {
    document.getElementById("raEmpresaEslogan").textContent = data.eslogan_empresa;
    document.getElementById("raEmpresaEslogan").style.display = "block";
  }
  if (data.rnc_empresa) {
    document.getElementById("raEmpresaRnc").textContent = "RNC: " + data.rnc_empresa;
    document.getElementById("raEmpresaRnc").style.display = "block";
  }
}
cargarDatosEmpresaImpresion();

// Muestra en el encabezado el próximo número de factura que se va a generar
async function actualizarProximoNumero() {
  const badge = document.getElementById("proximoNumeroBadge");
  const { data, error } = await supabaseClient
    .from("facturas")
    .select("numero_secuencial")
    .order("numero_secuencial", { ascending: false })
    .limit(1);

  if (error) return;

  const ultimo = (data && data.length > 0) ? data[0].numero_secuencial : 0;
  const siguiente = ultimo + 1;
  badge.textContent = "Próxima Factura: #" + String(siguiente).padStart(8, "0");
}
actualizarProximoNumero();

// ---------- Mostrar/ocultar datos adicionales del cliente ----------
btnToggleDatosCliente.addEventListener("click", () => {
  panelDatosCliente.style.display = panelDatosCliente.style.display === "none" ? "grid" : "none";
});

// ---------- Buscar cliente existente mientras escribe ----------
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
      if (c.whatsapp || c.direccion || c.sector || c.referencia || c.rnc_cedula) {
        panelDatosCliente.style.display = "grid";
      }
    });
    resultadosCliente.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".campo-cliente-wrap")) resultadosCliente.innerHTML = "";
});

// ---------- Toggle de forma de pago ----------
document.querySelectorAll("#pagoToggle .toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#pagoToggle .toggle-btn").forEach((b) => b.classList.remove("activo"));
    btn.classList.add("activo");
    formaPagoSeleccionada = btn.dataset.pago;
    statusPago.textContent = "💵 " + formaPagoSeleccionada;
  });
});

// ---------- Toggle de condición (Contado/Crédito) ----------
document.querySelectorAll("#condicionToggle .toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#condicionToggle .toggle-btn").forEach((b) => b.classList.remove("activo"));
    btn.classList.add("activo");
    condicionSeleccionada = btn.dataset.condicion;
    statusCondicion.textContent = (condicionSeleccionada === "Crédito" ? "🟠 " : "🟢 ") + condicionSeleccionada;
    if (condicionSeleccionada === "Crédito") {
      panelDatosCliente.style.display = "grid";
    }
  });
});

// ---------- Buscador de productos ----------
buscadorProd.addEventListener("input", async () => {
  const texto = buscadorProd.value.trim();
  resultadosProd.innerHTML = "";
  if (texto.length < 2) return;

  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .or(`descripcion.ilike.%${texto}%,marca.ilike.%${texto}%,codigo_manual.ilike.%${texto}%,codigo_barras.ilike.%${texto}%,referencia.ilike.%${texto}%`)
    .limit(8);

  if (error) { resultadosProd.innerHTML = "Error: " + error.message; return; }

  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "resultado-item";
    div.innerHTML = `<strong>${p.descripcion}</strong>${p.referencia ? " — Ref: " + p.referencia : ""}<br>${formatearMonto(p.precio_venta)} — Existencia: ${p.existencia}`;
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
      referencia: producto.referencia || "—",
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
      fila.innerHTML = `<td class="col-num">${i}</td><td colspan="7"></td>`;
      cuerpoCarrito.appendChild(fila);
    }
  }

  carrito.forEach((item, index) => {
    const subtotal = item.precio_unitario * item.cantidad;
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td>${item.descripcion}</td>
      <td>${item.referencia || "—"}</td>
      <td>${item.codigo}</td>
      <td><input type="number" class="cant-input" min="1" value="${item.cantidad}" data-index="${index}"></td>
      <td class="monto-negrita">${formatearMonto(item.precio_unitario)}</td>
      <td class="monto-negrita">${formatearMonto(subtotal)}</td>
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

// El ITBIS solo se aplica si el interruptor "Aplicar ITBIS (18%)" está marcado.
// Por defecto viene apagado (desmarcado en el HTML), así que una factura
// nueva sale sin ITBIS a menos que se active a propósito.
function calcularTotales() {
  const subtotal = carrito.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
  const aplicarItbis = chkAplicarItbis.checked;
  const itbis = aplicarItbis ? subtotal * 0.18 : 0;
  const total = subtotal + itbis;
  txtSubtotal.textContent = formatearMonto(subtotal);
  txtItbis.textContent = formatearMonto(itbis);
  txtTotal.textContent = formatearMonto(total);
  return { subtotal, itbis, total };
}

// ---------- Cancelar venta actual ----------
btnCancelarVenta.addEventListener("click", () => {
  if (carrito.length === 0) return;
  if (confirm("¿Cancelar esta venta y vaciar el carrito?")) {
    carrito = [];
    chkAplicarItbis.checked = false;
    renderCarrito();
    mensajeFactura.textContent = "";
  }
});

// ---------- Paso 1: al pulsar "Facturar", abrir modal de confirmación de pago ----------
const overlayPago = document.getElementById("overlayPago");
const pagoTotal = document.getElementById("pagoTotal");
const montoRecibido = document.getElementById("montoRecibido");
const pagoCambio = document.getElementById("pagoCambio");
const pagoCambioLinea = document.querySelector(".pago-cambio");
const pagoMensaje = document.getElementById("pagoMensaje");

btnGenerarFactura.addEventListener("click", () => {
  mensajeFactura.textContent = "";

  if (carrito.length === 0) {
    mensajeFactura.textContent = "Agrega al menos un producto al carrito.";
    return;
  }

  // Si es a crédito, no se pide monto recibido: se factura directo
  if (condicionSeleccionada === "Crédito") {
    generarFacturaFinal(0, 0);
    return;
  }

  const { total } = calcularTotales();
  pagoTotal.textContent = formatearMonto(total);
  montoRecibido.value = "";
  pagoCambio.textContent = "$0.00";
  pagoCambioLinea.classList.remove("insuficiente");
  pagoMensaje.textContent = "";
  overlayPago.style.display = "flex";
  montoRecibido.focus();
});

montoRecibido.addEventListener("input", () => {
  const { total } = calcularTotales();
  const recibido = parseFloat(montoRecibido.value) || 0;
  const cambio = recibido - total;
  pagoCambio.textContent = formatearMonto(Math.abs(cambio));
  if (cambio < 0) {
    pagoCambioLinea.classList.add("insuficiente");
    pagoCambio.textContent = "Falta " + formatearMonto(Math.abs(cambio));
  } else {
    pagoCambioLinea.classList.remove("insuficiente");
  }
});

// Presionar Enter en "Monto recibido" ejecuta "Confirmar y Facturar", nunca "Cancelar"
montoRecibido.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btnConfirmarPago").click();
  }
});

document.getElementById("btnCancelarPago").addEventListener("click", () => {
  overlayPago.style.display = "none";
});

document.getElementById("btnConfirmarPago").addEventListener("click", () => {
  const { total } = calcularTotales();
  const recibido = parseFloat(montoRecibido.value) || 0;

  if (recibido < total) {
    pagoMensaje.textContent = "El monto recibido es menor que el total.";
    return;
  }

  const cambio = recibido - total;
  overlayPago.style.display = "none";
  generarFacturaFinal(recibido, cambio);
});

// ---------- Paso 2: generar la factura de verdad ----------
async function generarFacturaFinal(montoRecibidoFinal, cambioFinal) {
  const { subtotal, itbis, total } = calcularTotales();
  const cliente = nombreCliente.value || "Consumidor Final";
  const tipoComprobante = document.getElementById("tipoComprobante").value;
  const formaPagoFinal = condicionSeleccionada === "Crédito" ? "Crédito" : formaPagoSeleccionada;

  const datosExtra = {
    cedula: clienteCedula.value.trim(),
    whatsapp: clienteWhatsapp.value.trim(),
    direccion: clienteDireccion.value.trim(),
    sector: clienteSector.value.trim(),
    referencia: clienteReferencia.value.trim()
  };
  const hayDatosExtra = datosExtra.cedula || datosExtra.whatsapp || datosExtra.direccion || datosExtra.sector || datosExtra.referencia;

  let clienteIdFinal = clienteSeleccionadoId;

  if (!clienteIdFinal && cliente !== "Consumidor Final" && (hayDatosExtra || condicionSeleccionada === "Crédito")) {
    const { data: nuevoCliente, error: errorCliente } = await supabaseClient
      .from("clientes")
      .insert({
        nombre: cliente,
        rnc_cedula: datosExtra.cedula || null,
        whatsapp: datosExtra.whatsapp || null,
        direccion: datosExtra.direccion || null,
        sector: datosExtra.sector || null,
        referencia: datosExtra.referencia || null,
        tipo_cliente: condicionSeleccionada === "Crédito" ? "credito" : "contado"
      })
      .select()
      .single();

    if (!errorCliente) clienteIdFinal = nuevoCliente.id;
  }

  const { data: facturaCreada, error: errorFactura } = await supabaseClient
    .from("facturas")
    .insert({
      tipo_comprobante: tipoComprobante,
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
      forma_pago: formaPagoFinal
    })
    .select()
    .single();

  if (errorFactura) {
    mensajeFactura.textContent = "Error al crear factura: " + errorFactura.message;
    return;
  }

  const items = carrito.map((item) => ({
    factura_id: facturaCreada.id,
    producto_id: item.producto_id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.precio_unitario * item.cantidad
  }));

  const { error: errorItems } = await supabaseClient.from("factura_items").insert(items);

  if (errorItems) {
    mensajeFactura.textContent = "Error al guardar detalle: " + errorItems.message;
    return;
  }

  for (const item of carrito) {
    if (!item.producto_id) continue; // Producto Express: no existe en Inventario, no se descuenta existencia
    const { data: prod } = await supabaseClient.from("productos").select("existencia").eq("id", item.producto_id).single();
    if (prod) {
      await supabaseClient.from("productos").update({ existencia: Math.max(0, prod.existencia - item.cantidad) }).eq("id", item.producto_id);
    }
  }

  mostrarFacturaImpresa(facturaCreada, cliente, tipoComprobante, formaPagoFinal, subtotal, itbis, total, datosExtra, montoRecibidoFinal, cambioFinal);
  actualizarProximoNumero();
}

function mostrarFacturaImpresa(factura, cliente, tipo, formaPago, subtotal, itbis, total, datosExtra, montoRecibidoFinal, cambioFinal) {
  document.getElementById("pfTipo").textContent = tipo;
  document.getElementById("pfNumero").textContent = formatearNumeroFactura(factura.numero_secuencial, factura.creado_en);
  document.getElementById("pfFecha").textContent = new Date(factura.creado_en).toLocaleString("es-DO");
  document.getElementById("pfCliente").textContent = cliente;
  document.getElementById("pfSubtotal").textContent = formatearMonto(subtotal);
  document.getElementById("pfItbis").textContent = formatearMonto(itbis);
  document.getElementById("pfTotal").textContent = formatearMonto(total);
  document.getElementById("pfFormaPago").textContent = formaPago;

  if (montoRecibidoFinal !== undefined && montoRecibidoFinal > 0) {
    document.getElementById("pfMontoRecibido").textContent = formatearMonto(montoRecibidoFinal);
    document.getElementById("pfLineaMonto").style.display = "block";
    document.getElementById("pfCambio").textContent = formatearMonto(cambioFinal);
    document.getElementById("pfLineaCambio").style.display = "block";
  } else {
    document.getElementById("pfLineaMonto").style.display = "none";
    document.getElementById("pfLineaCambio").style.display = "none";
  }

  mostrarLineaOpcional("pfLineaCedula", "pfCedula", datosExtra.cedula);
  mostrarLineaOpcional("pfLineaWhatsapp", "pfWhatsapp", datosExtra.whatsapp);
  mostrarLineaOpcional("pfLineaDireccion", "pfDireccion", datosExtra.direccion);
  mostrarLineaOpcional("pfLineaSector", "pfSector", datosExtra.sector);
  mostrarLineaOpcional("pfLineaReferencia", "pfReferencia", datosExtra.referencia);

  const pfCuerpo = document.getElementById("pfCuerpo");
  pfCuerpo.innerHTML = "";
  carrito.forEach((item) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${item.descripcion}</td><td>${item.cantidad}</td><td>${formatearMonto(item.precio_unitario)}</td><td>${formatearMonto(item.precio_unitario * item.cantidad)}</td>`;
    pfCuerpo.appendChild(fila);
  });

  document.getElementById("overlayFactura").style.display = "flex";
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
        .fac-factura-imprimir {
          width: 72mm !important;
          font-size: 9px !important;
          padding: 0 !important;
        }
        .fac-factura-imprimir h2 { font-size: 12px !important; }
        .fac-factura-imprimir table,
        .fac-factura-imprimir th,
        .fac-factura-imprimir td {
          font-size: 8px !important;
          padding: 2px !important;
        }
      }
    `;
  } else {
    styleTag.textContent = `
      @media print {
        @page { size: letter; margin: 20mm; }
        .fac-factura-imprimir {
          width: 100% !important;
          font-size: 12px !important;
          padding: 0 !important;
        }
      }
    `;
  }
}

document.getElementById("btnGuardarSinImprimir").addEventListener("click", () => {
  document.getElementById("overlayFactura").style.display = "none";
  alert("La factura ya quedó guardada en el sistema. Puedes reimprimirla cuando quieras desde \"Buscar / Reimprimir Factura\".");
});

document.getElementById("btnImprimirFactura").addEventListener("click", () => {
  const formato = document.getElementById("formatoImpresion").value;
  aplicarFormatoImpresion(formato);
  window.print();
});

document.getElementById("btnNuevaVenta").addEventListener("click", () => {
  carrito = [];
  chkAplicarItbis.checked = false;
  renderCarrito();
  nombreCliente.value = "Consumidor Final";
  clienteCedula.value = "";
  clienteWhatsapp.value = "";
  clienteDireccion.value = "";
  clienteSector.value = "";
  clienteReferencia.value = "";
  clienteSeleccionadoId = null;
  document.getElementById("overlayFactura").style.display = "none";
  mensajeFactura.textContent = "";
});

// ================= ABONAR A FACTURA DE CRÉDITO =================
const overlayAbono = document.getElementById("overlayAbono");
const abonoPasoBuscar = document.getElementById("abonoPasoBuscar");
const abonoPasoDetalle = document.getElementById("abonoPasoDetalle");
const buscadorAbono = document.getElementById("buscadorAbono");
const resultadosAbono = document.getElementById("resultadosAbono");
const abonoMensaje = document.getElementById("abonoMensaje");

let facturaAbonoSeleccionada = null;

document.getElementById("btnAbrirAbono").addEventListener("click", () => {
  overlayAbono.style.display = "flex";
  abonoPasoBuscar.style.display = "block";
  abonoPasoDetalle.style.display = "none";
  buscadorAbono.value = "";
  resultadosAbono.innerHTML = "";
  buscadorAbono.focus();
});

document.getElementById("btnCerrarAbono").addEventListener("click", () => {
  overlayAbono.style.display = "none";
});

document.getElementById("btnVolverBusqueda").addEventListener("click", () => {
  abonoPasoBuscar.style.display = "block";
  abonoPasoDetalle.style.display = "none";
});

buscadorAbono.addEventListener("input", async () => {
  const texto = buscadorAbono.value.trim();
  resultadosAbono.innerHTML = "";
  if (texto.length < 2) return;

  const { data, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("forma_pago", "Crédito")
    .or(`cliente_nombre.ilike.%${texto}%,cliente_whatsapp.ilike.%${texto}%`)
    .order("creado_en", { ascending: false })
    .limit(15);

  if (error) {
    resultadosAbono.innerHTML = "Error: " + error.message;
    return;
  }

  const pendientes = data.filter((f) => Number(f.total) - Number(f.monto_abonado) > 0.01);

  if (pendientes.length === 0) {
    resultadosAbono.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron facturas a crédito pendientes con ese nombre o teléfono.</p>";
    return;
  }

  pendientes.forEach((f) => {
    const saldo = Number(f.total) - Number(f.monto_abonado);
    const div = document.createElement("div");
    div.className = "abono-item";
    div.innerHTML = `
      <strong>${f.cliente_nombre} — Factura ${formatearNumeroFactura(f.numero_secuencial, f.creado_en)}</strong>
      ${new Date(f.creado_en).toLocaleDateString("es-DO")} · Total: ${formatearMonto(f.total)}
      <br>Saldo pendiente: <span class="abono-item-saldo">${formatearMonto(saldo)}</span>
    `;
    div.addEventListener("click", () => mostrarDetalleAbono(f));
    resultadosAbono.appendChild(div);
  });
});

function mostrarDetalleAbono(factura) {
  facturaAbonoSeleccionada = factura;
  const saldo = Number(factura.total) - Number(factura.monto_abonado);

  document.getElementById("abCliente").textContent = factura.cliente_nombre;
  document.getElementById("abNumero").textContent = formatearNumeroFactura(factura.numero_secuencial, factura.creado_en);
  document.getElementById("abFecha").textContent = new Date(factura.creado_en).toLocaleDateString("es-DO");
  document.getElementById("abTotal").textContent = formatearMonto(factura.total);
  document.getElementById("abAbonado").textContent = formatearMonto(factura.monto_abonado);
  document.getElementById("abSaldo").textContent = formatearMonto(saldo);

  document.getElementById("montoAbono").value = "";
  abonoMensaje.textContent = "";

  abonoPasoBuscar.style.display = "none";
  abonoPasoDetalle.style.display = "block";
}

document.getElementById("btnRegistrarAbono").addEventListener("click", async () => {
  abonoMensaje.textContent = "";
  const monto = parseFloat(document.getElementById("montoAbono").value) || 0;
  const saldo = Number(facturaAbonoSeleccionada.total) - Number(facturaAbonoSeleccionada.monto_abonado);

  if (monto <= 0) {
    abonoMensaje.textContent = "Ingresa un monto válido.";
    return;
  }
  if (monto > saldo + 0.01) {
    abonoMensaje.textContent = "El monto no puede ser mayor al saldo pendiente (" + formatearMonto(saldo) + ").";
    return;
  }

  const formaPagoAbono = document.getElementById("formaPagoAbono").value;

  const { error: errorAbono } = await supabaseClient.from("abonos").insert({
    factura_id: facturaAbonoSeleccionada.id,
    monto: monto,
    forma_pago: formaPagoAbono
  });

  if (errorAbono) {
    abonoMensaje.textContent = "Error al registrar el abono: " + errorAbono.message;
    return;
  }

  const nuevoMontoAbonado = Number(facturaAbonoSeleccionada.monto_abonado) + monto;

  const { error: errorUpdate } = await supabaseClient
    .from("facturas")
    .update({ monto_abonado: nuevoMontoAbonado })
    .eq("id", facturaAbonoSeleccionada.id);

  if (errorUpdate) {
    abonoMensaje.textContent = "El abono se guardó, pero hubo un error al actualizar el saldo: " + errorUpdate.message;
    return;
  }

  const saldoAnterior = Number(facturaAbonoSeleccionada.total) - Number(facturaAbonoSeleccionada.monto_abonado);
  const nuevoSaldo = Number(facturaAbonoSeleccionada.total) - nuevoMontoAbonado;

  document.getElementById("raFecha").textContent = new Date().toLocaleString("es-DO");
  document.getElementById("raCliente").textContent = facturaAbonoSeleccionada.cliente_nombre;
  document.getElementById("raFacturaNumero").textContent = formatearNumeroFactura(facturaAbonoSeleccionada.numero_secuencial, facturaAbonoSeleccionada.creado_en);
  document.getElementById("raTotalFactura").textContent = formatearMonto(facturaAbonoSeleccionada.total);
  document.getElementById("raSaldoAnterior").textContent = formatearMonto(saldoAnterior);
  document.getElementById("raMontoAbonado").textContent = formatearMonto(monto);
  document.getElementById("raFormaPago").textContent = formaPagoAbono;
  document.getElementById("raSaldoNuevo").textContent = formatearMonto(nuevoSaldo);

  overlayAbono.style.display = "none";
  document.getElementById("overlayReciboAbono").style.display = "flex";
});

document.getElementById("btnImprimirAbono").addEventListener("click", () => window.print());

document.getElementById("btnCerrarReciboAbono").addEventListener("click", () => {
  document.getElementById("overlayReciboAbono").style.display = "none";
});
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

// ================= BUSCAR / REIMPRIMIR FACTURA =================
const overlayBuscarFactura = document.getElementById("overlayBuscarFactura");
const bfPasoBuscar = document.getElementById("bfPasoBuscar");
const bfPasoDetalle = document.getElementById("bfPasoDetalle");
const buscadorFactura = document.getElementById("buscadorFactura");
const resultadosBuscarFactura = document.getElementById("resultadosBuscarFactura");
const bfMensaje = document.getElementById("bfMensaje");

let facturaBuscadaSeleccionada = null;

document.getElementById("btnAbrirBuscarFactura").addEventListener("click", () => {
  overlayBuscarFactura.style.display = "flex";
  bfPasoBuscar.style.display = "block";
  bfPasoDetalle.style.display = "none";
  buscadorFactura.value = "";
  resultadosBuscarFactura.innerHTML = "";
  buscadorFactura.focus();
});

document.getElementById("btnCerrarBuscarFactura").addEventListener("click", () => {
  overlayBuscarFactura.style.display = "none";
});

document.getElementById("btnVolverBuscarFactura").addEventListener("click", () => {
  bfPasoBuscar.style.display = "block";
  bfPasoDetalle.style.display = "none";
});

buscadorFactura.addEventListener("input", async () => {
  const texto = buscadorFactura.value.trim();
  resultadosBuscarFactura.innerHTML = "";
  if (texto.length < 1) return;

  let query = supabaseClient.from("facturas").select("*").order("creado_en", { ascending: false }).limit(10);

  const soloNumeros = /^\d+$/.test(texto);
  if (soloNumeros) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.or(`cliente_nombre.ilike.%${texto}%,cliente_whatsapp.ilike.%${texto}%`);
  }

  const { data, error } = await query;

  if (error) {
    resultadosBuscarFactura.innerHTML = "Error: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    resultadosBuscarFactura.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron facturas.</p>";
    return;
  }

  data.forEach((f) => {
    const div = document.createElement("div");
    div.className = "cliente-item";
    div.innerHTML = `<strong>${formatearNumeroFactura(f.numero_secuencial, f.creado_en)}</strong><span>${f.cliente_nombre} · ${new Date(f.creado_en).toLocaleDateString("es-DO")} · ${formatearMonto(f.total)}</span>`;
    div.addEventListener("click", () => mostrarDetalleBuscarFactura(f));
    resultadosBuscarFactura.appendChild(div);
  });
});

function mostrarDetalleBuscarFactura(factura) {
  facturaBuscadaSeleccionada = factura;

  document.getElementById("bfNumero").textContent = formatearNumeroFactura(factura.numero_secuencial, factura.creado_en);
  document.getElementById("bfFecha").textContent = new Date(factura.creado_en).toLocaleString("es-DO");
  document.getElementById("bfTipo").textContent = factura.tipo_comprobante;
  document.getElementById("bfCliente").textContent = factura.cliente_nombre;
  document.getElementById("bfTotal").textContent = formatearMonto(factura.total);
  document.getElementById("bfFormaPago").textContent = factura.forma_pago;

  document.getElementById("bfCedula").value = factura.cliente_cedula || "";
  document.getElementById("bfWhatsapp").value = factura.cliente_whatsapp || "";
  document.getElementById("bfDireccion").value = factura.cliente_direccion || "";
  document.getElementById("bfSector").value = factura.cliente_sector || "";
  document.getElementById("bfReferencia").value = factura.cliente_referencia || "";

  bfMensaje.textContent = "";
  bfPasoBuscar.style.display = "none";
  bfPasoDetalle.style.display = "block";
}

async function guardarCambiosFacturaSeleccionada() {
  const cambios = {
    cliente_cedula: document.getElementById("bfCedula").value.trim() || null,
    cliente_whatsapp: document.getElementById("bfWhatsapp").value.trim() || null,
    cliente_direccion: document.getElementById("bfDireccion").value.trim() || null,
    cliente_sector: document.getElementById("bfSector").value.trim() || null,
    cliente_referencia: document.getElementById("bfReferencia").value.trim() || null
  };

  const { error } = await supabaseClient.from("facturas").update(cambios).eq("id", facturaBuscadaSeleccionada.id);

  if (error) {
    bfMensaje.textContent = "Error al guardar: " + error.message;
    return false;
  }

  Object.assign(facturaBuscadaSeleccionada, cambios);
  return true;
}

document.getElementById("btnGuardarCambiosFactura").addEventListener("click", async () => {
  bfMensaje.textContent = "Guardando...";
  const ok = await guardarCambiosFacturaSeleccionada();
  bfMensaje.textContent = ok ? "✔ Datos actualizados." : bfMensaje.textContent;
});

document.getElementById("btnReimprimirFactura").addEventListener("click", async () => {
  bfMensaje.textContent = "Preparando factura...";
  const ok = await guardarCambiosFacturaSeleccionada();
  if (!ok) return;

  const { data: items, error } = await supabaseClient
    .from("factura_items")
    .select("*")
    .eq("factura_id", facturaBuscadaSeleccionada.id);

  if (error) {
    bfMensaje.textContent = "Error al cargar los productos de la factura: " + error.message;
    return;
  }

  const factura = facturaBuscadaSeleccionada;

  document.getElementById("pfTipo").textContent = factura.tipo_comprobante;
  document.getElementById("pfNumero").textContent = formatearNumeroFactura(factura.numero_secuencial, factura.creado_en);
  document.getElementById("pfFecha").textContent = new Date(factura.creado_en).toLocaleString("es-DO");
  document.getElementById("pfCliente").textContent = factura.cliente_nombre;
  document.getElementById("pfSubtotal").textContent = formatearMonto(factura.subtotal);
  document.getElementById("pfItbis").textContent = formatearMonto(factura.itbis);
  document.getElementById("pfTotal").textContent = formatearMonto(factura.total);
  document.getElementById("pfFormaPago").textContent = factura.forma_pago;

  document.getElementById("pfLineaMonto").style.display = "none";
  document.getElementById("pfLineaCambio").style.display = "none";

  mostrarLineaOpcional("pfLineaCedula", "pfCedula", factura.cliente_cedula);
  mostrarLineaOpcional("pfLineaWhatsapp", "pfWhatsapp", factura.cliente_whatsapp);
  mostrarLineaOpcional("pfLineaDireccion", "pfDireccion", factura.cliente_direccion);
  mostrarLineaOpcional("pfLineaSector", "pfSector", factura.cliente_sector);
  mostrarLineaOpcional("pfLineaReferencia", "pfReferencia", factura.cliente_referencia);

  const pfCuerpo = document.getElementById("pfCuerpo");
  pfCuerpo.innerHTML = "";
  items.forEach((item) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${item.descripcion}</td><td>${item.cantidad}</td><td>${formatearMonto(item.precio_unitario)}</td><td>${formatearMonto(item.subtotal)}</td>`;
    pfCuerpo.appendChild(fila);
  });

  overlayBuscarFactura.style.display = "none";
  document.getElementById("overlayFactura").style.display = "flex";
});

// ================= PAUSAR Y RETOMAR VENTA =================
// Permite dejar a un lado el carrito actual (por ejemplo cuando el
// cliente fue a buscar algo lejos de la caja) para atender a otro
// cliente rápido/express, y luego retomar cualquiera de las ventas
// pausadas con un clic. Se guardan en localStorage para que no se
// pierdan si se recarga la página por accidente.
let ventasPausadas = [];

function cargarVentasPausadas() {
  try {
    const guardado = localStorage.getItem("henriquez_ventas_pausadas");
    ventasPausadas = guardado ? JSON.parse(guardado) : [];
  } catch (e) {
    ventasPausadas = [];
  }
  actualizarBadgePausadas();
}

function guardarVentasPausadasEnStorage() {
  try {
    localStorage.setItem("henriquez_ventas_pausadas", JSON.stringify(ventasPausadas));
  } catch (e) {
    // si falla el guardado local no se detiene la operación
  }
  actualizarBadgePausadas();
}

function actualizarBadgePausadas() {
  const badge = document.getElementById("badgePausadas");
  if (ventasPausadas.length > 0) {
    badge.textContent = ventasPausadas.length;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function capturarEstadoVentaActual(etiqueta) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    etiqueta: etiqueta,
    horaPausada: new Date().toISOString(),
    carrito: JSON.parse(JSON.stringify(carrito)),
    aplicarItbis: chkAplicarItbis.checked,
    cliente: {
      nombre: nombreCliente.value,
      id: clienteSeleccionadoId,
      cedula: clienteCedula.value,
      whatsapp: clienteWhatsapp.value,
      direccion: clienteDireccion.value,
      sector: clienteSector.value,
      referencia: clienteReferencia.value
    },
    tipoComprobante: document.getElementById("tipoComprobante").value,
    formaPago: formaPagoSeleccionada,
    condicion: condicionSeleccionada
  };
}

function limpiarPantallaVenta() {
  carrito = [];
  chkAplicarItbis.checked = false;
  renderCarrito();
  nombreCliente.value = "Consumidor Final";
  clienteCedula.value = "";
  clienteWhatsapp.value = "";
  clienteDireccion.value = "";
  clienteSector.value = "";
  clienteReferencia.value = "";
  clienteSeleccionadoId = null;
  mensajeFactura.textContent = "";
}

cargarVentasPausadas();

document.getElementById("btnPausarVenta").addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("No hay ningún producto en el carrito para pausar.");
    return;
  }

  const etiquetaSugerida = (nombreCliente.value && nombreCliente.value !== "Consumidor Final")
    ? nombreCliente.value
    : "Venta " + (ventasPausadas.length + 1);

  const etiqueta = prompt("Nombre o referencia para identificar esta venta pausada:", etiquetaSugerida);
  if (etiqueta === null) return; // el usuario canceló

  const ventaPausada = capturarEstadoVentaActual(etiqueta.trim() || etiquetaSugerida);
  ventasPausadas.push(ventaPausada);
  guardarVentasPausadasEnStorage();

  limpiarPantallaVenta();

  alert('Venta pausada como "' + ventaPausada.etiqueta + '". Puedes retomarla desde "🗂 Ventas en Pausa".');
});

const overlayVentasPausadas = document.getElementById("overlayVentasPausadas");
const listaVentasPausadas = document.getElementById("listaVentasPausadas");

document.getElementById("btnVerPausadas").addEventListener("click", () => {
  renderListaVentasPausadas();
  overlayVentasPausadas.style.display = "flex";
});

document.getElementById("btnCerrarVentasPausadas").addEventListener("click", () => {
  overlayVentasPausadas.style.display = "none";
});

function renderListaVentasPausadas() {
  listaVentasPausadas.innerHTML = "";

  if (ventasPausadas.length === 0) {
    listaVentasPausadas.innerHTML = "<p style='color:#888; font-size:0.9em; text-align:center; padding:20px 0;'>No hay ventas pausadas.</p>";
    return;
  }

  ventasPausadas.forEach((v) => {
    const subtotalVenta = v.carrito.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
    const totalVenta = subtotalVenta * (v.aplicarItbis ? 1.18 : 1);

    const div = document.createElement("div");
    div.className = "abono-item";
    div.innerHTML = `
      <strong>${v.etiqueta}</strong>
      <span>${v.carrito.length} ${v.carrito.length === 1 ? "producto" : "productos"} · ${formatearMonto(totalVenta)}</span>
      <br><span style="font-size:0.8em; color:#888;">Pausada: ${new Date(v.horaPausada).toLocaleTimeString("es-DO")}</span>
    `;

    const botonesDiv = document.createElement("div");
    botonesDiv.style.display = "flex";
    botonesDiv.style.gap = "8px";
    botonesDiv.style.marginTop = "8px";

    const btnRetomar = document.createElement("button");
    btnRetomar.type = "button";
    btnRetomar.className = "btn-facturar";
    btnRetomar.textContent = "▶ Retomar";
    btnRetomar.addEventListener("click", () => retomarVentaPausada(v.id));

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "btn-cancelar";
    btnEliminar.textContent = "🗑 Eliminar";
    btnEliminar.addEventListener("click", () => {
      if (confirm('¿Eliminar la venta pausada "' + v.etiqueta + '"? Esto no se puede deshacer.')) {
        ventasPausadas = ventasPausadas.filter((x) => x.id !== v.id);
        guardarVentasPausadasEnStorage();
        renderListaVentasPausadas();
      }
    });

    botonesDiv.appendChild(btnRetomar);
    botonesDiv.appendChild(btnEliminar);
    div.appendChild(botonesDiv);
    listaVentasPausadas.appendChild(div);
  });
}

function retomarVentaPausada(id) {
  const venta = ventasPausadas.find((v) => v.id === id);
  if (!venta) return;

  // Si ya hay algo en el carrito actual, esa venta se pausa automáticamente
  // primero para no perderla al cargar la venta que se va a retomar.
  if (carrito.length > 0) {
    if (!confirm("Ya hay productos en el carrito actual. Al retomar esta venta, el carrito actual se pausará automáticamente. ¿Continuar?")) {
      return;
    }
    const etiquetaActual = (nombreCliente.value && nombreCliente.value !== "Consumidor Final")
      ? nombreCliente.value
      : "Venta " + (ventasPausadas.length + 1);
    ventasPausadas.push(capturarEstadoVentaActual(etiquetaActual));
  }

  carrito = JSON.parse(JSON.stringify(venta.carrito));
  chkAplicarItbis.checked = !!venta.aplicarItbis;
  renderCarrito();

  nombreCliente.value = venta.cliente.nombre || "Consumidor Final";
  clienteSeleccionadoId = venta.cliente.id || null;
  clienteCedula.value = venta.cliente.cedula || "";
  clienteWhatsapp.value = venta.cliente.whatsapp || "";
  clienteDireccion.value = venta.cliente.direccion || "";
  clienteSector.value = venta.cliente.sector || "";
  clienteReferencia.value = venta.cliente.referencia || "";

  document.getElementById("tipoComprobante").value = venta.tipoComprobante || "E32";

  document.querySelectorAll("#pagoToggle .toggle-btn").forEach((b) => {
    b.classList.toggle("activo", b.dataset.pago === venta.formaPago);
  });
  formaPagoSeleccionada = venta.formaPago || "Efectivo";
  statusPago.textContent = "💵 " + formaPagoSeleccionada;

  document.querySelectorAll("#condicionToggle .toggle-btn").forEach((b) => {
    b.classList.toggle("activo", b.dataset.condicion === venta.condicion);
  });
  condicionSeleccionada = venta.condicion || "Contado";
  statusCondicion.textContent = (condicionSeleccionada === "Crédito" ? "🟠 " : "🟢 ") + condicionSeleccionada;

  ventasPausadas = ventasPausadas.filter((v2) => v2.id !== id);
  guardarVentasPausadasEnStorage();

  overlayVentasPausadas.style.display = "none";
  mensajeFactura.textContent = "";
}

// ================= PRODUCTO EXPRESS =================
// Permite agregar a la venta actual un producto que NO existe en
// Inventario (código, descripción, cantidad y precio digitados a
// mano). Se guarda con producto_id = null: se contabiliza en el
// total/Cierre de Caja igual que cualquier otro producto, pero no
// descuenta existencia de ningún artículo de Inventario.
const overlayProductoExpress = document.getElementById("overlayProductoExpress");
const peMensaje = document.getElementById("peMensaje");

document.getElementById("btnProductoExpress").addEventListener("click", () => {
  document.getElementById("peReferencia").value = "";
  document.getElementById("peCodigo").value = "";
  document.getElementById("peDescripcion").value = "";
  document.getElementById("peCantidad").value = "1";
  document.getElementById("pePrecio").value = "";
  peMensaje.textContent = "";
  overlayProductoExpress.style.display = "flex";
  document.getElementById("peDescripcion").focus();
});

document.getElementById("btnCerrarProductoExpress").addEventListener("click", () => {
  overlayProductoExpress.style.display = "none";
});

document.getElementById("btnAgregarProductoExpress").addEventListener("click", () => {
  const descripcion = document.getElementById("peDescripcion").value.trim();
  const cantidad = parseInt(document.getElementById("peCantidad").value) || 0;
  const precio = parseFloat(document.getElementById("pePrecio").value);
  const codigo = document.getElementById("peCodigo").value.trim();
  const referencia = document.getElementById("peReferencia").value.trim();

  peMensaje.textContent = "";

  if (!descripcion) {
    peMensaje.textContent = "La descripción es obligatoria.";
    return;
  }
  if (cantidad <= 0) {
    peMensaje.textContent = "La cantidad debe ser mayor a 0.";
    return;
  }
  if (isNaN(precio) || precio < 0) {
    peMensaje.textContent = "Ingresa un precio válido.";
    return;
  }

  carrito.push({
    producto_id: null,
    descripcion: descripcion,
    referencia: referencia || "—",
    codigo: codigo || "EXPRESS",
    precio_unitario: precio,
    cantidad: cantidad
  });

  renderCarrito();
  overlayProductoExpress.style.display = "none";
});
