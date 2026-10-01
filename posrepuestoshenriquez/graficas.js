verificarAccesoModulo(["graficas"]);

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");

const hoy = new Date();
const hace30Dias = new Date();
hace30Dias.setDate(hoy.getDate() - 30);
fechaDesde.value = hace30Dias.toISOString().slice(0, 10);
fechaHasta.value = hoy.toISOString().slice(0, 10);

let chartVentasDia, chartFormaPago, chartTopProductos, chartIngresosGastos;

const COLORES = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0d9488", "#e11d48", "#0891b2"];

document.getElementById("btnActualizar").addEventListener("click", cargarGraficas);

async function cargarGraficas() {
  const desde = fechaDesde.value;
  const hasta = fechaHasta.value;
  if (!desde || !hasta) return;

  const { data: facturas, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .eq("estado", "activa")
    .gte("creado_en", desde + "T00:00:00")
    .lte("creado_en", hasta + "T23:59:59");

  if (error || !facturas) return;

  dibujarVentasPorDia(facturas, desde, hasta);
  dibujarFormaPago(facturas);
  await dibujarTopProductos(facturas);
  await dibujarIngresosGastos(desde, hasta, facturas);
}

// ================= VENTAS POR DÍA =================
function dibujarVentasPorDia(facturas, desde, hasta) {
  const porDia = {};
  let cursor = new Date(desde + "T00:00:00");
  const fin = new Date(hasta + "T00:00:00");
  while (cursor <= fin) {
    porDia[cursor.toISOString().slice(0, 10)] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  facturas.forEach((f) => {
    const dia = f.creado_en.slice(0, 10);
    if (porDia[dia] !== undefined) porDia[dia] += Number(f.total);
  });

  const etiquetas = Object.keys(porDia).map((d) => new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" }));
  const valores = Object.values(porDia);

  if (chartVentasDia) chartVentasDia.destroy();
  chartVentasDia = new Chart(document.getElementById("chartVentasDia"), {
    type: "line",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Ventas ($)",
        data: valores,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.1)",
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// ================= VENTAS POR FORMA DE PAGO =================
function dibujarFormaPago(facturas) {
  const porForma = {};
  facturas.forEach((f) => {
    porForma[f.forma_pago] = (porForma[f.forma_pago] || 0) + Number(f.total);
  });

  const etiquetas = Object.keys(porForma);
  const valores = Object.values(porForma);

  if (chartFormaPago) chartFormaPago.destroy();
  chartFormaPago = new Chart(document.getElementById("chartFormaPago"), {
    type: "doughnut",
    data: {
      labels: etiquetas.length > 0 ? etiquetas : ["Sin datos"],
      datasets: [{
        data: valores.length > 0 ? valores : [1],
        backgroundColor: COLORES
      }]
    },
    options: { responsive: true }
  });
}

// ================= TOP 5 PRODUCTOS =================
async function dibujarTopProductos(facturas) {
  const idsFacturas = facturas.map((f) => f.id);
  let items = [];
  if (idsFacturas.length > 0) {
    const { data } = await supabaseClient.from("factura_items").select("*").in("factura_id", idsFacturas);
    items = data || [];
  }

  const porProducto = {};
  items.forEach((it) => {
    porProducto[it.descripcion] = (porProducto[it.descripcion] || 0) + it.cantidad;
  });

  const top5 = Object.entries(porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const etiquetas = top5.map((p) => p[0]);
  const valores = top5.map((p) => p[1]);

  if (chartTopProductos) chartTopProductos.destroy();
  chartTopProductos = new Chart(document.getElementById("chartTopProductos"), {
    type: "bar",
    data: {
      labels: etiquetas.length > 0 ? etiquetas : ["Sin datos"],
      datasets: [{
        label: "Cantidad vendida",
        data: valores.length > 0 ? valores : [0],
        backgroundColor: "#16a34a"
      }]
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: { legend: { display: false } }
    }
  });
}

// ================= INGRESOS VS GASTOS =================
async function dibujarIngresosGastos(desde, hasta, facturas) {
  const { data: gastos } = await supabaseClient
    .from("gastos")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const totalIngresos = facturas.reduce((acc, f) => acc + Number(f.total), 0);
  const totalGastos = (gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);

  if (chartIngresosGastos) chartIngresosGastos.destroy();
  chartIngresosGastos = new Chart(document.getElementById("chartIngresosGastos"), {
    type: "bar",
    data: {
      labels: ["Ingresos", "Gastos"],
      datasets: [{
        label: "Monto ($)",
        data: [totalIngresos, totalGastos],
        backgroundColor: ["#16a34a", "#dc2626"]
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

cargarGraficas();
