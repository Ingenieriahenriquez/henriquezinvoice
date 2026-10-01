supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) {
    window.location.href = "index.html";
  }
});

const btnSalir = document.getElementById("btnSalir");
if (btnSalir) {
  btnSalir.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
}

function actualizarFechaHora() {
  const ahora = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  document.getElementById("fechaHora").textContent = ahora.toLocaleString('es-DO', opciones);
}
actualizarFechaHora();
setInterval(actualizarFechaHora, 1000);

// Carga el nombre de la empresa y el eslogan desde Configuración
async function cargarDatosEmpresa() {
  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("nombre_empresa, eslogan_empresa")
    .eq("id", 1)
    .single();

  if (error || !data) return;

  if (data.nombre_empresa) {
    document.getElementById("welcomeTitulo").textContent = "Bienvenido a " + data.nombre_empresa;
  }
  if (data.eslogan_empresa) {
    document.getElementById("welcomeEslogan").textContent = data.eslogan_empresa;
  }
}
cargarDatosEmpresa();

const sidebarNav = document.getElementById("sidebarNav");
const menuGrid = document.getElementById("menuGrid");

MODULOS.forEach((mod) => {
  const destino = (mod.id === "inventario" || mod.id === "producto") ? "inventario.html"
    : (mod.id === "codigobarras") ? "codigobarras.html"
    : (mod.id === "facturacion" || mod.id === "ventas") ? "facturacion.html"
    : (mod.id === "cotizacion") ? "cotizacion.html"
    : (mod.id === "gastos") ? "contabilidad.html"
    : (mod.id === "cuentaporpagar" || mod.id === "proveedores") ? "cuentaspagar.html"
    : (mod.id === "conduce") ? "conduce.html"
    : (mod.id === "reportes") ? "reportes.html"
    : (mod.id === "configuracion") ? "configuracion.html"
    : (mod.id === "caja") ? "caja.html"
    : (mod.id === "bancos") ? "bancos.html"
    : (mod.id === "graficas") ? "graficas.html"
    : (mod.id === "soporte") ? "soporte.html"
    : (mod.id === "devoluciones") ? "devoluciones.html"
    : (mod.id === "comprobantesfiscales") ? "comprobantesfiscales.html"
    : (mod.id === "cuentaporcobrar") ? "cuentascobrar.html"
    : (mod.id === "usuarios") ? "usuarios.html"
    : null;

  const link = document.createElement("a");
  link.className = "side-link";
  link.innerHTML = `<span>${mod.icono}</span> ${mod.nombre}`;
  link.addEventListener("click", () => {
    if (destino) window.location.href = destino;
    else alert("Módulo en construcción: " + mod.nombre);
  });
  sidebarNav.appendChild(link);

  const card = document.createElement("div");
  card.className = "menu-item";
  card.innerHTML = `
    <div class="icono-badge ${mod.color}">${mod.icono}</div>
    <h3>${mod.nombre}</h3>
    <p>${mod.desc}</p>
  `;
  card.addEventListener("click", () => {
    if (destino) window.location.href = destino;
    else alert("Módulo en construcción: " + mod.nombre);
  });
  menuGrid.appendChild(card);
});
