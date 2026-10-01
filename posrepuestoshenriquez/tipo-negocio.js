// =========================================================
// Tipo de Negocio — se agrega a configuracion.html
// Guarda/lee configuracion.tipo_negocio (columna nueva, ver tipo-negocio.sql)
// Independiente del resto de configuracion.js
// =========================================================

(async function () {
  const select = document.getElementById("tipoNegocioSelect");
  const btnGuardar = document.getElementById("btnGuardarTipoNegocio");
  const mensaje = document.getElementById("tnMensaje");
  if (!select || !btnGuardar) return;

  const { data, error } = await supabaseClient
    .from("configuracion")
    .select("tipo_negocio")
    .eq("id", 1)
    .single();

  if (!error && data && data.tipo_negocio) {
    select.value = data.tipo_negocio;
  }

  btnGuardar.addEventListener("click", async () => {
    mensaje.textContent = "Guardando...";
    const { error: errorGuardar } = await supabaseClient
      .from("configuracion")
      .update({ tipo_negocio: select.value })
      .eq("id", 1);

    if (errorGuardar) {
      mensaje.style.color = "#b3261e";
      mensaje.textContent = "Error al guardar: " + errorGuardar.message;
      return;
    }

    mensaje.style.color = "#1a7a3c";
    mensaje.textContent = "✔ Guardado. Los cambios se verán en Inventario al recargarlo.";
  });
})();
