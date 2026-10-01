verificarAccesoModulo(["comprobantesfiscales"]);

const mensajeSecuencia = document.getElementById("mensajeSecuencia");
const cuerpoSecuencias = document.getElementById("cuerpoSecuencias");

// ================= REGISTRAR SECUENCIA =================
document.getElementById("btnGuardarSecuencia").addEventListener("click", async () => {
  mensajeSecuencia.textContent = "";
  const tipo = document.getElementById("ncfTipo").value;
  const desde = parseInt(document.getElementById("ncfDesde").value);
  const hasta = parseInt(document.getElementById("ncfHasta").value);
  const vencimiento = document.getElementById("ncfVencimiento").value || null;

  if (!desde || !hasta || hasta <= desde) {
    mensajeSecuencia.textContent = "Revisa el rango: 'Hasta' debe ser mayor que 'Desde'.";
    return;
  }

  const nueva = {
    tipo_comprobante: tipo,
    prefijo: tipo,
    secuencia_desde: desde,
    secuencia_hasta: hasta,
    secuencia_actual: desde,
    fecha_vencimiento: vencimiento
  };

  const { error } = await supabaseClient.from("ncf_secuencias").insert(nueva);

  if (error) {
    mensajeSecuencia.textContent = "Error: " + error.message;
    return;
  }

  document.getElementById("ncfDesde").value = "";
  document.getElementById("ncfHasta").value = "";
  document.getElementById("ncfVencimiento").value = "";
  cargarSecuencias();
});

// ================= CARGAR SECUENCIAS =================
async function cargarSecuencias() {
  const { data, error } = await supabaseClient
    .from("ncf_secuencias")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) return;

  cuerpoSecuencias.innerHTML = "";
  if (data.length === 0) {
    cuerpoSecuencias.innerHTML = "<tr><td colspan='6' class='sin-datos'>No hay secuencias registradas todavía.</td></tr>";
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);

  data.forEach((s) => {
    const totalRango = s.secuencia_hasta - s.secuencia_desde + 1;
    const usados = s.secuencia_actual - s.secuencia_desde;
    const disponibles = s.secuencia_hasta - s.secuencia_actual + 1;
    const porcentajeDisponible = (disponibles / totalRango) * 100;

    let estadoTexto = "Activa";
    let estadoClase = "estado-activa";

    if (s.fecha_vencimiento && s.fecha_vencimiento < hoy) {
      estadoTexto = "Vencida";
      estadoClase = "estado-vencida";
    } else if (disponibles <= 0) {
      estadoTexto = "Agotada";
      estadoClase = "estado-agotada";
    } else if (porcentajeDisponible < 10) {
      estadoTexto = "Por Agotarse";
      estadoClase = "estado-baja";
    }

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${s.tipo_comprobante}</td>
      <td>${s.secuencia_desde} — ${s.secuencia_hasta}</td>
      <td>${usados}</td>
      <td>${disponibles}</td>
      <td>${s.fecha_vencimiento ? new Date(s.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-DO") : "—"}</td>
      <td><span class="tag-estado ${estadoClase}">${estadoTexto}</span></td>
    `;
    cuerpoSecuencias.appendChild(fila);
  });
}

// ================= CONSULTAR NCF =================
const buscadorNcf = document.getElementById("buscadorNcf");
const resultadoConsulta = document.getElementById("resultadoConsulta");

buscadorNcf.addEventListener("input", async () => {
  const texto = buscadorNcf.value.trim();
  resultadoConsulta.innerHTML = "";
  if (texto.length < 3) return;

  const { data, error } = await supabaseClient
    .from("facturas")
    .select("*")
    .or(`ncf.ilike.%${texto}%,numero_secuencial.eq.${/^\d+$/.test(texto) ? texto : 0}`)
    .limit(5);

  if (error || !data || data.length === 0) {
    resultadoConsulta.innerHTML = `<div class="ncf-consulta-resultado no-encontrado">❌ No se encontró ninguna factura con ese NCF o número.</div>`;
    return;
  }

  resultadoConsulta.innerHTML = data.map((f) => `
    <div class="ncf-consulta-resultado valido">
      ✔ <strong>Factura #${f.numero_secuencial}</strong> — ${f.cliente_nombre}<br>
      NCF: ${f.ncf || "Sin asignar"} · Tipo: ${f.tipo_comprobante} · Total: $${Number(f.total).toFixed(2)}
    </div>
  `).join("");
});

// ================= ASIGNAR NCF A FACTURA =================
const buscadorFactura = document.getElementById("buscadorFactura");
const resultadosFactura = document.getElementById("resultadosFactura");
const detalleFacturaAsignar = document.getElementById("detalleFacturaAsignar");
const mensajeAsignar = document.getElementById("mensajeAsignar");

let facturaParaAsignar = null;

buscadorFactura.addEventListener("input", async () => {
  const texto = buscadorFactura.value.trim();
  resultadosFactura.innerHTML = "";
  if (!texto) return;

  let query = supabaseClient.from("facturas").select("*").order("creado_en", { ascending: false }).limit(8);
  if (/^\d+$/.test(texto)) {
    query = query.eq("numero_secuencial", parseInt(texto));
  } else {
    if (texto.length < 2) return;
    query = query.ilike("cliente_nombre", `%${texto}%`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    resultadosFactura.innerHTML = "<p style='color:#888; font-size:0.85em;'>No se encontraron facturas.</p>";
    return;
  }

  data.forEach((f) => {
    const div = document.createElement("div");
    div.className = "item-resultado";
    div.innerHTML = `<strong>Factura #${f.numero_secuencial}</strong>${f.cliente_nombre} · ${f.tipo_comprobante} · NCF: ${f.ncf || "Sin asignar"}`;
    div.addEventListener("click", () => seleccionarFacturaParaAsignar(f));
    resultadosFactura.appendChild(div);
  });
});

function seleccionarFacturaParaAsignar(factura) {
  facturaParaAsignar = factura;
  document.getElementById("afNumero").textContent = "#" + factura.numero_secuencial;
  document.getElementById("afCliente").textContent = factura.cliente_nombre;
  document.getElementById("afTipo").textContent = factura.tipo_comprobante;
  document.getElementById("afNcfActual").textContent = factura.ncf || "Sin asignar";
  mensajeAsignar.textContent = "";
  detalleFacturaAsignar.style.display = "block";
}

document.getElementById("btnAsignarNcf").addEventListener("click", async () => {
  mensajeAsignar.textContent = "";

  if (facturaParaAsignar.ncf) {
    mensajeAsignar.textContent = "Esta factura ya tiene un NCF asignado (" + facturaParaAsignar.ncf + ").";
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: secuencias, error } = await supabaseClient
    .from("ncf_secuencias")
    .select("*")
    .eq("tipo_comprobante", facturaParaAsignar.tipo_comprobante)
    .eq("activa", true)
    .order("creado_en", { ascending: true });

  if (error || !secuencias || secuencias.length === 0) {
    mensajeAsignar.textContent = "No hay ninguna secuencia NCF registrada para el tipo " + facturaParaAsignar.tipo_comprobante + ".";
    return;
  }

  const secuenciaValida = secuencias.find((s) =>
    s.secuencia_actual <= s.secuencia_hasta &&
    (!s.fecha_vencimiento || s.fecha_vencimiento >= hoy)
  );

  if (!secuenciaValida) {
    mensajeAsignar.textContent = "No hay secuencias disponibles (todas agotadas o vencidas) para " + facturaParaAsignar.tipo_comprobante + ". Registra una nueva secuencia.";
    return;
  }

  const nuevoNcf = secuenciaValida.prefijo + String(secuenciaValida.secuencia_actual).padStart(10, "0");

  const { error: errorFactura } = await supabaseClient
    .from("facturas")
    .update({ ncf: nuevoNcf })
    .eq("id", facturaParaAsignar.id);

  if (errorFactura) {
    mensajeAsignar.textContent = "Error al asignar: " + errorFactura.message;
    return;
  }

  await supabaseClient
    .from("ncf_secuencias")
    .update({ secuencia_actual: secuenciaValida.secuencia_actual + 1 })
    .eq("id", secuenciaValida.id);

  facturaParaAsignar.ncf = nuevoNcf;
  document.getElementById("afNcfActual").textContent = nuevoNcf;
  mensajeAsignar.style.color = "#16a34a";
  mensajeAsignar.textContent = "✔ NCF asignado: " + nuevoNcf;

  cargarSecuencias();
});

cargarSecuencias();
