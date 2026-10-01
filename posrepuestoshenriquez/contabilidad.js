verificarAccesoModulo(["gastos"]);

const formGasto = document.getElementById("formGasto");
const mensajeGasto = document.getElementById("mensajeGasto");
const cuerpoGastos = document.getElementById("cuerpoGastos");
const buscadorGasto = document.getElementById("buscadorGasto");
const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const cifraIngresos = document.getElementById("cifraIngresos");
const cifraEgresos = document.getElementById("cifraEgresos");
const cifraUtilidad = document.getElementById("cifraUtilidad");
const cuerpoLibroDiario = document.getElementById("cuerpoLibroDiario");

let gastosCache = [];

// ---------- Fechas por defecto: del 1ro del mes actual a hoy ----------
const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
fechaDesde.value = primerDiaMes.toISOString().slice(0, 10);
fechaHasta.value = hoy.toISOString().slice(0, 10);
document.getElementById("gastoFecha").value = hoy.toISOString().slice(0, 10);

// ================= GASTOS =================
async function cargarGastos() {
  const { data, error } = await supabaseClient
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    mensajeGasto.textContent = "Error al cargar: " + error.message;
    return;
  }
  gastosCache = data;
  renderGastos(gastosCache);
}

function renderGastos(lista) {
  cuerpoGastos.innerHTML = "";
  lista.forEach((g) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${new Date(g.fecha + "T00:00:00").toLocaleDateString("es-DO")}</td>
      <td>${g.descripcion}</td>
      <td>${g.categoria}</td>
      <td>${g.responsable || "—"}</td>
      <td class="monto-egreso">$${Number(g.monto).toFixed(2)}</td>
      <td><button class="btn-eliminar" data-id="${g.id}">Eliminar</button></td>
    `;
    cuerpoGastos.appendChild(fila);
  });

  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("¿Eliminar este gasto?")) {
        await supabaseClient.from("gastos").delete().eq("id", btn.dataset.id);
        cargarGastos();
        actualizarBalance();
      }
    });
  });
}

formGasto.addEventListener("submit", async (e) => {
  e.preventDefault();
  mensajeGasto.textContent = "";

  const nuevoGasto = {
    fecha: document.getElementById("gastoFecha").value,
    descripcion: document.getElementById("gastoDescripcion").value,
    monto: parseFloat(document.getElementById("gastoMonto").value) || 0,
    categoria: document.getElementById("gastoCategoria").value,
    responsable: document.getElementById("gastoResponsable").value || null
  };

  if (nuevoGasto.monto <= 0) {
    mensajeGasto.textContent = "El monto debe ser mayor a cero.";
    return;
  }

  const { error } = await supabaseClient.from("gastos").insert(nuevoGasto);

  if (error) {
    mensajeGasto.textContent = "Error: " + error.message;
  } else {
    document.getElementById("gastoDescripcion").value = "";
    document.getElementById("gastoMonto").value = "";
    document.getElementById("gastoResponsable").value = "";
    document.getElementById("gastoFecha").value = hoy.toISOString().slice(0, 10);
    cargarGastos();
    actualizarBalance();
  }
});

buscadorGasto.addEventListener("input", () => {
  const texto = buscadorGasto.value.toLowerCase();
  const filtrados = gastosCache.filter((g) =>
    g.descripcion.toLowerCase().includes(texto) || g.categoria.toLowerCase().includes(texto)
  );
  renderGastos(filtrados);
});

// ================= BALANCE Y LIBRO DIARIO =================
document.getElementById("btnActualizarBalance").addEventListener("click", actualizarBalance);

async function actualizarBalance() {
  const desde = fechaDesde.value;
  const hasta = fechaHasta.value;
  if (!desde || !hasta) return;

  const desdeInicio = desde + "T00:00:00";
  const hastaFin = hasta + "T23:59:59";

  const { data: facturas, error: errorFacturas } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("estado", "activa")
    .gte("creado_en", desdeInicio)
    .lte("creado_en", hastaFin);

  const { data: gastosPeriodo, error: errorGastos } = await supabaseClient
    .from("gastos")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  if (errorFacturas || errorGastos) {
    mensajeGasto.textContent = "Error al calcular el balance.";
    return;
  }

  const ingresos = (facturas || []).reduce((acc, f) => acc + Number(f.total), 0);
  const egresos = (gastosPeriodo || []).reduce((acc, g) => acc + Number(g.monto), 0);
  const utilidad = ingresos - egresos;

  cifraIngresos.textContent = "$" + ingresos.toFixed(2);
  cifraEgresos.textContent = "$" + egresos.toFixed(2);
  cifraUtilidad.textContent = "$" + utilidad.toFixed(2);

  renderLibroDiario(facturas || [], gastosPeriodo || []);
}

function renderLibroDiario(facturas, gastosPeriodo) {
  const movimientos = [];

  facturas.forEach((f) => {
    movimientos.push({
      fecha: new Date(f.creado_en),
      tipo: "ingreso",
      descripcion: "Factura #" + f.numero_secuencial + " — " + f.cliente_nombre,
      monto: Number(f.total)
    });
  });

  gastosPeriodo.forEach((g) => {
    movimientos.push({
      fecha: new Date(g.fecha + "T00:00:00"),
      tipo: "egreso",
      descripcion: g.descripcion + " (" + g.categoria + ")",
      monto: Number(g.monto)
    });
  });

  movimientos.sort((a, b) => b.fecha - a.fecha);

  cuerpoLibroDiario.innerHTML = "";
  if (movimientos.length === 0) {
    cuerpoLibroDiario.innerHTML = "<tr><td colspan='4' style='color:#888;'>No hay movimientos en este período.</td></tr>";
    return;
  }

  movimientos.forEach((m) => {
    const fila = document.createElement("tr");
    const tagClass = m.tipo === "ingreso" ? "tag-ingreso" : "tag-egreso";
    const tagTexto = m.tipo === "ingreso" ? "Ingreso" : "Egreso";
    const montoClass = m.tipo === "ingreso" ? "monto-ingreso" : "monto-egreso";
    const signo = m.tipo === "ingreso" ? "+" : "-";
    fila.innerHTML = `
      <td>${m.fecha.toLocaleDateString("es-DO")}</td>
      <td><span class="tag-tipo ${tagClass}">${tagTexto}</span></td>
      <td>${m.descripcion}</td>
      <td class="${montoClass}">${signo}$${m.monto.toFixed(2)}</td>
    `;
    cuerpoLibroDiario.appendChild(fila);
  });
}

cargarGastos();
actualizarBalance();
