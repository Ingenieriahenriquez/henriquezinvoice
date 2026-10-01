// =========================================================
// LOGIN - Ingeniería & Tecnología Henríquez
// Usa el mismo supabaseClient definido en config.js
// =========================================================

const formLogin = document.getElementById("formLogin");
const inputCorreo = document.getElementById("correo");
const inputPassword = document.getElementById("password");
const inputRecordarme = document.getElementById("recordarme");
const mensajeError = document.getElementById("mensajeError");
const linkOlvido = document.getElementById("linkOlvido");
const tituloLogin = document.getElementById("tituloLogin");
const subtituloLogin = document.getElementById("welcomeEslogan");

// Si había un correo guardado (Recordarme), lo precarga
document.addEventListener("DOMContentLoaded", () => {
  const correoGuardado = localStorage.getItem("henriquez_correo_recordado");
  if (correoGuardado) {
    inputCorreo.value = correoGuardado;
    inputRecordarme.checked = true;
  }
});

function mostrarError(texto) {
  mensajeError.textContent = texto;
  mensajeError.style.display = "block";
}

function ocultarError() {
  mensajeError.style.display = "none";
  mensajeError.textContent = "";
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError();

  const correo = inputCorreo.value.trim();
  const password = inputPassword.value;

  if (!correo || !password) {
    mostrarError("Debe ingresar correo y contraseña.");
    return;
  }

  const btn = document.getElementById("btnLogin");
  const textoOriginal = btn.textContent;
  btn.textContent = "Entrando...";
  btn.disabled = true;

  try {
    if (typeof supabaseClient === "undefined") {
      throw new Error("config-no-cargado");
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: correo,
      password: password,
    });

    if (error) {
      mostrarError("Correo o contraseña incorrectos.");
      return;
    }

    // Guardar / olvidar el correo según "Recordarme"
    if (inputRecordarme.checked) {
      localStorage.setItem("henriquez_correo_recordado", correo);
    } else {
      localStorage.removeItem("henriquez_correo_recordado");
    }

    window.location.href = "menu.html";
  } catch (err) {
    console.error(err);
    mostrarError("No se pudo conectar. Verifique su conexión a internet e inténtelo de nuevo.");
  } finally {
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
});

// El restablecimiento de contraseña requiere configuración adicional en Supabase;
// por ahora este enlace solo orienta a contactar al administrador del sistema.
linkOlvido.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Para restablecer su contraseña, contacte al administrador del sistema.");
});

// =========================================================
// Recuperar contraseña (cuando se llega desde el link del
// correo "Reset your password" que manda Supabase).
// Supabase agrega los tokens en la URL y, al detectarlos,
// dispara automáticamente el evento "PASSWORD_RECOVERY".
// =========================================================
const panelRecuperar = document.getElementById("panelRecuperar");
const inputNuevaPassword = document.getElementById("nuevaPassword");
const inputConfirmarPassword = document.getElementById("confirmarPassword");
const btnGuardarNuevaPassword = document.getElementById("btnGuardarNuevaPassword");
const mensajeRecuperar = document.getElementById("mensajeRecuperar");

if (typeof supabaseClient !== "undefined") {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      formLogin.style.display = "none";
      panelRecuperar.style.display = "block";
      tituloLogin.textContent = "Nueva Contraseña";
      subtituloLogin.textContent = "Escribe tu nueva contraseña para continuar";
    }
  });
}

btnGuardarNuevaPassword.addEventListener("click", async () => {
  mensajeRecuperar.style.display = "none";
  mensajeRecuperar.textContent = "";
  mensajeRecuperar.style.color = "";

  const nueva = inputNuevaPassword.value;
  const confirmar = inputConfirmarPassword.value;

  if (!nueva || nueva.length < 6) {
    mensajeRecuperar.textContent = "La contraseña debe tener al menos 6 caracteres.";
    mensajeRecuperar.style.display = "block";
    return;
  }

  if (nueva !== confirmar) {
    mensajeRecuperar.textContent = "Las contraseñas no coinciden.";
    mensajeRecuperar.style.display = "block";
    return;
  }

  const textoOriginal = btnGuardarNuevaPassword.textContent;
  btnGuardarNuevaPassword.textContent = "Guardando...";
  btnGuardarNuevaPassword.disabled = true;

  const { error } = await supabaseClient.auth.updateUser({ password: nueva });

  btnGuardarNuevaPassword.textContent = textoOriginal;
  btnGuardarNuevaPassword.disabled = false;

  if (error) {
    mensajeRecuperar.textContent = "No se pudo guardar: " + error.message;
    mensajeRecuperar.style.display = "block";
    return;
  }

  mensajeRecuperar.style.color = "#16a34a";
  mensajeRecuperar.textContent = "✔ Contraseña actualizada. Ya puedes iniciar sesión.";
  mensajeRecuperar.style.display = "block";

  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
});
