verificarAccesoModulo(["configuracion"]);

const formConfig = document.getElementById("formConfig");
const mensajeConfig = document.getElementById("mensajeConfig");
const cfgActualizado = document.getElementById("cfgActualizado");

let logoBase64Actual = null;

document.getElementById("logoArchivo").addEventListener("change", (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  if (archivo.size > 1024 * 1024) {
    mensajeConfig.textContent = "El logo es muy pesado. Usa una imagen de menos de 1MB.";
    return;
  }

  const lector = new FileReader();
  lector.onload = (evento) => {
    logoBase64Actual = evento.target.result;
    document.getElementById("logoPreview").src = logoBase64Actual;
    document.getElementById("logoPreview").style.display = "block";
    document.getElementById("btnQuitarLogo").style.display = "inline-block";
  };
  lector.readAsDataURL(archivo);
});

document.getElementById("btnQuitarLogo").addEventListener("click", () => {
  logoBase64Actual = null;
  document.getElementById("logoArchivo").value = "";
  document.getElementById("logoPreview").src = "";
  document.getElementById("logoPreview").style.display = "none";
  document.getElementById("btnQuitarLogo").style.display = "none";
});

async function cargarConfiguracion() {
  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    mensajeConfig.textContent = "Error al cargar configuración: " + error.message;
    return;
  }

  document.getElementById("nombreEmpresa").value = data.nombre_empresa || "";
  document.getElementById("rncEmpresa").value = data.rnc_empresa || "";
  document.getElementById("direccionEmpresa").value = data.direccion_empresa || "";
  document.getElementById("telefonoEmpresa").value = data.telefono_empresa || "";
  document.getElementById("correoEmpresa").value = data.correo_empresa || "";
  document.getElementById("tasaCambio").value = data.tasa_cambio;
  document.getElementById("itbisPorcentaje").value = data.itbis_porcentaje;
  document.getElementById("diasCredito").value = data.dias_credito_default;
  document.getElementById("formatoImpresion").value = data.formato_impresion_default;
  document.getElementById("linkQr").value = data.link_qr || "";

  if (data.logo_url) {
    document.getElementById("logoPreview").src = data.logo_url;
    document.getElementById("logoPreview").style.display = "block";
    document.getElementById("btnQuitarLogo").style.display = "inline-block";
    logoBase64Actual = data.logo_url;
  }

  if (data.actualizado_en) {
    cfgActualizado.textContent = "Última actualización: " + new Date(data.actualizado_en).toLocaleString("es-DO");
  }
}

formConfig.addEventListener("submit", async (e) => {
  e.preventDefault();
  mensajeConfig.textContent = "";
  mensajeConfig.style.color = "#b00020";

  const cambios = {
    nombre_empresa: document.getElementById("nombreEmpresa").value.trim(),
    rnc_empresa: document.getElementById("rncEmpresa").value.trim() || null,
    direccion_empresa: document.getElementById("direccionEmpresa").value.trim() || null,
    telefono_empresa: document.getElementById("telefonoEmpresa").value.trim(),
    correo_empresa: document.getElementById("correoEmpresa").value.trim() || null,
    tasa_cambio: parseFloat(document.getElementById("tasaCambio").value) || 1,
    itbis_porcentaje: parseFloat(document.getElementById("itbisPorcentaje").value) || 18,
    dias_credito_default: parseInt(document.getElementById("diasCredito").value) || 30,
    formato_impresion_default: document.getElementById("formatoImpresion").value,
    link_qr: document.getElementById("linkQr").value.trim() || null,
    logo_url: logoBase64Actual,
    actualizado_en: new Date().toISOString()
  };

  if (!cambios.nombre_empresa) {
    mensajeConfig.textContent = "El nombre de la empresa es obligatorio.";
    return;
  }

  const { error } = await supabaseClient.from("configuracion").update(cambios).eq("id", 1);

  if (error) {
    mensajeConfig.textContent = "Error al guardar: " + error.message;
    return;
  }

  mensajeConfig.style.color = "#16a34a";
  mensajeConfig.textContent = "✔ Configuración guardada correctamente.";
  cfgActualizado.textContent = "Última actualización: " + new Date(cambios.actualizado_en).toLocaleString("es-DO");

  setTimeout(() => { mensajeConfig.textContent = ""; }, 3000);
});

cargarConfiguracion();

// =========================================================
// ZONA ROJA — reinicio total de datos operativos
// Solo se muestra si profiles.rol === "superadministrador".
// Borra (en este orden, por relaciones entre tablas):
//   factura_items -> abonos -> facturas -> clientes -> productos
// NO toca: profiles (usuarios) ni configuracion.
// =========================================================
async function inicializarZonaRoja() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) return;

  const { data: perfil, error: errorPerfil } = await supabaseClient
    .from("profiles")
    .select("rol")
    .eq("id", sessionData.session.user.id)
    .single();

  if (errorPerfil || !perfil || perfil.rol !== "superadministrador") {
    return; // no es superadministrador: la sección queda oculta
  }

  const zonaRojaCard = document.getElementById("zonaRojaCard");
  const overlay = document.getElementById("overlayZonaRoja");
  const zrPalabra = document.getElementById("zrPalabra");
  const zrPassword = document.getElementById("zrPassword");
  const zrMensaje = document.getElementById("zrMensaje");

  zonaRojaCard.style.display = "block";

  document.getElementById("btnAbrirZonaRoja").addEventListener("click", () => {
    zrPalabra.value = "";
    zrPassword.value = "";
    zrMensaje.textContent = "";
    overlay.style.display = "flex";
  });

  document.getElementById("btnCancelarZonaRoja").addEventListener("click", () => {
    overlay.style.display = "none";
  });

  document.getElementById("btnConfirmarZonaRoja").addEventListener("click", async () => {
    zrMensaje.style.color = "#b00020";
    zrMensaje.textContent = "";

    if (zrPalabra.value.trim() !== "BORRAR TODO") {
      zrMensaje.textContent = 'Debes escribir exactamente: BORRAR TODO';
      return;
    }

    if (!zrPassword.value) {
      zrMensaje.textContent = "Debes escribir tu contraseña para confirmar.";
      return;
    }

    // Verifica la contraseña re-autenticando al mismo usuario.
    // Esto NO cierra la sesión activa si la contraseña es correcta.
    const correoActual = sessionData.session.user.email;
    const { error: errorLogin } = await supabaseClient.auth.signInWithPassword({
      email: correoActual,
      password: zrPassword.value
    });

    if (errorLogin) {
      zrMensaje.textContent = "Contraseña incorrecta.";
      return;
    }

    zrMensaje.style.color = "#b00020";
    zrMensaje.textContent = "Borrando datos, espera...";

    // Llama a la función de la base de datos (zona_roja_reiniciar_sistema)
    // que borra todo en el orden correcto, saltándose las reglas de RLS,
    // pero solo si el usuario es superadministrador (lo valida ella misma).
    const { error } = await supabaseClient.rpc("zona_roja_reiniciar_sistema");

    if (error) {
      zrMensaje.textContent = "Error: " + error.message;
      return;
    }

    zrMensaje.style.color = "#16a34a";
    zrMensaje.textContent = "✔ Sistema reiniciado. Facturas, abonos, clientes y productos fueron borrados.";

    setTimeout(() => {
      overlay.style.display = "none";
    }, 2500);
  });
}

inicializarZonaRoja();
