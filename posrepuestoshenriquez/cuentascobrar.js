verificarAccesoModulo(["cuentaporcobrar"]);

function formatearMonto(numero) {
  return "$" + Number(numero).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const cuerpoCuentas = document.getElementById("cuerpoCuentas");
const buscadorCuentas = document.getElementById("buscadorCuentas");

let facturasCache = [];

async function cargarCuentas() {
  const { data, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("forma_pago", "Crédito")
    .eq("estado", "activa")
    .order("creado_en", { ascending: false });

  if (error) return;

  facturasCache = data.filter((f) => Number(f.total) - Number(f.monto_abonado) > 0.01);
  renderCuentas(facturasCache);
  actualizarResumen(facturasCache);
}

function renderCuentas(lista) {
  cuerpoCuentas.innerHTML = "";
  const hoy = new Date();

  if (lista.length === 0) {
    cuerpoCuentas.innerHTML = "<tr><td colspan='8' class='sin-datos'>No hay cuentas por cobrar pendientes.</td></tr>";
    return;
  }

  lista.forEach((f) => {
    const saldo = Number(f.total) - Number(f.monto_abonado);
    const dias = Math.floor((hoy - new Date(f.creado_en)) / (1000 * 60 * 60 * 24));
    const vencida = dias > 30;

    const fila = document.createElement("tr");
    if (vencida) fila.classList.add("cc-vencida");

    fila.innerHTML = `
      <td>${f.cliente_nombre}</td>
      <td>#${f.numero_secuencial}</td>
      <td>${new Date(f.creado_en).toLocaleDateString("es-DO")}</td>
      <td>${formatearMonto(f.total)}</td>
      <td>${formatearMonto(f.monto_abonado)}</td>
      <td class="cc-saldo-monto">${formatearMonto(saldo)}</td>
      <td>${dias} días${vencida ? " ⚠️" : ""}</td>
      <td><button class="btn-abonar" data-id="${f.id}">Abonar</button></td>
    `;
    cuerpoCuentas.appendChild(fila);
  });

  document.querySelectorAll(".btn-abonar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const factura = facturasCache.find((f) => f.id === btn.dataset.id);
      abrirModalPago(factura);
    });
  });
}

function actualizarResumen(lista) {
  let totalPendiente = 0;
  let totalVencidas = 0;
  const clientes = new Set();
  const hoy = new Date();

  lista.forEach((f) => {
    const saldo = Number(f.total) - Number(f.monto_abonado);
    totalPendiente += saldo;
    clientes.add(f.cliente_nombre);
    const dias = Math.floor((hoy - new Date(f.creado_en)) / (1000 * 60 * 60 * 24));
    if (dias > 30) totalVencidas += saldo;
  });

  document.getElementById("totalPendiente").textContent = formatearMonto(totalPendiente);
  document.getElementById("totalVencidas").textContent = formatearMonto(totalVencidas);
  document.getElementById("totalClientes").textContent = clientes.size;
}

buscadorCuentas.addEventListener("input", () => {
  const texto = buscadorCuentas.value.toLowerCase();
  renderCuentas(facturasCache.filter((f) => f.cliente_nombre.toLowerCase().includes(texto)));
});

// ================= REGISTRAR ABONO =================
const overlayPago = document.getElementById("overlayPago");
const pgMensaje = document.getElementById("pgMensaje");
let facturaSeleccionadaPago = null;

function abrirModalPago(factura) {
  facturaSeleccionadaPago = factura;
  const saldo = Number(factura.total) - Number(factura.monto_abonado);

  document.getElementById("pgCliente").textContent = factura.cliente_nombre;
  document.getElementById("pgFactura").textContent = "#" + factura.numero_secuencial;
  document.getElementById("pgTotal").textContent = formatearMonto(factura.total);
  document.getElementById("pgAbonado").textContent = formatearMonto(factura.monto_abonado);
  document.getElementById("pgSaldo").textContent = formatearMonto(saldo);
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
  const saldo = Number(facturaSeleccionadaPago.total) - Number(facturaSeleccionadaPago.monto_abonado);

  if (monto <= 0) {
    pgMensaje.textContent = "Ingresa un monto válido.";
    return;
  }
  if (monto > saldo + 0.01) {
    pgMensaje.textContent = "El monto no puede ser mayor al saldo pendiente (" + formatearMonto(saldo) + ").";
    return;
  }

  const formaPago = document.getElementById("pgFormaPago").value;

  const { error: errorAbono } = await supabaseClient.from("abonos").insert({
    factura_id: facturaSeleccionadaPago.id,
    monto: monto,
    forma_pago: formaPago
  });

  if (errorAbono) {
    pgMensaje.textContent = "Error al registrar el abono: " + errorAbono.message;
    return;
  }

  const nuevoMontoAbonado = Number(facturaSeleccionadaPago.monto_abonado) + monto;

  const { error: errorUpdate } = await supabaseClient
    .from("facturas")
    .update({ monto_abonado: nuevoMontoAbonado })
    .eq("id", facturaSeleccionadaPago.id);

  if (errorUpdate) {
    pgMensaje.textContent = "El abono se guardó, pero hubo un error al actualizar el saldo: " + errorUpdate.message;
    return;
  }

  const nuevoSaldo = Number(facturaSeleccionadaPago.total) - nuevoMontoAbonado;
  overlayPago.style.display = "none";
  alert("Abono registrado.\n\nCliente: " + facturaSeleccionadaPago.cliente_nombre + "\nMonto abonado: " + formatearMonto(monto) + "\nNuevo saldo: " + formatearMonto(nuevoSaldo));

  cargarCuentas();
});

cargarCuentas();
