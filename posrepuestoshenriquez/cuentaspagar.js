verificarAccesoModulo(["cuentaporpagar", "proveedores"]);

const mensajeProveedor = document.getElementById("mensajeProveedor");
const mensajeCuenta = document.getElementById("mensajeCuenta");
const cuerpoCuentas = document.getElementById("cuerpoCuentas");
const buscadorCuentas = document.getElementById("buscadorCuentas");
const cpProveedor = document.getElementById("cpProveedor");
const resultadosProveedor = document.getElementById("resultadosProveedor");

let cuentasCache = [];
let proveedorSeleccionadoId = null;

document.getElementById("cpFecha").value = new Date().toISOString().slice(0, 10);

// ================= PROVEEDORES =================
document.getElementById("btnGuardarProveedor").addEventListener("click", async () => {
  mensajeProveedor.textContent = "";
  const nombre = document.getElementById("provNombre").value.trim();

  if (!nombre) {
    mensajeProveedor.textContent = "El nombre del proveedor es obligatorio.";
    return;
  }

  const nuevo = {
    nombre: nombre,
    telefono: document.getElementById("provTelefono").value.trim() || null,
    rnc: document.getElementById("provRnc").value.trim() || null,
    direccion: document.getElementById("provDireccion").value.trim() || null
  };

  const { error } = await supabaseClient.from("proveedores").insert(nuevo);

  if (error) {
    mensajeProveedor.textContent = "Error: " + error.message;
  } else {
    document.getElementById("provNombre").value = "";
    document.getElementById("provTelefono").value = "";
    document.getElementById("provRnc").value = "";
    document.getElementById("provDireccion").value = "";
    mensajeProveedor.textContent = "✔ Proveedor guardado.";
    mensajeProveedor.style.color = "#16a34a";
    setTimeout(() => { mensajeProveedor.textContent = ""; mensajeProveedor.style.color = "#b00020"; }, 2500);
  }
});

cpProveedor.addEventListener("input", async () => {
  proveedorSeleccionadoId = null;
  const texto = cpProveedor.value.trim();
  resultadosProveedor.innerHTML = "";
  if (texto.length < 2) return;

  const { data, error } = await supabaseClient
    .from("proveedores")
    .select("*")
    .ilike("nombre", `%${texto}%`)
    .limit(6);

  if (error || !data || data.length === 0) return;

  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "prov-item";
    div.innerHTML = `<strong>${p.nombre}</strong>${p.telefono || ""}`;
    div.addEventListener("click", () => {
      cpProveedor.value = p.nombre;
      proveedorSeleccionadoId = p.id;
      resultadosProveedor.innerHTML = "";
    });
    resultadosProveedor.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".campo-buscador-wrap")) resultadosProveedor.innerHTML = "";
});

// ================= CUENTAS POR PAGAR =================
document.getElementById("btnGuardarCuenta").addEventListener("click", async () => {
  mensajeCuenta.textContent = "";

  const proveedorNombre = cpProveedor.value.trim();
  const monto = parseFloat(document.getElementById("cpMonto").value) || 0;

  if (!proveedorNombre) {
    mensajeCuenta.textContent = "Escribe o selecciona un proveedor.";
    return;
  }
  if (monto <= 0) {
    mensajeCuenta.textContent = "El monto debe ser mayor a cero.";
    return;
  }

  const nuevaCuenta = {
    proveedor_id: proveedorSeleccionadoId,
    proveedor_nombre: proveedorNombre,
    ncf: document.getElementById("cpNcf").value.trim() || null,
    fecha: document.getElementById("cpFecha").value,
    fecha_vencimiento: document.getElementById("cpVencimiento").value || null,
    monto: monto
  };

  const { error } = await supabaseClient.from("cuentas_pagar").insert(nuevaCuenta);

  if (error) {
    mensajeCuenta.textContent = "Error: " + error.message;
  } else {
    cpProveedor.value = "";
    document.getElementById("cpNcf").value = "";
    document.getElementById("cpVencimiento").value = "";
    document.getElementById("cpMonto").value = "";
    proveedorSeleccionadoId = null;
    cargarCuentas();
  }
});

async function cargarCuentas() {
  const { data, error } = await supabaseClient
    .from("cuentas_pagar")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) return;
  cuentasCache = data;
  renderCuentas(cuentasCache);
  actualizarResumen(cuentasCache);
}

function renderCuentas(lista) {
  cuerpoCuentas.innerHTML = "";
  const hoy = new Date().toISOString().slice(0, 10);

  lista.forEach((c) => {
    const saldo = Number(c.monto) - Number(c.monto_pagado);
    const vencida = c.fecha_vencimiento && c.fecha_vencimiento < hoy && saldo > 0.01;
    const fila = document.createElement("tr");
    if (vencida) fila.classList.add("cp-vencida");

    const vencTexto = c.fecha_vencimiento ? new Date(c.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-DO") : "—";

    fila.innerHTML = `
      <td>${c.proveedor_nombre}</td>
      <td>${c.ncf || "—"}</td>
      <td>${vencTexto}${vencida ? " ⚠️" : ""}</td>
      <td>$${Number(c.monto).toFixed(2)}</td>
      <td>$${Number(c.monto_pagado).toFixed(2)}</td>
      <td class="cp-saldo-monto">$${saldo.toFixed(2)}</td>
      <td>${saldo > 0.01 ? `<button class="btn-pagar" data-id="${c.id}">Pagar</button>` : `<span class="tag-pagada">Pagada</span>`}</td>
    `;
    cuerpoCuentas.appendChild(fila);
  });

  document.querySelectorAll(".btn-pagar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cuenta = cuentasCache.find((c) => c.id === btn.dataset.id);
      abrirModalPago(cuenta);
    });
  });
}

function actualizarResumen(lista) {
  const hoy = new Date().toISOString().slice(0, 10);
  let totalPendiente = 0;
  let totalVencidas = 0;
  const proveedoresConDeuda = new Set();

  lista.forEach((c) => {
    const saldo = Number(c.monto) - Number(c.monto_pagado);
    if (saldo > 0.01) {
      totalPendiente += saldo;
      proveedoresConDeuda.add(c.proveedor_nombre);
      if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) {
        totalVencidas += saldo;
      }
    }
  });

  document.getElementById("totalPendiente").textContent = "$" + totalPendiente.toFixed(2);
  document.getElementById("totalVencidas").textContent = "$" + totalVencidas.toFixed(2);
  document.getElementById("totalProveedores").textContent = proveedoresConDeuda.size;
}

buscadorCuentas.addEventListener("input", () => {
  const texto = buscadorCuentas.value.toLowerCase();
  const filtradas = cuentasCache.filter((c) => c.proveedor_nombre.toLowerCase().includes(texto));
  renderCuentas(filtradas);
});

// ================= REGISTRAR PAGO =================
const overlayPago = document.getElementById("overlayPago");
const pgMensaje = document.getElementById("pgMensaje");
let cuentaSeleccionadaPago = null;

function abrirModalPago(cuenta) {
  cuentaSeleccionadaPago = cuenta;
  const saldo = Number(cuenta.monto) - Number(cuenta.monto_pagado);

  document.getElementById("pgProveedor").textContent = cuenta.proveedor_nombre;
  document.getElementById("pgNcf").textContent = cuenta.ncf || "—";
  document.getElementById("pgMontoTotal").textContent = "$" + Number(cuenta.monto).toFixed(2);
  document.getElementById("pgPagado").textContent = "$" + Number(cuenta.monto_pagado).toFixed(2);
  document.getElementById("pgSaldo").textContent = "$" + saldo.toFixed(2);
  document.getElementById("pgMonto").value = "";
  pgMensaje.textContent = "";

  overlayPago.style.display = "flex";
}

document.getElementById("btnCerrarPago").addEventListener("click", () => {
  overlayPago.style.display = "none";
});

document.getElementById("btnConfirmarPago").addEventListener("click", async () => {
  pgMensaje.textContent = "";
  const monto = parseFloat(document.getElementById("pgMonto").value) || 0;
  const saldo = Number(cuentaSeleccionadaPago.monto) - Number(cuentaSeleccionadaPago.monto_pagado);

  if (monto <= 0) {
    pgMensaje.textContent = "Ingresa un monto válido.";
    return;
  }
  if (monto > saldo + 0.01) {
    pgMensaje.textContent = "El monto no puede ser mayor al saldo pendiente ($" + saldo.toFixed(2) + ").";
    return;
  }

  const formaPago = document.getElementById("pgFormaPago").value;

  const { error: errorPago } = await supabaseClient.from("pagos_proveedor").insert({
    cuenta_pagar_id: cuentaSeleccionadaPago.id,
    monto: monto,
    forma_pago: formaPago
  });

  if (errorPago) {
    pgMensaje.textContent = "Error al registrar el pago: " + errorPago.message;
    return;
  }

  const nuevoMontoPagado = Number(cuentaSeleccionadaPago.monto_pagado) + monto;
  const nuevoEstado = nuevoMontoPagado >= Number(cuentaSeleccionadaPago.monto) - 0.01 ? "pagada" : "pendiente";

  const { error: errorUpdate } = await supabaseClient
    .from("cuentas_pagar")
    .update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado })
    .eq("id", cuentaSeleccionadaPago.id);

  if (errorUpdate) {
    pgMensaje.textContent = "El pago se guardó, pero hubo un error al actualizar el saldo: " + errorUpdate.message;
    return;
  }

  overlayPago.style.display = "none";
  alert("Pago registrado.\n\nProveedor: " + cuentaSeleccionadaPago.proveedor_nombre + "\nMonto pagado: $" + monto.toFixed(2) + "\nNuevo saldo: $" + (Number(cuentaSeleccionadaPago.monto) - nuevoMontoPagado).toFixed(2));

  cargarCuentas();
});

cargarCuentas();
