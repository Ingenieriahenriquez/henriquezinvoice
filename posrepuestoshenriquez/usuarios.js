const ROLES_INFO = {
  superadministrador: "Superadministrador",
  administrador: "Administrador",
  vendedor: "Vendedor",
  cajero: "Cajero",
  inventarista: "Inventarista",
  consulta: "Consulta"
};

let miPerfil = null;
let usuariosCache = [];
let usuarioEnEdicion = null;

async function iniciar() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !perfil) {
    window.location.href = "menu.html";
    return;
  }

  miPerfil = perfil;

  if (perfil.rol !== "superadministrador" && perfil.rol !== "administrador") {
    document.getElementById("panelSinPermiso").style.display = "block";
    return;
  }

  document.getElementById("panelConPermiso").style.display = "block";
  llenarSelectRoles();
  generarCotejoModulos("cotejoModulosCrear", []);
  cargarUsuarios();
}

function rolesQuePuedoCrear() {
  if (miPerfil.rol === "superadministrador") {
    return ["administrador", "vendedor", "cajero", "inventarista", "consulta"];
  }
  return ["vendedor", "cajero", "inventarista", "consulta"];
}

function llenarSelectRoles() {
  const select = document.getElementById("nuevoRol");
  select.innerHTML = rolesQuePuedoCrear().map((r) => `<option value="${r}">${ROLES_INFO[r]}</option>`).join("");
  actualizarVisibilidadCotejo("nuevoRol", "panelModulosCrear");
  select.addEventListener("change", () => actualizarVisibilidadCotejo("nuevoRol", "panelModulosCrear"));
}

function actualizarVisibilidadCotejo(idSelect, idPanel) {
  const rol = document.getElementById(idSelect).value;
  const esAdmin = rol === "administrador" || rol === "superadministrador";
  document.getElementById(idPanel).style.display = esAdmin ? "none" : "block";
}

function generarCotejoModulos(idContenedor, seleccionados) {
  const contenedor = document.getElementById(idContenedor);
  contenedor.innerHTML = MODULOS.map((m) => `
    <label>
      <input type="checkbox" value="${m.id}" ${seleccionados.includes(m.id) ? "checked" : ""}>
      ${m.icono} ${m.nombre}
    </label>
  `).join("");
}

function leerCotejoModulos(idContenedor) {
  return Array.from(document.querySelectorAll(`#${idContenedor} input[type="checkbox"]:checked`)).map((chk) => chk.value);
}

// ================= CREAR USUARIO =================
document.getElementById("btnCrearUsuario").addEventListener("click", async () => {
  const mensajeCrear = document.getElementById("mensajeCrear");
  mensajeCrear.textContent = "";
  mensajeCrear.style.color = "#b00020";

  const nombre = document.getElementById("nuevoNombre").value.trim();
  const correo = document.getElementById("nuevoCorreo").value.trim();
  const contrasena = document.getElementById("nuevaContrasena").value;
  const telefono = document.getElementById("nuevoTelefono").value.trim();
  const rol = document.getElementById("nuevoRol").value;

  if (!nombre || !correo || !contrasena) {
    mensajeCrear.textContent = "Nombre, correo y contraseña son obligatorios.";
    return;
  }
  if (contrasena.length < 6) {
    mensajeCrear.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  // Guardamos la sesión actual del administrador para restaurarla después
  const { data: sesionActualData } = await supabaseClient.auth.getSession();
  const tokenAdmin = sesionActualData.session.access_token;
  const refreshAdmin = sesionActualData.session.refresh_token;

  const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
    email: correo,
    password: contrasena
  });

  if (signUpError) {
    mensajeCrear.textContent = "Error al crear el usuario: " + signUpError.message;
    return;
  }

  // Restauramos la sesión del administrador (signUp cambia la sesión activa al nuevo usuario)
  await supabaseClient.auth.setSession({ access_token: tokenAdmin, refresh_token: refreshAdmin });

  const modulosSeleccionados = leerCotejoModulos("cotejoModulosCrear");

  const { error: perfilError } = await supabaseClient.from("profiles").insert({
    id: signUpData.user.id,
    nombre_completo: nombre,
    correo: correo,
    telefono: telefono || null,
    rol: rol,
    activo: true,
    modulos_permitidos: modulosSeleccionados
  });

  if (perfilError) {
    mensajeCrear.textContent = "El usuario se creó, pero hubo un error al guardar su perfil: " + perfilError.message;
    return;
  }

  mensajeCrear.style.color = "#16a34a";
  mensajeCrear.textContent = "✔ Usuario \"" + nombre + "\" registrado correctamente.";

  document.getElementById("nuevoNombre").value = "";
  document.getElementById("nuevoCorreo").value = "";
  document.getElementById("nuevaContrasena").value = "";
  document.getElementById("nuevoTelefono").value = "";
  generarCotejoModulos("cotejoModulosCrear", []);

  cargarUsuarios();
});

// ================= LISTAR USUARIOS =================
async function cargarUsuarios() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("nombre_completo", { ascending: true });

  if (error) return;
  usuariosCache = data;
  renderUsuarios(data);
}

function renderUsuarios(lista) {
  const cuerpo = document.getElementById("cuerpoUsuarios");
  cuerpo.innerHTML = "";

  if (lista.length === 0) {
    cuerpo.innerHTML = "<tr><td colspan='6' class='sin-datos'>No hay usuarios registrados.</td></tr>";
    return;
  }

  lista.forEach((u) => {
    const fila = document.createElement("tr");
    const puedeEditar = miPerfil.rol === "superadministrador"
      ? u.id !== miPerfil.id
      : (u.rol !== "administrador" && u.rol !== "superadministrador");

    fila.innerHTML = `
      <td>${u.nombre_completo}</td>
      <td>${u.correo || "—"}</td>
      <td>${u.telefono || "—"}</td>
      <td><span class="tag-rol rol-${u.rol}">${ROLES_INFO[u.rol] || u.rol}</span></td>
      <td>${u.activo ? '<span class="tag-activo">Activo</span>' : '<span class="tag-inactivo">Inactivo</span>'}</td>
      <td>${puedeEditar ? `<button class="btn-editar" data-id="${u.id}">Editar</button><button class="btn-reset" data-id="${u.id}">🔑 Restablecer</button>` : ""}</td>
    `;
    cuerpo.appendChild(fila);
  });

  document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const usuario = usuariosCache.find((u) => u.id === btn.dataset.id);
      abrirEdicion(usuario);
    });
  });

  document.querySelectorAll(".btn-reset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const usuario = usuariosCache.find((u) => u.id === btn.dataset.id);
      abrirResetPassword(usuario);
    });
  });
}

document.getElementById("buscadorUsuario").addEventListener("input", (e) => {
  const texto = e.target.value.toLowerCase();
  renderUsuarios(usuariosCache.filter((u) =>
    u.nombre_completo.toLowerCase().includes(texto) || (u.correo || "").toLowerCase().includes(texto)
  ));
});

// ================= EDITAR USUARIO =================
const overlayEditar = document.getElementById("overlayEditar");
const mensajeEditar = document.getElementById("mensajeEditar");

function abrirEdicion(usuario) {
  usuarioEnEdicion = usuario;
  document.getElementById("editNombreTitulo").textContent = usuario.nombre_completo;

  const selectRol = document.getElementById("editRol");
  const rolesDisponibles = miPerfil.rol === "superadministrador"
    ? ["administrador", "vendedor", "cajero", "inventarista", "consulta"]
    : ["vendedor", "cajero", "inventarista", "consulta"];
  selectRol.innerHTML = rolesDisponibles.map((r) => `<option value="${r}">${ROLES_INFO[r]}</option>`).join("");
  selectRol.value = usuario.rol;

  document.getElementById("editActivo").value = usuario.activo ? "true" : "false";

  generarCotejoModulos("cotejoModulosEditar", usuario.modulos_permitidos || []);
  actualizarVisibilidadCotejo("editRol", "panelModulosEditar");
  selectRol.onchange = () => actualizarVisibilidadCotejo("editRol", "panelModulosEditar");

  mensajeEditar.textContent = "";
  overlayEditar.style.display = "flex";
}

document.getElementById("btnCerrarEditar").addEventListener("click", () => {
  overlayEditar.style.display = "none";
});

document.getElementById("btnGuardarEdicion").addEventListener("click", async () => {
  mensajeEditar.textContent = "";

  const nuevoRol = document.getElementById("editRol").value;
  const nuevoActivo = document.getElementById("editActivo").value === "true";
  const modulosSeleccionados = leerCotejoModulos("cotejoModulosEditar");

  const { error } = await supabaseClient
    .from("profiles")
    .update({ rol: nuevoRol, activo: nuevoActivo, modulos_permitidos: modulosSeleccionados })
    .eq("id", usuarioEnEdicion.id);

  if (error) {
    mensajeEditar.textContent = "Error: " + error.message;
    return;
  }

  overlayEditar.style.display = "none";
  cargarUsuarios();
});

// ================= RESTABLECER CONTRASEÑA =================
const overlayResetPass = document.getElementById("overlayResetPass");
const mensajeResetPass = document.getElementById("mensajeResetPass");
let usuarioParaResetPass = null;

function abrirResetPassword(usuario) {
  usuarioParaResetPass = usuario;
  document.getElementById("resetNombreTitulo").textContent = usuario.nombre_completo;
  document.getElementById("resetNuevaContrasena").value = "";
  mensajeResetPass.style.color = "#b00020";
  mensajeResetPass.textContent = "";
  overlayResetPass.style.display = "flex";
}

document.getElementById("btnCerrarResetPass").addEventListener("click", () => {
  overlayResetPass.style.display = "none";
});

document.getElementById("btnGenerarPassAleatoria").addEventListener("click", () => {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let nueva = "";
  for (let i = 0; i < 10; i++) {
    nueva += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  document.getElementById("resetNuevaContrasena").value = nueva;
});

document.getElementById("btnConfirmarResetPass").addEventListener("click", async () => {
  mensajeResetPass.style.color = "#b00020";
  const nuevaContrasena = document.getElementById("resetNuevaContrasena").value;

  if (!nuevaContrasena || nuevaContrasena.length < 6) {
    mensajeResetPass.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  mensajeResetPass.style.color = "#555";
  mensajeResetPass.textContent = "Guardando...";

  const { data: sessionData } = await supabaseClient.auth.getSession();

  const { data, error } = await supabaseClient.functions.invoke("reset-password", {
    body: {
      user_id: usuarioParaResetPass.id,
      new_password: nuevaContrasena
    },
    headers: {
      Authorization: "Bearer " + sessionData.session.access_token
    }
  });

  if (error) {
    mensajeResetPass.style.color = "#b00020";
    mensajeResetPass.textContent = "Error: " + error.message;
    return;
  }

  if (data && data.error) {
    mensajeResetPass.style.color = "#b00020";
    mensajeResetPass.textContent = "Error: " + data.error;
    return;
  }

  mensajeResetPass.style.color = "#16a34a";
  mensajeResetPass.textContent = "✔ Contraseña actualizada. Nueva contraseña: " + nuevaContrasena;
});

iniciar();
