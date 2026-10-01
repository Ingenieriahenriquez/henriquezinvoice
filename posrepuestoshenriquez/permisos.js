// Verifica que haya sesión activa y que el usuario tenga permiso para este módulo.
// idsPermitidosPagina: lista de ids de módulo que dan acceso a ESTA página en concreto.
// Administradores y Superadministrador siempre tienen acceso a todo.
async function verificarAccesoModulo(idsPermitidosPagina) {
  const { data: sessionData } = await supabaseClient.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("rol, modulos_permitidos, activo")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !perfil) {
    window.location.href = "menu.html";
    return;
  }

  if (perfil.activo === false) {
    alert("Tu usuario está inactivo. Contacta a un administrador.");
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return;
  }

  if (perfil.rol === "administrador" || perfil.rol === "superadministrador") {
    return; // acceso total, no se revisa la lista
  }

  const permitidos = perfil.modulos_permitidos || [];
  const tieneAcceso = idsPermitidosPagina.some((id) => permitidos.includes(id));

  if (!tieneAcceso) {
    alert("No tienes permiso para acceder a este módulo. Contacta a un administrador si crees que esto es un error.");
    window.location.href = "menu.html";
  }
}
