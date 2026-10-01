verificarAccesoModulo(["bancos"]);

function formatearMonto(numero) {
  return "$" + Number(numero).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const mensajeCuenta = document.getElementById("mensajeCuenta");
const mensajeMovimiento = document.getElementById("mensajeMovimiento");
const cuerpoCuentas = document.getElementById("cuerpoCuentas");
const cuerpoMovimientos = document.getElementById("cuerpoMovimientos");
const movCuenta = document.getElementById("movCuenta");
const buscadorMov = document.getElementById("buscadorMov");

let cuentasCache = [];
let movimientosCache = [];
let tipoMovimientoSeleccionado = "deposito";

document.getElementById("movFecha").value = new Date().toISOString().slice(0, 10);

// ================= REGISTRAR CUENTA =================
document.getElementById("btnGuardarCuenta").addEventListener("click", async () => {
  mensajeCuenta.textContent = "";
  const nombre = document.getElementById("bancoNombre").value.trim();

  if (!nombre) {
    mensajeCuenta.textContent = "El nombre del banco es obligatorio.";
    return;
  }

  const nueva = {
    nombre_banco: nombre,
    numero_cuenta: document.getElementById("bancoNumero").value.trim() || null,
    tipo_cuenta: document.getElementById("bancoTipo").value,
    saldo_actual: parseFloat(document.getElementById("bancoSaldoInicial").value) || 0
  };

  const { error } = await supabaseClient.from("bancos_cuentas").insert(nueva);

  if (error) {
    mensajeCuenta.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("bancoNombre").value = "";
  document.getElementById("bancoNumero").value = "";
  document.getElementById("bancoSaldoInicial").value = "";
  cargarTodo();
});

// ================= TOGGLE DEPÓSITO/RETIRO =================
document.getElementById("btnTipoDeposito").addEventListener("click", () => {
  tipoMovimientoSeleccionado = "deposito";
  document.getElementById("btnTipoDeposito").classList.add("activo");
  document.getElementById("btnTipoRetiro").classList.remove("activo");
});

document.getElementById("btnTipoRetiro").addEventListener("click", () => {
  tipoMovimientoSeleccionado = "retiro";
  document.getElementById("btnTipoRetiro").classList.add("activo");
  document.getElementById("btnTipoDeposito").classList.remove("activo");
});

// ================= REGISTRAR MOVIMIENTO =================
document.getElementById("btnRegistrarMovimiento").addEventListener("click", async () => {
  mensajeMovimiento.textContent = "";
  const cuentaId = movCuenta.value;
  const descripcion = document.getElementById("movDescripcion").value.trim();
  const monto = parseFloat(document.getElementById("movMonto").value) || 0;
  const fecha = document.getElementById("movFecha").value;

  if (!cuentaId) {
    mensajeMovimiento.textContent = "Registra o selecciona una cuenta primero.";
    return;
  }
  if (!descripcion) {
    mensajeMovimiento.textContent = "Escribe una descripción.";
    return;
  }
  if (monto <= 0) {
    mensajeMovimiento.textContent = "El monto debe ser mayor a cero.";
    return;
  }

  const cuenta = cuentasCache.find((c) => c.id === cuentaId);

  if (tipoMovimientoSeleccionado === "retiro" && monto > Number(cuenta.saldo_actual) + 0.01) {
    mensajeMovimiento.textContent = "El retiro no puede ser mayor al saldo actual (" + formatearMonto(cuenta.saldo_actual) + ").";
    return;
  }

  const { error: errorMov } = await supabaseClient.from("bancos_movimientos").insert({
    cuenta_id: cuentaId,
    tipo: tipoMovimientoSeleccionado,
    descripcion: descripcion,
    monto: monto,
    fecha: fecha
  });

  if (errorMov) {
    mensajeMovimiento.textContent = "Error: " + errorMov.message;
    return;
  }

  const nuevoSaldo = tipoMovimientoSeleccionado === "deposito"
    ? Number(cuenta.saldo_actual) + monto
    : Number(cuenta.saldo_actual) - monto;

  await supabaseClient.from("bancos_cuentas").update({ saldo_actual: nuevoSaldo }).eq("id", cuentaId);

  document.getElementById("movDescripcion").value = "";
  document.getElementById("movMonto").value = "";
  cargarTodo();
});

// ================= CARGAR TODO =================
async function cargarTodo() {
  const { data: cuentas, error: errorCuentas } = await supabaseClient
    .from("bancos_cuentas")
    .select("*")
    .order("creado_en", { ascending: false });

  if (errorCuentas) return;
  cuentasCache = cuentas;
  renderCuentas(cuentas);
  renderSelectorCuentas(cuentas);

  const totalBancos = cuentas.reduce((acc, c) => acc + Number(c.saldo_actual), 0);
  document.getElementById("totalBancos").textContent = formatearMonto(totalBancos);

  const { data: movimientos, error: errorMov } = await supabaseClient
    .from("bancos_movimientos")
    .select("*, bancos_cuentas(nombre_banco)")
    .order("creado_en", { ascending: false })
    .limit(50);

  if (errorMov) return;
  movimientosCache = movimientos;
  renderMovimientos(movimientos);
}

function renderCuentas(cuentas) {
  cuerpoCuentas.innerHTML = "";
  if (cuentas.length === 0) {
    cuerpoCuentas.innerHTML = "<tr><td colspan='4' class='sin-datos'>No tienes cuentas registradas todavía.</td></tr>";
    return;
  }
  cuentas.forEach((c) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${c.nombre_banco}</td><td>${c.numero_cuenta || "—"}</td><td>${c.tipo_cuenta}</td><td>${formatearMonto(c.saldo_actual)}</td>`;
    cuerpoCuentas.appendChild(fila);
  });
}

function renderSelectorCuentas(cuentas) {
  const valorAnterior = movCuenta.value;
  movCuenta.innerHTML = cuentas.length === 0
    ? `<option value="">Registra una cuenta primero</option>`
    : cuentas.map((c) => `<option value="${c.id}">${c.nombre_banco}${c.numero_cuenta ? " — " + c.numero_cuenta : ""}</option>`).join("");
  if (valorAnterior) movCuenta.value = valorAnterior;
}

function renderMovimientos(lista) {
  cuerpoMovimientos.innerHTML = "";
  if (lista.length === 0) {
    cuerpoMovimientos.innerHTML = "<tr><td colspan='5' class='sin-datos'>Sin movimientos todavía.</td></tr>";
    return;
  }
  lista.forEach((m) => {
    const fila = document.createElement("tr");
    const tagClass = m.tipo === "deposito" ? "tag-deposito" : "tag-retiro";
    const signo = m.tipo === "deposito" ? "+" : "-";
    const nombreCuenta = m.bancos_cuentas ? m.bancos_cuentas.nombre_banco : "—";
    fila.innerHTML = `
      <td>${new Date(m.fecha + "T00:00:00").toLocaleDateString("es-DO")}</td>
      <td>${nombreCuenta}</td>
      <td class="${tagClass}">${m.tipo === "deposito" ? "Depósito" : "Retiro"}</td>
      <td>${m.descripcion}</td>
      <td class="${tagClass}">${signo}${formatearMonto(m.monto)}</td>
    `;
    cuerpoMovimientos.appendChild(fila);
  });
}

buscadorMov.addEventListener("input", () => {
  const texto = buscadorMov.value.toLowerCase();
  const filtrados = movimientosCache.filter((m) =>
    m.descripcion.toLowerCase().includes(texto) ||
    (m.bancos_cuentas && m.bancos_cuentas.nombre_banco.toLowerCase().includes(texto))
  );
  renderMovimientos(filtrados);
});

cargarTodo();
