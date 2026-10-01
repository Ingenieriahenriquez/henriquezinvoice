// =========================================================
// Zona Roja — Reinicio del sistema (solo Superadministrador)
// Este archivo es independiente: solo necesita que supabaseClient
// ya exista (viene de config.js) y que el HTML de zona-roja.html
// esté presente en la página.
// =========================================================

(async function () {
  const { data: sesion } = await supabaseClient.auth.getUser();
  const user = sesion ? sesion.user : null;
  console.log("[ZonaRoja] usuario:", user ? user.email : "NINGUNO (no hay sesión)");
  if (!user) return;

  const { data: perfil, error: errorPerfil } = await supabaseClient
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  console.log("[ZonaRoja] perfil:", perfil, "error:", errorPerfil);

  // Si no es superadministrador, la Zona Roja queda oculta y no se hace nada más.
  if (errorPerfil || !perfil || perfil.rol !== "superadministrador") {
    console.log("[ZonaRoja] NO se muestra. Rol detectado:", perfil ? JSON.stringify(perfil.rol) : "(sin perfil)");
    return;
  }
  console.log("[ZonaRoja] Rol correcto, mostrando la Zona Roja...");

  const contenedor = document.getElementById("zonaRojaContenedor");
  if (!contenedor) {
    console.log("[ZonaRoja] No se encontró #zonaRojaContenedor en el HTML de esta página.");
    return;
  }
  contenedor.style.display = "block";

  const overlay = document.getElementById("overlayZonaRoja");
  const txtConfirm = document.getElementById("zrTextoConfirmacion");
  const txtPassword = document.getElementById("zrPasswordConfirmacion");
  const btnConfirmar = document.getElementById("btnConfirmarZonaRoja");
  const mensaje = document.getElementById("zrMensaje");

  document.getElementById("btnAbrirZonaRoja").addEventListener("click", () => {
    txtConfirm.value = "";
    txtPassword.value = "";
    mensaje.textContent = "";
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Borrar Todo Permanentemente";
    overlay.style.display = "flex";
  });

  document.getElementById("btnCancelarZonaRoja").addEventListener("click", () => {
    overlay.style.display = "none";
  });

  function validarHabilitado() {
    btnConfirmar.disabled = !(
      txtConfirm.value.trim() === "BORRAR TODO" && txtPassword.value.length > 0
    );
  }
  txtConfirm.addEventListener("input", validarHabilitado);
  txtPassword.addEventListener("input", validarHabilitado);

  // Tablas que se vacían por completo. Si en tu proyecto alguna tabla
  // tiene otro nombre, ajústalo aquí (y solo aquí).
  const TABLAS_A_BORRAR = [
    "factura_items",
    "facturas",
    "cotizacion_items",
    "cotizaciones",
    "abonos",
    "devoluciones",
    "conduce",
    "gastos",
    "cuentas_por_pagar",
    "proveedores",
    "ncf_secuencias",
    "movimientos_bancos",
    "cuentas_bancarias",
    "movimientos_caja",
    "cierres_caja",
    "soporte_notas",
    "soporte",
    "clientes",
    "productos"
  ];

  btnConfirmar.addEventListener("click", async () => {
    mensaje.textContent = "Verificando contraseña...";
    btnConfirmar.disabled = true;

    // Vuelve a autenticar con la contraseña ingresada para confirmar identidad.
    // Como es el mismo usuario que ya tiene sesión, esto no lo desconecta de nada distinto.
    const { error: errorPass } = await supabaseClient.auth.signInWithPassword({
      email: user.email,
      password: txtPassword.value
    });

    if (errorPass) {
      mensaje.textContent = "❌ Contraseña incorrecta. No se borró absolutamente nada.";
      btnConfirmar.disabled = false;
      return;
    }

    mensaje.textContent = "Borrando información, por favor espera...";

    const resultados = [];
    for (const tabla of TABLAS_A_BORRAR) {
      const { error: errorBorrado } = await supabaseClient
        .from(tabla)
        .delete()
        .not("id", "is", null);

      resultados.push(
        (errorBorrado ? "❌ " : "✔ ") + tabla + (errorBorrado ? ": " + errorBorrado.message : " vaciada")
      );
    }

    mensaje.innerHTML = "<strong>Proceso terminado:</strong><br>" + resultados.join("<br>");
    btnConfirmar.textContent = "Listo";

    setTimeout(() => {
      alert("El sistema quedó reiniciado. La página se va a recargar.");
      window.location.reload();
    }, 2500);
  });
})();
