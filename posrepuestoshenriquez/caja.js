verificarAccesoModulo(["caja"]);

function formatearMonto(numero) {
  return "$" + Number(numero).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const panelAbrirCaja = document.getElementById("panelAbrirCaja");
const panelCajaAbierta = document.getElementById("panelCajaAbierta");
const mensajeApertura = document.getElementById("mensajeApertura");
const mensajeMovimiento = document.getElementById("mensajeMovimiento");
const cuerpoMovimientos = document.getElementById("cuerpoMovimientos");
const cuerpoHistorial = document.getElementById("cuerpoHistorial");

let sesionActual = null;
let tipoMovimientoSeleccionado = "entrada";

async function iniciar() {
  const { data: sesiones, error } = await supabaseClient
    .from("caja_sesiones")
    .select("*")
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .limit(1);

  if (error) return;

  if (sesiones && sesiones.length > 0) {
    sesionActual = sesiones[0];
    panelAbrirCaja.style.display = "none";
    panelCajaAbierta.style.display = "block";
    await cargarMovimientos();
  } else {
    sesionActual = null;
    panelAbrirCaja.style.display = "block";
    panelCajaAbierta.style.display = "none";
  }

  await cargarHistorial();
}

// ================= ABRIR CAJA =================
document.getElementById("btnAbrirCaja").addEventListener("click", async () => {
  mensajeApertura.textContent = "";
  const monto = parseFloat(document.getElementById("montoApertura").value) || 0;

  const { error } = await supabaseClient.from("caja_sesiones").insert({ monto_apertura: monto });

  if (error) {
    mensajeApertura.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("montoApertura").value = "";
  iniciar();
});

// ================= TOGGLE ENTRADA/SALIDA =================
document.getElementById("btnTipoEntrada").addEventListener("click", () => {
  tipoMovimientoSeleccionado = "entrada";
  document.getElementById("btnTipoEntrada").classList.add("activo");
  document.getElementById("btnTipoSalida").classList.remove("activo");
});

document.getElementById("btnTipoSalida").addEventListener("click", () => {
  tipoMovimientoSeleccionado = "salida";
  document.getElementById("btnTipoSalida").classList.add("activo");
  document.getElementById("btnTipoEntrada").classList.remove("activo");
});

// ================= REGISTRAR MOVIMIENTO =================
document.getElementById("btnRegistrarMovimiento").addEventListener("click", async () => {
  mensajeMovimiento.textContent = "";
  const descripcion = document.getElementById("movDescripcion").value.trim();
  const monto = parseFloat(document.getElementById("movMonto").value) || 0;

  if (!descripcion) {
    mensajeMovimiento.textContent = "Escribe una descripción.";
    return;
  }
  if (monto <= 0) {
    mensajeMovimiento.textContent = "El monto debe ser mayor a cero.";
    return;
  }

  const { error } = await supabaseClient.from("caja_movimientos").insert({
    caja_sesion_id: sesionActual.id,
    tipo: tipoMovimientoSeleccionado,
    descripcion: descripcion,
    monto: monto
  });

  if (error) {
    mensajeMovimiento.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("movDescripcion").value = "";
  document.getElementById("movMonto").value = "";
  cargarMovimientos();
});

// ================= CARGAR MOVIMIENTOS Y RESUMEN =================
async function cargarMovimientos() {
  const { data: movimientos, error } = await supabaseClient
    .from("caja_movimientos")
    .select("*")
    .eq("caja_sesion_id", sesionActual.id)
    .order("creado_en", { ascending: false });

  if (error) return;

  cuerpoMovimientos.innerHTML = "";
  if (movimientos.length === 0) {
    cuerpoMovimientos.innerHTML = "<tr><td colspan='4' class='sin-datos'>Sin movimientos todavía.</td></tr>";
  } else {
    movimientos.forEach((m) => {
      const fila = document.createElement("tr");
      const hora = new Date(m.creado_en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
      const tagClass = m.tipo === "entrada" ? "tag-entrada" : "tag-salida";
      const signo = m.tipo === "entrada" ? "+" : "-";
      fila.innerHTML = `<td>${hora}</td><td class="${tagClass}">${m.tipo === "entrada" ? "Entrada" : "Salida"}</td><td>${m.descripcion}</td><td class="${tagClass}">${signo}${formatearMonto(m.monto)}</td>`;
      cuerpoMovimientos.appendChild(fila);
    });
  }

  const entradas = movimientos.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + Number(m.monto), 0);
  const salidas = movimientos.filter((m) => m.tipo === "salida").reduce((acc, m) => acc + Number(m.monto), 0);

  // Ventas en efectivo registradas después de abrir esta sesión de caja
  const { data: facturasEfectivo } = await supabaseClient
    .from("facturas")
    .select("total")
    .eq("forma_pago", "Efectivo")
    .eq("estado", "activa")
    .gte("creado_en", sesionActual.fecha_apertura);

  const ventasEfectivo = (facturasEfectivo || []).reduce((acc, f) => acc + Number(f.total), 0);

  const esperado = Number(sesionActual.monto_apertura) + ventasEfectivo + entradas - salidas;

  document.getElementById("resApertura").textContent = formatearMonto(sesionActual.monto_apertura);
  document.getElementById("resVentas").textContent = formatearMonto(ventasEfectivo);
  document.getElementById("resEntradas").textContent = formatearMonto(entradas);
  document.getElementById("resSalidas").textContent = formatearMonto(salidas);
  document.getElementById("resEsperado").textContent = formatearMonto(esperado);

  sesionActual.montoEsperadoCalculado = esperado;
}

// ================= HISTORIAL =================
async function cargarHistorial() {
  const { data: cerradas, error } = await supabaseClient
    .from("caja_sesiones")
    .select("*")
    .eq("estado", "cerrada")
    .order("fecha_cierre", { ascending: false })
    .limit(15);

  if (error) return;

  cuerpoHistorial.innerHTML = "";
  if (!cerradas || cerradas.length === 0) {
    cuerpoHistorial.innerHTML = "<tr><td colspan='5' class='sin-datos'>Todavía no hay cierres registrados.</td></tr>";
    return;
  }

  cerradas.forEach((s) => {
    const fila = document.createElement("tr");
    const dif = Number(s.diferencia);
    const difClass = dif > 0.01 ? "dif-positiva" : dif < -0.01 ? "dif-negativa" : "dif-cero";
    const difTexto = (dif > 0 ? "+" : "") + formatearMonto(dif);

    fila.innerHTML = `
      <td>${new Date(s.fecha_apertura).toLocaleString("es-DO")}</td>
      <td>${new Date(s.fecha_cierre).toLocaleString("es-DO")}</td>
      <td>${formatearMonto(s.monto_cierre_esperado)}</td>
      <td>${formatearMonto(s.monto_cierre_real)}</td>
      <td class="${difClass}">${difTexto}</td>
    `;
    cuerpoHistorial.appendChild(fila);
  });
}

// ================= CIERRE DE CAJA =================
const overlayCierre = document.getElementById("overlayCierre");
const mensajeCierre = document.getElementById("mensajeCierre");

document.getElementById("btnAbrirCierre").addEventListener("click", () => {
  document.getElementById("cierreEsperado").textContent = formatearMonto(sesionActual.montoEsperadoCalculado || 0);
  document.getElementById("montoCierreReal").value = "";
  document.getElementById("cierreNotas").value = "";
  document.getElementById("cierreDiferencia").textContent = "";
  mensajeCierre.textContent = "";
  overlayCierre.style.display = "flex";
});

document.getElementById("btnCancelarCierre").addEventListener("click", () => {
  overlayCierre.style.display = "none";
});

document.getElementById("montoCierreReal").addEventListener("input", (e) => {
  const real = parseFloat(e.target.value) || 0;
  const esperado = sesionActual.montoEsperadoCalculado || 0;
  const dif = real - esperado;
  const el = document.getElementById("cierreDiferencia");

  if (Math.abs(dif) < 0.01) {
    el.textContent = "✔ Cuadra exacto";
    el.className = "dif-cero";
  } else if (dif > 0) {
    el.textContent = "Sobrante: +" + formatearMonto(dif);
    el.className = "dif-positiva";
  } else {
    el.textContent = "Faltante: " + formatearMonto(dif);
    el.className = "dif-negativa";
  }
});

document.getElementById("btnConfirmarCierre").addEventListener("click", async () => {
  mensajeCierre.textContent = "";
  const real = parseFloat(document.getElementById("montoCierreReal").value);

  if (isNaN(real)) {
    mensajeCierre.textContent = "Ingresa el monto real contado.";
    return;
  }

  const esperado = sesionActual.montoEsperadoCalculado || 0;
  const diferencia = real - esperado;

  const { error } = await supabaseClient
    .from("caja_sesiones")
    .update({
      fecha_cierre: new Date().toISOString(),
      monto_cierre_esperado: esperado,
      monto_cierre_real: real,
      diferencia: diferencia,
      estado: "cerrada",
      notas: document.getElementById("cierreNotas").value.trim() || null
    })
    .eq("id", sesionActual.id);

  if (error) {
    mensajeCierre.textContent = "Error al cerrar caja: " + error.message;
    return;
  }

  overlayCierre.style.display = "none";
  alert("Caja cerrada correctamente.");
  iniciar();
});

iniciar();
